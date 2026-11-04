import type {
  ActiveAvatarEmote,
  AvatarAppearance,
  EmoteId,
  FriendRequestRecord,
  FriendStatusEntry,
  LocomotionState,
  PlayerModerationReport,
  ProximityChatMessage,
  ReportReason,
  SeatedAttachmentState,
  WorldSeatOccupancyState,
  ZooInstanceSummary
} from '../types';
import { isValidEmoteId } from '../social/emoteCatalog';
import { isValidReportReason } from '../social/socialPersistence';
import {
  ZOO_HABITAT_ZONES,
  type AnimalInstanceState,
  type HabitatFeedingState,
  type HabitatId
} from '../animals';

export const MAX_PAYLOAD_BYTES = 4096;
export const DEFAULT_ROOM_ID = 'panda-forest-1';
export const DEFAULT_MAX_PLAYERS_PER_ROOM = 16;

export const DEFAULT_PUBLIC_INSTANCES: readonly { roomId: string; label: string }[] = [
  { roomId: 'panda-forest-1', label: 'Panda Forest #1 (Main Plaza)' },
  { roomId: 'panda-forest-2', label: 'Panda Forest #2 (Bamboo Grove)' },
  { roomId: 'panda-forest-3', label: 'Panda Forest #3 (Quiet Sanctuary)' }
];
export const HEARTBEAT_INTERVAL_MS = 2500;
export const HEARTBEAT_TIMEOUT_MS = 8000;
export const RESUME_GRACE_WINDOW_MS = 30000;
export const INTERPOLATION_DELAY_MS = 100;
export const MAX_EXTRAPOLATION_MS = 250;
export const RECONCILIATION_SNAP_THRESHOLD = 2.0;
export const RECONCILIATION_SMOOTH_THRESHOLD = 0.08;
export const RECONCILIATION_BLEND_RATE = 12.0;

/**
 * 8-color accessible park visitor palette (VR-002, Clarification #4)
 */
export const VISITOR_ACCENT_PALETTE: readonly string[] = [
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Sky Blue
  '#ec4899', // Rose Pink
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#f97316', // Coral Orange
  '#06b6d4' // Cyan
];

export const VALID_LOCOMOTION_STATES: readonly LocomotionState[] = [
  'Idle',
  'Walking',
  'Running',
  'Jumping'
];

export function deriveAccentColorFromSessionId(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return VISITOR_ACCENT_PALETTE[hash % VISITOR_ACCENT_PALETTE.length] ?? '#10b981';
}

// ============================================================================
// Client-to-Server Messages
// ============================================================================

export interface JoinInstanceMessage {
  type: 'join_instance';
  roomId?: string;
  resumeToken?: string | null;
  playerId?: string;
  displayName?: string;
  avatar?: AvatarAppearance;
  friendPlayerIds?: string[];
  blockedPlayerIds?: string[];
}

export interface UpdateIdentityMessage {
  type: 'update_identity';
  playerId: string;
  displayName: string;
  avatar: AvatarAppearance;
}

export interface PlayerMoveMessage {
  type: 'player_move';
  sequence: number;
  clientTimestamp: number;
  position: [number, number, number];
  velocity: [number, number, number];
  facingYaw: number;
  locomotionState: LocomotionState;
}

export interface InteractPropMessage {
  type: 'interact_prop';
  objectId: string;
  clientTimestamp: number;
}

export interface SendChatMessage {
  type: 'send_chat_message';
  text: string;
  clientTimestamp: number;
}

export interface TriggerEmoteMessage {
  type: 'trigger_emote';
  emoteId: EmoteId | null;
  clientTimestamp: number;
}

export interface InteractSeatMessage {
  type: 'interact_seat';
  objectId: string;
  action: 'sit' | 'stand';
  preferredSeatIndex?: number;
  clientTimestamp: number;
}

export interface SendFriendRequestMessage {
  type: 'send_friend_request';
  targetPlayerId: string;
  targetDisplayName?: string;
}

export interface RespondFriendRequestMessage {
  type: 'respond_friend_request';
  requestId: string;
  decision: 'accept' | 'reject';
}

export interface RemoveFriendMessage {
  type: 'remove_friend';
  targetPlayerId: string;
}

export interface JoinFriendInstanceMessage {
  type: 'join_friend_instance';
  friendPlayerId: string;
}

export interface SwitchInstanceMessage {
  type: 'switch_instance';
  targetRoomId: string;
}

