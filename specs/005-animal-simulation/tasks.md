---

description: "Task list for Feature 005: Animal Simulation"
---

# Tasks: Animal Simulation

**Input**: Design documents from `/specs/005-animal-simulation/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/animal-simulation-protocol.md, quickstart.md

**Tests**: Automated Vitest unit/integration tests and Playwright multi-session E2E verification are included per Constitution Principle VII.

**Organization**: Tasks are grouped by user story (`US1`–`US5`) to enable independent implementation and verification of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`–`US5`)
- Includes exact file paths in descriptions

---

## Phase 1: Setup (Shared Types & Animal Catalog Infrastructure)

**Purpose**: Establish shared animal domain types, species catalog, habitat zone definitions, and initial named animal descriptors.

- [X] T001 [P] Create animal catalog and habitat zone descriptors (`AnimalSpeciesId` enum `'panda' | 'penguin' | 'otter'`, `HabitatId` enum `'habitat-panda-grove' | 'habitat-penguin-cove' | 'habitat-otter-stream'`, `AnimalBehaviorState` enum `'Idle' | 'Walking' | 'Eating' | 'Sleeping' | 'Playing' | 'Swimming' | 'Resting'`, `ANIMAL_SPECIES_CATALOG` with 4 educational facts per species, `ZOO_HABITAT_ZONES`, and `INITIAL_ZOO_ANIMALS`) in `packages/game-core/src/animals/animalCatalog.ts`
- [X] T002 Export animal simulation modules from `packages/game-core/src/animals/index.ts` and `packages/game-core/src/index.ts`

---

## Phase 2: Foundational (Core Animal State Machine, Store Slice & Protocol Contracts)

**Purpose**: Core simulation state machine, multiplayer protocol schemas, and store slice that block all user stories.

- [X] T003 Implement `AnimalSimulationSystem` with spatial habitat boundary clamping (`hypot(x - habitat.center[0], z - habitat.center[2]) <= habitat.radius - 0.55`), obstacle circle avoidance (`hypot(x - obs.x, z - obs.z) >= obs.radius + 0.45`), and surface constraints (land vs. water sub-zone) in `packages/game-core/src/animals/animalSimulation.ts`
- [X] T004 [P] Extend multiplayer protocol contracts (`TriggerAnimalFeedingMessage`, `AnimalFeedingEventMessage`, and `animals` / `habitatFeedings` fields on `WelcomeMessage` and `WorldSnapshotMessage`) in `packages/game-core/src/multiplayer/protocol.ts`
- [X] T005 Extend Zustand `gameStore` and `mutableRuntimeState` with `animals`, `habitatFeedings`, `inspectedAnimalId`, `isEncyclopediaOpen`, `encyclopedia`, and `discoveryToast` state & actions in `packages/game-core/src/state/gameStore.ts`

**Checkpoint**: Foundation ready — User Stories 1–5 can now be implemented and verified.

---

## Phase 3: User Story 1 - Natural & Species-Specific Animal Behavior in Habitats (Priority: P1) 🎯 MVP

**Goal**: Animals (Panda, Penguin, Otter) autonomously transition between species-appropriate behavior states (`Idle`, `Walking`, `Eating`, `Sleeping`, `Playing`, `Swimming`, `Resting`), exhibit Penguin group movement, stay strictly within habitat boundaries and outside obstacles, and animate smoothly in the 3D scene.

**Independent Test**: Step `AnimalSimulationSystem` across 120 simulated seconds and render `ZooAnimalsLayer` to verify that Pandas perform `Walking`, `Eating` bamboo, `Resting`/sitting, `Sleeping`, and `Playing`/rolling (never `Swimming`), Penguins perform `Walking`, coordinated `group-waddle` following `penguin-piko`, `Swimming`, `Playing`/sliding, and `Resting`, Otters perform `Swimming`, `Playing`, `Resting`, and land-water `Walking`, and 100% of positions remain within habitat bounds.

### Implementation for User Story 1

