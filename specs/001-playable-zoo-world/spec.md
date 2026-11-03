# Feature Specification: Playable Zoo World

**Feature Branch**: `001-playable-zoo-world`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Create Feature 001: Playable Zoo World for Online Zoo. Build the first playable 3D environment of Online Zoo. The goal is to establish the core exploration experience before introducing multiplayer and complex gameplay systems. A player must be able to enter a stylized virtual zoo, control an avatar, explore the environment, and interact with basic environmental objects."

## Clarifications

### Session 2026-11-04

- Q: How should the player rotate the camera using the mouse on desktop browsers? (FR-012) → A: Non-trapping Left/Right mouse-button drag orbit (`LMB`/`RMB` drag on the 3D canvas) plus keyboard camera orbit (`Q`/`R`) and optional free-look mode, so single left-clicks never hijack the cursor with browser Pointer Lock or block HUD/3D object clicks; holding `Alt` explicitly pauses camera orbit for cursor interaction, `ESC` opens the game menu, and strict DOM text-selection/drag suppression (`user-select: none`, `selectstart`, `dragstart`, `contextmenu`) prevents accidental text selection.
- Q: Which types of interactive objects and feedback should be included in the Panda Forest? (FR-018) → A: Mixed archetypes — include both readable habitat info plaques (opening a brief UI info card) and interactive world props (triggering 3D visual/state responses such as toggling a lantern, ringing a bamboo chime, or resting on a bench).
- Q: Should the Panda Forest include stationary/looping scenic pandas in the habitat or only landscape and decorative props? (FR-001) → A: Landscape and props only — include bamboo, trees, rocks, pond, walking paths, and decorative structures; defer all animal models to a future feature.
- Q: How should mobile players switch between walking and running when using touch controls? (FR-013) → A: Dedicated Run button only — the virtual joystick controls movement direction at walking speed, and holding/toggling an on-screen Run button switches to running; touch camera regions must never block desktop mouse clicks.
- Q: How should the pond in the Panda Forest behave when the player walks or jumps toward the water? (FR-002) → A: Blocked shoreline — the pond edge acts as a solid boundary (rocks, curb, or shoreline collider) preventing the avatar from entering the water.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter and Explore the Panda Forest on Desktop (Priority: P1)

A player opens Online Zoo in a desktop browser, transitions from an entry/loading screen into a stylized 3D Panda Forest environment, and explores the zone using a third-person avatar. The player walks and runs along pathways bordered by bamboo vegetation, rocks, trees, a pond, and decorative elements, rotates and zooms the camera around the avatar, jumps over low terrain variations, and is prevented from walking or clipping the camera through solid obstacles or world boundaries.

**Why this priority**: Core 3D world entry, third-person locomotion, collision enforcement, and camera control form the foundational playable experience upon which all other controls, interactions, and future game systems depend.

**Independent Test**: Launch the application in a desktop browser, click the entry action once loading finishes, and verify that the avatar moves in all four directions via `WASD`, faces its movement direction, runs with `Shift`, jumps with `Space`, orbits/zooms smoothly with the mouse without clipping through trees or rocks, and is blocked by solid obstacles and outer boundaries.

**Acceptance Scenarios**:

1. **Given** the player opens the game in a supported desktop browser, **When** world assets finish loading and the player selects the action to enter the zoo, **Then** the entry screen transitions into the playable Panda Forest with the player's avatar positioned at a valid spawn point on a walking path.
2. **Given** the player is standing in the Panda Forest, **When** the player presses `W`, `A`, `S`, or `D` (individually or in diagonal combinations), **Then** the avatar smoothly translates in the corresponding camera-relative direction, rotates to face the direction of movement, and transitions from the idle animation state to the walking state.
3. **Given** the player is moving with `WASD`, **When** the player holds `Shift`, **Then** the avatar's movement speed increases to the running pace and the avatar displays the running animation state until `Shift` or movement input is released.
4. **Given** the player is grounded on a walkable surface, **When** the player presses `Space`, **Then** the avatar performs a jump arc, displays the jumping state while airborne, and returns to the appropriate grounded state (`Idle`, `Walking`, or `Running`) upon landing.
5. **Given** the player is in active gameplay on desktop, **When** the player moves the mouse (in Pointer Lock free-look mode or via left/right mouse-button drag when unlocked), uses the scroll input to adjust zoom, left-clicks the viewport, or holds `Alt`, **Then** the third-person follow camera orbits 360 degrees horizontally and adjusts vertical pitch smoothly without selecting any on-screen HUD text, zooms between minimum and maximum viewing distances, temporarily reveals the cursor while `Alt` is held, and cleanly restores active camera control when `Alt` is released, a modal is closed, or the canvas is clicked.
6. **Given** the player walks or jumps toward a solid environmental object (rock, tree, bamboo cluster, pond barrier, or perimeter boundary) or rotates the camera behind an obstacle, **When** contact occurs, **Then** the avatar is prevented from passing through the solid geometry and the camera pulls forward in front of the obstruction so it never clips inside objects.

