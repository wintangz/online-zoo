import type {
  BetaFeedbackCategory,
  BetaFeedbackSeverity,
  EmoteId,
  LocomotionState,
  PlayerIdentityProfile,
  RemoteVisitorSummary,
  ReportReason,
  ZooInstanceHealthStatus
} from '../types';
import { validateBetaFeedbackInput } from '../readiness';
import { validateChatMessage } from '../social/chatModeration';
import { getEmoteDescriptor, isValidEmoteId } from '../social/emoteCatalog';
import { gameStore, mutableRuntimeState } from '../state/gameStore';
import {
  DEFAULT_ROOM_ID,
  HEARTBEAT_INTERVAL_MS,
  INTERPOLATION_DELAY_MS,
  RECONCILIATION_BLEND_RATE,
  RECONCILIATION_SMOOTH_THRESHOLD,
  RECONCILIATION_SNAP_THRESHOLD,
  resolveWebSocketServerUrl,
  type ClientMultiplayerMessage,
  type ServerMultiplayerMessage
} from './protocol';
import {
  createRemotePlayerInterpolationState,
  pushRemotePlayerSnapshot,
  sampleRemotePlayerTransform
} from './remotePlayerInterpolator';
import {
  ANIMAL_SPECIES_CATALOG,
  ANIMAL_SPECIES_IDS,
  type AnimalSpeciesId,
  type HabitatId,
  type TriggerFeedingResult
} from '../animals';
import type { FoodItemId } from '../dining';
import {
  PASSPORT_ZONE_IDS,
  type AchievementId,
  type PassportZoneId
} from '../passport';
import {
  sanitizeEventAdministrationConfig,
  type ZooEventId,
  type ZooEventScheduleConfig
} from '../events';
import {
  DEFAULT_ENTRY_ROOM_ID,
  resolveZoneForRoomId,
  type ZoneGateLink
} from '../world/zoneRegistry';

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
  alwaysSpawnInLobby?: boolean;
  preferFriendPlacement?: boolean;
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

