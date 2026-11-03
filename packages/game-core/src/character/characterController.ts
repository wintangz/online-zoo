import type { LocomotionState, NormalizedInputSnapshot, PlayerAvatarState } from '../types';

export interface CharacterConfig {
  walkSpeed: number;
  runSpeed: number;
  jumpVelocity: number;
  gravity: number;
  terminalVelocity: number;
  rotationSmoothing: number;
  worldBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY: number;
  };
}

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  walkSpeed: 4.0,
  runSpeed: 7.5,
  jumpVelocity: 6.5,
  gravity: -18.0,
  terminalVelocity: -25.0,
  rotationSmoothing: 16.0, // Rotates 180 deg in < 0.25s (< 0.3s requirement in SC-002)
  worldBounds: {
    minX: -40,
    maxX: 40,
    minZ: -40,
    maxZ: 40,
    minY: 0
  }
};

export interface CharacterStepInput {
  input: NormalizedInputSnapshot;
  cameraYaw: number;
  isGrounded: boolean;
  deltaTime: number;
}

export interface CharacterStepOutput {
  desiredTranslation: [number, number, number];
  velocity: [number, number, number];
  facingYaw: number;
  locomotionState: LocomotionState;
}

export function normalizeAngleRadians(angle: number): number {
  let a = ((angle + Math.PI) % (2 * Math.PI));
  if (a < 0) a += 2 * Math.PI;
  return a - Math.PI;
}

export function lerpAngleShortestArc(current: number, target: number, maxStep: number): number {
  const diff = normalizeAngleRadians(target - current);
  if (Math.abs(diff) <= maxStep) {
    return normalizeAngleRadians(target);
  }
  return normalizeAngleRadians(current + Math.sign(diff) * maxStep);
}

export class CharacterControllerCore {
  private state: PlayerAvatarState;
  private config: CharacterConfig;

  constructor(
    spawnPosition: [number, number, number] = [0, 0.1, 18],
    spawnYaw = 0,
    config: Partial<CharacterConfig> = {}
  ) {
    this.config = { ...DEFAULT_CHARACTER_CONFIG, ...config };
    this.state = {
      position: [...spawnPosition],
      velocity: [0, 0, 0],
      facingYaw: normalizeAngleRadians(spawnYaw),
      targetYaw: normalizeAngleRadians(spawnYaw),
      locomotionState: 'Idle',
      isGrounded: true,
      verticalVelocity: 0
    };
  }

  public getState(): PlayerAvatarState {
    return {
      ...this.state,
      position: [...this.state.position],
      velocity: [...this.state.velocity]
    };
  }

  public computeStep(params: CharacterStepInput): CharacterStepOutput {
    const dt = Math.min(0.1, Math.max(0.0001, params.deltaTime));
    const { input, cameraYaw, isGrounded } = params;
    this.state.isGrounded = isGrounded;

    // 1. Horizontal input magnitude (clamped to <= 1.0)
    const rawMag = Math.hypot(input.moveX, input.moveZ);
    const inputMag = rawMag > 0.05 ? Math.min(1.0, rawMag) : 0;

    let worldVelX = 0;
    let worldVelZ = 0;

    if (inputMag > 0) {
      const normX = input.moveX / (rawMag > 1.0 ? rawMag : 1.0);
      const normZ = input.moveZ / (rawMag > 1.0 ? rawMag : 1.0);

      // Transform camera-relative (moveX, moveZ) into world-space movement direction
      const sinY = Math.sin(cameraYaw);
      const cosY = Math.cos(cameraYaw);
      const dirX = normX * cosY + normZ * sinY;
      const dirZ = -normX * sinY + normZ * cosY;

      const maxSpeed = input.runHeld ? this.config.runSpeed : this.config.walkSpeed;
      worldVelX = dirX * maxSpeed;
      worldVelZ = dirZ * maxSpeed;

      // Ensure horizontal speed never exceeds configured cap
      const horizSpeed = Math.hypot(worldVelX, worldVelZ);
      if (horizSpeed > maxSpeed) {
        const scale = maxSpeed / horizSpeed;
        worldVelX *= scale;
        worldVelZ *= scale;
      }

      // Compute desired facing yaw from movement direction (avatar faces +Z local or atan2(dirX, dirZ))
      this.state.targetYaw = normalizeAngleRadians(Math.atan2(dirX, dirZ));
      this.state.facingYaw = lerpAngleShortestArc(
        this.state.facingYaw,
        this.state.targetYaw,
        this.config.rotationSmoothing * dt
      );
    }

    // 2. Vertical velocity & Jump / Gravity handling
    let nextLocomotion: LocomotionState;
    if (isGrounded) {
      if (input.jumpPressed) {
        this.state.verticalVelocity = this.config.jumpVelocity;
        this.state.isGrounded = false;
        nextLocomotion = 'Jumping';
      } else {
        // Keep slight downward bias for grounded contact stability
        this.state.verticalVelocity = 0;
        if (inputMag > 0) {
          nextLocomotion = input.runHeld ? 'Running' : 'Walking';
        } else {
          nextLocomotion = 'Idle';
        }
      }
    } else {
      // Airborne: ignore repeated jump inputs (no double jump), apply gravity
      this.state.verticalVelocity = Math.max(
        this.config.terminalVelocity,
        this.state.verticalVelocity + this.config.gravity * dt
      );
      nextLocomotion = 'Jumping';
    }

    this.state.locomotionState = nextLocomotion;
    this.state.velocity = [worldVelX, this.state.verticalVelocity, worldVelZ];

    const desiredTranslation: [number, number, number] = [
      worldVelX * dt,
      this.state.verticalVelocity * dt,
      worldVelZ * dt
    ];

    return {
      desiredTranslation,
      velocity: [...this.state.velocity],
      facingYaw: this.state.facingYaw,
      locomotionState: this.state.locomotionState
    };
  }

  public commitPhysicsResult(
    resolvedPosition: [number, number, number],
    grounded: boolean
  ): void {
    const { minX, maxX, minZ, maxZ, minY } = this.config.worldBounds;
    const clampedX = Math.min(maxX, Math.max(minX, resolvedPosition[0]));
    const clampedY = Math.max(minY, resolvedPosition[1]);
    const clampedZ = Math.min(maxZ, Math.max(minZ, resolvedPosition[2]));

    this.state.position = [clampedX, clampedY, clampedZ];
    this.state.isGrounded = grounded;
    if (grounded && this.state.verticalVelocity < 0) {
      this.state.verticalVelocity = 0;
    }
  }

  public reset(
    spawnPosition: [number, number, number] = [0, 0.1, 18],
    spawnYaw = 0
  ): void {
    this.state = {
      position: [...spawnPosition],
      velocity: [0, 0, 0],
      facingYaw: normalizeAngleRadians(spawnYaw),
      targetYaw: normalizeAngleRadians(spawnYaw),
      locomotionState: 'Idle',
      isGrounded: true,
      verticalVelocity: 0
    };
  }
}