---

### User Story 2 - Explore the Panda Forest on Mobile Touch Devices (Priority: P2)

A player opens Online Zoo in a mobile browser and explores the Panda Forest using touch controls. The player steers the avatar in any direction using an on-screen virtual joystick, switches between walking and running using a dedicated on-screen Run button, rotates and zooms the follow camera using touch-and-drag gestures, and triggers jumping and interactions using touch-friendly on-screen action buttons.

**Why this priority**: Desktop and mobile browsers are both first-class platforms under the project constitution; touch controls and mobile playability must be validated alongside desktop exploration rather than retrofitted later.

**Independent Test**: Open the game on a touchscreen device or mobile viewport, enter the world, use the virtual joystick to walk in 360 degrees, use the on-screen Run button while moving to run, drag on the viewport to orbit the camera 360 degrees, and tap the on-screen Jump button to jump while maintaining responsive frame pacing.

**Acceptance Scenarios**:

1. **Given** the player opens the game on a touch-capable mobile browser and enters the Panda Forest, **When** the gameplay view renders, **Then** a touch-friendly virtual joystick and responsive action buttons (Run, Jump, Interact, Menu) are displayed without obstructing the center view of the avatar.
2. **Given** the player touches and drags the virtual joystick in any direction, **When** the drag is held alone or combined with the on-screen Run button, **Then** the avatar faces the chosen camera-relative direction and walks by default, or runs when the Run button is active.
3. **Given** the player touches and drags on the camera control region of the screen, **When** the player drags horizontally or vertically, **Then** the third-person follow camera smoothly rotates 360 degrees horizontally and adjusts vertical pitch around the avatar while respecting obstacle collision.
4. **Given** the player is exploring on a mobile browser, **When** the player taps the on-screen Jump button while grounded, **Then** the avatar immediately executes a jump identical in behavior to the desktop `Space` control.

---

### User Story 3 - Interact with Environmental Objects (Priority: P3)

While exploring the Panda Forest, a player approaches interactive objects placed around the environment (such as habitat information plaques, scenic viewpoints, resting benches, or decorative chimes). When the player enters an object's interaction range, a contextual prompt appears indicating the object and how to interact. Triggering the interaction displays clear visual and UI feedback.

**Why this priority**: Contextual interaction transforms the environment from a passive 3D scene into an interactive game world and establishes the reusable interaction framework required for future zoo gameplay features.

**Independent Test**: Walk the avatar within proximity of an interactive object in the Panda Forest, verify the contextual prompt appears, trigger the interaction via keyboard or touch button, verify the feedback response is shown, and walk away to confirm the prompt disappears.

**Acceptance Scenarios**:

1. **Given** the player is exploring the Panda Forest, **When** the avatar moves within the interaction radius of an interactive object, **Then** the system detects the object and displays a clear contextual prompt indicating the object's name/action and the input required to interact (keyboard key on desktop or tap button on mobile).
2. **Given** a contextual interaction prompt is visible for a nearby object, **When** the player activates the interaction input, **Then** the object executes its interaction behavior and presents immediate visual and/or HUD feedback (such as displaying an informational plaque overlay or triggering an environmental animation/effect).
3. **Given** a contextual interaction prompt or feedback state is active, **When** the player walks outside the object's interaction radius or dismisses the interaction, **Then** the contextual prompt and active interaction state close cleanly.

