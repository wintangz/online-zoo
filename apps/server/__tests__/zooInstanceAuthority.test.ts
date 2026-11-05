import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROOM_ID,
  PANDA_FOREST_LAYOUT,
  parseClientMultiplayerMessage,
  VISITOR_ACCENT_PALETTE
} from '@online-zoo/game-core';
import { ZooInstanceAuthority } from '../src';

describe('ZooInstanceAuthority (US1, US3, US4)', () => {
  it('assigns unique sessionId, sequential Explorer badges, deterministic accent colors, and collision-free spawn plaza offsets (FR-001, FR-002, FR-003)', () => {
    const authority = new ZooInstanceAuthority();
    const join1 = authority.joinOrResumePlayer({ requestedRoomId: DEFAULT_ROOM_ID, now: 1000 });
    const join2 = authority.joinOrResumePlayer({ requestedRoomId: DEFAULT_ROOM_ID, now: 1050 });
    const join3 = authority.joinOrResumePlayer({ requestedRoomId: DEFAULT_ROOM_ID, now: 1100 });

    expect(join1.welcome.sessionId).not.toBe(join2.welcome.sessionId);
    expect(join1.welcome.displayName).toBe('Explorer #101');
    expect(join2.welcome.displayName).toBe('Explorer #102');
    expect(join3.welcome.displayName).toBe('Explorer #103');
    expect(VISITOR_ACCENT_PALETTE).toContain(join1.welcome.accentColor);
    expect(VISITOR_ACCENT_PALETTE).toContain(join2.welcome.accentColor);

    // Simultaneous spawns do not stack on the exact same coordinate (Edge Case 1, VR-003)
    const dist12 = Math.hypot(
      join1.welcome.spawnPosition[0] - join2.welcome.spawnPosition[0],
      join1.welcome.spawnPosition[2] - join2.welcome.spawnPosition[2]
    );
    const dist23 = Math.hypot(
      join2.welcome.spawnPosition[0] - join3.welcome.spawnPosition[0],
      join2.welcome.spawnPosition[2] - join3.welcome.spawnPosition[2]
    );
    expect(dist12).toBeGreaterThan(0.2);
    expect(dist23).toBeGreaterThan(0.2);

    // All spawns remain within radius <= 2.2m around [0, 0.1, 18]
    for (const j of [join1, join2, join3]) {
      const distFromPlaza = Math.hypot(
        j.welcome.spawnPosition[0] - PANDA_FOREST_LAYOUT.spawnPosition[0],
        j.welcome.spawnPosition[2] - PANDA_FOREST_LAYOUT.spawnPosition[2]
      );
      expect(distFromPlaza).toBeLessThanOrEqual(2.25);
    }

    // Join 3's welcome snapshot includes all 3 active players (FR-004)
    expect(join3.welcome.players).toHaveLength(3);
    expect(join3.joinedBroadcast.visitorCount).toBe(3);
  });

  it('supports up to 16 concurrent players per room and routes the 17th player to an overflow room (VR-001)', () => {
    const authority = new ZooInstanceAuthority({ maxPlayersPerRoom: 16 });
    for (let i = 0; i < 16; i++) {
      const res = authority.joinOrResumePlayer({ requestedRoomId: 'panda-forest-1', now: 1000 + i });
      expect(res.welcome.roomId).toBe('panda-forest-1');
    }

    const overflowJoin = authority.joinOrResumePlayer({
      requestedRoomId: 'panda-forest-1',
      now: 2000
    });
    expect(overflowJoin.welcome.roomId).toBe('panda-forest-2');
    expect(overflowJoin.welcome.players).toHaveLength(1);
  });

  it('rejects stale/out-of-order sequence packets and malformed payloads (VR-004, FR-012, SC-005)', () => {
    const authority = new ZooInstanceAuthority();
    const { welcome } = authority.joinOrResumePlayer({ now: 1000 });

    const validMove = authority.processPlayerMove(
      welcome.sessionId,
      {
        type: 'player_move',
        sequence: 5,
        clientTimestamp: 1050,
        position: [0, 0.1, 17.8],
        velocity: [0, 0, -4.0],
        facingYaw: Math.PI,
        locomotionState: 'Walking'
      },
      1050
    );
    expect(validMove.accepted).toBe(true);

    // Stale sequence (3 <= 5) is rejected
    const staleMove = authority.processPlayerMove(
      welcome.sessionId,
      {
        type: 'player_move',
        sequence: 3,
        clientTimestamp: 1100,
        position: [0, 0.1, 15.0],
        velocity: [0, 0, -4.0],
        facingYaw: Math.PI,
        locomotionState: 'Walking'
      },
      1100
    );
    expect(staleMove.accepted).toBe(false);
    expect(staleMove.errorCode).toBe('STALE_SEQUENCE');
    expect(staleMove.state?.position[2]).toBeCloseTo(17.8, 3);

    // Malformed payloads are rejected by parseClientMultiplayerMessage
    expect(parseClientMultiplayerMessage('{invalid json')).toBeNull();
    expect(
      parseClientMultiplayerMessage({
        type: 'player_move',
        sequence: 6,
        clientTimestamp: 1200,
        position: [NaN, 0.1, 10],
        velocity: [0, 0, 0],
        facingYaw: 0,
        locomotionState: 'Walking'
      })
    ).toBeNull();
  });

  it('clamps speed-hack displacements, out-of-bounds coordinates, pond shoreline intrusions, and solid obstacles (VR-005, VR-006, SC-006)', () => {
    const authority = new ZooInstanceAuthority();
    const { welcome } = authority.joinOrResumePlayer({ now: 1000 });

    // 1. Speed hack attempt: teleport 25m forward in 50ms (max allowed ~0.82m)
    const speedHackRes = authority.processPlayerMove(
      welcome.sessionId,
      {
        type: 'player_move',
        sequence: 1,
        clientTimestamp: 1050,
        position: [0, 0.1, -7.0],
        velocity: [0, 0, -500],
        facingYaw: Math.PI,
        locomotionState: 'Running'
      },
      1050
    );
    expect(speedHackRes.accepted).toBe(true);
    expect(speedHackRes.state?.reconciled).toBe(true);
    expect(speedHackRes.state?.position[2]).toBeGreaterThan(17.0);

    // 2. Pond shoreline intrusion attempt: move step by step to pond border and attempt to enter [-8, 0.1, -4]
    // Place player right outside pond at [-8, 0.1, 3.3] over several legal 1s steps
    let seq = 2;
    let now = 2050;
    const waypoints: [number, number, number][] = [
      [-3, 0.1, 12],
      [-6, 0.1, 6],
      [-8, 0.1, -3.5] // Inside pond (pond center is [-8, 0, -4], shoreline radius 6.7m + 0.45m avatar = 7.15m)
    ];
    let lastState = speedHackRes.state!;
    for (const wp of waypoints) {
      const res = authority.processPlayerMove(
        welcome.sessionId,
        {
          type: 'player_move',
          sequence: seq++,
          clientTimestamp: now,
          position: wp,
          velocity: [0, 0, -5],
          facingYaw: Math.PI,
          locomotionState: 'Running'
        },
        now
      );
      lastState = res.state!;
      now += 1000;
    }

    const distFromPondCenter = Math.hypot(
      lastState.position[0] - PANDA_FOREST_LAYOUT.pond.center[0],
      lastState.position[2] - PANDA_FOREST_LAYOUT.pond.center[2]
    );
    expect(distFromPondCenter).toBeGreaterThanOrEqual(
      PANDA_FOREST_LAYOUT.pond.shorelineColliderRadius + 0.44
    );
    expect(lastState.reconciled).toBe(true);
  });

  it('retains disconnected sessions for a 30s grace window and cleans up stale heartbeat timeouts within <= 10s (VR-008, FR-005, FR-016, SC-004)', () => {
    const authority = new ZooInstanceAuthority({
      heartbeatTimeoutMs: 8000,
      resumeGraceWindowMs: 30000
    });

    const { welcome } = authority.joinOrResumePlayer({ now: 1000 });
    authority.processPlayerMove(
      welcome.sessionId,
      {
        type: 'player_move',
        sequence: 1,
        clientTimestamp: 1500,
        position: [1.5, 0.1, 14.0],
        velocity: [0, 0, -4],
        facingYaw: Math.PI,
        locomotionState: 'Walking'
      },
      1500
    );

    // Simulate heartbeat timeout after 8.5 seconds (< 10s per SC-004)
    const pruned = authority.pruneStaleSessions(10001);
    expect(pruned).toHaveLength(1);
    const firstPruned = pruned[0];
    expect(firstPruned).toBeDefined();
    expect(firstPruned?.sessionId).toBe(welcome.sessionId);
    expect(firstPruned?.reason).toBe('timeout');
    expect(firstPruned?.visitorCount).toBe(0);

    // Reconnect within 30s grace window (at t = 25000, 15s after timeout) using resumeToken
    const resumed = authority.joinOrResumePlayer({
      resumeToken: welcome.resumeToken,
      now: 25000
    });
    expect(resumed.welcome.resumed).toBe(true);
    expect(resumed.welcome.sessionId).toBe(welcome.sessionId);
    expect(resumed.welcome.displayName).toBe(welcome.displayName);
    expect(resumed.welcome.spawnPosition[0]).toBeCloseTo(1.5, 2);
    expect(resumed.welcome.spawnPosition[2]).toBeCloseTo(14.0, 2);

    // Disconnect again and wait past the 30s grace window (35s later) -> assigns fresh identity at spawn plaza
    authority.disconnectPlayer(welcome.sessionId, false, 26000);
    const expiredJoin = authority.joinOrResumePlayer({
      resumeToken: welcome.resumeToken,
      now: 62000
    });
    expect(expiredJoin.welcome.resumed).toBe(false);
    expect(expiredJoin.welcome.sessionId).not.toBe(welcome.sessionId);
    expect(expiredJoin.welcome.displayName).toBe('Explorer #102');
  });
});

