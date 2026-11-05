import { createStore } from 'zustand/vanilla';
import type {
  AchievementRewardErrorCode,
  ActiveAvatarEmote,
  ActiveFoodConsumption,
  AvatarAppearance,
  BetaReadinessStoreSlice,
  DiagnosticErrorEntry,
  DiningStoreSlice,
  EventErrorCode,
  EventsStoreSlice,
  EventToastNotification,
  FollowCameraState,
  FoodConsumeErrorCode,
  FoodPurchaseErrorCode,
  FriendRequestRecord,
  FriendStatusEntry,
  HelpCenterTabId,
  InputDeviceMode,
  InteractiveObjectDescriptor,
  LocalReconciliationState,
  LocomotionState,
  MaintenanceNoticeState,
  MultiplayerSessionUIState,
  OpsHealthSnapshot,
  PassportStoreSlice,
  PassportTabId,
  PassportToastNotification,
  PerformanceTelemetrySnapshot,
  PersistedSocialProfile,
  PlayerAvatarState,
  PlayerIdentityProfile,
  PlayerIdentityStoreSlice,
  PlayerModerationReport,
  ProximityChatMessage,
  QualityTier,
  RemotePlayerInterpolationState,
  RemoteVisitorSummary,
  SeatedAttachmentState,
  SessionPhase,
  SocialStoreSlice,
  UserSettings,
  WorldSeatOccupancyState,
  WorldZoneId,
  ZooInstanceSummary
} from '../types';
import {
  DEFAULT_AVATAR_APPEARANCE,
  getOutfitColors,
  isValidAvatarAppearance,
  sanitizeAvatarAppearance
} from '../identity/avatarCatalog';
import { validateDisplayName } from '../identity/displayNameValidator';
import {
  generatePersistentPlayerId,
  loadOrCreatePlayerIdentity,
  savePlayerIdentity,
  validateAndFormatPlayerId
} from '../identity/identityPersistence';
import {
  DEFAULT_MAX_PLAYERS_PER_ROOM,
  DEFAULT_PUBLIC_INSTANCES,
  DEFAULT_ROOM_ID
} from '../multiplayer/protocol';
import { MAX_CHAT_HISTORY_ENTRIES } from '../social/chatModeration';
import {
  loadPersistedSocialState,
  savePersistedSocialState
} from '../social/socialPersistence';
import { createInitialRoomSeatStates } from '../world/pandaForestLayout';
import {
  resolveZoneForRoomId,
  ZOO_LOBBY_INTERACTIVE_OBJECTS
} from '../world/zoneRegistry';
import {
  ANIMAL_SPECIES_CATALOG,
  AnimalSimulationSystem,
  createDefaultEncyclopediaState,
  createInitialAnimalStates,
  createInitialHabitatFeedingStates,
  loadPlayerEncyclopedia,
  recordSpeciesDiscovery,
  recordSpeciesFeeding,
  type AnimalInstanceState,
  type AnimalSpeciesId,
  type HabitatFeedingState,
  type HabitatId,
  type PlayerEncyclopediaState
} from '../animals';
import {
  clampCurrencyBalance,
  createDefaultDiningWallet,
  FOOD_CATALOG_BY_ID,
  isValidFoodItemId,
  loadPersistedDiningWallet,
  MAX_FOOD_ITEM_QUANTITY,
  sanitizeFoodInventory,
  savePersistedDiningWallet,
  type FoodInventoryRecord,
  type FoodItemId
} from '../dining';
import {
  ACHIEVEMENTS_BY_ID,
  countDiscoveredSpecies,
  createDefaultPassportState,
  evaluatePassportAchievements,
  evaluateProximityZoneStamp,
  isValidAchievementId,
  loadPlayerPassportState,
  PASSPORT_ZONES_BY_ID,
  recordPassportActivityCompletion,
  recordPassportSocialInteraction,
  recordPassportZoneStamp,
  sanitizePlayerPassportState,
  savePlayerPassportState,
  type AchievementId,
  type PassportZoneId,
  type PlayerPassportState
} from '../passport';
import {
  createDefaultEventsList,
  RoomEventsEngine,
  ZOO_EVENTS_BY_ID,
  type LiveZooEventState,
  type SeasonalThemeId,
  type ZooEventId,
  type ZooEventScheduleConfig
} from '../events';
import {
  loadPersistedBetaReadinessState,
  PUBLIC_BETA_VERSION,
  savePersistedBetaReadinessState
} from '../readiness';

export interface AnimalStoreSlice {
  animals: AnimalInstanceState[];
  habitatFeedings: Record<HabitatId, HabitatFeedingState>;
  inspectedAnimalId: string | null;
  isEncyclopediaOpen: boolean;
  encyclopedia: PlayerEncyclopediaState;
  discoveryToast: {
    speciesId: AnimalSpeciesId;
    commonName: string;
    timestamp: number;
  } | null;
  feedingNotice: string | null;
}

export const USER_SETTINGS_STORAGE_KEY = 'online-zoo:settings:v1';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  cameraSensitivity: 1.0,
  invertCameraY: false,
  audioMuted: false,
  masterVolume: 0.7,
  qualityTier: 'auto',
  showControlHints: true
};

export function sanitizeUserSettings(partial: Partial<UserSettings>): UserSettings {
  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));
  const rawSens =
    typeof partial.cameraSensitivity === 'number' && Number.isFinite(partial.cameraSensitivity)
      ? partial.cameraSensitivity
      : DEFAULT_USER_SETTINGS.cameraSensitivity;
  const rawVol =
    typeof partial.masterVolume === 'number' && Number.isFinite(partial.masterVolume)
      ? partial.masterVolume
      : DEFAULT_USER_SETTINGS.masterVolume;
  const validTiers: QualityTier[] = ['auto', 'low', 'medium', 'high'];
  const tier =
    partial.qualityTier && validTiers.includes(partial.qualityTier)
      ? partial.qualityTier
      : DEFAULT_USER_SETTINGS.qualityTier;

  return {
    cameraSensitivity: Number(clamp(rawSens, 0.2, 2.5).toFixed(2)),
    invertCameraY:
      typeof partial.invertCameraY === 'boolean'
        ? partial.invertCameraY
        : DEFAULT_USER_SETTINGS.invertCameraY,
    audioMuted:
      typeof partial.audioMuted === 'boolean'
        ? partial.audioMuted
        : DEFAULT_USER_SETTINGS.audioMuted,
    masterVolume: Number(clamp(rawVol, 0.0, 1.0).toFixed(2)),
    qualityTier: tier,
    showControlHints:
      typeof partial.showControlHints === 'boolean'
        ? partial.showControlHints
        : DEFAULT_USER_SETTINGS.showControlHints
  };
}

export function loadPersistedSettings(): UserSettings {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_USER_SETTINGS };
  }
  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return sanitizeUserSettings(parsed);
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

export function savePersistedSettings(settings: UserSettings): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * High-frequency 60-120 Hz mutable frame state.
 * Mutated directly inside the game loop without triggering React component re-renders.
 */
export interface MutableGameRuntimeState {
  avatar: PlayerAvatarState;
  camera: FollowCameraState;
  cameraPosition: [number, number, number];
  cameraLookAt: [number, number, number];
  frameCount: number;
  lastDeltaTime: number;
  remotePlayers: Map<string, RemotePlayerInterpolationState>;
  reconciliation: LocalReconciliationState;
  animalSimulation: AnimalSimulationSystem;
}

export function createInitialMutableRuntimeState(
  spawnPosition: [number, number, number] = [0, 0.1, 18],
  spawnYaw = 0
): MutableGameRuntimeState {
  return {
    avatar: {
      position: [...spawnPosition],
      velocity: [0, 0, 0],
      facingYaw: spawnYaw,
      targetYaw: spawnYaw,
      locomotionState: 'Idle',
      isGrounded: true,
      verticalVelocity: 0
    },
    camera: {
      yaw: 0,
      pitch: 0.45,
      targetDistance: 5.5,
      effectiveDistance: 5.5,
      pivotOffset: [0, 1.4, 0]
    },
    cameraPosition: [spawnPosition[0], spawnPosition[1] + 3.5, spawnPosition[2] + 5.0],
    cameraLookAt: [spawnPosition[0], spawnPosition[1] + 1.4, spawnPosition[2]],
    frameCount: 0,
    lastDeltaTime: 0,
    remotePlayers: new Map<string, RemotePlayerInterpolationState>(),
    reconciliation: {
      pendingOffset: [0, 0, 0],
      lastAcknowledgedSequence: 0,
      lastServerPosition: [...spawnPosition],
      reconciliationCount: 0,
      lastSnapAt: 0
    },
    animalSimulation: new AnimalSimulationSystem()
  };
}

export const mutableRuntimeState: MutableGameRuntimeState = createInitialMutableRuntimeState();

export function resetMutableRuntimeState(
  spawnPosition: [number, number, number] = [0, 0.1, 18],
  spawnYaw = 0
): void {
  const fresh = createInitialMutableRuntimeState(spawnPosition, spawnYaw);
  mutableRuntimeState.avatar = fresh.avatar;
  mutableRuntimeState.camera = fresh.camera;
  mutableRuntimeState.cameraPosition = fresh.cameraPosition;
  mutableRuntimeState.cameraLookAt = fresh.cameraLookAt;
  mutableRuntimeState.frameCount = 0;
  mutableRuntimeState.lastDeltaTime = 0;
  mutableRuntimeState.remotePlayers.clear();
  mutableRuntimeState.reconciliation = fresh.reconciliation;
  mutableRuntimeState.animalSimulation = fresh.animalSimulation;
}

export const INITIAL_MULTIPLAYER_UI_STATE: MultiplayerSessionUIState = {
  status: 'connecting',
  roomId: DEFAULT_ROOM_ID,
  localSessionId: null,
  localDisplayName: null,
  localAccentColor: null,
  visitorCount: 1,
  reconnectAttempt: 0,
  maxReconnectAttempts: 5,
  lastDisconnectReason: null,
  remoteVisitors: {}
};

export const SSR_SAFE_DEFAULT_IDENTITY_PROFILE: PlayerIdentityProfile = {
  schemaVersion: 1,
  playerId: 'player-initial-visitor',
  displayName: 'Explorer #101',
  avatar: { ...DEFAULT_AVATAR_APPEARANCE },
  isCustomized: false,
  updatedAt: '1970-01-01T00:00:00.000Z'
};

function createInitialIdentitySlice(): PlayerIdentityStoreSlice {
  const profile: PlayerIdentityProfile = {
    ...SSR_SAFE_DEFAULT_IDENTITY_PROFILE,
    avatar: { ...SSR_SAFE_DEFAULT_IDENTITY_PROFILE.avatar }
  };
  return {
    profile,
    draft: {
      isOpen: false,
      displayName: profile.displayName,
      avatar: { ...profile.avatar },
      isDirty: false,
      validation: validateDisplayName(profile.displayName)
    }
  };
}

