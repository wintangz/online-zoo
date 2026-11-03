# Data Model: Playable Zoo World (Feature 001)

**Feature**: `001-playable-zoo-world`
**Date**: 2026-11-04
**Status**: Complete

## Overview

Feature 001 operates entirely client-side without external database persistence (`FR-022`). Domain state is strictly partitioned into:
1. **Transient Frame Entities (`packages/game-core`)**: Mutated at 60–120 Hz inside the game loop without triggering React re-renders.
2. **Reactive UI & Session Entities (`Zustand` store in `packages/game-core`)**: Updated only on discrete user or gameplay events and consumed by `packages/ui`.
3. **Static Scene & Asset Descriptors (`packages/game-assets` & `packages/game-core`)**: Immutable world layout, collision geometry descriptors, and GLB asset manifests.

---

## 1. Transient Frame Entities (60 Hz Mutable Runtime)

### 1.1 `PlayerAvatarState`
Represents the real-time physical and kinematic state of the player's third-person avatar (`FR-004`–`FR-007`).

| Field | Type | Constraints / Validation | Description |
|-------|------|--------------------------|-------------|
| `position` | `[number, number, number]` | Within playable zone bounds (`[-40, 40]` X/Z, `y >= 0`) | World-space XYZ coordinates of the avatar capsule base. |
| `velocity` | `[number, number, number]` | Horizontal speed $\le 7.5\text{ m/s}$ (run), $\le 4.0\text{ m/s}$ (walk) | Current linear velocity vector in world space. |
| `facingYaw` | `number` | Normalized radians $[-\pi, \pi]$ | Current horizontal facing angle of the avatar mesh. |
| `targetYaw` | `number` | Normalized radians $[-\pi, \pi]$ | Desired horizontal facing angle aligned with movement vector. |
| `locomotionState` | `'Idle' \| 'Walking' \| 'Running' \| 'Jumping'` | Deterministic state machine transitions (see below) | Active movement & animation state. |
| `isGrounded` | `boolean` | Reported by Rapier `KinematicCharacterController` | Whether the avatar's capsule base rests on a walkable surface. |
| `verticalVelocity` | `number` | Jump impulse $+6.5\text{ m/s}$; gravity $-18.0\text{ m/s}^2$; terminal $-25.0\text{ m/s}$ | Vertical velocity component for jumping and falling. |

