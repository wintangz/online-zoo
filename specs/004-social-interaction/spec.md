# Feature Specification: Social Interaction

**Feature Branch**: `004-social-interaction`

**Created**: 2026-11-05

**Status**: Approved

**Input**: User description: "Create the specification for Feature 004: Social Interaction. Make the zoo feel like a social place where visitors can meet, communicate, express themselves, and spend time together."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Proximity Text Chat and Overhead Speech Bubbles (Priority: P1)

As a visitor exploring the zoo, I want to send text messages to nearby visitors and see messages both as speech bubbles above the speaker's avatar and in a readable chat log, while being protected from spam and prohibited language.

**Why this priority**: Direct communication through proximity text chat and overhead speech bubbles is the primary social mechanic that transforms shared presence into genuine conversation.

**Independent Test**: Connect two visitors in the same zoo area within proximity range (`<= 24` meters); send a valid chat message from Visitor A and verify it appears both as an overhead speech bubble above Visitor A's avatar and in both visitors' chat logs; move Visitor B outside the proximity range (`> 24` meters), send another message from Visitor A, and verify Visitor B does not receive it; attempt to send an overly long, rapid-fire spam, or prohibited message and verify it is blocked with clear feedback.

**Acceptance Scenarios**:

1. **Given** two visitors are within proximity communication range (`24` meters) in the same zoo instance, **When** one visitor sends a valid text message (`1–140` characters), **Then** the message appears as a speech bubble above the sender's avatar for `6` seconds and is added to the recent messages panel for both the sender and nearby visitors.
2. **Given** another visitor is located beyond the proximity communication range (`> 24` meters) in the same zoo instance, **When** a speaker sends a proximity chat message, **Then** the distant visitor does not see the speech bubble or receive the message in their chat panel.
3. **Given** a visitor attempts to send messages faster than the allowed rate (`> 4` messages within `6` seconds or `< 1` second apart) or exceeds the `140`-character limit, **Then** the system rejects or truncates the submission and displays a clear cooldown or length notice without broadcasting spam.
4. **Given** a visitor submits a message containing prohibited or inappropriate words according to the zoo's safety rules, **When** the message is evaluated, **Then** the system blocks the prohibited message from being broadcast and informs the sender that the message violates community safety guidelines.

---

### User Story 2 - Expressive Avatar Emotes (Priority: P2)

As a visitor, I want to trigger expressive emotes—including waving, dancing, clapping, laughing, and sitting-related expressions—that nearby visitors can see on my avatar without unexpectedly locking or interrupting my ability to move.

**Why this priority**: Quick visual expressions allow visitors to greet one another, celebrate, and react playfully even without typing, enriching non-verbal social presence.

**Independent Test**: Trigger each of the supported emotes (`Wave`, `Dance`, `Clap`, `Laugh`, `Sit / Relax`) from Visitor A while Visitor B is nearby; verify Visitor A's avatar plays the emote animation/indicator and Visitor B sees it in real time; initiate movement while an emote is playing and verify the emote cancels smoothly without delaying or locking movement.

**Acceptance Scenarios**:

1. **Given** a visitor is exploring or standing in the zoo, **When** they select an emote from the basic emote collection (`Wave`, `Dance`, `Clap`, `Laugh`, or `Sit / Relax`), **Then** their avatar visibly performs the expression and displays a clear emote indicator above or on the avatar.
2. **Given** other visitors are nearby in the same zoo instance, **When** a visitor triggers an emote, **Then** all nearby visitors see the emote performed on that visitor's avatar in real time.
3. **Given** a visitor's avatar is currently performing an emote, **When** the visitor provides movement or jump input, **Then** normal movement resumes immediately and smoothly cancels the active emote without input lock.

---

### User Story 3 - Sitting on Benches and Interacting with World Objects (Priority: P3)

As a visitor, I want to approach supported benches, chairs, and environmental objects, see clear interaction prompts and availability status, sit down alongside other visitors on multi-seat benches, and stand back up whenever I choose.

**Why this priority**: Shared physical activities—like sitting together on a park bench watching the pandas or inspecting habitat objects—anchor social hangouts in the 3D environment.

