# Implementation Plan: Animal Simulation (Feature 005)

**Branch**: `005-animal-simulation` | **Date**: 2026-11-05 | **Spec**: [spec.md](file:///y:/Repos/online-zoo/specs/005-animal-simulation/spec.md)
**Input**: Feature specification from `/specs/005-animal-simulation/spec.md`

## Summary

Introduce believable, lightweight, server-authoritative animal simulation and interactive animal discovery for Online Zoo's three initial species (**Giant Panda**, **Humboldt Penguin**, and **Asian Small-Clawed Otter**). Animals live in three distinct habitat zones within the zoo world, autonomously transition through species-appropriate behavior states (`Idle`, `Walking`, `Eating`, `Sleeping`, `Playing`, `Swimming`, `Resting`, plus coordinated Penguin group movement), stay strictly within habitat and surface boundaries, and synchronize across multiplayer sessions via `ZooInstanceAuthority`. Visitors can approach or click animals to open a responsive **Animal Information Panel**, discover species into a persistent **Animal Encyclopedia**, and participate in cooldown-governed **Habitat Feeding Sessions** visible to all visitors in the instance.

## Technical Context

**Language/Version**: TypeScript 5.x (Strict mode + `noUncheckedIndexedAccess: true`, ES2022 target)  
**Primary Dependencies**: React 18, Next.js 14 (App Router), Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier`, Zustand  
**Storage**: Browser `localStorage` (`online-zoo:animal-encyclopedia:v1`) for persistent player encyclopedia discoveries; in-memory authoritative instance state in `ZooInstanceAuthority` for real-time animal transforms, behavior states, and feeding session cooldowns  
**Testing**: Vitest (unit & multi-client integration tests in `packages/game-core/__tests__/animalSimulation.test.ts`) + Playwright (multi-context browser E2E test in `apps/web/e2e/animal-simulation.spec.ts`)  
**Target Platform**: Modern desktop (`>= 1024px`) and mobile (`<= 768px`) web browsers with WebGL2  
**Project Type**: Turborepo multiplayer 3D web game monorepo (`apps/web`, `packages/game-core`, `packages/game-client`, `packages/game-assets`, `packages/ui`)  
**Performance Goals**: 60 FPS client rendering and animation interpolation; 20 Hz server-authoritative animal simulation tick; `< 200ms` state convergence across visitors  
**Constraints**: Animals must never leave habitat bounds or clip through obstacles; players must not directly puppet animals; feeding sessions must enforce server-side cooldowns  
**Scale/Scope**: 3 initial species (`panda`, `penguin`, `otter`), 3 habitat zones, 7 individual named animals (`Bao`, `Mei`, `Piko`, `Skipper`, `Waddles`, `Lumi`, `Pip`), 7 behavior states, Animal Information Panel, Animal Encyclopedia, and synchronized Habitat Feeding Activities

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Gameplay-First Development**: **PASS** — Autonomous, varied animal behaviors, feeding sessions, and natural proximity discovery make exploring the zoo intrinsically rewarding without turning it into a chore-based management sim.
- **II. Modular Architecture**: **PASS** — Animal catalog, behavior state machine, habitat spatial boundary clamping, and encyclopedia persistence live in `packages/game-core/src/animals`; 3D procedural/animated meshes live in `packages/game-client/src/entities/ZooAnimalsLayer.tsx`; HUD & modals live in `packages/ui/src/AnimalSimulationOverlay.tsx`.
- **III. Multiplayer Correctness**: **PASS** — `ZooInstanceAuthority` owns the authoritative `AnimalSimulationSystem`, stepping animal behaviors and validating `trigger_animal_feeding` requests with server-enforced active/cooldown timers before broadcasting to connected clients.
- **IV. Responsive by Design**: **PASS** — Both the Animal Information Panel and Animal Encyclopedia are designed for desktop (`>= 1024px`) and mobile (`<= 768px`) viewports without text overflow, and animals can be inspected via proximity prompt (`E` / mobile **Interact**) or direct tap/click.
- **V. Performance and Asset Quality**: **PASS** — Lightweight procedural/hierarchical 3D animal rigs with 60 FPS procedural animation (waddling, rolling, belly-sliding, swimming, eating bamboo/fish/clams) require zero extra network downloads while maintaining stylized visual cohesion.
- **VI. Security and Player Safety**: **PASS** — Feeding triggers are validated server-side for habitat existence and cooldown expiration; players cannot send arbitrary animal transforms or force animals out of bounds.
- **VII. Testing and Verification**: **PASS** — Covered by deterministic unit tests for species behavior rules, boundary/obstacle clamping, encyclopedia persistence, feeding cooldowns, and multi-session Playwright E2E verification.
- **VIII. Specification-Driven Development**: **PASS** — Follows `Specify → Clarify → Plan → Tasks → Analyze → Implement → Converge`.
- **IX. Incremental Delivery**: **PASS** — Delivered as complete vertical slices across core simulation, multiplayer sync, 3D rendering, and UI overlays.

## Project Structure

### Documentation (this feature)

```text
specs/005-animal-simulation/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── animal-simulation-protocol.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/game-core/
├── src/
│   ├── animals/
│   │   ├── index.ts
│   │   ├── animalCatalog.ts          # 3 species, 3 habitat zones, 7 initial animals, educational facts
│   │   ├── animalSimulation.ts       # Authoritative state machine, species behaviors, habitat clamping, feeding
│   │   └── encyclopediaPersistence.ts # LocalStorage persistence & proximity discovery evaluation
│   ├── multiplayer/
│   │   ├── protocol.ts               # Extended with trigger_animal_feeding, animal_feeding_event, animal snapshots
│   │   ├── zooInstanceAuthority.ts   # Runs authoritative AnimalSimulationSystem & feeding validation
│   │   └── multiplayerClient.ts      # Synchronizes animals & habitatFeedings into gameStore
│   ├── state/
│   │   └── gameStore.ts              # Extended with animalsslice (animals, habitatFeedings, encyclopedia, active modals)
│   └── world/
│       └── pandaForestLayout.ts      # Extended with habitat observation/feeding interactive objects
└── __tests__/
    └── animalSimulation.test.ts      # Unit & multi-client integration tests for US1-US5

packages/game-client/
└── src/
    ├── entities/
    │   └── ZooAnimalsLayer.tsx       # 3D stylized Panda, Penguin, Otter meshes, habitat pools/feeders, 60Hz animations
    ├── environment/
    │   └── PandaForestScene.tsx      # Mounts ZooAnimalsLayer in the 3D scene
    └── runtime/
        └── GameLoopController.tsx    # Steps local fallback/interpolated animal simulation & proximity discovery

packages/ui/
└── src/
    ├── AnimalSimulationOverlay.tsx   # Animal Info Panel, Animal Encyclopedia Modal, Feeding controls & Discovery Toast
    └── GameHud.tsx                   # Mounts AnimalSimulationOverlay & exposes Encyclopedia HUD button

apps/web/
└── e2e/
    └── animal-simulation.spec.ts     # Playwright E2E test verifying behaviors, inspection, encyclopedia, feeding & multiplayer sync
```

**Structure Decision**: Extends the existing monorepo package boundaries (`@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/ui`, `@online-zoo/web`) without introducing new packages or external runtime dependencies.

## Complexity Tracking

No constitution violations or exceptions required.
