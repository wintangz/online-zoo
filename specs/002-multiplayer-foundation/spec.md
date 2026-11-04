# Feature Specification: Multiplayer Foundation

**Feature Branch**: `002-multiplayer-foundation`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Create the specification for Feature 002: Multiplayer Foundation. Allow multiple players to enter the same zoo instance and see one another moving and interacting with the world in real time. The multiplayer experience must feel responsive and consistent, while remaining reliable under temporary network interruptions."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Enter a Shared Zoo Instance and Observe Visitors Joining and Leaving (Priority: P1)

A player enters the Panda Forest zoo instance from a desktop or mobile browser, is assigned a unique session identity and a valid spawn position on the entry plaza, and immediately sees any other players already exploring the same instance. When new visitors join the instance, their avatars appear at valid spawn positions; when visitors leave or disconnect, their avatars are cleanly removed from the visible world without disrupting remaining players.

**Why this priority**: Shared instance presence, unique session identification, and reliable join/leave lifecycle management are the prerequisite foundation upon which all real-time movement synchronization and social zoo experiences depend.

**Independent Test**: Open two or more browser sessions, enter the Panda Forest in the first session, then enter from the second session; verify that both sessions display each other's avatars with distinct visitor labels, and verify that closing or leaving from one session removes that avatar from the remaining session without errors.

**Acceptance Scenarios**:

1. **Given** a player enters the Panda Forest when no other players are present, **When** the session connects to the zoo instance, **Then** the player is assigned a unique session identity, spawns at a valid spawn location, and sees the active visitor count as `1`.
2. **Given** one or more players are already exploring a zoo instance, **When** a new player enters the same instance, **Then** the newly joined player immediately sees all existing players at their current world positions and locomotion states, and all existing players see the new player's avatar appear at a valid spawn location.
3. **Given** multiple players are inside the same zoo instance, **When** one player closes their browser tab, leaves the session, or times out after an unrecoverable disconnection, **Then** that player's avatar is removed from the visible world of all remaining players and the active visitor count updates accurately without interrupting anyone else's gameplay.

---

### User Story 2 - Real-Time Synchronized Avatar Movement and Animations (Priority: P2)

As players walk, run, jump, and turn across the Panda Forest on desktop or mobile devices, their movements and locomotion states (`Idle`, `Walking`, `Running`, `Jumping`) are broadcast and rendered in near real time across all connected sessions in the same instance. Remote avatars move smoothly via interpolation rather than continuously teleporting between network updates, while each player's own avatar remains immediately responsive to local controls.

**Why this priority**: Seeing other visitors move fluidly and expressively in real time transforms the single-player 3D environment into a living shared social space.

**Independent Test**: Place two browser sessions side by side in the same zoo instance; walk, run, turn in 360 degrees, and jump in Session A while observing Session B, verifying that Session B renders Session A's position, facing direction, and locomotion animations (`Idle`, `Walking`, `Running`, `Jumping`) smoothly and accurately.

**Acceptance Scenarios**:

1. **Given** two or more players are in the same zoo instance, **When** Player A walks or runs in any direction or rotates their facing angle, **Then** Player B sees Player A's avatar smoothly translate and rotate to match the movement in near real time rather than stepping or teleporting abruptly.
2. **Given** two or more players are in the same zoo instance, **When** Player A transitions between `Idle`, `Walking`, `Running`, and `Jumping` states, **Then** Player B sees Player A's remote avatar display the matching locomotion animation state.
3. **Given** a player is moving their own avatar while connected to a multiplayer instance, **When** network updates are being sent and received, **Then** the local player's movement and camera controls respond on the very next frame without waiting for a network round-trip.
4. **Given** two players are in the same zoo instance, **When** one player triggers a shared world prop interaction (such as toggling the stone garden lantern or ringing the bamboo wind chime), **Then** the updated world prop state is reflected across connected sessions in the instance.

---

### User Story 3 - Authoritative Movement Validation and Transient State Separation (Priority: P3)

