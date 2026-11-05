# Feature Specification: HUD Declutter (`hud-declutter`)

**Feature Branch**: `fix/hud-declutter`  
**Created**: 2026-11-05  
**Status**: Draft  
**Input**: User description: "hud-declutter: UI package (packages/ui) + client state only; no protocol or server changes. Persistent on-screen elements are limited to: player name + avatar chip, current zone name, the interact prompt (only when something is interactable), proximity chat bubbles, and ONE small dock/icon row for everything else. All other features live behind that dock as panels/modals — nothing else is permanently visible. The controls reference must NOT be permanently on screen: help panel plus a dismissible first-join overlay. Animal/debug info text hidden by default (dev toggle only). Opening a panel pauses mouse-look like the settings menu does today. Mobile parity with existing touch controls; no panel covers more than ~60% of a phone screen. A fresh join should show the zoo nearly bare; everything hidden is reachable within 2 clicks/taps. Do not remove features or break existing E2E selectors without updating the tests."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bare, Uncluttered Viewport on Join (Priority: P1)

When a player enters the zoo, the viewport is nearly bare: the only persistent on-screen elements are the player name + avatar chip, the current zone name, the contextual interact prompt (only when near an interactable object), overhead proximity chat bubbles, and one compact dock/icon row for all other features.

**Why this priority**: Previously, multiple utility bars, permanent control hint strips, animal status strips, diagnostic badges, and chat/emote boxes cluttered the viewport simultaneously.

**Independent Test**: Enter the zoo and verify only the player/zone chip, single dock row, and (on first visit) the dismissible onboarding overlay are visible; chat/emotes, controls reference, and debug/animal strips are hidden until toggled.

**Acceptance Scenarios**:

1. **Given** a fresh join in `playing` phase, **When** inspecting persistent HUD elements, **Then** only `hud-status-bar` (player name + avatar chip + current zone name) and `hud-action-dock` (single icon row) are permanently visible (plus `InteractionPromptBanner` when in range of an interactable object and overhead proximity chat bubbles).
2. **Given** the controls reference, **When** playing, **Then** no permanent `desktop-control-hints` strip is shown on screen; controls are shown in the dismissible first-join overlay (`onboarding-guide-modal`) and the Help panel (`help-beta-modal`).

---

### User Story 2 - Dock-Triggered Panels Pause Mouse-Look & Respect Mobile 60% Height Cap (Priority: P1)

Every feature (Chat & Emotes, Social & Friends, Passport, Encyclopedia, Food Bag & Stall, Events, Avatar Customizer, Help, Settings) is reachable within 1–2 clicks/taps from the single dock row (`hud-action-dock`). Opening any panel pauses camera mouse-look (unlocking the cursor just like Settings), and on mobile viewports no panel covers more than ~60% of the screen (`max-h-[60vh]`).

**Why this priority**: Ensures all gameplay features remain accessible within 2 clicks/taps with clean camera/cursor ergonomics on both desktop and mobile.

**Independent Test**: Open any dock panel (`Chat`, `Passport`, `Encyclopedia`, `Food Bag`, `Events`, `Social`, `Help`, `Settings`) and verify `isCursorRevealed` becomes `true`, camera mouse-look is paused, and the panel container has `max-h-[60vh]` on mobile.

**Acceptance Scenarios**:

1. **Given** free-look camera mode in `playing` phase, **When** the player opens any panel from `hud-action-dock`, **Then** `isCursorRevealed` becomes `true` and dragging the mouse does not orbit the 3D camera until the panel is closed.
2. **Given** a mobile viewport (`390x844`), **When** any panel/drawer is opened alongside touch controls, **Then** the panel covers at most 60% of the phone screen height (`max-h-[60vh]`).

---

### User Story 3 - Animal & Debug Info Hidden by Default Behind Dev Toggle (Priority: P2)

Animal behavior/debug tags (3D overhead animal debug labels, `animal-status-strip`, and `hud-secondary-details-strip` diagnostic badges) are hidden by default and only appear when the Dev/Debug toggle (`hud-dev-debug-toggle-btn` or key `H`) is enabled.

**Why this priority**: Keeps the 3D world immersive by default while preserving full diagnostic visibility for developers and E2E verification.

**Independent Test**: Verify `isDevDebugOpen` defaults to `false` (hiding `hud-secondary-details-strip`, `animal-status-strip`, and 3D animal debug tags) and toggling `hud-dev-debug-toggle-btn` reveals them.

**Acceptance Scenarios**:

1. **Given** a default session, **When** `isDevDebugOpen` is `false`, **Then** `hud-secondary-details-strip`, `animal-status-strip`, and 3D animal debug text are hidden.
2. **Given** the player clicks `hud-dev-debug-toggle-btn` in the dock, **When** `isDevDebugOpen` becomes `true`, **Then** diagnostic badges and animal status info are rendered.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All changes MUST be restricted to `packages/ui`, `packages/game-core` client state, `packages/game-client` animal debug tag visibility, and `apps/web` E2E tests — zero protocol or `apps/server` changes.
- **FR-002**: Persistent on-screen HUD elements MUST be limited to:
  1. Player name + avatar chip (`local-visitor-badge` / `open-avatar-customizer-btn`)
  2. Current zone name (`hud-zone-badge`)
  3. Contextual interact prompt (`interaction-prompt-banner`, only when near an interactable object)
  4. Overhead 3D proximity chat bubbles
  5. ONE compact dock/icon row (`hud-action-dock`) for everything else
- **FR-003**: The permanent desktop controls hint bar MUST be removed; controls reference MUST live only in the dismissible first-join overlay (`onboarding-guide-modal`) and the Help panel (`help-beta-modal`).
- **FR-004**: Animal/debug info text (`hud-secondary-details-strip`, `animal-status-strip`, and 3D animal debug tags in `ZooAnimalsLayer.tsx`) MUST be hidden by default and shown only when the dev toggle (`isDevDebugOpen` / `isHudCompact === false`) is enabled.
- **FR-005**: Opening any panel/modal from the dock MUST pause camera mouse-look and reveal the cursor (`isCursorRevealed = true`), and closing the active panel MUST restore camera look when no other panel is open.
- **FR-006**: Every panel/modal MUST cap its mobile height at `max-h-[60vh]` (`max-h-[60vh] sm:max-h-[80vh]`) so no panel covers more than ~60% of a phone screen, maintaining full parity with touch controls.
- **FR-007**: All existing features MUST remain reachable within at most 2 clicks/taps from the main HUD, and E2E tests MUST be updated to reflect the decluttered HUD and dev toggle.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a fresh join, only the top-left player/zone chip, the single bottom-right dock row (`hud-action-dock`), and the dismissible first-join overlay (`onboarding-guide-modal`) are visible.
- **SC-002**: Opening any dock panel pauses mouse-look (`isCursorRevealed === true`) and every panel is constrained to `<= 60vh` on mobile screens.
- **SC-003**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E tests pass with zero errors.

