# Implementation Plan: Playable Zoo World (Feature 001)

**Branch**: `001-playable-zoo-world` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-playable-zoo-world/spec.md`

## Summary

Feature 001 delivers the first playable vertical slice of **Online Zoo**: a stylized 3D **Panda Forest** environment running in desktop and mobile web browsers. Players transition from an entry/loading screen into the 3D world, control a third-person avatar (`Idle`, `Walking`, `Running`, `Jumping`) with camera-relative movement, orbit and zoom a collision-aware 360-degree third-person camera (using Genshin Impact-style free-look mouse with `Alt` cursor reveal on desktop and touch-drag on mobile), collide smoothly against solid props and a blocked pond shoreline via Rapier physics, and interact with both readable habitat info plaques and state-changing 3D world props.

The architecture uses a **pnpm + Turborepo** monorepo separating the Next.js application shell (`apps/web`), the React Three Fiber + Rapier 3D runtime (`packages/game-client`), pure framework-agnostic gameplay/camera/input/interaction logic (`packages/game-core`), GLB/glTF asset manifests and loaders (`packages/game-assets`), Tailwind CSS + React HUD/menu overlays (`packages/ui`), and shared tooling configuration (`packages/config`).

## Technical Context

**Language/Version**: TypeScript `5.x` (Node.js `>=20.11`)

**Primary Dependencies**:
- Application Shell: `next` (`15.x` / `14.x` App Router), `react` (`18.3.x`), `react-dom` (`18.3.x`)
- 3D Rendering & Physics: `three` (`0.169+`), `@react-three/fiber` (`8.x`), `@react-three/drei` (`9.x`), `@react-three/rapier` (`1.x` / `@dimforge/rapier3d-compat`)
- State Management & Styling: `zustand` (`5.x`), `tailwindcss` (`3.4.x`)
- Monorepo & Build Tooling: `pnpm` (`9.x` workspaces), `turbo` (`2.x`)

**Storage**: Client-side `localStorage` (`online-zoo:settings:v1`) for user settings (camera sensitivity, invert Y, audio mute/volume, quality tier); no server database required in Feature 001 (`FR-022`).

**Testing**: `Vitest` (unit and integration tests for movement, camera, collision bounds, input abstraction, interaction system, and repeated initialization/cleanup) + `Playwright` (browser E2E verification for desktop/mobile inputs, browser resizing, HUD/menu flows, and WebGL canvas rendering).

**Target Platform**: Evergreen desktop browsers (Chrome, Edge, Firefox, Safari) and mobile browsers (iOS Safari, Android Chrome) supporting WebGL2 and Pointer/Touch events.

**Project Type**: Browser-based 3D game web application in a Turborepo monorepo.

**Performance Goals**:
- 60 FPS target on desktop browsers (`SC-007`).
- 30–60 FPS target on capable mobile browsers (`SC-007`).
- Initial load to interactive "Enter Panda Forest" state in `< 10 seconds` (`SC-001`).
- `< 50` total draw calls in the Panda Forest scene via GPU instancing (`<Instances>`) and adaptive DPR/shadow scaling.
- Zero React component re-renders triggered by 60 Hz frame-loop movement or camera updates.

**Constraints**:
- Strictly client-side single-player runtime for Feature 001 (`FR-022`); multiplayer and authentication are out of scope.
- Landscape and decorative/interactive props only; 3D animal models and Animal AI are deferred (`FR-001`).
- Pond shoreline is a solid collision boundary (`FR-002`).

**Scale/Scope**: 1 bounded playable zone (`Panda Forest`, ~80m × 80m enclosure), 1 playable third-person avatar with 4 locomotion states, 4+ interactive objects across 2 archetypes (`info_plaque` and `world_prop`), and 4 UI overlay views (Entry/Loading screen, Minimal Gameplay HUD + Touch Controls, Info Plaque Modal, ESC Settings Menu).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Phase 0 Status | Post-Phase 1 Design Verification |
|-----------|--------------------|----------------------------------|
| **I. Gameplay-First Development** | **PASS** | Prioritizes responsive 3D avatar locomotion, camera orbit, physical collision, and world prop interaction over static decorative pages. |
| **II. Modular Architecture** | **PASS** | Enforces strict package boundaries (`apps/web`, `packages/game-client`, `packages/game-core`, `packages/game-assets`, `packages/ui`, `packages/config`). Shared types live in `packages/game-core`. |
| **III. Multiplayer Correctness** | **PASS (N/A Scope + Ready)** | Multiplayer is explicitly out of scope for Feature 001 (`FR-022`), but separating pure deterministic simulation (`packages/game-core`) from rendering (`packages/game-client`) prepares the codebase for future server-authoritative validation. |
| **IV. Responsive by Design** | **PASS** | Desktop (`WASD` + free-look mouse + `Alt` cursor reveal) and mobile (Virtual Joystick + dedicated `Run` button + touch-drag camera + action buttons) share `InputController` in `packages/game-core`. |
| **V. Performance and Asset Quality** | **PASS** | Uses GPU instancing (`<Instances>`) for bamboo/trees/rocks, GLB/glTF asset preloading/lazy boundaries, `<PerformanceMonitor>` adaptive DPR, and mutable frame refs to eliminate 60 Hz React re-renders. |
| **VI. Security and Player Safety** | **PASS** | No secrets, credentials, or external network endpoints are exposed; `localStorage` settings parser validates and clamps numeric bounds. |
| **VII. Testing and Verification** | **PASS** | Includes unit/integration tests (`Vitest`) and browser tests (`Playwright`) covering all 8 movement directions, camera orbit/zoom/obstacle pull-in, collision boundaries, jump/run states, keyboard/touch input, resize, and repeated init/cleanup. |
| **VIII. Specification-Driven Development** | **PASS** | Follows `Constitution → Specify → Clarify → Plan` with all 5 user clarifications encoded in [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), and `contracts/`. |
| **IX. Incremental Delivery** | **PASS** | Delivers the smallest complete playable experience (Panda Forest exploration + basic object interaction) in self-contained vertical milestones. |

## Project Structure

### Documentation (this feature)

```text
specs/001-playable-zoo-world/
├── plan.md                                  # This file (/speckit-plan output)
├── research.md                              # Phase 0 technical research & decisions
├── data-model.md                            # Phase 1 entity & state model
├── quickstart.md                            # Phase 1 build, run, and verification guide
├── checklists/
│   └── requirements.md                      # Spec quality validation checklist
└── contracts/
    ├── game-core-contracts.md               # Input, Locomotion, Camera & Interaction contracts
    └── runtime-and-assets-contracts.md      # Runtime lifecycle, GLB manifest & UI store contracts
