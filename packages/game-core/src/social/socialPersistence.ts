import type { PersistedSocialProfile, ReportReason } from '../types';

export const SOCIAL_STATE_STORAGE_KEY = 'online-zoo:social-state:v1';

export const VALID_REPORT_REASONS: readonly ReportReason[] = [
  'inappropriate-chat',
  'harassment-spam',
  'offensive-name',
  'other'
];

export function isValidReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && (VALID_REPORT_REASONS as readonly string[]).includes(value);
}

export function createEmptyPersistedSocialState(): PersistedSocialProfile {
  return {
    schemaVersion: 1,
    friends: {},
    mutedPlayerIds: [],
    blockedPlayerIds: []
  };
}

function getStorageKeyForPlayer(playerId?: string): string {
  if (playerId && playerId !== 'player-initial-visitor') {
    return `${SOCIAL_STATE_STORAGE_KEY}:${playerId}`;
  }
  return SOCIAL_STATE_STORAGE_KEY;
}

export function sanitizePersistedSocialState(raw: unknown): PersistedSocialProfile {
  if (!raw || typeof raw !== 'object') {
    return createEmptyPersistedSocialState();
  }
  const obj = raw as Record<string, unknown>;
  const friends: PersistedSocialProfile['friends'] = {};
  if (obj.friends && typeof obj.friends === 'object') {
    for (const [key, val] of Object.entries(obj.friends as Record<string, unknown>)) {
      if (val && typeof val === 'object') {
        const entry = val as Record<string, unknown>;
        const pid = typeof entry.playerId === 'string' ? entry.playerId : key;
        const dname = typeof entry.displayName === 'string' ? entry.displayName : pid;
        const addedAt = typeof entry.addedAt === 'number' && Number.isFinite(entry.addedAt) ? entry.addedAt : 0;
        if (pid.length > 0 && pid.length <= 64) {
          friends[pid] = {
            playerId: pid,
            displayName: dname.slice(0, 32),
            addedAt
          };
        }
      }
    }
  }

  const mutedPlayerIds = Array.isArray(obj.mutedPlayerIds)
    ? Array.from(
        new Set(
          obj.mutedPlayerIds.filter(
            (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64
          )
        )
      )
    : [];

  const blockedPlayerIds = Array.isArray(obj.blockedPlayerIds)
    ? Array.from(
        new Set(
          obj.blockedPlayerIds.filter(
            (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 64
          )
        )
      )
    : [];

  for (const blockedId of blockedPlayerIds) {
    delete friends[blockedId];
  }

  return {
    schemaVersion: 1,
    friends,
    mutedPlayerIds,
    blockedPlayerIds
  };
}

export function loadPersistedSocialState(playerId?: string): PersistedSocialProfile {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createEmptyPersistedSocialState();
  }
  try {
    const scopedRaw = window.localStorage.getItem(getStorageKeyForPlayer(playerId));
    const fallbackRaw = window.localStorage.getItem(SOCIAL_STATE_STORAGE_KEY);
    const raw = scopedRaw ?? fallbackRaw;
    if (!raw) {
      return createEmptyPersistedSocialState();
    }
    return sanitizePersistedSocialState(JSON.parse(raw));
  } catch {
    return createEmptyPersistedSocialState();
  }
}

export function savePersistedSocialState(
  state: PersistedSocialProfile,
  playerId?: string
): PersistedSocialProfile {
  const sanitized = sanitizePersistedSocialState(state);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const payload = JSON.stringify(sanitized);
      window.localStorage.setItem(getStorageKeyForPlayer(playerId), payload);
      window.localStorage.setItem(SOCIAL_STATE_STORAGE_KEY, payload);
    } catch {
      // Ignore storage quota errors
    }
  }
  return sanitized;
}

