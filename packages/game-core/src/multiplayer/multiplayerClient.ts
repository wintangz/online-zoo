import type {
  EmoteId,
  LocomotionState,
  PlayerIdentityProfile,
  RemoteVisitorSummary,
  ReportReason
} from '../types';
import { validateChatMessage } from '../social/chatModeration';
import { getEmoteDescriptor, isValidEmoteId } from '../social/emoteCatalog';
import { gameStore, mutableRuntimeState } from '../state/gameStore';
import {
  DEFAULT_ROOM_ID,
  HEARTBEAT_INTERVAL_MS,
  INTERPOLATION_DELAY_MS,
  parseClientMultiplayerMessage,
  RECONCILIATION_BLEND_RATE,
  RECONCILIATION_SMOOTH_THRESHOLD,
  RECONCILIATION_SNAP_THRESHOLD,
  type ClientMultiplayerMessage,
  type ServerMultiplayerMessage
} from './protocol';
import {
  createRemotePlayerInterpolationState,
  pushRemotePlayerSnapshot,
  sampleRemotePlayerTransform
} from './remotePlayerInterpolator';
import { ZooInstanceAuthority } from './zooInstanceAuthority';
import {
  ANIMAL_SPECIES_CATALOG,
  type HabitatId,
  type TriggerFeedingResult
} from '../animals';

export const RESUME_TOKEN_STORAGE_KEY = 'online-zoo:mp-resume:v1';

export interface MultiplayerTransportAdapter {
  send(data: string): void;
  close(): void;
  onOpen: (() => void) | null;
  onMessage: ((data: string) => void) | null;
  onClose: ((reason?: string) => void) | null;
  onError: ((error?: unknown) => void) | null;
}

export interface MultiplayerClientOptions {
  url?: string;
  roomId?: string;
  maxReconnectAttempts?: number;
  reconnectBackoffMs?: number[];
  heartbeatIntervalMs?: number;
  sendRateHz?: number;
  idleSyncIntervalMs?: number;
  interpolationDelayMs?: number;
  transportFactory?: (url: string) => MultiplayerTransportAdapter;
  onAuthoritativePositionApplied?: (position: [number, number, number], facingYaw?: number) => void;
}

/**
 * Browser WebSocket adapter implementing `MultiplayerTransportAdapter`.
 */
export function createBrowserWebSocketTransport(url: string): MultiplayerTransportAdapter {
  const ws = new WebSocket(url);
  const adapter: MultiplayerTransportAdapter = {
    send(data: string) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    },
    close() {
      try {
        ws.close();
      } catch {
        // Ignore close errors
      }
    },
    onOpen: null,
    onMessage: null,
    onClose: null,
    onError: null
  };

  ws.onopen = () => {
    adapter.onOpen?.();
  };
  ws.onmessage = (event) => {
    if (typeof event.data === 'string') {
      adapter.onMessage?.(event.data);
    }
  };
  ws.onclose = (event) => {
    adapter.onClose?.(event.reason || 'socket_closed');
  };
  ws.onerror = (err) => {
    adapter.onError?.(err);
  };

  return adapter;
}

/**
 * Deterministic in-memory transport hub backed by `ZooInstanceAuthority`.
 * Enables fast multi-client integration testing without OS sockets.
 */
export class InMemoryMultiplayerHub {
  public readonly authority: ZooInstanceAuthority;
  private readonly connections = new Map<
    string,
    {
      sessionId: string | null;
      playerId: string | null;
      roomId: string;
      deliverToClient: (msg: ServerMultiplayerMessage) => void;
      forceCloseClient: (reason: string) => void;
    }
  >();
  private nextConnId = 1;

  constructor(authority = new ZooInstanceAuthority()) {
    this.authority = authority;
  }

  public createTransportFactory(): (url: string) => MultiplayerTransportAdapter {
    return () => {
      const connId = `conn_${this.nextConnId++}`;
      let isOpen = false;
      let isClosed = false;

      const adapter: MultiplayerTransportAdapter = {
        send: (raw: string) => {
          if (!isOpen || isClosed) return;
          this.handleClientPayload(connId, raw);
        },
        close: () => {
          if (isClosed) return;
          isClosed = true;
          isOpen = false;
          const entry = this.connections.get(connId);
          this.connections.delete(connId);
          if (entry?.sessionId) {
            const { left, seatUpdate } = this.authority.disconnectPlayer(entry.sessionId, false);
            if (seatUpdate) {
              this.broadcastToRoom(seatUpdate.roomId, seatUpdate);
            }
            if (left) {
              this.broadcastToRoom(left.roomId, left, entry.sessionId);
            }
            this.broadcastSocialPresenceToAll();
          }
        },
        onOpen: null,
        onMessage: null,
        onClose: null,
        onError: null
      };

      this.connections.set(connId, {
        sessionId: null,
        playerId: null,
        roomId: DEFAULT_ROOM_ID,
        deliverToClient: (msg) => {
          if (!isClosed) {
            adapter.onMessage?.(JSON.stringify(msg));
          }
        },
        forceCloseClient: (reason) => {
          if (isClosed) return;
          isClosed = true;
          isOpen = false;
          this.connections.delete(connId);
          adapter.onClose?.(reason);
        }
      });

      queueMicrotask(() => {
        if (!isClosed) {
          isOpen = true;
          adapter.onOpen?.();
        }
      });

      return adapter;
    };
  }

  private handleClientPayload(connId: string, raw: string): void {
    const conn = this.connections.get(connId);
    if (!conn) return;

    const msg = parseClientMultiplayerMessage(raw);
    if (!msg) {
      conn.deliverToClient({
        type: 'error_notice',
        code: 'INVALID_PAYLOAD',
        message: 'Invalid or malformed client payload.'
      });
      return;
    }

    switch (msg.type) {
      case 'join_instance': {
        const { welcome, joinedBroadcast } = this.authority.joinOrResumePlayer({
          requestedRoomId: msg.roomId ?? DEFAULT_ROOM_ID,
          ...(msg.resumeToken !== undefined ? { resumeToken: msg.resumeToken } : {}),
          ...(msg.playerId !== undefined ? { playerId: msg.playerId } : {}),
          ...(msg.displayName !== undefined ? { displayName: msg.displayName } : {}),
          ...(msg.avatar !== undefined ? { avatar: msg.avatar } : {}),
          ...(msg.friendPlayerIds !== undefined ? { friendPlayerIds: msg.friendPlayerIds } : {}),
          ...(msg.blockedPlayerIds !== undefined ? { blockedPlayerIds: msg.blockedPlayerIds } : {})
        });
        conn.sessionId = welcome.sessionId;
        conn.playerId = welcome.playerId ?? null;
        conn.roomId = welcome.roomId;
        conn.deliverToClient(welcome);
        this.broadcastToRoom(welcome.roomId, joinedBroadcast, welcome.sessionId);
        this.broadcastSocialPresenceToAll();
        break;
      }

      case 'update_identity': {
        if (!conn.sessionId) return;
        const updated = this.authority.updatePlayerIdentity(conn.sessionId, msg);
        if (updated.accepted && updated.broadcast) {
          conn.playerId = updated.broadcast.playerId;
          this.broadcastToRoom(updated.broadcast.roomId, updated.broadcast);
          this.broadcastSocialPresenceToAll();
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: updated.errorCode ?? 'INVALID_IDENTITY_UPDATE',
            message: updated.errorMessage ?? 'Invalid identity update.'
          });
        }
        break;
      }

