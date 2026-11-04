---
description: "Task list for Feature 002: Multiplayer Foundation"
---

# Tasks: Multiplayer Foundation

**Input**: Design documents from `/specs/002-multiplayer-foundation/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/multiplayer-protocol.md](./contracts/multiplayer-protocol.md), [contracts/client-interpolation-and-ui.md](./contracts/client-interpolation-and-ui.md), [quickstart.md](./quickstart.md)

**Tests**: Automated unit, integration, and multi-session browser E2E tests are included per Constitution Principle VII (`Testing and Verification`) and `plan.md`.

**Organization**: Tasks are grouped by user story (`US1`–`US4`) to enable independent implementation and verification of each vertical increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact repository-relative file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install WebSocket dependencies and configure unified HTTP + WebSocket scripts in `apps/web`.

- [X] T001 Add `ws` (`^8.18.0`) and `@types/ws` (`^8.5.13`) dependencies and configure unified server scripts in `apps/web/package.json`
- [X] T002 [P] Create multiplayer module barrel export file in `packages/game-core/src/multiplayer/index.ts` and re-export it from `packages/game-core/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core multiplayer types, wire protocol schemas, validation guards, and runtime/UI state slices that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Define multiplayer domain types (`MultiplayerConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'`, `RemoteVisitorSummary`, `MultiplayerSessionUIState`, `AuthoritativePlayerTransform`, `PlayerSessionRecord`, `ResumableSessionEntry`, `ZooInstanceRoom`, `RemoteTransformSnapshot`, `RemotePlayerInterpolationState`, `LocalReconciliationState`) in `packages/game-core/src/types.ts`
- [X] T004 [P] Implement wire protocol message schemas (`ClientMultiplayerMessage`, `ServerMultiplayerMessage`), the 8-color deterministic park palette (`['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4']` via `hash(sessionId) % 8` per `VR-002`), and payload sanitizer/validator helpers (`<= 4096 bytes`, finite number guards per `VR-004`) in `packages/game-core/src/multiplayer/protocol.ts`
- [X] T005 Extend `MutableGameRuntimeState` with `remotePlayers: Map<string, RemotePlayerInterpolationState>` and `reconciliation: LocalReconciliationState`, and extend `gameStore` (`GameUIStoreState`) with the `multiplayer: MultiplayerSessionUIState` slice and mutators in `packages/game-core/src/state/gameStore.ts`

**Checkpoint**: Shared contracts, protocol schemas, and state slices are ready — User Story phases can now proceed.

---

## Phase 3: User Story 1 - Enter a Shared Zoo Instance and Observe Visitors Joining and Leaving (Priority: P1) 🎯 MVP

**Goal**: Allow 2 to 16 concurrent players to enter the same Panda Forest instance, receive unique session identities (`sessionId`, `"Explorer #NNN"`, deterministic `accentColor`) and collision-free spawn plaza positions, see existing and newly joined visitors appear in the 3D scene with overhead badges, and see departed visitors removed cleanly.

**Independent Test**: Open two browser sessions at `http://localhost:3000`, enter the Panda Forest in both, verify each session displays the other player's 3D Explorer avatar with its `"Explorer #NNN"` overhead badge and updated visitor count (`2`), and verify closing one session removes its avatar from the remaining session within `1.0 second`.

### Implementation & Verification for User Story 1

