# Technical Research & Decisions: Playable Zoo World (Feature 001)

**Feature**: `001-playable-zoo-world`
**Date**: 2026-11-04
**Status**: Complete

## 1. Repository & Monorepo Package Boundaries

- **Decision**: Initialize a `pnpm` workspaces + `Turborepo` monorepo with six strictly bounded packages:
  - `apps/web`: Next.js App Router shell (entry route, dynamic client-only game loader, SEO/metadata).
  - `packages/game-client`: React Three Fiber (`@react-three/fiber`), `@react-three/drei`, and `@react-three/rapier` 3D runtime, scene graph, and frame-loop bridges.
  - `packages/game-core`: Framework-agnostic TypeScript gameplay domain logic (input abstraction, character locomotion math & state machine, orbital camera math & collision clamp, interaction detection registry, Zustand state slices).
  - `packages/game-assets`: Typed asset manifests, GLB/glTF loader utilities, asset preloading/disposal management, and bundled `.glb` models for the avatar and Panda Forest props.
  - `packages/ui`: Tailwind CSS + React overlay components (Entry/Loading screen, minimal HUD, Genshin-style `Alt` cursor hint, Virtual Joystick, Touch Action Buttons, Contextual Interaction Prompt, Info Plaque Modal, ESC Settings Menu).
  - `packages/config`: Shared TypeScript (`tsconfig`), ESLint, Tailwind CSS, and Vitest configurations.
- **Rationale**: Reconciling the proposed package boundaries against the greenfield repository establishes Principle II (Modular Architecture) from Day 1. Placing all movement, camera, input, and interaction rules in `packages/game-core` (zero React or Next.js runtime coupling) satisfies Architecture Requirements 1, 2, 3, 4, 5, and 6, and makes core gameplay 100% unit-testable in Node/Vitest without requiring a full browser GPU context for every test.
- **Alternatives Considered**:
  - *Single Next.js app with folders (`src/core`, `src/client`)*: Rejected because folder-only boundaries allow accidental imports between Next.js server components, React UI state, and the 3D frame loop.

## 2. Avoiding Unnecessary React Re-Renders During the 60 Hz Game Loop

- **Decision**: Partition client state into two strict tiers:
  1. **Transient Frame State (`MutableGameRuntimeState` in `packages/game-core`)**: High-frequency values mutated every frame (60–120 Hz)—avatar 3D position, linear velocity, facing yaw, grounded flag, airborne timer, camera yaw/pitch/zoom/effectiveDistance, and live input vectors—are stored in a plain mutable object reference read and written directly inside R3F's `useFrame` hook and `game-core` tick functions. Zero React `useState` or reactive store selectors subscribe to per-frame coordinates.
  2. **Discrete UI Store (`useGameStore` via `Zustand` in `packages/game-core`)**: Low-frequency event-driven state—session status (`loading | ready | playing | paused`), active locomotion state badge (`Idle | Walking | Running | Jumping`), `isCursorRevealed` (`Alt` held), `focusedInteraction` (only updated when the targeted object ID changes), `activePlaqueModal`, and persisted `userSettings` (camera sensitivity, invert Y, audio mute/volume, quality tier)—is managed in a Zustand store with shallow/atomic selectors in `packages/ui`.
- **Rationale**: Directly fulfills Architecture Requirement 10 ("Avoid unnecessary React re-renders during the game loop") and Principle V. React components in `packages/ui` and `packages/game-client` only re-render on discrete state transitions (e.g., entering an interaction radius or pressing `ESC`), never on per-frame movement or camera rotation.
- **Alternatives Considered**:
  - *Storing position/camera angles in React state or reactive Zustand slices subscribed by UI*: Rejected because 60 Hz React reconciliation causes frame drops and GC pauses, especially on mobile browsers.

## 3. Physics, Collision & Separated Character Locomotion Logic

