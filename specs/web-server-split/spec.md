# Feature Specification: Web & Server Split (`web-server-split`)

**Feature Branch**: `fix/web-server-split`

**Created**: 2026-11-05

**Status**: Approved

**Input**: User description: "Extract the game server out of apps/web into a standalone apps/server. apps/server implements the whole multiplayer hub (rooms, sessions, seat/prop states, animal authority, chat, moderation) in TypeScript, importing shared protocol/logic from the shared package. If duplicate hub implementations exist in the repo, the end state is ONE — in apps/server. apps/server exposes the WebSocket endpoint and a minimal HTTP endpoint reporting room/zone occupancy (the main-menu feature needs it). Config via env: PORT, ALLOWED_ORIGINS. apps/web loses all server code. Repo-root dev starts web and server as separate processes; each app also starts alone. The client takes the server URL from NEXT_PUBLIC_WS_URL, plumbed through to the multiplayer client; local-dev fallback to the server's localhost port. Ship .env.example files for both apps. No behaviour change: same protocol, same default room, same gameplay."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Standalone Game Server Authority & Single Hub Implementation (Priority: P1)

As an operator and developer, I want the multiplayer game server to run as a standalone service (`apps/server`) that owns all room, session, seat/prop, animal simulation, chat routing, and moderation authority in one unified TypeScript implementation without serving web pages or static assets.

**Why this priority**: Separating the real-time stateful multiplayer server from the web client is the foundational architectural law required for independent deployment and eliminating duplicate server hub implementations.

**Independent Test**: Start `apps/server` alone, query its HTTP occupancy endpoint (`/occupancy`), and connect two WebSocket clients to `/ws/zoo` to verify full session creation, movement synchronization, and room state ticks.

**Acceptance Scenarios**:

1. **Given** `apps/server` is started as a standalone process with `PORT` and `ALLOWED_ORIGINS` configured, **When** a client queries the occupancy HTTP endpoint, **Then** the server responds with live room and zone occupancy counts and CORS headers matching `ALLOWED_ORIGINS`.
2. **Given** `apps/server` is running, **When** two players connect via the WebSocket endpoint (`/ws/zoo`), **Then** both players join the same default room (`panda-forest-1`), receive authoritative snapshots, and see each other's movement, chat, emotes, props, seats, and animal states.
3. **Given** the repository codebase, **When** inspected for multiplayer hub and authority implementations, **Then** only one hub/authority implementation exists (in `apps/server`), and `apps/web` contains zero server or authority code.

---

### User Story 2 - Pure Web Client Deployable Independently with Configured Server URL (Priority: P1)

As a player or operator deploying `apps/web` to a static/serverless web host, I want the web client to run independently of the game server and connect to the server address configured in `NEXT_PUBLIC_WS_URL` (falling back to the local standalone server port during local development).

**Why this priority**: The web client must be deployable on its own (e.g., Vercel) without bundling or executing any Node WebSocket server code, while seamlessly connecting to the standalone game server.

**Independent Test**: Start `apps/web` and `apps/server` as separate processes, open two browser windows on the web client URL, and verify both players connect to the standalone server via `NEXT_PUBLIC_WS_URL` and see each other move in real time.

**Acceptance Scenarios**:

1. **Given** `NEXT_PUBLIC_WS_URL` is configured on the web client, **When** the player enters the zoo in the browser, **Then** the multiplayer client connects to the configured WebSocket server URL.
2. **Given** `NEXT_PUBLIC_WS_URL` is not explicitly set in a local development environment, **When** the player loads the web client on localhost, **Then** the multiplayer client falls back to the standalone server's default localhost WebSocket address (`ws://localhost:4000/ws/zoo`).
3. **Given** `apps/web` is built or started alone, **When** inspecting its dependencies and source files, **Then** it starts via standard Next.js commands (`next dev` / `next build` / `next start`) with no custom server wrapper or WebSocket server dependencies.

---

### User Story 3 - Independent & Combined Developer Workflows and Environment Templates (Priority: P2)

As a developer, I want `.env.example` templates in both `apps/web` and `apps/server`, and I want repo-root development to launch both `apps/web` and `apps/server` as separate processes while still allowing each app to start on its own.

**Why this priority**: Clear environment configuration and process separation ensure repeatable local development, testing, and production deployment.

**Independent Test**: Verify `apps/web/.env.example` and `apps/server/.env.example` exist with documented variables, and verify both `pnpm --filter @online-zoo/server dev` and `pnpm --filter @online-zoo/web dev` start independently as well as together via `pnpm dev`.

**Acceptance Scenarios**:

1. **Given** a fresh clone of the repository, **When** inspecting `apps/web/.env.example` and `apps/server/.env.example`, **Then** `NEXT_PUBLIC_WS_URL`, `PORT`, and `ALLOWED_ORIGINS` are documented with sensible defaults.
2. **Given** repo-root `pnpm dev` is executed, **When** development mode starts, **Then** `apps/web` and `apps/server` run as separate processes on distinct ports without port collisions.