      case 'player_move': {
        if (!conn.sessionId) return;
        const result = this.authority.processPlayerMove(conn.sessionId, msg);
        if (result.emoteCancelledBroadcast) {
          this.broadcastToRoom(
            result.emoteCancelledBroadcast.roomId,
            result.emoteCancelledBroadcast
          );
        }
        if (result.seatReleasedBroadcast) {
          this.broadcastToRoom(result.seatReleasedBroadcast.roomId, result.seatReleasedBroadcast);
        }
        if (!result.accepted && result.errorCode) {
          conn.deliverToClient({
            type: 'error_notice',
            code: result.errorCode,
            message: `Move rejected: ${result.errorCode}`
          });
        }
        break;
      }

      case 'interact_prop': {
        if (!conn.sessionId) return;
        const res = this.authority.processPropInteraction(conn.sessionId, msg);
        if (res.seatUpdate) {
          this.broadcastToRoom(res.seatUpdate.roomId, res.seatUpdate);
        }
        if (res.propUpdate) {
          this.broadcastToRoom(res.propUpdate.roomId, res.propUpdate);
        }
        if (res.errorCode) {
          conn.deliverToClient({
            type: 'error_notice',
            code: res.errorCode,
            message: res.errorMessage ?? `Interaction rejected: ${res.errorCode}`
          });
        }
        break;
      }

