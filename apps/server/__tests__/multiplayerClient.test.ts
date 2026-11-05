import { beforeEach, describe, expect, it } from 'vitest';
import {
  gameStore,
  MultiplayerClient,
  mutableRuntimeState,
  resetMutableRuntimeState
} from '@online-zoo/game-core';
import { InMemoryMultiplayerHub } from '../src';

describe('MultiplayerClient Integration & Resilience (US1, US2, US3, US4)', () => {
  beforeEach(() => {
    gameStore.getState().resetSession();
    resetMutableRuntimeState();
  });

  it('connects two clients, synchronizes remote presence, movement, and shared prop toggles, and removes departed players', async () => {
    const hub = new InMemoryMultiplayerHub();
    const clientA = new MultiplayerClient({
      transportFactory: hub.createTransportFactory()
    });
    const clientB = new MultiplayerClient({
      transportFactory: hub.createTransportFactory()
    });

    clientA.connect();
    await new Promise((r) => setTimeout(r, 10));
    expect(gameStore.getState().multiplayer.status).toBe('connected');
    expect(gameStore.getState().multiplayer.visitorCount).toBe(1);

    clientB.connect();
    await new Promise((r) => setTimeout(r, 10));
    expect(gameStore.getState().multiplayer.visitorCount).toBe(2);

    // Move Client A a legal single-tick distance (0.5m) and broadcast server tick
    clientA.sendMoveUpdate([0.3, 0.1, 17.6], [0, 0, -4.0], Math.PI, 'Walking');
    hub.stepServerTick();

    // Client B's store and mutableRuntimeState now contain Client A's updated transform
    const sidA = clientA.getSessionId()!;
    const remoteEntryOnB = mutableRuntimeState.remotePlayers.get(sidA);
    expect(remoteEntryOnB).toBeDefined();
    expect(remoteEntryOnB?.snapshots.at(-1)?.position[0]).toBeCloseTo(0.3, 2);
    expect(remoteEntryOnB?.snapshots.at(-1)?.position[2]).toBeCloseTo(17.6, 2);
    expect(remoteEntryOnB?.snapshots.at(-1)?.locomotionState).toBe('Walking');

    // Immediate state-transition broadcast when input resets to Idle (e.g., tab backgrounding, Edge Case 6)
    mutableRuntimeState.avatar.locomotionState = 'Idle';
    clientA.stepFrame(1 / 60, Date.now() + 10);
    hub.stepServerTick();
    expect(mutableRuntimeState.remotePlayers.get(sidA)?.snapshots.at(-1)?.locomotionState).toBe(
      'Idle'
    );

    // Toggle shared Stone Garden Lantern from Client A -> reflected in store
    const initialLantern = gameStore.getState().propStates['prop-stone-lantern']?.active ?? false;
    clientA.sendPropInteraction('prop-stone-lantern');
    expect(gameStore.getState().propStates['prop-stone-lantern']?.active).toBe(!initialLantern);

    // Cleanly disconnect Client A -> visitorCount drops to 1 and remote player removed
    clientA.disconnect(true);
    expect(mutableRuntimeState.remotePlayers.has(sidA)).toBe(false);
    clientB.disconnect(true);
  });

  it('smoothly blends minor authoritative discrepancies (< 2.0m) over ~150ms and immediately snaps large discrepancies (>= 2.0m) (VR-007, Clarification #3)', () => {
    const hub = new InMemoryMultiplayerHub();
    const client = new MultiplayerClient({
      transportFactory: hub.createTransportFactory()
    });

    mutableRuntimeState.avatar.position = [0, 0.1, 18];

    // 1. Minor discrepancy (0.8m < 2.0m): sets pendingOffset and smoothly blends across frames
    client.reconcileLocalPlayer([0.8, 0.1, 18], true, 1);
    expect(mutableRuntimeState.avatar.position[0]).toBeCloseTo(0, 3);
    expect(mutableRuntimeState.reconciliation.pendingOffset[0]).toBeCloseTo(0.8, 3);

    // Step 10 frames at 60 FPS (~166ms) -> smoothly approaches 0.8
    for (let i = 0; i < 10; i++) {
      client.stepFrame(1 / 60);
    }
    expect(mutableRuntimeState.avatar.position[0]).toBeGreaterThan(0.6);
    expect(mutableRuntimeState.avatar.position[0]).toBeLessThanOrEqual(0.8);

    // 2. Large discrepancy (3.5m >= 2.0m): immediately snaps on the same tick
    client.reconcileLocalPlayer([4.5, 0.1, 18], true, 2);
    expect(mutableRuntimeState.avatar.position[0]).toBeCloseTo(4.5, 3);
    expect(mutableRuntimeState.reconciliation.pendingOffset[0]).toBe(0);
  });

  it('automatically reconnects after a temporary network drop within the 30s grace window and supports manual Reconnect after retry exhaustion (SC-007, SC-008)', async () => {
    const hub = new InMemoryMultiplayerHub();
    const client = new MultiplayerClient({
      transportFactory: hub.createTransportFactory(),
      maxReconnectAttempts: 3,
      reconnectBackoffMs: [30, 50, 80]
    });

    client.connect();
    await new Promise((r) => setTimeout(r, 15));
    const initialSessionId = client.getSessionId();
    const initialDisplayName = gameStore.getState().multiplayer.localDisplayName;
    expect(gameStore.getState().multiplayer.status).toBe('connected');

    // Move a legal distance to [0.3, 0.1, 17.6]
    client.sendMoveUpdate([0.3, 0.1, 17.6], [0, 0, -4], Math.PI, 'Walking');

    // Simulate a brief 40ms network drop -> auto-reconnects and resumes exact sessionId & position
    client.simulateNetworkDrop(40);
    expect(gameStore.getState().multiplayer.status).toBe('reconnecting');

    await new Promise((r) => setTimeout(r, 120));
    expect(gameStore.getState().multiplayer.status).toBe('connected');
    expect(client.getSessionId()).toBe(initialSessionId);
    expect(gameStore.getState().multiplayer.localDisplayName).toBe(initialDisplayName);
    expect(mutableRuntimeState.avatar.position[0]).toBeCloseTo(0.3, 2);
    expect(mutableRuntimeState.avatar.position[2]).toBeCloseTo(17.6, 2);

    // Simulate an extended network outage that exhausts all 3 automatic retries
    client.simulateNetworkDrop(0);
    await new Promise((r) => setTimeout(r, 240));
    expect(gameStore.getState().multiplayer.status).toBe('disconnected');

    // Trigger manual in-app Reconnect (SC-008) -> restores connection without page reload
    client.connect();
    await new Promise((r) => setTimeout(r, 20));
    expect(gameStore.getState().multiplayer.status).toBe('connected');
    expect(client.getSessionId()).toBe(initialSessionId);

    client.disconnect(true);
  });
});
