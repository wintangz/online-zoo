import { afterEach, describe, expect, it } from 'vitest';
import {
  deriveOccupancyUrlFromWsUrl,
  evaluateMainMenuPlayAttempt,
  fetchServerOccupancy,
  gameStore,
  resolveInitialMenuSelection
} from '@online-zoo/game-core';
import {
  createStandaloneGameServer,
  type StandaloneGameServerInstance
} from '../src/index';

describe('main-menu — Pre-Game Main Menu Occupancy, Zone Selection & Failure States', () => {
  let serverHandle: StandaloneGameServerInstance | null = null;

  afterEach(async () => {
    if (serverHandle) {
      await serverHandle.close();
      serverHandle = null;
    }
    gameStore.getState().resetSession();
  });

  it('derives the HTTP /occupancy endpoint from NEXT_PUBLIC_WS_URL (FR-004, SC-002)', () => {
    expect(deriveOccupancyUrlFromWsUrl('ws://localhost:4000/ws/zoo')).toBe(
      'http://localhost:4000/occupancy'
    );
    expect(deriveOccupancyUrlFromWsUrl('wss://zoo-server.example.com/ws/zoo?room=zoo-lobby-1')).toBe(
      'https://zoo-server.example.com/occupancy'
    );
    expect(deriveOccupancyUrlFromWsUrl('')).toBe('http://localhost:4000/occupancy');
  });

  it('fetches live zone occupancy from apps/server and handles server-unreachable gracefully (FR-004, FR-009, SC-002, SC-003)', async () => {
    serverHandle = createStandaloneGameServer({ port: 0 });
    const port = await serverHandle.listen(0, '127.0.0.1');
    const wsUrl = `ws://127.0.0.1:${port}/ws/zoo`;

    serverHandle.authority.joinOrResumePlayer({
      requestedRoomId: 'zoo-lobby-1',
      playerId: 'player-menu-test-1'
    });

    const liveRes = await fetchServerOccupancy(wsUrl);
    expect(liveRes.ok).toBe(true);
    expect(liveRes.snapshot?.status).toBe('ok');
    expect(liveRes.snapshot?.totalPlayers).toBe(1);
    expect(liveRes.snapshot?.zones.map((z) => z.zoneId)).toEqual(['zoo-lobby', 'panda-forest']);
    expect(liveRes.snapshot?.zones.find((z) => z.zoneId === 'zoo-lobby')?.playerCount).toBe(1);

    // Close server and verify server-unreachable returns { ok: false, snapshot: null } without throwing
    await serverHandle.close();
    serverHandle = null;

    const unreachableRes = await fetchServerOccupancy(wsUrl);
    expect(unreachableRes.ok).toBe(false);
    expect(unreachableRes.snapshot).toBeNull();
    expect(unreachableRes.error).toBeTruthy();
  });

  it('enforces first-time lobby-only selection, unlocks all zones for returning players, and supports ?room= pre-selection (FR-005, FR-006)', () => {
    const firstTime = resolveInitialMenuSelection({
      isReturningVisitor: false,
      sharedRoomParam: null
    });
    expect(firstTime.selectedZoneId).toBe('zoo-lobby');
    expect(firstTime.selectedRoomId).toBe('zoo-lobby-1');
    expect(firstTime.canSelectAnyZone).toBe(false);

    // First-time player attempting to select panda-forest without a shared room link is clamped to zoo-lobby
    const firstTimePlay = evaluateMainMenuPlayAttempt({
      displayName: 'Explorer #101',
      selectedZoneId: 'panda-forest',
      selectedRoomId: 'panda-forest-1',
      isReturningVisitor: false,
      serverReachable: true,
      occupancy: null
    });
    expect(firstTimePlay.allowed).toBe(true);
    expect(firstTimePlay.targetZoneId).toBe('zoo-lobby');
    expect(firstTimePlay.targetRoomId).toBe('zoo-lobby-1');

    // Returning player can select panda-forest directly
    const returningPlay = evaluateMainMenuPlayAttempt({
      displayName: 'BambooScout',
      selectedZoneId: 'panda-forest',
      selectedRoomId: 'panda-forest-1',
      isReturningVisitor: true,
      serverReachable: true,
      occupancy: null
    });
    expect(returningPlay.allowed).toBe(true);
    expect(returningPlay.targetZoneId).toBe('panda-forest');
    expect(returningPlay.targetRoomId).toBe('panda-forest-1');
    expect(returningPlay.normalizedDisplayName).toBe('BambooScout');

    // Shared room link (?room=e2e-shared-room) pre-selects the room while still passing through Play
    const sharedLink = resolveInitialMenuSelection({
      isReturningVisitor: false,
      sharedRoomParam: 'e2e-shared-room'
    });
    expect(sharedLink.selectedRoomId).toBe('e2e-shared-room');
  });

  it('produces designed failure states for server_unreachable, room_full, and name_rejected (FR-009, SC-003)', () => {
    // 1. Name rejected
    const badName = evaluateMainMenuPlayAttempt({
      displayName: 'A',
      selectedZoneId: 'zoo-lobby',
      isReturningVisitor: false,
      serverReachable: true,
      occupancy: null
    });
    expect(badName.allowed).toBe(false);
    expect(badName.failure?.kind).toBe('name_rejected');

    // 2. Server unreachable
    const unreachable = evaluateMainMenuPlayAttempt({
      displayName: 'ValidExplorer',
      selectedZoneId: 'zoo-lobby',
      isReturningVisitor: false,
      serverReachable: false,
      occupancy: null
    });
    expect(unreachable.allowed).toBe(false);
    expect(unreachable.failure?.kind).toBe('server_unreachable');

    // 3. Room full
    const fullRoom = evaluateMainMenuPlayAttempt({
      displayName: 'ValidExplorer',
      selectedZoneId: 'zoo-lobby',
      selectedRoomId: 'zoo-lobby-1',
      isReturningVisitor: false,
      serverReachable: true,
      occupancy: {
        status: 'ok',
        serverTimestamp: Date.now(),
        totalPlayers: 16,
        zones: [
          {
            zoneId: 'zoo-lobby',
            displayName: 'Zoo Lobby',
            roomId: 'zoo-lobby-1',
            playerCount: 16,
            maxPlayers: 16,
            isFull: true,
            status: 'healthy'
          }
        ],
        rooms: [
          {
            roomId: 'zoo-lobby-1',
            label: 'Zoo Lobby #1',
            visitorCount: 16,
            maxPlayers: 16,
            isFull: true,
            status: 'healthy'
          }
        ]
      }
    });
    expect(fullRoom.allowed).toBe(false);
    expect(fullRoom.failure?.kind).toBe('room_full');
  });

  it('shares the same settings state between the Main Menu settings modal and in-game settings (FR-008)', () => {
    expect(gameStore.getState().isSettingsModalOpen).toBe(false);
    gameStore.getState().setSettingsModalOpen(true);
    expect(gameStore.getState().isSettingsModalOpen).toBe(true);

    gameStore.getState().updateSettings({ audioMuted: true, qualityTier: 'high' });
    expect(gameStore.getState().settings.audioMuted).toBe(true);
    expect(gameStore.getState().settings.qualityTier).toBe('high');

    gameStore.getState().setSettingsModalOpen(false);
    expect(gameStore.getState().isSettingsModalOpen).toBe(false);
    expect(gameStore.getState().settings.audioMuted).toBe(true);
  });
});
