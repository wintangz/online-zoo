# Implementation Plan: Multiplayer Foundation (Feature 002)

**Branch**: `002-multiplayer-foundation` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-multiplayer-foundation/spec.md`

## Summary

Feature 002 upgrades **Online Zoo** from a single-player Panda Forest exploration slice into a real-time, server-authoritative multiplayer social zoo supporting `2` to `16` concurrent players per instance across desktop and mobile browsers. Players entering the Panda Forest are assigned a unique `sessionId`, a `30-second` resumable session token (`resumeToken`), a visitor badge (`"Explorer #101"`), a deterministic outfit/hat accent color, and a collision-free spawn offset on the entry plaza.

The technical architecture introduces:
1. **Pure Authoritative Instance Engine (`ZooInstanceAuthority` in `@online-zoo/game-core`)**: Maintains volatile in-memory room state (`ZooInstanceRoom`), enforces movement speed caps (`walk <= 4.0 m/s`, `run <= 7.5 m/s` + jitter tolerance), clamps positions against the `36m` perimeter fence, the `6.7m` blocked pond shoreline, and all `22` solid obstacles, rejects malformed or stale sequence packets, synchronizes shared world props (`toggle_lantern`, `ring_chime`, `rest_bench`), cleans up stale sessions within `<= 10s`, and retains disconnected sessions for a `30s` grace window (`FR-001`–`FR-018`).
2. **Unified Real-Time WebSocket Server (`apps/web/server.mjs` + `apps/web/src/server/multiplayerWsServer.ts`)**: Attaches a stateful `ws` WebSocket endpoint (`/ws/zoo`) directly onto the application HTTP server so `pnpm dev`, `pnpm start`, and multi-client Playwright E2E tests (`pnpm test:e2e`) run seamlessly on port `3000`.
3. **Client Multiplayer Session, Prediction & Snapshot Interpolation (`MultiplayerClient` & `RemotePlayerInterpolator` in `@online-zoo/game-core`)**: Sends throttled `20 Hz` movement updates, smoothly reconciles local authoritative corrections (`< 2.0m` blended over `~150ms`, `>= 2.0m` immediate snap), interpolates remote avatars at 60–120 Hz via a `100ms` buffered snapshot ring without triggering React re-renders, and handles automatic reconnection (`5` retries) plus non-blocking offline local exploration fallback.
4. **3D Remote Visitor Rendering & HUD Connection Controls (`@online-zoo/game-client` & `@online-zoo/ui`)**: Renders pass-through remote Explorer avatars with procedural `Idle`/`Walking`/`Running`/`Jumping` animations, deterministic accent colors, overhead `"Explorer #NNN"` badges, and HUD connection status indicators with an in-app `"Reconnect to Zoo"` action.

## Technical Context

**Language/Version**: TypeScript `5.6.x` (Node.js `>=20.11`)

**Primary Dependencies**:
- Application Shell & WebSocket Host: `next` (`14.2.x`), `ws` (`^8.18.0`), `react` (`18.3.x`), `react-dom` (`18.3.x`)
- 3D Rendering & Physics: `three` (`0.169+`), `@react-three/fiber` (`8.x`), `@react-three/drei` (`9.x`), `@react-three/rapier` (`1.x`)
- State Management & Styling: `zustand` (`5.x`), `tailwindcss` (`3.4.x`)
- Monorepo & Build Tooling: `pnpm` (`9.x` / `12.x` workspaces), `turbo` (`2.x`)

**Storage**:
- Strictly volatile in-memory `Map<string, ZooInstanceRoom>` on the server for all multiplayer session presence, player transforms, and resumable grace-window tokens (`FR-013`, `SC-009`).
- Client `sessionStorage` (`online-zoo:mp-resume:v1`) for the transient `30-second` reconnection `resumeToken` and `localStorage` (`online-zoo:settings:v1`) for user settings. Zero database writes for movement or session state.

**Testing**:
- `Vitest`: Unit and integration suites for `ZooInstanceAuthority` (spawn distribution, speed & boundary clamping, stale sequence rejection, `30s` session resume grace window, `<10s` heartbeat timeout, prop sync), `RemotePlayerInterpolator` (60 FPS smooth position & shortest-arc yaw interpolation, jitter gap bridging), and `MultiplayerClient` (auto-reconnect, manual reconnect, `<2.0m` vs `>=2.0m` local reconciliation, offline fallback).
- `Playwright`: Multi-context live Chrome E2E tests verifying two concurrent browser sessions joining the same Panda Forest instance, seeing each other's avatars and visitor badges, synchronizing movement/animations and shared prop interactions, and recovering from network drops without page reload.

**Target Platform**: Evergreen desktop browsers (Chrome, Edge, Firefox, Safari) and mobile browsers (iOS Safari, Android Chrome) supporting WebGL2, WebSockets, and Pointer/Touch events.

**Project Type**: Browser-based 3D multiplayer game web application in a Turborepo monorepo.

**Performance Goals**:
- Join visibility across connected clients within `<= 1.0 second` (`SC-001`, `SC-004`).
- End-to-end movement and animation reflection within `<= 200ms` under normal network conditions (`SC-002`).
- Smooth 60 FPS desktop / 30–60 FPS mobile remote avatar interpolation with zero frame-to-frame teleporting (`SC-003`) and zero React re-renders during 60 Hz movement updates.
- Stale avatar cleanup within `<= 10 seconds` on abrupt disconnect (`SC-004`) and automatic reconnection within `<= 5 seconds` after network restoration (`SC-007`).

**Constraints**:
- Pass-through avatar-to-avatar collision (`Clarification #2`, `FR-003`, `FR-006`) while maintaining solid environmental, pond shoreline, and perimeter collision.
- Zero persistent storage of high-frequency movement updates (`FR-013`, `SC-009`).
- Non-blocking local exploration fallback if the multiplayer server is unreachable or disconnected (`Clarification #5`, `FR-014`).

