import { describe, expect, it } from 'vitest';
import {
  createRemotePlayerInterpolationState,
  interpolateYawShortestArc,
  pushRemotePlayerSnapshot,
  sampleRemotePlayerTransform
} from '../src';

describe('RemotePlayerInterpolator (US2, FR-008, SC-003)', () => {
  it('interpolates position and shortest-arc yaw smoothly at 60 FPS without teleporting', () => {
    const buffer = createRemotePlayerInterpolationState(
      {
        sessionId: 'sess_remote_1',
        displayName: 'Explorer #101',
        accentColor: '#10b981',
        position: [0, 0.1, 18],
        velocity: [0, 0, -4],
        facingYaw: Math.PI - 0.1,
        locomotionState: 'Walking',
        sequence: 1,
        serverTimestamp: 1000
      },
      1000
    );

    // Push second snapshot 100ms later moving 0.4m north and wrapping yaw across PI / -PI
    const accepted = pushRemotePlayerSnapshot(
      buffer,
      {
        sessionId: 'sess_remote_1',
        displayName: 'Explorer #101',
        accentColor: '#10b981',
        position: [0, 0.1, 17.6],
        velocity: [0, 0, -4],
        facingYaw: -Math.PI + 0.1,
        locomotionState: 'Walking',
        sequence: 2,
        serverTimestamp: 1100
      },
      1100
    );
    expect(accepted).toBe(true);

    // Reject stale sequence (1 < 2)
    const staleAccepted = pushRemotePlayerSnapshot(
      buffer,
      {
        sessionId: 'sess_remote_1',
        displayName: 'Explorer #101',
        accentColor: '#10b981',
        position: [5, 0.1, 5],
        velocity: [0, 0, 0],
        facingYaw: 0,
        locomotionState: 'Idle',
        sequence: 1,
        serverTimestamp: 1050
      },
      1120
    );
    expect(staleAccepted).toBe(false);

    // Step 6 frames at 60 FPS across the [1000, 1100] bracket (with 100ms delay -> renderTimestamp 1100..1200)
    let prevZ = buffer.renderPosition[2];
    for (let t = 1116; t <= 1200; t += 16) {
      const sampled = sampleRemotePlayerTransform(buffer, t, 1 / 60, 100);
      expect(sampled.position[2]).toBeLessThanOrEqual(prevZ);
      expect(sampled.position[2]).toBeGreaterThanOrEqual(17.55);
      // Shortest arc between +3.04 and -3.04 stays near +-PI (never swings through 0)
      expect(Math.abs(sampled.facingYaw)).toBeGreaterThan(2.8);
      prevZ = sampled.position[2];
    }
  });

  it('bridges brief packet jitter (<= 250ms) and transitions to Idle if gap exceeds 250ms (Edge Case 3)', () => {
    const buffer = createRemotePlayerInterpolationState(
      {
        sessionId: 'sess_remote_2',
        displayName: 'Explorer #102',
        accentColor: '#f59e0b',
        position: [0, 0.1, 15],
        velocity: [0, 0, -4],
        facingYaw: Math.PI,
        locomotionState: 'Running',
        sequence: 1,
        serverTimestamp: 1000
      },
      1000
    );

    pushRemotePlayerSnapshot(
      buffer,
      {
        sessionId: 'sess_remote_2',
        displayName: 'Explorer #102',
        accentColor: '#f59e0b',
        position: [0, 0.1, 14.6],
        velocity: [0, 0, -4],
        facingYaw: Math.PI,
        locomotionState: 'Running',
        sequence: 2,
        serverTimestamp: 1050
      },
      1050
    );

    // 100ms overrun past latest snapshot (renderTimestamp = 1250, targetTime = 1150 -> 100ms past 1050)
    const jitterSample = sampleRemotePlayerTransform(buffer, 1250, 1 / 60, 100);
    expect(jitterSample.locomotionState).toBe('Running');

    // 350ms overrun past latest snapshot -> clamps extrapolation and falls back to Idle
    const staleSample = sampleRemotePlayerTransform(buffer, 1500, 1 / 60, 100);
    expect(staleSample.locomotionState).toBe('Idle');
  });

  it('computes shortest-arc angular lerp across the -PI / +PI boundary', () => {
    const mid = interpolateYawShortestArc(Math.PI - 0.2, -Math.PI + 0.2, 0.5);
    expect(Math.abs(Math.abs(mid) - Math.PI)).toBeLessThan(1e-4);
  });
});
