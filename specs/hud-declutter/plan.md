# Implementation Plan: HUD Declutter (`hud-declutter`)

**Branch**: `fix/hud-declutter` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/hud-declutter/spec.md`

## Summary

Declutter the in-game HUD in `@online-zoo/ui` and client state in `@online-zoo/game-core`:
1. Limit persistent on-screen elements to:
   - Top-left **Player Name + Avatar Chip** and **Current Zone Name** (`hud-status-bar`)
   - Contextual **Interact Prompt** (`InteractionPromptBanner`, only when near an interactable object)
   - Overhead **3D Proximity Chat Bubbles**
   - **ONE compact dock/icon row** (`hud-action-dock`) containing buttons for Chat & Emotes, Social & Friends, Passport, Encyclopedia, Food Bag & Stall, Events, Help/Controls, Settings, and Dev/Debug Toggle.
2. Remove the permanent desktop controls hint bar (`desktop-control-hints`) so controls reference lives exclusively in the dismissible first-join overlay (`onboarding-guide-modal`) and the Help panel (`help-beta-modal`).
3. Hide animal/debug info text (`hud-secondary-details-strip`, `animal-status-strip`, and 3D animal debug tags in `ZooAnimalsLayer.tsx`) by default behind `isDevDebugOpen` (toggled via `hud-dev-debug-toggle-btn` or key `H`).
4. Ensure opening any dock panel pauses camera mouse-look (`isCursorRevealed = true`) and closing panels restores camera look, and cap all panels at `max-h-[60vh]` on mobile viewports.

## Technical Context

**Language/Version**: TypeScript 5.6 (React 18, Zustand)  
**Primary Dependencies**: `@online-zoo/ui`, `@online-zoo/game-core`, `@online-zoo/game-client`  
**Testing**: Vitest (`pnpm test`), Playwright E2E  
**Constraints**: Zero protocol or `apps/server` changes; persistent elements strictly limited to the 5 allowed items; mobile panels `<= 60vh`.

## Project Structure

### Documentation (this feature)

```text
specs/hud-declutter/
├── spec.md
├── ASSUMPTIONS.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/game-core/
└── src/
    └── state/
        └── gameStore.ts                 # Updated: adds isDevDebugOpen, isChatPanelOpen, isAnyUiPanelOpen, and syncs cursor/mouse-look pause on panel open/close

packages/game-client/
└── src/
    ├── entities/
    │   └── ZooAnimalsLayer.tsx          # Updated: hides 3D animal debug tag unless isDevDebugOpen is true
    └── runtime/
        └── GameLoopController.tsx       # Updated: pauses camera mouse-look whenever any dock panel/modal is open

packages/ui/
└── src/
    ├── GameHudOverlay.tsx               # Refactored: bare top-left player+zone chip + single bottom-right dock row; debug strip hidden unless isDevDebugOpen
    ├── SocialInteractionOverlay.tsx     # Refactored: Chat & Emotes panel behind isChatPanelOpen; mobile max-h-[60vh]
    ├── AnimalSimulationOverlay.tsx      # Refactored: animal-status-strip hidden unless isDevDebugOpen; mobile max-h-[60vh]
    ├── FoodAndDiningOverlay.tsx         # Refactored: mobile max-h-[60vh]
    ├── ZooPassportOverlay.tsx           # Refactored: mobile max-h-[60vh]
    ├── EventsAndActivitiesOverlay.tsx   # Refactored: mobile max-h-[60vh]
    ├── BetaReadinessOverlay.tsx         # Refactored: dismissible first-join overlay + Help panel with mobile max-h-[60vh]
    ├── SettingsMenuModal.tsx            # Refactored: mobile max-h-[60vh]
    ├── AvatarCustomizerModal.tsx        # Refactored: mobile max-h-[60vh]
    └── InfoPlaqueModal.tsx              # Refactored: mobile max-h-[60vh]
```