export function createInitialSocialSlice(): SocialStoreSlice {
  return {
    chatMessages: [],
    activeSpeechBubbles: {},
    chatFeedback: null,
    localActiveEmote: null,
    remoteActiveEmotes: {},
    seatStates: {
      ...createInitialRoomSeatStates(),
      ...createInitialRoomSeatStates(ZOO_LOBBY_INTERACTIVE_OBJECTS)
    },
    localSeatedState: null,
    isSocialDrawerOpen: false,
    availableInstances: DEFAULT_PUBLIC_INSTANCES.map((inst) => ({
      roomId: inst.roomId,
      label: inst.label,
      visitorCount: inst.roomId === DEFAULT_ROOM_ID ? 1 : 0,
      maxPlayers: DEFAULT_MAX_PLAYERS_PER_ROOM,
      isFull: false,
      status: 'healthy',
      friendCount: 0,
      isOverflow: false
    })),
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    mutedPlayerIds: [],
    blockedPlayerIds: [],
    allowFriendJoin: true,
    reportModalTarget: null,
    submittedReports: [],
    reportConfirmationMessage: null,
    socialNotice: null
  };
}

export function createInitialAnimalSlice(): AnimalStoreSlice {
  return {
    animals: createInitialAnimalStates(),
    habitatFeedings: createInitialHabitatFeedingStates(),
    inspectedAnimalId: null,
    isEncyclopediaOpen: false,
    encyclopedia: createDefaultEncyclopediaState(),
    discoveryToast: null,
    feedingNotice: null
  };
}

export function createInitialDiningSlice(): DiningStoreSlice {
  return {
    wallet: createDefaultDiningWallet(),
    activeStallId: null,
    isInventoryOpen: false,
    localActiveConsumption: null,
    remoteActiveConsumptions: {},
    purchaseFeedback: null
  };
}

export function createInitialPassportSlice(): PassportStoreSlice {
  return {
    state: createDefaultPassportState(),
    isPassportOpen: false,
    activeTab: 'stamps',
    activeToast: null,
    rewardFeedback: null
  };
}

let offlineEventsEngine = new RoomEventsEngine();

export function createInitialEventsSlice(): EventsStoreSlice {
  return {
    seasonalTheme: 'spring-blossom',
    events: createDefaultEventsList(Date.now(), 'spring-blossom'),
    isEventsModalOpen: false,
    activeEventToast: null,
    eventFeedback: null
  };
}

export function createInitialBetaReadinessSlice(): BetaReadinessStoreSlice {
  const persisted = loadPersistedBetaReadinessState();
  return {
    version: PUBLIC_BETA_VERSION,
    hasCompletedOnboarding: persisted.hasCompletedOnboarding,
    isOnboardingOpen: !persisted.hasCompletedOnboarding,
    isHelpCenterOpen: false,
    activeTab: 'controls',
    autoQualityAdjust: persisted.autoQualityAdjust,
    telemetry: {
      fps: 60,
      avgFrameTimeMs: 16.7,
      p95FrameTimeMs: 16.7,
      lowFpsStreak: 0,
      autoDowngradedCount: 0
    },
    feedbackNotice: null,
    maintenanceNotice: null,
    opsSnapshot: null,
    clientErrors: []
  };
}

function areConsumptionsEqual(
  a?: ActiveFoodConsumption | null,
  b?: ActiveFoodConsumption | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.itemId === b.itemId && a.startedAt === b.startedAt;
}

function areAvatarsEqual(a?: AvatarAppearance, b?: AvatarAppearance): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.skinTone === b.skinTone &&
    a.hairstyle === b.hairstyle &&
    a.hairColor === b.hairColor &&
    a.outfit === b.outfit &&
    a.accessory === b.accessory
  );
}

function areSeatsEqual(a?: SeatedAttachmentState | null, b?: SeatedAttachmentState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.objectId === b.objectId && a.seatIndex === b.seatIndex;
}

function areEmotesEqual(a?: ActiveAvatarEmote | null, b?: ActiveAvatarEmote | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.emoteId === b.emoteId && a.startedAt === b.startedAt;
}

function persistSocialSliceToStorage(
  playerId: string,
  friends: FriendStatusEntry[],
  mutedPlayerIds: string[],
  blockedPlayerIds: string[],
  allowFriendJoin?: boolean
): void {
  const existing = loadPersistedSocialState(playerId);
  const friendsRecord: PersistedSocialProfile['friends'] = {};
  for (const f of friends) {
    friendsRecord[f.playerId] = {
      playerId: f.playerId,
      displayName: f.displayName,
      addedAt: existing.friends[f.playerId]?.addedAt ?? Date.now()
    };
  }
  savePersistedSocialState(
    {
      schemaVersion: 1,
      friends: friendsRecord,
      mutedPlayerIds,
      blockedPlayerIds,
      allowFriendJoin:
        typeof allowFriendJoin === 'boolean'
          ? allowFriendJoin
          : (existing.allowFriendJoin ?? true)
    },
    playerId
  );
}

export interface GameUIStoreState {
  phase: SessionPhase;
  loadingProgress: number;
  locomotionState: LocomotionState;
  activeDevice: InputDeviceMode;
  isPointerLocked: boolean;
  isCursorRevealed: boolean;
  focusedObject: InteractiveObjectDescriptor | null;
  activePlaqueModal: InteractiveObjectDescriptor | null;
  propStates: Record<string, { active: boolean; lastTriggeredAt: number }>;
  settings: UserSettings;
  multiplayer: MultiplayerSessionUIState;
  identity: PlayerIdentityStoreSlice;
  social: SocialStoreSlice;
  animalSim: AnimalStoreSlice;
  dining: DiningStoreSlice;
  passport: PassportStoreSlice;
  events: EventsStoreSlice;
  betaReadiness: BetaReadinessStoreSlice;
  isHudCompact: boolean;
  isDevDebugOpen: boolean;
  isChatPanelOpen: boolean;
  isSettingsModalOpen: boolean;
  currentZoneId: WorldZoneId;
  transitionTargetZone: WorldZoneId | null;
  pendingGateArrival: {
    zoneId: WorldZoneId;
    position: [number, number, number];
    yaw: number;
  } | null;

  setPhase: (phase: SessionPhase) => void;
  setHudCompact: (compact: boolean) => void;
  toggleHudCompact: () => void;
  setDevDebugOpen: (isOpen: boolean) => void;
  toggleDevDebug: () => void;
  setChatPanelOpen: (isOpen: boolean) => void;
  toggleChatPanel: () => void;
  setSettingsModalOpen: (isOpen: boolean) => void;
  setCurrentZoneId: (zoneId: WorldZoneId) => void;
  setTransitionTargetZone: (zoneId: WorldZoneId | null) => void;
  setPendingGateArrival: (
    arrival: {
      zoneId: WorldZoneId;
      position: [number, number, number];
      yaw: number;
    } | null
  ) => void;
  setLoadingProgress: (progress: number) => void;
  setLocomotionState: (state: LocomotionState) => void;
  setActiveDevice: (device: InputDeviceMode) => void;
  setCursorState: (locked: boolean, revealed: boolean) => void;
  setFocusedObject: (obj: InteractiveObjectDescriptor | null) => void;
  openPlaqueModal: (obj: InteractiveObjectDescriptor) => void;
  closePlaqueModal: () => void;
  togglePropState: (objectId: string) => void;
  setPropStateAuthoritative: (objectId: string, active: boolean, lastTriggeredAt: number) => void;
  setAllPropStatesAuthoritative: (
    propStates: Record<string, { active: boolean; lastTriggeredAt: number }>
  ) => void;
  updateMultiplayerState: (partial: Partial<MultiplayerSessionUIState>) => void;
  upsertRemoteVisitor: (visitor: RemoteVisitorSummary) => void;
  removeRemoteVisitor: (sessionId: string) => void;
  setRemoteVisitors: (visitors: Record<string, RemoteVisitorSummary>) => void;
  initializePlayerIdentity: () => PlayerIdentityProfile;
  openAvatarCustomizer: () => void;
  cancelAvatarCustomizer: () => void;
  setDraftDisplayName: (displayName: string) => void;
  setDraftAvatarOption: <K extends keyof AvatarAppearance>(
    category: K,
    value: AvatarAppearance[K]
  ) => void;
  resetDraftToDefault: () => void;
  confirmAvatarCustomization: () => {
    ok: boolean;
    profile?: PlayerIdentityProfile;
    errorMessage?: string;
  };
  tunePlayerId: (customPlayerId: string) => {
    ok: boolean;
    profile?: PlayerIdentityProfile;
    errorMessage?: string;
  };
  regeneratePlayerId: () => PlayerIdentityProfile;
  setAvailableInstances: (instances: ZooInstanceSummary[]) => void;
  addProximityChatMessage: (message: ProximityChatMessage) => void;
  pruneExpiredSocialEffects: (now?: number) => void;
  setChatFeedback: (
    feedback: { type: 'error' | 'info'; message: string; timestamp?: number } | null
  ) => void;
  setLocalActiveEmote: (emote: ActiveAvatarEmote | null) => void;
  setRemoteActiveEmote: (
    sessionId: string,
    playerId: string | undefined,
    emote: ActiveAvatarEmote | null
  ) => void;
  setSeatStatesAuthoritative: (
    objectId: string,
    seats: WorldSeatOccupancyState[],
    localSessionId?: string | null
  ) => void;
  setAllSeatStatesAuthoritative: (
    seatStates: Record<string, WorldSeatOccupancyState[]>,
    localSessionId?: string | null
  ) => void;
  setLocalSeatedState: (seated: SeatedAttachmentState | null) => void;
  setSocialDrawerOpen: (isOpen: boolean) => void;
  updateSocialPresence: (payload: {
    friends: FriendStatusEntry[];
    incomingRequests: FriendRequestRecord[];
    outgoingRequests: FriendRequestRecord[];
    blockedPlayerIds?: string[];
    availableInstances?: ZooInstanceSummary[];
    allowFriendJoin?: boolean;
  }) => void;
  setAllowFriendJoin: (allowFriendJoin: boolean) => void;
  toggleMutePlayer: (targetPlayerId: string) => boolean;
  setBlockPlayer: (targetPlayerId: string, blocked: boolean) => void;
  openReportModal: (target: {
    playerId: string;
    sessionId: string | null;
    displayName: string;
  }) => void;
  closeReportModal: () => void;
  recordSubmittedReport: (report: PlayerModerationReport) => void;
  setSocialNotice: (notice: string | null) => void;
  setAnimalsAuthoritative: (
    animals: AnimalInstanceState[],
    habitatFeedings?: Record<HabitatId, HabitatFeedingState>
  ) => void;
  inspectAnimal: (animalId: string | null) => void;
  setEncyclopediaOpen: (isOpen: boolean) => void;
  discoverAnimalSpecies: (speciesId: AnimalSpeciesId) => boolean;
  recordAnimalSpeciesFed: (speciesId: AnimalSpeciesId) => void;
  clearDiscoveryToast: () => void;
  setFeedingNotice: (notice: string | null) => void;
  stepLocalAnimalSimulation: (dtSeconds: number, now?: number) => void;
  openFoodStall: (stallId: string) => void;
  closeFoodStall: () => void;
  setInventoryOpen: (isOpen: boolean) => void;
  applyDiningWalletUpdate: (
    currencyBalance: number,
    inventory: FoodInventoryRecord
  ) => void;
  setPurchaseFeedback: (
    feedback: {
      type: 'success' | 'error';
      message: string;
      code?: FoodPurchaseErrorCode | FoodConsumeErrorCode;
      timestamp?: number;
    } | null
  ) => void;
  setLocalActiveConsumption: (consumption: ActiveFoodConsumption | null) => void;
  setRemoteActiveConsumption: (
    sessionId: string,
    playerId: string | undefined,
    consumption: ActiveFoodConsumption | null
  ) => void;
  purchaseFoodItemOffline: (itemId: FoodItemId) => {
    ok: boolean;
    errorCode?: FoodPurchaseErrorCode;
    message: string;
  };
  consumeFoodItemOffline: (
    itemId: FoodItemId,
    now?: number
  ) => {
    ok: boolean;
    errorCode?: FoodConsumeErrorCode;
    message: string;
  };
  setPassportOpen: (isOpen: boolean, tab?: PassportTabId) => void;
  setPassportTab: (tab: PassportTabId) => void;
  recordZoneVisit: (zoneId: PassportZoneId) => {
    newlyStamped: boolean;
    newlyUnlockedAchievementIds: AchievementId[];
  };
  evaluateProximityPassportZones: (
    playerPosition: [number, number, number]
  ) => {
    newlyStampedZoneIds: PassportZoneId[];
    newlyUnlockedAchievementIds: AchievementId[];
  };
  recordPassportSocialAction: () => AchievementId[];
  recordPassportActivityCompleted: () => AchievementId[];
  syncPassportWithEncyclopedia: () => AchievementId[];
  applyPassportServerUpdate: (passportState: PlayerPassportState) => void;
  setPassportRewardFeedback: (
    feedback: {
      type: 'success' | 'error';
      message: string;
      code?: AchievementRewardErrorCode;
      timestamp?: number;
    } | null
  ) => void;
  claimAchievementRewardOffline: (achievementId: AchievementId) => {
    ok: boolean;
    errorCode?: AchievementRewardErrorCode;
    rewardCoinsGranted: number;
    message: string;
  };
  selectActivePassportBadge: (badge: string | null) => void;
  dismissPassportToast: () => void;
  setEventsModalOpen: (isOpen: boolean) => void;
  applyZooEventsSnapshot: (payload: {
    seasonalTheme: SeasonalThemeId;
    events: LiveZooEventState[];
    notice?: string;
    errorCode?: EventErrorCode;
  }) => void;
  setEventFeedback: (
    feedback: {
      type: 'success' | 'error';
      message: string;
      code?: EventErrorCode;
      timestamp?: number;
    } | null
  ) => void;
  dismissEventToast: () => void;
  joinZooEventOffline: (eventId: ZooEventId) => {
    ok: boolean;
    errorCode?: EventErrorCode;
    message: string;
  };
  leaveZooEventOffline: (eventId: ZooEventId) => {
    ok: boolean;
    errorCode?: EventErrorCode;
    message: string;
  };
  performEventActionOffline: (eventId: ZooEventId) => {
    ok: boolean;
    errorCode?: EventErrorCode;
    message: string;
  };
  claimEventRewardOffline: (eventId: ZooEventId) => {
    ok: boolean;
    errorCode?: EventErrorCode;
    rewardCoinsGranted: number;
    stampedZoneId?: PassportZoneId;
    message: string;
  };
  configureZooEventsOffline: (config: ZooEventScheduleConfig) => {
    ok: boolean;
    errorCode?: EventErrorCode;
    message: string;
  };
  setOnboardingOpen: (isOpen: boolean) => void;
  completeOnboarding: () => void;
  setHelpCenterOpen: (isOpen: boolean, tab?: HelpCenterTabId) => void;
  setHelpCenterTab: (tab: HelpCenterTabId) => void;
  setAutoQualityAdjust: (enabled: boolean) => void;
  updatePerformanceTelemetry: (telemetry: PerformanceTelemetrySnapshot) => void;
  setBetaFeedbackNotice: (
    notice: { type: 'success' | 'error'; message: string; timestamp?: number } | null
  ) => void;
  setMaintenanceNotice: (notice: MaintenanceNoticeState | null) => void;
  setOpsSnapshot: (snapshot: OpsHealthSnapshot) => void;
  recordClientError: (code: string, message: string) => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSession: () => void;
}