**Independent Test**: Walk Visitor A up to a multi-seat park bench, verify the interaction prompt indicates available seating, trigger the sit action, and verify Visitor A is seated on Seat 1; walk Visitor B up to the same bench, verify the prompt shows `1/2` seats available, trigger sit, and verify both visitors sit side-by-side on different seats simultaneously; press the stand action or move input and verify Visitor A stands up and frees the seat.

**Acceptance Scenarios**:

1. **Given** a visitor approaches a supported bench, chair, or interactive environmental object within interaction range, **When** they are close enough to interact, **Then** a clear prompt appears showing the object name, action (e.g., `"Sit"` or `"Inspect"`), and current availability (e.g., `"Available (2/2 seats free)"`, `"1/2 seats free"`, or `"Occupied"`).
2. **Given** a bench has multiple valid seats and at least one seat is unoccupied, **When** a visitor activates the sit prompt, **Then** their avatar moves onto an available seat, adopts a seated posture facing outward, and other visitors see them seated in that spot.
3. **Given** one visitor is already seated on a two-seat bench, **When** a second visitor interacts with the same bench, **Then** the second visitor is placed on the remaining available seat so both visitors sit together simultaneously.
4. **Given** all seats on a bench or chair are currently occupied, **When** another visitor approaches it, **Then** the object clearly communicates that it is `"Occupied"` and prevents overlapping seating until a seat is vacated.
5. **Given** a visitor is currently seated on a bench or chair, **When** they activate the `"Stand Up"` control or provide directional movement / jump input, **Then** they stand up cleanly adjacent to the seat and the seat immediately becomes available again.

---

### User Story 4 - Friends List, Online Status, and Joining a Friend's Instance (Priority: P4)

As a visitor, I want to send friend requests to other visitors, accept or reject incoming requests, remove friends, view my friends list with live online status, and join an online friend's zoo instance when space is available.

**Why this priority**: Persistent friendships and instance joining allow visitors who meet in the zoo to reconnect and visit the same world instance together across sessions.

**Independent Test**: Have Visitor A send a friend request to Visitor B; verify Visitor B sees the pending request and can accept or reject it; upon acceptance, verify both Visitor A and Visitor B see each other in their Friends list with `"Online"` status and active instance label; place Visitor A and Visitor B in different zoo instances and have Visitor B use `"Join Instance"` to move into Visitor A's instance; finally test removing a friend and rejecting a request.

**Acceptance Scenarios**:

