# Feature Specification: Pre-Game Main Menu (`main-menu`)

**Feature Branch**: `fix/main-menu`
**Created**: 2026-11-05
**Status**: Approved

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Profile Block: Display Name & Avatar Customizer Before Canvas Mounts (Priority: P1)

Before entering the 3D zoo world or mounting the WebGL canvas, players land on a pre-game Main Menu in `apps/web`. The **PROFILE** block allows editing the display name (validated with `validateDisplayName`), viewing an avatar preview badge, and opening the existing `AvatarCustomizerModal`, persisting changes via `identityPersistence`. The old in-flow name/identity prompt inside `EntryLoadingScreen` is removed so identity comes exclusively from the Main Menu.

**Independent Test**: Load `/` in a browser; verify the Main Menu renders before the 3D canvas mounts, displays the PROFILE block with display name input and avatar preview/customizer button, validates invalid display names with a designed `name rejected` error state, and saves valid profiles to `localStorage`.

**Acceptance Scenarios**:

1. **Given** a player visits `/`, **When** the page loads, **Then** the pre-game Main Menu is displayed and the 3D WebGL canvas is NOT yet mounted.
2. **Given** the player enters an invalid or blocked display name and clicks **PLAY**, **Then** the Main Menu prevents entry and shows a clear `name rejected` failure banner (`data-testid="menu-error-name-rejected"`).
3. **Given** the player opens the avatar customizer from the Main Menu and saves changes, **When** they click **PLAY**, **Then** they join the selected zone with their customized display name and avatar appearance.

---

### User Story 2 — Server/Zone Block, First-Time vs Returning Zone Rules & Shared Room Links (Priority: P1)

The **SERVER/ZONE** block polls `apps/server`'s `/occupancy` HTTP endpoint (derived from `NEXT_PUBLIC_WS_URL`) and displays the live zone list (`Zoo Lobby` and `Panda Forest`) with zone names, player counts, and capacity status. `Zoo Lobby` is the default selection. First-time players may only start at `Zoo Lobby` (other zones are locked until the player has joined at least once); returning players may pick any zone. A shared room link (`?room=...`) pre-selects the matching room/zone for returning players (or pre-fills the room while keeping first-time players at `Zoo Lobby` unless they are returning or using an explicit custom room) and still requires clicking **PLAY** before mounting the canvas.

**Independent Test**: Verify the Main Menu fetches `/occupancy` from `apps/server`, defaults to `Zoo Lobby`, restricts first-time visitors to `Zoo Lobby`, allows returning visitors to select `Panda Forest`, and respects `?room=...` pre-selection while still passing through the **PLAY** button.

**Acceptance Scenarios**:

1. **Given** a first-time player loads `/`, **When** viewing the SERVER/ZONE block, **Then** `Zoo Lobby` is selected by default and `Panda Forest` is marked as locked for first-time visitors.
2. **Given** a returning player loads `/`, **When** viewing the SERVER/ZONE block, **Then** they can select either `Zoo Lobby` or `Panda Forest` and see live player counts from `/occupancy`.
3. **Given** a player opens `/?room=e2e-multiplayer-room`, **When** the page loads, **Then** the Main Menu still renders first with that target room pre-selected, and clicking **PLAY** joins that room and mounts the canvas.

---

### User Story 3 — Shared Settings & Designed Failure States (Priority: P1)

Settings (`SettingsMenuModal`) are reachable from the Main Menu as well as in-game (`ESC` or HUD button), sharing the same `gameStore` settings state. Because `apps/web` is hosted separately from `apps/server`, `server unreachable` is a normal condition: the Main Menu must render designed failure states (never a blank screen) for **server unreachable**, **room full**, and **name rejected**, with clear retry/recovery actions.

**Independent Test**: Simulate an unreachable `/occupancy` endpoint, a full target room, and a rejected display name; verify each displays its designed failure state on the Main Menu and never crashes or renders a blank screen.

**Acceptance Scenarios**:

1. **Given** `apps/server` is unreachable when the Main Menu polls `/occupancy` or when clicking **PLAY**, **When** the request fails, **Then** the Main Menu displays the `server unreachable` failure state (`data-testid="menu-error-server-unreachable"`) with a Retry action and never renders a blank screen.
2. **Given** the selected zone/room is at capacity (`isFull: true`), **When** the player attempts to join via **PLAY**, **Then** the Main Menu displays the `room full` failure state (`data-testid="menu-error-room-full"`).
3. **Given** the player opens Settings from the Main Menu and toggles audio mute or quality tier, **When** they enter the game and open Settings in-game, **Then** the same settings state is reflected.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `apps/web` MUST render a pre-game Main Menu before mounting the 3D WebGL canvas (`DynamicZooGameCanvas`).
- **FR-002**: The Main Menu MUST include a **PROFILE** block with a display name input (validated via `validateDisplayName`), an avatar preview, and a button to open `AvatarCustomizerModal`, persisted via `identityPersistence`.
- **FR-003**: The old in-flow name/identity prompt MUST be removed from `EntryLoadingScreen`; player identity comes only from the Main Menu.
- **FR-004**: The Main Menu MUST include a **SERVER/ZONE** block showing a live list from `apps/server`'s `/occupancy` endpoint (zone display name, player count, capacity). `Zoo Lobby` (`'zoo-lobby'`) MUST be the default selection.
- **FR-005**: First-time players MUST start at `Zoo Lobby` only; returning players (`isReturningVisitor`) MAY pick any zone.
- **FR-006**: A shared room link (`?room=...`) MAY pre-select a room/zone on the Main Menu, but MUST still pass through the **PLAY** button before mounting the canvas.
- **FR-007**: Clicking **PLAY** MUST validate the display name, verify server/room availability, join the selected zone/room via `NEXT_PUBLIC_WS_URL`, and mount the 3D canvas.
- **FR-008**: Settings (`SettingsMenuModal`) MUST be reachable from the Main Menu as well as in-game, sharing the same `gameStore` settings state.
- **FR-009**: The Main Menu MUST provide designed failure states (never a blank screen) for:
  - **Server Unreachable** (`data-testid="menu-error-server-unreachable"`)
  - **Room Full** (`data-testid="menu-error-room-full"`)
  - **Name Rejected** (`data-testid="menu-error-name-rejected"`)
- **FR-010**: E2E tests MUST be updated to the new Main Menu entry path and verify two browser windows join and see each other move.

## Success Criteria *(mandatory)*

- **SC-001**: The 3D canvas does not mount until the user clicks **PLAY** (`data-testid="enter-world-btn"` / `data-testid="main-menu-play-btn"`).
- **SC-002**: Live occupancy data (`zones`, `totalPlayers`) is fetched from `apps/server`'s `/occupancy` HTTP endpoint derived from `NEXT_PUBLIC_WS_URL`.
- **SC-003**: Server-unreachable, room-full, and name-rejected failure states render structured, accessible UI cards with zero unhandled exceptions or blank screens.
- **SC-004**: All unit tests, typechecks, lint checks, and Playwright E2E tests (including two browser windows joining and seeing each other move) pass.

