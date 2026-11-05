# Feature Specification: Streamlined HUD & Entrance Gate Arrival

**Feature Branch**: `011-hud-gate-ergonomics`  
**Created**: 2026-11-05  
**Status**: Approved  
**Input**: User description: "all the HUD is quite overwhelming, when starting should be behind the gate so we can walk into the gate instead. use speckit for upgrading those"

## Clarifications

### Session 2026-11-05

- Q: Where should the Sanctuary Entrance Gate be positioned relative to the player's starting spawn point? → A: The player spawns on the South Arrival Terrace (`[0, 0.1, 18]`, multi-visitor slots `Z >= 18.0`) facing North (`-Z`) toward the Sanctuary Entrance Gate positioned directly ahead at `[0, 0, 16.4]` (with solid pillars `gate-pillar-west` at `[-2.1, 0, 16.4]` and `gate-pillar-east` at `[2.1, 0, 16.4]` and flanking bamboo-and-stone entrance wings), so players start outside/behind the gate and walk forward (`W` / Up / joystick forward) through the gate opening into the Welcome Plaza (`Z <= 16.4`).
- Q: How should the HUD be reorganized so it feels calm and unobtrusive while preserving full accessibility of all existing features and E2E test selectors? → A: (1) Condense the top-left status area into a compact status bar with a toggleable Minimal/Compact HUD mode (`hud-compact-toggle-btn`); (2) Move the 6 gameplay feature buttons (`Events`, `Passport`, `Food Stall`, `Food Bag`, `Encyclopedia`, `Social`) out of the top-right corner into a unified, low-profile Bottom-Center Activity Dock (`hud-action-dock`), leaving only compact utility pills (`Avatar`, `? Help`, `Menu`) in the top-right; (3) Reposition the first-time onboarding guide card (`onboarding-guide-modal`) to a compact top-right card (`top-16 right-4 max-w-xs`) so it never overlaps the bottom-left chat/emote bar or the 3D Entrance Gate; and (4) Make the bottom-left chat/emote panel and top-left habitat strip compact with quick collapse toggles.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Spawn Behind the Entrance Gate & Walk Into the Sanctuary (Priority: P1)

As a player entering Online Zoo, I want to start on the arrival terrace outside/behind the Sanctuary Entrance Gate facing the gate archway so that my first action is naturally walking forward through the gate into the Welcome Plaza.

**Why this priority**: Starting with the Entrance Gate behind the player broke spatial immersion and made the arrival feel disorienting. Positioning the gate directly in front of the arrival terrace creates an inviting threshold into the zoo and naturally triggers the `Welcome Plaza Gate` passport stamp as the player walks through the gate.

**Independent Test**: Enter the zoo on desktop or mobile, verify the local avatar spawns at `Z >= 18.0` (outside the gate at `Z = 16.4`) facing North (`-Z`), verify the 3D Entrance Gate Archway (`[0, 0, 16.4]`) is directly in front of the player, and press `W` / forward to walk cleanly between the gate pillars (`X = -2.1` and `X = 2.1`) into the Welcome Plaza (`Z < 16.4`).

**Acceptance Scenarios**:

1. **Given** a new or returning player enters a zoo instance, **When** the world finishes loading, **Then** the player spawns on the South Arrival Terrace (`Z >= 18.0`) behind the Sanctuary Entrance Gate (`Z = 16.4`) facing North (`-Z`, `facingYaw = Math.PI`, `cameraYaw = 0`) with the gate archway directly ahead in the camera view.
2. **Given** the player is at the starting spawn position (`[0, 0.1, 18]`), **When** the player moves forward (`W`, `ArrowUp`, or touch joystick up), **Then** the avatar walks along the flagstone path through the `4.2m` Entrance Gate opening (`Z = 16.4`) into the Welcome Plaza (`Z <= 16.4`) without colliding with the gate pillars.
3. **Given** the player attempts to walk directly into the left (`[-2.1, 0, 16.4]`) or right (`[2.1, 0, 16.4]`) gate pillars, **When** horizontal collision resolution runs, **Then** the gate pillars block penetration while keeping the central archway path unobstructed.

---

### User Story 2 - Uncluttered HUD Layout & Bottom Activity Dock (Priority: P1)

As a player exploring the zoo, I want a clean, calm, well-organized HUD where status indicators are condensed, gameplay features sit in a unified bottom dock, and panels do not overlap each other or obscure the 3D view.

**Why this priority**: Previously, 14+ top-left badges, 9 large top-right rainbow buttons, a middle-left animal strip, a bottom-left chat box, and an overlapping bottom-left onboarding modal crowded the viewport simultaneously on startup.

**Independent Test**: Enter the zoo and verify that: (1) the top-left status bar is compact and includes a `Compact HUD` toggle (`hud-compact-toggle-btn`), (2) the 6 zoo activity buttons are organized in the unified Bottom-Center Activity Dock (`hud-action-dock`), (3) only 3 utility buttons remain in the top-right corner, and (4) the compact onboarding card (`onboarding-guide-modal`) does not overlap the bottom-left chat/emote bar.

**Acceptance Scenarios**:

