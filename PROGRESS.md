# Online Zoo Foundation Progress Report

## `web-server-split`

- **Slug**: `web-server-split`
- **Branch**: `fix/web-server-split`
- **Commit Hash**: `fda725e`
- **What Changed**:
  - Extracted the multiplayer game server out of `apps/web` into standalone package `apps/server` (`@online-zoo/server`) written in TypeScript, importing shared protocol and validation logic from `@online-zoo/game-core`.
  - Consolidated duplicate hub implementations (`InMemoryMultiplayerHub` and `attachMultiplayerWebSocketServer`) into a single unified `MultiplayerServerHub` in `apps/server/src/multiplayerHub.ts` alongside `ZooInstanceAuthority` in `apps/server/src/zooInstanceAuthority.ts`.
  - Exposed WebSocket endpoint (`/ws/zoo`) and minimal HTTP occupancy endpoint (`/occupancy`, `/api/occupancy`, `/health`) in `apps/server/src/httpServer.ts`, configured via `PORT` (default `4000`) and `ALLOWED_ORIGINS` (CORS + WebSocket upgrade validation), returning `404` on all non-occupancy HTTP routes (serves no web pages and no assets).
  - Removed `apps/web/server.mjs`, `apps/web/src/server/multiplayerWsHub.ts`, and `ws` / `@types/ws` dependencies from `apps/web` so `apps/web` runs purely via `next dev` / `next build` / `next start`.
  - Added `.env.example` files for both `apps/web` (`NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws/zoo`) and `apps/server` (`PORT=4000`, `ALLOWED_ORIGINS=...`), and plumbed `NEXT_PUBLIC_WS_URL` through `ZooWorldExperience.tsx` → `ZooGameCanvas.tsx` → `MultiplayerClient` with local-dev fallback to `ws://localhost:4000/ws/zoo`.
  - Updated `apps/web/playwright.config.ts` to launch `@online-zoo/server` and `@online-zoo/web` as two separate processes wired via `NEXT_PUBLIC_WS_URL`.
- **Check Results**:
  - `pnpm typecheck`: 7/7 packages passed (`0` errors)
  - `pnpm lint`: 7/7 packages passed (`0` errors)
  - `pnpm test`: 21 test files, 80 unit/integration tests passed (`@online-zoo/server`, `@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/game-assets`)
  - Playwright E2E (`e2e/multiplayer-sync.spec.ts`): 1 passed — two concurrent browser windows joined `panda-forest-1` across split `@online-zoo/web` and `@online-zoo/server` processes, saw each other move, synchronized shared props, reconciled out-of-bounds movement, and recovered across network drops.
- **Assumptions**:
  - Logged in `specs/web-server-split/ASSUMPTIONS.md`: `/occupancy` (plus `/api/occupancy` and `/health` aliases) returns JSON `{ status, serverTimestamp, totalPlayers, zones, rooms }`; `ALLOWED_ORIGINS` defaults to `*` in local dev when unset and enforces strict origin matching on HTTP CORS and WebSocket upgrades when configured.
- **Anything to Review**:
  - None; all architecture constraints and tests are green.