#### Locomotion State Transitions
- `Idle` → `Walking`: `isGrounded === true` and horizontal input magnitude $> 0.05$ and `runHeld === false`.
- `Idle` → `Running`: `isGrounded === true` and horizontal input magnitude $> 0.05$ and `runHeld === true`.
- `Walking` ↔ `Running`: `isGrounded === true` and horizontal input magnitude $> 0.05` when `runHeld` toggles (`Shift` on desktop or dedicated `Run` button on mobile).
- `Idle | Walking | Running` → `Jumping`: `isGrounded === true` and `jumpPressed === true` (applies positive `verticalVelocity` and blocks repeat jumps while airborne).
- `Jumping` → `Idle | Walking | Running`: `isGrounded === true` and `verticalVelocity <= 0` upon landing, transitioning to `Running`, `Walking`, or `Idle` based on active horizontal input and `runHeld`.

---

### 1.2 `FollowCameraState`
Represents the orbital third-person camera state (`FR-008`–`FR-011`).

| Field | Type | Constraints / Validation | Description |
|-------|------|--------------------------|-------------|
| `yaw` | `number` | Continuous $[0, 2\pi)$ wraps cleanly (360° orbit) | Horizontal orbit angle around the avatar pivot. |
| `pitch` | `number` | Clamped to $[0.15\text{ rad}, 1.35\text{ rad}]$ ($\approx 8.5^\circ$ to $77^\circ$) | Vertical elevation angle preventing ground-underflip or zenith gimbal lock. |
| `targetDistance` | `number` | Clamped to $[2.5\text{ m}, 10.0\text{ m}]$ | User-selected zoom distance via mouse scroll or touch pinch. |
| `effectiveDistance` | `number` | $[0.8\text{ m}, \text{targetDistance}]$ | Obstacle-clamped camera distance after Rapier raycast/shapecast against environment colliders. |
| `pivotOffset` | `[number, number, number]` | Default `[0, 1.4, 0]` above avatar base | Target look-at offset on the player avatar. |

---

### 1.3 `NormalizedInputSnapshot`
Unified per-frame input state produced by `InputAbstraction` (`FR-012`–`FR-014`).

| Field | Type | Constraints / Validation | Description |
|-------|------|--------------------------|-------------|
| `moveX` | `number` | $[-1.0, 1.0]$; $\sqrt{\text{moveX}^2 + \text{moveZ}^2} \le 1.0$ | Strafe right (`+`) / left (`-`) from `A`/`D` or virtual joystick X. |
| `moveZ` | `number` | $[-1.0, 1.0]$; $\sqrt{\text{moveX}^2 + \text{moveZ}^2} \le 1.0$ | Move forward (`-`) / backward (`+`) from `W`/`S` or virtual joystick Y. |
| `runHeld` | `boolean` | `Shift` key (desktop) or dedicated `Run` touch button (mobile) | Activates running speed when moving. |
| `jumpPressed` | `boolean` | Edge-triggered on `Space` (desktop) or `Jump` touch button (mobile) | Requests a jump on the current frame. |
| `interactPressed` | `boolean` | Edge-triggered on `E` (desktop) or `Interact` touch button (mobile) | Triggers the currently targeted `InteractiveObject`. |
| `menuPressed` | `boolean` | Edge-triggered on `ESC` (desktop) or `Menu` touch button (mobile) | Toggles the in-game settings menu. |
| `cursorRevealHeld` | `boolean` | Held while `Alt` is pressed on desktop (`FR-012`) | Temporarily unlocks/shows mouse cursor for HUD interaction. |
| `lookDeltaX` | `number` | Finite radians delta per frame | Horizontal camera rotation delta from pointer-lock mouse or touch drag. |
| `lookDeltaY` | `number` | Finite radians delta per frame | Vertical camera rotation delta from pointer-lock mouse or touch drag. |
| `zoomDelta` | `number` | Clamped step per frame | Camera zoom delta from scroll wheel or touch pinch. |
| `activeDevice` | `'desktop' \| 'touch'` | Auto-detected from capability + most recent input event | Determines contextual prompt icon/label (`E` vs `Tap`) and touch HUD visibility. |

---

## 2. World & Interaction Entities (`packages/game-core`)

### 2.1 `InteractiveObjectDescriptor`
Defines a world object placed in the Panda Forest that players can detect and interact with (`FR-015`–`FR-018`).

| Field | Type | Constraints / Validation | Description |
|-------|------|--------------------------|-------------|
| `id` | `string` | Unique non-empty slug (e.g., `'plaque-panda-habitat'`) | Stable identifier for the interactive object. |
| `title` | `string` | $1\text{–}60$ chars | Display name shown in the contextual prompt (e.g., `"Panda Habitat Plaque"`). |
| `promptAction` | `string` | $1\text{–}30$ chars | Verb shown in prompt (e.g., `"Read Plaque"`, `"Light Lantern"`, `"Ring Chime"`). |
| `archetype` | `'info_plaque' \| 'world_prop'` | Required enum (`Clarifications Session 2026-11-04`) | Determines whether activation opens a UI info card or toggles a 3D prop state. |
| `position` | `[number, number, number]` | Within Panda Forest walkable proximity | World-space coordinates used for distance/facing evaluation. |
| `interactionRadius` | `number` | $[1.5\text{ m}, 4.5\text{ m}]$ | Maximum distance from avatar within which the object can be targeted. |
| `infoCard` | `{ heading: string; body: string; facts: string[] } \| undefined` | Required when `archetype === 'info_plaque'` | Structured educational/habitat content displayed in the HUD modal. |
| `propReactionType` | `'toggle_lantern' \| 'ring_chime' \| 'rest_bench' \| undefined` | Required when `archetype === 'world_prop'` | Identifies the 3D visual/animation reaction triggered in the scene. |

### 2.2 `PandaForestZoneLayout`
Defines the spatial zones and solid collider groups of the Panda Forest (`FR-001`–`FR-003`):
- **Spawn Transform**: Position `[0, 0.1, 18]`, initial facing yaw `0` (looking north along the main stone pathway).
- **Walkable Paths**: Central bamboo trail, pond-side boardwalk loop, and lantern pavilion clearing.
- **Pond & Shoreline Collider (`FR-002`)**: Circular water feature centered at `[-8, 0, -4]` (`radius: 6.5m`) enclosed by an unbroken ring of shoreline rocks and an invisible cylinder/trimesh shoreline barrier that prevents avatar entry into the water.
- **Perimeter Boundary**: Stylized bamboo-and-stone enclosure fence (`radius: 36m`) with continuous fixed rigid-body colliders preventing the player from exiting the playable zone.
- **Instanced Environment Props**: Collision-enabled trees, rocks, and dense bamboo clusters distributed outside walking paths.

---

## 3. Reactive UI & Session State (`Zustand` Store)

### 3.1 `GameSessionSlice`
- `phase`: `'loading' | 'ready' | 'playing' | 'paused'`
- `loadingProgress`: `number` (`0` to `100`)
- `locomotionState`: `'Idle' | 'Walking' | 'Running' | 'Jumping'`
- `activeDevice`: `'desktop' | 'touch'`
- `isPointerLocked`: `boolean`
- `isCursorRevealed`: `boolean` (`true` while `Alt` held on desktop or menu open)
- `focusedObject`: `InteractiveObjectDescriptor | null` (the single closest targeted `InteractiveObjectDescriptor`)
- `activePlaqueModal`: `InteractiveObjectDescriptor | null` (currently open info plaque modal, if any)
- `propStates`: `Record<string, { active: boolean; lastTriggeredAt: number }>` (reactive state for `world_prop` archetypes such as lantern lit/unlit or chime ringing animation timestamp)

### 3.2 `UserSettingsSlice` (Persisted to `localStorage` under `online-zoo:settings:v1`)
- `cameraSensitivity`: `number` (Range `[0.2, 2.5]`, default `1.0`)
- `invertCameraY`: `boolean` (Default `false`)
- `audioMuted`: `boolean` (Default `false`)
- `masterVolume`: `number` (Range `[0.0, 1.0]`, default `0.7`)
- `qualityTier`: `'auto' | 'low' | 'medium' | 'high'` (Default `'auto'`)
- `showControlHints`: `boolean` (Default `true`)