export interface SetPlayerBlockMessage {
  type: 'set_player_block';
  targetPlayerId: string;
  blocked: boolean;
}

export interface SubmitPlayerReportMessage {
  type: 'submit_player_report';
  reportedPlayerId: string;
  reportedSessionId?: string | null;
  reportedDisplayName: string;
  reason: ReportReason;
  details?: string;
}

export interface TriggerAnimalFeedingMessage {
  type: 'trigger_animal_feeding';
  habitatId: HabitatId;
}

export interface PingMessage {
  type: 'ping';
  clientTimestamp: number;
}

export interface LeaveInstanceMessage {
  type: 'leave_instance';
}

export type ClientMultiplayerMessage =
  | JoinInstanceMessage
  | UpdateIdentityMessage
  | PlayerMoveMessage
  | InteractPropMessage
  | SendChatMessage
  | TriggerEmoteMessage
  | InteractSeatMessage
  | SendFriendRequestMessage
  | RespondFriendRequestMessage
  | RemoveFriendMessage
  | JoinFriendInstanceMessage
  | SwitchInstanceMessage
  | SetPlayerBlockMessage
  | SubmitPlayerReportMessage
  | TriggerAnimalFeedingMessage
  | PingMessage
  | LeaveInstanceMessage;

// ============================================================================
// Server-to-Client Messages
// ============================================================================

export interface SerializedPlayerState {
  sessionId: string;
  playerId?: string;
  displayName: string;
  accentColor: string;
  avatar?: AvatarAppearance;
  position: [number, number, number];
  velocity: [number, number, number];
  facingYaw: number;
  locomotionState: LocomotionState;
  sequence: number;
  serverTimestamp: number;
  reconciled?: boolean;
  discrepancyDistance?: number;
  activeEmote?: ActiveAvatarEmote | null;
  seatedOn?: SeatedAttachmentState | null;
}

export interface WelcomeSnapshotMessage {
  type: 'welcome_snapshot';
  roomId: string;
  sessionId: string;
  playerId?: string;
  resumeToken: string;
  displayName: string;
  accentColor: string;
  avatar?: AvatarAppearance;
  resumed: boolean;
  spawnPosition: [number, number, number];
  spawnYaw: number;
  serverTimestamp: number;
  players: SerializedPlayerState[];
  propStates: Record<string, { active: boolean; lastTriggeredAt: number }>;
  seatStates?: Record<string, WorldSeatOccupancyState[]>;
  availableInstances?: ZooInstanceSummary[];
  animals?: AnimalInstanceState[];
  habitatFeedings?: Record<HabitatId, HabitatFeedingState>;
}

export interface PlayerJoinedMessage {
  type: 'player_joined';
  roomId: string;
  player: SerializedPlayerState;
  visitorCount: number;
  serverTimestamp: number;
}

export interface PlayerLeftMessage {
  type: 'player_left';
  roomId: string;
  sessionId: string;
  reason: 'left' | 'timeout' | 'disconnected' | 'switched_room';
  visitorCount: number;
  serverTimestamp: number;
}

export interface RoomStateTickMessage {
  type: 'room_state_tick';
  roomId: string;
  tickSequence: number;
  serverTimestamp: number;
  visitorCount: number;
  players: SerializedPlayerState[];
  animals?: AnimalInstanceState[];
  habitatFeedings?: Record<HabitatId, HabitatFeedingState>;
}

export interface PropStateUpdatedMessage {
  type: 'prop_state_updated';
  roomId: string;
  objectId: string;
  active: boolean;
  triggeredBySessionId: string;
  lastTriggeredAt: number;
}

export interface PlayerIdentityUpdatedMessage {
  type: 'player_identity_updated';
  roomId: string;
  sessionId: string;
  playerId: string;
  displayName: string;
  accentColor: string;
  avatar: AvatarAppearance;
  serverTimestamp: number;
}

export interface ProximityChatBroadcastMessage {
  type: 'proximity_chat_message';
  message: ProximityChatMessage;
}

export interface PlayerEmoteTriggeredMessage {
  type: 'player_emote_triggered';
  roomId: string;
  sessionId: string;
  playerId: string;
  emote: ActiveAvatarEmote | null;
  serverTimestamp: number;
}

export interface SeatStateUpdatedMessage {
  type: 'seat_state_updated';
  roomId: string;
  objectId: string;
  seats: WorldSeatOccupancyState[];
  propActive: boolean;
  triggeredBySessionId: string;
  serverTimestamp: number;
}

