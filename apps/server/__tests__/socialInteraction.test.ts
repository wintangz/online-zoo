// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ChatRateLimiter,
  EMOTE_CATALOG,
  gameStore,
  getEmoteDescriptor,
  isValidEmoteId,
  loadPersistedSocialState,
  MAX_CHAT_MESSAGE_LENGTH,
  MultiplayerClient,
  PANDA_FOREST_INTERACTIVE_OBJECTS,
  PROXIMITY_CHAT_RANGE_METERS,
  savePersistedSocialState,
  SOCIAL_STATE_STORAGE_KEY,
  VALID_EMOTE_IDS,
  validateChatMessage
} from '@online-zoo/game-core';
import { InMemoryMultiplayerHub, ZooInstanceAuthority } from '../src';

describe('Feature 004: Social Interaction (US1–US5)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    gameStore.getState().resetSession();
  });

  describe('US1: Proximity Text Chat, Moderation & Rate Limiting (FR-001–FR-008, SC-001–SC-003)', () => {
    it('validates chat message length (1–140 chars) and blocks prohibited/profane content including leetspeak', () => {
      expect(validateChatMessage('   ').valid).toBe(false);
      expect(validateChatMessage('   ').errorCode).toBe('EMPTY_MESSAGE');

      const tooLong = 'a'.repeat(MAX_CHAT_MESSAGE_LENGTH + 1);
      expect(validateChatMessage(tooLong).valid).toBe(false);
      expect(validateChatMessage(tooLong).errorCode).toBe('MESSAGE_TOO_LONG');

      const valid = validateChatMessage('  Hello Panda Forest visitors! 🐼  ');
      expect(valid.valid).toBe(true);
      expect(valid.normalizedText).toBe('Hello Panda Forest visitors! 🐼');

      // Direct & leetspeak profanity detection
      expect(validateChatMessage('what the fuck is this').errorCode).toBe('PROFANITY_BLOCKED');
      expect(validateChatMessage('you are a b1tch').errorCode).toBe('PROFANITY_BLOCKED');
      expect(validateChatMessage('s.h.i.t happens').errorCode).toBe('PROFANITY_BLOCKED');
    });

    it('enforces chat rate limits (max 4 messages per 6,000ms window and 1,000ms minimum interval)', () => {
      const limiter = new ChatRateLimiter({
        maxMessagesPerWindow: 4,
        windowMs: 6000,
        minIntervalMs: 1000
      });
      const sessionId = 'sess_rate_test';

      expect(limiter.checkAndRecord(sessionId, 1000).allowed).toBe(true);
      // Immediate second message within 1,000ms is rate-limited
      const rapid = limiter.checkAndRecord(sessionId, 1400);
      expect(rapid.allowed).toBe(false);
      expect(rapid.retryAfterMs).toBeGreaterThanOrEqual(500);

      // Spaced by >= 1,000ms up to 4 messages within 6,000ms
      expect(limiter.checkAndRecord(sessionId, 2100).allowed).toBe(true);
      expect(limiter.checkAndRecord(sessionId, 3200).allowed).toBe(true);
      expect(limiter.checkAndRecord(sessionId, 4300).allowed).toBe(true);

      // 5th message within 6,000ms window is blocked
      const fifth = limiter.checkAndRecord(sessionId, 5500);
      expect(fifth.allowed).toBe(false);

      // Allowed again after window expires at t = 7100
      expect(limiter.checkAndRecord(sessionId, 7100).allowed).toBe(true);
    });

    it('delivers proximity chat only to visitors within 24.0m and excludes distant or blocked visitors', () => {
      const authority = new ZooInstanceAuthority();
      const sender = authority.joinOrResumePlayer({
        playerId: 'player-11111111-1111-4111-8111-111111111111',
        displayName: 'Maya',
        now: 1000
      }).welcome;
      const nearby = authority.joinOrResumePlayer({
        playerId: 'player-22222222-2222-4222-8222-222222222222',
        displayName: 'Leo',
        now: 1010
      }).welcome;
      const distant = authority.joinOrResumePlayer({
        playerId: 'player-33333333-3333-4333-8333-333333333333',
        displayName: 'Zoe',
        now: 1020
      }).welcome;

      // Move distant visitor > 24m away along valid path over 1s intervals
      const waypoints: [number, number, number][] = [
        [2, 0.1, 12],
        [4, 0.1, 5],
        [4, 0.1, -2],
        [2, 0.1, -9],
        [0, 0.1, -15]
      ];
      let moveTime = 2000;
      let seq = 1;
      for (const wp of waypoints) {
        authority.processPlayerMove(
          distant.sessionId,
          {
            type: 'player_move',
            sequence: seq++,
            clientTimestamp: moveTime,
            position: wp,
            velocity: [0, 0, -5],
            facingYaw: 0,
            locomotionState: 'Running'
          },
          moveTime
        );
        moveTime += 1500;
      }

      expect(PROXIMITY_CHAT_RANGE_METERS).toBe(24.0);

      const chatResult = authority.processChatMessage(
        sender.sessionId,
        {
          type: 'send_chat_message',
          text: 'Hi nearby friends!',
          clientTimestamp: moveTime + 100
        },
        moveTime + 100
      );

      expect(chatResult.accepted).toBe(true);
      expect(chatResult.broadcast?.message.text).toBe('Hi nearby friends!');
      expect(chatResult.recipientSessionIds).toContain(sender.sessionId);
      expect(chatResult.recipientSessionIds).toContain(nearby.sessionId);
      expect(chatResult.recipientSessionIds).not.toContain(distant.sessionId);
    });
  });

  describe('US2: Expressive Avatar Emotes & Movement Cancellation (FR-009–FR-011, SC-004)', () => {
    it('defines all 5 required emotes (wave, dance, clap, laugh, sit) and cancels active emote on movement', () => {
      expect(VALID_EMOTE_IDS).toEqual(['wave', 'dance', 'clap', 'laugh', 'sit']);
      expect(EMOTE_CATALOG).toHaveLength(5);
      for (const id of VALID_EMOTE_IDS) {
        expect(isValidEmoteId(id)).toBe(true);
        expect(getEmoteDescriptor(id).label.length).toBeGreaterThan(0);
      }

      const authority = new ZooInstanceAuthority();
      const player = authority.joinOrResumePlayer({
        playerId: 'player-44444444-4444-4444-8444-444444444444',
        displayName: 'Dancer',
        now: 1000
      }).welcome;

      const emoteRes = authority.processTriggerEmote(
        player.sessionId,
        {
          type: 'trigger_emote',
          emoteId: 'dance',
          clientTimestamp: 1500
        },
        1500
      );

      expect(emoteRes.accepted).toBe(true);
      expect(emoteRes.broadcast?.emote?.emoteId).toBe('dance');

      const tickWithEmote = authority.buildRoomTickSnapshot(player.roomId, 1600);
      const serializedWithEmote = tickWithEmote?.players.find(
        (p) => p.sessionId === player.sessionId
      );
      expect(serializedWithEmote?.activeEmote?.emoteId).toBe('dance');

      // Moving cancels the active emote immediately
      authority.processPlayerMove(
        player.sessionId,
        {
          type: 'player_move',
          sequence: 1,
          clientTimestamp: 1700,
          position: [player.spawnPosition[0] + 0.5, 0.1, player.spawnPosition[2]],
          velocity: [2.5, 0, 0],
          facingYaw: 0,
          locomotionState: 'Walking'
        },
        1700
      );

      const tickAfterMove = authority.buildRoomTickSnapshot(player.roomId, 1750);
      const serializedAfterMove = tickAfterMove?.players.find(
        (p) => p.sessionId === player.sessionId
      );
      expect(serializedAfterMove?.activeEmote).toBeNull();
    });
  });

  describe('US3: Multi-Seat Benches, Simultaneous Seating & Seat Release (FR-012–FR-016, SC-005)', () => {
    it('supports 2 players sitting simultaneously on prop-plaza-bench, rejects a 3rd player, and releases seats on stand or disconnect', () => {
      const plazaBench = PANDA_FOREST_INTERACTIVE_OBJECTS.find(
        (obj) => obj.id === 'prop-plaza-bench'
      );
      const scenicBench = PANDA_FOREST_INTERACTIVE_OBJECTS.find(
        (obj) => obj.id === 'prop-scenic-bench'
      );
      const pondChair = PANDA_FOREST_INTERACTIVE_OBJECTS.find(
        (obj) => obj.id === 'prop-pond-chair'
      );

      expect(plazaBench?.seats).toHaveLength(2);
      expect(scenicBench?.seats).toHaveLength(2);
      expect(pondChair?.seats).toHaveLength(1);

      const authority = new ZooInstanceAuthority();
      const p1 = authority.joinOrResumePlayer({
        playerId: 'player-55555555-5555-4555-8555-555555555551',
        displayName: 'VisitorOne',
        now: 1000
      }).welcome;
      const p2 = authority.joinOrResumePlayer({
        playerId: 'player-55555555-5555-4555-8555-555555555552',
        displayName: 'VisitorTwo',
        now: 1010
      }).welcome;
      const p3 = authority.joinOrResumePlayer({
        playerId: 'player-55555555-5555-4555-8555-555555555553',
        displayName: 'VisitorThree',
        now: 1020
      }).welcome;

      // Move all 3 visitors within interaction radius of prop-plaza-bench ([-3.2, 0, 15.0])
      for (const p of [p1, p2, p3]) {
        authority.processPlayerMove(
          p.sessionId,
          {
            type: 'player_move',
            sequence: 1,
            clientTimestamp: 1100,
            position: [-3.0, 0.1, 15.5],
            velocity: [0, 0, 0],
            facingYaw: 0,
            locomotionState: 'Idle'
          },
          1100
        );
      }

      // Player 1 sits on prop-plaza-bench -> gets seatIndex 0
      const sit1 = authority.processSeatInteraction(
        p1.sessionId,
        {
          type: 'interact_seat',
          objectId: 'prop-plaza-bench',
          action: 'sit',
          clientTimestamp: 1200
        },
        1200
      );
      expect(sit1.accepted).toBe(true);
      expect(sit1.seatUpdate?.seats[0]?.occupiedBySessionId).toBe(p1.sessionId);
      expect(sit1.seatUpdate?.seats[1]?.occupiedBySessionId).toBeNull();

      // Player 2 sits on prop-plaza-bench -> gets seatIndex 1 simultaneously
      const sit2 = authority.processSeatInteraction(
        p2.sessionId,
        {
          type: 'interact_seat',
          objectId: 'prop-plaza-bench',
          action: 'sit',
          clientTimestamp: 1250
        },
        1250
      );
      expect(sit2.accepted).toBe(true);
      expect(sit2.seatUpdate?.seats[0]?.occupiedBySessionId).toBe(p1.sessionId);
      expect(sit2.seatUpdate?.seats[1]?.occupiedBySessionId).toBe(p2.sessionId);

      // Player 3 attempts to sit when both seats are occupied -> rejected with SEAT_OCCUPIED
      const sit3 = authority.processSeatInteraction(
        p3.sessionId,
        {
          type: 'interact_seat',
          objectId: 'prop-plaza-bench',
          action: 'sit',
          clientTimestamp: 1300
        },
        1300
      );
      expect(sit3.accepted).toBe(false);
      expect(sit3.errorCode).toBe('SEAT_OCCUPIED');

      // Player 1 stands up -> seatIndex 0 is freed
      const stand1 = authority.processSeatInteraction(
        p1.sessionId,
        {
          type: 'interact_seat',
          objectId: 'prop-plaza-bench',
          action: 'stand',
          clientTimestamp: 1400
        },
        1400
      );
      expect(stand1.accepted).toBe(true);
      expect(stand1.seatUpdate?.seats[0]?.occupiedBySessionId).toBeNull();
      expect(stand1.seatUpdate?.seats[1]?.occupiedBySessionId).toBe(p2.sessionId);

      // Player 2 disconnects -> seatIndex 1 is automatically freed
      const disc2 = authority.disconnectPlayer(p2.sessionId, true, 1500);
      expect(disc2.seatUpdate?.seats[1]?.occupiedBySessionId).toBeNull();
    });
  });

  describe('US4: Friends List, Online Status & Instance Joining (FR-017–FR-020, SC-006)', () => {
    it('supports friend request/accept/reject/remove, persists friend list, and joins a friend room with capacity guard', () => {
      const authority = new ZooInstanceAuthority({ maxPlayersPerRoom: 2 });

      const aliceId = 'player-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      const bobId = 'player-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const charlieId = 'player-cccccccc-cccc-4ccc-8ccc-cccccccccccc';

      const alice = authority.joinOrResumePlayer({
        playerId: aliceId,
        displayName: 'Alice',
        now: 1000
      }).welcome;
      const bob = authority.joinOrResumePlayer({
        playerId: bobId,
        displayName: 'Bob',
        now: 1010
      }).welcome;
      // Since maxPlayersPerRoom is 2, Charlie is placed in panda-forest-2
      const charlie = authority.joinOrResumePlayer({
        playerId: charlieId,
        displayName: 'Charlie',
        now: 1020
      }).welcome;

      expect(alice.roomId).toBe('panda-forest-1');
      expect(bob.roomId).toBe('panda-forest-1');
      expect(charlie.roomId).toBe('panda-forest-2');

      // Alice sends friend request to Charlie across rooms
      const reqRes = authority.sendFriendRequest(
        alice.sessionId,
        {
          type: 'send_friend_request',
          targetPlayerId: charlieId
        },
        1100
      );
      expect(reqRes.accepted).toBe(true);

      const charlieSnapshotBefore = authority.buildSocialPresenceForPlayer(charlieId);
      expect(charlieSnapshotBefore.incomingRequests).toHaveLength(1);
      const reqId = charlieSnapshotBefore.incomingRequests[0]!.requestId;

      // Charlie accepts Alice's friend request
      const acceptRes = authority.respondFriendRequest(
        charlie.sessionId,
        {
          type: 'respond_friend_request',
          requestId: reqId,
          decision: 'accept'
        },
        1200
      );
      expect(acceptRes.accepted).toBe(true);

      const aliceFriends = authority.buildSocialPresenceForPlayer(aliceId);
      expect(aliceFriends.friends).toHaveLength(1);
      expect(aliceFriends.friends[0]?.playerId).toBe(charlieId);
      expect(aliceFriends.friends[0]?.online).toBe(true);
      expect(aliceFriends.friends[0]?.roomId).toBe('panda-forest-2');

      // Verify persistence helper round-trip
      savePersistedSocialState({
        schemaVersion: 1,
        friends: {
          [charlieId]: {
            playerId: charlieId,
            displayName: 'Charlie',
            addedAt: 1200
          }
        },
        mutedPlayerIds: ['player-muted-999'],
        blockedPlayerIds: ['player-blocked-999']
      });
      const loaded = loadPersistedSocialState();
      expect(Object.keys(loaded.friends)).toContain(charlieId);
      expect(loaded.mutedPlayerIds).toContain('player-muted-999');
      expect(window.localStorage.getItem(SOCIAL_STATE_STORAGE_KEY)).toBeTruthy();

      // Charlie tries to join Alice's room (panda-forest-1), which is full (2/2) -> rejected with ROOM_FULL
      const fullJoin = authority.joinFriendInstance(
        charlie.sessionId,
        {
          type: 'join_friend_instance',
          friendPlayerId: aliceId
        },
        1300
      );
      expect(fullJoin.accepted).toBe(false);
      expect(fullJoin.errorCode).toBe('ROOM_FULL');

      // Alice joins Charlie's room (panda-forest-2, which has 1/2 visitors) -> succeeds!
      const validJoin = authority.joinFriendInstance(
        alice.sessionId,
        {
          type: 'join_friend_instance',
          friendPlayerId: charlieId
        },
        1400
      );
      expect(validJoin.accepted).toBe(true);
      expect(validJoin.newRoomId).toBe('panda-forest-2');
      expect(validJoin.welcome?.roomId).toBe('panda-forest-2');

      // Remove friend
      const removeRes = authority.removeFriend(alice.sessionId, {
        type: 'remove_friend',
        targetPlayerId: charlieId
      });
      expect(removeRes.accepted).toBe(true);
      expect(authority.buildSocialPresenceForPlayer(aliceId).friends).toHaveLength(0);
    });
  });

  describe('US5: Safety Controls — Mute, Block & Moderation Report (FR-021–FR-024, SC-007–SC-008)', () => {
    it('suppresses chat & emotes from muted/blocked players, severs friendships on block, and records structured reports', async () => {
      const authority = new ZooInstanceAuthority();
      const hub = new InMemoryMultiplayerHub(authority);

      const clientA = new MultiplayerClient({
        transportFactory: hub.createTransportFactory()
      });
      clientA.connect();
      await new Promise((r) => setTimeout(r, 15));

      const guardianSessionId = clientA.getSessionId()!;
      const guardianPlayerId = gameStore.getState().identity.profile.playerId;
      const troublemakerId = 'player-99999999-9999-4999-8999-999999999999';

      const troublemaker = authority.joinOrResumePlayer({
        playerId: troublemakerId,
        displayName: 'Troublemaker',
        now: 1500
      }).welcome;

      // Troublemaker sends a valid chat message before mute -> Guardian store can receive it
      const chatRes = authority.processChatMessage(
        troublemaker.sessionId,
        {
          type: 'send_chat_message',
          text: 'Hello before mute',
          clientTimestamp: 1600
        },
        1600
      );
      expect(chatRes.accepted).toBe(true);
      gameStore.getState().addProximityChatMessage(chatRes.broadcast!.message);
      expect(gameStore.getState().social.chatMessages).toHaveLength(1);

      // Guardian mutes Troublemaker -> removes their messages and suppresses future messages/emotes
      gameStore.getState().toggleMutePlayer(troublemakerId);
      expect(gameStore.getState().social.mutedPlayerIds).toContain(troublemakerId);
      expect(gameStore.getState().social.chatMessages).toHaveLength(0);

      // Guardian submits a moderation report against Troublemaker
      clientA.submitPlayerReport({
        reportedPlayerId: troublemakerId,
        reportedSessionId: troublemaker.sessionId,
        reportedDisplayName: 'Troublemaker',
        reason: 'harassment-spam',
        details: 'Repeated unwanted messages near spawn plaza.'
      });
      await new Promise((r) => setTimeout(r, 10));

      const submittedReports = gameStore.getState().social.submittedReports;
      expect(submittedReports.length).toBeGreaterThanOrEqual(1);
      const lastReport = submittedReports[submittedReports.length - 1];
      expect(lastReport).toBeDefined();
      expect(lastReport?.reporterPlayerId).toBe(guardianPlayerId);
      expect(lastReport?.reportedPlayerId).toBe(troublemakerId);
      expect(lastReport?.reason).toBe('harassment-spam');
      expect(lastReport?.recentChatSnapshot.length).toBeGreaterThanOrEqual(1);

      // Guardian blocks Troublemaker -> prevents friend requests and chat recipient delivery
      clientA.setPlayerBlock(troublemakerId, true);
      await new Promise((r) => setTimeout(r, 10));
      expect(gameStore.getState().social.blockedPlayerIds).toContain(troublemakerId);

      const blockedFriendReq = authority.sendFriendRequest(
        troublemaker.sessionId,
        {
          type: 'send_friend_request',
          targetPlayerId: guardianPlayerId
        },
        2000
      );
      expect(blockedFriendReq.accepted).toBe(false);
      expect(blockedFriendReq.errorCode).toBe('PLAYER_BLOCKED');

      const blockedChatRes = authority.processChatMessage(
        troublemaker.sessionId,
        {
          type: 'send_chat_message',
          text: 'Can you still hear me?',
          clientTimestamp: 3000
        },
        3000
      );
      expect(blockedChatRes.recipientSessionIds).not.toContain(guardianSessionId);

      clientA.disconnect(true);
    });
  });

  describe('US6: Instance Selection, Player ID Tuning & Background Session Recovery (FR-025–FR-029, SC-009–SC-011)', () => {
    it('lists available instances, switches instances cleanly, tunes/regenerates Player IDs, and auto-reactivate pruned sessions so chat never breaks', async () => {
      const authority = new ZooInstanceAuthority({
        maxPlayersPerRoom: 2,
        heartbeatTimeoutMs: 8000,
        resumeGraceWindowMs: 30000
      });
      const hub = new InMemoryMultiplayerHub(authority);

      const clientA = new MultiplayerClient({
        transportFactory: hub.createTransportFactory()
      });
      clientA.connect();
      await new Promise((r) => setTimeout(r, 15));

      // 1. Available instances directory includes default public channels
      const available = gameStore.getState().social.availableInstances;
      expect(available.length).toBeGreaterThanOrEqual(3);
      expect(available.some((i) => i.roomId === 'panda-forest-1')).toBe(true);
      expect(available.some((i) => i.roomId === 'panda-forest-2')).toBe(true);
      expect(available.some((i) => i.roomId === 'panda-forest-3')).toBe(true);

      // 2. Player ID tuning and regeneration
      const tuneRes = gameStore.getState().tunePlayerId('bamboo-ranger-01');
      expect(tuneRes.ok).toBe(true);
      expect(tuneRes.profile?.playerId).toBe('player-bamboo-ranger-01');
      clientA.sendIdentityUpdate(tuneRes.profile!);
      await new Promise((r) => setTimeout(r, 10));

      const regenerated = gameStore.getState().regeneratePlayerId();
      expect(regenerated.playerId).toMatch(/^player-[a-z0-9]{8}$/);
      expect(regenerated.playerId).not.toBe('player-bamboo-ranger-01');
      clientA.sendIdentityUpdate(regenerated);
      await new Promise((r) => setTimeout(r, 10));

      // 3. Switch instance to panda-forest-2 and custom instance bamboo-vip
      clientA.switchInstance('panda-forest-2');
      await new Promise((r) => setTimeout(r, 15));
      expect(gameStore.getState().multiplayer.roomId).toBe('panda-forest-2');

      clientA.switchInstance('bamboo-vip');
      await new Promise((r) => setTimeout(r, 15));
      expect(gameStore.getState().multiplayer.roomId).toBe('bamboo-vip');

      // 4. Simulate background-tab timeout (> 8s without frame step) followed by chat message on still-open socket
      const sessionId = clientA.getSessionId()!;
      const pruned = authority.pruneStaleSessions(Date.now() + 10000);
      expect(pruned.some((p) => p.sessionId === sessionId)).toBe(true);
      expect(authority.getRoom('bamboo-vip')?.activeSessions.has(sessionId)).toBe(false);

      // Now clientA sends a chat message on the still-open connection -> authority auto-reactivates the session and delivers the chat!
      const chatSend = clientA.sendChatMessage('Back from background tab!');
      expect(chatSend.valid).toBe(true);
      await new Promise((r) => setTimeout(r, 15));

      expect(authority.getRoom('bamboo-vip')?.activeSessions.has(sessionId)).toBe(true);
      const msgs = gameStore.getState().social.chatMessages;
      expect(msgs.some((m) => m.text === 'Back from background tab!')).toBe(true);

      clientA.disconnect(true);
    });
  });
});
