---
description: "Task list for Feature 001: Playable Zoo World implementation"
---

# Tasks: Playable Zoo World (Feature 001)

**Input**: Design documents from `/specs/001-playable-zoo-world/`
**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: Automated unit, integration, lifecycle, and E2E tests are included as required by the implementation plan's Testing Requirements and Constitution Principle VII.

**Organization**: Tasks are grouped by user story (`US1`–`US4`) to enable independent implementation and testing of each vertical slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths and verbatim data-model constraints are included in task descriptions

---

## Phase 1: Setup (Shared Monorepo Infrastructure)

**Purpose**: Initialize the 6-package `pnpm` + `Turborepo` workspace per [plan.md](./plan.md).

- [X] T001 Initialize root `pnpm` workspace and Turborepo pipeline in `package.json`, `pnpm-workspace.yaml`, and `turbo.json`
- [X] T002 [P] Create shared TypeScript, Tailwind CSS, ESLint, and Vitest base configurations in `packages/config/package.json`, `packages/config/tsconfig.base.json`, and `packages/config/tailwind.preset.ts`
- [X] T003 [P] Initialize `@online-zoo/game-core` package manifest and TypeScript config in `packages/game-core/package.json` and `packages/game-core/tsconfig.json`
- [X] T004 [P] Initialize `@online-zoo/game-assets` package manifest and TypeScript config in `packages/game-assets/package.json` and `packages/game-assets/tsconfig.json`
- [X] T005 [P] Initialize `@online-zoo/ui` and `@online-zoo/game-client` package manifests and TypeScript configs in `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/game-client/package.json`, and `packages/game-client/tsconfig.json`
- [X] T006 [P] Initialize Next.js App Router application shell and Playwright E2E configuration in `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.mjs`, `apps/web/tailwind.config.ts`, and `apps/web/playwright.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core contracts, state partitioning, spatial layout descriptors, GLB asset pipeline, and unified input base that MUST be complete before user story implementation begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Define shared domain types and contracts (`PlayerAvatarState`, `FollowCameraState`, `NormalizedInputSnapshot`, `InteractiveObjectDescriptor`, `UserSettings`) enforcing verbatim constraints (`locomotionState`: `'Idle' | 'Walking' | 'Running' | 'Jumping'`, `activeDevice`: `'desktop' | 'touch'`, `archetype`: `'info_plaque' | 'world_prop'`, `propReactionType`: `'toggle_lantern' | 'ring_chime' | 'rest_bench' | undefined`) in `packages/game-core/src/types.ts`
- [X] T008 [P] Implement 60 Hz mutable runtime state (`MutableGameRuntimeState`) and discrete Zustand store (`useGameStore` with `GameSessionSlice` `phase`: `'loading' | 'ready' | 'playing' | 'paused'`, `loadingProgress`: `0 to 100`, and `UserSettingsSlice` persisted to `localStorage` under `online-zoo:settings:v1` with `cameraSensitivity` in `Range [0.2, 2.5], default 1.0`, `invertCameraY` `Default false`, `audioMuted` `Default false`, `masterVolume` in `Range [0.0, 1.0], default 0.7`, `qualityTier` `'auto' | 'low' | 'medium' | 'high' (Default 'auto')`, `showControlHints` `Default true`) in `packages/game-core/src/state/gameStore.ts`
- [X] T009 [P] Implement `PandaForestZoneLayout` spatial descriptors (`Spawn Transform`: `Position [0, 0.1, 18], initial facing yaw 0`, playable zone bounds `[-40, 40] X/Z, y >= 0`, `Pond & Shoreline Collider`: `Circular water feature centered at [-8, 0, -4] (radius: 6.5m)`, `Perimeter Boundary`: `Stylized bamboo-and-stone enclosure fence (radius: 36m)`, and solid obstacle placements) in `packages/game-core/src/world/pandaForestLayout.ts`
- [X] T010 [P] Implement deterministic `.glb` model generator script and typed `AssetManifest` (`avatar-explorer`, `prop-bamboo-cluster`, `prop-stone-lantern`, `prop-habitat-plaque`, `prop-wind-chime`, `prop-wooden-bench`) in `packages/game-assets/scripts/generate-glb-assets.mjs` and `packages/game-assets/src/manifest.ts`
- [X] T011 Implement GLB/glTF asset loader, preloader URL registry, and cache disposal utilities (`clearAssetCache`) in `packages/game-assets/src/loaders.ts` and `packages/game-assets/src/index.ts`
- [X] T012 Generate binary `.glb` assets into `apps/web/public/assets/models/` and add manifest verification test in `packages/game-assets/__tests__/manifest.test.ts`
- [X] T013 Implement unified `InputController` base class enforcing movement vector normalization (`moveX` and `moveZ` in `[-1.0, 1.0]; sqrt(moveX^2 + moveZ^2) <= 1.0`), edge-triggered action flags, and `resetAll()` on focus loss or resize in `packages/game-core/src/input/inputController.ts`
- [X] T014 Export foundational core contracts and state modules from `packages/game-core/src/index.ts`

**Checkpoint**: Foundation ready — user story implementation can now proceed.

---

## Phase 3: User Story 1 - Enter and Explore the Panda Forest on Desktop (Priority: P1) 🎯 MVP

**Goal**: Deliver the playable 3D Panda Forest on desktop browsers with third-person avatar locomotion (`Idle`, `Walking`, `Running`, `Jumping`), camera-relative movement (`WASD`, `Shift`, `Space`), Genshin Impact-style free-look mouse camera rotation + zoom + `Alt` cursor reveal, solid obstacle/pond-shoreline/perimeter collisions, and camera obstacle avoidance.

**Independent Test**: Launch the app in a desktop browser, enter the Panda Forest, verify `WASD` movement in all 8 directions with `<0.3s` facing rotation, `Shift` running, `Space` jumping, 360-degree mouse camera orbit + scroll zoom, `Alt` cursor reveal, solid collision blocking against rocks/trees/pond shoreline/perimeter fence, and camera pull-in against obstacles.

### Tests for User Story 1

- [X] T015 [P] [US1] Write unit tests for `CharacterControllerCore` (movement in all 8 directions, `'Idle' | 'Walking' | 'Running' | 'Jumping'` state transitions, `Horizontal speed <= 7.5 m/s (run), <= 4.0 m/s (walk)`, `Normalized radians [-pi, pi]` facing yaw within `<0.3s`, `Jump impulse +6.5 m/s; gravity -18.0 m/s^2; terminal -25.0 m/s`, and mid-air repeat-jump prevention) in `packages/game-core/__tests__/characterController.test.ts`
- [X] T016 [P] [US1] Write unit tests for `CameraControllerCore` (`yaw` `Continuous [0, 2pi) wraps cleanly (360° orbit)`, `pitch` `Clamped to [0.15 rad, 1.35 rad] (~8.5° to 77°)`, `targetDistance` `Clamped to [2.5 m, 10.0 m]`, and obstacle pull-in `effectiveDistance` in `[0.8 m, targetDistance]`) in `packages/game-core/__tests__/cameraController.test.ts`
- [X] T017 [P] [US1] Write unit tests for desktop keyboard/mouse bindings (`WASD`, `Shift` `runHeld`, `Space` `jumpPressed`, `ESC` `menuPressed`, `Alt` `cursorRevealHeld`, mouse look/zoom deltas) and collision boundary enforcement (rocks, trees, pond shoreline `centered at [-8, 0, -4] (radius: 6.5m)`, and perimeter `radius: 36m`) in `packages/game-core/__tests__/desktopInputAndCollision.test.ts`

### Implementation for User Story 1

- [X] T018 [P] [US1] Implement `CharacterControllerCore` enforcing ` Within playable zone bounds ([-40, 40] X/Z, y >= 0)`, `Horizontal speed <= 7.5 m/s (run), <= 4.0 m/s (walk)`, `Normalized radians [-pi, pi]` yaw interpolation, `Jump impulse +6.5 m/s; gravity -18.0 m/s^2; terminal -25.0 m/s`, and `'Idle' | 'Walking' | 'Running' | 'Jumping'` transitions in `packages/game-core/src/character/characterController.ts`
- [X] T019 [P] [US1] Implement `CameraControllerCore` enforcing `yaw` `Continuous [0, 2pi) wraps cleanly (360° orbit)`, `pitch` `Clamped to [0.15 rad, 1.35 rad] (~8.5° to 77°)`, `targetDistance` `Clamped to [2.5 m, 10.0 m]`, `effectiveDistance` `[0.8 m, targetDistance]`, and `pivotOffset` `Default [0, 1.4, 0] above avatar base` in `packages/game-core/src/camera/cameraController.ts`
- [X] T020 [US1] Implement desktop DOM keyboard, wheel zoom, Pointer Lock free-look, and Genshin Impact-style `Alt` cursor reveal (`cursorRevealHeld`) bindings in `packages/game-core/src/input/domInputBindings.ts`
- [X] T021 [P] [US1] Build modular Panda Forest terrain, stone/boardwalk walking paths, and outer perimeter enclosure fence (`radius: 36m`) with fixed Rapier colliders in `packages/game-client/src/environment/TerrainAndPaths.tsx` and `packages/game-client/src/environment/PerimeterEnclosure.tsx`
- [X] T022 [P] [US1] Build stylized pond with solid blocked shoreline collider (`Circular water feature centered at [-8, 0, -4] (radius: 6.5m)`) and GPU-instanced bamboo clusters, rocks, and trees (`<Instances>`) with solid fixed colliders in `packages/game-client/src/environment/PondShoreline.tsx` and `packages/game-client/src/environment/InstancedFoliage.tsx`
- [X] T023 [P] [US1] Implement `PlayerAvatarEntity` integrating Rapier `KinematicCharacterController` capsule collider (`isGrounded` `Reported by Rapier KinematicCharacterController`) and animated third-person GLB/stylized character mesh (`Idle`, `Walking`, `Running`, `Jumping`) in `packages/game-client/src/entities/PlayerAvatarEntity.tsx`
- [X] T024 [P] [US1] Implement `FollowCameraRig` performing per-frame Rapier obstacle raycasts from `pivotOffset` `[0, 1.4, 0]` to clamp `effectiveDistance` in `[0.8 m, targetDistance]` and prevent camera clipping in `packages/game-client/src/entities/FollowCameraRig.tsx`
- [X] T025 [US1] Implement `GameLoopController` (single 60 Hz `useFrame` updating `MutableGameRuntimeState` without React re-renders) and `PandaForestScene` composition in `packages/game-client/src/runtime/GameLoopController.tsx` and `packages/game-client/src/environment/PandaForestScene.tsx`
- [X] T026 [US1] Implement `ZooGameCanvas` with `<Canvas>`, `<PerformanceMonitor>` adaptive DPR/shadow scaling, `<Physics>`, window resize handling, and deterministic resource cleanup in `packages/game-client/src/runtime/ZooGameCanvas.tsx` and `packages/game-client/src/index.ts`
- [X] T027 [US1] Mount `ZooGameCanvas` via client-only dynamic boundary in `apps/web/src/app/page.tsx`, `apps/web/src/app/layout.tsx`, and `apps/web/src/app/globals.css`

**Checkpoint**: User Story 1 is complete and independently playable on desktop browsers (MVP!).

---

## Phase 4: User Story 2 - Explore the Panda Forest on Mobile Touch Devices (Priority: P2)

**Goal**: Enable full first-class exploration on mobile and touch browsers with an on-screen Virtual Joystick (walking speed), a dedicated on-screen `Run` button (`runHeld`), touch-and-drag 360-degree camera rotation + pinch zoom, and touch action buttons (`Jump`, `Interact`, `Menu`).

**Independent Test**: Open the game on a touchscreen viewport, steer in 360 degrees with the virtual joystick to walk, hold/toggle the on-screen `Run` button to run, drag on the camera region to orbit 360 degrees, and tap `Jump` to jump.

### Tests for User Story 2

- [X] T028 [P] [US2] Write unit tests for mobile virtual joystick vector clamping (`[-1.0, 1.0]; sqrt(moveX^2 + moveZ^2) <= 1.0` at walking speed), dedicated `Run` touch button (`runHeld`), touch-drag camera look deltas, pinch zoom, and `Jump` touch action in `packages/game-core/__tests__/touchControls.test.ts`

### Implementation for User Story 2

- [X] T029 [P] [US2] Implement mobile touch gesture adapters (virtual joystick walking vector, dedicated `Run` hold/toggle button, touch-drag camera look, and two-finger pinch zoom) in `packages/game-core/src/input/touchInputBindings.ts`
- [X] T030 [P] [US2] Create responsive `TouchControlsOverlay` UI component (left Virtual Joystick, right touch-drag camera region, and dedicated `Run`, `Jump`, `Interact`, and `Menu` touch buttons) in `packages/ui/src/TouchControlsOverlay.tsx`
- [X] T031 [US2] Connect `TouchControlsOverlay` to `InputController` and automatic device mode switching (`activeDevice: 'desktop' | 'touch'`) in `packages/ui/src/index.ts` and `apps/web/src/app/page.tsx`
- [X] T032 [US2] Configure mobile touch viewport rules (`touch-action: none`, overscroll prevention, orientation reflow) in `apps/web/src/app/globals.css` and `apps/web/src/app/layout.tsx`

**Checkpoint**: User Stories 1 and 2 both work seamlessly across desktop and mobile browsers.

---

## Phase 5: User Story 3 - Interact with Environmental Objects (Priority: P3)

**Goal**: Provide a reusable spatial interaction detection and dispatch system supporting both `info_plaque` (UI habitat info cards) and `world_prop` (3D visual/animation reactions for lantern, bamboo wind chime, and scenic bench) archetypes.

**Independent Test**: Walk within range of any interactive object in the Panda Forest, confirm the contextual prompt appears within `0.2s`, trigger the interaction via `E` or the touch `Interact` button, verify UI info card or 3D prop state change occurs, and walk away to confirm clean dismissal.

### Tests for User Story 3

- [X] T033 [P] [US3] Write unit tests for `InteractionSystem` (detection within `interactionRadius` `[1.5 m, 4.5 m]`, closest + facing-angle disambiguation for overlapping objects, and `'info_plaque' | 'world_prop'` dispatch) in `packages/game-core/__tests__/interactionSystem.test.ts`

### Implementation for User Story 3

- [X] T034 [P] [US3] Implement `InteractionSystem` and Panda Forest interactive object descriptors (`id`: `Unique non-empty slug`, `title`: `1–60 chars`, `promptAction`: `1–30 chars`, `archetype`: `'info_plaque' | 'world_prop'`, `interactionRadius`: `[1.5 m, 4.5 m]`, `infoCard`: `{ heading: string; body: string; facts: string[] } | undefined` `Required when archetype === 'info_plaque'`, and `propReactionType`: `'toggle_lantern' | 'ring_chime' | 'rest_bench' | undefined` `Required when archetype === 'world_prop'`) in `packages/game-core/src/interaction/interactionSystem.ts`
- [X] T035 [P] [US3] Build 3D interactive world props (`HabitatInfoPlaque`, `StoneGardenLantern` with emissive light toggle, `BambooWindChime` with ring sway animation, and `ScenicOverlookBench` with rest feedback) in `packages/game-client/src/environment/InteractiveProps.tsx`
- [X] T036 [P] [US3] Create `InteractionPromptBanner` (device-aware `E` vs `Tap` prompt) and `InfoPlaqueModal` overlay components in `packages/ui/src/InteractionPromptBanner.tsx` and `packages/ui/src/InfoPlaqueModal.tsx`
- [X] T037 [US3] Integrate `InteractionSystem.evaluate` and `trigger` into `GameLoopController` (updating `useGameStore.focusedObject` only when targeted ID changes and auto-dismissing active plaque modals on out-of-range movement) in `packages/game-client/src/runtime/GameLoopController.tsx`
- [X] T038 [US3] Mount `InteractiveProps` in `PandaForestScene` and render `InteractionPromptBanner` and `InfoPlaqueModal` in `packages/game-client/src/environment/PandaForestScene.tsx` and `apps/web/src/app/page.tsx`

**Checkpoint**: User Stories 1, 2, and 3 are complete and independently verifiable.

---

## Phase 6: User Story 4 - Navigate Entry Flow, HUD, and Settings Menu (Priority: P4)

**Goal**: Complete the session loop with an Entry/Loading screen, minimal gameplay HUD (locomotion state badge, `Alt` cursor hint, control tips), and an `ESC`/touch Settings Menu persisting user preferences (`cameraSensitivity`, `invertCameraY`, `audioMuted`, `masterVolume`, `qualityTier`, `showControlHints`).

**Independent Test**: Load the game, observe the loading screen and click `"Enter Panda Forest"`, inspect the minimal HUD, press `ESC` (or tap `Menu`) to open Settings, adjust camera sensitivity and audio mute, close the menu, and verify the updated sensitivity immediately governs camera rotation.

### Tests for User Story 4

- [X] T039 [P] [US4] Write unit tests for session phase transitions (`'loading' | 'ready' | 'playing' | 'paused'`), settings clamping (`cameraSensitivity` in `Range [0.2, 2.5], default 1.0`, `masterVolume` in `Range [0.0, 1.0], default 0.7`), and `localStorage` persistence under `online-zoo:settings:v1` in `packages/game-core/__tests__/sessionAndSettings.test.ts`

### Implementation for User Story 4

- [X] T040 [P] [US4] Create `EntryLoadingScreen` displaying asset `loadingProgress` (`0 to 100`) and the `"Enter Panda Forest"` action button in `packages/ui/src/EntryLoadingScreen.tsx`
- [X] T041 [P] [US4] Create `GameHudOverlay` displaying active locomotion state (`'Idle' | 'Walking' | 'Running' | 'Jumping'`), desktop `Alt` cursor reveal indicator, control hints, and Menu button in `packages/ui/src/GameHudOverlay.tsx`
- [X] T042 [P] [US4] Create `SettingsMenuModal` (`ESC` / touch Menu toggle, `cameraSensitivity` slider `[0.2, 2.5]`, `invertCameraY` toggle, `audioMuted` toggle, `masterVolume` slider `[0.0, 1.0]`, `qualityTier` selector `'auto' | 'low' | 'medium' | 'high'`, and Resume button) in `packages/ui/src/SettingsMenuModal.tsx`
- [X] T043 [US4] Connect `EntryLoadingScreen`, `GameHudOverlay`, and `SettingsMenuModal` to `useGameStore` and `ZooGameCanvas` pause/cursor-unlock lifecycle in `packages/ui/src/index.ts` and `apps/web/src/app/page.tsx`

**Checkpoint**: All 4 User Stories are complete and integrated.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Lifecycle cleanup verification, browser resize resilience, E2E verification, documentation, and final performance tuning.

- [X] T044 [P] Write runtime lifecycle and resize tests verifying repeated `ZooGameCanvas` initialization/cleanup (DOM listener disposal, Pointer Lock exit, asset cache cleanup, input reset on blur/resize) in `packages/game-client/__tests__/runtimeLifecycle.test.ts`
- [X] T045 [P] Write Playwright E2E browser test suite verifying desktop `WASD`/mouse/`Alt`/`ESC`, mobile touch joystick/`Run`/`Jump`, object interactions, and browser resizing in `apps/web/e2e/playable-zoo-world.spec.ts`
- [X] T046 [P] Create root documentation with 3-step setup, build, run, and test instructions (`SC-008`, `FR-023`) in `README.md`
- [X] T047 Tune adaptive rendering quality tiers (`low | medium | high`), shadow map bounds, and instanced foliage draw calls in `packages/game-client/src/runtime/ZooGameCanvas.tsx`
- [X] T048 Run full verification pipeline (`pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`) per `specs/001-playable-zoo-world/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1: Setup (`T001`–`T006`)**: No dependencies — starts immediately.
- **Phase 2: Foundational (`T007`–`T014`)**: Depends on Phase 1 — BLOCKS all user stories.
- **Phase 3: User Story 1 (`T015`–`T027`, P1 MVP)**: Depends on Phase 2 completion.
- **Phase 4: User Story 2 (`T028`–`T032`, P2)**: Depends on Phase 2 completion (integrates cleanly with the unified `InputController` and `apps/web` shell from US1).
- **Phase 5: User Story 3 (`T033`–`T038`, P3)**: Depends on Phase 2 completion (mounts interactive objects into `PandaForestScene` and `GameLoopController`).
- **Phase 6: User Story 4 (`T039`–`T043`, P4)**: Depends on Phase 2 completion (connects HUD/Menu/Loading overlays to `useGameStore` and `apps/web`).
- **Phase 7: Polish (`T044`–`T048`)**: Depends on Phases 3–6 completion.