export interface SocialPresenceUpdateMessage {
  type: 'social_presence_update';
  playerId: string;
  friends: FriendStatusEntry[];
  incomingRequests: FriendRequestRecord[];
  outgoingRequests: FriendRequestRecord[];
  blockedPlayerIds?: string[];
  availableInstances?: ZooInstanceSummary[];
  serverTimestamp: number;
}

export interface ReportSubmittedAckMessage {
  type: 'report_submitted_ack';
  report: PlayerModerationReport;
}

export interface AnimalFeedingEventMessage {
  type: 'animal_feeding_event';
  roomId: string;
  habitatId: HabitatId;
  feedingState: HabitatFeedingState;
  animals: AnimalInstanceState[];
  serverTimestamp: number;
}

export interface PongMessage {
  type: 'pong';
  clientTimestamp: number;
  serverTimestamp: number;
}

export interface ErrorNoticeMessage {
  type: 'error_notice';
  code:
    | 'INVALID_PAYLOAD'
    | 'STALE_SEQUENCE'
    | 'OUT_OF_BOUNDS_CLAMPED'
    | 'ROOM_FULL'
    | 'INVALID_IDENTITY_UPDATE'
    | 'CHAT_RATE_LIMITED'
    | 'CHAT_MODERATION_BLOCKED'
    | 'SEAT_OCCUPIED'
    | 'FRIEND_REQUEST_INVALID'
    | 'PLAYER_BLOCKED'
    | 'ANIMAL_FEEDING_COOLDOWN';
  message: string;
}

export type ServerMultiplayerMessage =
  | WelcomeSnapshotMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | RoomStateTickMessage
  | PropStateUpdatedMessage
  | PlayerIdentityUpdatedMessage
  | ProximityChatBroadcastMessage
  | PlayerEmoteTriggeredMessage
  | SeatStateUpdatedMessage
  | SocialPresenceUpdateMessage
  | ReportSubmittedAckMessage
  | AnimalFeedingEventMessage
  | PongMessage
  | ErrorNoticeMessage;

// ============================================================================
// Validation & Parsing Guards (VR-004, FR-012, FR-018)
// ============================================================================

export function isFiniteVector3(val: unknown): val is [number, number, number] {
  return (
    Array.isArray(val) &&
    val.length === 3 &&
    typeof val[0] === 'number' &&
    Number.isFinite(val[0]) &&
    typeof val[1] === 'number' &&
    Number.isFinite(val[1]) &&
    typeof val[2] === 'number' &&
    Number.isFinite(val[2])
  );
}

export function isValidLocomotionState(val: unknown): val is LocomotionState {
  return typeof val === 'string' && (VALID_LOCOMOTION_STATES as readonly string[]).includes(val);
}

/**
 * Safely parses and validates raw client JSON payloads (`<= 4096 bytes`, finite numbers).
 * Returns null if malformed or invalid so the server never crashes or trusts bad payloads (SC-005).
 */
