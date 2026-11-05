# Tasks: HUD Declutter (`hud-declutter`)

**Input**: Design documents from `/specs/hud-declutter/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

## Phase 1: Client Store Panel Cursor Sync & Dev/Chat Toggles (`@online-zoo/game-core`, `@online-zoo/game-client`)

- [X] T001 Update `packages/game-core/src/state/gameStore.ts` to add `isDevDebugOpen` (default `false`), `isChatPanelOpen` (default `false`), `isAnyUiPanelOpen(state)`, and automatic `isCursorRevealed` synchronization whenever any dock panel/modal opens or closes
- [X] T002 Update `packages/game-client/src/runtime/GameLoopController.tsx` and `packages/game-client/src/entities/ZooAnimalsLayer.tsx` so camera mouse-look pauses when any UI panel is open and 3D animal debug tags are hidden unless `isDevDebugOpen` is `true`

---

## Phase 2: Decluttered HUD, Single Dock Row & 60% Mobile Panel Cap (`@online-zoo/ui`)

- [X] T003 Refactor `packages/ui/src/GameHudOverlay.tsx` so persistent on-screen elements are strictly limited to the top-left Player Name + Avatar Chip + Current Zone Name (`hud-status-bar`) and ONE compact dock row (`hud-action-dock`), removing the top-right utility bar and permanent desktop controls hint strip and gating `hud-secondary-details-strip` behind `isDevDebugOpen`
- [X] T004 Refactor `packages/ui/src/SocialInteractionOverlay.tsx` and `packages/ui/src/AnimalSimulationOverlay.tsx` so the Chat & Emotes panel renders only when `isChatPanelOpen` is `true`, `animal-status-strip` renders only when `isDevDebugOpen` is `true`, and all panels enforce `max-h-[60vh] sm:max-h-[80vh]`
- [X] T005 Update `FoodAndDiningOverlay.tsx`, `ZooPassportOverlay.tsx`, `EventsAndActivitiesOverlay.tsx`, `BetaReadinessOverlay.tsx`, `SettingsMenuModal.tsx`, `AvatarCustomizerModal.tsx`, and `InfoPlaqueModal.tsx` to enforce `max-h-[60vh] sm:max-h-[80vh]` on mobile viewports

---

## Phase 3: Unit & Playwright E2E Verification

- [X] T006 Update `apps/server/__tests__/hudAndGateErgonomics.test.ts` and `apps/web/e2e/playable-zoo-world.spec.ts` + `apps/web/e2e/multiplayer-sync.spec.ts` to test the decluttered HUD on fresh join, panel mouse-look pause, 2-click reachability, and the Dev/Debug toggle (`hud-dev-debug-toggle-btn`)
- [X] T007 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E tests and verify all checks pass