- **Decision**: Separate character movement math from physics/rendering execution:
  - `packages/game-core` implements `CharacterControllerCore`: a pure, deterministic state machine and kinematics calculator that takes `(InputSnapshot, CameraYaw, GroundedState, DeltaTime)` and computes desired horizontal displacement, jump impulse velocity, target facing angle (shortest-arc angular interpolation), and locomotion state (`Idle | Walking | Running | Jumping`).
  - `packages/game-client` bridges `CharacterControllerCore` to `@react-three/rapier` using a Rapier `KinematicCharacterController` (`world.createCharacterController(offset)`) with a capsule collider. Rapier resolves slide collisions against fixed world colliders (rocks, trees, bamboo clusters, pond shoreline barrier, and perimeter fence) and reports `computedGrounded()` back to `CharacterControllerCore`.
- **Rationale**: Satisfies Architecture Requirements 2 and 5 ("Implement a reusable third-person character controller" and "Separate movement logic from rendering logic"). Using Rapier's kinematic character controller prevents穿透 (tunneling) through solid props, smoothly slides along angled rocks and pond shorelines (`FR-002`, `FR-003`), and avoids the "bouncy/slippery" feel of raw dynamic rigid-body forces while keeping the movement rules pure and testable in `packages/game-core`.
- **Alternatives Considered**:
  - *Dynamic RigidBody with `applyImpulse`*: Rejected because dynamic rigid bodies often snag on mesh seams, bounce unpredictably on slopes, and tightly couple gameplay feel to physics engine solver iterations.
  - *Custom AABB-only collision without Rapier*: Rejected because user requirements explicitly specify Rapier for physics and collision where appropriate, and Rapier provides fast WASM raycasting for camera obstacle avoidance (`FR-011`).

## 4. Independent Third-Person Camera Controller & Genshin-Style Desktop Cursor Control

- **Decision**:
  - Implement `CameraControllerCore` in `packages/game-core` completely independent of React/UI components (Architecture Requirement 3). It maintains `yaw` (`0` to `2π`), clamped `pitch` (`[0.15 rad, 1.35 rad]`), `targetDistance` (`[2.5m, 10m]`), and `currentDistance`.
  - Each frame, `packages/game-client` performs a Rapier raycast/spherecast from the avatar's head/shoulder pivot toward the desired camera world position against environment colliders. If an obstacle (tree, rock, perimeter wall) is hit at distance $d_{hit}$, `CameraControllerCore` clamps `effectiveDistance = max(minDistance, d_{hit} - safetyMargin)` immediately on pull-in and smoothly lerps back to `targetDistance` when clear (`FR-011`).
  - On desktop (`FR-012`), active gameplay requests browser Pointer Lock on the game canvas for smooth 360-degree free-look mouse rotation. Holding `Alt` temporarily calls `document.exitPointerLock()` and sets `isCursorRevealed = true` so the player can click HUD elements (Genshin Impact style); releasing `Alt` (or clicking the canvas) re-engages free-look. Pressing `ESC` releases Pointer Lock and opens the in-game settings menu (`FR-021`).
- **Rationale**: Fulfils the clarified desktop camera behavior (`Session 2026-11-04`), prevents camera clipping (`SC-004`), and keeps camera math isolated from UI rendering.
- **Alternatives Considered**:
  - *Three.js `OrbitControls` from `@react-three/drei`*: Rejected because `OrbitControls` does not natively support third-person moving avatar tracking with Rapier obstacle pull-in, Genshin-style `Alt` pointer-lock toggling, or unified mobile touch-drag integration.

## 5. Unified Input Abstraction (Desktop Keyboard/Mouse + Mobile Touch)

- **Decision**: Define an `InputManager` in `packages/game-core` producing a normalized `InputState` snapshot every frame:
  - `moveX` (`-1` to `1`), `moveZ` (`-1` to `1`): Normalized movement vector (`length <= 1`).
  - `runHeld` (`boolean`): `Shift` key on desktop, or dedicated on-screen `Run` touch button (hold/toggle) on mobile (`FR-012`, `FR-013`). Note: Virtual joystick deflection controls movement direction at walking speed; running on mobile is triggered exclusively by the dedicated `Run` button per user clarification.
  - `jumpPressed` (`boolean`), `interactPressed` (`boolean`), `menuPressed` (`boolean`), `cursorRevealHeld` (`boolean` for `Alt`).
  - `lookDeltaX` (`number`), `lookDeltaY` (`number`), `zoomDelta` (`number`).
  - Automatic reset of all active inputs on `window.blur`, `visibilitychange`, or menu open so the avatar never gets stuck running when the browser loses focus.