- [X] T006 [US1] Implement `ZooInstanceAuthority` room lifecycle (`activeSessions.size <= maxPlayers` (`16`) with overflow room routing `panda-forest-2` per `VR-001`), sequential visitor badge assignment (`"Explorer #101"`+), deterministic accent color (`VR-002`), golden-angle spiral spawn assignment (`radius <= 2.2m` around `[0, 0.1, 18]` verified via `resolveHorizontalWorldCollisions` per `VR-003`), `joinOrResumePlayer`, and `disconnectPlayer` in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts`
- [X] T007 [US1] Implement the Node WebSocket room hub (`attachMultiplayerWebSocketServer`) binding `/ws/zoo` connections to `ZooInstanceAuthority` and broadcasting `welcome_snapshot`, `player_joined`, `player_left`, and `20 Hz` `room_state_tick` messages in `apps/web/src/server/multiplayerWsHub.ts`
- [X] T008 [US1] Create the unified Next.js + WebSocket HTTP server entry point (`/ws/zoo` on port `3000`) in `apps/web/server.mjs` and wire `apps/web/package.json` `dev` and `start` scripts to run it
- [X] T009 [US1] Implement `MultiplayerClient` connection lifecycle, `join_instance` handshake, `welcome_snapshot` / `player_joined` / `player_left` handlers populating `gameStore.multiplayer` and `mutableRuntimeState.remotePlayers`, and clean `leave_instance` teardown in `packages/game-core/src/multiplayer/multiplayerClient.ts`
- [X] T010 [P] [US1] Implement `RemotePlayerAvatar` 3D entity rendering a pass-through Explorer avatar (zero solid Rapier collider per `Clarification #2`), tinted with `accentColor`, and displaying a non-intrusive overhead visitor badge (`data-testid="remote-visitor-badge-{sessionId}"` showing `"Explorer #NNN"`) in `packages/game-client/src/entities/RemotePlayerAvatar.tsx`
- [X] T011 [P] [US1] Implement `RemotePlayersLayer` subscribing to discrete `gameStore` `multiplayer.remoteVisitors` keys to mount/unmount `RemotePlayerAvatar` instances in `packages/game-client/src/entities/RemotePlayersLayer.tsx`
- [X] T012 [US1] Update `PlayerAvatarEntity` to tint the local avatar's hat/outfit accent material when `gameStore.multiplayer.localAccentColor` is assigned in `packages/game-client/src/entities/PlayerAvatarEntity.tsx`
- [X] T013 [US1] Mount `RemotePlayersLayer` inside `PandaForestScene` (`packages/game-client/src/environment/PandaForestScene.tsx`) and initialize/dispose `MultiplayerClient` inside `ZooGameCanvas` (`packages/game-client/src/runtime/ZooGameCanvas.tsx`)
- [X] T014 [P] [US1] Add unit tests verifying `ZooInstanceAuthority` room capacity (`16` players + overflow), unique `sessionId`/`"Explorer #NNN"`/accent color assignment, collision-free spawn plaza distribution (`VR-003`), initial snapshot completeness (`FR-004`), and join/leave broadcasts in `packages/game-core/__tests__/zooInstanceAuthority.test.ts`

**Checkpoint**: User Story 1 is complete and independently testable — multiple players can join/leave the shared Panda Forest instance and see each other in 3D.

---

## Phase 4: User Story 2 - Real-Time Synchronized Avatar Movement and Animations (Priority: P2)

**Goal**: Synchronize local player 3D position, horizontal facing yaw, locomotion animation states (`Idle`, `Walking`, `Running`, `Jumping`), and shared world prop interactions (`toggle_lantern`, `ring_chime`, `rest_bench`) in near real time (`<= 200ms`), rendering remote avatars smoothly at 60 FPS via buffered snapshot interpolation with zero React re-renders.

**Independent Test**: Place two browser sessions side by side, walk, run, jump, turn 360 degrees, and toggle the Stone Garden Lantern in Session A, and verify Session B smoothly interpolates Session A's position/rotation, plays matching `Idle`/`Walking`/`Running`/`Jumping` limb animations, allows pass-through avatar movement, and reflects the updated lantern state.

### Implementation & Verification for User Story 2