export function computeIsAnyPanelOpen(
  state: Pick<
    GameUIStoreState,
    | 'activePlaqueModal'
    | 'identity'
    | 'social'
    | 'isChatPanelOpen'
    | 'animalSim'
    | 'dining'
    | 'passport'
    | 'events'
    | 'betaReadiness'
    | 'isSettingsModalOpen'
    | 'phase'
  >
): boolean {
  return (
    state.phase === 'paused' ||
    state.isSettingsModalOpen ||
    state.activePlaqueModal !== null ||
    state.identity.draft.isOpen ||
    state.social.isSocialDrawerOpen ||
    state.social.reportModalTarget !== null ||
    state.isChatPanelOpen ||
    state.animalSim.isEncyclopediaOpen ||
    state.animalSim.inspectedAnimalId !== null ||
    state.dining.isInventoryOpen ||
    state.dining.activeStallId !== null ||
    state.passport.isPassportOpen ||
    state.events.isEventsModalOpen ||
    state.betaReadiness.isHelpCenterOpen
  );
}

const INITIAL_PROP_STATES: Record<string, { active: boolean; lastTriggeredAt: number }> = {
  'prop-stone-lantern': { active: true, lastTriggeredAt: 0 },
  'prop-wind-chime': { active: false, lastTriggeredAt: 0 },
  'prop-scenic-bench': { active: false, lastTriggeredAt: 0 },
  'prop-plaza-bench': { active: false, lastTriggeredAt: 0 },
  'prop-pond-chair': { active: false, lastTriggeredAt: 0 },
  'prop-plaza-cafe-table': { active: false, lastTriggeredAt: 0 },
  'prop-bamboo-picnic-table': { active: false, lastTriggeredAt: 0 },
  'prop-lobby-bench-west': { active: false, lastTriggeredAt: 0 },
  'prop-lobby-bench-east': { active: false, lastTriggeredAt: 0 }
};

