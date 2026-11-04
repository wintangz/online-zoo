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
  /** Optional multi-seat slots when propReactionType === 'rest_bench' (FR-012 - FR-015) */
  seats?: WorldSeatSlotDescriptor[];
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

// ============================================================================
// Feature 002: Multiplayer Foundation Types
// ============================================================================

export type MultiplayerConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected';

// ============================================================================
// Feature 003: Player Identity & Avatar Customization Types
// ============================================================================

export type SkinToneId =
  | 'warm-ivory'
  | 'golden-sand'
  | 'amber-tan'
  | 'rich-sienna'
  | 'deep-umber'
  | 'bamboo-sage';

export type HairstyleId =
  | 'explorer-bob'
  | 'sun-spiky'
  | 'bamboo-ponytail'
  | 'park-bun';

export type HairColorId =
  | 'espresso-black'
  | 'chestnut-brown'
  | 'golden-blonde'
  | 'copper-auburn'
  | 'silver-mist'
  | 'forest-teal';

export type OutfitId =
  | 'ranger-emerald'
  | 'safari-khaki'
  | 'botanist-cobalt'
  | 'sunset-coral'
  | 'panda-monochrome';

export type AccessoryId =
  | 'safari-hat'
  | 'bamboo-visor'
  | 'round-glasses'
  | 'explorer-backpack'
  | 'none';

export interface AvatarAppearance {
  skinTone: SkinToneId;
  hairstyle: HairstyleId;
  hairColor: HairColorId;
  outfit: OutfitId;
  accessory: AccessoryId;
}

export type DisplayNameErrorCode =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_CHARS'
  | 'PROFANITY_BLOCKED'
  | 'RESERVED_NAME';

export interface DisplayNameValidationResult {
  valid: boolean;
  normalizedName: string;
  errorCode?: DisplayNameErrorCode;
  errorMessage?: string;
}

export interface PlayerIdentityProfile {
  schemaVersion: 1;
  playerId: string;
  displayName: string;
  avatar: AvatarAppearance;
  isCustomized: boolean;
  updatedAt: string;
}

export interface AvatarDraftState {
  isOpen: boolean;
  displayName: string;
  avatar: AvatarAppearance;
  isDirty: boolean;
  validation: DisplayNameValidationResult;
}

export interface PlayerIdentityStoreSlice {
  profile: PlayerIdentityProfile;
  draft: AvatarDraftState;
}

export interface RemoteVisitorSummary {
  sessionId: string;
  playerId?: string;
  baseDisplayName?: string;
  displayName: string;
  accentColor: string;
  avatar?: AvatarAppearance;
  locomotionState: LocomotionState;
  activeEmote?: ActiveAvatarEmote | null;
  seatedOn?: SeatedAttachmentState | null;
}

export interface MultiplayerSessionUIState {
  status: MultiplayerConnectionStatus;
  roomId: string;
  localSessionId: string | null;
  localDisplayName: string | null;
  localAccentColor: string | null;
  visitorCount: number;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  lastDisconnectReason: string | null;
  remoteVisitors: Record<string, RemoteVisitorSummary>;
}

export interface AuthoritativePlayerTransform {
  position: [number, number, number];
  velocity: [number, number, number];
  facingYaw: number;
  locomotionState: LocomotionState;
  sequence: number;
  serverTimestamp: number;
  reconciled?: boolean;
  discrepancyDistance?: number;
}

export interface PlayerSessionRecord {
  sessionId: string;
  playerId: string;
  resumeToken: string;
  baseDisplayName: string;
  displayName: string;
  accentColor: string;
  avatar: AvatarAppearance;
  roomId: string;
  spawnIndex: number;
  connectedAt: number;
  lastHeartbeatAt: number;
  lastMoveAt: number;
  transform: AuthoritativePlayerTransform;
  activeEmote?: ActiveAvatarEmote | null;
  seatedOn?: SeatedAttachmentState | null;
}

export interface ResumableSessionEntry {
  record: PlayerSessionRecord;
  disconnectedAt: number;
  /** disconnectedAt + 30_000 (30-second grace window) */
  expiresAt: number;
}

export interface SharedPropAuthorityState {
  objectId: string;
  active: boolean;
  lastTriggeredBy: string | null;
  lastTriggeredAt: number;
}

export interface ZooInstanceRoom {
  roomId: string;
  maxPlayers: number;
  nextVisitorNumber: number;
  activeSessions: Map<string, PlayerSessionRecord>;
  resumableSessions: Map<string, ResumableSessionEntry>;
  propStates: Record<string, SharedPropAuthorityState>;
  seatStates: Record<string, WorldSeatOccupancyState[]>;
  recentChatHistory: ProximityChatMessage[];
  tickSequence: number;
  lastTickAt: number;
}

// ============================================================================
// Feature 004: Social Interaction Types
// ============================================================================

export type ChatErrorCode =
  | 'EMPTY_MESSAGE'
  | 'MESSAGE_TOO_LONG'
  | 'PROFANITY_BLOCKED'
  | 'RATE_LIMITED';