- [X] T015 [P] [US2] Implement `RemotePlayerInterpolator` (`pushRemotePlayerSnapshot` discarding stale sequences `sequence <= latest`, and `sampleRemotePlayerTransform` with `100ms` interpolation delay, linear position `lerp`, shortest-arc `facingYaw` `lerpAngle`, and `<= 250ms` jitter extrapolation) in `packages/game-core/src/multiplayer/remotePlayerInterpolator.ts`
- [X] T016 [US2] Extend `MultiplayerClient.stepFrame` to transmit throttled `20 Hz` (`50ms`) `player_move` updates while moving/turning, `2 Hz` (`500ms`) idle sync, immediate state-transition updates, and shared prop interactions (`sendPropInteraction` / `prop_state_updated` sync), while stepping `sampleRemotePlayerTransform` for all remote visitors in `packages/game-core/src/multiplayer/multiplayerClient.ts`
- [X] T017 [US2] Integrate `multiplayerClient.stepFrame(dt)` and shared `world_prop` interaction broadcasting into `stepGameRuntimeTick` in `packages/game-client/src/runtime/GameLoopController.tsx` and direct 3D prop clicks in `packages/game-client/src/environment/InteractiveProps.tsx`
- [X] T018 [US2] Implement 60–120 Hz `useFrame` transform application and procedural limb animation (`Idle`, `Walking`, `Running`, `Jumping`) in `packages/game-client/src/entities/RemotePlayerAvatar.tsx` reading directly from `mutableRuntimeState.remotePlayers` with zero React re-renders
- [X] T019 [P] [US2] Add unit tests for `RemotePlayerInterpolator` (continuous 60 FPS position/yaw interpolation, shortest-arc angle wrap across `-π`/`+π`, stale sequence rejection, and `<= 250ms` packet jitter bridging) in `packages/game-core/__tests__/remotePlayerInterpolator.test.ts`

**Checkpoint**: User Stories 1 and 2 are complete — remote players move, turn, animate, and interact with shared props smoothly in real time.

---

## Phase 5: User Story 3 - Authoritative Movement Validation and Transient State Separation (Priority: P3)

**Goal**: Validate all client-submitted movement updates on the instance authority against max legal speeds, solid obstacles, the blocked pond shoreline, and perimeter boundaries, reconcile clients smoothly (`< 2.0m` blended over `~150ms`) or via immediate snap (`>= 2.0m`), and guarantee zero persistent writes for transient state.

**Independent Test**: Submit out-of-bounds coordinates (`[999, 0.1, 999]`), blocked pond coordinates (`[-8, 0.1, -4]`), solid obstacle coordinates, stale sequence numbers, or speed-hack deltas to `ZooInstanceAuthority` and verify 100% are clamped or rejected before broadcast and reconciled on the client.

### Implementation & Verification for User Story 3

- [X] T020 [US3] Implement authoritative movement validation in `ZooInstanceAuthority.processPlayerMove` enforcing sequence monotonicity (`sequence > session.transform.sequence` and finite number check per `VR-004`), maximum horizontal displacement (`maxDist = 7.5 * 1.25 * dt + 0.35` over `dt = clamp((now - lastMoveAt)/1000, 0.016, 1.0)` per `VR-005`), vertical clamp `y ∈ [0.1, 4.5]`, and `resolveHorizontalWorldCollisions(pos, 0.45, PANDA_FOREST_LAYOUT)` against the `36m` perimeter fence, `6.7m` pond shoreline at `[-8, 0, -4]`, and all 22 solid obstacles (`VR-006`) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts`
- [X] T021 [US3] Implement client-side authoritative reconciliation in `MultiplayerClient` and `GameLoopController` applying smooth `~150ms` positional blending (`reconciliationBlendRate = 12.0`) when horizontal discrepancy `d < 2.0m` and an immediate position snap when `d >= 2.0m` (`VR-007`, `Clarification #3`) in `packages/game-core/src/multiplayer/multiplayerClient.ts` and `packages/game-client/src/runtime/GameLoopController.tsx`
- [X] T022 [P] [US3] Expand `packages/game-core/__tests__/zooInstanceAuthority.test.ts` with comprehensive validation tests for speed-hack clamping (`VR-005`), pond shoreline & obstacle rejection (`VR-006`), `36m` perimeter clamping, malformed/NaN/stale-sequence rejection (`VR-004`), and volatile in-memory-only state separation (`VR-009`, `SC-009`)