export const gameStore = createStore<GameUIStoreState>((set, get) => ({
  phase: 'loading',
  loadingProgress: 0,
  locomotionState: 'Idle',
  activeDevice: 'desktop',
  isPointerLocked: false,
  isCursorRevealed: false,
  focusedObject: null,
  activePlaqueModal: null,
  propStates: { ...INITIAL_PROP_STATES },
  settings: { ...DEFAULT_USER_SETTINGS },
  multiplayer: { ...INITIAL_MULTIPLAYER_UI_STATE },
  identity: createInitialIdentitySlice(),
  social: createInitialSocialSlice(),
  animalSim: createInitialAnimalSlice(),
  dining: createInitialDiningSlice(),
  passport: createInitialPassportSlice(),
  events: createInitialEventsSlice(),
  betaReadiness: createInitialBetaReadinessSlice(),
  isHudCompact: false,
  isDevDebugOpen: false,
  isChatPanelOpen: false,
  isSettingsModalOpen: false,
  currentZoneId: resolveZoneForRoomId(INITIAL_MULTIPLAYER_UI_STATE.roomId).zoneId,
  transitionTargetZone: null,
  pendingGateArrival: null,

  setHudCompact: (isHudCompact) => set({ isHudCompact }),
  toggleHudCompact: () => set((state) => ({ isHudCompact: !state.isHudCompact })),
  setDevDebugOpen: (isDevDebugOpen) => set({ isDevDebugOpen }),
  toggleDevDebug: () => set((state) => ({ isDevDebugOpen: !state.isDevDebugOpen })),
  setChatPanelOpen: (isChatPanelOpen) =>
    set((state) => {
      const next = { ...state, isChatPanelOpen };
      return {
        isChatPanelOpen,
        isPointerLocked: isChatPanelOpen ? false : state.isPointerLocked,
        isCursorRevealed: computeIsAnyPanelOpen(next)
      };
    }),
  toggleChatPanel: () =>
    set((state) => {
      const isChatPanelOpen = !state.isChatPanelOpen;
      const next = { ...state, isChatPanelOpen };
      return {
        isChatPanelOpen,
        isPointerLocked: isChatPanelOpen ? false : state.isPointerLocked,
        isCursorRevealed: computeIsAnyPanelOpen(next)
      };
    }),
  setSettingsModalOpen: (isSettingsModalOpen) =>
    set((state) => {
      const next = { ...state, isSettingsModalOpen };
      return {
        isSettingsModalOpen,
        isPointerLocked: isSettingsModalOpen ? false : state.isPointerLocked,
        isCursorRevealed: computeIsAnyPanelOpen(next)
      };
    }),
  setCurrentZoneId: (currentZoneId) => set({ currentZoneId }),
  setTransitionTargetZone: (transitionTargetZone) => set({ transitionTargetZone }),
  setPendingGateArrival: (pendingGateArrival) => set({ pendingGateArrival }),
  setPhase: (phase) =>
    set((state) => {
      const next = { ...state, phase };
      return {
        phase,
        isPointerLocked: phase === 'playing' ? state.isPointerLocked : false,
        isCursorRevealed:
          phase === 'paused'
            ? true
            : phase === 'playing'
              ? computeIsAnyPanelOpen(next)
              : state.isCursorRevealed
      };
    }),
  setLoadingProgress: (progress) =>
    set({ loadingProgress: Math.min(100, Math.max(0, Math.round(progress))) }),
  setLocomotionState: (locomotionState) => {
    if (get().locomotionState !== locomotionState) {
      set({ locomotionState });
    }
  },
  setActiveDevice: (activeDevice) => {
    if (get().activeDevice !== activeDevice) {
      set({ activeDevice });
    }
  },
  setCursorState: (isPointerLocked, isCursorRevealed) => {
    const cur = get();
    if (cur.isPointerLocked !== isPointerLocked || cur.isCursorRevealed !== isCursorRevealed) {
      set({ isPointerLocked, isCursorRevealed });
    }
  },
  setFocusedObject: (focusedObject) => {
    const cur = get().focusedObject;
    if ((cur?.id ?? null) !== (focusedObject?.id ?? null)) {
      set({ focusedObject });
    }
  },
  openPlaqueModal: (obj) =>
    set({ activePlaqueModal: obj, isPointerLocked: false, isCursorRevealed: true }),
  closePlaqueModal: () =>
    set((state) => {
      const next = { ...state, activePlaqueModal: null };
      return {
        activePlaqueModal: null,
        isCursorRevealed: computeIsAnyPanelOpen(next)
      };
    }),
  togglePropState: (objectId) =>
    set((state) => {
      const prev = state.propStates[objectId] ?? { active: false, lastTriggeredAt: 0 };
      return {
        propStates: {
          ...state.propStates,
          [objectId]: {
            active: !prev.active,
            lastTriggeredAt: Date.now()
          }
        }
      };
    }),
  setPropStateAuthoritative: (objectId, active, lastTriggeredAt) =>
    set((state) => ({
      propStates: {
        ...state.propStates,
        [objectId]: { active, lastTriggeredAt }
      }
    })),
  setAllPropStatesAuthoritative: (propStates) =>
    set((state) => ({
      propStates: {
        ...state.propStates,
        ...propStates
      }
    })),
  updateMultiplayerState: (partial) =>
    set((state) => ({
      ...(partial.roomId !== undefined
        ? { currentZoneId: resolveZoneForRoomId(partial.roomId).zoneId }
        : {}),
      multiplayer: {
        ...state.multiplayer,
        ...partial
      }
    })),
  upsertRemoteVisitor: (visitor) =>
    set((state) => {
      const existing = state.multiplayer.remoteVisitors[visitor.sessionId];
      const mergedAvatar = visitor.avatar ?? existing?.avatar;
      const mergedActiveEmote =
        visitor.activeEmote !== undefined ? visitor.activeEmote : existing?.activeEmote;
      const mergedSeatedOn =
        visitor.seatedOn !== undefined ? visitor.seatedOn : existing?.seatedOn;
      const mergedActiveConsumption =
        visitor.activeConsumption !== undefined
          ? visitor.activeConsumption
          : existing?.activeConsumption;
      const mergedVisitor: RemoteVisitorSummary = {
        ...existing,
        ...visitor,
        ...(mergedAvatar !== undefined ? { avatar: mergedAvatar } : {}),
        ...(mergedActiveEmote !== undefined ? { activeEmote: mergedActiveEmote } : {}),
        ...(mergedSeatedOn !== undefined ? { seatedOn: mergedSeatedOn } : {}),
        ...(mergedActiveConsumption !== undefined
          ? { activeConsumption: mergedActiveConsumption }
          : {})
      };
      if (
        existing &&
        existing.displayName === mergedVisitor.displayName &&
        existing.accentColor === mergedVisitor.accentColor &&
        existing.locomotionState === mergedVisitor.locomotionState &&
        existing.playerId === mergedVisitor.playerId &&
        areAvatarsEqual(existing.avatar, mergedVisitor.avatar) &&
        areEmotesEqual(existing.activeEmote, mergedVisitor.activeEmote) &&
        areSeatsEqual(existing.seatedOn, mergedVisitor.seatedOn) &&
        areConsumptionsEqual(existing.activeConsumption, mergedVisitor.activeConsumption)
      ) {
        return state;
      }
      return {
        multiplayer: {
          ...state.multiplayer,
          remoteVisitors: {
            ...state.multiplayer.remoteVisitors,
            [visitor.sessionId]: mergedVisitor
          }
        }
      };
    }),
  removeRemoteVisitor: (sessionId) =>
    set((state) => {
      if (!(sessionId in state.multiplayer.remoteVisitors)) {
        return state;
      }
      const next = { ...state.multiplayer.remoteVisitors };
      delete next[sessionId];
      const nextBubbles = { ...state.social.activeSpeechBubbles };
      delete nextBubbles[sessionId];
      const nextEmotes = { ...state.social.remoteActiveEmotes };
      delete nextEmotes[sessionId];
      const nextConsumptions = { ...state.dining.remoteActiveConsumptions };
      delete nextConsumptions[sessionId];
      return {
        multiplayer: {
          ...state.multiplayer,
          remoteVisitors: next
        },
        social: {
          ...state.social,
          activeSpeechBubbles: nextBubbles,
          remoteActiveEmotes: nextEmotes
        },
        dining: {
          ...state.dining,
          remoteActiveConsumptions: nextConsumptions
        }
      };
    }),
  setRemoteVisitors: (visitors) =>
    set((state) => ({
      multiplayer: {
        ...state.multiplayer,
        remoteVisitors: { ...visitors }
      }
    })),
  initializePlayerIdentity: () => {
    const profile = loadOrCreatePlayerIdentity();
    const persistedSettings = loadPersistedSettings();
    const persistedSocial = loadPersistedSocialState(profile.playerId);
    const persistedEncyclopedia = loadPlayerEncyclopedia();
    const persistedWallet = loadPersistedDiningWallet();
    const rawPassport = loadPlayerPassportState();
    const evaluatedPassport = evaluatePassportAchievements(
      rawPassport,
      countDiscoveredSpecies(persistedEncyclopedia)
    ).state;
    savePlayerPassportState(evaluatedPassport);
    const outfitColors = getOutfitColors(profile.avatar.outfit);
    const initialFriends: FriendStatusEntry[] = Object.values(persistedSocial.friends).map((f) => ({
      playerId: f.playerId,
      displayName: f.displayName,
      online: false,
      roomId: null,
      roomVisitorCount: 0,
      roomMaxPlayers: 16,
      canJoin: false
    }));

    set((state) => ({
      settings: persistedSettings,
      identity: {
        profile,
        draft: {
          isOpen: false,
          displayName: profile.displayName,
          avatar: { ...profile.avatar },
          isDirty: false,
          validation: validateDisplayName(profile.displayName)
        }
      },
      social: {
        ...state.social,
        friends: state.social.friends.length > 0 ? state.social.friends : initialFriends,
        mutedPlayerIds: persistedSocial.mutedPlayerIds,
        blockedPlayerIds: persistedSocial.blockedPlayerIds,
        allowFriendJoin: persistedSocial.allowFriendJoin ?? true
      },
      animalSim: {
        ...state.animalSim,
        encyclopedia: persistedEncyclopedia
      },
      dining: {
        ...state.dining,
        wallet: persistedWallet
      },
      passport: {
        ...state.passport,
        state: evaluatedPassport
      },
      betaReadiness: {
        ...state.betaReadiness,
        hasCompletedOnboarding: loadPersistedBetaReadinessState().hasCompletedOnboarding,
        isOnboardingOpen: !loadPersistedBetaReadinessState().hasCompletedOnboarding,
        autoQualityAdjust: loadPersistedBetaReadinessState().autoQualityAdjust
      },
      multiplayer: {
        ...state.multiplayer,
        localDisplayName:
          profile.isCustomized || !state.multiplayer.localDisplayName
            ? profile.displayName
            : state.multiplayer.localDisplayName,
        localAccentColor:
          profile.isCustomized || !state.multiplayer.localAccentColor
            ? outfitColors.accent
            : state.multiplayer.localAccentColor
      }
    }));
    return profile;
  },
  openAvatarCustomizer: () =>
    set((state) => ({
      isPointerLocked: false,
      isCursorRevealed: true,
      identity: {
        ...state.identity,
        draft: {
          isOpen: true,
          displayName: state.identity.profile.displayName,
          avatar: { ...state.identity.profile.avatar },
          isDirty: false,
          validation: validateDisplayName(state.identity.profile.displayName)
        }
      }
    })),
  cancelAvatarCustomizer: () =>
    set((state) => {
      const nextIdentity: PlayerIdentityStoreSlice = {
        ...state.identity,
        draft: {
          isOpen: false,
          displayName: state.identity.profile.displayName,
          avatar: { ...state.identity.profile.avatar },
          isDirty: false,
          validation: validateDisplayName(state.identity.profile.displayName)
        }
      };
      return {
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, identity: nextIdentity }),
        identity: nextIdentity
      };
    }),
  setDraftDisplayName: (displayName) =>
    set((state) => ({
      identity: {
        ...state.identity,
        draft: {
          ...state.identity.draft,
          displayName,
          isDirty: true,
          validation: validateDisplayName(displayName)
        }
      }
    })),
  setDraftAvatarOption: (category, value) =>
    set((state) => {
      const candidate = {
        ...state.identity.draft.avatar,
        [category]: value
      };
      if (!isValidAvatarAppearance(candidate)) {
        return state;
      }
      return {
        identity: {
          ...state.identity,
          draft: {
            ...state.identity.draft,
            avatar: candidate,
            isDirty: true
          }
        }
      };
    }),
  resetDraftToDefault: () =>
    set((state) => ({
      identity: {
        ...state.identity,
        draft: {
          ...state.identity.draft,
          avatar: { ...DEFAULT_AVATAR_APPEARANCE },
          isDirty: true
        }
      }
    })),
  confirmAvatarCustomization: () => {
    const state = get();
    const nameResult = validateDisplayName(state.identity.draft.displayName);
    if (!nameResult.valid) {
      set((cur) => ({
        identity: {
          ...cur.identity,
          draft: {
            ...cur.identity.draft,
            validation: nameResult
          }
        }
      }));
      return {
        ok: false,
        errorMessage: nameResult.errorMessage ?? 'Invalid display name.'
      };
    }

    if (!isValidAvatarAppearance(state.identity.draft.avatar)) {
      return {
        ok: false,
        errorMessage: 'Selected avatar appearance contains unsupported option values.'
      };
    }

    const updatedProfile: PlayerIdentityProfile = savePlayerIdentity({
      schemaVersion: 1,
      playerId: state.identity.profile.playerId,
      displayName: nameResult.normalizedName,
      avatar: sanitizeAvatarAppearance(state.identity.draft.avatar),
      isCustomized: true,
      updatedAt: new Date().toISOString()
    });
    const outfitColors = getOutfitColors(updatedProfile.avatar.outfit);

    set((cur) => {
      const nextIdentity: PlayerIdentityStoreSlice = {
        profile: updatedProfile,
        draft: {
          isOpen: false,
          displayName: updatedProfile.displayName,
          avatar: { ...updatedProfile.avatar },
          isDirty: false,
          validation: nameResult
        }
      };
      return {
        isCursorRevealed: computeIsAnyPanelOpen({ ...cur, identity: nextIdentity }),
        identity: nextIdentity,
        multiplayer: {
          ...cur.multiplayer,
          localDisplayName: updatedProfile.displayName,
          localAccentColor: outfitColors.accent
        }
      };
    });

    return {
      ok: true,
      profile: updatedProfile
    };
  },

  tunePlayerId: (customPlayerId) => {
    const check = validateAndFormatPlayerId(customPlayerId);
    if (!check.valid) {
      return {
        ok: false,
        errorMessage: check.errorMessage ?? 'Invalid Player ID.'
      };
    }

    const state = get();
    const updatedProfile: PlayerIdentityProfile = savePlayerIdentity({
      ...state.identity.profile,
      playerId: check.normalizedPlayerId,
      updatedAt: new Date().toISOString()
    });

    set((cur) => ({
      identity: {
        ...cur.identity,
        profile: updatedProfile
      }
    }));

    return {
      ok: true,
      profile: updatedProfile
    };
  },

  regeneratePlayerId: () => {
    const state = get();
    const freshId = generatePersistentPlayerId();
    const updatedProfile: PlayerIdentityProfile = savePlayerIdentity({
      ...state.identity.profile,
      playerId: freshId,
      updatedAt: new Date().toISOString()
    });

    set((cur) => ({
      identity: {
        ...cur.identity,
        profile: updatedProfile
      }
    }));

    return updatedProfile;
  },

  setAvailableInstances: (availableInstances) =>
    set((state) => ({
      social: {
        ...state.social,
        availableInstances: [...availableInstances]
      }
    })),

  addProximityChatMessage: (message) => {
    const isFromSelf =
      message.senderSessionId === get().multiplayer.localSessionId ||
      message.senderPlayerId === get().identity.profile.playerId ||
      message.senderSessionId === 'local-session';
    set((state) => {
      const { mutedPlayerIds, blockedPlayerIds } = state.social;
      if (
        mutedPlayerIds.includes(message.senderPlayerId) ||
        blockedPlayerIds.includes(message.senderPlayerId) ||
        mutedPlayerIds.includes(message.senderSessionId) ||
        blockedPlayerIds.includes(message.senderSessionId)
      ) {
        return state;
      }

      if (state.social.chatMessages.some((m) => m.messageId === message.messageId)) {
        return state;
      }

      const nextMessages = [...state.social.chatMessages, message].slice(-MAX_CHAT_HISTORY_ENTRIES);
      return {
        social: {
          ...state.social,
          chatMessages: nextMessages,
          activeSpeechBubbles: {
            ...state.social.activeSpeechBubbles,
            [message.senderSessionId]: message
          },
          chatFeedback: null
        }
      };
    });
    if (isFromSelf) {
      get().recordPassportSocialAction();
    }
  },

  pruneExpiredSocialEffects: (now = Date.now()) =>
    set((state) => {
      let changed = false;
      const nextBubbles: Record<string, ProximityChatMessage> = {};
      for (const [sid, bubble] of Object.entries(state.social.activeSpeechBubbles)) {
        if (bubble.expiresAt > now) {
          nextBubbles[sid] = bubble;
        } else {
          changed = true;
        }
      }

      let nextLocalEmote = state.social.localActiveEmote;
      if (nextLocalEmote && nextLocalEmote.expiresAt <= now) {
        nextLocalEmote = null;
        changed = true;
      }

      const nextRemoteEmotes: Record<string, ActiveAvatarEmote> = {};
      for (const [sid, emote] of Object.entries(state.social.remoteActiveEmotes)) {
        if (emote.expiresAt > now) {
          nextRemoteEmotes[sid] = emote;
        } else {
          changed = true;
        }
      }

      let nextLocalConsumption = state.dining.localActiveConsumption;
      if (nextLocalConsumption && nextLocalConsumption.expiresAt <= now) {
        nextLocalConsumption = null;
        changed = true;
      }

      const nextRemoteConsumptions: Record<string, ActiveFoodConsumption> = {};
      for (const [sid, cons] of Object.entries(state.dining.remoteActiveConsumptions)) {
        if (cons.expiresAt > now) {
          nextRemoteConsumptions[sid] = cons;
        } else {
          changed = true;
        }
      }

      if (!changed) {
        return state;
      }

      return {
        social: {
          ...state.social,
          activeSpeechBubbles: nextBubbles,
          localActiveEmote: nextLocalEmote,
          remoteActiveEmotes: nextRemoteEmotes
        },
        dining: {
          ...state.dining,
          localActiveConsumption: nextLocalConsumption,
          remoteActiveConsumptions: nextRemoteConsumptions
        }
      };
    }),

  setChatFeedback: (feedback) =>
    set((state) => ({
      social: {
        ...state.social,
        chatFeedback: feedback
          ? {
              type: feedback.type,
              message: feedback.message,
              timestamp: feedback.timestamp ?? Date.now()
            }
          : null
      }
    })),

  setLocalActiveEmote: (emote) => {
    set((state) => {
      if (areEmotesEqual(state.social.localActiveEmote, emote)) {
        return state;
      }
      return {
        social: {
          ...state.social,
          localActiveEmote: emote
        }
      };
    });
    if (emote) {
      get().recordPassportSocialAction();
    }
  },

  setRemoteActiveEmote: (sessionId, playerId, emote) =>
    set((state) => {
      const { mutedPlayerIds, blockedPlayerIds } = state.social;
      const isSuppressed =
        (playerId && (mutedPlayerIds.includes(playerId) || blockedPlayerIds.includes(playerId))) ||
        mutedPlayerIds.includes(sessionId) ||
        blockedPlayerIds.includes(sessionId);

      const effectiveEmote = isSuppressed ? null : emote;
      const nextRemoteEmotes = { ...state.social.remoteActiveEmotes };
      if (effectiveEmote) {
        nextRemoteEmotes[sessionId] = effectiveEmote;
      } else {
        delete nextRemoteEmotes[sessionId];
      }

      const existingVisitor = state.multiplayer.remoteVisitors[sessionId];
      return {
        social: {
          ...state.social,
          remoteActiveEmotes: nextRemoteEmotes
        },
        multiplayer: existingVisitor
          ? {
              ...state.multiplayer,
              remoteVisitors: {
                ...state.multiplayer.remoteVisitors,
                [sessionId]: {
                  ...existingVisitor,
                  activeEmote: effectiveEmote
                }
              }
            }
          : state.multiplayer
      };
    }),

  setSeatStatesAuthoritative: (objectId, seats, localSessionId) =>
    set((state) => {
      const nextSeatStates: Record<string, WorldSeatOccupancyState[]> = {
        ...state.social.seatStates,
        [objectId]: seats.map((s) => ({
          ...s,
          worldPosition: [...s.worldPosition] as [number, number, number]
        }))
      };
      const sid = localSessionId ?? state.multiplayer.localSessionId;
      let nextLocalSeated = state.social.localSeatedState;
      if (sid) {
        const mySeatOnObj = seats.find((s) => s.occupiedBySessionId === sid);
        if (mySeatOnObj) {
          nextLocalSeated = {
            objectId,
            seatIndex: mySeatOnObj.seatIndex,
            seatPosition: [...mySeatOnObj.worldPosition] as [number, number, number],
            facingYaw: mySeatOnObj.facingYaw
          };
        } else if (nextLocalSeated?.objectId === objectId) {
          nextLocalSeated = null;
        }
      }
      return {
        social: {
          ...state.social,
          seatStates: nextSeatStates,
          localSeatedState: nextLocalSeated
        }
      };
    }),

  setAllSeatStatesAuthoritative: (seatStates, localSessionId) =>
    set((state) => {
      const merged: Record<string, WorldSeatOccupancyState[]> = {
        ...createInitialRoomSeatStates(),
        ...seatStates
      };
      const sid = localSessionId ?? state.multiplayer.localSessionId;
      let nextLocalSeated: SeatedAttachmentState | null = null;
      if (sid) {
        for (const [objId, slots] of Object.entries(merged)) {
          const found = slots.find((s) => s.occupiedBySessionId === sid);
          if (found) {
            nextLocalSeated = {
              objectId: objId,
              seatIndex: found.seatIndex,
              seatPosition: [...found.worldPosition],
              facingYaw: found.facingYaw
            };
            break;
          }
        }
      }
      return {
        social: {
          ...state.social,
          seatStates: merged,
          localSeatedState: nextLocalSeated
        }
      };
    }),

  setLocalSeatedState: (localSeatedState) => {
    set((state) => ({
      social: {
        ...state.social,
        localSeatedState
      }
    }));
    if (localSeatedState) {
      get().recordPassportSocialAction();
    }
  },

  setSocialDrawerOpen: (isSocialDrawerOpen) =>
    set((state) => {
      const nextSocial = {
        ...state.social,
        isSocialDrawerOpen
      };
      return {
        isPointerLocked: isSocialDrawerOpen ? false : state.isPointerLocked,
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, social: nextSocial }),
        social: nextSocial
      };
    }),

  updateSocialPresence: (payload) =>
    set((state) => {
      const blockedSet = new Set(payload.blockedPlayerIds ?? state.social.blockedPlayerIds);
      const filteredFriends = payload.friends.filter((f) => !blockedSet.has(f.playerId));
      const filteredIncoming = payload.incomingRequests.filter(
        (r) => !blockedSet.has(r.fromPlayerId)
      );
      const filteredOutgoing = payload.outgoingRequests.filter(
        (r) => !blockedSet.has(r.toPlayerId)
      );
      const nextBlocked = payload.blockedPlayerIds ?? state.social.blockedPlayerIds;
      const nextAllowFriendJoin =
        typeof payload.allowFriendJoin === 'boolean'
          ? payload.allowFriendJoin
          : state.social.allowFriendJoin;

      persistSocialSliceToStorage(
        state.identity.profile.playerId,
        filteredFriends,
        state.social.mutedPlayerIds,
        nextBlocked,
        nextAllowFriendJoin
      );

      return {
        social: {
          ...state.social,
          friends: filteredFriends,
          incomingRequests: filteredIncoming,
          outgoingRequests: filteredOutgoing,
          blockedPlayerIds: nextBlocked,
          allowFriendJoin: nextAllowFriendJoin,
          availableInstances: payload.availableInstances
            ? [...payload.availableInstances]
            : state.social.availableInstances
        }
      };
    }),

  setAllowFriendJoin: (allowFriendJoin) =>
    set((state) => {
      persistSocialSliceToStorage(
        state.identity.profile.playerId,
        state.social.friends,
        state.social.mutedPlayerIds,
        state.social.blockedPlayerIds,
        allowFriendJoin
      );
      return {
        social: {
          ...state.social,
          allowFriendJoin
        }
      };
    }),

  toggleMutePlayer: (targetPlayerId) => {
    const state = get();
    const currentlyMuted = state.social.mutedPlayerIds.includes(targetPlayerId);
    const nextMuted = currentlyMuted
      ? state.social.mutedPlayerIds.filter((id) => id !== targetPlayerId)
      : [...state.social.mutedPlayerIds, targetPlayerId];

    persistSocialSliceToStorage(
      state.identity.profile.playerId,
      state.social.friends,
      nextMuted,
      state.social.blockedPlayerIds
    );

    set((cur) => {
      const nextBubbles = { ...cur.social.activeSpeechBubbles };
      const nextRemoteEmotes = { ...cur.social.remoteActiveEmotes };
      if (!currentlyMuted) {
        for (const [sid, bubble] of Object.entries(nextBubbles)) {
          if (bubble.senderPlayerId === targetPlayerId || sid === targetPlayerId) {
            delete nextBubbles[sid];
          }
        }
        for (const [sid, visitor] of Object.entries(cur.multiplayer.remoteVisitors)) {
          if (visitor.playerId === targetPlayerId || sid === targetPlayerId) {
            delete nextRemoteEmotes[sid];
          }
        }
      }

      return {
        social: {
          ...cur.social,
          mutedPlayerIds: nextMuted,
          chatMessages: !currentlyMuted
            ? cur.social.chatMessages.filter(
                (m) => m.senderPlayerId !== targetPlayerId && m.senderSessionId !== targetPlayerId
              )
            : cur.social.chatMessages,
          activeSpeechBubbles: nextBubbles,
          remoteActiveEmotes: nextRemoteEmotes
        }
      };
    });

    return !currentlyMuted;
  },

  setBlockPlayer: (targetPlayerId, blocked) =>
    set((state) => {
      const nextBlocked = blocked
        ? Array.from(new Set([...state.social.blockedPlayerIds, targetPlayerId]))
        : state.social.blockedPlayerIds.filter((id) => id !== targetPlayerId);
      const nextMuted = blocked
        ? Array.from(new Set([...state.social.mutedPlayerIds, targetPlayerId]))
        : state.social.mutedPlayerIds.filter((id) => id !== targetPlayerId);

      const nextFriends = blocked
        ? state.social.friends.filter((f) => f.playerId !== targetPlayerId)
        : state.social.friends;
      const nextIncoming = blocked
        ? state.social.incomingRequests.filter((r) => r.fromPlayerId !== targetPlayerId)
        : state.social.incomingRequests;
      const nextOutgoing = blocked
        ? state.social.outgoingRequests.filter((r) => r.toPlayerId !== targetPlayerId)
        : state.social.outgoingRequests;

      persistSocialSliceToStorage(
        state.identity.profile.playerId,
        nextFriends,
        nextMuted,
        nextBlocked
      );

      const nextBubbles = { ...state.social.activeSpeechBubbles };
      const nextRemoteEmotes = { ...state.social.remoteActiveEmotes };
      if (blocked) {
        for (const [sid, bubble] of Object.entries(nextBubbles)) {
          if (bubble.senderPlayerId === targetPlayerId || sid === targetPlayerId) {
            delete nextBubbles[sid];
          }
        }
        for (const [sid, visitor] of Object.entries(state.multiplayer.remoteVisitors)) {
          if (visitor.playerId === targetPlayerId || sid === targetPlayerId) {
            delete nextRemoteEmotes[sid];
          }
        }
      }

      return {
        social: {
          ...state.social,
          mutedPlayerIds: nextMuted,
          blockedPlayerIds: nextBlocked,
          friends: nextFriends,
          incomingRequests: nextIncoming,
          outgoingRequests: nextOutgoing,
          chatMessages: blocked
            ? state.social.chatMessages.filter(
                (m) => m.senderPlayerId !== targetPlayerId && m.senderSessionId !== targetPlayerId
              )
            : state.social.chatMessages,
          activeSpeechBubbles: nextBubbles,
          remoteActiveEmotes: nextRemoteEmotes
        }
      };
    }),

  openReportModal: (target) =>
    set((state) => ({
      isPointerLocked: false,
      isCursorRevealed: true,
      social: {
        ...state.social,
        reportModalTarget: target,
        reportConfirmationMessage: null
      }
    })),

  closeReportModal: () =>
    set((state) => {
      const nextSocial = {
        ...state.social,
        reportModalTarget: null
      };
      return {
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, social: nextSocial }),
        social: nextSocial
      };
    }),

  recordSubmittedReport: (report) =>
    set((state) => {
      const nextSocial = {
        ...state.social,
        submittedReports: [...state.social.submittedReports, report],
        reportModalTarget: null,
        reportConfirmationMessage: `Report submitted for ${report.reportedDisplayName} (${report.reason}). Thank you for helping keep the zoo safe.`
      };
      return {
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, social: nextSocial }),
        social: nextSocial
      };
    }),

  setSocialNotice: (socialNotice) =>
    set((state) => ({
      social: {
        ...state.social,
        socialNotice
      }
    })),

  setAnimalsAuthoritative: (animals, habitatFeedings) => {
    const nextFeedings = habitatFeedings ?? get().animalSim.habitatFeedings;
    mutableRuntimeState.animalSimulation.applyAuthoritativeSnapshot(animals, nextFeedings);
    set((state) => ({
      animalSim: {
        ...state.animalSim,
        animals: mutableRuntimeState.animalSimulation.getAnimals(),
        habitatFeedings: mutableRuntimeState.animalSimulation.getHabitatFeedings()
      }
    }));
  },

  inspectAnimal: (animalId) => {
    if (!animalId) {
      set((state) => {
        const nextAnimalSim = {
          ...state.animalSim,
          inspectedAnimalId: null,
          feedingNotice: null
        };
        return {
          isCursorRevealed: computeIsAnyPanelOpen({ ...state, animalSim: nextAnimalSim }),
          animalSim: nextAnimalSim
        };
      });
      return;
    }

    const animal = get().animalSim.animals.find((a) => a.animalId === animalId);
    if (!animal) return;

    const discoveryRes = recordSpeciesDiscovery(
      get().animalSim.encyclopedia,
      animal.speciesId
    );
    const catalogEntry = ANIMAL_SPECIES_CATALOG[animal.speciesId];

    set((state) => ({
      isPointerLocked: false,
      isCursorRevealed: true,
      animalSim: {
        ...state.animalSim,
        inspectedAnimalId: animalId,
        encyclopedia: discoveryRes.state,
        discoveryToast: discoveryRes.newlyDiscovered
          ? {
              speciesId: animal.speciesId,
              commonName: catalogEntry.commonName,
              timestamp: Date.now()
            }
          : state.animalSim.discoveryToast
      }
    }));
    get().syncPassportWithEncyclopedia();
  },

  setEncyclopediaOpen: (isOpen) =>
    set((state) => {
      const nextAnimalSim = {
        ...state.animalSim,
        isEncyclopediaOpen: isOpen
      };
      return {
        isPointerLocked: isOpen ? false : state.isPointerLocked,
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, animalSim: nextAnimalSim }),
        animalSim: nextAnimalSim
      };
    }),

  discoverAnimalSpecies: (speciesId) => {
    const cur = get().animalSim.encyclopedia;
    const res = recordSpeciesDiscovery(cur, speciesId);
    if (!res.newlyDiscovered) {
      return false;
    }
    const catalogEntry = ANIMAL_SPECIES_CATALOG[speciesId];
    set((state) => ({
      animalSim: {
        ...state.animalSim,
        encyclopedia: res.state,
        discoveryToast: {
          speciesId,
          commonName: catalogEntry.commonName,
          timestamp: Date.now()
        }
      }
    }));
    get().syncPassportWithEncyclopedia();
    return true;
  },

  recordAnimalSpeciesFed: (speciesId) => {
    const cur = get().animalSim.encyclopedia;
    const nextEncyclopedia = recordSpeciesFeeding(cur, speciesId);
    set((state) => ({
      animalSim: {
        ...state.animalSim,
        encyclopedia: nextEncyclopedia
      }
    }));
    get().recordPassportActivityCompleted();
  },

  clearDiscoveryToast: () =>
    set((state) => ({
      animalSim: {
        ...state.animalSim,
        discoveryToast: null
      }
    })),

  setFeedingNotice: (feedingNotice) =>
    set((state) => ({
      animalSim: {
        ...state.animalSim,
        feedingNotice
      }
    })),

  stepLocalAnimalSimulation: (dtSeconds, now = Date.now()) => {
    mutableRuntimeState.animalSimulation.step(dtSeconds, now);
    set((state) => ({
      animalSim: {
        ...state.animalSim,
        animals: mutableRuntimeState.animalSimulation.getAnimals(),
        habitatFeedings: mutableRuntimeState.animalSimulation.getHabitatFeedings()
      }
    }));
  },

  openFoodStall: (stallId) =>
    set((state) => ({
      isPointerLocked: false,
      isCursorRevealed: true,
      dining: {
        ...state.dining,
        activeStallId: stallId,
        purchaseFeedback: null
      }
    })),

  closeFoodStall: () =>
    set((state) => {
      const nextDining = {
        ...state.dining,
        activeStallId: null,
        purchaseFeedback: null
      };
      return {
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, dining: nextDining }),
        dining: nextDining
      };
    }),

  setInventoryOpen: (isInventoryOpen) =>
    set((state) => {
      const nextDining = {
        ...state.dining,
        isInventoryOpen
      };
      return {
        isPointerLocked: isInventoryOpen ? false : state.isPointerLocked,
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, dining: nextDining }),
        dining: nextDining
      };
    }),

  applyDiningWalletUpdate: (currencyBalance, inventory) => {
    const nextWallet = {
      schemaVersion: 1 as const,
      currencyBalance: clampCurrencyBalance(currencyBalance),
      inventory: sanitizeFoodInventory(inventory),
      updatedAt: new Date().toISOString()
    };
    savePersistedDiningWallet(nextWallet);
    set((state) => ({
      dining: {
        ...state.dining,
        wallet: nextWallet
      }
    }));
  },

  setPurchaseFeedback: (feedback) =>
    set((state) => ({
      dining: {
        ...state.dining,
        purchaseFeedback: feedback
          ? {
              type: feedback.type,
              message: feedback.message,
              ...(feedback.code !== undefined ? { code: feedback.code } : {}),
              timestamp: feedback.timestamp ?? Date.now()
            }
          : null
      }
    })),

  setLocalActiveConsumption: (consumption) => {
    set((state) => {
      if (areConsumptionsEqual(state.dining.localActiveConsumption, consumption)) {
        return state;
      }
      return {
        dining: {
          ...state.dining,
          localActiveConsumption: consumption
        }
      };
    });
    if (consumption) {
      get().recordPassportActivityCompleted();
    }
  },

  setRemoteActiveConsumption: (sessionId, playerId, consumption) =>
    set((state) => {
      const { mutedPlayerIds, blockedPlayerIds } = state.social;
      const isSuppressed =
        (playerId && (mutedPlayerIds.includes(playerId) || blockedPlayerIds.includes(playerId))) ||
        mutedPlayerIds.includes(sessionId) ||
        blockedPlayerIds.includes(sessionId);

      const effectiveConsumption = isSuppressed ? null : consumption;
      const nextRemoteConsumptions = { ...state.dining.remoteActiveConsumptions };
      if (effectiveConsumption) {
        nextRemoteConsumptions[sessionId] = effectiveConsumption;
      } else {
        delete nextRemoteConsumptions[sessionId];
      }

      const existingVisitor = state.multiplayer.remoteVisitors[sessionId];
      return {
        dining: {
          ...state.dining,
          remoteActiveConsumptions: nextRemoteConsumptions
        },
        multiplayer: existingVisitor
          ? {
              ...state.multiplayer,
              remoteVisitors: {
                ...state.multiplayer.remoteVisitors,
                [sessionId]: {
                  ...existingVisitor,
                  activeConsumption: effectiveConsumption
                }
              }
            }
          : state.multiplayer
      };
    }),

  purchaseFoodItemOffline: (itemId) => {
    if (!isValidFoodItemId(itemId)) {
      const msg = 'Selected food item is not available.';
      get().setPurchaseFeedback({
        type: 'error',
        message: msg,
        code: 'INVALID_ITEM'
      });
      return { ok: false, errorCode: 'INVALID_ITEM', message: msg };
    }

    const item = FOOD_CATALOG_BY_ID[itemId];
    const wallet = get().dining.wallet;
    if (wallet.currencyBalance < item.price) {
      const msg = `Not enough Zoo Coins for ${item.name} (costs ${item.price}, you have ${wallet.currencyBalance}).`;
      get().setPurchaseFeedback({
        type: 'error',
        message: msg,
        code: 'INSUFFICIENT_FUNDS'
      });
      return { ok: false, errorCode: 'INSUFFICIENT_FUNDS', message: msg };
    }

    const currentQty = wallet.inventory[itemId] ?? 0;
    if (currentQty >= MAX_FOOD_ITEM_QUANTITY) {
      const msg = `Your bag is full of ${item.name}!`;
      get().setPurchaseFeedback({
        type: 'error',
        message: msg,
        code: 'INVENTORY_FULL'
      });
      return { ok: false, errorCode: 'INVENTORY_FULL', message: msg };
    }

    const nextBalance = wallet.currencyBalance - item.price;
    const nextInventory: FoodInventoryRecord = {
      ...wallet.inventory,
      [itemId]: currentQty + 1
    };
    get().applyDiningWalletUpdate(nextBalance, nextInventory);
    const msg = `Purchased ${item.name} (-${item.price} Zoo Coins)!`;
    get().setPurchaseFeedback({
      type: 'success',
      message: msg
    });
    return { ok: true, message: msg };
  },

  consumeFoodItemOffline: (itemId, now = Date.now()) => {
    if (!isValidFoodItemId(itemId)) {
      return {
        ok: false,
        errorCode: 'INVALID_ITEM',
        message: 'Invalid food item.'
      };
    }

    const item = FOOD_CATALOG_BY_ID[itemId];
    const wallet = get().dining.wallet;
    const currentQty = wallet.inventory[itemId] ?? 0;
    if (currentQty <= 0) {
      const msg = `You do not own any ${item.name} in your bag.`;
      get().setPurchaseFeedback({
        type: 'error',
        message: msg,
        code: 'ITEM_NOT_OWNED'
      });
      return { ok: false, errorCode: 'ITEM_NOT_OWNED', message: msg };
    }

    const nextInventory: FoodInventoryRecord = {
      ...wallet.inventory,
      [itemId]: currentQty - 1
    };
    get().applyDiningWalletUpdate(wallet.currencyBalance, nextInventory);
    const consumption: ActiveFoodConsumption = {
      itemId,
      label: item.name,
      category: item.category,
      icon: item.icon,
      startedAt: now,
      expiresAt: now + item.durationMs
    };
    get().setLocalActiveConsumption(consumption);
    const msg = `${item.gerundLabel} ${item.name}!`;
    get().setPurchaseFeedback({
      type: 'success',
      message: msg
    });
    return { ok: true, message: msg };
  },

  setPassportOpen: (isPassportOpen, tab) =>
    set((state) => {
      const nextPassport = {
        ...state.passport,
        isPassportOpen,
        ...(tab !== undefined ? { activeTab: tab } : {}),
        rewardFeedback: null
      };
      return {
        isPointerLocked: isPassportOpen ? false : state.isPointerLocked,
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, passport: nextPassport }),
        passport: nextPassport
      };
    }),

  setPassportTab: (activeTab) =>
    set((state) => ({
      passport: {
        ...state.passport,
        activeTab,
        rewardFeedback: null
      }
    })),

  recordZoneVisit: (zoneId) => {
    const curState = get();
    const discoveredSpeciesCount = countDiscoveredSpecies(
      curState.animalSim.encyclopedia
    );
    const res = recordPassportZoneStamp(
      curState.passport.state,
      zoneId,
      discoveredSpeciesCount
    );
    if (!res.newlyStamped && res.newlyUnlockedAchievementIds.length === 0) {
      return res;
    }

    const zoneDesc = PASSPORT_ZONES_BY_ID[zoneId];
    const toast: PassportToastNotification = res.newlyStamped
      ? {
          id: `toast_stamp_${zoneId}_${Date.now()}`,
          kind: 'stamp',
          title: `Passport Stamp Collected: ${zoneDesc.name}`,
          subtitle: zoneDesc.stampLabel,
          icon: zoneDesc.stampIcon,
          zoneId,
          createdAt: Date.now()
        }
      : {
          id: `toast_ach_${res.newlyUnlockedAchievementIds[0]!}_${Date.now()}`,
          kind: 'achievement',
          title: `Achievement Unlocked: ${ACHIEVEMENTS_BY_ID[res.newlyUnlockedAchievementIds[0]!].title}`,
          subtitle: `Claim +${ACHIEVEMENTS_BY_ID[res.newlyUnlockedAchievementIds[0]!].rewardCoins} Zoo Coins in your Passport!`,
          icon: ACHIEVEMENTS_BY_ID[res.newlyUnlockedAchievementIds[0]!].icon,
          achievementId: res.newlyUnlockedAchievementIds[0]!,
          createdAt: Date.now()
        };

    set((state) => ({
      passport: {
        ...state.passport,
        state: res.state,
        activeToast: toast
      }
    }));

    return res;
  },

  evaluateProximityPassportZones: (playerPosition) => {
    const curState = get();
    const discoveredSpeciesCount = countDiscoveredSpecies(
      curState.animalSim.encyclopedia
    );
    const res = evaluateProximityZoneStamp(
      playerPosition,
      curState.passport.state,
      discoveredSpeciesCount
    );
    if (
      res.newlyStampedZoneIds.length === 0 &&
      res.newlyUnlockedAchievementIds.length === 0
    ) {
      return res;
    }

    let toast: PassportToastNotification | null = curState.passport.activeToast;
    if (res.newlyStampedZoneIds.length > 0) {
      const zId = res.newlyStampedZoneIds[0]!;
      const zoneDesc = PASSPORT_ZONES_BY_ID[zId];
      toast = {
        id: `toast_stamp_${zId}_${Date.now()}`,
        kind: 'stamp',
        title: `Passport Stamp Collected: ${zoneDesc.name}`,
        subtitle: zoneDesc.stampLabel,
        icon: zoneDesc.stampIcon,
        zoneId: zId,
        createdAt: Date.now()
      };
    } else if (res.newlyUnlockedAchievementIds.length > 0) {
      const achId = res.newlyUnlockedAchievementIds[0]!;
      const achDesc = ACHIEVEMENTS_BY_ID[achId];
      toast = {
        id: `toast_ach_${achId}_${Date.now()}`,
        kind: 'achievement',
        title: `Achievement Unlocked: ${achDesc.title}`,
        subtitle: `Claim +${achDesc.rewardCoins} Zoo Coins in your Passport!`,
        icon: achDesc.icon,
        achievementId: achId,
        createdAt: Date.now()
      };
    }

    set((state) => ({
      passport: {
        ...state.passport,
        state: res.state,
        activeToast: toast
      }
    }));

    return res;
  },

  recordPassportSocialAction: () => {
    const curState = get();
    const discoveredSpeciesCount = countDiscoveredSpecies(
      curState.animalSim.encyclopedia
    );
    const res = recordPassportSocialInteraction(
      curState.passport.state,
      discoveredSpeciesCount
    );
    let toast = curState.passport.activeToast;
    if (res.newlyUnlockedAchievementIds.length > 0) {
      const achId = res.newlyUnlockedAchievementIds[0]!;
      const achDesc = ACHIEVEMENTS_BY_ID[achId];
      toast = {
        id: `toast_ach_${achId}_${Date.now()}`,
        kind: 'achievement',
        title: `Achievement Unlocked: ${achDesc.title}`,
        subtitle: `Claim +${achDesc.rewardCoins} Zoo Coins in your Passport!`,
        icon: achDesc.icon,
        achievementId: achId,
        createdAt: Date.now()
      };
    }
    set((state) => ({
      passport: {
        ...state.passport,
        state: res.state,
        activeToast: toast
      }
    }));
    return res.newlyUnlockedAchievementIds;
  },

  recordPassportActivityCompleted: () => {
    const curState = get();
    const discoveredSpeciesCount = countDiscoveredSpecies(
      curState.animalSim.encyclopedia
    );
    const res = recordPassportActivityCompletion(
      curState.passport.state,
      discoveredSpeciesCount
    );
    let toast = curState.passport.activeToast;
    if (res.newlyUnlockedAchievementIds.length > 0) {
      const achId = res.newlyUnlockedAchievementIds[0]!;
      const achDesc = ACHIEVEMENTS_BY_ID[achId];
      toast = {
        id: `toast_ach_${achId}_${Date.now()}`,
        kind: 'achievement',
        title: `Achievement Unlocked: ${achDesc.title}`,
        subtitle: `Claim +${achDesc.rewardCoins} Zoo Coins in your Passport!`,
        icon: achDesc.icon,
        achievementId: achId,
        createdAt: Date.now()
      };
    }
    set((state) => ({
      passport: {
        ...state.passport,
        state: res.state,
        activeToast: toast
      }
    }));
    return res.newlyUnlockedAchievementIds;
  },

  syncPassportWithEncyclopedia: () => {
    const curState = get();
    const discoveredSpeciesCount = countDiscoveredSpecies(
      curState.animalSim.encyclopedia
    );
    const res = evaluatePassportAchievements(
      curState.passport.state,
      discoveredSpeciesCount
    );
    if (res.newlyUnlockedAchievementIds.length === 0) {
      return [];
    }
    savePlayerPassportState(res.state);
    const achId = res.newlyUnlockedAchievementIds[0]!;
    const achDesc = ACHIEVEMENTS_BY_ID[achId];
    const toast: PassportToastNotification = {
      id: `toast_ach_${achId}_${Date.now()}`,
      kind: 'achievement',
      title: `Achievement Unlocked: ${achDesc.title}`,
      subtitle: `Claim +${achDesc.rewardCoins} Zoo Coins in your Passport!`,
      icon: achDesc.icon,
      achievementId: achId,
      createdAt: Date.now()
    };
    set((state) => ({
      passport: {
        ...state.passport,
        state: res.state,
        activeToast: toast
      }
    }));
    return res.newlyUnlockedAchievementIds;
  },

  applyPassportServerUpdate: (passportState) => {
    const sanitized = sanitizePlayerPassportState(passportState);
    savePlayerPassportState(sanitized);
    set((state) => ({
      passport: {
        ...state.passport,
        state: sanitized
      }
    }));
  },

  setPassportRewardFeedback: (feedback) =>
    set((state) => ({
      passport: {
        ...state.passport,
        rewardFeedback: feedback
          ? {
              type: feedback.type,
              message: feedback.message,
              ...(feedback.code !== undefined ? { code: feedback.code } : {}),
              timestamp: feedback.timestamp ?? Date.now()
            }
          : null
      }
    })),

  claimAchievementRewardOffline: (achievementId) => {
    if (!isValidAchievementId(achievementId)) {
      const msg = 'Unknown achievement.';
      get().setPassportRewardFeedback({
        type: 'error',
        message: msg,
        code: 'INVALID_ACHIEVEMENT'
      });
      return {
        ok: false,
        errorCode: 'INVALID_ACHIEVEMENT',
        rewardCoinsGranted: 0,
        message: msg
      };
    }

    const curState = get();
    const rec = curState.passport.state.achievements[achievementId];
    const desc = ACHIEVEMENTS_BY_ID[achievementId];

    if (!rec.unlocked) {
      const msg = `${desc.title} is still locked. Complete its goal first!`;
      get().setPassportRewardFeedback({
        type: 'error',
        message: msg,
        code: 'ACHIEVEMENT_LOCKED'
      });
      return {
        ok: false,
        errorCode: 'ACHIEVEMENT_LOCKED',
        rewardCoinsGranted: 0,
        message: msg
      };
    }

    if (rec.claimed) {
      const msg = `Reward for ${desc.title} has already been claimed.`;
      get().setPassportRewardFeedback({
        type: 'error',
        message: msg,
        code: 'ALREADY_CLAIMED'
      });
      return {
        ok: false,
        errorCode: 'ALREADY_CLAIMED',
        rewardCoinsGranted: 0,
        message: msg
      };
    }

    const nowIso = new Date().toISOString();
    const nextBadges = curState.passport.state.earnedBadges.includes(
      desc.rewardBadge
    )
      ? curState.passport.state.earnedBadges
      : [...curState.passport.state.earnedBadges, desc.rewardBadge];

    const nextPassport: PlayerPassportState = {
      ...curState.passport.state,
      achievements: {
        ...curState.passport.state.achievements,
        [achievementId]: {
          ...rec,
          claimed: true,
          claimedAt: nowIso
        }
      },
      earnedBadges: nextBadges,
      activeBadge: curState.passport.state.activeBadge ?? desc.rewardBadge,
      updatedAt: nowIso
    };
    savePlayerPassportState(nextPassport);

    const nextBalance =
      curState.dining.wallet.currencyBalance + desc.rewardCoins;
    get().applyDiningWalletUpdate(nextBalance, curState.dining.wallet.inventory);

    const msg = `Claimed +${desc.rewardCoins} Zoo Coins & "${desc.rewardBadge}" Badge!`;
    set((state) => ({
      passport: {
        ...state.passport,
        state: nextPassport,
        rewardFeedback: {
          type: 'success',
          message: msg,
          timestamp: Date.now()
        }
      }
    }));

    return {
      ok: true,
      rewardCoinsGranted: desc.rewardCoins,
      message: msg
    };
  },

  selectActivePassportBadge: (badge) => {
    const curPassport = get().passport.state;
    if (badge !== null && !curPassport.earnedBadges.includes(badge)) {
      return;
    }
    const nextPassport: PlayerPassportState = {
      ...curPassport,
      activeBadge: badge,
      updatedAt: new Date().toISOString()
    };
    savePlayerPassportState(nextPassport);
    set((state) => ({
      passport: {
        ...state.passport,
        state: nextPassport
      }
    }));
  },

  dismissPassportToast: () =>
    set((state) => ({
      passport: {
        ...state.passport,
        activeToast: null
      }
    })),

  setEventsModalOpen: (isOpen) =>
    set((state) => {
      const nextEvents = {
        ...state.events,
        isEventsModalOpen: isOpen,
        eventFeedback: null
      };
      return {
        isPointerLocked: isOpen ? false : state.isPointerLocked,
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, events: nextEvents }),
        events: nextEvents
      };
    }),

  applyZooEventsSnapshot: (payload) =>
    set((state) => {
      const prevById = new Map(
        state.events.events.map((ev) => [ev.eventId, ev])
      );
      let nextToast = state.events.activeEventToast;

      for (const ev of payload.events) {
        const prev = prevById.get(ev.eventId);
        if (prev && prev.status !== 'active' && ev.status === 'active') {
          const desc = ZOO_EVENTS_BY_ID[ev.eventId];
          nextToast = {
            id: `evtoast_${ev.eventId}_${Date.now()}`,
            eventId: ev.eventId,
            title: `${desc.title} is Starting Now!`,
            subtitle: desc.locationLabel,
            icon: desc.icon,
            createdAt: Date.now()
          };
          break;
        }
      }

      const nextFeedback =
        payload.errorCode !== undefined
          ? {
              type: 'error' as const,
              message: payload.notice ?? 'Unable to complete event action.',
              code: payload.errorCode,
              timestamp: Date.now()
            }
          : payload.notice
            ? {
                type: 'success' as const,
                message: payload.notice,
                timestamp: Date.now()
              }
            : state.events.eventFeedback;

      return {
        events: {
          ...state.events,
          seasonalTheme: payload.seasonalTheme,
          events: payload.events.map((ev) => ({
            ...ev,
            participantSessionIds: [...ev.participantSessionIds],
            participantPlayerIds: [...ev.participantPlayerIds],
            contributedPlayerIds: [...ev.contributedPlayerIds],
            claimedPlayerIds: [...ev.claimedPlayerIds]
          })),
          activeEventToast: nextToast,
          eventFeedback: nextFeedback
        }
      };
    }),

  setEventFeedback: (feedback) =>
    set((state) => ({
      events: {
        ...state.events,
        eventFeedback: feedback
          ? {
              type: feedback.type,
              message: feedback.message,
              ...(feedback.code !== undefined ? { code: feedback.code } : {}),
              timestamp: feedback.timestamp ?? Date.now()
            }
          : null
      }
    })),

  dismissEventToast: () =>
    set((state) => ({
      events: {
        ...state.events,
        activeEventToast: null
      }
    })),

  joinZooEventOffline: (eventId) => {
    const cur = get();
    const sessionId = cur.multiplayer.localSessionId ?? 'local-session';
    const playerId = cur.identity.profile.playerId;
    const res = offlineEventsEngine.joinEvent(sessionId, playerId, eventId);
    if (!res.ok) {
      get().setEventFeedback({
        type: 'error',
        message: res.message,
        code: res.code
      });
      return {
        ok: false,
        errorCode: res.code,
        message: res.message
      };
    }

    get().applyZooEventsSnapshot({
      seasonalTheme: offlineEventsEngine.getSeasonalTheme(),
      events: offlineEventsEngine.getEventsSnapshot(),
      notice: res.notice
    });
    return {
      ok: true,
      message: res.notice
    };
  },

  leaveZooEventOffline: (eventId) => {
    const cur = get();
    const sessionId = cur.multiplayer.localSessionId ?? 'local-session';
    const playerId = cur.identity.profile.playerId;
    const res = offlineEventsEngine.leaveEvent(sessionId, playerId, eventId);
    if (!res.ok) {
      get().setEventFeedback({
        type: 'error',
        message: res.message,
        code: res.code
      });
      return {
        ok: false,
        errorCode: res.code,
        message: res.message
      };
    }

    get().applyZooEventsSnapshot({
      seasonalTheme: offlineEventsEngine.getSeasonalTheme(),
      events: offlineEventsEngine.getEventsSnapshot(),
      notice: res.notice
    });
    return {
      ok: true,
      message: res.notice
    };
  },

  performEventActionOffline: (eventId) => {
    const cur = get();
    const sessionId = cur.multiplayer.localSessionId ?? 'local-session';
    const playerId = cur.identity.profile.playerId;
    const res = offlineEventsEngine.performEventAction(
      sessionId,
      playerId,
      eventId
    );
    if (!res.ok) {
      get().setEventFeedback({
        type: 'error',
        message: res.message,
        code: res.code
      });
      return {
        ok: false,
        errorCode: res.code,
        message: res.message
      };
    }

    get().applyZooEventsSnapshot({
      seasonalTheme: offlineEventsEngine.getSeasonalTheme(),
      events: offlineEventsEngine.getEventsSnapshot(),
      notice: res.notice
    });
    return {
      ok: true,
      message: res.notice
    };
  },

  claimEventRewardOffline: (eventId) => {
    const cur = get();
    const playerId = cur.identity.profile.playerId;
    const res = offlineEventsEngine.markRewardClaimed(playerId, eventId);
    if (!res.ok) {
      get().setEventFeedback({
        type: 'error',
        message: res.message,
        code: res.code
      });
      return {
        ok: false,
        errorCode: res.code,
        rewardCoinsGranted: 0,
        message: res.message
      };
    }

    const nextBalance = cur.dining.wallet.currencyBalance + res.rewardCoins;
    get().applyDiningWalletUpdate(nextBalance, cur.dining.wallet.inventory);
    get().recordZoneVisit(res.zoneId);
    get().recordPassportActivityCompleted();

    const zoneDesc = PASSPORT_ZONES_BY_ID[res.zoneId];
    const msg = `Claimed +${res.rewardCoins} Zoo Coins & ${zoneDesc.name} Stamp!`;
    get().applyZooEventsSnapshot({
      seasonalTheme: offlineEventsEngine.getSeasonalTheme(),
      events: offlineEventsEngine.getEventsSnapshot(),
      notice: msg
    });

    return {
      ok: true,
      rewardCoinsGranted: res.rewardCoins,
      stampedZoneId: res.zoneId,
      message: msg
    };
  },

  configureZooEventsOffline: (config) => {
    const res = offlineEventsEngine.applyAdminConfig(config);
    if (!res.ok) {
      get().setEventFeedback({
        type: 'error',
        message: res.message,
        code: res.code
      });
      return {
        ok: false,
        errorCode: res.code,
        message: res.message
      };
    }

    get().applyZooEventsSnapshot({
      seasonalTheme: res.seasonalTheme,
      events: res.events,
      notice: res.notice
    });
    return {
      ok: true,
      message: res.notice
    };
  },

  setOnboardingOpen: (isOpen) =>
    set((state) => ({
      betaReadiness: {
        ...state.betaReadiness,
        isOnboardingOpen: isOpen
      }
    })),

  completeOnboarding: () => {
    const saved = savePersistedBetaReadinessState({
      hasCompletedOnboarding: true,
      lastSeenVersion: PUBLIC_BETA_VERSION
    });
    set((state) => ({
      betaReadiness: {
        ...state.betaReadiness,
        hasCompletedOnboarding: saved.hasCompletedOnboarding,
        isOnboardingOpen: false
      }
    }));
  },

  setHelpCenterOpen: (isOpen, tab) =>
    set((state) => {
      const nextBeta = {
        ...state.betaReadiness,
        isHelpCenterOpen: isOpen,
        activeTab: tab ?? state.betaReadiness.activeTab
      };
      return {
        isPointerLocked: isOpen ? false : state.isPointerLocked,
        isCursorRevealed: computeIsAnyPanelOpen({ ...state, betaReadiness: nextBeta }),
        betaReadiness: nextBeta
      };
    }),

  setHelpCenterTab: (tab) =>
    set((state) => ({
      betaReadiness: {
        ...state.betaReadiness,
        activeTab: tab
      }
    })),

  setAutoQualityAdjust: (enabled) => {
    const saved = savePersistedBetaReadinessState({
      autoQualityAdjust: enabled
    });
    set((state) => ({
      betaReadiness: {
        ...state.betaReadiness,
        autoQualityAdjust: saved.autoQualityAdjust
      }
    }));
  },

  updatePerformanceTelemetry: (telemetry) =>
    set((state) => ({
      betaReadiness: {
        ...state.betaReadiness,
        telemetry: { ...telemetry }
      }
    })),

  setBetaFeedbackNotice: (notice) =>
    set((state) => ({
      betaReadiness: {
        ...state.betaReadiness,
        feedbackNotice: notice
          ? {
              type: notice.type,
              message: notice.message,
              timestamp: notice.timestamp ?? Date.now()
            }
          : null
      }
    })),

  setMaintenanceNotice: (maintenanceNotice) =>
    set((state) => ({
      betaReadiness: {
        ...state.betaReadiness,
        maintenanceNotice: maintenanceNotice ? { ...maintenanceNotice } : null
      }
    })),

  setOpsSnapshot: (snapshot) =>
    set((state) => ({
      betaReadiness: {
        ...state.betaReadiness,
        opsSnapshot: snapshot,
        maintenanceNotice: snapshot.maintenanceNotice
          ? { ...snapshot.maintenanceNotice }
          : null
      }
    })),

  recordClientError: (code, message) =>
    set((state) => {
      const entry: DiagnosticErrorEntry = {
        errorId: `cerr_${Date.now()}_${state.betaReadiness.clientErrors.length + 1}`,
        code,
        message,
        roomId: state.multiplayer.roomId,
        playerId: state.identity.profile.playerId,
        timestamp: Date.now()
      };
      return {
        betaReadiness: {
          ...state.betaReadiness,
          clientErrors: [entry, ...state.betaReadiness.clientErrors].slice(0, 25)
        }
      };
    }),

  updateSettings: (partial) =>
    set((state) => {
      const merged = sanitizeUserSettings({ ...state.settings, ...partial });
      savePersistedSettings(merged);
      return { settings: merged };
    }),
  resetSession: () => {
    offlineEventsEngine = new RoomEventsEngine();
    set({
      phase: 'loading',
      loadingProgress: 0,
      locomotionState: 'Idle',
      isPointerLocked: false,
      isCursorRevealed: false,
      focusedObject: null,
      activePlaqueModal: null,
      propStates: { ...INITIAL_PROP_STATES },
      settings: loadPersistedSettings(),
      multiplayer: { ...INITIAL_MULTIPLAYER_UI_STATE },
      identity: createInitialIdentitySlice(),
      social: createInitialSocialSlice(),
      animalSim: createInitialAnimalSlice(),
      dining: createInitialDiningSlice(),
      passport: createInitialPassportSlice(),
      events: createInitialEventsSlice(),
      betaReadiness: createInitialBetaReadinessSlice(),
      isHudCompact: false,
      isDevDebugOpen: false,
      isChatPanelOpen: false,
      isSettingsModalOpen: false,
      currentZoneId: resolveZoneForRoomId(INITIAL_MULTIPLAYER_UI_STATE.roomId).zoneId,
      transitionTargetZone: null,
      pendingGateArrival: null
    });
  }
}));