---

### User Story 4 - Navigate Entry Flow, HUD, and Settings Menu (Priority: P4)

A player experiences a complete session flow starting from an initial entry/loading screen, viewing a minimal non-intrusive HUD during exploration, and opening the in-game settings menu (`ESC` on desktop or Menu button on mobile) to adjust basic preferences (such as camera sensitivity or audio mute) before returning to the world.

**Why this priority**: A cohesive session loop (loading screen, minimal HUD, and accessible settings menu) makes the vertical slice feel like a complete playable game experience rather than an isolated tech demo.

**Independent Test**: Load the game, observe loading progress and entry prompt, inspect the minimal HUD once in-world, press `ESC` (or tap the Menu button) to open the settings menu, modify camera sensitivity, close the menu, and verify the updated sensitivity immediately affects camera rotation.

**Acceptance Scenarios**:

1. **Given** the player navigates to the game URL, **When** the world assets are loading, **Then** an entry/loading screen displays loading status and provides a clear action to enter the Panda Forest once ready.
2. **Given** the player is actively exploring the Panda Forest, **When** no menus are open, **Then** a minimal HUD displays essential session controls/status and feedback for movement and nearby interactions without cluttering the 3D viewport.
3. **Given** the player is in the game world, **When** the player presses `ESC` on desktop or taps the Menu button on mobile, **Then** the game menu opens with basic settings (including camera rotation sensitivity and audio mute/volume controls), pausing direct movement input until the player resumes gameplay.

---

### Edge Cases

- **Solid Obstacle & Boundary Collisions**: When the player walks, runs, or jumps into rocks, trees, bamboo clusters, the pond water boundary, or the outer perimeter fence, the avatar slides smoothly along the obstacle surface without penetrating geometry, jittering, or getting permanently wedged.
- **Camera Obstruction & Tight Spaces**: When the player backs up against a large rock, tree trunk, or boundary wall and rotates the camera between the avatar and the obstacle, the camera dynamically shortens its follow distance in front of the collider so the camera never clips inside or sees behind solid geometry, and smoothly restores the user's target zoom distance once clear.
- **Overlapping Interactive Objects**: When the avatar stands within the interaction radius of two or more interactive objects at the same time, only the single closest valid interactive object (prioritized by distance and avatar/camera facing angle) displays an active prompt and receives the interaction action.
- **Mid-Air & Repeated Inputs**: Pressing the Jump input repeatedly while already airborne does not cause double-jumping or air-hovering; holding or releasing Run (`Shift`) while airborne transitions cleanly upon landing.
- **Window Focus Loss, Browser Gestures & Viewport Changes**: If the browser tab loses focus, the window is resized, or a mobile device rotates between landscape and portrait while movement keys or touch gestures are held, active movement inputs are safely cleared so the avatar returns to the `Idle` state rather than running endlessly; left-clicking or dragging never triggers native DOM text selection (`user-select: none` / `selectstart` / `dragstart`), right-clicking on the canvas suppresses the browser context menu, and clicking HUD buttons blurs button focus so pressing `Space` to jump never accidentally re-activates a HUD button.

## Requirements *(mandatory)*

### Functional Requirements

#### Game Environment (Panda Forest)
- **FR-001**: The system MUST provide a playable 3D Panda Forest environment featuring walking paths, bamboo vegetation, rocks, trees, a pond, and environmental decorations rendered in a consistent stylized visual direction (landscape and decorative props only; animal models are deferred to a future feature).
- **FR-002**: The environment MUST define clear walkable areas and solid boundaries—including both the outer perimeter and a blocked pond shoreline (rocks, curb, or shoreline collider)—that prevent the player avatar from leaving the playable zone or entering the pond water.
- **FR-003**: All solid environmental props (trees, rocks, dense bamboo clusters, fences, and decorative structures) MUST enforce physical collision boundaries so the player avatar cannot walk or jump through them.