- [X] T006 [US1] Implement species-specific transition weights, activity variants (`bamboo-munch`, `bamboo-roll`, `sit-scratch`, `curled-nap`, `group-waddle`, `pool-swim`, `belly-slide`, `ledge-huddle`, `stream-swim`, `back-float`, `sun-bask`, `bank-scurry`), and Penguin leader-follower group movement in `packages/game-core/src/animals/animalSimulation.ts`
- [X] T007 [P] [US1] Build stylized 3D procedural animal meshes (Giant Panda, Humboldt Penguin, River Otter), habitat visual enclosures (Bamboo Grove Sanctuary, Glacier Cove Pool, River Stone Stream), floating behavior badges, and 60 FPS procedural animations in `packages/game-client/src/entities/ZooAnimalsLayer.tsx`
- [X] T008 [US1] Mount `ZooAnimalsLayer` inside `packages/game-client/src/environment/PandaForestScene.tsx` and step local animal interpolation/simulation in `packages/game-client/src/runtime/GameLoopController.tsx`

**Checkpoint**: User Story 1 is functional and independently testable.

---

## Phase 4: User Story 2 - Multiplayer-Consistent Animal Observation (Priority: P1)

**Goal**: Visitors in the same zoo instance observe consistent high-level animal behavior states, positions, and feeding activities, with clean resynchronization after network interruptions.

**Independent Test**: Connect two `MultiplayerClient` sessions to the same `ZooInstanceAuthority`, step server ticks, and verify both clients converge on identical `behaviorState`, `activityVariant`, and synchronized positions for all 7 animals, including after a simulated disconnect/reconnect.

### Implementation for User Story 2

- [X] T009 [US2] Integrate authoritative `AnimalSimulationSystem` stepping into `ZooInstanceAuthority.stepServerTick` and include `animals` and `habitatFeedings` in `welcome` and `world_snapshot` broadcasts in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` and `apps/web/server.mjs`
- [X] T010 [US2] Handle incoming `animals`, `habitatFeedings`, and `animal_feeding_event` payloads in `MultiplayerClient` and reconcile local `gameStore` / `mutableRuntimeState` animal transforms upon snapshot and reconnection in `packages/game-core/src/multiplayer/multiplayerClient.ts`

**Checkpoint**: User Stories 1 and 2 work together with authoritative multiplayer consistency.

---

## Phase 5: User Story 3 - Animal Information Inspection (Priority: P2)

**Goal**: Players can approach an animal (or click/tap an animal or habitat observation station) to open a readable Animal Information Panel on desktop and mobile showing common name, scientific name, habitat, diet, live behavior state, and facts without controlling the animal.

**Independent Test**: Approach or select a Panda, Penguin, and Otter on desktop (`1280x720`) and mobile (`390x844`) viewports and verify that `animal-info-panel` opens with species common name, habitat, diet, live behavior badge, and 4 facts with zero text clipping or horizontal overflow.

### Implementation for User Story 3

- [X] T011 [P] [US3] Add interactive habitat observation & feeding stations for Panda, Penguin, and Otter habitats to `PANDA_FOREST_INTERACTIVE_OBJECTS` in `packages/game-core/src/world/pandaForestLayout.ts`
- [X] T012 [US3] Implement responsive `AnimalInfoPanel` and HUD live habitat animal status strip (`data-testid="animal-info-panel"`, `data-testid="animal-status-strip"`) in `packages/ui/src/AnimalSimulationOverlay.tsx` and mount in `packages/ui/src/GameHudOverlay.tsx`

**Checkpoint**: Visitors can inspect any animal on desktop or mobile while animals continue autonomous behavior.

---

## Phase 6: User Story 4 - Animal Discovery & Encyclopedia Collection (Priority: P2)

**Goal**: Players naturally discover animal species when approaching within `8.0m` or inspecting an animal, recording discoveries persistently in `localStorage` (`online-zoo:animal-encyclopedia:v1`) and viewing Discovered vs. Undiscovered species in the Animal Encyclopedia modal.

**Independent Test**: Start with an empty encyclopedia (`0/3`), approach or inspect Panda, Penguin, and Otter, verify discovery toast notifications and `3/3` unlocked species in `animal-encyclopedia-modal`, reload the page, and confirm all discoveries persist.

### Implementation for User Story 4

- [X] T013 [P] [US4] Implement `loadPlayerEncyclopedia`, `savePlayerEncyclopedia`, `recordSpeciesDiscovery`, `recordSpeciesFeeding`, and `evaluateProximityAnimalDiscovery` (`<= 8.0m` discovery radius) in `packages/game-core/src/animals/encyclopediaPersistence.ts`
- [X] T014 [US4] Evaluate proximity animal discovery on each frame in `packages/game-client/src/runtime/GameLoopController.tsx` and render the `AnimalEncyclopediaModal` (`data-testid="animal-encyclopedia-modal"`) and `AnimalDiscoveryToast` (`data-testid="animal-discovery-toast"`) in `packages/ui/src/AnimalSimulationOverlay.tsx`

**Checkpoint**: Natural animal discovery and persistent Animal Encyclopedia collection are complete.

---

## Phase 7: User Story 5 - Interactive & Scheduled Animal Feeding Sessions (Priority: P3)

**Goal**: Players can watch or trigger species-appropriate feeding sessions (`12,000 ms` active duration, `30,000 ms` total cooldown, plus periodic scheduled feedings) where animals in the habitat gather at the feeding station and enter the `Eating` state across all connected visitors.

**Independent Test**: Trigger feeding for a habitat via `sendTriggerAnimalFeeding` or the UI `animal-trigger-feeding-button`, verify all animals in that habitat transition to `Eating` for all connected sessions, and verify repeat triggers during the active/cooldown window are rejected with `already_active` or `on_cooldown`.

### Implementation for User Story 5

- [X] T015 [US5] Implement `triggerHabitatFeeding` (`12,000 ms` active window, `30,000 ms` cooldown window, scheduled periodic feeding every `90,000 ms`) in `packages/game-core/src/animals/animalSimulation.ts` and server-side validation/broadcast in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` and `apps/web/server.mjs`
- [X] T016 [US5] Add `sendTriggerAnimalFeeding(habitatId)` to `packages/game-core/src/multiplayer/multiplayerClient.ts`, wire feeding controls & cooldown badges into `packages/ui/src/AnimalSimulationOverlay.tsx`, and render 3D food props during active feeding in `packages/game-client/src/entities/ZooAnimalsLayer.tsx`