1. **Given** the player is in the `playing` phase, **When** viewing the HUD, **Then** the 6 core zoo activity triggers (`Passport`, `Encyclopedia`, `Food Stall`, `Food Bag`, `Events`, `Social`) are rendered in a low-profile Bottom-Center Activity Dock (`hud-action-dock`) and the top-right corner only contains the 3 compact utility triggers (`Avatar`, `? Help`, `Menu`).
2. **Given** a first-time player enters the zoo, **When** the welcome onboarding card (`onboarding-guide-modal`) appears, **Then** it is rendered as a compact top-right arrival card (`max-w-xs`) that explains walking forward through the Sanctuary Gate and does not overlap the bottom-left proximity chat or emote bar.
3. **Given** the player wants an even cleaner view of the 3D world, **When** the player clicks the HUD Compact Mode toggle (`hud-compact-toggle-btn`) or presses `KeyH`, **Then** secondary diagnostic badges, the habitat animal strip, and the chat message history collapse into minimal mode while keeping primary controls accessible.

---

### Edge Cases

- **Multi-visitor simultaneous spawns**: When up to 16 players join the same instance, `computeSpawnPosition` must place all 16 spawn slots on the South Arrival Terrace (`Z >= 18.0 > 16.4`) so no visitor spawns inside a gate pillar or already past the gate.
- **Welcome Plaza bench clearance**: Placing the Entrance Gate pillars at `[-2.1, 0, 16.4]` and `[2.1, 0, 16.4]` must maintain full clearance (`> 1.0m`) around the Welcome Plaza Bamboo Bench (`[-3.2, 0, 15.0]`) and its interaction zone (`[-3.0, 0.1, 15.8]`).
- **Full backward compatibility with E2E selectors**: Every existing `data-testid` badge and button must remain mounted and visible by default so all Features 001–010 E2E suites pass without regression.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The world layout (`PANDA_FOREST_LAYOUT`) MUST define `entranceGatePosition: [0, 0, 16.4]` with solid pillar colliders `gate-pillar-west` (`[-2.1, 0, 16.4]`, radius `0.45m`) and `gate-pillar-east` (`[2.1, 0, 16.4]`, radius `0.45m`) located North (`-Z`) of the player spawn terrace (`[0, 0.1, 18]`).
- **FR-002**: Both `ZooInstanceAuthority.computeSpawnPosition` and the live multiplayer server (`apps/web/server.mjs`) MUST place all spawn slots (`0` through `15`) behind the Entrance Gate (`Z >= 18.0 > 16.4`) facing North (`facingYaw = Math.PI`, `cameraYaw = 0`) toward the gate.
- **FR-003**: `PerimeterEnclosure` MUST render the 3D Sanctuary Entrance Gate Archway at `PANDA_FOREST_LAYOUT.entranceGatePosition` (`[0, 0, 16.4]`) along with flanking bamboo-and-stone entrance wing fences and welcome lanterns, and `TerrainAndPaths` MUST extend flagstone stepping stones from the South Arrival Terrace (`Z = 20.5`) through the gate (`Z = 16.4`) into the Welcome Plaza.
- **FR-004**: `GameHudOverlay` MUST condense the top-left status area into a compact primary status pill + subtle micro-details strip (`hud-secondary-details-strip`) and provide a `Compact HUD` toggle button (`data-testid="hud-compact-toggle-btn"`, keyboard shortcut `H`) that collapses/expands secondary HUD details.
- **FR-005**: `GameHudOverlay` MUST separate the 6 gameplay activity triggers (`hud-events-btn`, `hud-passport-btn`, `hud-food-stall-btn`, `toggle-food-inventory-btn`, `animal-encyclopedia-button`, `toggle-social-drawer-btn`) into a unified Bottom-Center Activity Dock (`data-testid="hud-action-dock"`), leaving only the 3 utility buttons (`open-avatar-customizer-btn`, `hud-help-beta-btn`, `open-settings-btn`) in the top-right bar.
- **FR-006**: `BetaReadinessOverlay` MUST render the first-time `onboarding-guide-modal` as a compact arrival card (`top-16 right-4 max-w-xs`) that never overlaps the bottom-left chat/emote controls or the center 3D Entrance Gate.
- **FR-007**: `AnimalSimulationOverlay` and `SocialInteractionOverlay` MUST use compact default footprints with quick collapse/expand toggles (`toggle-animal-strip-btn`, `toggle-chat-compact-btn`) while keeping all existing `data-testid` elements visible by default.

### Key Entities

- **Entrance Gate Configuration (`entranceGatePosition`)**: World-space coordinates `[0, 0, 16.4]` and pillar colliders `gate-pillar-west` / `gate-pillar-east` defining the threshold between the South Arrival Terrace (`Z >= 18.0`) and the Welcome Plaza (`Z <= 16.4`).
- **HUD Compact Mode State (`isHudCompact`)**: Boolean UI preference allowing players to toggle secondary HUD details on or off at any time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of single-player and multi-player spawns (`spawnIndex` `0`–`15`) start at `Z >= 18.0` (strictly behind `entranceGatePosition[2] = 16.4`) facing North (`-Z`), and walking straight forward (`X = 0`, `-Z`) passes cleanly through `Z = 16.4` into the Welcome Plaza without collision.
- **SC-002**: Top-right HUD button count is reduced from 9 to 3 (67% reduction), with the 6 gameplay activity buttons consolidated into the Bottom-Center Activity Dock (`hud-action-dock`).
- **SC-003**: Zero bounding-box overlap occurs between `onboarding-guide-modal` and `proximity-chat-panel` / `emote-picker-bar` on desktop (`1280x720`) Viewports.
- **SC-004**: 100% of existing unit and E2E tests across Features 001–010 continue to pass alongside new Feature 011 verification tests.