To maintain a fair and consistent shared world for all visitors, the zoo instance validates all incoming player movement and state updates before broadcasting them to other players. Invalid, malformed, or impossible updates (such as moving faster than maximum running speed, teleporting across the map, walking through solid obstacles or into the blocked pond, or moving outside perimeter boundaries) are rejected or clamped to valid positions, and high-frequency movement updates are kept strictly in transient instance memory rather than written to permanent storage.

**Why this priority**: Constitution Principle III (Multiplayer Correctness) mandates that the shared instance never blindly trust client-provided positions or states and that transient movement state remain separated from persistent data.

**Independent Test**: Submit out-of-bounds coordinates, obstacle-intersecting positions, or excessive velocity updates from a client session and verify that the instance clamps or rejects the invalid state, reconciles the client to a valid world position, and never broadcasts impossible coordinates to other connected players.

**Acceptance Scenarios**:

1. **Given** a connected client sends a position update outside the playable perimeter, inside the blocked pond shoreline, or penetrating a solid environmental obstacle, **When** the instance processes the update, **Then** the instance clamps or rejects the invalid position and broadcasts only the valid resolved position to all players.
2. **Given** a connected client sends a movement update that exceeds the maximum allowed displacement for the elapsed time window (e.g., attempted speed hack or teleportation), **When** the instance validates the transition, **Then** the instance bounds the movement to the maximum legal speed and reconciles the client's authoritative position.
3. **Given** multiple players are continuously moving at full update frequency inside an instance, **When** session state is processed over time, **Then** high-frequency position, rotation, and animation updates are held only in transient in-memory instance state and are never persisted as permanent player records.

---

### User Story 4 - Connection Status Feedback and Graceful Disconnection Recovery (Priority: P4)

While exploring the zoo, players can view their current multiplayer connection status (`Connecting`, `Connected`, `Reconnecting`, `Disconnected`) and active visitor count in the HUD. If a player's network connection drops temporarily, the game displays clear, understandable status feedback and automatically attempts to reconnect and restore the player into the active zoo instance. If automatic recovery fails or times out, the player can trigger a manual reconnect action from the UI without having to reload or restart the entire browser application.

**Why this priority**: Network interruptions are common on desktop Wi-Fi and mobile connections; automatic recovery and in-app reconnection keep the experience seamless and prevent frustrating full-page reloads.

**Independent Test**: Connect a player session to the zoo instance, simulate a temporary network drop, verify that the HUD transitions to a `"Reconnecting..."` indicator without crashing the 3D scene, restore network connectivity, and verify that the session automatically rejoins the instance and resumes synchronizing remote players without a page refresh.

**Acceptance Scenarios**:

1. **Given** a player enters the zoo or experiences a connection state change, **When** the connection is establishing, active, recovering, or lost, **Then** the HUD displays an accurate, non-intrusive connection status indicator and the current number of visitors in the instance.
2. **Given** a player is actively exploring the zoo instance, **When** a temporary network interruption occurs, **Then** the game remains stable, notifies the player that reconnection is in progress, and automatically re-establishes the session and resynchronizes world state once connectivity returns within the recovery window.
3. **Given** automatic reconnection attempts have been exhausted after an extended network outage, **When** the player selects the in-game `"Reconnect"` action after connectivity returns, **Then** the game establishes a fresh session in the zoo instance and spawns the player back into the world without requiring a full browser page reload.

---

### Edge Cases

