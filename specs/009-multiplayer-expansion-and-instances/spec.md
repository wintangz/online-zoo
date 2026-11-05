# Feature Specification: Multiplayer Expansion & Zoo Instances

**Feature Branch**: `009-multiplayer-expansion-and-instances`  
**Created**: 2026-11-05  
**Status**: Completed (Converged)  
**Input**: User description: "Feature 009 — Multiplayer Expansion & Zoo Instances: Allow the zoo to support more visitors reliably by distributing players across multiple instances and providing clear ways to join friends. Support concurrent instances, configurable capacity limits, friend-prioritized instance placement, friend privacy controls, instance discovery UI, duplicate-free session transitions, and automatic failover/recovery when an instance becomes unavailable."

## Clarifications

### Session 2026-11-05

- **Q1: How does automatic instance assignment prioritize friends and handle full or unhealthy instances during entry?** → When a player enters the zoo without forcing a specific custom instance (or when their requested instance is full or unhealthy), the instance allocator:
  1. Checks if the player has online friends in any `healthy` instance with available capacity (`visitorCount < maxPlayers`) where friend joining is permitted (`allowFriendJoin !== false`), prioritizing the instance with the highest number of online friends (`friendCount`) so friends are naturally kept together (`US2`, `US6`).
  2. Otherwise selects the first `healthy` preset or active instance with available capacity (`panda-forest-1`, `panda-forest-2`, `panda-forest-3`, etc.), automatically spawning a new numbered overflow instance (`panda-forest-4`, ...) during peak entry bursts if all existing instances are full (`US1`, `US2`).
  3. Never assigns players to an instance marked `unhealthy` / `unavailable` or at/above `maxPlayers` (`FR-004`, `FR-005`, `FR-007`).
- **Q2: How are friend privacy settings and join-friend validations handled?** → Each player has a configurable friend-access preference (`allowFriendJoin: boolean`, defaulting to `true` — "Allow Friends to Join My Instance"). When a player requests to join a friend's instance (`join_friend_instance`), the server verifies that:
  1. Neither player has blocked the other (`PLAYER_BLOCKED`).
  2. The target friend is online and has `allowFriendJoin === true`; if disabled, the request is rejected with `FRIEND_JOIN_DISABLED` and clear feedback (`FR-009`, `FR-010`).
  3. The friend's instance is `healthy` (`INSTANCE_UNAVAILABLE` if unhealthy) and has available capacity (`ROOM_FULL` if `visitorCount >= maxPlayers`).