**Checkpoint**: All 5 User Stories are implemented and integrated.

---

## Phase 8: Polish, Automated Tests & End-to-End Verification

**Purpose**: Comprehensive unit, multi-client integration, and Playwright E2E verification across desktop and mobile viewports.

- [X] T017 [P] Create comprehensive unit and multi-client integration test suite covering US1–US5 (`SC-001`–`SC-006`) in `packages/game-core/__tests__/animalSimulation.test.ts`
- [X] T018 [P] Create multi-session Playwright E2E test verifying animal behavior states, inspection panel, encyclopedia discovery persistence, feeding sessions, and multiplayer consistency in `apps/web/e2e/animal-simulation.spec.ts`
- [X] T019 Run full monorepo `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E verification to confirm zero regressions and 100% convergence

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup)**: No dependencies — starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — blocks User Stories 1–5.
- **Phase 3 (US1 - P1)** & **Phase 4 (US2 - P1)**: Depend on Phase 2.
- **Phase 5 (US3 - P2)** & **Phase 6 (US4 - P2)**: Depend on Phase 2 and integrate with US1/US2.
- **Phase 7 (US5 - P3)**: Depends on Phase 2 and US2 multiplayer transport.
- **Phase 8 (Polish & Verification)**: Depends on Phases 3–7.

### Parallel Opportunities
- `T001` (`animalCatalog.ts`) and `T004` (`protocol.ts` types) can be authored cleanly with minimal overlap.
- `T007` (`ZooAnimalsLayer.tsx`), `T011` (`pandaForestLayout.ts`), and `T013` (`encyclopediaPersistence.ts`) operate on separate packages/files.
- `T017` (`animalSimulation.test.ts`) and `T018` (`animal-simulation.spec.ts`) can be developed in parallel once implementation tasks complete.

## Implementation Strategy

### MVP First (User Stories 1 & 2)
1. Complete Phase 1 and Phase 2 (`animalCatalog.ts`, `animalSimulation.ts`, `protocol.ts`, `gameStore.ts`).
2. Complete Phase 3 (US1) and Phase 4 (US2) so all 3 species simulate and synchronize across multiplayer sessions.
3. Add Phase 5 (US3 Info Panel), Phase 6 (US4 Encyclopedia), and Phase 7 (US5 Feeding Activities).
4. Execute Phase 8 unit, integration, and Playwright E2E verification.