### Edge Cases

- **Disallowed Origin on HTTP or WebSocket Upgrade**: When `ALLOWED_ORIGINS` is set to specific origins and a request arrives from an unlisted origin, HTTP requests do not receive permissive CORS headers and WebSocket upgrade requests from disallowed origins are rejected with `403 Forbidden`.
- **Non-existent HTTP Routes on `apps/server`**: Requests to paths other than `/occupancy`, `/api/occupancy`, or `/health` receive a `404 Not Found` JSON response because `apps/server` serves no web pages and no static assets.
- **`NEXT_PUBLIC_WS_URL` With or Without Path/Query**: Whether `NEXT_PUBLIC_WS_URL` is provided as `ws://localhost:4000/ws/zoo` or `ws://localhost:4000`, the client resolves a valid WebSocket endpoint URL with the target `room` query parameter.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST provide a standalone `apps/server` package (`@online-zoo/server`) written in TypeScript that owns all multiplayer rooms, sessions, seat/prop states, animal simulation authority, chat routing, and moderation in memory as a single instance.
- **FR-002**: All duplicate server hub implementations (`apps/web/server.mjs`, `apps/web/src/server/multiplayerWsHub.ts`, and in-memory hub duplication in `packages/game-core`) MUST be consolidated so that only ONE multiplayer hub implementation exists in the repository, located in `apps/server`.
- **FR-003**: `apps/server` MUST import shared protocol message schemas, types, and validation/catalog helpers from the shared `@online-zoo/game-core` package without duplicating protocol definitions.
- **FR-004**: `apps/server` MUST expose the WebSocket endpoint (`/ws/zoo`) and a minimal HTTP occupancy endpoint (`/occupancy`, also aliased at `/api/occupancy` and `/health`) reporting live room/zone occupancy counts, capacities, and health status.
- **FR-005**: `apps/server` MUST read `PORT` (defaulting to `4000`) and `ALLOWED_ORIGINS` (comma-separated list of allowed origins, defaulting to `*` when unset) from environment variables, enforcing origin checks on CORS and WebSocket upgrades when restricted.
- **FR-006**: `apps/server` MUST NOT serve any web pages or static assets.
- **FR-007**: `apps/web` MUST contain zero game-server or authority code, must remove its custom `server.mjs` and `src/server/` directory, and must run using standard Next.js commands (`next dev`, `next build`, `next start`).
- **FR-008**: `apps/web` MUST read `NEXT_PUBLIC_WS_URL` and plumb it through `ZooWorldExperience` and `ZooGameCanvas` to `MultiplayerClient`, with a local-dev fallback to `ws://localhost:4000/ws/zoo` when `NEXT_PUBLIC_WS_URL` is unset.
- **FR-009**: Both `apps/web/.env.example` and `apps/server/.env.example` MUST be shipped in the repository.
- **FR-010**: Repo-root `pnpm dev` MUST start `apps/web` and `apps/server` as separate processes, and each application MUST also be startable independently.
- **FR-011**: Existing WebSocket protocol message shapes, default room (`panda-forest-1`), and gameplay behavior MUST remain 100% backward-compatible.

### Key Entities

- **MultiplayerServerHub (`apps/server`)**: Single unified TypeScript hub binding WebSocket (and test transport) connections to `ZooInstanceAuthority` and broadcasting room ticks and events.
- **OccupancySnapshot (`apps/server` HTTP response)**: JSON summary of server health, total active players, zone occupancy summaries, and room instance summaries.
- **ServerRuntimeConfig (`apps/server`)**: Environment-driven configuration (`port`, `allowedOrigins`, `wsPath`, `tickRateHz`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero server or authority files exist in `apps/web`, and `apps/web` builds cleanly as a standalone client bundle (`pnpm --filter @online-zoo/web build` and `typecheck` pass with 0 errors).
- **SC-002**: Only one multiplayer hub implementation exists across the entire repository, located in `apps/server`.
- **SC-003**: `GET /occupancy` on `apps/server` responds in under 50ms with accurate JSON room/zone occupancy data and CORS headers.
- **SC-004**: Two browser windows connected to `apps/web` (with `apps/server` running as a separate process via `NEXT_PUBLIC_WS_URL`) join the default room and observe each other's movement in real time.

## Assumptions

- Default local development ports are `3000` for `apps/web` and `4000` for `apps/server` (`PORT=4000`) so both processes run side-by-side without port conflicts.
- `ALLOWED_ORIGINS` accepts a comma-separated list of origins (e.g., `http://localhost:3000,http://127.0.0.1:3000`) or `*` in local development.
- The HTTP occupancy endpoint responds on both `/occupancy` and `/api/occupancy` (plus `/health`) so both direct and prefixed health/occupancy checks succeed.

