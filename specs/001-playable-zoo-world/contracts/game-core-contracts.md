# Game Core Contracts (`packages/game-core`)

**Feature**: `001-playable-zoo-world`
**Package**: `@online-zoo/game-core`
**Responsibility**: Framework-agnostic gameplay types, input abstraction, character locomotion controller, camera controller, interaction detection/dispatch system, and Zustand UI/session store.

---

## 1. Unified Input Abstraction Contract

Supports desktop keyboard/mouse (Pointer Lock free-look + `Alt` cursor reveal) and mobile touchscreen (Virtual Joystick at walking speed + dedicated `Run` button + touch-drag camera + action buttons) (`FR-012`, `FR-013`, `FR-014`).

```ts
export type InputDeviceMode = 'desktop' | 'touch';

export interface NormalizedInputSnapshot {
  /** Horizontal movement in [-1, 1]; combined magnitude with moveZ is clamped to <= 1.0 */
  moveX: number;
  /** Forward/backward movement in [-1, 1]; negative Z is forward relative to camera yaw */
  moveZ: number;
  /** True when desktop Shift is held OR mobile dedicated Run button is active */
  runHeld: boolean;
  /** Edge-triggered true for 1 tick when Space or mobile Jump button is pressed */
  jumpPressed: boolean;
  /** Edge-triggered true for 1 tick when E or mobile Interact button is pressed */
  interactPressed: boolean;
  /** Edge-triggered true for 1 tick when ESC or mobile Menu button is pressed */
  menuPressed: boolean;
  /** True while desktop Alt key is held to reveal the cursor (Genshin Impact style) */
  cursorRevealHeld: boolean;
  /** Horizontal camera orbit delta (radians) accumulated since previous tick */
  lookDeltaX: number;
  /** Vertical camera pitch delta (radians) accumulated since previous tick */
  lookDeltaY: number;
  /** Camera zoom distance delta (meters) accumulated since previous tick */
  zoomDelta: number;
  /** Most recently active input device mode */
  activeDevice: InputDeviceMode;
}

export interface InputController {
  /** Poll and consume edge-triggered inputs for the current frame */
  consumeFrameSnapshot(): NormalizedInputSnapshot;
  /** Feed desktop keyboard state */
  setKeyState(code: string, pressed: boolean): void;
  /** Feed pointer-lock mouse or touch-drag camera delta */
  addLookDelta(deltaX: number, deltaY: number): void;
  /** Feed wheel or pinch zoom delta */
  addZoomDelta(deltaZoom: number): void;
  /** Feed mobile virtual joystick vector (always walking speed; magnitude clamped to <= 1) */
  setVirtualJoystick(x: number, y: number): void;
  /** Feed mobile dedicated action buttons */
  setTouchAction(action: 'run' | 'jump' | 'interact' | 'menu', active: boolean): void;
  /** Queue edge-triggered interact/jump/menu actions without device mode side effects */
  triggerAction(action: 'jump' | 'interact' | 'menu', device?: InputDeviceMode): void;
  /** Immediately reset all active movement/button states (called on window blur, resize, or menu open) */
  resetAll(): void;
  /** Dispose DOM listeners */
  dispose(): void;
}
```

---

## 2. Character Locomotion Controller Contract

Pure, deterministic movement and locomotion state machine separated from Three.js rendering (`FR-004`–`FR-007`).