**Scale/Scope**: `2` to `16` concurrent players per `ZooInstanceRoom` (with automatic overflow room creation if capacity is exceeded), `20 Hz` network tick rate, `5` client-to-server message types, and `7` server-to-client message types.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Phase 0 Status | Post-Phase 1 Design Verification |
| :--- | :--- | :--- |
| **I. Gameplay-First Development** | **PASS** | Transforms the playable Panda Forest into a shared living social space with real-time visitor presence, expressive movement sync, and shared world prop reactions. |
| **II. Modular Architecture** | **PASS** | Keeps protocol schemas, authority validation (`ZooInstanceAuthority`), and interpolation math (`RemotePlayerInterpolator`) in `@online-zoo/game-core`, 3D remote avatar rendering in `@online-zoo/game-client`, HUD controls in `@online-zoo/ui`, and WebSocket transport hosting in `apps/web`. |
| **III. Multiplayer Correctness** | **PASS** | `ZooInstanceAuthority` validates every client movement packet against max run speed, perimeter bounds, pond shoreline barriers, and solid obstacles, rejects stale sequences, and keeps transient state strictly in volatile memory (`FR-011`–`FR-013`). |
| **IV. Responsive by Design** | **PASS** | Works identically across desktop (`WASD` + drag/keyboard orbit) and mobile (`Virtual Joystick` + touch buttons), and zeros active movement input on tab backgrounding (`visibilitychange` / `blur`). |
| **V. Performance and Asset Quality** | **PASS** | Uses a mutable 60 Hz interpolation map (`mutableRuntimeState.remotePlayers`) read directly inside `useFrame` so remote movement causes zero React re-renders. |
| **VI. Security and Player Safety** | **PASS** | Validates payload structure, byte size (`<= 4096B`), finite numbers, sequence monotonicity, and velocity bounds; isolates per-client errors so malformed packets never affect other players (`SC-005`). |
| **VII. Testing and Verification** | **PASS** | Defines unit/integration tests (`Vitest`) for authority validation, interpolation, and reconnection plus multi-browser E2E tests (`Playwright`) for real-time two-player synchronization. |
| **VIII. Specification-Driven Development** | **PASS** | Directly traces all 18 Functional Requirements, 9 Success Criteria, and 5 Clarifications from [spec.md](./spec.md) into [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/](./contracts/). |
| **IX. Incremental Delivery** | **PASS** | Builds directly on Feature 001's Panda Forest runtime while preserving offline/single-player playability whenever disconnected. |

## Project Structure

### Documentation (this feature)

```text
specs/002-multiplayer-foundation/
├── plan.md                                      # This file (/speckit-plan output)
├── research.md                                  # Phase 0 technical research & decisions
├── data-model.md                                # Phase 1 entity, validation & state model
├── quickstart.md                                # Phase 1 multi-session run & validation guide
├── checklists/
│   └── requirements.md                          # Spec quality validation checklist (16/16 passing)
└── contracts/
    ├── multiplayer-protocol.md                  # Wire protocol messages & ZooInstanceAuthority API
    └── client-interpolation-and-ui.md           # MultiplayerClient, RemotePlayerInterpolator, 3D & HUD contracts
```