```

### Source Code (repository root)

Reconciled with the existing greenfield repository (`.agents/`, `.specify/`, `specs/`):

```text
online-zoo/
├── package.json                             # Root workspace scripts (dev, build, test, lint, typecheck)
├── pnpm-workspace.yaml                      # Workspace package globs (apps/*, packages/*)
├── turbo.json                               # Turborepo pipeline configuration
├── apps/
│   └── web/                                 # Next.js application shell
│       ├── package.json
│       ├── next.config.mjs
│       ├── public/
│       │   └── assets/
│       │       └── models/                  # Bundled GLB assets (avatar, bamboo, lantern, plaque, chime, bench)
│       ├── src/
│       │   └── app/
│       │       ├── layout.tsx
│       │       ├── page.tsx                 # Dynamic client boundary mounting ZooGameClient + UI overlays
│       │       └── globals.css
│       └── e2e/                             # Playwright browser & viewport tests
├── packages/
│   ├── config/                              # Shared TypeScript, ESLint, Tailwind & Vitest presets
│   │   ├── package.json
│   │   ├── tsconfig.base.json
│   │   └── tailwind.preset.ts
│   ├── game-core/                           # Pure TypeScript gameplay logic & contracts (zero React/Three DOM coupling)
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── input/                       # InputController (Desktop WASD/Mouse/Alt + Mobile Joystick/Run/Touch)
│   │   │   ├── character/                   # CharacterControllerCore (8-dir movement, Walk/Run/Jump state machine)
│   │   │   ├── camera/                      # CameraControllerCore (360 orbit, zoom, obstacle pull-in math)
│   │   │   ├── interaction/                 # InteractionSystem (spatial proximity, facing priority, archetype dispatch)
│   │   │   ├── world/                       # PandaForestZoneLayout, collision bounds & interactive object descriptors
│   │   │   └── state/                       # MutableRuntimeState (60Hz) + Zustand useGameStore (discrete UI/settings)
│   │   └── __tests__/                       # Vitest unit & integration suites for all core systems
│   ├── game-assets/                         # Asset manifests, GLB/glTF loaders & deterministic GLB generator
│   │   ├── package.json
│   │   ├── scripts/
│   │   │   └── generate-glb-assets.mjs      # Generates/validates binary .glb assets for avatar & Panda Forest props
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── manifest.ts                  # Typed AssetManifest & preload URL registry
│   │   │   └── loaders.ts                   # GLTF loader/cache/dispose helpers
│   │   └── __tests__/
│   ├── game-client/                         # React Three Fiber + Drei + Rapier 3D game runtime
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── runtime/
│   │   │   │   ├── ZooGameCanvas.tsx        # R3F <Canvas>, <PerformanceMonitor>, <Physics>, resize & cleanup lifecycle
│   │   │   │   └── GameLoopController.tsx   # Single coordinated useFrame orchestrating input -> character -> camera -> interaction
│   │   │   ├── entities/
│   │   │   │   ├── PlayerAvatarEntity.tsx   # Rapier KinematicCharacterController + animated GLB/stylized avatar mesh
│   │   │   │   └── FollowCameraRig.tsx      # Rapier obstacle raycast + camera transform application
│   │   │   └── environment/
│   │   │       ├── PandaForestScene.tsx     # Modular environment composition
│   │   │       ├── TerrainAndPaths.tsx      # Ground & stone/boardwalk walking paths with fixed colliders
│   │   │       ├── PondShoreline.tsx        # Stylized pond + solid shoreline barrier collider (FR-002)
│   │   │       ├── InstancedFoliage.tsx     # GPU-instanced bamboo clusters, trees & rocks with colliders
│   │   │       ├── PerimeterEnclosure.tsx   # Outer boundary fence + fixed perimeter colliders
│   │   │       └── InteractiveProps.tsx     # Habitat Info Plaques, Stone Lantern, Bamboo Wind Chime & Scenic Bench
│   │   └── __tests__/                       # Runtime lifecycle mount/unmount & cleanup tests
│   └── ui/                                  # Shared React + Tailwind CSS HUD, Touch Controls & Menus
│       ├── package.json
│       ├── src/
│       │   ├── index.ts
│       │   ├── EntryLoadingScreen.tsx       # Asset progress bar & "Enter Panda Forest" trigger
│       │   ├── GameHudOverlay.tsx           # Minimal HUD, locomotion badge, Alt cursor hint & Menu button
│       │   ├── TouchControlsOverlay.tsx     # Virtual Joystick (walk) + dedicated Run, Jump, Interact & Menu touch buttons
│       │   ├── InteractionPromptBanner.tsx  # Contextual prompt for targeted InteractiveObject
│       │   ├── InfoPlaqueModal.tsx          # Habitat info card overlay for 'info_plaque' archetype
│       │   └── SettingsMenuModal.tsx        # ESC menu (camera sensitivity, invert Y, audio mute/volume, quality tier)
│       └── __tests__/
```

**Structure Decision**: Adopted the 6-package Turborepo workspace layout (`apps/web`, `packages/game-client`, `packages/game-core`, `packages/game-assets`, `packages/ui`, `packages/config`) reconciled against the empty repository root. This enforces strict compile-time module boundaries between Next.js routing, R3F 3D rendering, pure TypeScript gameplay logic, asset loading, and 2D React UI overlays.

## Architectural Decisions

1. **Separation of 3D Runtime from Next.js Shell (`Architecture Requirement 1`)**:
   - `apps/web` loads `@online-zoo/game-client` via `next/dynamic(..., { ssr: false })` inside a full-viewport client container. Next.js handles only routing, document metadata, and static asset serving.
2. **Reusable Third-Person Character Controller & Separated Movement Logic (`Architecture Requirements 2 & 5`)**:
   - `CharacterControllerCore` in `@online-zoo/game-core` computes camera-relative movement vectors, walk (`4.0 m/s`) vs. run (`7.5 m/s`) speeds, shortest-arc yaw rotation (`14 rad/s`), jump velocity (`6.5 m/s`), gravity (`-18 m/s²`), and locomotion state (`Idle | Walking | Running | Jumping`).
   - `PlayerAvatarEntity` in `@online-zoo/game-client` feeds `desiredTranslation` into a Rapier `KinematicCharacterController` (`capsule` collider) which resolves slide collisions against solid environment colliders and returns grounded status.
3. **UI-Independent Camera Controller with Obstacle Avoidance (`Architecture Requirement 3`)**:
   - `CameraControllerCore` in `@online-zoo/game-core` manages 360-degree horizontal yaw, clamped vertical pitch (`[0.15, 1.35]` rad), and zoom (`[2.5m, 10m]`).
   - `FollowCameraRig` casts a Rapier ray from the avatar pivot toward the target camera position each frame and clamps `effectiveDistance` in front of any hit obstacle (`FR-011`).
4. **Unified Desktop & Mobile Input Abstraction (`Architecture Requirement 4`)**:
   - `InputController` in `@online-zoo/game-core` normalizes desktop inputs (`WASD`/Arrow keys, `Shift` run, `Space` jump, `E`/`F` or 3D prop click interact, `ESC` menu, non-trapping LMB/RMB mouse-drag camera orbit + `Q`/`R` keyboard camera orbit with `clientX`/`clientY` delta fallback and `[-80, 80]` px spike clamping, `Alt` held to pause camera look ignoring key auto-repeat) and mobile touch inputs (Virtual Joystick at walking speed supporting both touch and pointer drag, dedicated `Run` button, non-blocking touch-drag camera look, pinch zoom, `Jump`/`Interact`/`Menu` buttons) into a single `NormalizedInputSnapshot`.
   - Global DOM selection/drag guards (`user-select: none`, `selectstart`, `dragstart`, `contextmenu`) prevent accidental text selection on left-click, single left-clicks never trap the cursor in browser Pointer Lock so HUD buttons remain clickable at all times, and HUD buttons blur focus on click so pressing `Space` to jump never triggers focused UI buttons.
5. **Reusable Interaction Detection & Mixed-Archetype Dispatch (`Architecture Requirement 6`)**:
   - `InteractionSystem` in `@online-zoo/game-core` evaluates registered objects by distance and avatar facing direction, selecting at most one primary target (`FR-016`) and dispatching either `info_plaque` (opens `InfoPlaqueModal`) or `world_prop` (toggles lantern light, rings bamboo wind chime, or triggers bench rest feedback) (`FR-015`, `FR-018`).
6. **Modular Environment, GLB/glTF Pipeline & Adaptive Performance (`Architecture Requirements 7, 8 & Performance`)**:
   - `packages/game-assets` includes a build/startup GLB generator and manifest loader so real `.glb` assets are served and loaded via `GLTFLoader` / `useGLTF` with Suspense lazy loading.
   - Repeated foliage and rocks use GPU instancing (`<Instances>`) and `@react-three/drei`'s `<PerformanceMonitor>` scales DPR and shadow fidelity according to device performance (`qualityTier`).
7. **Deterministic Lifecycle & Zero-Re-Render Loop (`Architecture Requirements 9 & 10`)**:
   - `GameLoopController` mounts before `PlayerAvatarEntity` and `FollowCameraRig` (running first at 60 Hz via `useFrame`) to update transient refs with zero frame lag and zero per-frame React re-renders; Zustand updates only when discrete UI state changes (`focusedObjectId`, `locomotionState`, `phase`, `isCursorRevealed`).
   - Unmounting `ZooGameCanvas` disposes all DOM listeners, Pointer Lock state, Three.js geometries/materials, and Rapier physics resources.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None (All 9 Constitution Principles Pass) | The 6-package Turborepo structure directly implements Principle II (Modular Architecture) and the user's explicit package boundaries. | A single monolithic Next.js package would violate Architecture Requirement 1 and allow coupling between rendering, gameplay logic, and UI. |
