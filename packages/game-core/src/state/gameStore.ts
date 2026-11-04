import { createStore } from 'zustand/vanilla';
import type {
  ActiveAvatarEmote,
  AvatarAppearance,
  FollowCameraState,
  FriendRequestRecord,
  FriendStatusEntry,
  InputDeviceMode,
  InteractiveObjectDescriptor,
  LocalReconciliationState,
  LocomotionState,
  MultiplayerSessionUIState,
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
    seatStates: createInitialRoomSeatStates(),
    localSeatedState: null,
    isSocialDrawerOpen: false,
    availableInstances: DEFAULT_PUBLIC_INSTANCES.map((inst) => ({
      roomId: inst.roomId,
      label: inst.label,
      visitorCount: inst.roomId === DEFAULT_ROOM_ID ? 1 : 0,
      maxPlayers: DEFAULT_MAX_PLAYERS_PER_ROOM,
      isFull: false
    })),
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    mutedPlayerIds: [],
    blockedPlayerIds: [],
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
  blockedPlayerIds: string[]
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
      blockedPlayerIds
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

  setPhase: (phase: SessionPhase) => void;
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
  }) => void;
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
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSession: () => void;
}

const INITIAL_PROP_STATES: Record<string, { active: boolean; lastTriggeredAt: number }> = {
  'prop-stone-lantern': { active: true, lastTriggeredAt: 0 },
  'prop-wind-chime': { active: false, lastTriggeredAt: 0 },
  'prop-scenic-bench': { active: false, lastTriggeredAt: 0 },
  'prop-plaza-bench': { active: false, lastTriggeredAt: 0 },
  'prop-pond-chair': { active: false, lastTriggeredAt: 0 }
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

  setPhase: (phase) =>
    set((state) => ({
      phase,
      isPointerLocked: phase === 'playing' ? state.isPointerLocked : false,
      isCursorRevealed:
        phase === 'paused' ? true : phase === 'playing' ? false : state.isCursorRevealed
    })),
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
  closePlaqueModal: () => set({ activePlaqueModal: null, isCursorRevealed: false }),
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
      const mergedVisitor: RemoteVisitorSummary = {
        ...existing,
        ...visitor,
        ...(mergedAvatar !== undefined ? { avatar: mergedAvatar } : {}),
        ...(mergedActiveEmote !== undefined ? { activeEmote: mergedActiveEmote } : {}),
        ...(mergedSeatedOn !== undefined ? { seatedOn: mergedSeatedOn } : {})
      };
      if (
        existing &&
        existing.displayName === mergedVisitor.displayName &&
        existing.accentColor === mergedVisitor.accentColor &&
        existing.locomotionState === mergedVisitor.locomotionState &&
        existing.playerId === mergedVisitor.playerId &&
        areAvatarsEqual(existing.avatar, mergedVisitor.avatar) &&
        areEmotesEqual(existing.activeEmote, mergedVisitor.activeEmote) &&
        areSeatsEqual(existing.seatedOn, mergedVisitor.seatedOn)
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
      return {
        multiplayer: {
          ...state.multiplayer,
          remoteVisitors: next
        },
        social: {
          ...state.social,
          activeSpeechBubbles: nextBubbles,
          remoteActiveEmotes: nextEmotes
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
        blockedPlayerIds: persistedSocial.blockedPlayerIds
      },
      animalSim: {
        ...state.animalSim,
        encyclopedia: persistedEncyclopedia
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
    set((state) => ({
      isCursorRevealed: false,
      identity: {
        ...state.identity,
        draft: {
          isOpen: false,
          displayName: state.identity.profile.displayName,
          avatar: { ...state.identity.profile.avatar },
          isDirty: false,
          validation: validateDisplayName(state.identity.profile.displayName)
        }
      }
    })),
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

    set((cur) => ({
      isCursorRevealed: false,
      identity: {
        profile: updatedProfile,
        draft: {
          isOpen: false,
          displayName: updatedProfile.displayName,
          avatar: { ...updatedProfile.avatar },
          isDirty: false,
          validation: nameResult
        }
      },
      multiplayer: {
        ...cur.multiplayer,
        localDisplayName: updatedProfile.displayName,
        localAccentColor: outfitColors.accent
      }
    }));

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

  addProximityChatMessage: (message) =>
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
    }),

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

      if (!changed) {
        return state;
      }

      return {
        social: {
          ...state.social,
          activeSpeechBubbles: nextBubbles,
          localActiveEmote: nextLocalEmote,
          remoteActiveEmotes: nextRemoteEmotes
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

  setLocalActiveEmote: (emote) =>
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
    }),

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

  setLocalSeatedState: (localSeatedState) =>
    set((state) => ({
      social: {
        ...state.social,
        localSeatedState
      }
    })),

  setSocialDrawerOpen: (isSocialDrawerOpen) =>
    set((state) => ({
      isPointerLocked: isSocialDrawerOpen ? false : state.isPointerLocked,
      isCursorRevealed: isSocialDrawerOpen ? true : state.isCursorRevealed,
      social: {
        ...state.social,
        isSocialDrawerOpen
      }
    })),

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

      persistSocialSliceToStorage(
        state.identity.profile.playerId,
        filteredFriends,
        state.social.mutedPlayerIds,
        nextBlocked
      );

      return {
        social: {
          ...state.social,
          friends: filteredFriends,
          incomingRequests: filteredIncoming,
          outgoingRequests: filteredOutgoing,
          blockedPlayerIds: nextBlocked,
          availableInstances: payload.availableInstances
            ? [...payload.availableInstances]
            : state.social.availableInstances
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
    set((state) => ({
      social: {
        ...state.social,
        reportModalTarget: null
      }
    })),

  recordSubmittedReport: (report) =>
    set((state) => ({
      social: {
        ...state.social,
        submittedReports: [...state.social.submittedReports, report],
        reportModalTarget: null,
        reportConfirmationMessage: `Report submitted for ${report.reportedDisplayName} (${report.reason}). Thank you for helping keep the zoo safe.`
      }
    })),

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
      set((state) => ({
        animalSim: {
          ...state.animalSim,
          inspectedAnimalId: null,
          feedingNotice: null
        }
      }));
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
  },

  setEncyclopediaOpen: (isOpen) =>
    set((state) => ({
      isPointerLocked: isOpen ? false : state.isPointerLocked,
      isCursorRevealed: isOpen ? true : false,
      animalSim: {
        ...state.animalSim,
        isEncyclopediaOpen: isOpen
      }
    })),

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

  updateSettings: (partial) =>
    set((state) => {
      const merged = sanitizeUserSettings({ ...state.settings, ...partial });
      savePersistedSettings(merged);
      return { settings: merged };
    }),
  resetSession: () =>
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
      animalSim: createInitialAnimalSlice()
    })
}));
