import type { WorldZoneId } from '../types';
import { validateDisplayName } from '../identity/displayNameValidator';
import {
  DEFAULT_ENTRY_ROOM_ID,
  DEFAULT_ENTRY_ZONE_ID,
  getZoneById,
  resolveZoneForRoomId
} from '../world/zoneRegistry';
import type { OccupancySnapshotResponse } from './protocol';

export type ServerOccupancySnapshot = OccupancySnapshotResponse;

export const RETURNING_VISITOR_STORAGE_KEY = 'online-zoo:returning-visitor:v1';

export type MainMenuFailureKind =
  | 'server_unreachable'
  | 'room_full'
  | 'name_rejected';

export interface MainMenuFailureState {
  kind: MainMenuFailureKind;
  title: string;
  message: string;
  timestamp: number;
}

export function hasReturningVisitorFlag(
  explicitStorage?: Pick<Storage, 'getItem'>
): boolean {
  const storage =
    explicitStorage ??
    (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
  if (!storage) return false;
  try {
    return storage.getItem(RETURNING_VISITOR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markReturningVisitor(
  explicitStorage?: Pick<Storage, 'setItem'>
): void {
  const storage =
    explicitStorage ??
    (typeof window !== 'undefined' && window.localStorage ? window.localStorage : null);
  if (!storage) return;
  try {
    storage.setItem(RETURNING_VISITOR_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Derives the HTTP `/occupancy` endpoint URL on `apps/server` from `NEXT_PUBLIC_WS_URL`.
 */
export function deriveOccupancyUrlFromWsUrl(wsUrl?: string): string {
  const raw = (wsUrl ?? '').trim();
  const baseWs = raw || 'ws://localhost:4000/ws/zoo';
  try {
    const httpNormalized = baseWs
      .replace(/^wss:\/\//i, 'https://')
      .replace(/^ws:\/\//i, 'http://');
    const parsed = new URL(httpNormalized);
    parsed.pathname = '/occupancy';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return 'http://localhost:4000/occupancy';
  }
}

/**
 * Fetches live zone and room occupancy from `apps/server`'s `/occupancy` endpoint.
 * Never throws; returns `{ ok: false, snapshot: null }` when the server is unreachable.
 */
export async function fetchServerOccupancy(
  wsUrl?: string,
  fetchImpl: typeof fetch | undefined = typeof fetch !== 'undefined' ? fetch : undefined
): Promise<{
  ok: boolean;
  snapshot: ServerOccupancySnapshot | null;
  error?: string;
}> {
  if (!fetchImpl) {
    return {
      ok: false,
      snapshot: null,
      error: 'Fetch API unavailable in current environment.'
    };
  }

  const url = deriveOccupancyUrlFromWsUrl(wsUrl);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      return {
        ok: false,
        snapshot: null,
        error: `Game server returned HTTP ${response.status}.`
      };
    }
    const data = (await response.json()) as Partial<ServerOccupancySnapshot>;
    if (
      !data ||
      data.status !== 'ok' ||
      !Array.isArray(data.zones) ||
      !Array.isArray(data.rooms)
    ) {
      return {
        ok: false,
        snapshot: null,
        error: 'Invalid occupancy payload from game server.'
      };
    }
    return {
      ok: true,
      snapshot: data as ServerOccupancySnapshot
    };
  } catch (err) {
    return {
      ok: false,
      snapshot: null,
      error:
        err instanceof Error
          ? err.message
          : 'Unable to reach the Online Zoo game server.'
    };
  }
}

/**
 * Resolves the initial zone and room selection on the Main Menu.
 * - First-time players always default to and are restricted to `'zoo-lobby'` (`'zoo-lobby-1'`),
 *   unless an explicit shared room link (`?room=...`) is provided.
 * - Returning players default to `'zoo-lobby'` (`'zoo-lobby-1'`), or pre-select the zone/room from `?room=...`.
 */
export function resolveInitialMenuSelection(params: {
  isReturningVisitor: boolean;
  sharedRoomParam?: string | null;
}): {
  selectedZoneId: WorldZoneId;
  selectedRoomId: string;
  canSelectAnyZone: boolean;
} {
  const trimmedRoom = (params.sharedRoomParam ?? '').trim();
  const hasValidSharedRoom = /^[a-zA-Z0-9_-]{1,48}$/.test(trimmedRoom);

  if (hasValidSharedRoom) {
    const zone = resolveZoneForRoomId(trimmedRoom);
    return {
      selectedZoneId: zone.zoneId,
      selectedRoomId: trimmedRoom,
      canSelectAnyZone: params.isReturningVisitor
    };
  }

  return {
    selectedZoneId: DEFAULT_ENTRY_ZONE_ID,
    selectedRoomId: DEFAULT_ENTRY_ROOM_ID,
    canSelectAnyZone: params.isReturningVisitor
  };
}

/**
 * Evaluates a Main Menu PLAY attempt and produces designed failure states for
 * `name_rejected`, `server_unreachable`, and `room_full`.
 */
export function evaluateMainMenuPlayAttempt(params: {
  displayName: string;
  selectedZoneId: WorldZoneId;
  selectedRoomId?: string | null;
  isReturningVisitor: boolean;
  serverReachable: boolean;
  occupancy: ServerOccupancySnapshot | null;
  now?: number;
}): {
  allowed: boolean;
  normalizedDisplayName?: string;
  targetZoneId?: WorldZoneId;
  targetRoomId?: string;
  failure?: MainMenuFailureState;
} {
  const now = params.now ?? Date.now();
  const trimmedName = params.displayName.trim();

  const validation = validateDisplayName(trimmedName);
  if (!validation.valid) {
    return {
      allowed: false,
      failure: {
        kind: 'name_rejected',
        title: 'Display Name Rejected',
        message:
          validation.errorMessage ??
          'Please choose a friendly display name between 2 and 20 characters.',
        timestamp: now
      }
    };
  }
  const normalizedDisplayName = validation.normalizedName;

  if (!params.serverReachable) {
    return {
      allowed: false,
      failure: {
        kind: 'server_unreachable',
        title: 'Game Server Unreachable',
        message:
          'Could not connect to the Online Zoo multiplayer server. Please verify the server is running and click Retry.',
        timestamp: now
      }
    };
  }

  const hasSharedRoomOverride = Boolean(
    params.selectedRoomId &&
      params.selectedRoomId.trim().length > 0 &&
      params.selectedRoomId.trim() !== getZoneById(params.selectedZoneId).roomId
  );
  const effectiveZoneId: WorldZoneId =
    params.isReturningVisitor || hasSharedRoomOverride
      ? params.selectedZoneId
      : DEFAULT_ENTRY_ZONE_ID;
  const zoneDescriptor = getZoneById(effectiveZoneId);
  const targetRoomId =
    (params.isReturningVisitor || hasSharedRoomOverride) &&
    params.selectedRoomId &&
    params.selectedRoomId.trim().length > 0
      ? params.selectedRoomId.trim()
      : zoneDescriptor.roomId;

  if (params.occupancy) {
    const exactRoom = params.occupancy.rooms.find((r) => r.roomId === targetRoomId);
    const zoneOcc = params.occupancy.zones.find((z) => z.zoneId === effectiveZoneId);
    if (
      (exactRoom && (exactRoom.isFull || exactRoom.visitorCount >= exactRoom.maxPlayers)) ||
      (!exactRoom && zoneOcc && zoneOcc.isFull)
    ) {
      return {
        allowed: false,
        failure: {
          kind: 'room_full',
          title: 'Selected Zone or Room is Full',
          message: `${zoneDescriptor.displayName} (${targetRoomId}) is currently at full capacity. Please select another zone or try again shortly.`,
          timestamp: now
        }
      };
    }
  }

  return {
    allowed: true,
    normalizedDisplayName,
    targetZoneId: effectiveZoneId,
    targetRoomId
  };
}