- **Q3: How are instance transitions deduplicated and how are empty or unhealthy instances handled?** →
  1. **Zero Duplicate Sessions**: During any entry, resume, manual switch (`switch_instance`), friend join (`join_friend_instance`), or automatic failover, the authority purges any pre-existing session for the same `sessionId` or `playerId` from the source room (releasing seats, removing active event participation slots, and broadcasting `player_left`) before registering the player in the target room.
  2. **Empty Overflow Cleanup**: Preset public instances (`panda-forest-1`..`panda-forest-3`) remain listed in the directory at `0/maxPlayers`, while empty dynamic overflow instances (`panda-forest-4+` or custom rooms) are automatically pruned once idle with `0` active and `0` resumable sessions (`FR-006`).
  3. **Unhealthy Instance Isolation & Recovery**: Each instance tracks its health state (`status: 'healthy' | 'unhealthy'`) and configurable `maxPlayers`. If an instance transitions to `unhealthy` (simulated or detected via runtime health check / `configure_instance`), unrelated instances continue operating normally, and all players currently in the unhealthy instance are automatically evacuated/migrated to a healthy available instance with a recovery notification (`instance_recovery_notice`) while preserving their identity, Zoo Coins, food inventory, and Zoo Passport progression (`US7`, `FR-007`, `FR-013`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Instance Assignment, Overflow & Friend-Prioritized Entry (Priority: P1)

As a player entering the zoo, I want the game to place me in an appropriate available instance—automatically prioritizing healthy instances where my friends are already playing or routing me to an overflow instance when another instance is full—so I can always enter the zoo and stay with friends.

**Why this priority**: Seamless entry during peak load and natural social grouping with friends are foundational to multi-instance scaling.

**Independent Test**: Fill `panda-forest-1` to its configured capacity, connect an additional player, and verify they are automatically placed in `panda-forest-2` with a clear placement notice. Connect a player whose friend is in `panda-forest-2` and verify automatic entry places them alongside their friend.

**Acceptance Scenarios**:

1. **Given** `panda-forest-1` is at full capacity (`maxPlayers`), **When** a new visitor enters the zoo, **Then** they are automatically assigned to an available instance (`panda-forest-2`) without error.
2. **Given** a player has an online friend in a healthy, non-full instance (`panda-forest-2`), **When** the player enters the zoo normally, **Then** the allocator prioritizes placing them into `panda-forest-2` with their friend.

---

### User Story 2 - Instance Discovery & Seamless Switching Between Instances (Priority: P1)

As a player, I want to view available zoo instances with understandable status and friend indicators, move between available instances without losing my identity or progression, and see clear feedback when an instance is full.

**Why this priority**: Visitors need visibility into active instances and the ability to switch servers cleanly without technical jargon or session duplication.

**Independent Test**: Open the Zoo Instances directory in the Social drawer, verify instances display friendly names, visitor counts (`visitorCount / maxPlayers`), friend counts (`Friends Here`), and status badges (`Current`, `Switch`, `Full`, `Unavailable`), switch to another available instance, and verify the previous session is cleaned up and wallet/passport progression remain intact.

**Acceptance Scenarios**:

1. **Given** multiple active zoo instances, **When** a player views the instance directory, **Then** each instance displays its human-friendly name, population (`visitorCount / maxPlayers`), whether friends are present, and whether it is joinable, full, or unavailable.
2. **Given** a player switching from one instance to another, **When** the transition completes, **Then** their previous session (including seats and event participation) is cleaned up without duplicate sessions, and their identity, currency, inventory, and passport progression remain intact.
3. **Given** an instance that has reached `maxPlayers`, **When** a player attempts to switch to it, **Then** the UI shows `Full` and the server rejects the switch with `ROOM_FULL` and a clear message.

---

### User Story 3 - Joining Friends with Capacity & Privacy Checks (Priority: P1)

As a player, I want to join my friends in the same instance when permitted and capacity allows, and I want to control whether friends can join my instance via a privacy setting.

**Why this priority**: Joining friends directly and respecting player privacy are core social expectations in a multi-instance world.

**Independent Test**: Establish a friendship between Player A and Player B in different instances. Verify Player B can join Player A's instance when capacity allows. Toggle Player A's "Allow Friends to Join" privacy setting off (`allowFriendJoin: false`) and verify join attempts are politely declined with `FRIEND_JOIN_DISABLED`.

**Acceptance Scenarios**:

1. **Given** an online friend in an accessible instance with available capacity and `allowFriendJoin: true`, **When** a player clicks `Join Instance`, **Then** they transition into the friend's instance near their friend.
2. **Given** a friend whose instance is full (`ROOM_FULL`) or who has disabled friend joins (`allowFriendJoin: false`), **When** a player requests to join them, **Then** the game prevents the transfer and displays clear feedback explaining why joining is unavailable.

---

### User Story 4 - Instance Health Isolation & Automatic Failover Recovery (Priority: P2)

As a player, I want the game to recover automatically if my current instance becomes unavailable or unhealthy, moving me to a healthy instance without affecting unrelated instances or losing my progress.

**Why this priority**: Ensures resilience and fault isolation across concurrent zoo instances.

**Independent Test**: Mark an active instance (`panda-forest-1`) as unhealthy while players are connected in both `panda-forest-1` and `panda-forest-2`. Verify `panda-forest-2` is completely unaffected, `panda-forest-1` is excluded from new player assignments, and players in `panda-forest-1` are automatically evacuated to a healthy instance (`panda-forest-2`) with a clear recovery banner and intact progression.

**Acceptance Scenarios**:

1. **Given** an instance that becomes unhealthy/unavailable, **When** the health change occurs, **Then** connected players in that instance are automatically migrated to a healthy available instance with a clear recovery notification, while players in other instances experience zero disruption.
2. **Given** an unhealthy instance, **When** new players enter the zoo or attempt to switch to that instance, **Then** the system avoids assigning them to the unhealthy instance and rejects direct switches with `INSTANCE_UNAVAILABLE`.

---

### Edge Cases

- **Peak Concurrent Entry Burst**: When many players join simultaneously and fill `panda-forest-1`, `panda-forest-2`, and `panda-forest-3`, the authority dynamically provisions `panda-forest-4`, `panda-forest-5`, etc., ensuring no player is blocked from entering unless a hard global cap is configured.
- **Empty Dynamic Overflow Instances**: When all players leave a dynamically created overflow instance (`panda-forest-4+`) and its reconnect grace tokens expire, the empty overflow instance is automatically cleaned up so the instance directory does not accumulate stale empty rooms.
- **Duplicate Transfer / Rapid Clicks**: If a player rapidly clicks `Switch` or `Join Friend` multiple times, or reconnects with the same `playerId` from another tab, existing active sessions for that `playerId` / `sessionId` are cleanly terminated/migrated so duplicate avatars never appear in the same or previous instance.
- **All Preset Instances Unhealthy**: If all preset instances are marked unhealthy, the allocator automatically provisions a fresh healthy recovery instance (`panda-forest-recovery-1` or next available overflow channel) or returns a clear `INSTANCE_UNAVAILABLE` notice without crashing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support multiple concurrent instances of the Panda Forest zoo environment, each with a unique `roomId` and human-friendly display label.
- **FR-002**: The system MUST automatically assign entering players to an available `healthy` instance without requiring manual instance selection during normal entry.
- **FR-003**: During automatic entry (when no explicit custom room is forced), the instance allocator MUST prioritize `healthy` instances with available capacity where the player's online friends are currently present (and `allowFriendJoin` is enabled).
- **FR-004**: Instance capacity (`maxPlayers`) MUST be configurable both globally and per instance at runtime (`configure_instance`), and the system MUST prevent any instance from exceeding its configured capacity.
- **FR-005**: When a requested instance is full during initial entry, the system MUST automatically route the player to an available instance (or provision a new overflow instance) and inform the player of the placement.
- **FR-006**: The system MUST manage empty instances by keeping default public channels available while automatically pruning idle, empty dynamic overflow instances.
- **FR-007**: The system MUST track instance health (`status: 'healthy' | 'unhealthy'`) so that unhealthy instances are isolated from healthy instances and never receive new player assignments.
- **FR-008**: When an active instance becomes `unhealthy`, the system MUST automatically evacuate/migrate its connected players to a healthy available instance and display a clear recovery notice.
- **FR-009**: Players MUST be able to request to join an online friend's instance (`join_friend_instance`), and the server MUST validate that the target instance is `healthy`, has available capacity, and that the friend has not blocked the player or disabled friend joins (`allowFriendJoin`).
- **FR-010**: Players MUST be able to toggle their friend-join privacy setting (`allowFriendJoin: boolean`) at runtime (`set_social_privacy`), which updates their friends' `canJoin` status in real time.
- **FR-011**: The UI MUST provide an understandable instance discovery directory showing each instance's friendly label, population (`visitorCount / maxPlayers`), health/availability status, and number of online friends present (`friendCount`), prioritizing instances with friends.
- **FR-012**: Moving between instances MUST clean up the player's previous session (seat occupancy, active event participation, and active session map) and prevent duplicate or orphaned sessions for the same `sessionId` or `playerId`.
- **FR-013**: Player identity (`playerId`, `displayName`, `avatar`), dining wallet (`currencyBalance`, `inventory`), and Zoo Passport progression (`stamps`, `achievements`, `earnedBadges`, `activeBadge`) MUST remain intact across all instance transitions and failovers.

### Key Entities

- **`ZooInstanceSummary`**: Public directory descriptor for a zoo instance (`roomId`, `label`, `visitorCount`, `maxPlayers`, `isFull`, `status: 'healthy' | 'unhealthy'`, `friendCount?: number`, `isOverflow?: boolean`).
- **`InstanceConfigurationPatch`**: Runtime configuration payload (`roomId`, `maxPlayers?: number`, `status?: 'healthy' | 'unhealthy'`) used to adjust instance capacity or simulate/trigger instance health failover.
- **`SocialPrivacyPreferences`**: Per-player privacy settings (`allowFriendJoin: boolean`) controlling whether friends may directly join the player's current instance.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Concurrent Multi-Instance & Capacity Enforcement)**: Multiple instances run concurrently, enforce their configured `maxPlayers` limit 100% of the time, automatically route overflow entrants during peak bursts to available/new instances, and prune empty dynamic overflow instances when vacated.
- **SC-002 (Friend-Prioritized Entry & Friend Join with Privacy)**: Entering players with online friends are automatically placed in their friend's healthy non-full instance when `allowFriendJoin` is enabled; manual `Join Friend` requests succeed when capacity and privacy allow, and fail with clear feedback (`ROOM_FULL`, `FRIEND_JOIN_DISABLED`, `INSTANCE_UNAVAILABLE`) otherwise.
- **SC-003 (Understandable Instance Discovery & Duplicate-Free Transitions)**: The instance directory displays human-friendly labels, population counts, friend presence badges, and availability states; switching instances leaves `0` duplicate or ghost sessions in the old or new instance.
- **SC-004 (Persistent State Across Instances)**: 100% of player identity, Zoo Coins, food inventory, and Zoo Passport stamps/achievements/badges remain intact when switching instances or recovering from an instance failure.
- **SC-005 (Fault Isolation & Automatic Unhealthy Instance Recovery)**: Marking an instance `unhealthy` has zero impact on other running instances, prevents new joins to the unhealthy instance, and automatically migrates all connected sessions from the unhealthy instance into a healthy instance with a clear recovery notification.

