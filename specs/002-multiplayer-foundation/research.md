# Technical Research: Multiplayer Foundation (Feature 002)

**Feature Branch**: `002-multiplayer-foundation`  
**Date**: 2026-11-04  
**Related Spec**: [spec.md](./spec.md)

## 1. Real-Time Transport & Authoritative Server Hosting

- **Decision**: Use a stateful WebSocket server (`ws`) attached to the application HTTP server at `/ws/zoo` backed by a pure TypeScript authoritative instance engine (`ZooInstanceAuthority` in `@online-zoo/game-core`), with a pluggable `MultiplayerTransport` interface supporting WebSocket (default live multi-session transport), deterministic loopback/mock transport (for fast unit/integration tests), and local offline fallback.
- **Rationale**:
  - WebSockets provide low-latency (`< 20ms` local, `< 100ms` broadband), full-duplex framing ideal for 20 Hz transform broadcasts and immediate join/leave/prop events (`SC-001`, `SC-002`).
  - Hosting the WebSocket upgrade listener on the same HTTP server (`server.mjs` in `apps/web`) ensures `pnpm dev`, `pnpm start`, and Playwright E2E tests (`pnpm test:e2e`) launch both the 3D web client and the authoritative multiplayer room server in a single command without cross-origin or multi-port race conditions.
  - Keeping `ZooInstanceAuthority` pure and transport-agnostic in `@online-zoo/game-core` honors Constitution Principle II (Modular Architecture) and Principle VII (Testing and Verification), enabling deterministic unit and integration testing of all authority rules without spinning up OS sockets.
- **Alternatives Considered**:
  - *WebRTC DataChannels (Peer-to-Peer Mesh)*: Rejected because peer-to-peer mesh topologies lack a central server authority, violating Constitution Principle III (Multiplayer Correctness: server must validate positions and state transitions).
  - *HTTP Polling / Server-Sent Events (SSE)*: Rejected as primary transport due to higher upstream overhead for 20 Hz movement updates from multiple concurrent players.
  - *Heavy external game server frameworks (Colyseus / Socket.IO)*: Rejected because native `ws` + typed JSON protocol contracts in `@online-zoo/game-core` have zero schema compilation overhead, smaller bundle size, and full deterministic control over reconciliation and grace-window tokens.

## 2. Tick Rate, Transform Broadcast Frequency & Remote Interpolation

- **Decision**:
  - **Local Simulation**: 60–120 Hz client-side frame loop (`stepGameRuntimeTick`) with immediate client-side prediction.
  - **Client-to-Server Upstream Rate**: `20 Hz` (`50ms` interval) while moving or rotating (`locomotionState !== 'Idle'` or yaw delta `> 0.01 rad`), and `2 Hz` (`500ms` keepalive/idle sync) while stationary (`Idle`), plus immediate transmission on discrete locomotion state transitions (`Jumping`, `Walking`, `Running`, `Idle`).
  - **Server-to-Client Broadcast Rate**: `20 Hz` (`50ms` tick) room state delta/snapshot broadcast to all active sessions in the `ZooInstanceRoom`.
  - **Remote Avatar Interpolation**: Buffered snapshot interpolation (`interpolationDelayMs = 100ms`, storing the last `10` snapshots per remote player) using linear position interpolation (`lerp`), shortest-arc angular interpolation (`lerpAngle`) for `facingYaw`, and smoothed fallback extrapolation for up to `250ms` of packet jitter (`SC-003`).
- **Rationale**:
  - Sending updates at `20 Hz` (`50ms` intervals) with a `100ms` (2-packet) interpolation buffer keeps end-to-end visual reflection under `150–200ms` (`SC-002`) while absorbing typical Wi-Fi and mobile packet jitter so remote avatars never step or teleport (`SC-003`).
- **Alternatives Considered**:
  - *60 Hz Network Broadcasts*: Rejected because it triples bandwidth and main-thread JSON serialization overhead without perceptible visual gain over 20 Hz + 60 FPS Hermite/linear interpolation.
  - *Unbuffered Dead Reckoning Only*: Rejected because changes in direction cause visible overshoot and snapping on remote clients.

## 3. Authoritative Movement Validation & Local Client Reconciliation

- **Decision**:
  - Every `player_move` packet includes a monotonically increasing client `sequence` number, `clientTimestamp`, `position`, `velocity`, `facingYaw`, and `locomotionState`.
  - `ZooInstanceAuthority` validates each packet in strict sequence order:
    1. Rejects non-finite numbers, invalid locomotion enums, or stale packets (`sequence <= player.lastSequence`).
    2. Computes elapsed time `dt = clamp((now - player.lastUpdateAt) / 1000, 0.016, 1.0)` and caps maximum horizontal displacement to `maxAllowedDist = (MAX_RUN_SPEED * JITTER_TOLERANCE_FACTOR) * dt + BASE_SLACK` (`7.5 m/s * 1.25 * dt + 0.35m`). If horizontal displacement exceeds `maxAllowedDist`, the displacement vector is clamped along its direction to `maxAllowedDist`.
    3. Clamps vertical coordinate `y` to `[0.1, 4.5]`.
    4. Runs `resolveHorizontalWorldCollisions(clampedPosition, 0.45, PANDA_FOREST_LAYOUT)` so no player can enter the blocked pond shoreline (`radius: 6.7m` at `[-8, 0, -4]`), penetrate any of the 22 solid obstacles, or exit the `36m` perimeter fence (`FR-011`, `SC-006`).
  - **Client Reconciliation (`Clarification #3`, `FR-012`)**:
    - When the local client receives its own authoritative transform in the room snapshot, it computes the horizontal Euclidean discrepancy `d` between its current predicted position (or unacknowledged sequence state) and the server-clamped position when `reconciled === true`:
      - If `0.05m < d < 2.0m`: Smoothly blends the local avatar toward the authoritative position over `~150ms` (`reconciliationBlendRate = 12.0`).
      - If `d >= 2.0m`: Immediately snaps the local avatar to the authoritative position and zeroes horizontal velocity.
