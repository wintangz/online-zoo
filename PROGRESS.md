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


## `world-zones`

- **Slug**: `world-zones`
- **Branch**: `fix/world-zones`
- **Commit Hash**: `5958228`
- **What Changed**:
  - Wrote the foundational flat-shaded low-poly art style guide in `specs/world-zones/art-style-guide.md` and exported the 20-color shared `ZOO_PALETTE` plus zone-to-asset mapping (`zones: AssetZoneId[]`, `getAssetsForZone`, `getPreloadUrlsForZone`) in `packages/game-assets/src/manifest.ts`.
  - Added the shared multi-zone registry (`WORLD_ZONES_BY_ID`, `WORLD_ZONES_LIST`, `getZoneById`, `resolveZoneForRoomId`, `getLayoutForRoomId`, `findGateLinkByObjectId`) in `packages/game-core/src/world/zoneRegistry.ts` defining `'zoo-lobby'` (`roomId: 'zoo-lobby-1'`, `sceneId: 'zoo-lobby'`, `0` animals) and `'panda-forest'` (`roomId: 'panda-forest-1'`, `sceneId: 'panda-forest'`).
  - Built `ZooLobbyScene.tsx` in `packages/game-client/src/environment/ZooLobbyScene.tsx` featuring flat-shaded low-poly entrance plaza, ticket booths, central compass meeting point, zone directory signage, benches, North Gate archway to Panda Forest, and zero animals.
  - Added symmetric interactable zone gates (`'gate-to-panda-forest'` prompting `'Enter Panda Forest?'` and `'gate-to-zoo-lobby'` prompting `'Enter Zoo Lobby?'`) using `InteractionSystem` and `MultiplayerClient.switchZoneViaGate`, displaying `EntryLoadingScreen` with destination zone name and spawning players at the paired return gate coordinates.
  - Scoped presence, proximity chat, and animal simulation per room in `apps/server/src/zooInstanceAuthority.ts`, populated `zoneId` and `zoneDisplayName` on `FriendStatusEntry` and `SocialInteractionOverlay`, and enforced lobby-first spawn (`'zoo-lobby-1'`) for all joins and reconnect/resume flows.
- **Check Results**:
  - `pnpm typecheck`: 7/7 packages passed (`0` errors)
  - `pnpm lint`: 7/7 packages passed (`0` errors)
  - `pnpm test`: 22 test files, 86 unit/integration tests passed (`@online-zoo/server`, `@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/game-assets`)
  - Playwright E2E (`e2e/playable-zoo-world.spec.ts`, `e2e/multiplayer-sync.spec.ts`): 2 passed — verified initial spawn in `Zoo Lobby`, gate transition prompt `'Enter Panda Forest?'`, switching to `Panda Forest`, and multi-window multiplayer sync.
- **Assumptions**:
  - Logged in `specs/world-zones/ASSUMPTIONS.md`: `'zoo-lobby'` uses primary room `'zoo-lobby-1'` while `'panda-forest'` retains `'panda-forest-1'`; reconnect/resume always places the player at the Zoo Lobby entrance spawn (`[0, 0.1, 18]`) while preserving identity, wallet, and passport progress.
- **Anything to Review**:
  - None; all unit, server integration, and Playwright E2E checks are green.


## `main-menu`

- **Slug**: `main-menu`
- **Branch**: `fix/main-menu`
- **Commit Hash**: `2648d61`
- **What Changed**:
  - Added `packages/game-core/src/multiplayer/occupancyClient.ts` (`deriveOccupancyUrlFromWsUrl`, `fetchServerOccupancy`, `resolveInitialMenuSelection`, `evaluateMainMenuPlayAttempt`, `hasReturningVisitorFlag`, `markReturningVisitor`) to query `apps/server`'s `/occupancy` endpoint derived from `NEXT_PUBLIC_WS_URL` without throwing when the server is unreachable.
  - Built `MainMenuScreen.tsx` in `packages/ui/src/MainMenuScreen.tsx` rendered before `DynamicZooGameCanvas` mounts in `apps/web/src/components/ZooWorldExperience.tsx`:
    - **PROFILE block**: display name input with existing validation, avatar preview chip, and avatar customizer modal integration persisted via `identityStorage`.
    - **SERVER/ZONE block**: live zone occupancy list from `apps/server` (`/occupancy`) with Zoo Lobby selected by default, first-time visitor lock to Zoo Lobby, returning visitor zone picker, and `?room=...` shared link pre-selection.
    - **PLAY button** (`data-testid="enter-world-btn"`): validates identity and server/room readiness, mounts the 3D canvas, and joins the selected zone/room via `NEXT_PUBLIC_WS_URL`.
    - **Settings integration**: added `isSettingsModalOpen` / `setSettingsModalOpen` to `gameStore` so `SettingsMenuModal` is reachable both from the pre-game Main Menu and in-game (`ESC`), sharing the same settings state.
    - **Designed failure states**: `menu-error-server-unreachable` (with Retry button), `menu-error-room-full`, and `menu-error-name-rejected` — never rendering a blank screen.
  - Removed the legacy in-flow display name prompt from `EntryLoadingScreen.tsx` so identity comes exclusively from the Main Menu.
- **Check Results**:
  - `pnpm typecheck`: 7/7 packages passed (`0` errors)
  - `pnpm lint`: 7/7 packages passed (`0` errors)
  - `pnpm test`: 23 test files, 91 unit/integration tests passed (`@online-zoo/server`, `@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/game-assets`)
  - Playwright E2E (`e2e/playable-zoo-world.spec.ts`, `e2e/multiplayer-sync.spec.ts`): 2 passed — verified pre-canvas Main Menu rendering, shared Settings modal, `menu-error-name-rejected` failure state, Play entry into `Zoo Lobby`, gate transition to `Panda Forest`, and two browser sessions joining via `?room=...` + Play and seeing each other move.
- **Assumptions**:
  - Logged in `specs/main-menu/ASSUMPTIONS.md`: HTTP `/occupancy` URL is derived by converting `ws://` / `wss://` in `NEXT_PUBLIC_WS_URL` to `http://` / `https://` at `/occupancy`; returning visitors are tracked via `localStorage` key `'online-zoo:returning-visitor:v1'` set upon clicking PLAY; default `Explorer #...` names keep `isCustomized: false` unless edited so sequential room visitor labels (`Explorer #101`, `Explorer #102`) continue to work when players do not customize their name.
- **Anything to Review**:
  - None; all unit, server integration, and Playwright E2E checks are green.