1. **Given** Visitor A sees Visitor B nearby (or enters Visitor B's identifier), **When** Visitor A sends a friend request, **Then** Visitor B receives an incoming friend request notification that can be accepted or rejected.
2. **Given** Visitor B has a pending friend request from Visitor A, **When** Visitor B accepts the request, **Then** both visitors are added to each other's persistent friends list; **When** Visitor B rejects the request, **Then** the pending request is dismissed without adding either visitor as a friend.
3. **Given** a visitor opens their Friends list, **When** they view their confirmed friends, **Then** each friend entry displays the friend's display name, current online/offline status, and whether their zoo instance is joinable.
4. **Given** a visitor's friend is online in another accessible zoo instance with available capacity, **When** the visitor selects `"Join Friend"`, **Then** the visitor transitions into the friend's zoo instance.
5. **Given** a visitor's friend is in a zoo instance that has reached maximum visitor capacity, **When** the visitor attempts to join that friend's instance, **Then** the system keeps the visitor in their current instance and displays a clear `"Instance Full"` message.
6. **Given** a visitor wishes to end a friendship, **When** they select `"Remove Friend"` on a friend entry, **Then** the friendship is removed for both visitors.

---

### User Story 5 - Accessible Player Safety Controls: Mute, Block, and Report (Priority: P5)

As a visitor, I want quick, uncomplicated controls to mute, block, or report another visitor who disturbs me so that muted/blocked visitors cannot bother me through chat, emotes, or friend requests and moderation reports capture sufficient context for review.

**Why this priority**: A welcoming public social environment requires immediate self-protection tools (`Mute`, `Block`, `Report`) accessible directly from nearby visitor listings or chat without hunting through deep menus.

**Independent Test**: From Visitor A's social/nearby panel or chat log, mute Visitor B and verify Visitor B's subsequent chat messages, speech bubbles, and emote alerts are hidden from Visitor A; block Visitor B and verify friend requests from Visitor B are blocked and existing friendship is removed; submit a report against Visitor B with a selected reason and verify the report confirmation and captured moderation context (`reporter`, `reported visitor`, `reason`, `instance`, `timestamp`, and `recent chat snapshot`).

**Acceptance Scenarios**:

1. **Given** Visitor A is disturbed by Visitor B, **When** Visitor A selects `"Mute"` next to Visitor B's name in the chat or nearby visitors list, **Then** Visitor B's text messages, overhead speech bubbles, and emote notifications are immediately hidden from Visitor A until unmuted.
2. **Given** Visitor A selects `"Block"` on Visitor B, **Then** Visitor B is muted, any existing friendship or pending friend request between Visitor A and Visitor B is removed, and Visitor B is prevented from sending future friend requests or visible chat/emotes to Visitor A.
3. **Given** Visitor A selects `"Report"` on Visitor B and chooses a reason category (such as inappropriate chat, harassment/spam, or offensive name), **When** Visitor A submits the report, **Then** the system records a complete moderation report containing the reporter's identity, reported visitor's identity and display name, room/instance identifier, timestamp, selected reason, optional details, and recent proximity chat context, and confirms submission to Visitor A.
4. **Given** a visitor needs to use safety controls during active gameplay, **When** they interact with the chat panel or nearby visitor roster, **Then** `Mute`, `Block`, and `Report` actions are reachable within at most two interactions without navigating through nested settings menus.

---

### User Story 6 - Instance (Server) Selection, Selectable/Copiable & Tunable Player ID, and Background-Tab Session Resilience (Priority: P2)

As a visitor, I want to view and switch between available zoo instances (servers), easily select, copy, or tune my Player ID (and copy other visitors' IDs), and never have other visitors disappear or proximity chat stop working after switching browser tabs or windows.

**Why this priority**: Players need direct control over which server instance they are exploring, frictionless ways to copy/share or customize their Player ID (including across multiple tabs on the same browser), and rock-solid session continuity when alt-tabbing or backgrounding a tab.

**Independent Test**: Open the Instance Selector in the HUD/Social Drawer, verify multiple default instances (`panda-forest-1`, `panda-forest-2`, `panda-forest-3`) and custom room joining work in place without a page reload; verify Player IDs are text-selectable (`user-select: all`), have a 1-click Copy button, and can be tuned/regenerated; simulate a background tab pause exceeding the heartbeat timeout and verify the session automatically recovers on the next packet or background timer so remote players remain visible and proximity chat continues working.

**Acceptance Scenarios**:

1. **Given** a visitor is connected to a zoo instance, **When** they open the Instance / Server selector in the HUD or Social Drawer, **Then** they see a list of available instances (including default channels `panda-forest-1`, `panda-forest-2`, `panda-forest-3` and any active custom instances) with live population counts (`X/16`) and can switch instances or enter a custom instance ID in one click.
2. **Given** a visitor views their Player ID or another visitor's Player ID in the Social Drawer or Avatar Customizer, **When** they highlight the ID or click `"Copy ID"`, **Then** the ID text is selectable and copied to the clipboard with immediate `"Copied!"` confirmation.
3. **Given** a visitor wants to customize their Player ID (or assign a distinct ID in a second browser tab), **When** they edit their Player ID (`8–64` alphanumeric/hyphen/underscore characters) or click `"New ID"` and apply it, **Then** their persistent/session Player ID updates immediately and synchronizes with the active zoo instance.
4. **Given** a visitor's browser tab is backgrounded or unfocused (pausing `requestAnimationFrame`), **When** the visitor remains in the background or returns to the tab and sends a chat message or moves, **Then** background heartbeats and server-side session auto-reactivation keep all visitors visible and ensure proximity chat continues working without interruption.

---

### Edge Cases

- **Visitor Disconnects While Seated**: When a visitor who is sitting on a bench or chair disconnects or switches zoo instances, their seat is immediately released on the server and becomes available for other visitors.
- **Simultaneous Seat Requests (Race Condition)**: If two visitors click to sit on the exact same last remaining seat of a bench at the same moment, the instance authority grants the seat to the first arriving request and leaves the second visitor standing with an updated `"Occupied"` notice rather than stacking two avatars in one seat.
- **Typing in Chat While Moving**: Focusing the chat text input suppresses character movement hotkeys (`W`, `A`, `S`, `D`, `Space`, `E`, `Shift`) so typing messages never causes the avatar to walk, jump, or stand up unintentionally.
- **Speech Bubble Replacement on Rapid Allowed Messages**: When a visitor sends a second valid message before their previous `6`-second speech bubble expires, the overhead speech bubble smoothly updates to display the newest message and resets its visibility timer.
- **Friend Request to or from a Blocked Visitor**: If Visitor A has blocked Visitor B, any attempt by Visitor B to send a friend request to Visitor A (or vice versa until unblocked) is rejected automatically without disturbing the blocking visitor.
- **Joining the Same Instance Already Occupied**: If a visitor clicks `"Join Friend"` while already in the exact same zoo instance as that friend, the system notifies them that they are already in the same instance (and highlights or orients toward the friend's presence) without an unnecessary reconnect.

## Clarifications

### Session 2026-11-05

- Q: What communication range, message length, speech bubble duration, and rate limits apply to proximity text chat? → A: Proximity text chat reaches visitors within `24` meters horizontal distance in the same zoo instance; messages are `1–140` trimmed characters; overhead speech bubbles display above the speaker for `6` seconds; rate limiting allows at most `4` messages per `6`-second window with a minimum `1.0`-second interval between messages.
- Q: Which initial emotes are included and how do they interact with movement and seating? → A: Five core emotes (`Wave`, `Dance`, `Clap`, `Laugh`, and `Sit / Relax Pose`). Emotes broadcast to nearby visitors within the instance; while seated, upper-body/seated-compatible emotes (`Wave`, `Clap`, `Laugh`, `Sit / Relax Pose`) can be performed in place, while triggering movement immediately cancels any active emote.
- Q: How are multi-seat benches and environmental object interactions structured? → A: Park benches provide `2` distinct seats (`Left` and `Right`) with authoritative seat-slot occupancy tracked per bench, plus additional single/multi-seat rest benches in the Panda Forest plaza and habitat overlook. Visitors can also interact with environmental objects (information signs, feeding stations, viewpoint telescope, panda statue) which display contextual discovery prompts and trigger a brief inspection reaction.
- Q: How do friend requests, online status, and instance joining work across sessions? → A: Confirmed friends, outgoing/incoming friend requests, and muted/blocked player lists persist across visits for each player identity. The instance authority tracks online presence and room capacity across active instances so friends see live online status and current room ID, and can switch into a friend's room whenever capacity (`< maxCapacity`) allows.
- Q: What exact context must a player report capture for moderation review? → A: Each report captures `reportId`, `reporterPlayerId`, `reportedPlayerId`, `reportedDisplayName`, `roomId`, `reason` (`inappropriate-chat`, `harassment-spam`, `offensive-name`, `other`), optional `details` (`<= 200` chars), `createdAt` timestamp, and a snapshot of recent proximity messages involving the reported visitor.

## Requirements *(mandatory)*

### Functional Requirements

#### Proximity Text Chat & Speech Bubbles
- **FR-001**: Visitors MUST be able to send and receive text chat messages through an accessible in-game chat interface.
- **FR-002**: Text chat MUST be proximity-based, delivering messages only to visitors within `24` meters of the sender inside the same zoo instance.
- **FR-003**: Sent messages MUST appear as overhead speech bubbles above the speaker's 3D avatar for `6` seconds for both the speaker and nearby visitors within range.
- **FR-004**: The chat interface MUST display a scrollable history of recent proximity messages received during the session.
- **FR-005**: Chat messages MUST be validated to have a trimmed length between `1` and `140` characters inclusive.
- **FR-006**: The system MUST enforce anti-spam rate limits on chat submissions (maximum `4` messages per `6` seconds and at least `1.0` second between consecutive messages) and provide clear feedback when rate-limited.
- **FR-007**: The system MUST filter and reject messages containing prohibited or inappropriate content according to the game's moderation rules on both client and server before any broadcast occurs.
- **FR-008**: Focusing the chat input field MUST suppress gameplay movement and interaction hotkeys so typing text does not move or control the avatar.

#### Emotes
- **FR-009**: Visitors MUST have access to a basic emote collection containing at least five expressions: **Wave**, **Dance**, **Clap**, **Laugh**, and **Sit / Relax**.
- **FR-010**: Triggering an emote MUST play a visible avatar animation/expression and overhead emote badge that is synchronized to nearby visitors in the instance.
- **FR-011**: Emotes MUST NOT lock the player or interrupt normal gameplay unexpectedly; initiating movement or jumping MUST smoothly cancel an active emote immediately.

#### World Interactions & Multi-Seat Seating
- **FR-012**: Visitors MUST be able to sit on supported benches and chairs in the zoo and stand up again via an explicit stand action or movement input.
- **FR-013**: Supported benches MUST provide multiple distinct seat slots (e.g., `2` seats per park bench) so multiple visitors can sit side-by-side on different valid seats simultaneously.
- **FR-014**: Approaching a supported bench, chair, or interactive environmental object MUST display a clear proximity interaction prompt indicating the available action and current seat availability or occupancy state.
- **FR-015**: Seat occupancy MUST be managed authoritatively so two visitors cannot occupy the same seat slot simultaneously, and seats MUST be automatically freed if a seated visitor stands up, moves away, or disconnects.
- **FR-016**: Visitors MUST be able to interact with supported environmental objects (such as habitat signs, feeding stations, and viewing scopes) and receive clear visual/textual feedback.

#### Friends, Online Status & Instance Joining
- **FR-017**: Visitors MUST be able to send friend requests to other visitors and accept or reject incoming friend requests.
- **FR-018**: Visitors MUST be able to view their persistent friends list and remove existing friends at any time.
- **FR-019**: The friends list MUST display each friend's current online status and active zoo instance information.
- **FR-020**: Visitors MUST be able to join an online friend's zoo instance when that instance is accessible and has available visitor capacity, or receive a clear notification if the instance is full.

#### Safety Controls (Mute, Block & Report)
- **FR-021**: Visitors MUST be able to **Mute** and **Unmute** another visitor, immediately suppressing text chat messages, speech bubbles, and emote notifications from the muted visitor.
- **FR-022**: Visitors MUST be able to **Block** and **Unblock** another visitor, which enforces all mute protections, removes any existing friendship or pending friend request between the two visitors, and prevents future friend requests from the blocked visitor.
- **FR-023**: Visitors MUST be able to **Report** inappropriate behavior by selecting a reason category and optional comment, capturing structured moderation context (reporter ID, reported player ID and display name, instance ID, timestamp, reason, and recent chat context).
- **FR-024**: Safety controls (`Mute`, `Block`, `Report`) and friend request actions MUST be directly accessible from the in-game social/visitor roster and chat interface without navigating through complex or deeply nested menus.

#### Instance Selection, Player ID Tuning/Copying & Session Resilience
- **FR-025**: Visitors MUST be able to view a live directory of available zoo instances/servers (including default instances `panda-forest-1`, `panda-forest-2`, `panda-forest-3` and active custom rooms) with current visitor counts and capacity.
- **FR-026**: Visitors MUST be able to switch to another available zoo instance or join a custom instance ID directly from the in-game UI without reloading the page.
- **FR-027**: Player IDs (both the local player's ID and nearby visitors' IDs) MUST be text-selectable (`select-all`) and provide a 1-click **Copy ID** action with visual confirmation feedback.
- **FR-028**: Visitors MUST be able to tune (customize or regenerate) their Player ID (`8–64` characters `[a-zA-Z0-9_-]`) from the Avatar Customizer or Social Drawer and synchronize the updated ID with the server in real time.
- **FR-029**: Multiplayer client heartbeats MUST run on an independent background timer (`setInterval`) so backgrounded browser tabs do not time out when `requestAnimationFrame` is paused, and the server MUST automatically reactivate any still-open socket whose session entered the resumable grace window so remote players never vanish and chat never stops working.

### Key Entities

- **ProximityChatMessage**: A validated text message sent by a visitor, containing a unique `messageId`, `senderSessionId`, `senderPlayerId`, `senderDisplayName`, `text` (`1–140` chars), `originPosition` (`x, y, z`), `roomId`, `createdAt`, and `expiresAt` (`createdAt + 6000ms` for the speech bubble).
- **AvatarEmoteState**: An active expressive action performed by a visitor (`emoteId`: `wave` | `dance` | `clap` | `laugh` | `sit`, `startedAt`, `expiresAt`).
- **WorldSeatSlot**: An individual seat position on a bench or chair (`propId`, `seatIndex`, `worldPosition`, `facingYaw`, `occupiedBySessionId`, `occupiedByDisplayName`).
- **FriendRelationship & FriendRequest**: A social connection record between two persistent player identities (`requestId`, `fromPlayerId`, `fromDisplayName`, `toPlayerId`, `toDisplayName`, `status`: `pending` | `accepted` | `rejected`, `updatedAt`) along with live presence (`online`, `roomId`, `roomPopulation`, `roomMaxCapacity`).
- **SafetyModerationState & PlayerReport**: A player's active safety preferences (`mutedPlayerIds`, `blockedPlayerIds`) and structured moderation report submissions (`reportId`, `reporterPlayerId`, `reportedPlayerId`, `reportedDisplayName`, `roomId`, `reason`, `details`, `recentMessagesSnapshot`, `createdAt`).

## Assumptions & Dependencies

- **Feature 001 (World Foundation)** provides the Panda Forest 3D environment, avatar movement, camera controls, and interactive prop proximity detection.
- **Feature 002 (Multiplayer Synchronization)** provides room-based instance management, session presence, and real-time state synchronization across connected visitors.
- **Feature 003 (Player Identity & Avatar)** provides persistent `playerId` identities, validated `displayName` badges, and customized 3D avatars used to identify speakers, friends, and reported visitors.

## Out of Scope

- Voice chat or audio streaming.
- Video chat.
- Private 1-on-1 direct messaging outside proximity chat.
- Guilds, clans, or persistent player groups.
- Player-to-player item or cosmetic trading.
- Dating or matchmaking features.
- Complex social media feeds, walls, or photo sharing.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of valid proximity chat messages (`1–140` characters) sent by a visitor are delivered within `250ms` to all unmuted/unblocked visitors within `24` meters in the same instance and excluded from visitors beyond `24` meters.
- **SC-002**: 100% of delivered chat messages render both as an overhead speech bubble above the sender's avatar for `6` seconds and as an entry in the chat history panel.
- **SC-003**: 100% of chat messages exceeding length limits, violating the rate limit (`> 4` messages per `6` seconds or `< 1` second interval), or matching the moderation blocklist are rejected by both client and server without being broadcast to other visitors.
- **SC-004**: Visitors can trigger all `5` initial emotes (`Wave`, `Dance`, `Clap`, `Laugh`, `Sit / Relax`), see them synchronized across nearby visitors within `250ms`, and cancel them instantaneously (`< 50ms`) upon movement input.
- **SC-005**: Multiple visitors (`>= 2`) can simultaneously occupy distinct seats on the same multi-seat park bench without avatar overlap, see accurate seat availability prompts (`2/2 free`, `1/2 free`, `Occupied`), and stand up cleanly on demand.
- **SC-006**: Visitors can send, accept, reject, and remove friend relationships, view accurate online status and room identifiers for friends, and transition into an online friend's accessible zoo instance in a single action when capacity permits.
- **SC-007**: Muting or blocking a visitor suppresses 100% of their subsequent chat messages, speech bubbles, and emote alerts for the affected player, and blocking additionally prevents friend requests and removes any existing friendship.
- **SC-008**: Submitting a player report captures 100% of required moderation context fields (reporter ID, reported player ID/name, room ID, reason, timestamp, and recent chat context) and is reachable in at most `2` clicks from the HUD.
- **SC-009**: Visitors can view live population counts across zoo instances (`panda-forest-1`, `panda-forest-2`, `panda-forest-3`, and custom rooms) and switch instances in-app in a single action.
- **SC-010**: Visitors can select, 1-click copy, and tune/regenerate their Player ID (`8–64` valid characters) with immediate server synchronization.
- **SC-011**: 100% of active WebSocket sessions remain connected and functional for movement and proximity chat even when browser tabs are backgrounded (`requestAnimationFrame` paused) or recover automatically if a tab freeze occurs.