      case 'send_chat_message': {
        if (!conn.sessionId) return;
        const chatRes = this.authority.processChatMessage(conn.sessionId, msg);
        if (chatRes.accepted && chatRes.broadcast) {
          this.deliverToSessions(chatRes.recipientSessionIds, chatRes.broadcast);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: chatRes.errorCode ?? 'INVALID_PAYLOAD',
            message: chatRes.errorMessage ?? 'Chat message rejected.'
          });
        }
        break;
      }

      case 'trigger_emote': {
        if (!conn.sessionId) return;
        const emoteRes = this.authority.processTriggerEmote(conn.sessionId, msg);
        if (emoteRes.accepted && emoteRes.broadcast) {
          this.deliverToSessions(emoteRes.recipientSessionIds, emoteRes.broadcast);
        }
        break;
      }

      case 'interact_seat': {
        if (!conn.sessionId) return;
        const seatRes = this.authority.processSeatInteraction(conn.sessionId, msg);
        if (seatRes.accepted) {
          if (seatRes.previousSeatUpdate) {
            this.broadcastToRoom(seatRes.previousSeatUpdate.roomId, seatRes.previousSeatUpdate);
          }
          if (seatRes.seatUpdate) {
            this.broadcastToRoom(seatRes.seatUpdate.roomId, seatRes.seatUpdate);
          }
        } else if (seatRes.errorCode) {
          conn.deliverToClient({
            type: 'error_notice',
            code: seatRes.errorCode,
            message: seatRes.errorMessage ?? 'Seat is currently occupied.'
          });
        }
        break;
      }

      case 'send_friend_request': {
        if (!conn.sessionId) return;
        const freqRes = this.authority.sendFriendRequest(conn.sessionId, msg);
        if (freqRes.accepted) {
          this.deliverSocialPresenceToPlayers(freqRes.affectedPlayerIds);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: freqRes.errorCode ?? 'FRIEND_REQUEST_INVALID',
            message: freqRes.errorMessage ?? 'Could not send friend request.'
          });
        }
        break;
      }

      case 'respond_friend_request': {
        if (!conn.sessionId) return;
        const respRes = this.authority.respondFriendRequest(conn.sessionId, msg);
        if (respRes.accepted) {
          this.deliverSocialPresenceToPlayers(respRes.affectedPlayerIds);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: respRes.errorCode ?? 'FRIEND_REQUEST_INVALID',
            message: respRes.errorMessage ?? 'Could not respond to friend request.'
          });
        }
        break;
      }

      case 'remove_friend': {
        if (!conn.sessionId) return;
        const remRes = this.authority.removeFriend(conn.sessionId, msg);
        if (remRes.accepted) {
          this.deliverSocialPresenceToPlayers(remRes.affectedPlayerIds);
        }
        break;
      }

      case 'join_friend_instance': {
        if (!conn.sessionId) return;
        const joinRes = this.authority.joinFriendInstance(conn.sessionId, msg);
        if (!joinRes.accepted) {
          conn.deliverToClient({
            type: 'error_notice',
            code: joinRes.errorCode ?? 'ROOM_FULL',
            message: joinRes.errorMessage ?? "Could not join friend's instance."
          });
          return;
        }
        if (joinRes.alreadyInRoom) {
          this.broadcastSocialPresenceToAll();
          return;
        }
        if (joinRes.seatReleasedOldRoom && joinRes.oldRoomId) {
          this.broadcastToRoom(joinRes.oldRoomId, joinRes.seatReleasedOldRoom);
        }
        if (joinRes.leftOldRoomBroadcast && joinRes.oldRoomId) {
          this.broadcastToRoom(joinRes.oldRoomId, joinRes.leftOldRoomBroadcast, conn.sessionId);
        }
        if (joinRes.newRoomId && joinRes.welcome && joinRes.joinedNewRoomBroadcast) {
          conn.roomId = joinRes.newRoomId;
          conn.deliverToClient(joinRes.welcome);
          this.broadcastToRoom(joinRes.newRoomId, joinRes.joinedNewRoomBroadcast, conn.sessionId);
        }
        this.broadcastSocialPresenceToAll();
        break;
      }

      case 'switch_instance': {
        if (!conn.sessionId) return;
        const switchRes = this.authority.switchPlayerInstance(conn.sessionId, msg);
        if (!switchRes.accepted) {
          conn.deliverToClient({
            type: 'error_notice',
            code: switchRes.errorCode ?? 'ROOM_FULL',
            message: switchRes.errorMessage ?? 'Could not switch to the selected instance.'
          });
          return;
        }
        if (switchRes.alreadyInRoom) {
          this.broadcastSocialPresenceToAll();
          return;
        }
        if (switchRes.seatReleasedOldRoom && switchRes.oldRoomId) {
          this.broadcastToRoom(switchRes.oldRoomId, switchRes.seatReleasedOldRoom);
        }
        if (switchRes.leftOldRoomBroadcast && switchRes.oldRoomId) {
          this.broadcastToRoom(switchRes.oldRoomId, switchRes.leftOldRoomBroadcast, conn.sessionId);
        }
        if (switchRes.newRoomId && switchRes.welcome && switchRes.joinedNewRoomBroadcast) {
          conn.roomId = switchRes.newRoomId;
          conn.deliverToClient(switchRes.welcome);
          this.broadcastToRoom(
            switchRes.newRoomId,
            switchRes.joinedNewRoomBroadcast,
            conn.sessionId
          );
        }
        this.broadcastSocialPresenceToAll();
        break;
      }

      case 'set_player_block': {
        if (!conn.sessionId) return;
        const blkRes = this.authority.setPlayerBlock(conn.sessionId, msg);
        if (blkRes.accepted) {
          this.deliverSocialPresenceToPlayers(blkRes.affectedPlayerIds);
        }
        break;
      }

      case 'submit_player_report': {
        if (!conn.sessionId) return;
        const repRes = this.authority.submitPlayerReport(conn.sessionId, msg);
        if (repRes.accepted && repRes.ack) {
          conn.deliverToClient(repRes.ack);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: repRes.errorCode ?? 'INVALID_PAYLOAD',
            message: repRes.errorMessage ?? 'Could not submit player report.'
          });
        }
        break;
      }

      case 'trigger_animal_feeding': {
        if (!conn.sessionId) return;
        const feedRes = this.authority.triggerAnimalFeeding(conn.sessionId, msg);
        if (feedRes.accepted && feedRes.broadcast) {
          this.broadcastToRoom(feedRes.broadcast.roomId, feedRes.broadcast);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: feedRes.errorCode ?? 'ANIMAL_FEEDING_COOLDOWN',
            message: feedRes.errorMessage ?? 'Habitat feeding is currently on cooldown.'
          });
        }
        break;
      }

      case 'ping': {
        if (conn.sessionId) {
          this.authority.recordHeartbeat(conn.sessionId);
        }
        conn.deliverToClient({
          type: 'pong',
          clientTimestamp: msg.clientTimestamp,
          serverTimestamp: Date.now()
        });
        break;
      }

      case 'leave_instance': {
        if (!conn.sessionId) return;
        const sid = conn.sessionId;
        conn.sessionId = null;
        const { left, seatUpdate } = this.authority.disconnectPlayer(sid, true);
        if (seatUpdate) {
          this.broadcastToRoom(seatUpdate.roomId, seatUpdate);
        }
        if (left) {
          this.broadcastToRoom(left.roomId, left, sid);
        }
        this.broadcastSocialPresenceToAll();
        break;
      }
    }
  }

  public stepServerTick(now = Date.now()): void {
    const pruned = this.authority.pruneStaleSessions(now);
    for (const item of pruned) {
      if (item.seatUpdate) {
        this.broadcastToRoom(item.seatUpdate.roomId, item.seatUpdate);
      }
      this.broadcastToRoom(item.left.roomId, item.left, item.left.sessionId);
    }
    if (pruned.length > 0) {
      this.broadcastSocialPresenceToAll(now);
    }

    for (const roomId of this.authority.getAllRoomIds()) {
      const tick = this.authority.buildRoomTickSnapshot(roomId, now);
      if (tick && tick.players.length > 0) {
        this.broadcastToRoom(roomId, tick);
      }
    }
  }

  private deliverToSessions(sessionIds: string[], msg: ServerMultiplayerMessage): void {
    const targetSet = new Set(sessionIds);
    for (const conn of this.connections.values()) {
      if (conn.sessionId && targetSet.has(conn.sessionId)) {
        conn.deliverToClient(msg);
      }
    }
  }

  private deliverSocialPresenceToPlayers(playerIds: string[], now = Date.now()): void {
    const uniqueIds = new Set(playerIds);
    for (const conn of this.connections.values()) {
      if (conn.playerId && uniqueIds.has(conn.playerId)) {
        conn.deliverToClient(this.authority.buildSocialPresenceForPlayer(conn.playerId, now));
      }
    }
  }

  private broadcastSocialPresenceToAll(now = Date.now()): void {
    for (const conn of this.connections.values()) {
      if (conn.playerId) {
        conn.deliverToClient(this.authority.buildSocialPresenceForPlayer(conn.playerId, now));
      }
    }
  }

  private broadcastToRoom(
    roomId: string,
    msg: ServerMultiplayerMessage,
    excludeSessionId?: string
  ): void {
    for (const conn of this.connections.values()) {
      if (conn.roomId === roomId && conn.sessionId && conn.sessionId !== excludeSessionId) {
        conn.deliverToClient(msg);
      }
    }
  }
}

