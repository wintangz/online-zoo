# Implementation Plan: Streamlined HUD & Entrance Gate Arrival

**Branch**: `011-hud-gate-ergonomics` | **Date**: 2026-11-05 | **Spec**: [spec.md](file:///y:/Repos/online-zoo/specs/011-hud-gate-ergonomics/spec.md)

## Summary

Upgrade the arrival experience and HUD ergonomics of Online Zoo so that:
1. Players spawn on the South Arrival Terrace (`Z >= 18.0`) **behind** the Sanctuary Entrance Gate (`[0, 0, 16.4]`) facing North (`-Z`), allowing them to walk forward through the gate archway into the Welcome Plaza (`Z <= 16.4`).
2. The in-game HUD is reorganized into a calm, low-profile layout with a compact top-left status bar + `Compact HUD` toggle (`hud-compact-toggle-btn`), a 3-pill top-right utility bar, a unified 6-item Bottom-Center Activity Dock (`hud-action-dock`), a non-overlapping top-right welcome guide card (`onboarding-guide-modal`), and compact collapsible animal/chat panels.

## Technical Context

**Language/Version**: TypeScript 5.8 (Strict mode) / Node.js 22+  
**Primary Dependencies**: React 19, Three.js / `@react-three/fiber` / `@react-three/rapier`, Zustand, Tailwind CSS 4  
**Testing**: Vitest (`packages/game-core`) + Playwright (`apps/web/e2e`)  
**Target Platform**: Desktop & Mobile Web Browsers

## Project Structure

```text
packages/game-core/
├── src/
│   ├── types.ts                              # Add entranceGatePosition to WorldLayoutConfig & isHudCompact to GameStoreState
│   ├── world/pandaForestLayout.ts            # Position entranceGatePosition at [0, 0, 16.4] and gate pillars at [±2.1, 0, 16.4]
│   ├── multiplayer/zooInstanceAuthority.ts   # Ensure computeSpawnPosition places all 16 slots at Z >= 18.0 behind the gate
│   └── state/gameStore.ts                    # Add isHudCompact state & toggleHudCompact action
└── __tests__/
    └── hudAndGateErgonomics.test.ts          # Unit tests for gate geometry, spawn-behind-gate, walk-through-gate, and HUD compact state

packages/game-client/
└── src/environment/
    ├── PerimeterEnclosure.tsx                # Render Entrance Gate Archway + flanking bamboo-stone wings & lanterns at [0, 0, 16.4]
    └── TerrainAndPaths.tsx                   # Extend flagstone stepping stones from Z = 21 through gate (Z = 16.4)

packages/ui/
└── src/
    ├── GameHudOverlay.tsx                    # Compact top-left bar, Compact HUD toggle, 3-pill top-right utility bar, Bottom-Center Activity Dock
    ├── BetaReadinessOverlay.tsx              # Compact top-right arrival card (no overlap with bottom-left chat)
    ├── AnimalSimulationOverlay.tsx           # Low-profile top-left habitat strip with collapse toggle
    └── SocialInteractionOverlay.tsx          # Compact bottom-left chat & emote bar with collapse toggle

apps/web/
├── server.mjs                                # Align PANDA_FOREST_OBSTACLES gate pillars & computeSpawnPosition with game-core
└── e2e/
    └── hud-gate-ergonomics.spec.ts           # Playwright E2E test verifying spawn behind gate, walking through gate, and streamlined HUD
```

