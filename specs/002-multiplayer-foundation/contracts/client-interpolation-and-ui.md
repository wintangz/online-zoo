# Contract: Client Multiplayer Session, Remote Interpolation & UI Overlays

**Feature Branch**: `002-multiplayer-foundation`  
**Packages**: `@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/ui`

---

## 1. `MultiplayerClient` & `RemotePlayerInterpolator` (`@online-zoo/game-core`)

### 1.1 `MultiplayerClient` Interface

```ts
export interface MultiplayerClientOptions {
  url?: string; // Default: auto-derived ws(s)://<window.location.host>/ws/zoo
  roomId?: string; // Default: 'panda-forest-1' or ?room= query param
  maxReconnectAttempts?: number; // Default: 5
  reconnectBackoffMs?: number[]; // Default: [500, 1000, 2000, 3000, 4000]
  heartbeatIntervalMs?: number; // Default: 2500
  sendRateHz?: number; // Default: 20 (50ms)
  transportFactory?: (url: string) => MultiplayerTransportAdapter;
}

export class MultiplayerClient {
  constructor(options?: MultiplayerClientOptions);

  /** Initiates connection (or manual reconnection from 'disconnected' state) */
  connect(): void;

  /** Cleanly leaves the room and closes the active transport */
  disconnect(cleanLeave?: boolean): void;

  /** Simulates a temporary network drop for testing reconnection recovery (SC-007, SC-008) */
  simulateNetworkDrop(dropDurationMs?: number): void;

  /** Called every frame inside stepGameRuntimeTick to send throttled move updates and step remote interpolation + local reconciliation */
  stepFrame(dt: number, now?: number): void;

  /** Sends a shared prop interaction event to the instance authority */
  sendPropInteraction(objectId: string): void;
}
```

### 1.2 `RemotePlayerInterpolator` Functions

```ts
/**
 * Pushes an incoming authoritative player snapshot into the remote player's ring buffer.
 * Discards out-of-order snapshots (sequence <= latest sequence).
 */
export function pushRemotePlayerSnapshot(
  buffer: RemotePlayerInterpolationState,
  snapshot: SerializedPlayerState,
  receivedAt: number
): void;

/**
 * Advances the interpolated renderPosition, renderYaw (shortest-arc angle lerp),
 * and renderLocomotionState for a remote player at 60-120 Hz.
 */
export function sampleRemotePlayerTransform(
  buffer: RemotePlayerInterpolationState,
  renderTimestamp: number,
  dt: number,
  interpolationDelayMs?: number // Default: 100ms
): {
  position: [number, number, number];
  facingYaw: number;
  locomotionState: LocomotionState;
};
```

---

## 2. 3D Remote Avatar Rendering (`@online-zoo/game-client`)

### 2.1 `RemotePlayersLayer` & `RemotePlayerAvatar`

- `RemotePlayersLayer` subscribes to `gameStore`'s discrete `multiplayer.remoteVisitors` dictionary (`Record<string, RemoteVisitorSummary>`) so React mounts/unmounts `<RemotePlayerAvatar key={sessionId} ... />` ONLY when a player joins or leaves (`FR-004`, `FR-005`).
- Inside `<RemotePlayerAvatar sessionId={...} />`, `useFrame` reads `mutableRuntimeState.remotePlayers.get(sessionId)` directly at 60–120 Hz with **zero React re-renders during movement** (`Performance Goal`).
- Each remote avatar:
  - Uses a cloned GLB explorer mesh with its hat/outfit accent material tinted to `accentColor` (`Clarification #4`, `FR-009`).
  - Animates `Idle`, `Walking`, `Running`, and `Jumping` procedural limb cycles matching `renderLocomotionState` (`FR-009`).
  - Renders a non-intrusive overhead visitor badge (`data-testid="remote-visitor-badge-{sessionId}"`) displaying `displayName` (`"Explorer #NNN"`).
  - Has **no solid physics collider** (`Clarification #2`, `FR-003`, `FR-006`) so players can walk smoothly through one another without body-blocking pathways or spawn points.

---

## 3. HUD Connection Status & Reconnect UI (`@online-zoo/ui`)

### 3.1 `GameHudOverlay` Multiplayer Additions (`FR-014`–`FR-017`)

| Element Test ID | Condition | Visual Content |
| :--- | :--- | :--- |
| `data-testid="multiplayer-status-badge"` | Always visible in HUD (`phase === 'playing'`) | Displays connection indicator dot + status label (`Connected`, `Connecting...`, `Reconnecting (N/5)...`, or `Disconnected (Offline Mode)`) |
| `data-testid="visitor-count-badge"` | Always visible in HUD (`phase === 'playing'`) | Displays active visitor count in the instance (e.g., `Visitors: 2` or `1 Visitor`) |
| `data-testid="local-visitor-badge"` | When `localDisplayName` is assigned | Displays local player's assigned park badge (e.g., `Explorer #101`) with their accent color dot |
| `data-testid="reconnect-multiplayer-btn"` | Visible when `status === 'disconnected'` or `status === 'reconnecting'` | Interactive button `"Reconnect to Zoo"` that invokes `multiplayerClient.connect()` in-place without reloading the page (`FR-017`, `SC-008`) |

