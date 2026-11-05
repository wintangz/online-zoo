# Research & Spatial Ergonomics Analysis: Feature 011

## 1. Entrance Gate & Spawn Coordinate Alignment

- **Root Cause**: `PANDA_FOREST_LAYOUT.spawnPosition` is `[0, 0.1, 18]` with camera at `[0, 3.85, 22.95]` looking North (`-Z`), whereas `PerimeterEnclosure.tsx` and `PANDA_FOREST_LAYOUT.obstacles` placed the Entrance Gate Archway (`gate-pillar-west`, `gate-pillar-east`) at `Z = 22.5` (behind the player and right in front of the camera).
- **Resolution**:
  - Place `entranceGatePosition` at `[0, 0, 16.4]` with `gate-pillar-west` at `[-2.1, 0, 16.4]` (radius `0.45m`) and `gate-pillar-east` at `[2.1, 0, 16.4]` (radius `0.45m`).
  - Clear walkway width between pillars: `4.2m - 2 * 0.45m = 3.3m` (more than 3.5x the avatar diameter `0.9m`).
  - Clearance from `prop-plaza-bench` (`[-3.2, 0, 15.0]`, radius `0.5m`) and its test interaction point (`[-3.0, 0.1, 15.8]`): `hypot(-2.1 - (-3.0), 16.4 - 15.8) = 1.082m > 0.90m` (zero interference).
  - Multi-player spawn spiral (`computeSpawnPosition`): using `candidateZ = base[2] + Math.abs(Math.sin(angle)) * radius` keeps all 16 visitor slots within `2.2m` of `[0, 0.1, 18]` while guaranteeing `Z >= 18.0 > 16.4` (100% behind the gate).

## 2. Streamlined HUD Ergonomics & E2E Compatibility

- **Root Cause**: All status badges (14+) and action buttons (9) were concentrated at the top of the screen while `onboarding-guide-modal` and `proximity-chat-panel` both anchored to `bottom-4 left-4`.
- **Resolution**:
  - **Top-Left Compact Status Pill**: Primary row (`Panda Forest`, `multiplayer-status-badge`, `visitor-count-badge`, `hud-currency-badge`, `local-visitor-badge`, `hud-compact-toggle-btn`) + ultra-compact micro-details row (`hud-secondary-details-strip`).
  - **Bottom-Center Activity Dock (`hud-action-dock`)**: Houses `hud-passport-btn`, `animal-encyclopedia-button`, `hud-food-stall-btn`, `toggle-food-inventory-btn`, `hud-events-btn`, and `toggle-social-drawer-btn` in a unified dark-glass bar.
  - **Top-Right Utility Bar**: Houses only `open-avatar-customizer-btn`, `hud-help-beta-btn`, and `open-settings-btn`.
  - **Non-Overlapping Onboarding Card**: Anchored at `top-14 right-4 max-w-xs` so it never collides with `bottom-4 left-4` chat/emotes.

