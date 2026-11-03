import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  gameStore,
  USER_SETTINGS_STORAGE_KEY
} from '../src';

describe('GameSessionSlice & UserSettingsSlice (US4 HUD, Menu & Persistence)', () => {
  beforeEach(() => {
    gameStore.getState().resetSession();
    gameStore.getState().updateSettings(DEFAULT_USER_SETTINGS);
  });

  it('transitions cleanly across loading, ready, playing, and paused phases', () => {
    const store = gameStore.getState();
    expect(store.phase).toBe('loading');

    store.setLoadingProgress(100);
    store.setPhase('ready');
    expect(gameStore.getState().loadingProgress).toBe(100);
    expect(gameStore.getState().phase).toBe('ready');

    store.setPhase('playing');
    expect(gameStore.getState().phase).toBe('playing');

    store.setPhase('paused');
    expect(gameStore.getState().phase).toBe('paused');
  });

  it('clamps cameraSensitivity to [0.2, 2.5] and masterVolume to [0.0, 1.0] and persists to localStorage', () => {
    const mockStorage = new Map<string, string>();
    const origWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: {
        localStorage: {
          getItem: (k: string) => mockStorage.get(k) ?? null,
          setItem: (k: string, v: string) => mockStorage.set(k, v)
        }
      },
      configurable: true
    });

    try {
      gameStore.getState().updateSettings({
        cameraSensitivity: 9.9,
        masterVolume: -2.0,
        invertCameraY: true,
        audioMuted: true,
        qualityTier: 'high'
      });

      const current = gameStore.getState().settings;
      expect(current.cameraSensitivity).toBe(2.5);
      expect(current.masterVolume).toBe(0.0);
      expect(current.invertCameraY).toBe(true);
      expect(current.audioMuted).toBe(true);
      expect(current.qualityTier).toBe('high');

      const raw = mockStorage.get(USER_SETTINGS_STORAGE_KEY);
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw!);
      expect(parsed.cameraSensitivity).toBe(2.5);
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: origWindow,
        configurable: true
      });
    }
  });
});