export function parseClientMultiplayerMessage(
  raw: string | unknown
): ClientMultiplayerMessage | null {
  try {
    let parsed: Record<string, unknown>;
    if (typeof raw === 'string') {
      if (raw.length > MAX_PAYLOAD_BYTES) {
        return null;
      }
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } else if (raw && typeof raw === 'object') {
      parsed = raw as Record<string, unknown>;
    } else {
      return null;
    }

    if (!parsed || typeof parsed.type !== 'string') {
      return null;
    }

    switch (parsed.type) {
      case 'join_instance': {
        const roomId =
          typeof parsed.roomId === 'string' && /^[a-zA-Z0-9_-]{1,48}$/.test(parsed.roomId)
            ? parsed.roomId
            : DEFAULT_ROOM_ID;
        const resumeToken =
          typeof parsed.resumeToken === 'string' && parsed.resumeToken.length <= 128
            ? parsed.resumeToken
            : null;
        const playerId =
          typeof parsed.playerId === 'string' && parsed.playerId.length <= 64
            ? parsed.playerId
            : undefined;
        const displayName =
          typeof parsed.displayName === 'string' && parsed.displayName.length <= 64
            ? parsed.displayName
            : undefined;
        const avatar =
          parsed.avatar && typeof parsed.avatar === 'object'
            ? (parsed.avatar as AvatarAppearance)
            : undefined;
        const friendPlayerIds = Array.isArray(parsed.friendPlayerIds)
          ? parsed.friendPlayerIds
              .filter((id): id is string => typeof id === 'string' && id.length <= 64)
              .slice(0, 64)
          : undefined;
        const blockedPlayerIds = Array.isArray(parsed.blockedPlayerIds)
          ? parsed.blockedPlayerIds
              .filter((id): id is string => typeof id === 'string' && id.length <= 64)
              .slice(0, 64)
          : undefined;
        return {
          type: 'join_instance',
          roomId,
          resumeToken,
          ...(playerId !== undefined ? { playerId } : {}),
          ...(displayName !== undefined ? { displayName } : {}),
          ...(avatar !== undefined ? { avatar } : {}),
          ...(friendPlayerIds !== undefined ? { friendPlayerIds } : {}),
          ...(blockedPlayerIds !== undefined ? { blockedPlayerIds } : {})
        };
      }

      case 'update_identity': {
        if (
          typeof parsed.playerId !== 'string' ||
          parsed.playerId.length === 0 ||
          parsed.playerId.length > 64 ||
          typeof parsed.displayName !== 'string' ||
          parsed.displayName.length > 64 ||
          !parsed.avatar ||
          typeof parsed.avatar !== 'object'
        ) {
          return null;
        }
        return {
          type: 'update_identity',
          playerId: parsed.playerId,
          displayName: parsed.displayName,
          avatar: parsed.avatar as AvatarAppearance
        };
      }

      case 'player_move': {
        if (
          typeof parsed.sequence !== 'number' ||
          !Number.isInteger(parsed.sequence) ||
          parsed.sequence < 0 ||
          typeof parsed.clientTimestamp !== 'number' ||
          !Number.isFinite(parsed.clientTimestamp) ||
          !isFiniteVector3(parsed.position) ||
          !isFiniteVector3(parsed.velocity) ||
          typeof parsed.facingYaw !== 'number' ||
          !Number.isFinite(parsed.facingYaw) ||
          !isValidLocomotionState(parsed.locomotionState)
        ) {
          return null;
        }
        return {
          type: 'player_move',
          sequence: parsed.sequence,
          clientTimestamp: parsed.clientTimestamp,
          position: [parsed.position[0], parsed.position[1], parsed.position[2]],
          velocity: [parsed.velocity[0], parsed.velocity[1], parsed.velocity[2]],
          facingYaw: parsed.facingYaw,
          locomotionState: parsed.locomotionState
        };
      }

      case 'interact_prop': {
        if (
          typeof parsed.objectId !== 'string' ||
          parsed.objectId.length === 0 ||
          parsed.objectId.length > 64 ||
          typeof parsed.clientTimestamp !== 'number' ||
          !Number.isFinite(parsed.clientTimestamp)
        ) {
          return null;
        }
        return {
          type: 'interact_prop',
          objectId: parsed.objectId,
          clientTimestamp: parsed.clientTimestamp
        };
      }

      case 'send_chat_message': {
        if (
          typeof parsed.text !== 'string' ||
          parsed.text.length > 300 ||
          typeof parsed.clientTimestamp !== 'number' ||
          !Number.isFinite(parsed.clientTimestamp)
        ) {
          return null;
        }
        return {
          type: 'send_chat_message',
          text: parsed.text,
          clientTimestamp: parsed.clientTimestamp
        };
      }

      case 'trigger_emote': {
        if (
          parsed.emoteId !== null &&
          !isValidEmoteId(parsed.emoteId)
        ) {
          return null;
        }
        const clientTimestamp =
          typeof parsed.clientTimestamp === 'number' && Number.isFinite(parsed.clientTimestamp)
            ? parsed.clientTimestamp
            : Date.now();
        return {
          type: 'trigger_emote',
          emoteId: parsed.emoteId === null ? null : parsed.emoteId,
          clientTimestamp
        };
      }

      case 'interact_seat': {
        if (
          typeof parsed.objectId !== 'string' ||
          parsed.objectId.length === 0 ||
          parsed.objectId.length > 64 ||
          (parsed.action !== 'sit' && parsed.action !== 'stand')
        ) {
          return null;
        }
        const preferredSeatIndex =
          typeof parsed.preferredSeatIndex === 'number' &&
          Number.isInteger(parsed.preferredSeatIndex) &&
          parsed.preferredSeatIndex >= 0 &&
          parsed.preferredSeatIndex <= 8
            ? parsed.preferredSeatIndex
            : undefined;
        const clientTimestamp =
          typeof parsed.clientTimestamp === 'number' && Number.isFinite(parsed.clientTimestamp)
            ? parsed.clientTimestamp
            : Date.now();
        return {
          type: 'interact_seat',
          objectId: parsed.objectId,
          action: parsed.action,
          ...(preferredSeatIndex !== undefined ? { preferredSeatIndex } : {}),
          clientTimestamp
        };
      }

      case 'send_friend_request': {
        if (
          typeof parsed.targetPlayerId !== 'string' ||
          parsed.targetPlayerId.trim().length === 0 ||
          parsed.targetPlayerId.length > 64
        ) {
          return null;
        }
        const targetDisplayName =
          typeof parsed.targetDisplayName === 'string'
            ? parsed.targetDisplayName.slice(0, 32)
            : undefined;
        return {
          type: 'send_friend_request',
          targetPlayerId: parsed.targetPlayerId.trim(),
          ...(targetDisplayName !== undefined ? { targetDisplayName } : {})
        };
      }

      case 'respond_friend_request': {
        if (
          typeof parsed.requestId !== 'string' ||
          parsed.requestId.length === 0 ||
          parsed.requestId.length > 80 ||
          (parsed.decision !== 'accept' && parsed.decision !== 'reject')
        ) {
          return null;
        }
        return {
          type: 'respond_friend_request',
          requestId: parsed.requestId,
          decision: parsed.decision
        };
      }

      case 'remove_friend': {
        if (
          typeof parsed.targetPlayerId !== 'string' ||
          parsed.targetPlayerId.length === 0 ||
          parsed.targetPlayerId.length > 64
        ) {
          return null;
        }
        return {
          type: 'remove_friend',
          targetPlayerId: parsed.targetPlayerId
        };
      }

      case 'join_friend_instance': {
        if (
          typeof parsed.friendPlayerId !== 'string' ||
          parsed.friendPlayerId.length === 0 ||
          parsed.friendPlayerId.length > 64
        ) {
          return null;
        }
        return {
          type: 'join_friend_instance',
          friendPlayerId: parsed.friendPlayerId
        };
      }

      case 'switch_instance': {
        if (
          typeof parsed.targetRoomId !== 'string' ||
          !/^[a-zA-Z0-9_-]{1,48}$/.test(parsed.targetRoomId.trim())
        ) {
          return null;
        }
        return {
          type: 'switch_instance',
          targetRoomId: parsed.targetRoomId.trim()
        };
      }

      case 'set_player_block': {
        if (
          typeof parsed.targetPlayerId !== 'string' ||
          parsed.targetPlayerId.length === 0 ||
          parsed.targetPlayerId.length > 64 ||
          typeof parsed.blocked !== 'boolean'
        ) {
          return null;
        }
        return {
          type: 'set_player_block',
          targetPlayerId: parsed.targetPlayerId,
          blocked: parsed.blocked
        };
      }

      case 'submit_player_report': {
        if (
          typeof parsed.reportedPlayerId !== 'string' ||
          parsed.reportedPlayerId.length === 0 ||
          parsed.reportedPlayerId.length > 64 ||
          typeof parsed.reportedDisplayName !== 'string' ||
          parsed.reportedDisplayName.length === 0 ||
          parsed.reportedDisplayName.length > 64 ||
          !isValidReportReason(parsed.reason)
        ) {
          return null;
        }
        const reportedSessionId =
          typeof parsed.reportedSessionId === 'string' && parsed.reportedSessionId.length <= 64
            ? parsed.reportedSessionId
            : null;
        const details =
          typeof parsed.details === 'string' ? parsed.details.trim().slice(0, 200) : '';
        return {
          type: 'submit_player_report',
          reportedPlayerId: parsed.reportedPlayerId,
          reportedSessionId,
          reportedDisplayName: parsed.reportedDisplayName,
          reason: parsed.reason,
          details
        };
      }

      case 'trigger_animal_feeding': {
        if (
          typeof parsed.habitatId !== 'string' ||
          !(parsed.habitatId in ZOO_HABITAT_ZONES)
        ) {
          return null;
        }
        return {
          type: 'trigger_animal_feeding',
          habitatId: parsed.habitatId as HabitatId
        };
      }

      case 'ping': {
        if (
          typeof parsed.clientTimestamp !== 'number' ||
          !Number.isFinite(parsed.clientTimestamp)
        ) {
          return null;
        }
        return {
          type: 'ping',
          clientTimestamp: parsed.clientTimestamp
        };
      }

      case 'leave_instance': {
        return { type: 'leave_instance' };
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}
