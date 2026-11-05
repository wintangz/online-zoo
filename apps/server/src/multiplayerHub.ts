import type { IncomingMessage, Server as HttpServer } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import {
  DEFAULT_ROOM_ID,
  DEFAULT_WS_PATH,
  parseClientMultiplayerMessage,
  type MultiplayerTransportAdapter,
  type ServerMultiplayerMessage
} from '@online-zoo/game-core';
import {
  ZooInstanceAuthority,
  type ZooInstanceAuthorityOptions
} from './zooInstanceAuthority';

interface HubConnectionEntry {
  sessionId: string | null;
  playerId: string | null;
  roomId: string;
  deliverToClient: (msg: ServerMultiplayerMessage) => void;
  forceCloseClient: (reason: string) => void;
}

/**
 * Single authoritative multiplayer hub in `@online-zoo/server`.
 * Supports both real `ws` WebSocket connections and in-memory transport factories for deterministic testing.
 */
export class MultiplayerServerHub {
  public readonly authority: ZooInstanceAuthority;
  private readonly connections = new Map<string, HubConnectionEntry>();
  private nextConnId = 1;
  private tickIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(authority = new ZooInstanceAuthority()) {
    this.authority = authority;
  }

  public startTickLoop(tickRateHz = 20): void {
    this.stopTickLoop();
    const tickIntervalMs = Math.round(1000 / tickRateHz);
    this.tickIntervalId = setInterval(() => {
      this.stepServerTick(Date.now());
    }, tickIntervalMs);
  }

  public stopTickLoop(): void {
    if (this.tickIntervalId) {
      clearInterval(this.tickIntervalId);
      this.tickIntervalId = null;
    }
  }