```ts
export type LocomotionState = 'Idle' | 'Walking' | 'Running' | 'Jumping';

export interface CharacterConfig {
  walkSpeed: number;        // Default: 4.0 m/s
  runSpeed: number;         // Default: 7.5 m/s
  jumpVelocity: number;     // Default: 6.5 m/s
  gravity: number;          // Default: -18.0 m/s^2
  terminalVelocity: number; // Default: -25.0 m/s
  rotationSmoothing: number;// Default: 14.0 rad/s (faces direction within <0.3s per SC-002)
}

export interface CharacterStepInput {
  input: NormalizedInputSnapshot;
  cameraYaw: number;
  isGrounded: boolean;
  deltaTime: number; // Clamped to max 0.1s to prevent physics spikes on tab switch
}

export interface CharacterStepOutput {
  /** Desired world-space displacement [dx, dy, dz] to pass to Rapier KinematicCharacterController */
  desiredTranslation: [number, number, number];
  /** Updated horizontal velocity [vx, vy, vz] */
  velocity: [number, number, number];
  /** Updated avatar facing yaw in radians [-PI, PI] */
  facingYaw: number;
  /** Updated locomotion animation state */
  locomotionState: LocomotionState;
}

export interface CharacterControllerCore {
  getState(): {
    position: [number, number, number];
    velocity: [number, number, number];
    facingYaw: number;
    locomotionState: LocomotionState;
    isGrounded: boolean;
  };
  /** Compute next frame movement step before collision resolution */
  computeStep(params: CharacterStepInput): CharacterStepOutput;
  /** Commit post-collision world position and grounded state from Rapier */
  commitPhysicsResult(resolvedPosition: [number, number, number], grounded: boolean): void;
  /** Reset character to spawn transform */
  reset(spawnPosition: [number, number, number], spawnYaw?: number): void;
}
```

---

## 3. Independent Camera Controller Contract

Computes 360-degree orbital camera transforms and obstacle collision pull-in independent of UI components (`FR-008`–`FR-011`).

```ts
export interface CameraConfig {
  minPitch: number;          // Default: 0.15 rad (~8.5 deg above horizon)
  maxPitch: number;          // Default: 1.35 rad (~77 deg overhead)
  minDistance: number;       // Default: 2.5 m
  maxDistance: number;       // Default: 10.0 m
  minObstacleDistance: number; // Default: 0.8 m
  obstacleSafetyMargin: number;// Default: 0.35 m in front of hit point
  pivotOffset: [number, number, number]; // Default: [0, 1.4, 0]
}

export interface CameraStepInput {
  targetPosition: [number, number, number];
  lookDeltaX: number;
  lookDeltaY: number;
  zoomDelta: number;
  sensitivity: number;
  invertY: boolean;
  /** Distance from pivot to nearest solid collider along camera ray, or null if unobstructed */
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

export interface CameraControllerCore {
  step(params: CameraStepInput): CameraTransformOutput;
  getState(): CameraTransformOutput;
  reset(initialYaw?: number, initialPitch?: number, initialDistance?: number): void;
}
```

---

## 4. Reusable Interaction Detection & Dispatch Contract

Detects nearby interactive objects, selects the single best candidate when multiple overlap, and dispatches `info_plaque` or `world_prop` reactions (`FR-015`–`FR-018`).

```ts
export type InteractionArchetype = 'info_plaque' | 'world_prop';
export type WorldPropReaction = 'toggle_lantern' | 'ring_chime' | 'rest_bench';

export interface InteractiveObjectDescriptor {
  id: string;
  title: string;
  promptAction: string;
  archetype: InteractionArchetype;
  position: [number, number, number];
  interactionRadius: number;
  infoCard?: {
    heading: string;
    body: string;
    facts: string[];
  };
  propReactionType?: WorldPropReaction;
}

export interface InteractionEvaluationResult {
  focusedObject: InteractiveObjectDescriptor | null;
  distance: number | null;
}

export interface InteractionSystem {
  register(descriptor: InteractiveObjectDescriptor): void;
  unregister(id: string): void;
  getAll(): InteractiveObjectDescriptor[];
  /** Evaluate closest valid interactive object within range of avatarPosition */
  evaluate(
    avatarPosition: [number, number, number],
    avatarFacingYaw: number
  ): InteractionEvaluationResult;
  /** Trigger interaction on the currently focused object and return the resulting action payload */
  trigger(objectId: string): {
    descriptor: InteractiveObjectDescriptor;
    archetype: InteractionArchetype;
    timestamp: number;
  } | null;
}
```

