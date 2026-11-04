import type {
  LocomotionState,
  RemotePlayerInterpolationState,
  RemoteTransformSnapshot
} from '../types';
import {
  INTERPOLATION_DELAY_MS,
  MAX_EXTRAPOLATION_MS,
  type SerializedPlayerState
} from './protocol';

export const MAX_SNAPSHOT_BUFFER_SIZE = 10;

/**
 * Shortest-arc angular interpolation between two yaw angles in radians (`[-PI, PI]`) using factor `t ∈ [0, 1]`.
 */
export function interpolateYawShortestArc(fromYaw: number, toYaw: number, t: number): number {
  let diff = ((toYaw - fromYaw + Math.PI) % (2 * Math.PI));
  if (diff < 0) diff += 2 * Math.PI;
  diff -= Math.PI;
  const raw = fromYaw + diff * Math.min(1, Math.max(0, t));
  let norm = ((raw + Math.PI) % (2 * Math.PI));
  if (norm < 0) norm += 2 * Math.PI;
  return norm - Math.PI;
}

export function createRemotePlayerInterpolationState(
  initial: SerializedPlayerState,
  receivedAt = Date.now()
): RemotePlayerInterpolationState {
  const firstSnapshot: RemoteTransformSnapshot = {
    position: [...initial.position],
    velocity: [...initial.velocity],
    facingYaw: initial.facingYaw,
    locomotionState: initial.locomotionState,
    sequence: initial.sequence,
    serverTimestamp: initial.serverTimestamp,
    receivedAt
  };

  return {
    sessionId: initial.sessionId,
    displayName: initial.displayName,
    accentColor: initial.accentColor,
    snapshots: [firstSnapshot],
    renderPosition: [...initial.position],
    renderYaw: initial.facingYaw,
    renderLocomotionState: initial.locomotionState,
    lastUpdatedAt: receivedAt
  };
}

/**
 * Pushes an incoming authoritative player snapshot into the remote player's ring buffer.
 * Discards out-of-order snapshots (`sequence < latest.sequence`, or duplicate sequence with older timestamp).
 */
export function pushRemotePlayerSnapshot(
  buffer: RemotePlayerInterpolationState,
  snapshot: SerializedPlayerState,
  receivedAt = Date.now()
): boolean {
  const len = buffer.snapshots.length;
  const latest = len > 0 ? buffer.snapshots[len - 1] : undefined;
  if (latest) {
    // Reject strictly older sequence numbers (Edge Case 3)
    if (snapshot.sequence < latest.sequence) {
      return false;
    }
    // If sequence is identical and position/yaw/locomotion haven't changed, update timestamp in place
    if (
      snapshot.sequence === latest.sequence &&
      Math.hypot(
        snapshot.position[0] - latest.position[0],
        snapshot.position[1] - latest.position[1],
        snapshot.position[2] - latest.position[2]
      ) < 1e-4 &&
      Math.abs(snapshot.facingYaw - latest.facingYaw) < 1e-4 &&
      snapshot.locomotionState === latest.locomotionState
    ) {
      latest.receivedAt = receivedAt;
      latest.serverTimestamp = snapshot.serverTimestamp;
      buffer.lastUpdatedAt = receivedAt;
      return false;
    }
  }

  // Ensure monotonic receivedAt timestamps for smooth interpolation bracket evaluation
  const prevReceivedAt = latest ? latest.receivedAt : receivedAt - 50;
  const monotonicReceivedAt = Math.max(receivedAt, prevReceivedAt + 1);

  buffer.displayName = snapshot.displayName;
  buffer.accentColor = snapshot.accentColor;
  buffer.snapshots.push({
    position: [...snapshot.position],
    velocity: [...snapshot.velocity],
    facingYaw: snapshot.facingYaw,
    locomotionState: snapshot.locomotionState,
    sequence: snapshot.sequence,
    serverTimestamp: snapshot.serverTimestamp,
    receivedAt: monotonicReceivedAt
  });

  if (buffer.snapshots.length > MAX_SNAPSHOT_BUFFER_SIZE) {
    buffer.snapshots.splice(0, buffer.snapshots.length - MAX_SNAPSHOT_BUFFER_SIZE);
  }

  buffer.lastUpdatedAt = receivedAt;
  return true;
}

/**
 * Advances the interpolated `renderPosition`, `renderYaw` (shortest-arc angle lerp),
 * and `renderLocomotionState` for a remote player at 60–120 Hz (`FR-008`, `SC-003`).
 */