  public closeAllConnections(reason = 'Server shutting down'): void {
    for (const conn of Array.from(this.connections.values())) {
      conn.forceCloseClient(reason);
    }
    this.connections.clear();
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
          this.handleConnectionDisconnected(connId, false);
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

  public attachWebSocket(ws: WebSocket, req?: IncomingMessage): void {
    const connId = `ws_${this.nextConnId++}`;
    let defaultRoom = DEFAULT_ROOM_ID;
    if (req?.url) {
      try {
        const urlObj = new URL(req.url, 'http://localhost:4000');
        const roomParam = urlObj.searchParams.get('room');
        if (roomParam && /^[a-zA-Z0-9_-]{1,48}$/.test(roomParam)) {
          defaultRoom = roomParam;
        }
      } catch {
        // Fallback to DEFAULT_ROOM_ID
      }
    }

    this.connections.set(connId, {
      sessionId: null,
      playerId: null,
      roomId: defaultRoom,
      deliverToClient: (msg) => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(msg));
          } catch {
            // Ignore broken pipe errors
          }
        }
      },
      forceCloseClient: () => {
        this.connections.delete(connId);
        try {
          ws.close();
        } catch {
          // Ignore
        }
      }
    });

    ws.on('message', (data) => {
      const raw = typeof data === 'string' ? data : data.toString('utf8');
      this.handleClientPayload(connId, raw);
    });

    ws.on('close', () => {
      this.handleConnectionDisconnected(connId, false);
    });

    ws.on('error', () => {
      // Handled by 'close'
    });
  }

  private handleConnectionDisconnected(connId: string, intentional: boolean): void {
    const entry = this.connections.get(connId);
    this.connections.delete(connId);
    if (entry?.sessionId) {
      const sid = entry.sessionId;
      entry.sessionId = null;
      const { left, seatUpdate, eventsUpdate } = this.authority.disconnectPlayer(
        sid,
        intentional
      );
      if (seatUpdate) {
        this.broadcastToRoom(seatUpdate.roomId, seatUpdate);
      }
      if (eventsUpdate) {
        this.broadcastToRoom(eventsUpdate.roomId, eventsUpdate);
      }
      if (left) {
        this.broadcastToRoom(left.roomId, left, sid);
      }
      this.broadcastSocialPresenceToAll();
    }
  }

  public handleClientPayload(connId: string, raw: string): void {
    const conn = this.connections.get(connId);
    if (!conn) return;

    const msg = parseClientMultiplayerMessage(raw);
    if (!msg) {
      conn.deliverToClient({
        type: 'error_notice',
        code: 'INVALID_PAYLOAD',
        message: 'Rejected malformed or invalid client message.'
      });
      return;
    }

    if (conn.sessionId && msg.type !== 'join_instance' && msg.type !== 'leave_instance') {
      const ensured = this.authority.ensureSessionActive(conn.sessionId);
      if (ensured.reactivatedBroadcast) {
        this.broadcastToRoom(
          ensured.reactivatedBroadcast.roomId,
          ensured.reactivatedBroadcast,
          conn.sessionId
        );
        this.broadcastSocialPresenceToAll();
      }
    }

    switch (msg.type) {
      case 'join_instance': {
        const { welcome, joinedBroadcast, purgedDuplicates } = this.authority.joinOrResumePlayer({
          requestedRoomId: msg.roomId ?? conn.roomId ?? DEFAULT_ROOM_ID,
          ...(msg.resumeToken !== undefined ? { resumeToken: msg.resumeToken } : {}),
          ...(msg.playerId !== undefined ? { playerId: msg.playerId } : {}),
          ...(msg.displayName !== undefined ? { displayName: msg.displayName } : {}),
          ...(msg.avatar !== undefined ? { avatar: msg.avatar } : {}),
          ...(msg.friendPlayerIds !== undefined ? { friendPlayerIds: msg.friendPlayerIds } : {}),
          ...(msg.blockedPlayerIds !== undefined ? { blockedPlayerIds: msg.blockedPlayerIds } : {}),
          ...(msg.preferFriendPlacement !== undefined
            ? { preferFriendPlacement: msg.preferFriendPlacement }
            : {}),
          ...(msg.allowFriendJoin !== undefined ? { allowFriendJoin: msg.allowFriendJoin } : {}),
          ...(msg.diningWallet !== undefined ? { diningWallet: msg.diningWallet } : {}),
          ...(msg.passportState !== undefined ? { passportState: msg.passportState } : {})
        });
        if (purgedDuplicates) {
          for (const dup of purgedDuplicates) {
            this.broadcastToRoom(dup.roomId, dup, dup.sessionId);
          }
        }
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
            message: updated.errorMessage ?? 'Rejected invalid identity or avatar update.'
          });
        }
        break;
      }

      case 'player_move': {
        if (!conn.sessionId) return;
        const res = this.authority.processPlayerMove(conn.sessionId, msg);
        if (res.emoteCancelledBroadcast) {
          this.broadcastToRoom(
            res.emoteCancelledBroadcast.roomId,
            res.emoteCancelledBroadcast
          );
        }
        if (res.seatReleasedBroadcast) {
          this.broadcastToRoom(res.seatReleasedBroadcast.roomId, res.seatReleasedBroadcast);
        }
        if (!res.accepted && res.errorCode) {
          conn.deliverToClient({
            type: 'error_notice',
            code: res.errorCode,
            message: `Movement update rejected: ${res.errorCode}`
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

      case 'set_social_privacy': {
        if (!conn.sessionId) return;
        const privRes = this.authority.setSocialPrivacy(conn.sessionId, msg);
        if (privRes.accepted) {
          this.deliverSocialPresenceToPlayers(privRes.affectedPlayerIds);
        }
        break;
      }

      case 'configure_instance': {
        if (!conn.sessionId) return;
        const cfgRes = this.authority.configureInstance(conn.sessionId, msg);
        if (!cfgRes.accepted) {
          conn.deliverToClient({
            type: 'error_notice',
            code: cfgRes.errorCode ?? 'INVALID_PAYLOAD',
            message: cfgRes.errorMessage ?? 'Invalid instance configuration.'
          });
          return;
        }
        if (cfgRes.migratedSessions) {
          for (const mig of cfgRes.migratedSessions) {
            for (const targetConn of this.connections.values()) {
              if (targetConn.sessionId === mig.sessionId) {
                targetConn.roomId = mig.newRoomId;
                targetConn.deliverToClient(mig.welcome);
              }
            }
            this.broadcastToRoom(mig.oldRoomId, mig.leftOldRoomBroadcast, mig.sessionId);
            this.broadcastToRoom(mig.newRoomId, mig.joinedNewRoomBroadcast, mig.sessionId);
          }
        }
        if (cfgRes.directoryUpdate) {
          this.broadcastOpsToAll(cfgRes.directoryUpdate);
        }
        this.broadcastSocialPresenceToAll();
        break;
      }

      case 'submit_player_report': {
        if (!conn.sessionId) return;
        const repRes = this.authority.submitPlayerReport(conn.sessionId, msg);
        if (repRes.accepted && repRes.ack) {
          conn.deliverToClient(repRes.ack);
          this.broadcastOpsToAll(this.authority.buildOpsSnapshotMessage());
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: repRes.errorCode ?? 'INVALID_PAYLOAD',
            message: repRes.errorMessage ?? 'Could not submit player report.'
          });
        }
        break;
      }

      case 'submit_beta_feedback': {
        if (!conn.sessionId) return;
        const fbRes = this.authority.submitBetaFeedback(conn.sessionId, msg);
        if (fbRes.accepted && fbRes.ack) {
          conn.deliverToClient(fbRes.ack);
          if (fbRes.opsUpdate) {
            this.broadcastOpsToAll(fbRes.opsUpdate);
          }
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: fbRes.errorCode ?? 'INVALID_PAYLOAD',
            message: fbRes.errorMessage ?? 'Could not submit beta feedback.'
          });
        }
        break;
      }

      case 'resolve_player_report': {
        if (!conn.sessionId) return;
        const resRep = this.authority.resolvePlayerReport(conn.sessionId, msg);
        if (resRep.accepted && resRep.opsUpdate) {
          this.broadcastOpsToAll(resRep.opsUpdate);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: resRep.errorCode ?? 'INVALID_PAYLOAD',
            message: resRep.errorMessage ?? 'Could not update player report.'
          });
        }
        break;
      }

      case 'set_maintenance_notice': {
        if (!conn.sessionId) return;
        const maintRes = this.authority.setMaintenanceNotice(conn.sessionId, msg);
        if (maintRes.accepted && maintRes.opsUpdate) {
          this.broadcastOpsToAll(maintRes.opsUpdate);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: 'INVALID_PAYLOAD',
            message: 'Could not update maintenance notice.'
          });
        }
        break;
      }

      case 'request_ops_snapshot': {
        if (!conn.sessionId) return;
        conn.deliverToClient(this.authority.buildOpsSnapshotMessage());
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

      case 'purchase_food_item': {
        if (!conn.sessionId) return;
        const purchaseRes = this.authority.purchaseFoodItem(conn.sessionId, msg);
        conn.deliverToClient(purchaseRes);
        break;
      }

      case 'consume_food_item': {
        if (!conn.sessionId) return;
        const consumeRes = this.authority.consumeFoodItem(conn.sessionId, msg);
        conn.deliverToClient(consumeRes.result);
        if (consumeRes.broadcast) {
          this.broadcastToRoom(consumeRes.broadcast.roomId, consumeRes.broadcast);
        }
        break;
      }

      case 'stop_consuming_food': {
        if (!conn.sessionId) return;
        const stopRes = this.authority.stopConsumingFood(conn.sessionId);
        if (stopRes.broadcast) {
          this.broadcastToRoom(stopRes.broadcast.roomId, stopRes.broadcast);
        }
        break;
      }

      case 'record_passport_progress': {
        if (!conn.sessionId) return;
        this.authority.recordPassportProgress(conn.sessionId, msg);
        break;
      }

      case 'claim_achievement_reward': {
        if (!conn.sessionId) return;
        const claimRes = this.authority.claimAchievementReward(conn.sessionId, msg);
        conn.deliverToClient(claimRes);
        break;
      }

      case 'join_zoo_event': {
        if (!conn.sessionId) return;
        const evRes = this.authority.joinZooEvent(conn.sessionId, msg);
        if (evRes.accepted && evRes.broadcast) {
          this.broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code:
              evRes.errorCode === 'EVENT_FULL'
                ? 'EVENT_FULL'
                : 'EVENT_NOT_ACTIVE',
            message: evRes.errorMessage ?? 'Unable to join event.'
          });
        }
        break;
      }

      case 'leave_zoo_event': {
        if (!conn.sessionId) return;
        const evRes = this.authority.leaveZooEvent(conn.sessionId, msg);
        if (evRes.accepted && evRes.broadcast) {
          this.broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: 'NOT_PARTICIPATING',
            message: evRes.errorMessage ?? 'Not participating in event.'
          });
        }
        break;
      }

      case 'perform_event_action': {
        if (!conn.sessionId) return;
        const evRes = this.authority.performEventAction(conn.sessionId, msg);
        if (evRes.accepted && evRes.broadcast) {
          this.broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code:
              evRes.errorCode === 'NOT_PARTICIPATING'
                ? 'NOT_PARTICIPATING'
                : 'EVENT_NOT_ACTIVE',
            message: evRes.errorMessage ?? 'Unable to perform event action.'
          });
        }
        break;
      }

      case 'claim_event_reward': {
        if (!conn.sessionId) return;
        const evRes = this.authority.claimEventReward(conn.sessionId, msg);
        conn.deliverToClient(evRes.result);
        if (evRes.broadcast) {
          this.broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
        }
        break;
      }

      case 'configure_zoo_events': {
        if (!conn.sessionId) return;
        const evRes = this.authority.configureZooEvents(conn.sessionId, msg);
        if (evRes.accepted && evRes.broadcast) {
          this.broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
        } else {
          conn.deliverToClient({
            type: 'error_notice',
            code: 'INVALID_EVENT_CONFIG',
            message: evRes.errorMessage ?? 'Invalid event schedule configuration.'
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
        const { left, seatUpdate, eventsUpdate } = this.authority.disconnectPlayer(sid, true);
        if (seatUpdate) {
          this.broadcastToRoom(seatUpdate.roomId, seatUpdate);
        }
        if (eventsUpdate) {
          this.broadcastToRoom(eventsUpdate.roomId, eventsUpdate);
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
      if (item.eventsUpdate) {
        this.broadcastToRoom(item.eventsUpdate.roomId, item.eventsUpdate);
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

  private broadcastOpsToAll(msg: ServerMultiplayerMessage): void {
    for (const conn of this.connections.values()) {
      if (conn.sessionId) {
        conn.deliverToClient(msg);
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

export { MultiplayerServerHub as InMemoryMultiplayerHub };

export interface AttachMultiplayerServerOptions extends ZooInstanceAuthorityOptions {
  path?: string;
  tickRateHz?: number;
  authority?: ZooInstanceAuthority;
  hub?: MultiplayerServerHub;
  isOriginAllowed?: (origin: string | undefined) => boolean;
}

export interface MultiplayerWsHubHandle {
  wss: WebSocketServer;
  authority: ZooInstanceAuthority;
  hub: MultiplayerServerHub;
  close: () => void;
}

export function attachMultiplayerWebSocketServer(
  httpServer: HttpServer,
  options: AttachMultiplayerServerOptions = {}
): MultiplayerWsHubHandle {
  const wsPath = options.path ?? DEFAULT_WS_PATH;
  const authority = options.authority ?? new ZooInstanceAuthority(options);
  const hub = options.hub ?? new MultiplayerServerHub(authority);
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    hub.attachWebSocket(ws, req);
  });

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const rawUrl = req.url ?? '/';
    const pathname = rawUrl.split('?')[0];
    if (pathname !== wsPath) {
      return;
    }

    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined;
    if (options.isOriginAllowed && !options.isOriginAllowed(origin)) {
      socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  };

  httpServer.on('upgrade', onUpgrade);
  hub.startTickLoop(options.tickRateHz ?? 20);

  return {
    wss,
    authority,
    hub,
    close: () => {
      hub.stopTickLoop();
      httpServer.off('upgrade', onUpgrade);
      hub.closeAllConnections();
      wss.close();
    }
  };
}
