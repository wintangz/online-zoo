import { createStore } from 'zustand/vanilla';
import type {
  FollowCameraState,
  InputDeviceMode,
  InteractiveObjectDescriptor,
  LocomotionState,
  PlayerAvatarState,
  QualityTier,
  SessionPhase,
  UserSettings
} from '../types';

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
    lastDeltaTime: 0
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

  setPhase: (phase: SessionPhase) => void;
  setLoadingProgress: (progress: number) => void;
  setLocomotionState: (state: LocomotionState) => void;
  setActiveDevice: (device: InputDeviceMode) => void;
  setCursorState: (locked: boolean, revealed: boolean) => void;
  setFocusedObject: (obj: InteractiveObjectDescriptor | null) => void;
  openPlaqueModal: (obj: InteractiveObjectDescriptor) => void;
  closePlaqueModal: () => void;
  togglePropState: (objectId: string) => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
  resetSession: () => void;
}

const INITIAL_PROP_STATES: Record<string, { active: boolean; lastTriggeredAt: number }> = {
  'prop-stone-lantern': { active: true, lastTriggeredAt: 0 },
  'prop-wind-chime': { active: false, lastTriggeredAt: 0 },
  'prop-scenic-bench': { active: false, lastTriggeredAt: 0 }
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
  settings: loadPersistedSettings(),

  setPhase: (phase) =>
    set((state) => ({
      phase,
      isPointerLocked: phase === 'playing' ? state.isPointerLocked : false,
      isCursorRevealed: phase === 'paused' ? true : phase === 'playing' ? false : state.isCursorRevealed
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
  openPlaqueModal: (obj) => set({ activePlaqueModal: obj, isPointerLocked: false, isCursorRevealed: true }),
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
      settings: loadPersistedSettings()
    })
}));

