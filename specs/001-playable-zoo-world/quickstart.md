# Quickstart & Validation Guide: Playable Zoo World (Feature 001)

**Feature**: `001-playable-zoo-world`
**Spec**: [spec.md](./spec.md)
**Data Model**: [data-model.md](./data-model.md)
**Contracts**: [game-core-contracts.md](./contracts/game-core-contracts.md), [runtime-and-assets-contracts.md](./contracts/runtime-and-assets-contracts.md)

---

## 1. Prerequisites

- **Node.js**: `>= 20.11.0`
- **Package Manager**: `pnpm >= 9.0.0`
- **Browser**: Evergreen desktop browser (Chrome, Edge, Firefox, Safari) with WebGL2 enabled, plus mobile browser or DevTools touch device emulation.

---

## 2. Setup, Build & Run Commands (3-Step Local Launch — `SC-008`)

1. **Install dependencies**:
   ```bash
   pnpm install
   ```
2. **Build all packages and generate/validate GLB assets**:
   ```bash
   pnpm build
   ```
3. **Start the playable application**:
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 3. Automated Test Execution

Run all unit, integration, and lifecycle tests across the Turborepo workspace:

```bash
# Run unit & integration tests (locomotion, camera, collision bounds, input abstraction, interactions, init/cleanup)
pnpm test

# Run typecheck and lint across all packages
pnpm typecheck
pnpm lint

# Run end-to-end browser verification (desktop & mobile viewport, resize, HUD/menu flows)
pnpm test:e2e
```

---

## 4. End-to-End Validation Scenarios

### Scenario 1: Desktop World Entry, Movement & Genshin-Style Camera (`US1`, `FR-004`–`FR-012`)
1. Open `http://localhost:3000` on a desktop browser.
2. Verify the Entry/Loading screen reaches 100% and click **Enter Panda Forest** (`SC-001` < 10s).
3. Press `W`, `A`, `S`, `D` (cardinal and diagonal). Confirm the avatar walks smoothly and rotates to face the direction of movement within 0.3s (`SC-002`).
4. Hold `Shift` while moving to transition to `Running`; press `Space` to transition to `Jumping` (`SC-003`).
5. Move the mouse freely to orbit the camera 360 degrees horizontally and adjust pitch; scroll the mouse wheel to zoom in and out (`SC-004`).
6. Hold `Alt` and verify the mouse cursor is temporarily revealed so HUD elements can be clicked; release `Alt` to return to free-look camera control (`FR-012`).

### Scenario 2: Collision Boundaries, Blocked Pond Shoreline & Camera Obstacle Pull-In (`FR-002`, `FR-003`, `FR-011`)
1. Walk, run, and jump directly into trees, rocks, bamboo clusters, and the outer perimeter fence. Verify the avatar slides smoothly along surfaces and cannot pass through solid objects (`SC-005`).
2. Walk and jump toward the Panda Forest pond. Verify the blocked shoreline collider prevents the avatar from entering the water (`FR-002`).
3. Stand next to a large tree, rock, or perimeter wall and orbit the camera behind the obstacle. Verify the camera automatically pulls forward in front of the collider and never clips inside geometry (`SC-004`).

### Scenario 3: Mobile Touch Controls & Dedicated Run Button (`US2`, `FR-013`)
1. Open `http://localhost:3000` on a mobile browser (or Chrome DevTools mobile touch emulation).
2. Drag the on-screen **Virtual Joystick** in all directions and verify the avatar walks smoothly while facing the movement direction.
3. Hold or toggle the dedicated on-screen **Run** button while dragging the joystick and verify the avatar switches to the `Running` state (`FR-013`).
4. Drag on the right side of the touchscreen to orbit the camera 360 degrees and tap **Jump** to jump.

### Scenario 4: Mixed-Archetype Environmental Interactions (`US3`, `FR-015`–`FR-018`)
1. Approach a **Habitat Info Plaque** along the Panda Forest path. Verify the contextual prompt appears within 0.2s (`SC-006`).
2. Press `E` (desktop) or tap **Interact** (mobile) and verify the UI info card modal opens with habitat facts; move away or close the card to dismiss.
3. Approach an interactive **World Prop** (e.g., *Stone Garden Lantern*, *Bamboo Wind Chime*, or *Scenic Bench*). Trigger the interaction and verify the 3D prop visually changes state/animates in the world.

### Scenario 5: Settings Menu, Browser Resize & Lifecycle Cleanup (`US4`, `FR-021`, `Testing Requirements`)
1. Press `ESC` (desktop) or tap **Menu** (mobile) to open the Settings Menu.
2. Adjust **Camera Sensitivity** and **Audio Mute**, resume gameplay, and confirm the new camera sensitivity takes immediate effect.
3. Resize the browser window across desktop and mobile aspect ratios and verify the 3D canvas and HUD reflow cleanly without stuck movement inputs.

