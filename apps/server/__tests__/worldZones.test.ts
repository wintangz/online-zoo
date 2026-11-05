import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_ENTRY_ROOM_ID,
  findGateLinkByObjectId,
  gameStore,
  getZoneById,
  InteractionSystem,
  MultiplayerClient,
  mutableRuntimeState,
  resetMutableRuntimeState,
  resolveZoneForRoomId,
  WORLD_ZONE_IDS,
  WORLD_ZONES_BY_ID
} from '@online-zoo/game-core';
import { InMemoryMultiplayerHub, ZooInstanceAuthority } from '../src';

describe('world-zones — Multi-Zone World Registry, Lobby Entry, Symmetric Gates & Room-Scoped Authority', () => {
  beforeEach(() => {
    gameStore.getState().resetSession();
    resetMutableRuntimeState();
  });

  it('registers zoo-lobby and panda-forest with zoneId, displayName, roomId, sceneId, spawnPoint, and symmetric gateLinks (FR-001, SC-001)', () => {
    expect(WORLD_ZONE_IDS).toEqual(['zoo-lobby', 'panda-forest']);

    const lobby = getZoneById('zoo-lobby');
    const panda = getZoneById('panda-forest');

    expect(lobby.zoneId).toBe('zoo-lobby');
    expect(lobby.displayName).toBe('Zoo Lobby');
    expect(lobby.roomId).toBe('zoo-lobby-1');
    expect(lobby.sceneId).toBe('zoo-lobby');
    expect(lobby.hasAnimals).toBe(false);
    expect(lobby.spawnPoint).toEqual([0, 0.1, 18]);

    expect(panda.zoneId).toBe('panda-forest');
    expect(panda.displayName).toBe('Panda Forest');
    expect(panda.roomId).toBe('panda-forest-1');
    expect(panda.sceneId).toBe('panda-forest');
    expect(panda.hasAnimals).toBe(true);

    // Symmetric gate links
    const toPandaGate = findGateLinkByObjectId('zoo-lobby', 'gate-to-panda-forest');
    const toLobbyGate = findGateLinkByObjectId('panda-forest', 'gate-to-zoo-lobby');
    expect(toPandaGate).toBeDefined();
    expect(toLobbyGate).toBeDefined();
    expect(toPandaGate?.promptText).toBe('Enter Panda Forest?');
    expect(toLobbyGate?.promptText).toBe('Enter Zoo Lobby?');
    expect(toPandaGate?.pairedGateId).toBe(toLobbyGate?.gateId);
    expect(toLobbyGate?.pairedGateId).toBe(toPandaGate?.gateId);

    // Room-to-zone resolution
    expect(resolveZoneForRoomId('zoo-lobby-1').zoneId).toBe('zoo-lobby');
    expect(resolveZoneForRoomId('zoo-lobby-2').zoneId).toBe('zoo-lobby');
    expect(resolveZoneForRoomId('panda-forest-1').zoneId).toBe('panda-forest');
    expect(resolveZoneForRoomId('panda-forest-2').zoneId).toBe('panda-forest');
  });

  it('prompts "Enter <zone>?" via InteractionSystem when approaching a zone gate (FR-004)', () => {
    const lobbyZone = WORLD_ZONES_BY_ID['zoo-lobby'];
    const sys = new InteractionSystem(lobbyZone.layout.interactiveObjects);

    // Approach North Gate at [0, 0, 8.5] from [0, 0.1, 10.5] facing North (Math.PI)
    const evalRes = sys.evaluate([0, 0.1, 10.5], Math.PI);
    expect(evalRes.focusedObject?.id).toBe('gate-to-panda-forest');
    expect(evalRes.focusedObject?.promptAction).toBe('Enter Panda Forest?');
    expect(evalRes.focusedObject?.propReactionType).toBe('enter_zone_gate');
  });

  it('spawns 0 animals in zoo-lobby-1 while maintaining full animal authority in panda-forest-1 (FR-003, SC-002)', () => {
    const authority = new ZooInstanceAuthority();

    const lobbyJoin = authority.joinOrResumePlayer({
      requestedRoomId: 'zoo-lobby-1',
      playerId: 'player-lobby-visitor'
    });
    expect(lobbyJoin.welcome.roomId).toBe('zoo-lobby-1');
    expect(lobbyJoin.welcome.animals).toHaveLength(0);
    expect(authority.getRoomAnimals('zoo-lobby-1')).toHaveLength(0);

    const lobbyTick = authority.buildRoomTickSnapshot('zoo-lobby-1', Date.now() + 100);
    expect(lobbyTick?.animals).toHaveLength(0);

    const pandaJoin = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-panda-visitor'
    });
    expect(pandaJoin.welcome.roomId).toBe('panda-forest-1');
    expect(pandaJoin.welcome.animals?.length).toBeGreaterThan(0);
    expect(authority.getRoomAnimals('panda-forest-1').length).toBeGreaterThan(0);
  });

  it('scopes presence and proximity chat per room and reports friend zoneId + zoneDisplayName across zones (FR-006, SC-004)', () => {
    const authority = new ZooInstanceAuthority();

    const pLobby = authority.joinOrResumePlayer({
      requestedRoomId: 'zoo-lobby-1',
      playerId: 'player-alice-lobby',
      displayName: 'Alice',
      friendPlayerIds: ['player-bob-panda']
    });
    const pPanda = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      playerId: 'player-bob-panda',
      displayName: 'Bob',
      friendPlayerIds: ['player-alice-lobby']
    });

    // Proximity chat in zoo-lobby-1 only reaches zoo-lobby-1 sessions
    const chatRes = authority.processChatMessage(pLobby.welcome.sessionId, {
      type: 'send_chat_message',
      text: 'Hello from the lobby!',
      clientTimestamp: Date.now()
    });
    expect(chatRes.accepted).toBe(true);
    expect(chatRes.recipientSessionIds).toEqual([pLobby.welcome.sessionId]);
    expect(chatRes.recipientSessionIds).not.toContain(pPanda.welcome.sessionId);

    // Friend status for Alice shows Bob is in Panda Forest
    const alicePresence = authority.buildSocialPresenceForPlayer('player-alice-lobby');
    const bobEntry = alicePresence.friends.find((f) => f.playerId === 'player-bob-panda');
    expect(bobEntry?.online).toBe(true);
    expect(bobEntry?.roomId).toBe('panda-forest-1');
    expect(bobEntry?.zoneId).toBe('panda-forest');
    expect(bobEntry?.zoneDisplayName).toBe('Panda Forest');

    // Friend status for Bob shows Alice is in Zoo Lobby
    const bobPresence = authority.buildSocialPresenceForPlayer('player-bob-panda');
    const aliceEntry = bobPresence.friends.find((f) => f.playerId === 'player-alice-lobby');
    expect(aliceEntry?.online).toBe(true);
    expect(aliceEntry?.roomId).toBe('zoo-lobby-1');
    expect(aliceEntry?.zoneId).toBe('zoo-lobby');
    expect(aliceEntry?.zoneDisplayName).toBe('Zoo Lobby');

    // Occupancy snapshot includes both zoo-lobby and panda-forest
    const occupancy = authority.buildOccupancySnapshot();
    expect(occupancy.zones.map((z) => z.zoneId)).toEqual(['zoo-lobby', 'panda-forest']);
    expect(occupancy.zones.find((z) => z.zoneId === 'zoo-lobby')?.playerCount).toBe(1);
    expect(occupancy.zones.find((z) => z.zoneId === 'panda-forest')?.playerCount).toBe(1);
  });

  it('transitions symmetrically between zoo-lobby and panda-forest via gates and always spawns in lobby on reconnect/resume (FR-004, FR-005, FR-009, SC-003, SC-005)', async () => {
    const hub = new InMemoryMultiplayerHub();
    const client = new MultiplayerClient({
      alwaysSpawnInLobby: true,
      transportFactory: hub.createTransportFactory(),
      reconnectBackoffMs: [20, 40]
    });

    client.connect();
    await new Promise((r) => setTimeout(r, 15));

    // 1. Always spawns in zoo-lobby-1 first
    expect(gameStore.getState().multiplayer.status).toBe('connected');
    expect(gameStore.getState().multiplayer.roomId).toBe(DEFAULT_ENTRY_ROOM_ID);
    expect(gameStore.getState().currentZoneId).toBe('zoo-lobby');
    expect(mutableRuntimeState.avatar.position[2]).toBeCloseTo(18.0, 1);

    // 2. Confirm gate transition to Panda Forest
    const toPandaGate = findGateLinkByObjectId('zoo-lobby', 'gate-to-panda-forest')!;
    client.switchZoneViaGate(toPandaGate);
    await new Promise((r) => setTimeout(r, 15));

    expect(gameStore.getState().multiplayer.roomId).toBe('panda-forest-1');
    expect(gameStore.getState().currentZoneId).toBe('panda-forest');
    // Arrives at paired return gate in Panda Forest ([0, 0.1, 14.2])
    expect(mutableRuntimeState.avatar.position[0]).toBeCloseTo(0, 2);
    expect(mutableRuntimeState.avatar.position[2]).toBeCloseTo(14.2, 2);

    // 3. Confirm symmetric return gate transition back to Zoo Lobby
    const toLobbyGate = findGateLinkByObjectId('panda-forest', 'gate-to-zoo-lobby')!;
    client.switchZoneViaGate(toLobbyGate);
    await new Promise((r) => setTimeout(r, 15));

    expect(gameStore.getState().multiplayer.roomId).toBe('zoo-lobby-1');
    expect(gameStore.getState().currentZoneId).toBe('zoo-lobby');
    // Arrives at paired return gate in Zoo Lobby ([0, 0.1, 11.2], facing South yaw=0)
    expect(mutableRuntimeState.avatar.position[0]).toBeCloseTo(0, 2);
    expect(mutableRuntimeState.avatar.position[2]).toBeCloseTo(11.2, 2);
    expect(mutableRuntimeState.avatar.facingYaw).toBeCloseTo(0, 2);

    // 4. Move back to Panda Forest, then simulate reconnect/resume -> always spawns in lobby!
    client.switchZoneViaGate(toPandaGate);
    await new Promise((r) => setTimeout(r, 15));
    expect(gameStore.getState().currentZoneId).toBe('panda-forest');

    client.simulateNetworkDrop(20);
    await new Promise((r) => setTimeout(r, 80));

    expect(gameStore.getState().multiplayer.status).toBe('connected');
    expect(gameStore.getState().multiplayer.roomId).toBe('zoo-lobby-1');
    expect(gameStore.getState().currentZoneId).toBe('zoo-lobby');
    expect(mutableRuntimeState.avatar.position[2]).toBeCloseTo(18.0, 1);

    client.disconnect(true);
  });
});