export function sampleRemotePlayerTransform(
  buffer: RemotePlayerInterpolationState,
  renderTimestamp = Date.now(),
  dt = 1 / 60,
  interpolationDelayMs = INTERPOLATION_DELAY_MS
): {
  position: [number, number, number];
  facingYaw: number;
  locomotionState: LocomotionState;
} {
  const snapshots = buffer.snapshots;
  if (snapshots.length === 0) {
    return {
      position: [...buffer.renderPosition],
      facingYaw: buffer.renderYaw,
      locomotionState: buffer.renderLocomotionState
    };
  }

  if (snapshots.length === 1) {
    const only = snapshots[0];
    if (!only) {
      return {
        position: [...buffer.renderPosition],
        facingYaw: buffer.renderYaw,
        locomotionState: buffer.renderLocomotionState
      };
    }
    const blend = Math.min(1, dt * 16);
    buffer.renderPosition[0] += (only.position[0] - buffer.renderPosition[0]) * blend;
    buffer.renderPosition[1] += (only.position[1] - buffer.renderPosition[1]) * blend;
    buffer.renderPosition[2] += (only.position[2] - buffer.renderPosition[2]) * blend;
    buffer.renderYaw = interpolateYawShortestArc(buffer.renderYaw, only.facingYaw, blend);
    buffer.renderLocomotionState = only.locomotionState;
    return {
      position: [...buffer.renderPosition],
      facingYaw: buffer.renderYaw,
      locomotionState: buffer.renderLocomotionState
    };
  }

  const targetTime = renderTimestamp - interpolationDelayMs;
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  if (!first || !last) {
    return {
      position: [...buffer.renderPosition],
      facingYaw: buffer.renderYaw,
      locomotionState: buffer.renderLocomotionState
    };
  }

  let desiredPos: [number, number, number];
  let desiredYaw: number;
  let desiredState: LocomotionState;

  if (targetTime <= first.receivedAt) {
    desiredPos = [...first.position];
    desiredYaw = first.facingYaw;
    desiredState = first.locomotionState;
  } else if (targetTime >= last.receivedAt) {
    // Brief bounded extrapolation during packet jitter (<= 250ms, Edge Case 3)
    const overrunMs = Math.min(MAX_EXTRAPOLATION_MS, Math.max(0, targetTime - last.receivedAt));
    const overrunSec = overrunMs / 1000;
    const damping = 1 - overrunMs / (MAX_EXTRAPOLATION_MS * 1.5);
    desiredPos = [
      last.position[0] + last.velocity[0] * overrunSec * damping,
      Math.max(0.1, last.position[1] + last.velocity[1] * overrunSec * damping),
      last.position[2] + last.velocity[2] * overrunSec * damping
    ];
    desiredYaw = last.facingYaw;
    desiredState =
      targetTime - last.receivedAt > MAX_EXTRAPOLATION_MS ? 'Idle' : last.locomotionState;
  } else {
    // Find bracket [snapA, snapB] containing targetTime
    let snapA = first;
    let snapB = last;
    for (let i = 0; i < snapshots.length - 1; i++) {
      const curr = snapshots[i];
      const next = snapshots[i + 1];
      if (curr && next && curr.receivedAt <= targetTime && targetTime <= next.receivedAt) {
        snapA = curr;
        snapB = next;
        break;
      }
    }

    const span = Math.max(1, snapB.receivedAt - snapA.receivedAt);
    const alpha = Math.min(1, Math.max(0, (targetTime - snapA.receivedAt) / span));

    desiredPos = [
      snapA.position[0] + (snapB.position[0] - snapA.position[0]) * alpha,
      snapA.position[1] + (snapB.position[1] - snapA.position[1]) * alpha,
      snapA.position[2] + (snapB.position[2] - snapA.position[2]) * alpha
    ];
    desiredYaw = interpolateYawShortestArc(snapA.facingYaw, snapB.facingYaw, alpha);
    desiredState = alpha < 0.5 ? snapA.locomotionState : snapB.locomotionState;
  }

  // Smooth exponential damping onto renderPosition & renderYaw so transitions between brackets are C1 continuous
  const smoothFactor = Math.min(1, dt * 22);
  buffer.renderPosition[0] += (desiredPos[0] - buffer.renderPosition[0]) * smoothFactor;
  buffer.renderPosition[1] += (desiredPos[1] - buffer.renderPosition[1]) * smoothFactor;
  buffer.renderPosition[2] += (desiredPos[2] - buffer.renderPosition[2]) * smoothFactor;
  buffer.renderYaw = interpolateYawShortestArc(buffer.renderYaw, desiredYaw, smoothFactor);
  buffer.renderLocomotionState = desiredState;

  return {
    position: [...buffer.renderPosition],
    facingYaw: buffer.renderYaw,
    locomotionState: buffer.renderLocomotionState
  };
}