**Checkpoint**: User Stories 1, 2, and 3 are complete — server authority strictly validates all movement and reconciles clients smoothly.

---

## Phase 6: User Story 4 - Connection Status Feedback and Graceful Disconnection Recovery (Priority: P4)

**Goal**: Provide live HUD connection status (`Connecting`, `Connected`, `Reconnecting`, `Disconnected`) and active visitor count, automatically recover from temporary network drops within a `30-second` session resume grace window (`resumeToken`), clean up stale disconnected avatars within `<= 10 seconds`, and provide an in-app `"Reconnect to Zoo"` button with non-blocking offline exploration fallback.

**Independent Test**: Simulate a temporary network interruption via `multiplayerClient.simulateNetworkDrop(1500)`, verify the HUD transitions to `Reconnecting...` while 3D exploration stays responsive, and verify automatic reconnection restores the player's `Explorer #NNN` badge and world position without reloading the page; then exhaust retries and verify clicking `"Reconnect to Zoo"` reconnects in-place.

### Implementation & Verification for User Story 4

- [X] T023 [US4] Implement `2500ms` heartbeat tracking (`recordHeartbeat`), stale session pruning (`now - lastHeartbeatAt > 8_000ms` cleaned up within `<= 10s` per `VR-008` and `SC-004`), and `30-second` `resumableSessions` grace-window retention (`expiresAt = disconnectedAt + 30_000` restoring `sessionId`, `displayName`, `accentColor`, and last authoritative `transform` per `Clarification #1`) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts`
- [X] T024 [US4] Implement automatic reconnection with bounded retry intervals (`[500, 1000, 2000, 3000, 4000]` ms up to `5` attempts), `sessionStorage` `resumeToken` persistence (`online-zoo:mp-resume:v1`), `simulateNetworkDrop`, non-blocking offline fallback mode, and manual `connect()` trigger in `packages/game-core/src/multiplayer/multiplayerClient.ts`
- [X] T025 [US4] Update `GameHudOverlay` to render `data-testid="multiplayer-status-badge"`, `data-testid="visitor-count-badge"`, `data-testid="local-visitor-badge"`, and the interactive `"Reconnect to Zoo"` button (`data-testid="reconnect-multiplayer-btn"`) in `packages/ui/src/GameHudOverlay.tsx`
- [X] T026 [P] [US4] Add integration tests in `packages/game-core/__tests__/multiplayerClient.test.ts` covering two-client room synchronization, `< 2.0m` smooth vs `>= 2.0m` snap reconciliation, temporary drop auto-reconnect within the `30s` grace window preserving `sessionId` and position, `<= 10s` stale session cleanup, and manual in-app reconnect after retry exhaustion

**Checkpoint**: All 4 User Stories are complete and independently verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end multi-browser Playwright verification, tab-backgrounding input reset sync, lifecycle cleanup tests, and full monorepo quality gates.

- [X] T027 [P] Update `packages/game-client/__tests__/runtimeLifecycle.test.ts` to verify clean `MultiplayerClient` disconnection and remote player buffer cleanup across repeated mount/unmount cycles
- [X] T028 Create multi-context Playwright E2E test suite verifying two concurrent Chrome sessions joining the same Panda Forest instance, seeing each other's visitor badges, synchronizing movement/animations and shared lantern prop state, and recovering from a simulated network drop via auto-reconnect and manual `"Reconnect to Zoo"` in `apps/web/e2e/multiplayer-sync.spec.ts`
- [X] T029 Execute full workspace verification (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e`) per `specs/002-multiplayer-foundation/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS** all user stories (`US1`–`US4`).
- **Phase 3 (US1 - Shared Instance & Join/Leave, P1)**: Depends on Phase 2. Delivers the MVP multiplayer room presence and 3D remote visitor rendering.
- **Phase 4 (US2 - Real-Time Movement, Interpolation & Props, P2)**: Depends on Phase 2 and integrates with US1's `MultiplayerClient` and `RemotePlayerAvatar`.
- **Phase 5 (US3 - Authoritative Validation & Reconciliation, P3)**: Depends on Phase 2 and extends `ZooInstanceAuthority` (`US1`) and `MultiplayerClient` (`US2`).
- **Phase 6 (US4 - Connection Status & Reconnection Recovery, P4)**: Depends on Phase 2 and extends `ZooInstanceAuthority` and `MultiplayerClient` with heartbeats, `30s` resume tokens, and HUD controls.
- **Phase 7 (Polish & E2E Verification)**: Depends on Phases 3–6 completion.

### Parallel Opportunities

- **Setup & Foundational**: `T002` can run in parallel with `T001`; `T004` can run in parallel with `T003`.
- **User Story 1**: `T010` (`RemotePlayerAvatar.tsx`), `T011` (`RemotePlayersLayer.tsx`), and `T014` (`zooInstanceAuthority.test.ts`) can be developed in parallel once `T006` is complete.
- **User Story 2**: `T015` (`remotePlayerInterpolator.ts`) and `T019` (`remotePlayerInterpolator.test.ts`) can run in parallel with `T016`.
- **User Story 3 & 4**: Unit/integration suites (`T022`, `T026`) and HUD updates (`T025`) operate on distinct files from core authority logic.

---

## Parallel Example: User Story 1 & User Story 2

```bash
# Parallel batch during User Story 1 (3D rendering + authority unit tests):
Task: "T010 [P] [US1] Implement RemotePlayerAvatar 3D entity in packages/game-client/src/entities/RemotePlayerAvatar.tsx"
Task: "T011 [P] [US1] Implement RemotePlayersLayer in packages/game-client/src/entities/RemotePlayersLayer.tsx"
Task: "T014 [P] [US1] Add unit tests verifying ZooInstanceAuthority in packages/game-core/__tests__/zooInstanceAuthority.test.ts"

