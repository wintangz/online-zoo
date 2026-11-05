# Tasks: Web & Server Split (`web-server-split`)

**Input**: Design documents from `/specs/web-server-split/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/server-endpoints.md](./contracts/server-endpoints.md)

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create `apps/server/package.json` (`@online-zoo/server`), `apps/server/tsconfig.json`, and `apps/server/.env.example` (`PORT=4000`, `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`)
- [X] T002 [P] Create `apps/web/.env.example` (`NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws/zoo`) and update `apps/web/package.json` to remove custom server scripts and `ws`/`@types/ws` dependencies

---

## Phase 2: Foundational (Shared Protocol & URL Resolution)

- [X] T003 Add `ZoneOccupancySummary`, `OccupancySnapshotResponse`, `DEFAULT_SERVER_PORT` (`4000`), `resolveWebSocketServerUrl`, and `resolveServerHttpBaseUrl` in `packages/game-core/src/multiplayer/protocol.ts`
- [X] T004 Update `packages/game-core/src/multiplayer/multiplayerClient.ts` and `packages/game-core/src/multiplayer/index.ts` to use `resolveWebSocketServerUrl` (reading `NEXT_PUBLIC_WS_URL` with fallback to `ws://localhost:4000/ws/zoo`) and remove `InMemoryMultiplayerHub` and `ZooInstanceAuthority` from `@online-zoo/game-core`

---

## Phase 3: User Story 1 - Standalone Game Server Authority & Single Hub Implementation (Priority: P1)

**Goal**: Implement the single unified multiplayer hub and authority in `apps/server` in TypeScript, exposing `/ws/zoo` and `/occupancy` with `PORT` and `ALLOWED_ORIGINS` enforcement.

**Independent Test**: Run `apps/server` unit and HTTP/WebSocket integration tests (`pnpm --filter @online-zoo/server test`).

- [X] T005 [US1] Move `ZooInstanceAuthority` into `apps/server/src/zooInstanceAuthority.ts`, importing shared protocol, types, and validation/simulation modules from `@online-zoo/game-core`, and add `buildOccupancySnapshot()`
- [X] T006 [US1] Create the single unified `MultiplayerServerHub` (and `InMemoryMultiplayerHub` alias) and `attachMultiplayerWebSocketServer` in `apps/server/src/multiplayerHub.ts`
- [X] T007 [US1] Implement `createStandaloneGameServer` in `apps/server/src/httpServer.ts` and entrypoint `apps/server/src/index.ts` exposing `/ws/zoo` and `/occupancy` (`/api/occupancy`, `/health`), enforcing `PORT` and `ALLOWED_ORIGINS`, and returning `404` for all other HTTP paths
- [X] T008 [US1] Migrate authority and hub tests to `apps/server/__tests__/` and add `apps/server/__tests__/serverOccupancyAndOrigins.test.ts` testing `/occupancy`, `ALLOWED_ORIGINS` CORS/WS checks, `404` non-asset behavior, and multi-client WebSocket synchronization

---

## Phase 4: User Story 2 & 3 - Pure Web Client & Separate Dev/E2E Processes (Priority: P1/P2)

**Goal**: Remove all server code from `apps/web`, plumb `NEXT_PUBLIC_WS_URL` into `ZooWorldExperience` and `ZooGameCanvas`, and configure Playwright E2E and repo-root scripts to run `apps/server` and `apps/web` as separate processes.

**Independent Test**: Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and verify two browser windows join and see each other move against the split dev servers.

- [X] T009 [US2] Delete `apps/web/server.mjs` and `apps/web/src/server/multiplayerWsHub.ts`
- [X] T010 [P] [US2] Plumb `process.env.NEXT_PUBLIC_WS_URL` in `apps/web/src/components/ZooWorldExperience.tsx` and `packages/game-client/src/runtime/ZooGameCanvas.tsx`
- [X] T011 [US3] Update `apps/web/playwright.config.ts` to launch `@online-zoo/server` and `@online-zoo/web` as two separate processes wired via `NEXT_PUBLIC_WS_URL`, and verify two browser windows join and see each other move
