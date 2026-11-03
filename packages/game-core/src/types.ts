export type LocomotionState = 'Idle' | 'Walking' | 'Running' | 'Jumping';
export type InputDeviceMode = 'desktop' | 'touch';
export type InteractionArchetype = 'info_plaque' | 'world_prop';
export type WorldPropReaction = 'toggle_lantern' | 'ring_chime' | 'rest_bench';
export type SessionPhase = 'loading' | 'ready' | 'playing' | 'paused';
export type QualityTier = 'auto' | 'low' | 'medium' | 'high';

export interface PlayerAvatarState {
  /** World-space XYZ coordinates within playable zone bounds ([-40, 40] X/Z, y >= 0) */
  position: [number, number, number];
  /** Linear velocity in world space; horizontal speed <= 7.5 m/s (run), <= 4.0 m/s (walk) */
  velocity: [number, number, number];
  /** Current horizontal facing angle in normalized radians [-PI, PI] */
  facingYaw: number;
  /** Desired horizontal facing angle in normalized radians [-PI, PI] */
  targetYaw: number;
  /** Active locomotion & animation state */
  locomotionState: LocomotionState;
  /** Grounded status reported by Rapier KinematicCharacterController */
  isGrounded: boolean;
  /** Vertical velocity component (jump impulse +6.5 m/s; gravity -18.0 m/s^2; terminal -25.0 m/s) */
  verticalVelocity: number;
}

export interface FollowCameraState {
  /** Horizontal orbit angle in continuous [0, 2*PI) radians (360-degree orbit) */
  yaw: number;
  /** Vertical pitch angle clamped to [0.15 rad, 1.35 rad] */
  pitch: number;
  /** User-selected zoom distance clamped to [2.5 m, 10.0 m] */
  targetDistance: number;
  /** Obstacle-clamped distance in [0.8 m, targetDistance] */
  effectiveDistance: number;
  /** Target look-at offset above avatar base; default [0, 1.4, 0] */
  pivotOffset: [number, number, number];
}

export interface NormalizedInputSnapshot {
  /** Horizontal movement in [-1.0, 1.0]; sqrt(moveX^2 + moveZ^2) <= 1.0 */
  moveX: number;
  /** Forward/backward movement in [-1.0, 1.0]; sqrt(moveX^2 + moveZ^2) <= 1.0 */
  moveZ: number;
  /** True when desktop Shift is held OR mobile dedicated Run button is active */
  runHeld: boolean;
  /** Edge-triggered for 1 frame when Space or mobile Jump button is pressed */
  jumpPressed: boolean;
  /** Edge-triggered for 1 frame when E or mobile Interact button is pressed */
  interactPressed: boolean;
  /** Edge-triggered for 1 frame when ESC or mobile Menu button is pressed */
  menuPressed: boolean;
  /** Held while desktop Alt key is pressed to reveal cursor (Genshin Impact style) */
  cursorRevealHeld: boolean;
  /** Horizontal camera orbit delta (radians) accumulated since previous frame */
  lookDeltaX: number;
  /** Vertical camera pitch delta (radians) accumulated since previous frame */
  lookDeltaY: number;
  /** Camera zoom distance delta (meters) accumulated since previous frame */
  zoomDelta: number;
  /** Most recently active input device mode */
  activeDevice: InputDeviceMode;
}

export interface InfoCardContent {
  heading: string;
  body: string;
  facts: string[];
}

export interface InteractiveObjectDescriptor {
  /** Unique non-empty slug (e.g., 'plaque-panda-habitat') */
  id: string;
  /** Display name shown in contextual prompt (1-60 chars) */
  title: string;
  /** Action verb shown in contextual prompt (1-30 chars) */
  promptAction: string;
  /** Archetype determining UI card vs 3D world prop state response */
  archetype: InteractionArchetype;
  /** World-space position of the object */
  position: [number, number, number];
  /** Detection radius in [1.5 m, 4.5 m] */
  interactionRadius: number;
  /** Required when archetype === 'info_plaque' */
  infoCard?: InfoCardContent;
  /** Required when archetype === 'world_prop' */
  propReactionType?: WorldPropReaction;
}

export interface UserSettings {
  /** Range [0.2, 2.5], default 1.0 */
  cameraSensitivity: number;
  /** Default false */
  invertCameraY: boolean;
  /** Default false */
  audioMuted: boolean;
  /** Range [0.0, 1.0], default 0.7 */
  masterVolume: number;
  /** Default 'auto' */
  qualityTier: QualityTier;
  /** Default true */
  showControlHints: boolean;
}

export interface SolidObstacleCollider {
  id: string;
  kind: 'tree' | 'rock' | 'bamboo' | 'pillar';
  position: [number, number, number];
  radius: number;
  height: number;
  scale?: number;
}