### Source Code (repository root)

```text
online-zoo/
├── package.json                                 # Root workspace scripts (dev, build, test, test:e2e, lint, typecheck)
├── apps/
│   └── web/
│       ├── package.json                         # Adds ws dependency & unified server.mjs dev/start scripts
│       ├── server.mjs                           # Unified HTTP + WebSocket (/ws/zoo) server hosting Next.js & ZooInstanceAuthority
│       ├── src/
│       │   ├── app/
│       │   │   └── page.tsx                     # Passes room/multiplayer lifecycle into ZooGameCanvas & HUD
│       │   └── server/
│       │       └── multiplayerWsHub.ts          # Node WebSocket hub binding ws connections to ZooInstanceAuthority
│       └── e2e/
│           ├── panda-forest.spec.ts             # Existing Feature 001 E2E suite
│           └── multiplayer-sync.spec.ts         # Multi-context Feature 002 E2E suite (2 players, movement, props, reconnect)
├── packages/
│   ├── game-core/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts                         # Extended with multiplayer status, visitor & reconciliation types
│   │   │   ├── state/
│   │   │   │   └── gameStore.ts                 # Extended with multiplayer UI slice & mutableRuntimeState.remotePlayers
│   │   │   └── multiplayer/
│   │   │       ├── protocol.ts                  # Shared wire message types, validation guards & palette constants
│   │   │       ├── zooInstanceAuthority.ts      # Server-authoritative room state, spawn ring, movement clamping & 30s grace resume
│   │   │       ├── remotePlayerInterpolator.ts  # Snapshot ring buffer, 60Hz lerp/angle-lerp & jitter extrapolation
│   │   │       └── multiplayerClient.ts         # Client transport manager, 20Hz sender, reconciliation & auto/manual reconnect
│   │   └── __tests__/
│   │       ├── zooInstanceAuthority.test.ts     # Unit tests for authority validation, clamping, spawn & grace resume
│   │       ├── remotePlayerInterpolator.test.ts # Unit tests for smooth interpolation, yaw wrapping & stale packet drop
│   │       └── multiplayerClient.test.ts        # Integration tests for two-client sync, network drop & reconnect
│   ├── game-client/
│   │   ├── src/
│   │   │   ├── runtime/
│   │   │   │   ├── ZooGameCanvas.tsx            # Initializes MultiplayerClient lifecycle and exposes it on __ONLINE_ZOO_RUNTIME__
│   │   │   │   └── GameLoopController.tsx       # Steps MultiplayerClient (20Hz send, remote interpolation, <2m/>=2m reconciliation)
│   │   │   ├── entities/
│   │   │   │   ├── PlayerAvatarEntity.tsx       # Local player avatar with assigned accentColor tint
│   │   │   │   ├── RemotePlayerAvatar.tsx       # Pass-through 3D remote visitor with procedural animations, accent color & badge
│   │   │   │   └── RemotePlayersLayer.tsx       # Mounts RemotePlayerAvatar instances for active remote visitors in room
│   │   │   └── environment/
│   │   │       └── PandaForestScene.tsx         # Includes <RemotePlayersLayer /> alongside local player and props
│   │   └── __tests__/
│   │       └── runtimeLifecycle.test.ts         # Verifies clean MultiplayerClient teardown on unmount
│   └── ui/
│       └── src/
│           └── GameHudOverlay.tsx               # Displays connection status badge, visitor count, local Explorer badge & Reconnect button
```

**Structure Decision**: Extends the existing 6-package Turborepo monorepo (`apps/web`, `packages/game-core`, `packages/game-client`, `packages/game-assets`, `packages/ui`, `packages/config`) by adding `packages/game-core/src/multiplayer/*` for shared contracts, authoritative room logic, client networking, and interpolation, `RemotePlayerAvatar`/`RemotePlayersLayer` in `packages/game-client`, HUD status/reconnect controls in `packages/ui`, and the unified HTTP + WebSocket server entry (`apps/web/server.mjs`) in `apps/web`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| None (All 9 Constitution Principles Pass) | All new multiplayer modules fit cleanly within the established monorepo boundaries (`@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/ui`, `apps/web`). | Adding a separate external database or microservice cluster would violate `FR-013` / `SC-009` (no persistence for transient state) and complicate single-command local development. |