- **Simultaneous Spawning & Spawn Overlap**: When multiple players join the zoo instance at the exact same moment, each player is assigned a deterministic or slightly offset spawn position within the safe spawn plaza (`radius: 2.5m` around `[0, 0.1, 18]`) so avatars do not stack identically on the exact same coordinate.
- **Joining Mid-Motion or Mid-Jump**: When a new player joins an already populated instance while existing players are mid-run or airborne, the initial state snapshot immediately places existing avatars at their current authoritative positions and locomotion states so no avatar briefly flashes at the origin `[0, 0, 0]`.
- **Packet Jitter, Out-of-Order Updates & Frame Rate Differences**: If network updates arrive with variable latency or out of sequence, stale/older sequence updates are discarded and remote avatar interpolation smoothly bridges brief gaps (`<= 250ms`) without rubber-banding backward or freezing animations.
- **Abrupt Browser Closure / Unclean Disconnect**: If a remote player's browser crashes or loses power without sending an explicit leave message, the instance detects inactivity via heartbeat/timeout and removes the stale avatar within a bounded grace period so ghost avatars do not linger indefinitely.
- **Instance Capacity Full**: If a zoo instance reaches its maximum concurrent visitor capacity, additional joining players are either placed into a new overflow instance or shown a clear notification rather than crashing or corrupting the active instance.
- **Tab Backgrounding During Multiplayer**: When a connected player switches browser tabs or minimizes the window on desktop or mobile, their active movement input is immediately zeroed so their avatar transitions to `Idle` for all other players rather than running in place or drifting across the map.

## Clarifications

### Session 2026-11-04

- Q: When a player reconnects after a temporary network interruption (`<= 30 seconds`), how should their session identity and world position be handled? → A: Resume existing `sessionId`, visitor badge label/color, and last valid authoritative world position if reconnecting within a `30-second` grace window using a session resume token; assign a fresh visitor identity at the entry spawn plaza only if the grace window has expired.
- Q: How should physical collision between multiple player avatars be handled in the shared 3D space? → A: Pass-through avatars (no player-to-player physical blocking) while enforcing solid collision against all environmental obstacles, perimeter boundaries, and the blocked pond shoreline so visitors cannot body-block narrow paths or trap others at the spawn plaza.
- Q: When the instance authority clamps or corrects a local player's position due to discrepancy or boundary validation, how should the local client reconcile its view? → A: Smoothly interpolate the local avatar toward the authoritative position over `150ms` for minor discrepancies (`< 2.0m` drift/jitter), and immediately snap only for large/invalid discrepancies (`>= 2.0m`).
- Q: How should remote players be visually distinguished from the local player and from one another without persistent user profiles? → A: Display a non-intrusive overhead visitor badge (`"Explorer #NNN"`) and apply a deterministic outfit/hat accent color derived from each player's `sessionId`.
- Q: How should the game behave if the multiplayer service is unreachable on initial load or remains disconnected after automatic retries? → A: Non-blocking local exploration fallback—allow the player to continue exploring the Panda Forest locally while the HUD displays `Reconnecting...` or `Disconnected` status and provides an in-app `"Reconnect to Zoo"` button.

## Requirements *(mandatory)*

### Functional Requirements

#### Shared Instance & Session Lifecycle
- **FR-001**: The system MUST support multiple concurrent players (`2` to at least `16` players per instance) exploring the same Panda Forest zoo instance simultaneously across desktop and mobile browsers.
- **FR-002**: The system MUST assign every joining player a unique session identifier (`sessionId`), a session resume token, a human-readable visitor display label (e.g., `"Explorer #104"`), and a deterministic avatar accent color derived from `sessionId` scoped to that instance.
- **FR-003**: Upon joining an instance for the first time (or after a session grace window expires), the system MUST assign the player a valid, collision-free spawn position within the designated spawn plaza so that simultaneous arrivals do not stack on the exact same coordinate or spawn outside walkable bounds; player-to-player physical collision MUST remain pass-through so avatars cannot block pathways or spawn points.
- **FR-004**: When a player joins an already populated instance, the system MUST transmit a complete initial snapshot of all currently connected players (their session IDs, display labels, accent colors, positions, facing rotations, and locomotion states) and shared interactive prop states.
- **FR-005**: When a player intentionally leaves an instance, the system MUST immediately remove that player from the instance state and notify all remaining players; when a player disconnects unexpectedly, the system MUST remove their active avatar from the visible world within `10 seconds` and retain their resumable session token and last authoritative position in transient memory for a `30-second` reconnection grace window.

