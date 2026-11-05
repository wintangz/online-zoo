# Tasks: Pre-Game Main Menu (`main-menu`)

**Input**: Design documents from `/specs/main-menu/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

## Phase 1: Occupancy Client & Shared Main Menu State (`@online-zoo/game-core`)

- [X] T001 Create `packages/game-core/src/multiplayer/occupancyClient.ts` with `deriveOccupancyUrlFromWsUrl`, `fetchServerOccupancy`, and `MainMenuFailureState` types, exported from `@online-zoo/game-core`
- [X] T002 Update `packages/game-core/src/state/gameStore.ts` to support main menu Settings modal toggle (`isSettingsModalOpen`, `setSettingsModalOpen`) and returning visitor tracking (`isReturningVisitor`)

---

## Phase 2: Pre-Game Main Menu UI, Settings & Entry Loading Cleanup (`@online-zoo/ui`, `@online-zoo/web`)

- [X] T003 Create `packages/ui/src/MainMenuScreen.tsx` implementing the PROFILE block (display name input + validation + avatar preview + customizer trigger), SERVER/ZONE block (live occupancy list from `/occupancy`, Zoo Lobby default, first-time lobby lock vs returning zone selection, `?room=` pre-selection), PLAY button (`data-testid="enter-world-btn"`), Settings button, and designed failure states (`server unreachable`, `room full`, `name rejected`)
- [X] T004 Update `packages/ui/src/EntryLoadingScreen.tsx` to remove the old in-flow display name prompt and avatar customizer controls so it serves strictly as the loading/zone-transition screen
- [X] T005 Update `packages/ui/src/SettingsMenuModal.tsx` and `packages/ui/src/index.ts` so `SettingsMenuModal` works both from the pre-game Main Menu and in-game (`ESC` / HUD button), sharing the same `gameStore.settings`
- [X] T006 Update `apps/web/src/components/ZooWorldExperience.tsx` to render `MainMenuScreen` before mounting `DynamicZooGameCanvas`, and mount the canvas + join the selected zone/room when **PLAY** is confirmed

---

## Phase 3: Unit, Integration & E2E Tests

- [X] T007 Add unit tests in `apps/server/__tests__/mainMenu.test.ts` testing `deriveOccupancyUrlFromWsUrl`, `fetchServerOccupancy`, first-time vs returning zone selection rules, and designed failure states (`server unreachable`, `room full`, `name rejected`)
- [X] T008 Update `apps/web/e2e/playable-zoo-world.spec.ts` and `apps/web/e2e/multiplayer-sync.spec.ts` to verify the new pre-canvas Main Menu entry path, failure state handling, and two browser windows joining and seeing each other move
- [X] T009 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E tests and verify all checks pass

