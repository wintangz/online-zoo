# Research: HUD Declutter (`hud-declutter`)

## Decision 1: Unified Panel Mouse-Look Pause (`syncPanelCursorState`)
- **Decision**: In `packages/game-core/src/state/gameStore.ts`, compute whether any UI panel or modal is open (`activePlaque`, `identity.draft.isOpen`, `social.isSocialDrawerOpen`, `isChatPanelOpen`, `animalSim.isEncyclopediaOpen`, `animalSim.inspectedAnimalId`, `dining.isInventoryOpen`, `dining.activeStallId`, `passport.isPassportOpen`, `events.isEventsModalOpen`, `betaReadiness.isHelpCenterOpen`, `isSettingsModalOpen`, `phase === 'paused'`). Whenever any panel opens, set `isCursorRevealed: true`; when the last open panel closes, set `isCursorRevealed: false`. In `GameLoopController.tsx`, suppress camera orbit/look deltas whenever any panel is open.
- **Rationale**: Guarantees opening any panel pauses mouse-look identically to how the Settings menu does today.

## Decision 2: Single Dock Row & Dev Toggle (`isDevDebugOpen`)
- **Decision**: Consolidate all feature triggers into `hud-action-dock` (Chat & Emotes, Social & Friends, Passport, Encyclopedia, Food Bag, Food Stall, Events, Help, Settings, Dev Info). Keep `isDevDebugOpen: false` by default so `hud-secondary-details-strip`, `animal-status-strip`, and floating 3D animal debug labels are hidden on a fresh join and revealed with 1 click on `hud-dev-debug-toggle-btn`.
- **Rationale**: Leaves the zoo viewport nearly bare on join while keeping every feature and diagnostic selector reachable within 1–2 clicks.