- **Rationale**:
  - Satisfies Constitution Principle III (never trust client-provided positions) while preventing jarring camera/avatar micro-snaps during normal network jitter (`< 2.0m`).
- **Alternatives Considered**:
  - *Hard-snapping on any discrepancy (`> 0.01m`)*: Rejected because normal latency between a 20 Hz server tick and 60 Hz local movement creates `0.1m–0.4m` phase differences that would cause constant visual stutter if hard-snapped.

## 4. Session Identity, Spawn Plaza Distribution & 30s Reconnection Grace Window

- **Decision**:
  - **Session Identity (`Clarification #1 & #4`, `FR-002`)**: On initial join, the server assigns:
    - `sessionId`: Unique ID (e.g., `sess_<8-char-hex>`)
    - `resumeToken`: Secret per-session token (e.g., `tok_<16-char-hex>`) stored in client memory/`sessionStorage`
    - `displayName`: Sequential friendly visitor badge `"Explorer #101"`, `"Explorer #102"`, etc.
    - `accentColor`: Deterministic hex color selected from an 8-color stylized park palette based on a hash of `sessionId`.
  - **Collision-Free Spawn Ring (`FR-003`)**:
    - Instead of placing all joining players on exact `[0, 0.1, 18]`, `ZooInstanceAuthority.computeSpawnPosition(slotIndex)` distributes spawns along a golden-angle spiral within `radius <= 2.2m` around `[0, 0.1, 18]` on the entry plaza (`z ∈ [16.0, 20.0]`, `x ∈ [-2.2, 2.2]`), verified against `resolveHorizontalWorldCollisions`.
  - **Heartbeat Timeout & 30-Second Grace Window (`Clarification #1`, `FR-005`, `FR-016`, `SC-004`, `SC-007`)**:
    - Clients send `ping` heartbeats every `2.5 seconds`.
    - If a socket closes unexpectedly or misses heartbeats for `8 seconds` (`< 10s` per `SC-004`), the server marks the player disconnected, immediately broadcasts `player_left` so remote clients remove the stale avatar within `<= 10 seconds`, and moves the session record into `disconnectedSessions` for `30 seconds` (`RESUME_GRACE_WINDOW_MS = 30_000`).
    - If the client reconnects and sends `join_instance` with its `resumeToken` within `30 seconds`, the server restores the exact `sessionId`, `displayName`, `accentColor`, and last valid authoritative `position`/`facingYaw`, and broadcasts `player_joined` to peers.
- **Rationale**:
  - Directly fulfills `FR-002`, `FR-003`, `FR-005`, `FR-016`, `SC-004`, `SC-007`, and Clarifications #1 and #4 without any persistent database storage (`FR-013`, `SC-009`).
- **Alternatives Considered**:
  - *Keeping disconnected avatars frozen in-world for the full 30 seconds*: Rejected because `SC-004` requires stale avatars from abrupt disconnects to be cleaned up from the visible world within `10 seconds`.

## 5. Pass-Through Avatar Rendering & Non-Blocking Offline Fallback

- **Decision**:
  - **Pass-Through Remote Avatars (`Clarification #2`, `FR-003`, `FR-006`)**: Remote avatars are rendered in `@online-zoo/game-client` as pure Three.js visual hierarchies (`RemotePlayerAvatar.tsx`) without Rapier solid colliders, guaranteeing zero player-to-player physical blocking while maintaining 60 FPS performance (`< 50` draw calls) up to 16 players.
  - **Overhead Visitor Badges (`Clarification #4`, `FR-009`)**: Each remote avatar renders a lightweight `@react-three/drei` `<Html>` or canvas-textured billboard badge above its head displaying `displayName` (`"Explorer #NNN"`) with a colored dot matching `accentColor`.
  - **Non-Blocking Offline Fallback (`Clarification #5`, `FR-014`–`FR-017`, `SC-008`)**:
    - `MultiplayerClient` manages connection lifecycle states (`'connecting' | 'connected' | 'reconnecting' | 'disconnected'`).
    - Automatic reconnection attempts up to `5` retries with backoff (`500ms`, `1000ms`, `2000ms`, `3000ms`, `4000ms` — completing well within the `10s` outage + `5s` recovery budget of `SC-007`).
    - If all automatic retries fail or the server is unreachable, the client transitions to `'disconnected'` (Offline Fallback mode): local Panda Forest gameplay continues uninterrupted, and the HUD displays a `"Disconnected • Local Mode"` badge alongside an interactive `"Reconnect to Zoo"` button (`data-testid="reconnect-multiplayer-btn"`).
- **Rationale**:
  - Ensures that network state never blocks or freezes the 60 Hz 3D render loop (`SC-005`) and gives players one-click in-app recovery (`SC-008`).

