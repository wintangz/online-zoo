# Tasks: Streamlined HUD & Entrance Gate Arrival (`011-hud-gate-ergonomics`)

**Input**: Design documents from `/specs/011-hud-gate-ergonomics/`  
**Prerequisites**: [plan.md](file:///y:/Repos/online-zoo/specs/011-hud-gate-ergonomics/plan.md), [spec.md](file:///y:/Repos/online-zoo/specs/011-hud-gate-ergonomics/spec.md), [data-model.md](file:///y:/Repos/online-zoo/specs/011-hud-gate-ergonomics/data-model.md)

## Phase 1: Core World Layout & Spawn-Behind-Gate Authority (`US1`)

- [X] T001 [US1] Add `entranceGatePosition: [number, number, number]` to `WorldLayoutConfig` and `isHudCompact` / `setHudCompact` / `toggleHudCompact` to `GameStoreState` in `packages/game-core/src/types.ts` and `packages/game-core/src/state/gameStore.ts`
- [X] T002 [US1] Update `PANDA_FOREST_LAYOUT` in `packages/game-core/src/world/pandaForestLayout.ts` to set `entranceGatePosition: [0, 0, 16.4]`, `gate-pillar-west` at `[-2.1, 0, 16.4]`, and `gate-pillar-east` at `[2.1, 0, 16.4]`
- [X] T003 [US1] Update `computeSpawnPosition` in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` and `apps/web/server.mjs` (plus `PANDA_FOREST_OBSTACLES` in `apps/web/server.mjs`) so all 16 spawn slots are placed on the South Arrival Terrace (`Z >= 18.0`) behind the gate at `Z = 16.4`

## Phase 2: 3D Sanctuary Entrance Gate & Approach Path (`US1`)

- [X] T004 [US1] Update `packages/game-client/src/environment/PerimeterEnclosure.tsx` to render the Sanctuary Entrance Gate Archway at `PANDA_FOREST_LAYOUT.entranceGatePosition` (`[0, 0, 16.4]`) with pillars at `[-2.1, 0, 16.4]` and `[2.1, 0, 16.4]`, flanking bamboo-stone entrance wing fences, and warm welcome lanterns
- [X] T005 [US1] Update `packages/game-client/src/environment/TerrainAndPaths.tsx` so the South Arrival Terrace and flagstone stepping stones lead from `Z = 21` through the Entrance Gate (`Z = 16.4`) into the Welcome Plaza

## Phase 3: Streamlined HUD, Bottom Activity Dock & Non-Overlapping Panels (`US2`)

- [X] T006 [US2] Redesign `packages/ui/src/GameHudOverlay.tsx` into a compact top-left status bar with `hud-compact-toggle-btn` (`KeyH` shortcut), a 3-pill top-right utility bar (`Avatar`, `? Help`, `Menu`), and a unified 6-pill Bottom-Right Activity Dock (`hud-action-dock`)
- [X] T007 [US2] Update `packages/ui/src/BetaReadinessOverlay.tsx`, `packages/ui/src/AnimalSimulationOverlay.tsx`, and `packages/ui/src/SocialInteractionOverlay.tsx` so `onboarding-guide-modal` renders as a compact arrival card (`left-3 top-[8.25rem] max-w-xs`) with zero overlap against bottom-left chat/emotes or right-side drawers, and animal/chat panels use compact footprints that respect `isHudCompact`

## Phase 4: Unit & E2E Verification (`US1`, `US2`)

- [X] T008 [US1] [US2] Add unit test suite `packages/game-core/__tests__/hudAndGateErgonomics.test.ts` verifying `entranceGatePosition`, all 16 spawn slots starting behind the gate (`Z >= 18.0 > 16.4`), collision-free forward walk through the gate (`Z = 18 -> 12`), pillar collision blocking, and `isHudCompact` store actions
- [X] T009 [US1] [US2] Add Playwright E2E test `apps/web/e2e/hud-gate-ergonomics.spec.ts` and verify `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E suites pass with zero errors
