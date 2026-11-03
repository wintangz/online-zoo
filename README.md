# Online Zoo — Playable Zoo World (Feature 001)

A browser-based 3D social zoo simulation game built with **Next.js**, **React Three Fiber**, **Three.js**, **Rapier Physics**, **Zustand**, **Tailwind CSS**, and **Turborepo**.

Feature 001 delivers the first playable 3D vertical slice: the **Panda Forest Sanctuary**, complete with third-person avatar locomotion (`Idle`, `Walking`, `Running`, `Jumping`), a collision-aware 360-degree orbital camera, Genshin Impact-style free-look desktop mouse controls (`Alt` to reveal cursor), mobile touch controls (Virtual Joystick + dedicated `Run` button + touch-drag camera), solid environmental and pond-shoreline collision boundaries, and a reusable interaction framework supporting both readable habitat plaques and animated 3D world props.

---

## Quickstart (3-Step Local Build & Run)

### Prerequisites
- **Node.js** `>= 20.11.0`
- **pnpm** `>= 9.0.0`

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Build All Packages & Generate GLB Assets
```bash
pnpm build
```

### 3. Start the Playable World
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in any modern desktop or mobile browser.

---

## Controls

### Desktop Controls
- **`W` `A` `S` `D` / Arrow Keys**: Move in 8 directions relative to the camera
- **`Shift` (Hold)**: Run
- **`Space`**: Jump
- **Mouse Move**: 360° Free-Look Camera Orbit (click canvas to lock cursor)
- **Mouse Scroll**: Adjust Camera Zoom (`2.5m`–`10.0m`)
- **Hold `Alt`**: Temporarily unlock and reveal the mouse cursor for HUD interaction (Genshin Impact style)
- **`E` / Click Prompt**: Interact with nearby Habitat Plaques or 3D World Props
- **`ESC`**: Open / Close the in-game Settings Menu

### Mobile & Touch Controls
- **Left Virtual Joystick**: 360° Directional Movement at Walking Speed
- **Dedicated `Run` Button**: Toggle or hold to switch to Running Speed
- **Right Screen Touch-and-Drag**: 360° Camera Rotation (two-finger pinch to zoom)
- **`Jump` Button**: Jump
- **`Use` / Prompt Banner Tap**: Trigger nearby object interaction
- **`Menu / Settings` Button**: Open the Settings Menu

---

## Monorepo Architecture

```text
online-zoo/
├── apps/
│   └── web/                  # Next.js App Router shell & Playwright E2E suite
└── packages/
    ├── game-core/            # Pure TypeScript gameplay logic (Input, Locomotion, Camera, Interactions, Store)
    ├── game-assets/          # GLB/glTF asset manifest, deterministic GLB builder & disposal helpers
    ├── game-client/          # React Three Fiber + Drei + Rapier 3D runtime & modular Panda Forest scene
    ├── ui/                   # React + Tailwind CSS HUD, Touch Controls, Plaque Modal & Settings Menu
    └── config/               # Shared TypeScript and Tailwind presets
```

---

## Verification & Testing Commands

```bash
# Run all unit, integration, and lifecycle tests across packages (Vitest)
pnpm test

# Run TypeScript typechecking across all packages
pnpm typecheck

# Run Playwright end-to-end browser verification
pnpm test:e2e
```