#### Player Character & Locomotion
- **FR-004**: The system MUST render a single playable third-person avatar at a designated spawn point upon entering the Panda Forest.
- **FR-005**: The avatar MUST support four distinct visual and behavioral locomotion states: `Idle`, `Walking`, `Running`, and `Jumping`, with smooth transitions between states.
- **FR-006**: When moving in any horizontal direction, the avatar MUST smoothly rotate to face the active direction of movement relative to the current camera heading.
- **FR-007**: Movement acceleration, deceleration, and turning MUST respond within the next rendered frame to provide smooth, responsive control without noticeable input lag.

#### Third-Person Follow Camera
- **FR-008**: The system MUST provide a third-person follow camera that tracks the player avatar and maintains a comfortable, unobstructed view of the character.
- **FR-009**: The follow camera MUST support continuous 360-degree horizontal orbit rotation around the avatar and bounded vertical pitch rotation (preventing camera flip at zenith or nadir).
- **FR-010**: Players MUST be able to adjust the camera zoom distance smoothly between defined minimum and maximum distances from the avatar.
- **FR-011**: The camera system MUST detect environmental geometry between the avatar and the camera's target position and automatically pull the camera forward in front of obstacles to prevent clipping through objects or terrain.

#### Desktop & Mobile Controls
- **FR-012**: On desktop browsers, the system MUST support `WASD`/Arrow keys for directional movement, smooth non-trapping mouse-drag camera rotation (`LMB`/`RMB` drag on the 3D viewport plus `Q`/`R` keyboard orbit and optional Pointer Lock free-look without hijacking single left-clicks), holding `Alt` to pause camera orbit and display cursor status (ignoring key auto-repeat), mouse scroll for camera zoom, `Shift` to run, `Space` to jump (without triggering focused HUD buttons), an interaction trigger (`E`/`F`, clicking the prompt banner, or clicking the 3D interactive prop directly when in range), `ESC` to open/close the game menu, and global suppression of accidental DOM text selection (`user-select: none`, `selectstart`, `dragstart`, `contextmenu`).
- **FR-013**: On mobile and touch-enabled browsers, the system MUST display a virtual joystick for 360-degree directional movement at walking speed, a dedicated on-screen Run button (hold or toggle) to switch to running speed, a touch-and-drag area for camera rotation and pinch/slider zoom that never blocks desktop mouse events, and responsive touch action buttons for Jump, Interact, and Menu.
- **FR-014**: Desktop and mobile inputs MUST drive character locomotion, camera control, and interactions through a unified input abstraction so gameplay behavior is consistent across input devices.

#### Environment Interaction
- **FR-015**: The Panda Forest MUST include at least 3 interactive environmental objects distributed along the exploration paths, covering both readable habitat information plaques and interactive world props (such as a toggleable lantern, bamboo wind chime, or resting bench).
- **FR-016**: The system MUST continuously detect when the player avatar enters or exits the interaction range of interactive objects and select a single primary target when multiple objects are nearby.
- **FR-017**: When an interactive object is targeted within range, the system MUST display a contextual interaction prompt showing the object's label and the device-appropriate activation control.
- **FR-018**: Activating an interaction MUST trigger archetype-appropriate feedback—opening a concise UI info card for information plaques or triggering a 3D visual/animation state response for world props—through a reusable interaction contract that can support future object types without modifying core player locomotion logic.

#### Game Experience, HUD & Settings
- **FR-019**: The application MUST present an entry/loading screen upon startup that displays asset loading progress and allows the player to enter the game world once the environment is ready.
- **FR-020**: During active gameplay, the system MUST display a minimal, non-selectable (`user-select: none`) HUD providing unobtrusive control guidance and clear visual feedback for movement states and active interactions.
- **FR-021**: The system MUST provide an in-game menu accessible via `ESC` (desktop) or the Menu touch button (mobile) containing a basic settings interface where players can adjust at least camera rotation sensitivity and audio mute/volume, as well as view control instructions and resume gameplay.
- **FR-022**: The game MUST operate as a complete standalone single-player exploration experience in the browser without requiring network multiplayer connectivity, user accounts, or authentication.
- **FR-023**: The repository MUST include documented instructions enabling a developer or tester to install dependencies, build, and run the application locally.

### Key Entities

