import type { FollowCameraState } from '../types';

export interface CameraConfig {
  minPitch: number;
  maxPitch: number;
  minDistance: number;
  maxDistance: number;
  minObstacleDistance: number;
  obstacleSafetyMargin: number;
  recoverySpeed: number;
  pivotOffset: [number, number, number];
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  minPitch: -0.65, // ~-37 deg (allows looking up into the sky and tree canopies)
  maxPitch: 1.35, // ~77 deg
  minDistance: 2.5,
  maxDistance: 10.0,
  minObstacleDistance: 0.8,
  obstacleSafetyMargin: 0.35,
  recoverySpeed: 10.0,
  pivotOffset: [0, 1.4, 0]
};

export interface CameraStepInput {
  targetPosition: [number, number, number];
  lookDeltaX: number;
  lookDeltaY: number;
  zoomDelta: number;
  sensitivity: number;
  invertY: boolean;
  obstacleHitDistance: number | null;
  deltaTime: number;
}

export interface CameraTransformOutput {
  cameraPosition: [number, number, number];
  lookAtTarget: [number, number, number];
  yaw: number;
  pitch: number;
  targetDistance: number;
  effectiveDistance: number;
}

const TWO_PI = Math.PI * 2;

export function wrapYawZeroToTwoPi(yaw: number): number {
  let y = yaw % TWO_PI;
  if (y < 0) y += TWO_PI;
  return y === 0 ? 0 : y;
}

export class CameraControllerCore {
  private state: FollowCameraState;
  private config: CameraConfig;
  private lastTransform: CameraTransformOutput;

  constructor(
    initialYaw = 0,
    initialPitch = 0.45,
    initialDistance = 5.5,
    config: Partial<CameraConfig> = {}
  ) {
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
    const clampedPitch = Math.min(this.config.maxPitch, Math.max(this.config.minPitch, initialPitch));
    const clampedDist = Math.min(this.config.maxDistance, Math.max(this.config.minDistance, initialDistance));
    this.state = {
      yaw: wrapYawZeroToTwoPi(initialYaw),
      pitch: clampedPitch,
      targetDistance: clampedDist,
      effectiveDistance: clampedDist,
      pivotOffset: [...this.config.pivotOffset]
    };
    this.lastTransform = this.computeTransform([0, 0.1, 18]);
  }

  public step(params: CameraStepInput): CameraTransformOutput {
    const dt = Math.min(0.1, Math.max(0.0001, params.deltaTime));
    const sens = Math.min(2.5, Math.max(0.2, params.sensitivity));
    const ySign = params.invertY ? -1 : 1;

    // 1. Update continuous 360-degree yaw in [0, 2*PI)
    this.state.yaw = wrapYawZeroToTwoPi(this.state.yaw - params.lookDeltaX * sens);

    // 2. Update vertical pitch clamped to [0.15 rad, 1.35 rad]
    this.state.pitch = Math.min(
      this.config.maxPitch,
      Math.max(this.config.minPitch, this.state.pitch + params.lookDeltaY * sens * ySign)
    );

    // 3. Update target zoom distance clamped to [2.5 m, 10.0 m]
    this.state.targetDistance = Math.min(
      this.config.maxDistance,
      Math.max(this.config.minDistance, this.state.targetDistance + params.zoomDelta)
    );

    // 4. Obstacle avoidance pull-in (FR-011)
    if (
      params.obstacleHitDistance !== null &&
      Number.isFinite(params.obstacleHitDistance) &&
      params.obstacleHitDistance < this.state.targetDistance
    ) {
      const safeDist = Math.max(
        this.config.minObstacleDistance,
        Math.min(
          this.state.targetDistance,
          params.obstacleHitDistance - this.config.obstacleSafetyMargin
        )
      );
      // Immediate pull-in so the camera never clips inside solid geometry
      this.state.effectiveDistance = safeDist;
    } else {
      // Smoothly recover toward targetDistance when unobstructed
      const diff = this.state.targetDistance - this.state.effectiveDistance;
      if (Math.abs(diff) < 0.01) {
        this.state.effectiveDistance = this.state.targetDistance;
      } else {
        this.state.effectiveDistance = Math.min(
          this.state.targetDistance,
          Math.max(
            this.config.minObstacleDistance,
            this.state.effectiveDistance + diff * Math.min(1, this.config.recoverySpeed * dt)
          )
        );
      }
    }

    this.lastTransform = this.computeTransform(params.targetPosition);
    return this.lastTransform;
  }

  private computeTransform(targetPosition: [number, number, number]): CameraTransformOutput {
    const basePivotY = targetPosition[1] + this.state.pivotOffset[1];
    const upwardLookBoost =
      this.state.pitch < 0
        ? Math.abs(Math.sin(this.state.pitch)) * this.state.effectiveDistance * 0.75
        : 0;

    const lookAtTarget: [number, number, number] = [
      targetPosition[0] + this.state.pivotOffset[0],
      basePivotY + upwardLookBoost,
      targetPosition[2] + this.state.pivotOffset[2]
    ];

    const horizDist = this.state.effectiveDistance * Math.cos(this.state.pitch);
    const vertDist = this.state.effectiveDistance * Math.sin(this.state.pitch);

    const cameraPosition: [number, number, number] = [
      lookAtTarget[0] + horizDist * Math.sin(this.state.yaw),
      Math.max(0.35, basePivotY + vertDist),
      lookAtTarget[2] + horizDist * Math.cos(this.state.yaw)
    ];

    return {
      cameraPosition,
      lookAtTarget,
      yaw: this.state.yaw,
      pitch: this.state.pitch,
      targetDistance: this.state.targetDistance,
      effectiveDistance: this.state.effectiveDistance
    };
  }

  public getState(): CameraTransformOutput {
    return {
      ...this.lastTransform,
      cameraPosition: [...this.lastTransform.cameraPosition],
      lookAtTarget: [...this.lastTransform.lookAtTarget]
    };
  }

  public reset(initialYaw = 0, initialPitch = 0.45, initialDistance = 5.5): void {
    this.state.yaw = wrapYawZeroToTwoPi(initialYaw);
    this.state.pitch = Math.min(this.config.maxPitch, Math.max(this.config.minPitch, initialPitch));
    this.state.targetDistance = Math.min(
      this.config.maxDistance,
      Math.max(this.config.minDistance, initialDistance)
    );
    this.state.effectiveDistance = this.state.targetDistance;
    this.lastTransform = this.computeTransform([0, 0.1, 18]);
  }
}

