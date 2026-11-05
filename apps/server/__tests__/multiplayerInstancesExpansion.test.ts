import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_AVATAR_APPEARANCE,
  gameStore,
  loadPersistedSocialState,
  MultiplayerClient,
  parseClientMultiplayerMessage,
  resetMutableRuntimeState,
  savePersistedSocialState
} from '@online-zoo/game-core';
import { InMemoryMultiplayerHub, ZooInstanceAuthority } from '../src';

describe('Feature 009 — Multiplayer Expansion & Zoo Instances (FR-001 to FR-012, SC-001 to SC-005)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.clear();
    }
    gameStore.getState().resetSession();
    resetMutableRuntimeState();
  });

  it('enforces configurable instance capacity, routes peak burst overflow to available/dynamic instances, and prunes empty overflow rooms (SC-001)', () => {
    const authority = new ZooInstanceAuthority({ maxPlayersPerRoom: 2 });

    // Fill panda-forest-1 (2/2)
    const p1 = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-burst-001',
      displayName: 'BurstOne'
    });
    const p2 = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-burst-002',
      displayName: 'BurstTwo'
    });
    expect(p1.welcome.roomId).toBe('panda-forest-1');
    expect(p1.welcome.placementReason).toBe('requested');
    expect(p2.welcome.roomId).toBe('panda-forest-1');
    expect(authority.getActivePlayerCount('panda-forest-1')).toBe(2);

    // Next 2 entrants requesting panda-forest-1 overflow to panda-forest-2
    const p3 = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-burst-003',
      displayName: 'BurstThree'
    });
    const p4 = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-burst-004',
      displayName: 'BurstFour'
    });
    expect(p3.welcome.roomId).toBe('panda-forest-2');
    expect(p3.welcome.placementReason).toBe('overflow_redirect');
    expect(p3.welcome.placementNotice).toContain('full (2/2)');
    expect(p4.welcome.roomId).toBe('panda-forest-2');

    // Fill panda-forest-3 (2/2)
    const p5 = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-burst-005',
      displayName: 'BurstFive'
    });
    const p6 = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-burst-006',
      displayName: 'BurstSix'
    });
    expect(p5.welcome.roomId).toBe('panda-forest-3');
    expect(p6.welcome.roomId).toBe('panda-forest-3');

    // 7th entrant triggers dynamic overflow room panda-forest-4
    const p7 = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-burst-007',
      displayName: 'BurstSeven'
    });
    expect(p7.welcome.roomId).toBe('panda-forest-4');
    expect(p7.welcome.placementReason).toBe('overflow_redirect');

    const instancesWithOverflow = authority.getAvailableInstances();
    const room4 = instancesWithOverflow.find((i) => i.roomId === 'panda-forest-4');
    expect(room4).toBeDefined();
    expect(room4?.isOverflow).toBe(true);
    expect(room4?.visitorCount).toBe(1);

    // When p7 leaves cleanly, empty overflow room panda-forest-4 is automatically pruned
    authority.disconnectPlayer(p7.welcome.sessionId, true);
    const instancesAfterPrune = authority.getAvailableInstances();
    expect(instancesAfterPrune.some((i) => i.roomId === 'panda-forest-4')).toBe(false);
    // Default public rooms remain listed even if empty
    expect(instancesAfterPrune.map((i) => i.roomId)).toEqual([
      'panda-forest-1',
      'panda-forest-2',
      'panda-forest-3'
    ]);
  });

  it('supports friend-prioritized automatic placement and enforces friend-join privacy settings (SC-002)', () => {
    const authority = new ZooInstanceAuthority({ maxPlayersPerRoom: 4 });

    // Host friend joins panda-forest-2
    const host = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-2',
      playerId: 'player-friend-host',
      displayName: 'BambooHost'
    });
    expect(host.welcome.roomId).toBe('panda-forest-2');

    // Friend enters with default requestedRoomId='panda-forest-1' and preferFriendPlacement=true
    const joiner = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-friend-guest',
      displayName: 'BambooGuest',
      friendPlayerIds: ['player-friend-host'],
      preferFriendPlacement: true
    });
    expect(joiner.welcome.roomId).toBe('panda-forest-2');
    expect(joiner.welcome.placementReason).toBe('friend_priority');
    expect(joiner.welcome.placementNotice).toContain('alongside 1 online friend');

    // Instance directory for BambooGuest shows 1 friend in panda-forest-2
    const guestDirectory = authority.getAvailableInstances('player-friend-guest');
    const room2Entry = guestDirectory.find((i) => i.roomId === 'panda-forest-2');
    expect(room2Entry?.friendCount).toBe(1);

    // Move guest back to panda-forest-1
    const switched = authority.switchPlayerInstance(joiner.welcome.sessionId, {
      type: 'switch_instance',
      targetRoomId: 'panda-forest-1'
    });
    expect(switched.accepted).toBe(true);
    expect(switched.newRoomId).toBe('panda-forest-1');

    // Host disables friend instance joining (privacy toggle)
    const privRes = authority.setSocialPrivacy(host.welcome.sessionId, {
      type: 'set_social_privacy',
      allowFriendJoin: false
    });
    expect(privRes.accepted).toBe(true);

    // Presence for guest reflects allowFriendJoin=false and canJoin=false
    const guestPresence = authority.buildSocialPresenceForPlayer('player-friend-guest');
    const hostFriendEntry = guestPresence.friends.find((f) => f.playerId === 'player-friend-host');
    expect(hostFriendEntry?.allowFriendJoin).toBe(false);
    expect(hostFriendEntry?.canJoin).toBe(false);

    // Direct join_friend_instance is rejected with FRIEND_JOIN_DISABLED
    const blockedJoin = authority.joinFriendInstance(joiner.welcome.sessionId, {
      type: 'join_friend_instance',
      friendPlayerId: 'player-friend-host'
    });
    expect(blockedJoin.accepted).toBe(false);
    expect(blockedJoin.errorCode).toBe('FRIEND_JOIN_DISABLED');

    // Re-enabling allowFriendJoin allows joining again
    authority.setSocialPrivacy(host.welcome.sessionId, {
      type: 'set_social_privacy',
      allowFriendJoin: true
    });
    const allowedJoin = authority.joinFriendInstance(joiner.welcome.sessionId, {
      type: 'join_friend_instance',
      friendPlayerId: 'player-friend-host'
    });
    expect(allowedJoin.accepted).toBe(true);
    expect(allowedJoin.newRoomId).toBe('panda-forest-2');
  });

  it('prevents duplicate sessions during rapid switches or re-joins and preserves 100% of player progression state across instances (SC-003, SC-004)', () => {
    const authority = new ZooInstanceAuthority();

    const firstJoin = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-traveler-777',
      displayName: 'Traveler',
      avatar: {
        ...DEFAULT_AVATAR_APPEARANCE,
        outfit: 'botanist-cobalt'
      },
      diningWallet: {
        currencyBalance: 85,
        inventory: {
          water: 1,
          'bubble-tea': 2,
          'ice-cream': 0,
          burger: 1,
          popcorn: 0
        }
      }
    });

    // Stamp a passport zone while in panda-forest-1
    authority.recordPassportProgress(firstJoin.welcome.sessionId, {
      type: 'record_passport_progress',
      zoneId: 'zone-panda-sanctuary',
      speciesId: 'panda'
    });

    // Switch to panda-forest-2
    const switch1 = authority.switchPlayerInstance(firstJoin.welcome.sessionId, {
      type: 'switch_instance',
      targetRoomId: 'panda-forest-2'
    });
    expect(switch1.accepted).toBe(true);
    expect(authority.getActivePlayerCount('panda-forest-1')).toBe(0);
    expect(authority.getActivePlayerCount('panda-forest-2')).toBe(1);

    // Verify wallet, identity, and passport stamps are preserved in panda-forest-2 welcome snapshot
    expect(switch1.welcome?.playerId).toBe('player-traveler-777');
    expect(switch1.welcome?.displayName).toBe('Traveler');
    expect(switch1.welcome?.avatar?.outfit).toBe('botanist-cobalt');
    expect(switch1.welcome?.diningWallet?.currencyBalance).toBe(85);
    expect(switch1.welcome?.diningWallet?.inventory['bubble-tea']).toBe(2);
    expect(switch1.welcome?.passportState?.stamps['zone-panda-sanctuary'].obtained).toBe(true);

    // Simulate a duplicate connection from the same playerId without a resumeToken
    const dupJoin = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-3',
      playerId: 'player-traveler-777',
      displayName: 'Traveler',
      deduplicatePlayerId: true
    });
    expect(dupJoin.welcome.roomId).toBe('panda-forest-3');
    expect(dupJoin.purgedDuplicates).toHaveLength(1);
    expect(dupJoin.purgedDuplicates?.[0]?.roomId).toBe('panda-forest-2');
    expect(authority.getActivePlayerCount('panda-forest-2')).toBe(0);
    expect(authority.getActivePlayerCount('panda-forest-3')).toBe(1);
  });

  it('isolates unhealthy instance failures and automatically migrates connected players to a healthy instance (SC-005)', () => {
    const authority = new ZooInstanceAuthority();

    const p1 = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-2',
      playerId: 'player-evac-001',
      displayName: 'EvacOne'
    });
    const p2 = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-2',
      playerId: 'player-evac-002',
      displayName: 'EvacTwo'
    });
    const bystander = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-3',
      playerId: 'player-bystander-003',
      displayName: 'Bystander'
    });

    expect(authority.getActivePlayerCount('panda-forest-2')).toBe(2);
    expect(authority.getActivePlayerCount('panda-forest-3')).toBe(1);

    // Mark panda-forest-2 unhealthy
    const cfgRes = authority.configureInstance(bystander.welcome.sessionId, {
      type: 'configure_instance',
      roomId: 'panda-forest-2',
      status: 'unhealthy'
    });
    expect(cfgRes.accepted).toBe(true);
    expect(cfgRes.migratedSessions).toHaveLength(2);

    // Both sessions from panda-forest-2 are evacuated to panda-forest-1 with failover_recovery
    expect(authority.getActivePlayerCount('panda-forest-2')).toBe(0);
    expect(authority.getActivePlayerCount('panda-forest-1')).toBe(2);
    // panda-forest-3 is completely unaffected
    expect(authority.getActivePlayerCount('panda-forest-3')).toBe(1);

    for (const mig of cfgRes.migratedSessions ?? []) {
      expect(mig.oldRoomId).toBe('panda-forest-2');
      expect(mig.newRoomId).toBe('panda-forest-1');
      expect(mig.welcome.placementReason).toBe('failover_recovery');
      expect(mig.welcome.placementNotice).toContain('safely moved to');
    }

    // Attempting to manually switch into unhealthy panda-forest-2 is rejected with INSTANCE_UNAVAILABLE
    const blockedSwitch = authority.switchPlayerInstance(p1.welcome.sessionId, {
      type: 'switch_instance',
      targetRoomId: 'panda-forest-2'
    });
    expect(blockedSwitch.accepted).toBe(false);
    expect(blockedSwitch.errorCode).toBe('INSTANCE_UNAVAILABLE');
  });

  it('synchronizes privacy, capacity, and automatic failover across MultiplayerClient and InMemoryMultiplayerHub', async () => {
    const hub = new InMemoryMultiplayerHub();
    const client = new MultiplayerClient({
      roomId: 'panda-forest-2',
      transportFactory: hub.createTransportFactory()
    });

    client.connect();
    await new Promise((r) => setTimeout(r, 20));

    expect(gameStore.getState().multiplayer.status).toBe('connected');
    expect(gameStore.getState().multiplayer.roomId).toBe('panda-forest-2');

    // Toggle social privacy via client
    client.setSocialPrivacy(false);
    expect(gameStore.getState().social.allowFriendJoin).toBe(false);
    const persisted = loadPersistedSocialState(gameStore.getState().identity.profile.playerId);
    expect(persisted.allowFriendJoin).toBe(false);

    // Configure panda-forest-2 as unhealthy -> client is automatically migrated to panda-forest-1
    client.configureInstance({ roomId: 'panda-forest-2', status: 'unhealthy' });
    await new Promise((r) => setTimeout(r, 20));

    expect(gameStore.getState().multiplayer.roomId).toBe('panda-forest-1');
    expect(gameStore.getState().social.socialNotice).toContain('panda-forest-2');

    const inst2 = gameStore
      .getState()
      .social.availableInstances.find((i) => i.roomId === 'panda-forest-2');
    expect(inst2?.status).toBe('unhealthy');

    // Validate protocol parser for new message types
    expect(
      parseClientMultiplayerMessage(
        JSON.stringify({ type: 'set_social_privacy', allowFriendJoin: true })
      )
    ).toEqual({
      type: 'set_social_privacy',
      allowFriendJoin: true
    });
    expect(
      parseClientMultiplayerMessage(
        JSON.stringify({
          type: 'configure_instance',
          roomId: 'panda-forest-2',
          maxPlayers: 4,
          status: 'healthy'
        })
      )
    ).toEqual({
      type: 'configure_instance',
      roomId: 'panda-forest-2',
      maxPlayers: 4,
      status: 'healthy'
    });

    savePersistedSocialState(
      {
        schemaVersion: 1,
        friends: {},
        mutedPlayerIds: [],
        blockedPlayerIds: [],
        allowFriendJoin: true
      },
      gameStore.getState().identity.profile.playerId
    );
    client.disconnect();
  });
});
