import type { PersistedBetaReadinessState } from '../types';
import { PUBLIC_BETA_VERSION } from './readinessCatalog';

export const BETA_READINESS_STORAGE_KEY = 'online-zoo:beta-readiness:v1';

const inMemoryReadinessStorage = new Map<string, string>();

export function createDefaultBetaReadinessState(): PersistedBetaReadinessState {
  return {
    schemaVersion: 1,
    hasCompletedOnboarding: false,
    autoQualityAdjust: true,
    lastSeenVersion: PUBLIC_BETA_VERSION
  };
}

export function sanitizeBetaReadinessState(raw: unknown): PersistedBetaReadinessState {
  if (!raw || typeof raw !== 'object') {
    return createDefaultBetaReadinessState();
  }
  const obj = raw as Record<string, unknown>;
  return {
    schemaVersion: 1,
    hasCompletedOnboarding:
      typeof obj.hasCompletedOnboarding === 'boolean' ? obj.hasCompletedOnboarding : false,
    autoQualityAdjust:
      typeof obj.autoQualityAdjust === 'boolean' ? obj.autoQualityAdjust : true,
    lastSeenVersion:
      typeof obj.lastSeenVersion === 'string' && obj.lastSeenVersion.trim().length > 0
        ? obj.lastSeenVersion.trim().slice(0, 32)
        : PUBLIC_BETA_VERSION
  };
}

export function loadPersistedBetaReadinessState(): PersistedBetaReadinessState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(BETA_READINESS_STORAGE_KEY);
      if (!raw) {
        return createDefaultBetaReadinessState();
      }
      return sanitizeBetaReadinessState(JSON.parse(raw));
    }
    const memRaw = inMemoryReadinessStorage.get(BETA_READINESS_STORAGE_KEY);
    if (!memRaw) {
      return createDefaultBetaReadinessState();
    }
    return sanitizeBetaReadinessState(JSON.parse(memRaw));
  } catch {
    return createDefaultBetaReadinessState();
  }
}

export function savePersistedBetaReadinessState(
  state: Partial<PersistedBetaReadinessState>
): PersistedBetaReadinessState {
  const current = loadPersistedBetaReadinessState();
  const merged = sanitizeBetaReadinessState({
    ...current,
    ...state
  });
  const payload = JSON.stringify(merged);
  inMemoryReadinessStorage.set(BETA_READINESS_STORAGE_KEY, payload);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(BETA_READINESS_STORAGE_KEY, payload);
    } catch {
      // Ignore storage quota errors
    }
  }
  return merged;
}

export function resetBetaReadinessStorageForTest(): void {
  inMemoryReadinessStorage.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(BETA_READINESS_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
}