#### Real-Time Movement & Animation Synchronization
- **FR-006**: Each connected player MUST be able to control their own avatar independently using desktop (`WASD`, mouse drag, `Q`/`R`, `Shift`, `Space`) or mobile touch controls (`Virtual Joystick`, `Run`, `Jump`, touch-drag camera) with immediate local client-side prediction and pass-through avatar-to-avatar movement.
- **FR-007**: The system MUST synchronize each player's 3D world position, horizontal facing yaw, and active locomotion state (`Idle`, `Walking`, `Running`, `Jumping`) to all other players in the same instance in near real time.
- **FR-008**: Remote player avatars MUST be rendered in the 3D scene with smooth positional and rotational interpolation between network updates so remote movement appears continuous rather than stepping or teleporting.
- **FR-009**: Remote player avatars MUST visually animate their active locomotion state (`Idle`, `Walking`, `Running`, `Jumping`), render their deterministic outfit/hat accent color, and display a non-intrusive overhead visitor badge (`"Explorer #NNN"`) identifying them to nearby players.
- **FR-010**: Shared world prop interactions (`toggle_lantern`, `ring_chime`, `rest_bench`) triggered by any player in the instance MUST be synchronized so all connected visitors observe consistent environmental prop states.

#### Authoritative Validation & State Separation
- **FR-011**: The multiplayer instance authority MUST validate all client-submitted movement and state transitions—enforcing playable perimeter bounds, blocked pond shoreline boundaries, solid obstacle collision constraints, and maximum legal movement speeds (`walk <= 4.0 m/s`, `run <= 7.5 m/s`, plus tolerance for network jitter).
- **FR-012**: The system MUST reject malformed payloads, out-of-sequence stale packets, or impossible state transitions, and reconcile any out-of-bounds or speed-violating client back to its last valid authoritative transform using smooth local interpolation (`~150ms`) for minor drift (`< 2.0m`) and an immediate snap only for large discrepancies (`>= 2.0m`).
- **FR-013**: High-frequency transient session state (player positions, velocities, rotations, locomotion states, and presence heartbeats) MUST be maintained strictly in volatile instance memory and MUST NOT be written to permanent storage or databases.

#### Connection Resilience & Recovery
- **FR-014**: The HUD MUST display a clear, non-intrusive multiplayer status indicator showing the current connection state (`Connecting`, `Connected`, `Reconnecting`, `Disconnected` / `Offline Fallback`) and the active visitor count in the instance, while allowing non-blocking local exploration of the Panda Forest even when disconnected.
- **FR-015**: When a temporary network interruption occurs during active gameplay, the system MUST automatically attempt to reconnect to the zoo instance using bounded retry intervals while preserving the player's local 3D exploration view and providing visible `"Reconnecting..."` feedback.
- **FR-016**: Upon successful reconnection within the `30-second` recovery grace window, the system MUST restore the player into the active zoo instance with their previous `sessionId`, visitor badge, and last valid authoritative position (resynchronizing all remote players) without requiring a full browser page refresh; reconnections after the grace window expires MUST seamlessly assign a new session at the spawn plaza.
- **FR-017**: If automatic reconnection attempts fail or the multiplayer service is unreachable, the UI MUST provide an explicit `"Reconnect to Zoo"` action that re-establishes multiplayer connectivity in-place without restarting or reloading the entire web application.
- **FR-018**: Disconnection, lag, or invalid network payloads from any individual player MUST be isolated so they never crash, freeze, or interrupt the gameplay experience of other connected players in the instance.

### Key Entities