export interface ChatValidationResult {
  valid: boolean;
  normalizedText: string;
  errorCode?: ChatErrorCode;
  errorMessage?: string;
}

export interface ProximityChatMessage {
  messageId: string;
  roomId: string;
  senderSessionId: string;
  senderPlayerId: string;
  senderDisplayName: string;
  senderAccentColor: string;
  text: string;
  position: [number, number, number];
  createdAt: number;
  expiresAt: number;
}

export type EmoteId = 'wave' | 'dance' | 'clap' | 'laugh' | 'sit';

export interface EmoteDescriptor {
  id: EmoteId;
  label: string;
  icon: string;
  durationMs: number;
}

export interface ActiveAvatarEmote {
  emoteId: EmoteId;
  label: string;
  icon: string;
  startedAt: number;
  expiresAt: number;
}

export interface WorldSeatSlotDescriptor {
  seatIndex: number;
  label: string;
  worldPosition: [number, number, number];
  facingYaw: number;
}

export interface WorldSeatOccupancyState {
  objectId: string;
  seatIndex: number;
  label: string;
  worldPosition: [number, number, number];
  facingYaw: number;
  occupiedBySessionId: string | null;
  occupiedByPlayerId: string | null;
  occupiedByDisplayName: string | null;
  occupiedAt: number;
}

export interface SeatedAttachmentState {
  objectId: string;
  seatIndex: number;
  seatPosition: [number, number, number];
  facingYaw: number;
}

export interface FriendRequestRecord {
  requestId: string;
  fromPlayerId: string;
  fromDisplayName: string;
  toPlayerId: string;
  toDisplayName: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface FriendStatusEntry {
  playerId: string;
  displayName: string;
  online: boolean;
  roomId: string | null;
  roomVisitorCount: number;
  roomMaxPlayers: number;
  canJoin: boolean;
}

export interface ZooInstanceSummary {
  roomId: string;
  label: string;
  visitorCount: number;
  maxPlayers: number;
  isFull: boolean;
}

export type ReportReason =
  | 'inappropriate-chat'
  | 'harassment-spam'
  | 'offensive-name'
  | 'other';

export interface PlayerModerationReport {
  reportId: string;
  reporterPlayerId: string;
  reporterSessionId: string;
  reportedPlayerId: string;
  reportedSessionId: string | null;
  reportedDisplayName: string;
  roomId: string;
  reason: ReportReason;
  details: string;
  recentChatSnapshot: Array<{
    messageId: string;
    senderPlayerId: string;
    senderDisplayName: string;
    text: string;
    createdAt: number;
  }>;
  createdAt: string;
}

export interface PersistedSocialProfile {
  schemaVersion: 1;
  friends: Record<string, { playerId: string; displayName: string; addedAt: number }>;
  mutedPlayerIds: string[];
  blockedPlayerIds: string[];
}

export interface SocialStoreSlice {
  chatMessages: ProximityChatMessage[];
  activeSpeechBubbles: Record<string, ProximityChatMessage>;
  chatFeedback: {
    type: 'error' | 'info';
    message: string;
    timestamp: number;
  } | null;
  localActiveEmote: ActiveAvatarEmote | null;
  remoteActiveEmotes: Record<string, ActiveAvatarEmote>;
  seatStates: Record<string, WorldSeatOccupancyState[]>;
  localSeatedState: SeatedAttachmentState | null;
  isSocialDrawerOpen: boolean;
  availableInstances: ZooInstanceSummary[];
  friends: FriendStatusEntry[];
  incomingRequests: FriendRequestRecord[];
  outgoingRequests: FriendRequestRecord[];
  mutedPlayerIds: string[];
  blockedPlayerIds: string[];
  reportModalTarget: {
    playerId: string;
    sessionId: string | null;
    displayName: string;
  } | null;
  submittedReports: PlayerModerationReport[];
  reportConfirmationMessage: string | null;
  socialNotice: string | null;
}

export interface RemoteTransformSnapshot {
  position: [number, number, number];
  velocity: [number, number, number];
  facingYaw: number;
  locomotionState: LocomotionState;
  sequence: number;
  serverTimestamp: number;
  receivedAt: number;
}

export interface RemotePlayerInterpolationState {
  sessionId: string;
  displayName: string;
  accentColor: string;
  /** Ring buffer of recent authoritative snapshots (up to 10 entries, ordered by sequence) */
  snapshots: RemoteTransformSnapshot[];
  /** Current 60Hz interpolated render state read directly by RemotePlayerAvatar useFrame */
  renderPosition: [number, number, number];
  renderYaw: number;
  renderLocomotionState: LocomotionState;
  lastUpdatedAt: number;
}

export interface LocalReconciliationState {
  pendingOffset: [number, number, number];
  lastAcknowledgedSequence: number;
  lastServerPosition: [number, number, number];
  reconciliationCount: number;
  lastSnapAt: number;
}


