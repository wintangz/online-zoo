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


## `art-style-unification`

- **Slug**: `art-style-unification`
- **Branch**: `fix/art-style-unification`
- **Commit Hash**: `ce9dfb3`
- **What Changed**:
  - Wrote the Flat-Shaded Low-Poly Sanctuary Art Style Guide in `specs/art-style-unification/spec.md` codifying the 20-color `ZOO_PALETTE` in `@online-zoo/game-assets`, hard per-face normals (`flatShading: true`), zero photographic textures, and zero ad-hoc hex literals in scene/entity files.
  - Updated `packages/game-assets/scripts/generate-glb-assets.mjs` and `packages/game-assets/src/manifest.ts` to generate flat-shaded low-poly `.glb` models strictly from `ZOO_PALETTE` for the animal roster (`animal-panda`, `animal-penguin`, `animal-otter` with `ANIMAL_SPECIES_TO_ASSET_ID` / `getAnimalAssetId` lookup), restyled the existing 6 avatar and prop `.glb` models while preserving their exact manifest IDs and `boundingRadius` values, and added `.glb` models for dining/lobby props (`prop-food-stall`, `prop-cafe-table`, `prop-picnic-table`, `prop-ticket-booth`, `prop-fountain`).
  - Refactored `packages/game-client/src/entities/ZooAnimalsLayer.tsx` to load and render the registered `.glb` animal models from `ASSET_MANIFEST` via `useGLTF(getAssetUrl(getAnimalAssetId(speciesId)))` instead of code-assembled primitive stacks.
  - Created `packages/game-client/src/materials/paletteMaterials.ts` providing shared flat-shaded palette materials (`PALETTE_MATERIALS`, `PALETTE_COLORS`, `createFlatStandardMaterial`) and refactored all scene and entity files in `packages/game-client/src/` (`TerrainAndPaths.tsx`, `PerimeterEnclosure.tsx`, `PondShoreline.tsx`, `InstancedFoliage.tsx`, `InteractiveProps.tsx`, `PandaForestScene.tsx`, `ZooLobbyScene.tsx`, `AvatarVisualRig.tsx`) so code-built geometry remains only for terrain, paths, water, and fences, with zero color literals outside `paletteMaterials.ts`.
  - Added automated compliance test `packages/game-client/__tests__/artStyleCompliance.test.ts` scanning all scene/entity files in `packages/game-client/src/` and failing on any `#...`, `rgb(...)`, `hsl(...)`, or `0x...` literal outside `paletteMaterials.ts` or any `getAssetUrl(...)` reference missing from `ASSET_MANIFEST`.
- **Check Results**:
  - `pnpm typecheck`: 7/7 packages passed (`0` errors)
  - `pnpm lint`: 7/7 packages passed (`0` errors)
  - `pnpm test`: 24 test files, 95 unit/integration tests passed (`@online-zoo/server`, `@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/game-assets`)
  - Playwright E2E (`e2e/playable-zoo-world.spec.ts`, `e2e/multiplayer-sync.spec.ts`): 2 passed — verified flat-shaded low-poly GLB scenes, props, and animals across Zoo Lobby and Panda Forest.
- **Assumptions**:
  - Logged in `specs/art-style-unification/ASSUMPTIONS.md`: Animal species map to `'animal-<species>'` manifest IDs via `ANIMAL_SPECIES_TO_ASSET_ID`; kiosk/table/lobby structures are registered as `.glb` prop entries (`prop-food-stall`, `prop-cafe-table`, `prop-picnic-table`, `prop-ticket-booth`, `prop-fountain`) while the original 6 manifest IDs and their `boundingRadius` values remain unchanged.
- **Anything to Review**:
  - None; `apps/server` is completely untouched and all compliance, unit, and E2E tests are green.


## `hud-declutter` — `3ee484e`

- **Branch**: `fix/hud-declutter`
- **Commit Hash**: `3ee484e`
- **What Changed**:
  - Updated `packages/game-core/src/state/gameStore.ts` to add `isDevDebugOpen: boolean` (default `false`), `isChatPanelOpen: boolean` (default `false`), `computeIsAnyPanelOpen(state)`, and automatic `isCursorRevealed` synchronization whenever any dock panel or modal opens or closes.
  - Updated `packages/game-client/src/runtime/GameLoopController.tsx` so camera mouse-look (`lookDeltaX`, `lookDeltaY`, `zoomDelta`) pauses whenever any UI panel is open, and `packages/game-client/src/entities/ZooAnimalsLayer.tsx` so floating 3D animal debug tags are hidden by default and only shown when `isDevDebugOpen` is `true`.
  - Refactored `packages/ui/src/GameHudOverlay.tsx` so persistent on-screen elements are strictly limited to: (1) Player Name + Avatar Chip (`local-visitor-badge` / `open-avatar-customizer-btn`), (2) Current Zone Name (`hud-zone-badge`), (3) Interact Prompt (when something is interactable), (4) Proximity Chat Bubbles (in-world `<Html>`), and (5) ONE compact dock row (`hud-action-dock`) containing Chat & Emotes (`hud-chat-panel-btn`), Social & Friends (`toggle-social-drawer-btn`), Passport (`hud-passport-btn`), Encyclopedia (`animal-encyclopedia-button`), Food Stall (`hud-food-stall-btn`), Food Bag (`toggle-food-inventory-btn`), Events (`hud-events-btn`), Help & Beta (`hud-help-beta-btn`), Settings (`open-settings-btn`), and the Dev/Debug toggle (`hud-dev-debug-toggle-btn`).
  - Removed the permanent `desktop-control-hints` strip and top-right `hud-utility-bar`, gated `hud-secondary-details-strip` and `animal-status-strip` behind `isDevDebugOpen`, gated `proximity-chat-panel` and `emote-picker-bar` behind `isChatPanelOpen`, and capped all UI panels/modals at `max-h-[60vh]` on mobile viewports so no panel covers more than ~60% of a phone screen.
  - Updated `apps/server/__tests__/hudAndGateErgonomics.test.ts`, `apps/web/e2e/playable-zoo-world.spec.ts`, `apps/web/e2e/multiplayer-sync.spec.ts`, and `apps/web/e2e/hud-gate-ergonomics.spec.ts` to verify the decluttered fresh-join HUD, 1-to-2 click reachability, mouse-look pause on panel open, mobile 60% height cap, and Dev/Debug toggle.
- **Check Results**:
  - `pnpm typecheck`: **PASS** (12/12 tasks green)
  - `pnpm lint`: **PASS** (7/7 packages green)
  - `pnpm test`: **PASS** (24 test files, 96 tests green across `@online-zoo/game-assets`, `@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/server`)
  - Playwright E2E (`playable-zoo-world.spec.ts` + `multiplayer-sync.spec.ts`): **PASS** (2 passed)
- **Assumptions**:
  - Logged in `specs/hud-declutter/ASSUMPTIONS.md`: retained `isHudCompact` defaulting to `false` for backward compatibility with unit tests while introducing `isDevDebugOpen` (default `false`) for diagnostic/debug badges and `isChatPanelOpen` (default `false`) for the dock-opened Chat & Emotes panel.
- **Anything to Review**:
  - None; zero server or protocol changes were made, and all unit and E2E checks are green.