- **Zoo Instance Room**: A shared, bounded multiplayer session hosting concurrent visitors in the Panda Forest zone, maintaining authoritative transient state for all connected players, resumable grace-window tokens, and shared interactive world props.
- **Player Session Identity**: The transient identity assigned to a connected visitor for the duration of their session, comprising a unique `sessionId`, a session resume token, a display label (`"Explorer #NNN"`), a deterministic accent color, connection timestamp, last-seen sequence/heartbeat timestamp, and authoritative transform.
- **Authoritative Player TransformSnapshot**: The validated spatial and animation state of a player at a given tick (`position: [x, y, z]`, `velocity: [vx, vy, vz]`, `facingYaw`, `locomotionState: 'Idle' | 'Walking' | 'Running' | 'Jumping'`, `sequence`, `serverTimestamp`).
- **Remote Player Interpolation Buffer**: Client-side state for each remote visitor storing recent authoritative transform snapshots to smoothly interpolate position, facing yaw, and locomotion animations across render frames.
- **Connection Lifecycle State**: The client's current multiplayer connectivity status (`'connecting' | 'connected' | 'reconnecting' | 'disconnected'`), active visitor count, reconnect attempt counter, and last error/disconnect reason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two or more concurrent browser sessions (up to at least `16` players in a single instance) can join the same Panda Forest instance and see one another's avatars within `1.0 second` of entering the world.
- **SC-002**: Under normal broadband or mobile network conditions (`<= 100ms` round-trip latency), movement, facing rotation, and locomotion state changes (`Idle`, `Walking`, `Running`, `Jumping`) made by one player are visibly reflected on all other players' screens within `200ms`.
- **SC-003**: Remote player avatars move smoothly across `100%` of continuous walking and running paths without visible frame-to-frame teleportation or snapping when observed at 60 FPS on desktop and 30–60 FPS on mobile browsers.
- **SC-004**: When a player joins or leaves an instance cleanly, all connected clients reflect the added or removed avatar and updated visitor count within `1.0 second`; when a player disconnects abruptly (browser crash/network drop), stale avatars are cleaned up within `10 seconds`.
- **SC-005**: Disconnecting, force-closing, or sending malformed/out-of-bounds movement packets from one client causes `0` crashes, unhandled errors, or frame stalls for any other connected player or the instance host.
- **SC-006**: `100%` of simulated invalid movement updates (coordinates outside the `36m` perimeter, inside the `6.5m` pond boundary, inside solid obstacles, or exceeding maximum run speed beyond jitter tolerance) are clamped or rejected by the instance authority before being broadcast to other players.
- **SC-007**: Following a temporary network interruption of up to `10 seconds`, the client automatically reconnects and resynchronizes with the zoo instance within `5 seconds` of network restoration without requiring a browser page reload.
- **SC-008**: When automatic reconnection is exhausted, activating the in-app `"Reconnect"` button restores the player into a live multiplayer session in `100%` of tests once connectivity is available, without refreshing the browser tab.
- **SC-009**: `0` high-frequency movement or transform updates are written to disk or persistent storage during active multiplayer sessions.

## Out of Scope

- Friends lists and friend requests.
- Text chat, emotes chat, and proximity text chat.
- Voice chat or audio streaming between players.
- Player-to-player trading or gifting.
- Multiple zoo maps or cross-zone portals beyond the Panda Forest.
- Large-scale public sharding or matchmaking across hundreds of concurrent instances.
- Persistent user accounts, authentication, avatar customization, or saved player profiles.
- Autonomous Animal AI or synchronized animal entities.

## Assumptions

- **Single Shared Instance Default**: By default, all players opening the application join a shared default Panda Forest instance (auto-creating an overflow instance only if the primary room reaches its concurrent player cap of 16 visitors), with optional support for an instance/room code query parameter for isolated testing.
- **Anonymous Visitor Identity**: Since user authentication and persistent profiles are out of scope for Feature 002, each session is automatically assigned a friendly visitor label (e.g., `"Explorer #101"`) and a deterministic accent color derived from its session ID so players can easily distinguish one another visually.
- **Pass-Through Avatar-to-Avatar Collision**: In keeping with standard social MMO/virtual world conventions, players collide solidly with the environment (rocks, trees, bamboo, pond shoreline, perimeter fence) but can walk through other players' avatars so visitors cannot body-block pathways or trap one another at spawn.
- **Graceful Single-Player / Offline Fallback**: If the multiplayer service is unreachable when a player launches the game or while disconnected, the player can still explore the Panda Forest locally while the HUD clearly indicates the `Disconnected` / `Reconnecting` status and offers an in-app `Reconnect` action.

