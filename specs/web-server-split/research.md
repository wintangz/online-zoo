# Research: Web & Server Split (`web-server-split`)

## Decision 1: Consolidating All Hub & Authority Code into `apps/server`

- **Decision**: Move `ZooInstanceAuthority` from `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` and `attachMultiplayerWebSocketServer` from `apps/web/src/server/multiplayerWsHub.ts` into `apps/server/src/`, unify `InMemoryMultiplayerHub` and `attachMultiplayerWebSocketServer` into a single `MultiplayerServerHub` class in `apps/server/src/multiplayerHub.ts`, and delete `apps/web/server.mjs` and `apps/web/src/server/`.
- **Rationale**: The Architecture Law mandates that `apps/web` contain no game-server or authority code and that `apps/server` own rooms, sessions, animal authority, chat routing, and moderation with only ONE hub implementation in the repo. Unifying the message-routing loop in `MultiplayerServerHub` so both real `ws` sockets and in-memory test transports use the exact same connection handler eliminates all duplicate hub code.
- **Alternatives considered**: Keeping `ZooInstanceAuthority` or `InMemoryMultiplayerHub` inside `packages/game-core`. Rejected because `packages/game-core` is imported by `apps/web`, and keeping authority/hub classes there would blur the client/server boundary and retain duplicate hub dispatch logic.

## Decision 2: `apps/server` Build & Runtime Execution

- **Decision**: Use `esbuild` (already present in the workspace lockfile) to bundle `apps/server/src/index.ts` (including workspace TypeScript imports from `@online-zoo/game-core` while externalizing `ws`) into `apps/server/dist/index.mjs`, and execute with Node.js.
- **Rationale**: `@online-zoo/game-core` exports raw `.ts` source files (`"main": "./src/index.ts"`). Bundling `apps/server` entry with `esbuild` takes < 30ms, requires no network downloads, preserves strict `tsc --noEmit` typechecking across `apps/server`, and produces a self-contained Node ESM server artifact.
- **Alternatives considered**: Compiling all workspace packages to `dist/` with `tsc -b`. Rejected because `packages/game-core` and `packages/ui` are configured with `"noEmit": true` for Next.js / Vite bundler consumption.

## Decision 3: `NEXT_PUBLIC_WS_URL` Resolution & Local-Dev Fallback

- **Decision**: Add `resolveWebSocketServerUrl(roomId, explicitWsUrl)` and `resolveServerHttpBaseUrl(explicitWsUrl)` in `@online-zoo/game-core/src/multiplayer/protocol.ts` (and wire `process.env.NEXT_PUBLIC_WS_URL` in `apps/web/src/components/ZooWorldExperience.tsx` -> `ZooGameCanvas` -> `MultiplayerClient`). When `NEXT_PUBLIC_WS_URL` is unset, fallback to `ws://localhost:4000/ws/zoo` (matching `apps/server`'s default `PORT=4000`).
- **Rationale**: Ensures `apps/web` connects to the standalone server both when `NEXT_PUBLIC_WS_URL` is explicitly set (e.g. Vercel or `.env.local`) and out-of-the-box in local development (`pnpm dev`).
- **Alternatives considered**: Falling back to `window.location.host` (port `3000`). Rejected because `apps/web` no longer hosts a WebSocket server on port `3000`.