function resolveDefaultWebSocketUrl(roomId: string, explicitWsUrl?: string): string {
  return resolveWebSocketServerUrl(roomId, explicitWsUrl);
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

function hasExplicitRoomParamInUrl(): boolean {
  if (typeof window === 'undefined' || !window.location) {
    return false;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    return Boolean(roomParam && /^[a-zA-Z0-9_-]{1,48}$/.test(roomParam));
  } catch {
    return false;
  }
}

/**
 * Client-side multiplayer session, social interaction, 20 Hz movement sender, local reconciliation handler,
 * and automatic/manual reconnection controller (`FR-001`–`FR-024`).
 */
export class MultiplayerClient {
  private roomId: string;
  private readonly alwaysSpawnInLobby: boolean;
  private readonly preferFriendPlacement: boolean;
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
  private purchaseReqCounter = 0;
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
    this.alwaysSpawnInLobby = options.alwaysSpawnInLobby ?? false;
    this.roomId = this.alwaysSpawnInLobby
      ? DEFAULT_ENTRY_ROOM_ID
      : options.roomId ?? resolveRoomIdFromUrl(DEFAULT_ROOM_ID);
    const hasExplicitOverride =
      this.alwaysSpawnInLobby || Boolean(options.roomId) || hasExplicitRoomParamInUrl();
    this.preferFriendPlacement = options.preferFriendPlacement ?? !hasExplicitOverride;
    this.url = resolveDefaultWebSocketUrl(this.roomId, options.url);
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.reconnectBackoffMs = options.reconnectBackoffMs ?? [500, 1000, 2000, 3000, 4000];
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS;
    const sendRateHz = options.sendRateHz ?? 20;
    this.moveIntervalMs = Math.round(1000 / sendRateHz);
    this.idleSyncIntervalMs = options.idleSyncIntervalMs ?? 500;
    this.interpolationDelayMs = options.interpolationDelayMs ?? INTERPOLATION_DELAY_MS;
    this.transportFactory = options.transportFactory ?? createBrowserWebSocketTransport;
    this.onAuthoritativePositionApplied = options.onAuthoritativePositionApplied;
    this.resumeToken = this.alwaysSpawnInLobby ? null : loadSavedResumeToken();
  }

  public getUrl(): string {
    return this.url;
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

    if (this.alwaysSpawnInLobby) {
      this.roomId = DEFAULT_ENTRY_ROOM_ID;
      this.resumeToken = null;
      saveResumeToken(null);
      gameStore.getState().setPendingGateArrival(null);
      gameStore.getState().setTransitionTargetZone(null);
    }

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
        if (this.alwaysSpawnInLobby) {
          this.roomId = DEFAULT_ENTRY_ROOM_ID;
        }
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
          blockedPlayerIds,
          preferFriendPlacement: this.preferFriendPlacement,
          allowFriendJoin: st.social.allowFriendJoin,
          diningWallet: {
            currencyBalance: st.dining.wallet.currencyBalance,
            inventory: { ...st.dining.wallet.inventory }
          },
          passportState: st.passport.state
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
    gameStore.getState().setLocalActiveConsumption(null);
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

        const arrivedZone = resolveZoneForRoomId(parsed.roomId);
        const pendingArrival = store.pendingGateArrival;
        const effectiveSpawnPosition: [number, number, number] =
          pendingArrival && pendingArrival.zoneId === arrivedZone.zoneId
            ? [...pendingArrival.position]
            : [...parsed.spawnPosition];
        const effectiveSpawnYaw =
          pendingArrival && pendingArrival.zoneId === arrivedZone.zoneId
            ? pendingArrival.yaw
            : parsed.spawnYaw;

        store.setPendingGateArrival(null);
        store.setTransitionTargetZone(null);
        store.setCurrentZoneId(arrivedZone.zoneId);

        mutableRuntimeState.avatar.position = [...effectiveSpawnPosition];
        mutableRuntimeState.avatar.facingYaw = effectiveSpawnYaw;
        mutableRuntimeState.avatar.targetYaw = effectiveSpawnYaw;
        mutableRuntimeState.reconciliation.pendingOffset = [0, 0, 0];
        mutableRuntimeState.reconciliation.lastServerPosition = [...effectiveSpawnPosition];
        this.onAuthoritativePositionApplied?.(effectiveSpawnPosition, effectiveSpawnYaw);

        this.lastSentPosition = [...effectiveSpawnPosition];
        this.lastSentYaw = effectiveSpawnYaw;
        this.lastSentMoveAt = now;
        this.lastSentHeartbeatAt = now;

        if (pendingArrival && pendingArrival.zoneId === arrivedZone.zoneId) {
          this.sendMoveUpdate(
            effectiveSpawnPosition,
            [0, 0, 0],
            effectiveSpawnYaw,
            'Idle',
            now
          );
        }

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
            seatedOn: p.seatedOn ?? null,
            activeConsumption: p.activeConsumption ?? null
          };
          if (p.activeEmote) {
            store.setRemoteActiveEmote(p.sessionId, p.playerId, p.activeEmote);
          }
          if (p.activeConsumption) {
            store.setRemoteActiveConsumption(p.sessionId, p.playerId, p.activeConsumption);
          }
        }

        if (parsed.availableInstances) {
          store.setAvailableInstances(parsed.availableInstances);
        }

        if (parsed.allowFriendJoin !== undefined) {
          store.setAllowFriendJoin(parsed.allowFriendJoin);
        }

        if (parsed.placementNotice) {
          store.setSocialNotice(parsed.placementNotice);
        }

        if (!arrivedZone.hasAnimals) {
          store.setAnimalsAuthoritative([], parsed.habitatFeedings);
        } else if (parsed.animals) {
          store.setAnimalsAuthoritative(parsed.animals, parsed.habitatFeedings);
        }

        if (parsed.diningWallet) {
          store.applyDiningWalletUpdate(
            parsed.diningWallet.currencyBalance,
            parsed.diningWallet.inventory
          );
        }

        if (parsed.passportState) {
          store.applyPassportServerUpdate(parsed.passportState);
        }

        if (parsed.zooEvents) {
          store.applyZooEventsSnapshot(parsed.zooEvents);
        }

        if (parsed.maintenanceNotice !== undefined) {
          store.setMaintenanceNotice(parsed.maintenanceNotice);
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
          seatedOn: p.seatedOn ?? null,
          activeConsumption: p.activeConsumption ?? null
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
            seatedOn: p.seatedOn ?? null,
            activeConsumption: p.activeConsumption ?? null
          });
        }

        if (!resolveZoneForRoomId(parsed.roomId).hasAnimals) {
          store.setAnimalsAuthoritative([], parsed.habitatFeedings);
        } else if (parsed.animals) {
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

      case 'food_purchase_result': {
        store.applyDiningWalletUpdate(parsed.currencyBalance, parsed.inventory);
        store.setPurchaseFeedback({
          type: parsed.success ? 'success' : 'error',
          message: parsed.message,
          ...(parsed.errorCode !== undefined ? { code: parsed.errorCode } : {}),
          timestamp: parsed.serverTimestamp
        });
        break;
      }

      case 'food_consume_result': {
        store.applyDiningWalletUpdate(parsed.currencyBalance, parsed.inventory);
        if (parsed.success && parsed.consumption) {
          store.setLocalActiveConsumption(parsed.consumption);
        }
        store.setPurchaseFeedback({
          type: parsed.success ? 'success' : 'error',
          message: parsed.message,
          ...(parsed.errorCode !== undefined ? { code: parsed.errorCode } : {}),
          timestamp: parsed.serverTimestamp
        });
        break;
      }

      case 'player_consumption_updated': {
        if (parsed.sessionId === this.localSessionId) {
          store.setLocalActiveConsumption(parsed.consumption);
        } else {
          store.setRemoteActiveConsumption(
            parsed.sessionId,
            parsed.playerId,
            parsed.consumption
          );
        }
        break;
      }

      case 'achievement_reward_result': {
        store.applyPassportServerUpdate(parsed.passportState);
        store.applyDiningWalletUpdate(
          parsed.currencyBalance,
          store.dining.wallet.inventory
        );
        store.setPassportRewardFeedback({
          type: parsed.success ? 'success' : 'error',
          message: parsed.message,
          ...(parsed.errorCode !== undefined ? { code: parsed.errorCode } : {}),
          timestamp: parsed.serverTimestamp
        });
        break;
      }

      case 'zoo_events_snapshot': {
        store.applyZooEventsSnapshot({
          seasonalTheme: parsed.seasonalTheme,
          events: parsed.events,
          ...(parsed.notice !== undefined ? { notice: parsed.notice } : {}),
          ...(parsed.errorCode !== undefined ? { errorCode: parsed.errorCode } : {})
        });
        break;
      }

      case 'event_reward_result': {
        store.applyPassportServerUpdate(parsed.passportState);
        store.applyDiningWalletUpdate(
          parsed.currencyBalance,
          store.dining.wallet.inventory
        );
        store.setEventFeedback({
          type: parsed.success ? 'success' : 'error',
          message: parsed.message,
          ...(parsed.errorCode !== undefined ? { code: parsed.errorCode } : {}),
          timestamp: parsed.serverTimestamp
        });
        break;
      }

      case 'instance_directory_update': {
        store.setAvailableInstances(parsed.availableInstances);
        if (parsed.notice) {
          store.setSocialNotice(parsed.notice);
        }
        break;
      }

      case 'beta_feedback_ack': {
        store.setBetaFeedbackNotice({
          type: 'success',
          message: parsed.confirmationMessage,
          timestamp: parsed.feedback.createdAt
        });
        break;
      }

      case 'ops_snapshot': {
        store.setOpsSnapshot(parsed.snapshot);
        break;
      }

      case 'error_notice': {
        store.recordClientError(parsed.code, parsed.message);
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
          parsed.code === 'EVENT_FULL' ||
          parsed.code === 'EVENT_NOT_ACTIVE' ||
          parsed.code === 'NOT_PARTICIPATING' ||
          parsed.code === 'INVALID_EVENT_CONFIG'
        ) {
          store.setEventFeedback({
            type: 'error',
            message: parsed.message,
            code: parsed.code,
            timestamp: now
          });
        } else if (parsed.code === 'FEEDBACK_RATE_LIMITED') {
          store.setBetaFeedbackNotice({
            type: 'error',
            message: parsed.message,
            timestamp: now
          });
        } else if (
          parsed.code === 'SEAT_OCCUPIED' ||
          parsed.code === 'ROOM_FULL' ||
          parsed.code === 'INSTANCE_UNAVAILABLE' ||
          parsed.code === 'FRIEND_JOIN_DISABLED' ||
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

  /**
   * Transitions the local player through a zone gate into the target zone's room
   * and spawns them at the paired return gate (`FR-004`, `FR-007`).
   */
  public switchZoneViaGate(gateLink: ZoneGateLink): void {
    const store = gameStore.getState();
    store.setFocusedObject(null);
    store.setTransitionTargetZone(gateLink.targetZoneId);
    store.setPendingGateArrival({
      zoneId: gateLink.targetZoneId,
      position: [...gateLink.arrivalPosition],
      yaw: gateLink.arrivalYaw
    });
    store.setCurrentZoneId(gateLink.targetZoneId);

    if (store.multiplayer.status !== 'connected') {
      this.roomId = gateLink.targetRoomId;
      store.updateMultiplayerState({ roomId: gateLink.targetRoomId });
      mutableRuntimeState.avatar.position = [...gateLink.arrivalPosition];
      mutableRuntimeState.avatar.facingYaw = gateLink.arrivalYaw;
      mutableRuntimeState.avatar.targetYaw = gateLink.arrivalYaw;
      mutableRuntimeState.avatar.velocity = [0, 0, 0];
      mutableRuntimeState.avatar.locomotionState = 'Idle';
      this.onAuthoritativePositionApplied?.(gateLink.arrivalPosition, gateLink.arrivalYaw);
      store.setPendingGateArrival(null);
      store.setTransitionTargetZone(null);
      return;
    }

    this.sendRaw({
      type: 'switch_instance',
      targetRoomId: gateLink.targetRoomId
    });
  }

  public setSocialPrivacy(allowFriendJoin: boolean): void {
    const store = gameStore.getState();
    store.setAllowFriendJoin(allowFriendJoin);
    if (store.multiplayer.status === 'connected') {
      this.sendRaw({
        type: 'set_social_privacy',
        allowFriendJoin
      });
    }
  }

  public configureInstance(params: {
    roomId: string;
    maxPlayers?: number;
    status?: ZooInstanceHealthStatus;
  }): void {
    const trimmed = params.roomId.trim();
    if (!trimmed) return;
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      const nextInstances = store.social.availableInstances.map((inst) =>
        inst.roomId === trimmed
          ? {
              ...inst,
              maxPlayers: params.maxPlayers ?? inst.maxPlayers,
              status: params.status ?? inst.status ?? 'healthy',
              isFull: inst.visitorCount >= (params.maxPlayers ?? inst.maxPlayers)
            }
          : inst
      );
      store.setAvailableInstances(nextInstances);
      return;
    }
    this.sendRaw({
      type: 'configure_instance',
      roomId: trimmed,
      ...(params.maxPlayers !== undefined ? { maxPlayers: params.maxPlayers } : {}),
      ...(params.status !== undefined ? { status: params.status } : {})
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

  /**
   * Requests an authoritative food or drink purchase (`FR-004`–`FR-006`, `SC-002`).
   * Uses `requestId` for idempotency so duplicate network packets never double-charge.
   */
  public purchaseFoodItem(
    itemId: FoodItemId,
    requestId?: string,
    stallId?: string
  ): string {
    this.purchaseReqCounter += 1;
    const reqId =
      requestId && requestId.trim().length > 0
        ? requestId.trim()
        : `buy_${itemId}_${Date.now()}_${this.purchaseReqCounter}`;

    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      store.purchaseFoodItemOffline(itemId);
      return reqId;
    }

    this.sendRaw({
      type: 'purchase_food_item',
      itemId,
      requestId: reqId,
      ...(stallId !== undefined ? { stallId } : {})
    });
    return reqId;
  }

  /**
   * Consumes an owned food or drink item from inventory (`FR-007`–`FR-011`, `SC-004`).
   */
  public consumeFoodItem(itemId: FoodItemId, now = Date.now()): void {
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      store.consumeFoodItemOffline(itemId, now);
      return;
    }

    this.sendRaw({
      type: 'consume_food_item',
      itemId
    });
  }

  /**
   * Stops active food or drink consumption animation early (`FR-011`).
   */
  public stopConsumingFood(): void {
    const store = gameStore.getState();
    store.setLocalActiveConsumption(null);
    if (store.multiplayer.status === 'connected') {
      this.sendRaw({
        type: 'stop_consuming_food'
      });
    }
  }

  /**
   * Synchronizes a Zoo Passport milestone (zone stamp, species discovery, social action, or activity)
   * with the authoritative server session (`FR-001`–`FR-007`).
   */
  public recordPassportProgress(params: {
    zoneId?: PassportZoneId;
    speciesId?: AnimalSpeciesId;
    socialAction?: boolean;
    activityCompleted?: boolean;
  }): void {
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      return;
    }
    this.sendRaw({
      type: 'record_passport_progress',
      ...(params.zoneId !== undefined ? { zoneId: params.zoneId } : {}),
      ...(params.speciesId !== undefined ? { speciesId: params.speciesId } : {}),
      ...(params.socialAction !== undefined
        ? { socialAction: params.socialAction }
        : {}),
      ...(params.activityCompleted !== undefined
        ? { activityCompleted: params.activityCompleted }
        : {})
    });
  }

  /**
   * Requests an authoritative one-time achievement reward claim (`FR-008`–`FR-010`, `SC-005`).
   * Uses `requestId` for idempotency so duplicate network packets never grant extra coins.
   */
  public claimAchievementReward(
    achievementId: AchievementId,
    requestId?: string
  ): string {
    this.purchaseReqCounter += 1;
    const reqId =
      requestId && requestId.trim().length > 0
        ? requestId.trim()
        : `claim_${achievementId}_${Date.now()}_${this.purchaseReqCounter}`;

    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      store.claimAchievementRewardOffline(achievementId);
      return reqId;
    }

    for (const zid of PASSPORT_ZONE_IDS) {
      if (store.passport.state.stamps[zid]?.obtained) {
        this.recordPassportProgress({ zoneId: zid });
      }
    }
    for (const sid of ANIMAL_SPECIES_IDS) {
      if (store.animalSim.encyclopedia.entries[sid]?.discovered) {
        this.recordPassportProgress({ speciesId: sid });
      }
    }
    if (store.passport.state.socialInteractionsCount > 0) {
      this.recordPassportProgress({ socialAction: true });
    }
    if (store.passport.state.activitiesCompletedCount > 0) {
      this.recordPassportProgress({ activityCompleted: true });
    }

    this.sendRaw({
      type: 'claim_achievement_reward',
      achievementId,
      requestId: reqId
    });
    return reqId;
  }

  /**
   * Joins an active zoo event (`FR-003`–`FR-006`, `SC-002`).
   */
  public joinZooEvent(eventId: ZooEventId): void {
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      store.joinZooEventOffline(eventId);
      return;
    }
    this.sendRaw({
      type: 'join_zoo_event',
      eventId
    });
  }

  /**
   * Leaves an active zoo event (`FR-005`, `FR-006`, `SC-002`).
   */
  public leaveZooEvent(eventId: ZooEventId): void {
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      store.leaveZooEventOffline(eventId);
      return;
    }
    this.sendRaw({
      type: 'leave_zoo_event',
      eventId
    });
  }

  /**
   * Contributes to an active zoo event's shared group progress (`FR-006`, `SC-002`).
   */
  public performEventAction(eventId: ZooEventId): void {
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      store.performEventActionOffline(eventId);
      return;
    }
    this.sendRaw({
      type: 'perform_event_action',
      eventId
    });
  }

  /**
   * Claims a one-time reward (Zoo Coins + Passport Zone Stamp) for participating in a zoo event (`FR-007`–`FR-008`, `SC-003`).
   */
  public claimEventReward(eventId: ZooEventId, requestId?: string): string {
    this.purchaseReqCounter += 1;
    const reqId =
      requestId && requestId.trim().length > 0
        ? requestId.trim()
        : `evclaim_${eventId}_${Date.now()}_${this.purchaseReqCounter}`;

    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      store.claimEventRewardOffline(eventId);
      return reqId;
    }

    this.sendRaw({
      type: 'claim_event_reward',
      eventId,
      requestId: reqId
    });
    return reqId;
  }

  /**
   * Configures seasonal themes or runtime event schedules (`FR-009`–`FR-010`, `SC-004`).
   */
  public configureZooEvents(config: ZooEventScheduleConfig): void {
    const store = gameStore.getState();
    const sanitized = sanitizeEventAdministrationConfig(config);
    if (!sanitized.valid) {
      store.setEventFeedback({
        type: 'error',
        message:
          sanitized.rejectedReasons[0] ??
          'Invalid zoo event schedule configuration.',
        code: 'INVALID_EVENT_CONFIG'
      });
      return;
    }

    if (store.multiplayer.status !== 'connected') {
      store.configureZooEventsOffline(config);
      return;
    }

    this.sendRaw({
      type: 'configure_zoo_events',
      ...(sanitized.seasonalTheme !== undefined
        ? { seasonalTheme: sanitized.seasonalTheme }
        : {}),
      ...(sanitized.eventPatches.length > 0
        ? { eventPatches: sanitized.eventPatches }
        : {})
    });
  }

  /**
   * Submits structured player Beta Feedback with diagnostic metadata (`FR-007`, `SC-004`).
   */
  public submitBetaFeedback(params: {
    category: BetaFeedbackCategory;
    severity: BetaFeedbackSeverity;
    message: string;
  }): { valid: boolean; errorMessage?: string } {
    const store = gameStore.getState();
    const validated = validateBetaFeedbackInput(params);
    if (!validated.valid || !validated.category || !validated.severity || !validated.normalizedMessage) {
      const errMsg = validated.errorMessage ?? 'Invalid feedback submission.';
      store.setBetaFeedbackNotice({
        type: 'error',
        message: errMsg
      });
      return { valid: false, errorMessage: errMsg };
    }

    const viewport =
      typeof window !== 'undefined'
        ? `${window.innerWidth}x${window.innerHeight}`
        : '1280x800';
    const userAgentSummary =
      typeof navigator !== 'undefined' && navigator.userAgent
        ? navigator.userAgent.slice(0, 80)
        : 'Browser Client';

    const diagnostics = {
      playerId: store.identity.profile.playerId,
      roomId: store.multiplayer.roomId,
      fps: store.betaReadiness.telemetry.fps,
      avgFrameTimeMs: store.betaReadiness.telemetry.avgFrameTimeMs,
      qualityPreset: store.settings.qualityTier,
      viewport,
      inputMode: store.activeDevice,
      visitorCount: store.multiplayer.visitorCount,
      userAgentSummary
    };

    if (store.multiplayer.status !== 'connected') {
      store.setBetaFeedbackNotice({
        type: 'success',
        message: 'Thank you! Beta feedback has been recorded locally with device diagnostics.'
      });
      return { valid: true };
    }

    this.sendRaw({
      type: 'submit_beta_feedback',
      category: validated.category,
      severity: validated.severity,
      message: validated.normalizedMessage,
      diagnostics
    });
    return { valid: true };
  }

  /**
   * Resolves or dismisses a player safety report (`FR-010`, `SC-005`).
   */
  public resolvePlayerReport(
    reportId: string,
    resolution: 'resolved' | 'dismissed'
  ): void {
    const trimmed = reportId.trim();
    if (!trimmed) return;
    if (gameStore.getState().multiplayer.status === 'connected') {
      this.sendRaw({
        type: 'resolve_player_report',
        reportId: trimmed,
        resolution
      });
    }
  }

  /**
   * Broadcasts or clears a non-disruptive operator maintenance notice (`FR-010`, `SC-005`).
   */
  public setMaintenanceNotice(params: {
    active: boolean;
    message?: string;
    severity?: 'info' | 'warning';
  }): void {
    const store = gameStore.getState();
    if (store.multiplayer.status !== 'connected') {
      store.setMaintenanceNotice(
        params.active
          ? {
              active: true,
              message:
                params.message?.trim() ||
                'Scheduled Public Beta update in progress — your Zoo Passport and Coins are safely auto-saved.',
              severity: params.severity ?? 'info',
              updatedAt: Date.now()
            }
          : null
      );
      return;
    }

    this.sendRaw({
      type: 'set_maintenance_notice',
      active: params.active,
      ...(params.message !== undefined ? { message: params.message } : {}),
      ...(params.severity !== undefined ? { severity: params.severity } : {})
    });
  }

  /**
   * Requests an updated `ops_snapshot` from the server authority (`FR-009`, `SC-005`).
   */
  public requestOpsSnapshot(): void {
    if (gameStore.getState().multiplayer.status === 'connected') {
      this.sendRaw({ type: 'request_ops_snapshot' });
    }
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