- **Panda Forest Zone**: The bounded 3D playable environment comprising walkable terrain paths, decorative foliage (bamboo, trees), solid obstacles (rocks, barriers, pond edge), ambient lighting, a player spawn transform, and placed interactive objects.
- **Player Avatar**: The controllable third-person character characterized by 3D world position, velocity, facing rotation, grounded status, and active locomotion state (`Idle`, `Walking`, `Running`, `Jumping`).
- **Follow Camera**: The orbital camera entity tracking the Player Avatar, defined by yaw angle (0–360°), clamped pitch angle, desired zoom distance, actual collision-adjusted distance, and rotation sensitivity setting.
- **Interactive Object**: A world object registered with the interaction system, defined by a world position, detection radius, display title/prompt text, interaction handler type, and active/cooldown state.
- **User Settings State**: Client-side preferences configurable in the settings menu (camera sensitivity multiplier, camera Y-axis inversion toggle, audio mute/volume level, and control hints visibility).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The game loads from initial navigation to an interactive "Enter World" ready state in under 10 seconds on a standard broadband connection in supported desktop and mobile browsers.
- **SC-002**: A player can move the avatar in all four cardinal and four diagonal directions using `WASD` on desktop or the virtual joystick on mobile, with the avatar visibly rotating to face the movement direction within 0.3 seconds of input change.
- **SC-003**: A player can smoothly transition between `Idle`, `Walking`, `Running`, and `Jumping` states with 100% reliability across 20 consecutive state transitions on both desktop and mobile controls.
- **SC-004**: The follow camera completes a full 360-degree horizontal rotation and full zoom range adjustment smoothly, and in 100% of test positions adjacent to trees, rocks, and perimeter walls, prevents the camera viewport from clipping inside solid geometry.
- **SC-005**: In collision walkthrough tests against all major environmental obstacle types (rocks, trees, bamboo clusters, pond boundary, and perimeter fence), the avatar is blocked from passing through solid objects 100% of the time without getting stuck.
- **SC-006**: Approaching within range of any interactive object displays a contextual prompt within 0.2 seconds, and triggering the interaction produces visible feedback 100% of the time.
- **SC-007**: The game maintains a smooth playable frame rate (targeting 60 FPS on desktop browsers and at least 30 FPS on modern mobile browsers) during continuous movement and camera rotation in the Panda Forest.
- **SC-008**: A tester following the documented setup and run instructions can build and launch the playable world locally in 3 steps or fewer without requiring any external multiplayer or authentication service credentials.

## Out of Scope

- Multiplayer networking or concurrent player synchronization.
- User authentication, login flows, or account registration.
- Persistent player profiles or avatar customization.
- Friends lists or social graph features.
- Text or voice chat systems.
- Autonomous Animal AI, creature behavior loops, or 3D animal models in the habitat.
- Virtual currency, economy, or shops.
- Player inventory systems.
- Food purchasing or animal feeding mechanics.
- Quests, experience points, or progression systems.

## Assumptions

- **Supported Browsers**: "Supported desktop and mobile browsers" refers to current evergreen releases of Chrome, Edge, Firefox, and Safari on desktop (Windows, macOS) and mobile Chrome (Android) and Mobile Safari (iOS) with hardware-accelerated 3D graphics enabled.
- **Single Avatar Appearance**: A single stylized default player avatar model with idle, walk, run, and jump animations is sufficient for Feature 001; character selection or customization is deferred to future features.
- **Basic Interaction Archetypes**: Interactive objects in Feature 001 focus on environmental exploration feedback (such as reading Panda Forest habitat plaques, triggering a scenic vista camera/notification, or activating a decorative prop) rather than inventory or economy transactions.
- **Local Settings Persistence**: Settings adjusted in the in-game menu (such as camera sensitivity and audio mute) are retained locally in the browser for the user's device and do not require cloud/account synchronization.
- **Desktop Keyboard Interaction Key**: While the prompt specifies `WASD`, `Shift`, `Space`, Mouse, and `ESC`, a standard primary interaction trigger (`E` key and/or clicking the prompt) is assumed on desktop to pair with the mobile interaction touch button.