# Parallel batch during User Story 2 (Interpolation math + unit tests):
Task: "T015 [P] [US2] Implement RemotePlayerInterpolator in packages/game-core/src/multiplayer/remotePlayerInterpolator.ts"
Task: "T019 [P] [US2] Add unit tests for RemotePlayerInterpolator in packages/game-core/__tests__/remotePlayerInterpolator.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (`T001`–`T002`)
2. Complete **Phase 2: Foundational** (`T003`–`T005`)
3. Complete **Phase 3: User Story 1** (`T006`–`T014`)
4. **STOP and VALIDATE**: Open two browser tabs, enter Panda Forest, and verify both visitors appear at distinct spawn plaza offsets with `"Explorer #101"` / `"Explorer #102"` badges and clean join/leave lifecycle.

### Incremental Delivery

1. **Setup + Foundational** → Shared protocol & state store ready.
2. **Add US1 (P1)** → Multi-client presence, spawn plaza offsets, and 3D remote visitor rendering working.
3. **Add US2 (P2)** → 20 Hz movement sync, 60 FPS buffered interpolation, animations, and shared world props working.
4. **Add US3 (P3)** → Server-side speed/boundary/pond/obstacle clamping and smooth `<2.0m` vs `>=2.0m` client reconciliation active.
5. **Add US4 (P4)** → Heartbeat timeouts (`<= 10s`), `30s` session resume tokens, auto-reconnect, HUD status badges, and `"Reconnect to Zoo"` button complete.
6. **Polish (Phase 7)** → Multi-context Playwright E2E verification and full monorepo build/test gates green.

