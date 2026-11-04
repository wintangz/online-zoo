import type { PlayerIdentityProfile } from '../types';
import { DEFAULT_AVATAR_APPEARANCE, sanitizeAvatarAppearance } from './avatarCatalog';
import { validateDisplayName } from './displayNameValidator';

export const PLAYER_IDENTITY_STORAGE_KEY = 'online-zoo:player-identity:v1';
export const SESSION_PLAYER_ID_OVERRIDE_KEY = 'online-zoo:session-player-id:v1';

const VALID_PLAYER_ID_REGEX = /^[a-zA-Z0-9_-]{8,64}$/;
const SHORT_CUSTOM_HANDLE_REGEX = /^[a-zA-Z0-9_-]{3,64}$/;

export function isValidPlayerId(value: unknown): value is string {
  return typeof value === 'string' && VALID_PLAYER_ID_REGEX.test(value);
}

export function validateAndFormatPlayerId(rawInput: unknown): {
  valid: boolean;
  normalizedPlayerId: string;
  errorMessage?: string;
} {
  if (typeof rawInput !== 'string') {
    return {
      valid: false,
      normalizedPlayerId: '',
      errorMessage: 'Player ID must be a text string.'
    };
  }
  const trimmed = rawInput.trim();
  if (trimmed.length < 3) {
    return {
      valid: false,
      normalizedPlayerId: trimmed,
      errorMessage: 'Player ID must be at least 3 characters (letters, numbers, - or _).'
    };
  }
  if (trimmed.length > 64) {
    return {
      valid: false,
      normalizedPlayerId: trimmed.slice(0, 64),
      errorMessage: 'Player ID cannot exceed 64 characters.'
    };
  }
  if (!SHORT_CUSTOM_HANDLE_REGEX.test(trimmed)) {
    return {
      valid: false,
      normalizedPlayerId: trimmed,
      errorMessage: 'Player ID can only contain letters, numbers, hyphens (-), and underscores (_).'
    };
  }
  const withPrefix = trimmed.startsWith('player-') ? trimmed : `player-${trimmed}`;
  const normalizedPlayerId =
    withPrefix.length >= 8 ? withPrefix.slice(0, 64) : `${withPrefix}-01`;

  if (!isValidPlayerId(normalizedPlayerId)) {
    return {
      valid: false,
      normalizedPlayerId,
      errorMessage: 'Player ID must be 8–64 characters long.'
    };
  }

  return {
    valid: true,
    normalizedPlayerId
  };
}

export function generatePersistentPlayerId(): string {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz';
  let token = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i += 1) {
      token += alphabet[(bytes[i] ?? 0) % alphabet.length];
    }
    return `player-${token}`;
  }
  for (let i = 0; i < 8; i += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `player-${token}`;
}

export function deriveDefaultExplorerName(playerId: string): string {
  let hash = 2166136261;
  for (let i = 0; i < playerId.length; i += 1) {
    hash ^= playerId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const badgeNumber = 101 + (Math.abs(hash) % 899);
  return `Explorer #${badgeNumber}`;
}

export function createDefaultPlayerIdentityProfile(
  explicitPlayerId?: string
): PlayerIdentityProfile {
  const playerId = isValidPlayerId(explicitPlayerId)
    ? explicitPlayerId
    : generatePersistentPlayerId();
  return {
    schemaVersion: 1,
    playerId,
    displayName: deriveDefaultExplorerName(playerId),
    avatar: { ...DEFAULT_AVATAR_APPEARANCE },
    isCustomized: false,
    updatedAt: new Date().toISOString()
  };
}

export function sanitizePlayerIdentityProfile(
  raw: unknown,
  fallbackPlayerId?: string
): PlayerIdentityProfile {
  if (!raw || typeof raw !== 'object') {
    return createDefaultPlayerIdentityProfile(fallbackPlayerId);
  }
  const record = raw as Record<string, unknown>;
  const playerId = isValidPlayerId(record.playerId)
    ? record.playerId
    : isValidPlayerId(fallbackPlayerId)
      ? fallbackPlayerId
      : generatePersistentPlayerId();

  const nameValidation = validateDisplayName(record.displayName);
  const displayName = nameValidation.valid
    ? nameValidation.normalizedName
    : deriveDefaultExplorerName(playerId);

  const avatar = sanitizeAvatarAppearance(record.avatar);
  const isCustomized =
    typeof record.isCustomized === 'boolean' ? record.isCustomized : false;
  const updatedAt =
    typeof record.updatedAt === 'string' && record.updatedAt.length > 0
      ? record.updatedAt
      : new Date().toISOString();

  return {
    schemaVersion: 1,
    playerId,
    displayName,
    avatar,
    isCustomized,
    updatedAt
  };
}

function resolveStorage(explicitStorage?: Pick<Storage, 'getItem' | 'setItem'>): Pick<
  Storage,
  'getItem' | 'setItem'
> | null {
  if (explicitStorage) return explicitStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function loadOrCreatePlayerIdentity(
  explicitStorage?: Pick<Storage, 'getItem' | 'setItem'>
): PlayerIdentityProfile {
  const storage = resolveStorage(explicitStorage);
  if (!storage) {
    return createDefaultPlayerIdentityProfile();
  }

  try {
    const rawJson = storage.getItem(PLAYER_IDENTITY_STORAGE_KEY);
    if (!rawJson) {
      const created = createDefaultPlayerIdentityProfile();
      storage.setItem(PLAYER_IDENTITY_STORAGE_KEY, JSON.stringify(created));
      return created;
    }
    const parsed: unknown = JSON.parse(rawJson);
    const sanitized = sanitizePlayerIdentityProfile(parsed);
    storage.setItem(PLAYER_IDENTITY_STORAGE_KEY, JSON.stringify(sanitized));
    return sanitized;
  } catch {
    const fallback = createDefaultPlayerIdentityProfile();
    try {
      storage.setItem(PLAYER_IDENTITY_STORAGE_KEY, JSON.stringify(fallback));
    } catch {
      // Ignore storage errors
    }
    return fallback;
  }
}

export function savePlayerIdentity(
  profile: PlayerIdentityProfile,
  explicitStorage?: Pick<Storage, 'getItem' | 'setItem'>
): PlayerIdentityProfile {
  const sanitized = sanitizePlayerIdentityProfile(profile, profile.playerId);
  const storage = resolveStorage(explicitStorage);
  if (storage) {
    try {
      storage.setItem(PLAYER_IDENTITY_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // Ignore storage quota errors
    }
  }
  return sanitized;
}