function loadSavedResumeToken(): string | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    return window.sessionStorage.getItem(RESUME_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveResumeToken(token: string | null): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    if (token) {
      window.sessionStorage.setItem(RESUME_TOKEN_STORAGE_KEY, token);
    } else {
      window.sessionStorage.removeItem(RESUME_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function resolveDefaultWebSocketUrl(roomId: string): string {
  if (typeof window === 'undefined' || !window.location) {
    return `ws://localhost:3000/ws/zoo?room=${encodeURIComponent(roomId)}`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3000';
  return `${proto}//${host}/ws/zoo?room=${encodeURIComponent(roomId)}`;
}

function resolveRoomIdFromUrl(fallbackRoomId = DEFAULT_ROOM_ID): string {
  if (typeof window === 'undefined' || !window.location) {
    return fallbackRoomId;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam && /^[a-zA-Z0-9_-]{1,48}$/.test(roomParam)) {
      return roomParam;
    }
  } catch {
    // Ignore URL parse errors
  }
  return fallbackRoomId;
}

/**
 * Client-side multiplayer session, social interaction, 20 Hz movement sender, local reconciliation handler,
 * and automatic/manual reconnection controller (`FR-001`–`FR-024`).
 */
export class MultiplayerClient {
  private roomId: string;
  private readonly url: string;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectBackoffMs: number[];
  private readonly heartbeatIntervalMs: number;
  private readonly moveIntervalMs: number;
  private readonly idleSyncIntervalMs: number;
  private readonly interpolationDelayMs: number;
  private readonly transportFactory: (url: string) => MultiplayerTransportAdapter;
  private onAuthoritativePositionApplied?:
    | ((position: [number, number, number], facingYaw?: number) => void)
    | undefined;

  private transport: MultiplayerTransportAdapter | null = null;
  private resumeToken: string | null = null;
  private localSessionId: string | null = null;
  private moveSequence = 0;
  private virtualClockMs = 0;
  private lastSentMoveAt = 0;
  private lastSentHeartbeatAt = 0;
  private lastSentPosition: [number, number, number] = [0, 0.1, 18];
  private lastSentYaw = Math.PI;
  private lastSentLocomotionState: LocomotionState = 'Idle';

  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private dropRestoreTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private intentionalDisconnect = false;
  private networkSuppressed = false;

  constructor(options: MultiplayerClientOptions = {}) {
    this.roomId = options.roomId ?? resolveRoomIdFromUrl(DEFAULT_ROOM_ID);
    this.url = options.url ?? resolveDefaultWebSocketUrl(this.roomId);
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectBackoffMs = options.reconnectBackoffMs ?? [500, 1000, 2000, 3000, 4000];
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS;
    const sendRateHz = options.sendRateHz ?? 20;
    this.moveIntervalMs = Math.round(1000 / sendRateHz);
    this.idleSyncIntervalMs = options.idleSyncIntervalMs ?? 500;
    this.interpolationDelayMs = options.interpolationDelayMs ?? INTERPOLATION_DELAY_MS;
    this.transportFactory = options.transportFactory ?? createBrowserWebSocketTransport;
    this.onAuthoritativePositionApplied = options.onAuthoritativePositionApplied;
    this.resumeToken = loadSavedResumeToken();
  }

  public setOnAuthoritativePositionApplied(
    cb: (position: [number, number, number], facingYaw?: number) => void
  ): void {
    this.onAuthoritativePositionApplied = cb;
  }

  public getSessionId(): string | null {
    return this.localSessionId;
  }

  public getResumeToken(): string | null {
    return this.resumeToken;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public connect(): void {
    this.clearTimers();
    this.intentionalDisconnect = false;
    this.networkSuppressed = false;
    this.reconnectAttempt = 0;

    gameStore.getState().updateMultiplayerState({
      status: 'connecting',
      roomId: this.roomId,
      reconnectAttempt: 0,
      maxReconnectAttempts: this.maxReconnectAttempts,
      lastDisconnectReason: null
    });

    this.openTransport();
  }

  private openTransport(): void {
    if (this.transport) {
      this.transport.onOpen = null;
      this.transport.onMessage = null;
      this.transport.onClose = null;
      this.transport.onError = null;
      this.transport.close();
      this.transport = null;
    }

    if (this.networkSuppressed) {
      this.handleUnexpectedDisconnect('simulated_network_drop');
      return;
    }

    try {
      const adapter = this.transportFactory(this.url);
      this.transport = adapter;

      adapter.onOpen = () => {
        if (this.intentionalDisconnect || this.networkSuppressed) return;
        const st = gameStore.getState();
        let profile = st.identity.profile;
        if (profile.playerId === 'player-initial-visitor') {
          profile = st.initializePlayerIdentity();
        }
        const friendPlayerIds = st.social.friends.map((f) => f.playerId);
        const blockedPlayerIds = [...st.social.blockedPlayerIds];
        this.sendRaw({
          type: 'join_instance',
          roomId: this.roomId,
          resumeToken: this.resumeToken,
          playerId: profile.playerId,
          ...(profile.isCustomized ? { displayName: profile.displayName } : {}),
          avatar: { ...profile.avatar },
          friendPlayerIds,
          blockedPlayerIds
        });
      };

      adapter.onMessage = (raw: string) => {
        if (this.intentionalDisconnect || this.networkSuppressed) return;
        this.handleServerMessage(raw);
      };

      adapter.onClose = (reason?: string) => {
        if (this.intentionalDisconnect) return;
        this.handleUnexpectedDisconnect(reason || 'connection_lost');
      };

      adapter.onError = () => {
        // Error is followed by onClose in WebSocket lifecycle
      };
    } catch {
      this.handleUnexpectedDisconnect('transport_init_failed');
    }
  }

  public disconnect(cleanLeave = true): void {
    this.intentionalDisconnect = true;
    this.clearTimers();

    if (cleanLeave && this.transport) {
      this.sendRaw({ type: 'leave_instance' });
      this.resumeToken = null;
      saveResumeToken(null);
    }

    if (this.transport) {
      this.transport.onOpen = null;
      this.transport.onMessage = null;
      this.transport.onClose = null;
      this.transport.onError = null;
      this.transport.close();
      this.transport = null;
    }

    mutableRuntimeState.remotePlayers.clear();
    gameStore.getState().setLocalSeatedState(null);
    gameStore.getState().setLocalActiveEmote(null);
    gameStore.getState().updateMultiplayerState({
      status: 'disconnected',
      visitorCount: 1,
      remoteVisitors: {},
      lastDisconnectReason: cleanLeave ? 'left_cleanly' : 'disconnected'
    });
  }

  public simulateNetworkDrop(dropDurationMs = 1500): void {
    this.networkSuppressed = true;
    if (this.dropRestoreTimer) {
      clearTimeout(this.dropRestoreTimer);
      this.dropRestoreTimer = null;
    }

    if (this.transport) {
      const activeTransport = this.transport;
      this.transport = null;
      activeTransport.onOpen = null;
      activeTransport.onMessage = null;
      activeTransport.onClose = null;
      activeTransport.onError = null;
      activeTransport.close();
    }

    if (dropDurationMs > 0) {
      this.dropRestoreTimer = setTimeout(() => {
        this.networkSuppressed = false;
      }, dropDurationMs);
    }

    this.handleUnexpectedDisconnect('simulated_network_drop');
  }

  private handleUnexpectedDisconnect(reason: string): void {
    if (this.intentionalDisconnect) return;
    this.stopHeartbeatLoop();

    if (this.reconnectAttempt < this.maxReconnectAttempts) {
      const attemptIdx = this.reconnectAttempt;
      this.reconnectAttempt += 1;
      const delayMs =
        this.reconnectBackoffMs[Math.min(attemptIdx, this.reconnectBackoffMs.length - 1)] ?? 1000;

      gameStore.getState().updateMultiplayerState({
        status: 'reconnecting',
        reconnectAttempt: this.reconnectAttempt,
        maxReconnectAttempts: this.maxReconnectAttempts,
        lastDisconnectReason: reason
      });

      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        if (!this.intentionalDisconnect) {
          this.openTransport();
        }
      }, delayMs);
    } else {
      mutableRuntimeState.remotePlayers.clear();
      gameStore.getState().updateMultiplayerState({
        status: 'disconnected',
        visitorCount: 1,
        remoteVisitors: {},
        reconnectAttempt: this.reconnectAttempt,
        lastDisconnectReason: reason
      });
    }
  }

  private startHeartbeatLoop(): void {
    this.stopHeartbeatLoop();
    this.heartbeatTimer = setInterval(() => {
      if (
        this.intentionalDisconnect ||
        this.networkSuppressed ||
        gameStore.getState().multiplayer.status !== 'connected'
      ) {
        return;
      }
      const now = Date.now();
      this.lastSentHeartbeatAt = now;
      this.sendRaw({
        type: 'ping',
        clientTimestamp: now
      });
    }, this.heartbeatIntervalMs);
    (this.heartbeatTimer as unknown as { unref?: () => void })?.unref?.();
  }

  private stopHeartbeatLoop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.stopHeartbeatLoop();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.dropRestoreTimer) {
      clearTimeout(this.dropRestoreTimer);
      this.dropRestoreTimer = null;
    }
  }

  private sendRaw(msg: ClientMultiplayerMessage): void {
    if (!this.transport || this.networkSuppressed) return;
    try {
      this.transport.send(JSON.stringify(msg));
    } catch {
      // Ignore send errors on closing sockets
    }
  }

  private handleServerMessage(raw: string): void {
    let parsed: ServerMultiplayerMessage;
    try {
      parsed = JSON.parse(raw) as ServerMultiplayerMessage;
    } catch {
      return;
    }

    if (!parsed || typeof parsed.type !== 'string') return;
    const now = Date.now();
    const store = gameStore.getState();

    switch (parsed.type) {
      case 'welcome_snapshot': {
        this.roomId = parsed.roomId;
        this.localSessionId = parsed.sessionId;
        this.resumeToken = parsed.resumeToken;
        saveResumeToken(parsed.resumeToken);
        this.reconnectAttempt = 0;

        mutableRuntimeState.avatar.position = [...parsed.spawnPosition];
        mutableRuntimeState.avatar.facingYaw = parsed.spawnYaw;
        mutableRuntimeState.avatar.targetYaw = parsed.spawnYaw;
        mutableRuntimeState.reconciliation.pendingOffset = [0, 0, 0];
        mutableRuntimeState.reconciliation.lastServerPosition = [...parsed.spawnPosition];
        this.onAuthoritativePositionApplied?.(parsed.spawnPosition, parsed.spawnYaw);

        this.lastSentPosition = [...parsed.spawnPosition];
        this.lastSentYaw = parsed.spawnYaw;
        this.lastSentMoveAt = now;
        this.lastSentHeartbeatAt = now;

        store.setAllPropStatesAuthoritative(parsed.propStates);
        if (parsed.seatStates) {
          store.setAllSeatStatesAuthoritative(parsed.seatStates, parsed.sessionId);
        }

        mutableRuntimeState.remotePlayers.clear();
        const remoteVisitorsMap: Record<string, RemoteVisitorSummary> = {};

        for (const p of parsed.players) {
          if (p.sessionId === parsed.sessionId) continue;
          mutableRuntimeState.remotePlayers.set(
            p.sessionId,
            createRemotePlayerInterpolationState(p, now)
          );
          remoteVisitorsMap[p.sessionId] = {
            sessionId: p.sessionId,
            ...(p.playerId !== undefined ? { playerId: p.playerId } : {}),
            displayName: p.displayName,
            accentColor: p.accentColor,
            ...(p.avatar ? { avatar: { ...p.avatar } } : {}),
            locomotionState: p.locomotionState,
            activeEmote: p.activeEmote ?? null,
            seatedOn: p.seatedOn ?? null
          };
          if (p.activeEmote) {
            store.setRemoteActiveEmote(p.sessionId, p.playerId, p.activeEmote);
          }
        }

        if (parsed.availableInstances) {
          store.setAvailableInstances(parsed.availableInstances);
        }

        if (parsed.animals) {
          store.setAnimalsAuthoritative(parsed.animals, parsed.habitatFeedings);
        }

        store.updateMultiplayerState({
          status: 'connected',
          roomId: parsed.roomId,
          localSessionId: parsed.sessionId,
          localDisplayName: parsed.displayName,
          localAccentColor: parsed.accentColor,
          visitorCount: parsed.players.length,
          reconnectAttempt: 0,
          lastDisconnectReason: null,
          remoteVisitors: remoteVisitorsMap
        });
        this.startHeartbeatLoop();
        break;
      }

      case 'player_joined': {
        const p = parsed.player;
        if (p.sessionId === this.localSessionId) {
          store.updateMultiplayerState({ visitorCount: parsed.visitorCount });
          return;
        }

        mutableRuntimeState.remotePlayers.set(
          p.sessionId,
          createRemotePlayerInterpolationState(p, now)
        );
        store.upsertRemoteVisitor({
          sessionId: p.sessionId,
          ...(p.playerId !== undefined ? { playerId: p.playerId } : {}),
          displayName: p.displayName,
          accentColor: p.accentColor,
          ...(p.avatar ? { avatar: { ...p.avatar } } : {}),
          locomotionState: p.locomotionState,
          activeEmote: p.activeEmote ?? null,
          seatedOn: p.seatedOn ?? null
        });
        store.updateMultiplayerState({ visitorCount: parsed.visitorCount });
        break;
      }

      case 'player_left': {
        if (parsed.sessionId !== this.localSessionId) {
          mutableRuntimeState.remotePlayers.delete(parsed.sessionId);
          store.removeRemoteVisitor(parsed.sessionId);
        }
        store.updateMultiplayerState({ visitorCount: Math.max(1, parsed.visitorCount) });
        break;
      }

      case 'room_state_tick': {
        if (store.multiplayer.visitorCount !== parsed.visitorCount) {
          store.updateMultiplayerState({ visitorCount: Math.max(1, parsed.visitorCount) });
        }

        for (const p of parsed.players) {
          if (p.sessionId === this.localSessionId) {
            this.reconcileLocalPlayer(p.position, Boolean(p.reconciled), p.sequence, now);
            continue;
          }

          let remoteBuffer = mutableRuntimeState.remotePlayers.get(p.sessionId);
          if (!remoteBuffer) {
            remoteBuffer = createRemotePlayerInterpolationState(p, now);
            mutableRuntimeState.remotePlayers.set(p.sessionId, remoteBuffer);
          } else {
            pushRemotePlayerSnapshot(remoteBuffer, p, now);
          }

          store.upsertRemoteVisitor({
            sessionId: p.sessionId,
            ...(p.playerId !== undefined ? { playerId: p.playerId } : {}),
            displayName: p.displayName,
            accentColor: p.accentColor,
            ...(p.avatar ? { avatar: { ...p.avatar } } : {}),
            locomotionState: p.locomotionState,
            activeEmote: p.activeEmote ?? null,
            seatedOn: p.seatedOn ?? null
          });
        }

        if (parsed.animals) {
          store.setAnimalsAuthoritative(parsed.animals, parsed.habitatFeedings);
        }
        break;
      }

      case 'player_identity_updated': {
        if (parsed.sessionId === this.localSessionId) {
          store.updateMultiplayerState({
            localDisplayName: parsed.displayName,
            localAccentColor: parsed.accentColor
          });
          return;
        }
        const remoteBuffer = mutableRuntimeState.remotePlayers.get(parsed.sessionId);
        if (remoteBuffer) {
          remoteBuffer.displayName = parsed.displayName;
          remoteBuffer.accentColor = parsed.accentColor;
        }
        const existingRemote = store.multiplayer.remoteVisitors[parsed.sessionId];
        store.upsertRemoteVisitor({
          sessionId: parsed.sessionId,
          playerId: parsed.playerId,
          displayName: parsed.displayName,
          accentColor: parsed.accentColor,
          avatar: { ...parsed.avatar },
          locomotionState:
            existingRemote?.locomotionState ??
            remoteBuffer?.renderLocomotionState ??
            'Idle'
        });
        break;
      }

      case 'prop_state_updated': {
        store.setPropStateAuthoritative(
          parsed.objectId,
          parsed.active,
          parsed.lastTriggeredAt
        );
        break;
      }

      case 'proximity_chat_message': {
        store.addProximityChatMessage(parsed.message);
        break;
      }

      case 'player_emote_triggered': {
        if (parsed.sessionId === this.localSessionId) {
          store.setLocalActiveEmote(parsed.emote);
        } else {
          store.setRemoteActiveEmote(parsed.sessionId, parsed.playerId, parsed.emote);
        }
        break;
      }

      case 'seat_state_updated': {
        store.setSeatStatesAuthoritative(parsed.objectId, parsed.seats, this.localSessionId);
        store.setPropStateAuthoritative(
          parsed.objectId,
          parsed.propActive,
          parsed.serverTimestamp
        );

        // If the local player just claimed a seat on this object, snap local avatar transform to the seat
        if (this.localSessionId) {
          const mySeat = parsed.seats.find((s) => s.occupiedBySessionId === this.localSessionId);
          if (mySeat) {
            mutableRuntimeState.avatar.position = [...mySeat.worldPosition];
            mutableRuntimeState.avatar.facingYaw = mySeat.facingYaw;
            mutableRuntimeState.avatar.targetYaw = mySeat.facingYaw;
            mutableRuntimeState.avatar.velocity = [0, 0, 0];
            mutableRuntimeState.avatar.locomotionState = 'Idle';
            this.onAuthoritativePositionApplied?.(mySeat.worldPosition, mySeat.facingYaw);
          }
        }
        break;
      }

      case 'social_presence_update': {
        store.updateSocialPresence({
          friends: parsed.friends,
          incomingRequests: parsed.incomingRequests,
          outgoingRequests: parsed.outgoingRequests,
          ...(parsed.blockedPlayerIds !== undefined
            ? { blockedPlayerIds: parsed.blockedPlayerIds }
            : {})
        });
        if (parsed.availableInstances) {
          store.setAvailableInstances(parsed.availableInstances);
        }
        break;
      }

      case 'report_submitted_ack': {
        store.recordSubmittedReport(parsed.report);
        break;
      }

      case 'animal_feeding_event': {
        const nextFeedings = {
          ...store.animalSim.habitatFeedings,
          [parsed.habitatId]: parsed.feedingState
        };
        store.setAnimalsAuthoritative(parsed.animals, nextFeedings);
        const speciesCatalog = ANIMAL_SPECIES_CATALOG[parsed.feedingState.speciesId];
        store.setFeedingNotice(
          `${speciesCatalog.badgeIcon} ${speciesCatalog.feedingActivityName} started!`
        );
        if (parsed.feedingState.triggeredBySessionId === this.localSessionId) {
          store.recordAnimalSpeciesFed(parsed.feedingState.speciesId);
        }
        break;
      }

      case 'error_notice': {
        if (
          parsed.code === 'CHAT_RATE_LIMITED' ||
          parsed.code === 'CHAT_MODERATION_BLOCKED'
        ) {
          store.setChatFeedback({
            type: 'error',
            message: parsed.message,
            timestamp: now
          });
        } else if (parsed.code === 'ANIMAL_FEEDING_COOLDOWN') {
          store.setFeedingNotice(parsed.message);
        } else if (
          parsed.code === 'SEAT_OCCUPIED' ||
          parsed.code === 'ROOM_FULL' ||
          parsed.code === 'PLAYER_BLOCKED' ||
          parsed.code === 'FRIEND_REQUEST_INVALID'
        ) {
          store.setSocialNotice(parsed.message);
        }
        break;
      }

      case 'pong':
        break;
    }
  }

  public reconcileLocalPlayer(
    authoritativePosition: [number, number, number],
    wasClampedByServer: boolean,
    sequence: number,
    now = Date.now()
  ): void {
    const recon = mutableRuntimeState.reconciliation;
    recon.lastAcknowledgedSequence = Math.max(recon.lastAcknowledgedSequence, sequence);
    recon.lastServerPosition = [...authoritativePosition];

    if (!wasClampedByServer) {
      return;
    }

    const localPos = mutableRuntimeState.avatar.position;
    const dx = authoritativePosition[0] - localPos[0];
    const dy = authoritativePosition[1] - localPos[1];
    const dz = authoritativePosition[2] - localPos[2];
    const horizontalDist = Math.hypot(dx, dz);

    if (horizontalDist >= RECONCILIATION_SNAP_THRESHOLD) {
      mutableRuntimeState.avatar.position = [...authoritativePosition];
      mutableRuntimeState.avatar.velocity = [0, 0, 0];
      recon.pendingOffset = [0, 0, 0];
      recon.reconciliationCount += 1;
      recon.lastSnapAt = now;
      this.onAuthoritativePositionApplied?.(authoritativePosition);
    } else if (horizontalDist >= RECONCILIATION_SMOOTH_THRESHOLD) {
      recon.pendingOffset = [dx, dy, dz];
      recon.reconciliationCount += 1;
    }
  }

  public sendMoveUpdate(
    position: [number, number, number],
    velocity: [number, number, number],
    facingYaw: number,
    locomotionState: LocomotionState,
    now = Date.now()
  ): number {
    this.moveSequence += 1;
    this.lastSentMoveAt = now;
    this.lastSentPosition = [...position];
    this.lastSentYaw = facingYaw;
    this.lastSentLocomotionState = locomotionState;

    this.sendRaw({
      type: 'player_move',
      sequence: this.moveSequence,
      clientTimestamp: now,
      position: [...position],
      velocity: [...velocity],
      facingYaw,
      locomotionState
    });

    return this.moveSequence;
  }

  public sendPropInteraction(objectId: string, now = Date.now()): void {
    if (gameStore.getState().multiplayer.status !== 'connected') {
      return;
    }
    this.sendRaw({
      type: 'interact_prop',
      objectId,
      clientTimestamp: now
    });
  }

  public sendIdentityUpdate(
    profile: PlayerIdentityProfile = gameStore.getState().identity.profile
  ): void {
    if (gameStore.getState().multiplayer.status !== 'connected') {
      return;
    }
    this.sendRaw({
      type: 'update_identity',
      playerId: profile.playerId,
      displayName: profile.displayName,
      avatar: { ...profile.avatar }
    });
  }

  /**
   * Validates and sends a proximity text chat message (`FR-001`–`FR-007`, `SC-001`–`SC-003`).
   */
  public sendChatMessage(
    rawText: string,
    now = Date.now()
  ): {
    valid: boolean;
    errorMessage?: string;
  } {
    const store = gameStore.getState();
    const validation = validateChatMessage(rawText);
    if (!validation.valid) {
      store.setChatFeedback({
        type: 'error',
        message: validation.errorMessage ?? 'Invalid chat message.',
        timestamp: now
      });
      return {
        valid: false,
        ...(validation.errorMessage !== undefined ? { errorMessage: validation.errorMessage } : {})
      };
    }

    if (store.multiplayer.status !== 'connected') {
      // Offline fallback: show local speech bubble and chat entry
      const localSid = store.multiplayer.localSessionId ?? 'local-session';
      store.addProximityChatMessage({
        messageId: `local_msg_${now}`,
        roomId: this.roomId,
        senderSessionId: localSid,
        senderPlayerId: store.identity.profile.playerId,
        senderDisplayName: store.identity.profile.displayName,
        senderAccentColor: store.multiplayer.localAccentColor ?? '#10b981',
        text: validation.normalizedText,
        position: [...mutableRuntimeState.avatar.position],
        createdAt: now,
        expiresAt: now + 6000
      });
      return { valid: true };
    }

    this.sendRaw({
      type: 'send_chat_message',
      text: validation.normalizedText,
      clientTimestamp: now
    });
    return { valid: true };
  }

  /**
   * Triggers or cancels a local avatar emote and broadcasts to nearby visitors (`FR-009`–`FR-011`, `SC-004`).
   */
  public sendEmote(emoteId: EmoteId | null, now = Date.now()): void {
    const store = gameStore.getState();
    if (emoteId === null) {
      if (!store.social.localActiveEmote) return;
      store.setLocalActiveEmote(null);
    } else if (isValidEmoteId(emoteId)) {
      const desc = getEmoteDescriptor(emoteId);
      store.setLocalActiveEmote({
        emoteId: desc.id,
        label: desc.label,
        icon: desc.icon,
        startedAt: now,
        expiresAt: now + desc.durationMs
      });
    } else {
      return;
    }

    if (store.multiplayer.status === 'connected') {
      this.sendRaw({
        type: 'trigger_emote',
        emoteId,
        clientTimestamp: now
      });
    }
  }

  /**
   * Requests to sit on or stand up from a multi-seat bench or chair (`FR-012`–`FR-015`, `SC-005`).
   */
  public sendSeatInteraction(
    objectId: string,
    action: 'sit' | 'stand',
    preferredSeatIndex?: number,
    now = Date.now()
  ): void {
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      // Offline fallback seat handling
      const slots = store.social.seatStates[objectId];
      if (!slots) return;
      if (action === 'stand') {
        const updated = slots.map((s) =>
          s.occupiedBySessionId === 'local-session'
            ? {
                ...s,
                occupiedBySessionId: null,
                occupiedByPlayerId: null,
                occupiedByDisplayName: null,
                occupiedAt: 0
              }
            : s
        );
        store.setSeatStatesAuthoritative(objectId, updated, 'local-session');
        store.setLocalSeatedState(null);
      } else {
        const freeSlot = slots.find((s) => s.occupiedBySessionId === null);
        if (!freeSlot) {
          store.setSocialNotice('All seats on this bench are currently occupied.');
          return;
        }
        const updated = slots.map((s) =>
          s.seatIndex === freeSlot.seatIndex
            ? {
                ...s,
                occupiedBySessionId: 'local-session',
                occupiedByPlayerId: store.identity.profile.playerId,
                occupiedByDisplayName: store.identity.profile.displayName,
                occupiedAt: now
              }
            : s
        );
        store.setSeatStatesAuthoritative(objectId, updated, 'local-session');
        mutableRuntimeState.avatar.position = [...freeSlot.worldPosition];
        mutableRuntimeState.avatar.facingYaw = freeSlot.facingYaw;
        this.onAuthoritativePositionApplied?.(freeSlot.worldPosition, freeSlot.facingYaw);
      }
      return;
    }

    this.sendRaw({
      type: 'interact_seat',
      objectId,
      action,
      ...(preferredSeatIndex !== undefined ? { preferredSeatIndex } : {}),
      clientTimestamp: now
    });
  }

  public sendFriendRequest(targetPlayerId: string, targetDisplayName?: string): void {
    const trimmed = targetPlayerId.trim();
    if (!trimmed) return;
    this.sendRaw({
      type: 'send_friend_request',
      targetPlayerId: trimmed,
      ...(targetDisplayName !== undefined ? { targetDisplayName } : {})
    });
  }

  public respondFriendRequest(requestId: string, decision: 'accept' | 'reject'): void {
    this.sendRaw({
      type: 'respond_friend_request',
      requestId,
      decision
    });
  }

  public removeFriend(targetPlayerId: string): void {
    this.sendRaw({
      type: 'remove_friend',
      targetPlayerId
    });
  }

  public joinFriendInstance(friendPlayerId: string): void {
    this.sendRaw({
      type: 'join_friend_instance',
      friendPlayerId
    });
  }

  public switchInstance(targetRoomId: string): void {
    const trimmed = targetRoomId.trim();
    if (!trimmed) return;
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      this.roomId = trimmed;
      store.updateMultiplayerState({ roomId: trimmed });
      return;
    }
    this.sendRaw({
      type: 'switch_instance',
      targetRoomId: trimmed
    });
  }

  public setPlayerBlock(targetPlayerId: string, blocked: boolean): void {
    gameStore.getState().setBlockPlayer(targetPlayerId, blocked);
    if (gameStore.getState().multiplayer.status === 'connected') {
      this.sendRaw({
        type: 'set_player_block',
        targetPlayerId,
        blocked
      });
    }
  }

  public submitPlayerReport(params: {
    reportedPlayerId: string;
    reportedSessionId?: string | null;
    reportedDisplayName: string;
    reason: ReportReason;
    details?: string;
  }): void {
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      store.recordSubmittedReport({
        reportId: `local_rep_${Date.now()}`,
        reporterPlayerId: store.identity.profile.playerId,
        reporterSessionId: store.multiplayer.localSessionId ?? 'local-session',
        reportedPlayerId: params.reportedPlayerId,
        reportedSessionId: params.reportedSessionId ?? null,
        reportedDisplayName: params.reportedDisplayName,
        roomId: this.roomId,
        reason: params.reason,
        details: (params.details ?? '').trim().slice(0, 200),
        recentChatSnapshot: store.social.chatMessages.slice(-5).map((m) => ({
          messageId: m.messageId,
          senderPlayerId: m.senderPlayerId,
          senderDisplayName: m.senderDisplayName,
          text: m.text,
          createdAt: m.createdAt
        })),
        createdAt: new Date().toISOString()
      });
      return;
    }

    this.sendRaw({
      type: 'submit_player_report',
      reportedPlayerId: params.reportedPlayerId,
      reportedSessionId: params.reportedSessionId ?? null,
      reportedDisplayName: params.reportedDisplayName,
      reason: params.reason,
      ...(params.details !== undefined ? { details: params.details } : {})
    });
  }

  /**
   * Triggers a species-appropriate habitat feeding activity (`FR-013`–`FR-015`, `SC-006`).
   * Validates active/cooldown status locally and broadcasts to the instance authority when connected.
   */
  public sendTriggerAnimalFeeding(
    habitatId: HabitatId,
    now = Date.now()
  ): TriggerFeedingResult {
    const store = gameStore.getState();
    const localRes = mutableRuntimeState.animalSimulation.triggerHabitatFeeding(
      habitatId,
      now,
      this.localSessionId ?? 'local-session',
      'player'
    );

    if (!localRes.accepted) {
      const msg =
        localRes.reason === 'already_active'
          ? 'A feeding session is already underway at this habitat!'
          : 'The animals were just fed and are resting. Please wait for the cooldown.';
      store.setFeedingNotice(msg);
      if (store.multiplayer.status === 'connected') {
        this.sendRaw({
          type: 'trigger_animal_feeding',
          habitatId
        });
      }
      return localRes;
    }

    if (localRes.animals && localRes.feedingState) {
      store.setAnimalsAuthoritative(localRes.animals, {
        ...store.animalSim.habitatFeedings,
        [habitatId]: localRes.feedingState
      });
      const speciesCatalog = ANIMAL_SPECIES_CATALOG[localRes.feedingState.speciesId];
      store.setFeedingNotice(
        `${speciesCatalog.badgeIcon} ${speciesCatalog.feedingActivityName} started!`
      );
      store.recordAnimalSpeciesFed(localRes.feedingState.speciesId);
    }

    if (store.multiplayer.status === 'connected') {
      this.sendRaw({
        type: 'trigger_animal_feeding',
        habitatId
      });
    }

    return localRes;
  }

  public stepFrame(dt: number, now?: number): void {
    const stepMs = Math.max(1, Math.round(dt * 1000));
    const effectiveNow =
      typeof now === 'number'
        ? now
        : Math.max(Date.now(), this.virtualClockMs + stepMs);
    this.virtualClockMs = effectiveNow;

    // Prune expired speech bubbles and emotes
    gameStore.getState().pruneExpiredSocialEffects(effectiveNow);

    // 1. Apply smooth local reconciliation offset (< 2.0m blended over ~150ms)
    const offset = mutableRuntimeState.reconciliation.pendingOffset;
    const offsetMag = Math.hypot(offset[0], offset[1], offset[2]);
    if (offsetMag > 1e-3) {
      const blend = Math.min(1, dt * RECONCILIATION_BLEND_RATE);
      const stepX = offset[0] * blend;
      const stepY = offset[1] * blend;
      const stepZ = offset[2] * blend;

      const nextPos: [number, number, number] = [
        mutableRuntimeState.avatar.position[0] + stepX,
        Math.max(0.1, mutableRuntimeState.avatar.position[1] + stepY),
        mutableRuntimeState.avatar.position[2] + stepZ
      ];
      mutableRuntimeState.avatar.position = nextPos;
      offset[0] -= stepX;
      offset[1] -= stepY;
      offset[2] -= stepZ;
      if (Math.hypot(offset[0], offset[1], offset[2]) <= 1e-3) {
        mutableRuntimeState.reconciliation.pendingOffset = [0, 0, 0];
      }
      this.onAuthoritativePositionApplied?.(nextPos);
    }

    // 2. Step 60-120 Hz remote player interpolation
    for (const remoteBuffer of mutableRuntimeState.remotePlayers.values()) {
      sampleRemotePlayerTransform(remoteBuffer, effectiveNow, dt, this.interpolationDelayMs);
    }

    // 3. Network transmission when connected
    if (gameStore.getState().multiplayer.status !== 'connected') {
      return;
    }

    const avatar = mutableRuntimeState.avatar;
    const posChanged =
      Math.hypot(
        avatar.position[0] - this.lastSentPosition[0],
        avatar.position[1] - this.lastSentPosition[1],
        avatar.position[2] - this.lastSentPosition[2]
      ) > 0.008;
    const yawChanged = Math.abs(avatar.facingYaw - this.lastSentYaw) > 0.008;
    const stateChanged = avatar.locomotionState !== this.lastSentLocomotionState;
    const elapsedMoveMs = effectiveNow - this.lastSentMoveAt;

    if (
      stateChanged ||
      ((posChanged || yawChanged || avatar.locomotionState !== 'Idle') &&
        elapsedMoveMs >= this.moveIntervalMs) ||
      elapsedMoveMs >= this.idleSyncIntervalMs
    ) {
      this.sendMoveUpdate(
        avatar.position,
        avatar.velocity,
        avatar.facingYaw,
        avatar.locomotionState,
        effectiveNow
      );
    }

    if (effectiveNow - this.lastSentHeartbeatAt >= this.heartbeatIntervalMs) {
      this.lastSentHeartbeatAt = effectiveNow;
      this.sendRaw({
        type: 'ping',
        clientTimestamp: effectiveNow
      });
    }
  }
}