### Parallel Opportunities

- **Setup (Phase 1)**: `T002`, `T003`, `T004`, `T005`, `T006` can run in parallel after `T001`.
- **Foundational (Phase 2)**: `T008`, `T009`, `T010` can run in parallel after `T007`.
- **User Story 1 (Phase 3)**:
  - Tests `T015`, `T016`, `T017` can run in parallel.
  - Core controllers `T018`, `T019` and R3F environment/entity modules `T021`, `T022`, `T023`, `T024` can run in parallel across separate files.
- **User Story 2 (Phase 4)**: `T028`, `T029`, `T030` can run in parallel.
- **User Story 3 (Phase 5)**: `T033`, `T034`, `T035`, `T036` can run in parallel.
- **User Story 4 (Phase 6)**: `T039`, `T040`, `T041`, `T042` can run in parallel.
- **Polish (Phase 7)**: `T044`, `T045`, `T046` can run in parallel.

---

## Parallel Example: User Story 1 (MVP)

```bash
# 1. Run User Story 1 unit test authoring in parallel:
Task T015: "Write unit tests for CharacterControllerCore in packages/game-core/__tests__/characterController.test.ts"
Task T016: "Write unit tests for CameraControllerCore in packages/game-core/__tests__/cameraController.test.ts"
Task T017: "Write unit tests for desktop input & collision bounds in packages/game-core/__tests__/desktopInputAndCollision.test.ts"

# 2. Implement core controllers & 3D scene modules in parallel:
Task T018: "Implement CharacterControllerCore in packages/game-core/src/character/characterController.ts"
Task T019: "Implement CameraControllerCore in packages/game-core/src/camera/cameraController.ts"
Task T021: "Build TerrainAndPaths & PerimeterEnclosure in packages/game-client/src/environment/TerrainAndPaths.tsx"
Task T022: "Build PondShoreline & InstancedFoliage in packages/game-client/src/environment/PondShoreline.tsx"
Task T023: "Implement PlayerAvatarEntity in packages/game-client/src/entities/PlayerAvatarEntity.tsx"
Task T024: "Implement FollowCameraRig in packages/game-client/src/entities/FollowCameraRig.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (`T001`–`T006`).
2. Complete **Phase 2: Foundational** (`T007`–`T014`).
3. Complete **Phase 3: User Story 1** (`T015`–`T027`).
4. **STOP and VALIDATE**: Verify desktop 3D Panda Forest exploration, `WASD`/`Shift`/`Space` movement, Genshin-style free-look mouse camera + `Alt` cursor reveal, solid collisions, blocked pond shoreline, and camera obstacle avoidance.

### Incremental Delivery

1. **Setup + Foundational** → Monorepo, contracts, GLB assets, and core stores ready.
2. **+ User Story 1 (P1)** → Playable desktop Panda Forest exploration (MVP).
3. **+ User Story 2 (P2)** → Mobile touch Virtual Joystick + dedicated `Run` button + touch-drag camera.
4. **+ User Story 3 (P3)** → Contextual interactions with Habitat Info Plaques and animated 3D World Props.
5. **+ User Story 4 (P4)** → Complete Entry/Loading screen, minimal HUD, and `ESC` Settings Menu.
6. **+ Phase 7 Polish** → Lifecycle cleanup tests, Playwright E2E verification, and `README.md`.


---

## Phase 8: Convergence

- [X] T049 CRITICAL: Complete monorepo workspace and 6-package boundary setup (`apps/web`, `packages/config`, `packages/game-core`, `packages/game-assets`, `packages/game-client`, `packages/ui`) per Constitution II / plan: Project Structure (missing)
- [X] T050 CRITICAL: Complete Panda Forest 3D scene, third-person `CharacterControllerCore` (`Idle | Walking | Running | Jumping`), Rapier solid/perimeter/pond-shoreline colliders, and `CameraControllerCore` with obstacle pull-in per US1 / FR-001..FR-011 / SC-002..SC-005 (missing)
- [X] T051 CRITICAL: Complete unified `InputController` supporting desktop (`WASD`, `Shift`, `Space`, `ESC`, Pointer Lock free-look, `Alt` cursor reveal) and mobile touch (`TouchControlsOverlay` Virtual Joystick + dedicated `Run` button + touch-drag camera) per Constitution IV / US2 / FR-012..FR-014 (missing)
- [X] T052 Complete `InteractionSystem` and mixed-archetype interactive objects (`info_plaque` modal cards and `world_prop` 3D state reactions) per US3 / FR-015..FR-018 / SC-006 (missing)
- [X] T053 Complete `EntryLoadingScreen`, `GameHudOverlay`, and `SettingsMenuModal` (`localStorage` persistence under `online-zoo:settings:v1`) per US4 / FR-019..FR-022 (missing)
- [X] T054 Complete `.glb` asset generation (`packages/game-assets`), zero-re-render 60 Hz `GameLoopController`, adaptive quality tuning, and `README.md` 3-step build/run documentation per plan: Architectural Decisions / FR-023 / SC-001 / SC-007 / SC-008 (missing)
- [X] T055 Complete `Vitest` unit/lifecycle suites and `Playwright` E2E verification suite per Constitution VII / plan: Testing Requirements (missing)

---

## Phase 9: Control System Revision & Hardening

**Purpose**: Eliminate left-click text selection, fix the Pointer Lock / `isCursorRevealed` camera deadlock, support seamless dual-mode camera orbit (Pointer Lock free-look + LMB/RMB drag fallback with delta spike clamping), prevent `TouchControlsOverlay` from intercepting desktop mouse clicks, guard `Alt`/`ESC` key auto-repeat and HUD button `Space` focus activation, and eliminate 1-frame `useFrame` ordering lag.

- [X] T056 [P] [US1] Harden `InputController`, `gameStore` cursor/modal state transitions, and `domInputBindings` (fix `onPointerLockChange` / `isCursorRevealed` deadlock, support dual-mode Pointer Lock free-look + LMB/RMB mouse-drag camera orbit with `clientX`/`clientY` delta fallback and `[-80, 80]` px spike clamping, ignore `e.repeat` on `Alt`/`Escape`, support `KeyE`/`KeyF` interact, and suppress `selectstart`, `dragstart`, and canvas `contextmenu`) in `packages/game-core/src/input/inputController.ts`, `packages/game-core/src/state/gameStore.ts`, and `packages/game-core/src/input/domInputBindings.ts`
- [X] T057 [P] [US2] Fix `TouchControlsOverlay` and `TouchInputAdapter` so `touch-camera-zone` and `virtual-joystick-pad` never block desktop mouse clicks or hijack `activeDevice` to `'touch'` on mouse click, while preserving full mobile touch responsiveness in `packages/ui/src/TouchControlsOverlay.tsx` and `packages/game-core/src/input/touchInputBindings.ts`
- [X] T058 [P] [US4] Enforce global `user-select: none` (`-webkit-user-select: none`) and button focus blurring (`blur()` on click so `Space` jump never clicks focused HUD buttons) across `apps/web/src/app/globals.css`, `apps/web/src/components/ZooWorldExperience.tsx`, `packages/ui/src/EntryLoadingScreen.tsx`, `packages/ui/src/GameHudOverlay.tsx`, `packages/ui/src/InteractionPromptBanner.tsx`, `packages/ui/src/InfoPlaqueModal.tsx`, and `packages/ui/src/SettingsMenuModal.tsx`
- [X] T059 [US1] Reorder `GameLoopController` before `PlayerAvatarEntity` and `FollowCameraRig` in `PandaForestScene` and guard upward jump launch frame in `GameLoopController` in `packages/game-client/src/environment/PandaForestScene.tsx` and `packages/game-client/src/runtime/GameLoopController.tsx`
- [X] T060 [P] Write regression unit and lifecycle tests for left-click `selectstart`/`dragstart`/`contextmenu` prevention, unlocked LMB/RMB drag camera orbit, Pointer Lock exit recovery (`isCursorRevealed` not stuck), `Alt` auto-repeat resilience, and modal close cursor recovery in `packages/game-core/__tests__/desktopInputAndCollision.test.ts` and `packages/game-client/__tests__/runtimeLifecycle.test.ts`
- [X] T061 Run full verification pipeline (`pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`) and update E2E assertions in `apps/web/e2e/playable-zoo-world.spec.ts`

---

## Phase 10: Experiential Control & Camera Feel Polish

**Purpose**: Eliminate browser Pointer Lock cursor trapping on single left-clicks (which caused `<canvas>` to intercept pointer events over HUD buttons in Chrome), align initial avatar spawn facing with the forward camera trail (`North`, `-Z`), add `Q`/`R` keyboard camera orbit, enable direct 3D mesh clicks on interactive props, and refine HUD/joystick layout ergonomics.

- [X] T062 [P] [US1] Remove automatic `requestPointerLock()` on single canvas `mousedown` in `domInputBindings` (using non-trapping LMB/RMB drag orbit + `KeyQ`/`KeyR` keyboard camera orbit so `<canvas>` never hijacks pointer events from HUD buttons in Chrome) in `packages/game-core/src/input/domInputBindings.ts` and `packages/game-core/src/input/inputController.ts`
- [X] T063 [P] [US1] Align initial avatar visual orientation with forward trail direction and add direct 3D prop click interaction (`onClick` / pointer cursor feedback when in range) in `packages/game-client/src/environment/InteractiveProps.tsx` and `packages/game-client/src/runtime/ZooGameCanvas.tsx`
- [X] T064 [P] [US2] Enable both mouse and touch pointer dragging on `virtual-joystick-pad` and center desktop control hints in `GameHudOverlay` so bottom HUD bars never overlap in `packages/ui/src/TouchControlsOverlay.tsx` and `packages/ui/src/GameHudOverlay.tsx`
- [X] T065 [P] Include `packages/game-client/src` in `apps/web/tailwind.config.ts` content globs and add `cursor-grab active:cursor-grabbing` to `ZooGameCanvas` container in `apps/web/tailwind.config.ts` and `packages/game-client/src/runtime/ZooGameCanvas.tsx`
- [X] T066 Verify live Chrome Playwright E2E test suite (`pnpm --filter @online-zoo/web test:e2e`) alongside `pnpm test`, `pnpm typecheck`, `pnpm lint`, and `pnpm build`
