import type { IncomingMessage, Server as HttpServer } from 'http';
import type { Duplex } from 'stream';
import { WebSocket, WebSocketServer } from 'ws';
import {
  DEFAULT_ROOM_ID,
  parseClientMultiplayerMessage,
  ZooInstanceAuthority,
  type ServerMultiplayerMessage,
  type ZooInstanceAuthorityOptions
} from '@online-zoo/game-core';

export interface MultiplayerWsHubHandle {
  wss: WebSocketServer;
  authority: ZooInstanceAuthority;
  close: () => void;
}

interface ClientSocketBinding {
  ws: WebSocket;
  sessionId: string | null;
  playerId: string | null;
  roomId: string;
}

/**
 * Attaches the authoritative Panda Forest multiplayer WebSocket server (`/ws/zoo`)
 * to a Node HTTP server (`FR-001`–`FR-024`).
 */
export function attachMultiplayerWebSocketServer(
  httpServer: HttpServer,
  options: ZooInstanceAuthorityOptions & { tickRateHz?: number; path?: string } = {}
): MultiplayerWsHubHandle {
  const authority = new ZooInstanceAuthority(options);
  const wsPath = options.path ?? '/ws/zoo';
  const tickIntervalMs = Math.round(1000 / (options.tickRateHz ?? 20));

  const wss = new WebSocketServer({ noServer: true });
  const bindings = new Set<ClientSocketBinding>();

  const sendJson = (ws: WebSocket, msg: ServerMultiplayerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
      } catch {
        // Ignore broken pipe errors
      }
    }
  };

  const broadcastToRoom = (
    roomId: string,
    msg: ServerMultiplayerMessage,
    excludeSessionId?: string
  ) => {
    const serialized = JSON.stringify(msg);
    for (const b of bindings) {
      if (
        b.roomId === roomId &&
        b.sessionId &&
        b.sessionId !== excludeSessionId &&
        b.ws.readyState === WebSocket.OPEN
      ) {
        try {
          b.ws.send(serialized);
        } catch {
          // Ignore send errors on closing sockets
        }
      }
    }
  };

  const deliverToSessions = (sessionIds: string[], msg: ServerMultiplayerMessage) => {
    const serialized = JSON.stringify(msg);
    const targetSet = new Set(sessionIds);
    for (const b of bindings) {
      if (b.sessionId && targetSet.has(b.sessionId) && b.ws.readyState === WebSocket.OPEN) {
        try {
          b.ws.send(serialized);
        } catch {
          // Ignore
        }
      }
    }
  };

  const deliverSocialPresenceToPlayers = (playerIds: string[], now = Date.now()) => {
    const uniqueIds = new Set(playerIds);
    for (const b of bindings) {
      if (b.playerId && uniqueIds.has(b.playerId) && b.ws.readyState === WebSocket.OPEN) {
        sendJson(b.ws, authority.buildSocialPresenceForPlayer(b.playerId, now));
      }
    }
  };

  const broadcastSocialPresenceToAll = (now = Date.now()) => {
    for (const b of bindings) {
      if (b.playerId && b.ws.readyState === WebSocket.OPEN) {
        sendJson(b.ws, authority.buildSocialPresenceForPlayer(b.playerId, now));
      }
    }
  };

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const rawUrl = req.url ?? '/';
    const pathname = rawUrl.split('?')[0];
    if (pathname !== wsPath) {
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  };

  httpServer.on('upgrade', onUpgrade);

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    let defaultRoom = DEFAULT_ROOM_ID;
    try {
      const urlObj = new URL(req.url ?? '', 'http://localhost:3000');
      const roomParam = urlObj.searchParams.get('room');
      if (roomParam && /^[a-zA-Z0-9_-]{1,48}$/.test(roomParam)) {
        defaultRoom = roomParam;
      }
    } catch {
      // Fallback to DEFAULT_ROOM_ID
    }

    const binding: ClientSocketBinding = {
      ws,
      sessionId: null,
      playerId: null,
      roomId: defaultRoom
    };
    bindings.add(binding);

    ws.on('message', (data) => {
      const raw = typeof data === 'string' ? data : data.toString('utf8');
      const msg = parseClientMultiplayerMessage(raw);
      if (!msg) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INVALID_PAYLOAD',
          message: 'Rejected malformed or invalid client message.'
        });
        return;
      }

      if (binding.sessionId && msg.type !== 'join_instance' && msg.type !== 'leave_instance') {
        const ensured = authority.ensureSessionActive(binding.sessionId);
        if (ensured.reactivatedBroadcast) {
          broadcastToRoom(
            ensured.reactivatedBroadcast.roomId,
            ensured.reactivatedBroadcast,
            binding.sessionId
          );
          broadcastSocialPresenceToAll();
        }
      }

      switch (msg.type) {
        case 'join_instance': {
          const { welcome, joinedBroadcast, purgedDuplicates } = authority.joinOrResumePlayer({
            requestedRoomId: msg.roomId ?? binding.roomId,
            ...(msg.resumeToken !== undefined ? { resumeToken: msg.resumeToken } : {}),
            ...(msg.playerId !== undefined ? { playerId: msg.playerId } : {}),
            ...(msg.displayName !== undefined ? { displayName: msg.displayName } : {}),
            ...(msg.avatar !== undefined ? { avatar: msg.avatar } : {}),
            ...(msg.friendPlayerIds !== undefined ? { friendPlayerIds: msg.friendPlayerIds } : {}),
            ...(msg.blockedPlayerIds !== undefined
              ? { blockedPlayerIds: msg.blockedPlayerIds }
              : {}),
            ...(msg.preferFriendPlacement !== undefined
              ? { preferFriendPlacement: msg.preferFriendPlacement }
              : {}),
            ...(msg.allowFriendJoin !== undefined ? { allowFriendJoin: msg.allowFriendJoin } : {}),
            ...(msg.diningWallet !== undefined ? { diningWallet: msg.diningWallet } : {}),
            ...(msg.passportState !== undefined ? { passportState: msg.passportState } : {})
          });
          if (purgedDuplicates) {
            for (const dup of purgedDuplicates) {
              broadcastToRoom(dup.roomId, dup, dup.sessionId);
            }
          }
          binding.sessionId = welcome.sessionId;
          binding.playerId = welcome.playerId ?? null;
          binding.roomId = welcome.roomId;
          sendJson(ws, welcome);
          broadcastToRoom(welcome.roomId, joinedBroadcast, welcome.sessionId);
          broadcastSocialPresenceToAll();
          break;
        }

        case 'update_identity': {
          if (!binding.sessionId) return;
          const updated = authority.updatePlayerIdentity(binding.sessionId, msg);
          if (updated.accepted && updated.broadcast) {
            binding.playerId = updated.broadcast.playerId;
            broadcastToRoom(updated.broadcast.roomId, updated.broadcast);
            broadcastSocialPresenceToAll();
          } else {
            sendJson(ws, {
              type: 'error_notice',
              code: updated.errorCode ?? 'INVALID_IDENTITY_UPDATE',
              message: updated.errorMessage ?? 'Rejected invalid identity or avatar update.'
            });
          }
          break;
        }

        case 'player_move': {
          if (!binding.sessionId) return;
          const res = authority.processPlayerMove(binding.sessionId, msg);
          if (res.emoteCancelledBroadcast) {
            broadcastToRoom(res.emoteCancelledBroadcast.roomId, res.emoteCancelledBroadcast);
          }
          if (res.seatReleasedBroadcast) {
            broadcastToRoom(res.seatReleasedBroadcast.roomId, res.seatReleasedBroadcast);
          }
          if (!res.accepted && res.errorCode) {
            sendJson(ws, {
              type: 'error_notice',
              code: res.errorCode,
              message: `Movement update rejected: ${res.errorCode}`
            });
          }
          break;
        }

        case 'interact_prop': {
          if (!binding.sessionId) return;
          const res = authority.processPropInteraction(binding.sessionId, msg);
          if (res.seatUpdate) {
            broadcastToRoom(res.seatUpdate.roomId, res.seatUpdate);
          }
          if (res.propUpdate) {
            broadcastToRoom(res.propUpdate.roomId, res.propUpdate);
          }
          if (res.errorCode) {
            sendJson(ws, {
              type: 'error_notice',
              code: res.errorCode,
              message: res.errorMessage ?? `Interaction rejected: ${res.errorCode}`
            });
          }
          break;
        }

        case 'send_chat_message': {
          if (!binding.sessionId) return;
          const chatRes = authority.processChatMessage(binding.sessionId, msg);
          if (chatRes.accepted && chatRes.broadcast) {
            deliverToSessions(chatRes.recipientSessionIds, chatRes.broadcast);
          } else {
            sendJson(ws, {
              type: 'error_notice',
              code: chatRes.errorCode ?? 'INVALID_PAYLOAD',
              message: chatRes.errorMessage ?? 'Chat message rejected.'
            });
          }
          break;
        }

        case 'trigger_emote': {
          if (!binding.sessionId) return;
          const emoteRes = authority.processTriggerEmote(binding.sessionId, msg);
          if (emoteRes.accepted && emoteRes.broadcast) {
            deliverToSessions(emoteRes.recipientSessionIds, emoteRes.broadcast);
          }
          break;
        }

        case 'interact_seat': {
          if (!binding.sessionId) return;
          const seatRes = authority.processSeatInteraction(binding.sessionId, msg);
          if (seatRes.accepted) {
            if (seatRes.previousSeatUpdate) {
              broadcastToRoom(seatRes.previousSeatUpdate.roomId, seatRes.previousSeatUpdate);
            }
            if (seatRes.seatUpdate) {
              broadcastToRoom(seatRes.seatUpdate.roomId, seatRes.seatUpdate);
            }
          } else if (seatRes.errorCode) {
            sendJson(ws, {
              type: 'error_notice',
              code: seatRes.errorCode,
              message: seatRes.errorMessage ?? 'Seat is currently occupied.'
            });
          }
          break;
        }

        case 'send_friend_request': {
          if (!binding.sessionId) return;
          const freqRes = authority.sendFriendRequest(binding.sessionId, msg);
          if (freqRes.accepted) {
            deliverSocialPresenceToPlayers(freqRes.affectedPlayerIds);
          } else {
            sendJson(ws, {
              type: 'error_notice',
              code: freqRes.errorCode ?? 'FRIEND_REQUEST_INVALID',
              message: freqRes.errorMessage ?? 'Could not send friend request.'
            });
          }
          break;
        }

        case 'respond_friend_request': {
          if (!binding.sessionId) return;
          const respRes = authority.respondFriendRequest(binding.sessionId, msg);
          if (respRes.accepted) {
            deliverSocialPresenceToPlayers(respRes.affectedPlayerIds);
          } else {
            sendJson(ws, {
              type: 'error_notice',
              code: respRes.errorCode ?? 'FRIEND_REQUEST_INVALID',
              message: respRes.errorMessage ?? 'Could not respond to friend request.'
            });
          }
          break;
        }

        case 'remove_friend': {
          if (!binding.sessionId) return;
          const remRes = authority.removeFriend(binding.sessionId, msg);
          if (remRes.accepted) {
            deliverSocialPresenceToPlayers(remRes.affectedPlayerIds);
          }
          break;
        }

        case 'join_friend_instance': {
          if (!binding.sessionId) return;
          const joinRes = authority.joinFriendInstance(binding.sessionId, msg);
          if (!joinRes.accepted) {
            sendJson(ws, {
              type: 'error_notice',
              code: joinRes.errorCode ?? 'ROOM_FULL',
              message: joinRes.errorMessage ?? "Could not join friend's instance."
            });
            return;
          }
          if (joinRes.alreadyInRoom) {
            broadcastSocialPresenceToAll();
            return;
          }
          if (joinRes.seatReleasedOldRoom && joinRes.oldRoomId) {
            broadcastToRoom(joinRes.oldRoomId, joinRes.seatReleasedOldRoom);
          }
          if (joinRes.leftOldRoomBroadcast && joinRes.oldRoomId) {
            broadcastToRoom(joinRes.oldRoomId, joinRes.leftOldRoomBroadcast, binding.sessionId);
          }
          if (joinRes.newRoomId && joinRes.welcome && joinRes.joinedNewRoomBroadcast) {
            binding.roomId = joinRes.newRoomId;
            sendJson(ws, joinRes.welcome);
            broadcastToRoom(joinRes.newRoomId, joinRes.joinedNewRoomBroadcast, binding.sessionId);
          }
          broadcastSocialPresenceToAll();
          break;
        }

        case 'switch_instance': {
          if (!binding.sessionId) return;
          const switchRes = authority.switchPlayerInstance(binding.sessionId, msg);
          if (!switchRes.accepted) {
            sendJson(ws, {
              type: 'error_notice',
              code: switchRes.errorCode ?? 'ROOM_FULL',
              message: switchRes.errorMessage ?? 'Could not switch to the selected instance.'
            });
            return;
          }
          if (switchRes.alreadyInRoom) {
            broadcastSocialPresenceToAll();
            return;
          }
          if (switchRes.seatReleasedOldRoom && switchRes.oldRoomId) {
            broadcastToRoom(switchRes.oldRoomId, switchRes.seatReleasedOldRoom);
          }
          if (switchRes.leftOldRoomBroadcast && switchRes.oldRoomId) {
            broadcastToRoom(switchRes.oldRoomId, switchRes.leftOldRoomBroadcast, binding.sessionId);
          }
          if (switchRes.newRoomId && switchRes.welcome && switchRes.joinedNewRoomBroadcast) {
            binding.roomId = switchRes.newRoomId;
            sendJson(ws, switchRes.welcome);
            broadcastToRoom(
              switchRes.newRoomId,
              switchRes.joinedNewRoomBroadcast,
              binding.sessionId
            );
          }
          broadcastSocialPresenceToAll();
          break;
        }

        case 'set_player_block': {
          if (!binding.sessionId) return;
          const blkRes = authority.setPlayerBlock(binding.sessionId, msg);
          if (blkRes.accepted) {
            deliverSocialPresenceToPlayers(blkRes.affectedPlayerIds);
          }
          break;
        }

        case 'set_social_privacy': {
          if (!binding.sessionId) return;
          const privRes = authority.setSocialPrivacy(binding.sessionId, msg);
          if (privRes.accepted) {
            deliverSocialPresenceToPlayers(privRes.affectedPlayerIds);
          }
          break;
        }

        case 'configure_instance': {
          if (!binding.sessionId) return;
          const cfgRes = authority.configureInstance(binding.sessionId, msg);
          if (!cfgRes.accepted) {
            sendJson(ws, {
              type: 'error_notice',
              code: cfgRes.errorCode ?? 'INVALID_PAYLOAD',
              message: cfgRes.errorMessage ?? 'Invalid instance configuration.'
            });
            return;
          }
          if (cfgRes.migratedSessions) {
            for (const mig of cfgRes.migratedSessions) {
              for (const b of bindings) {
                if (b.sessionId === mig.sessionId) {
                  b.roomId = mig.newRoomId;
                  sendJson(b.ws, mig.welcome);
                }
              }
              broadcastToRoom(mig.oldRoomId, mig.leftOldRoomBroadcast, mig.sessionId);
              broadcastToRoom(mig.newRoomId, mig.joinedNewRoomBroadcast, mig.sessionId);
            }
          }
          if (cfgRes.directoryUpdate) {
            for (const b of bindings) {
              if (b.sessionId && b.ws.readyState === WebSocket.OPEN) {
                sendJson(b.ws, cfgRes.directoryUpdate);
              }
            }
          }
          broadcastSocialPresenceToAll();
          break;
        }

        case 'submit_player_report': {
          if (!binding.sessionId) return;
          const repRes = authority.submitPlayerReport(binding.sessionId, msg);
          if (repRes.accepted && repRes.ack) {
            sendJson(ws, repRes.ack);
          } else {
            sendJson(ws, {
              type: 'error_notice',
              code: repRes.errorCode ?? 'INVALID_PAYLOAD',
              message: repRes.errorMessage ?? 'Could not submit player report.'
            });
          }
          break;
        }

        case 'trigger_animal_feeding': {
          if (!binding.sessionId) return;
          const feedRes = authority.triggerAnimalFeeding(binding.sessionId, msg);
          if (feedRes.accepted && feedRes.broadcast) {
            broadcastToRoom(feedRes.broadcast.roomId, feedRes.broadcast);
          } else {
            sendJson(ws, {
              type: 'error_notice',
              code: feedRes.errorCode ?? 'ANIMAL_FEEDING_COOLDOWN',
              message: feedRes.errorMessage ?? 'Habitat feeding is currently on cooldown.'
            });
          }
          break;
        }

        case 'purchase_food_item': {
          if (!binding.sessionId) return;
          const purchaseRes = authority.purchaseFoodItem(binding.sessionId, msg);
          sendJson(ws, purchaseRes);
          break;
        }

        case 'consume_food_item': {
          if (!binding.sessionId) return;
          const consumeRes = authority.consumeFoodItem(binding.sessionId, msg);
          sendJson(ws, consumeRes.result);
          if (consumeRes.broadcast) {
            broadcastToRoom(consumeRes.broadcast.roomId, consumeRes.broadcast);
          }
          break;
        }

        case 'stop_consuming_food': {
          if (!binding.sessionId) return;
          const stopRes = authority.stopConsumingFood(binding.sessionId);
          if (stopRes.broadcast) {
            broadcastToRoom(stopRes.broadcast.roomId, stopRes.broadcast);
          }
          break;
        }

        case 'record_passport_progress': {
          if (!binding.sessionId) return;
          authority.recordPassportProgress(binding.sessionId, msg);
          break;
        }

        case 'claim_achievement_reward': {
          if (!binding.sessionId) return;
          const claimRes = authority.claimAchievementReward(binding.sessionId, msg);
          sendJson(ws, claimRes);
          break;
        }

        case 'join_zoo_event': {
          if (!binding.sessionId) return;
          const evRes = authority.joinZooEvent(binding.sessionId, msg);
          if (evRes.accepted && evRes.broadcast) {
            broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
          } else {
            sendJson(ws, {
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
          if (!binding.sessionId) return;
          const evRes = authority.leaveZooEvent(binding.sessionId, msg);
          if (evRes.accepted && evRes.broadcast) {
            broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
          } else {
            sendJson(ws, {
              type: 'error_notice',
              code: 'NOT_PARTICIPATING',
              message: evRes.errorMessage ?? 'Not participating in event.'
            });
          }
          break;
        }

        case 'perform_event_action': {
          if (!binding.sessionId) return;
          const evRes = authority.performEventAction(binding.sessionId, msg);
          if (evRes.accepted && evRes.broadcast) {
            broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
          } else {
            sendJson(ws, {
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
          if (!binding.sessionId) return;
          const evRes = authority.claimEventReward(binding.sessionId, msg);
          sendJson(ws, evRes.result);
          if (evRes.broadcast) {
            broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
          }
          break;
        }

        case 'configure_zoo_events': {
          if (!binding.sessionId) return;
          const evRes = authority.configureZooEvents(binding.sessionId, msg);
          if (evRes.accepted && evRes.broadcast) {
            broadcastToRoom(evRes.broadcast.roomId, evRes.broadcast);
          } else {
            sendJson(ws, {
              type: 'error_notice',
              code: 'INVALID_EVENT_CONFIG',
              message: evRes.errorMessage ?? 'Invalid event schedule configuration.'
            });
          }
          break;
        }

        case 'ping': {
          if (binding.sessionId) {
            authority.recordHeartbeat(binding.sessionId);
          }
          sendJson(ws, {
            type: 'pong',
            clientTimestamp: msg.clientTimestamp,
            serverTimestamp: Date.now()
          });
          break;
        }

        case 'leave_instance': {
          if (!binding.sessionId) return;
          const sid = binding.sessionId;
          binding.sessionId = null;
          const { left, seatUpdate, eventsUpdate } = authority.disconnectPlayer(sid, true);
          if (seatUpdate) {
            broadcastToRoom(seatUpdate.roomId, seatUpdate);
          }
          if (eventsUpdate) {
            broadcastToRoom(eventsUpdate.roomId, eventsUpdate);
          }
          if (left) {
            broadcastToRoom(left.roomId, left, sid);
          }
          broadcastSocialPresenceToAll();
          break;
        }
      }
    });

    ws.on('close', () => {
      bindings.delete(binding);
      if (binding.sessionId) {
        const sid = binding.sessionId;
        binding.sessionId = null;
        const { left, seatUpdate, eventsUpdate } = authority.disconnectPlayer(sid, false);
        if (seatUpdate) {
          broadcastToRoom(seatUpdate.roomId, seatUpdate);
        }
        if (eventsUpdate) {
          broadcastToRoom(eventsUpdate.roomId, eventsUpdate);
        }
        if (left) {
          broadcastToRoom(left.roomId, left, sid);
        }
        broadcastSocialPresenceToAll();
      }
    });

    ws.on('error', () => {
      // Handled by 'close'
    });
  });

  // 20 Hz room tick & stale heartbeat cleanup loop
  const tickInterval = setInterval(() => {
    const now = Date.now();
    const pruned = authority.pruneStaleSessions(now);
    for (const item of pruned) {
      if (item.seatUpdate) {
        broadcastToRoom(item.seatUpdate.roomId, item.seatUpdate);
      }
      if (item.eventsUpdate) {
        broadcastToRoom(item.eventsUpdate.roomId, item.eventsUpdate);
      }
      broadcastToRoom(item.left.roomId, item.left, item.left.sessionId);
    }
    if (pruned.length > 0) {
      broadcastSocialPresenceToAll(now);
    }

    for (const roomId of authority.getAllRoomIds()) {
      const tick = authority.buildRoomTickSnapshot(roomId, now);
      if (tick && tick.players.length > 0) {
        broadcastToRoom(roomId, tick);
      }
    }
  }, tickIntervalMs);

  return {
    wss,
    authority,
    close: () => {
      clearInterval(tickInterval);
      httpServer.off('upgrade', onUpgrade);
      for (const b of bindings) {
        try {
          b.ws.close();
        } catch {
          // Ignore
        }
      }
      bindings.clear();
      wss.close();
    }
  };
}