- **Rationale**: Directly satisfies Principle IV (Responsive by Design) and Architecture Requirement 4 ("Implement an input abstraction supporting keyboard/mouse and touchscreen").
- **Alternatives Considered**:
  - *Separate movement handlers for keyboard and touch*: Rejected by Constitution Principle IV and `FR-014`.

## 6. Reusable Interaction Detection & Archetype System

- **Decision**: Implement `InteractionSystem` in `packages/game-core` (Architecture Requirement 6):
  - Interactive objects register a descriptor (`id`, `title`, `promptText`, `archetype: 'info_plaque' | 'world_prop'`, `position`, `radius`, `payload`).
  - On each tick, `InteractionSystem.evaluate(avatarPosition, avatarForward)` filters objects within `radius`, scores candidates by distance and facing angle alignment, and returns the single best target (`FR-016`).
  - Triggering interaction dispatches through a typed handler:
    - `info_plaque`: Opens a structured habitat info overlay card in `packages/ui` (e.g., *Giant Panda Habitat Guide*, *Bamboo Grove Ecology Plaque*).
    - `world_prop`: Toggles or triggers an in-world 3D prop state (e.g., lighting a *Stone Garden Lantern*, ringing a *Bamboo Wind Chime*, or resting at a *Scenic Overlook Bench*) (`FR-015`, `FR-018`).
- **Rationale**: Satisfies the mixed-archetype clarification (`Session 2026-11-04`) and provides a clean, extensible contract for future features (feeding stations, gates, NPCs) without touching locomotion or camera code.
- **Alternatives Considered**:
  - *Per-component distance checks inside individual R3F mesh `useFrame` hooks*: Rejected because decentralized distance checks cannot cleanly resolve overlapping prompts (`Edge Cases`) and scatter interaction state across the scene graph.

## 7. GLB/glTF Pipeline, Modular Panda Forest Environment & Performance Optimization

- **Decision**:
  - `packages/game-assets` provides a deterministic build-time/startup `.glb` asset generator and manifest loader using `three` / `GLTFExporter` / `GLTFLoader` (`useGLTF` from `@react-three/drei`) so real binary `.glb` assets (`panda-explorer-avatar.glb`, `bamboo-cluster.glb`, `stone-lantern.glb`, `habitat-plaque.glb`) exist in `apps/web/public/assets/models/` and are loaded through the standard GLB/glTF pipeline (`Architecture Requirement 8`).
  - The Panda Forest scene in `packages/game-client` is composed of modular environment components (`TerrainPaths`, `PondWithShorelineCollider`, `BambooGroveInstances`, `RocksAndTreesInstances`, `PerimeterFence`, `InteractiveObjectsLayer`) (`Architecture Requirement 7`).
  - Repeated static geometry (bamboo stalks, rocks, trees, fence posts) uses GPU instancing (`<Instances>` / `THREE.InstancedMesh`) to keep draw calls under 50 across the entire scene.
  - `@react-three/drei`'s `<PerformanceMonitor>` dynamically adjusts canvas DPR (`[1, 2]` desktop, `[0.85, 1.5]` mobile) and shadow quality to sustain 60 FPS on desktop and 30–60 FPS on mobile.
- **Rationale**: Satisfies Principle V (Performance and Asset Quality), Architecture Requirements 7 & 8, and Performance Requirements while ensuring the repo builds and runs self-contained (`SC-008`).
- **Alternatives Considered**:
  - *Fetching external third-party CDN models at runtime*: Rejected because offline/local build reliability (`SC-008`) and security policies require self-contained, version-controlled assets.

