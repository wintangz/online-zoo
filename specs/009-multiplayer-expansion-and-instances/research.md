# Research & Architecture Decisions: Multiplayer Expansion & Zoo Instances (`009-multiplayer-expansion-and-instances`)

## Decision 1: Smart Instance Allocation & Friend-Prioritized Placement (`FR-002`, `FR-003`, `FR-005`)
- **Context**: Players entering the zoo should be placed in an available healthy instance without manual effort, ideally alongside their online friends when possible, and routed to overflow instances when primary instances are full.
- **Decision**:
  - Add an optional `preferFriendPlacement?: boolean` flag (defaulting to `true` when the client connects without an explicit `?room=` URL override, or when `requestedRoomId === DEFAULT_ROOM_ID` and no manual room was pinned).
  - In `selectAvailableRoom(requestedRoomId, now, playerId, preferFriendPlacement)`:
    1. First sync any `friendPlayerIds` provided in `join_instance` so the authority knows the player's friends before selecting a room.
    2. If `preferFriendPlacement` is `true` and the player has online friends in any `healthy` room with `activeSessions.size < maxPlayers` where that friend has `allowFriendJoin !== false` and neither player has blocked the other, pick the room with the highest count of joinable online friends!
    3. Otherwise, if `requestedRoomId` is `healthy` and has `activeSessions.size < maxPlayers`, select `requestedRoomId`.
    4. If `requestedRoomId` is full or `unhealthy`, scan all preset public instances (`panda-forest-1`, `panda-forest-2`, `panda-forest-3`) and active overflow instances (`panda-forest-4`, ...) for the first `healthy` room with `activeSessions.size < maxPlayers`, creating a new numbered overflow instance (`panda-forest-N`) if all existing rooms are full.
    5. Include `placementReason?: 'requested' | 'friend_priority' | 'overflow_redirect' | 'failover_recovery'` and `placementNotice?: string` on `welcome_snapshot` so the UI immediately informs the player when they were placed with a friend or routed around a full/unavailable instance.

## Decision 2: Duplicate-Free Session Management & Empty Overflow Cleanup (`FR-006`, `FR-012`)
- **Context**: Rapid instance switching, reconnections, or multi-tab joins with the same `playerId` must never leave duplicate avatars in the old or new room, and temporary overflow instances should not clutter the directory once empty.
- **Decision**:
  - Create a helper `purgeDuplicatePlayerSessions(playerId, excludeSessionId, now)` in `ZooInstanceAuthority` that removes any stale active session with the same `playerId` (releasing seats and event slots) and returns any `PlayerLeftMessage` broadcasts needed.
  - Create a helper `pruneEmptyOverflowRooms(now)` that removes any room from `this.rooms` whose `roomId` is not in `DEFAULT_PUBLIC_INSTANCES` once `room.activeSessions.size === 0` and `room.resumableSessions.size === 0`.

## Decision 3: Friend-Join Privacy & Access Validation (`FR-009`, `FR-010`)
- **Context**: Players must be able to join friends when permitted and capacity allows, while respecting friend privacy settings.
- **Decision**:
  - Track `playerPrivacy = new Map<string, { allowFriendJoin: boolean }>()` in `ZooInstanceAuthority` (defaulting to `{ allowFriendJoin: true }`).
  - Add `set_social_privacy` client-to-server message (`{ type: 'set_social_privacy', allowFriendJoin: boolean }`) and persist `allowFriendJoin` in `localStorage` (`online-zoo:social-preferences:v1`).
  - In `buildSocialPresenceForPlayer`, include `allowFriendJoin: boolean` on each `FriendStatusEntry` and compute `canJoin = Boolean(activeSession && activeRoom && activeRoom.status !== 'unhealthy' && roomVisitorCount < roomMaxPlayers && friendAllowJoin)`.
  - In `joinFriendInstance`:
    - If target friend has `allowFriendJoin === false`, reject with `errorCode: 'FRIEND_JOIN_DISABLED'` and message `"This friend has set their instance privacy to Private (Friends Cannot Join)."`.
    - If target room has `status === 'unhealthy'`, reject with `errorCode: 'INSTANCE_UNAVAILABLE'` and message `"Friend's zoo instance is currently unavailable for maintenance."`.
    - If target room is full (`activeSessions.size >= maxPlayers`), reject with `errorCode: 'ROOM_FULL'`.

## Decision 4: Instance Health Isolation & Automatic Failover Recovery (`FR-004`, `FR-007`, `FR-008`, `SC-005`)
- **Context**: Instance capacity must be configurable at runtime, a failing/unhealthy instance must not affect other instances, and players in an unhealthy instance must be recovered to an available healthy instance with their identity, currency, inventory, and passport intact.
- **Decision**:
  - Add `status: 'healthy' | 'unhealthy'` to `ZooInstanceRoom` and `ZooInstanceSummary`.
  - Add `configure_instance` message (`{ type: 'configure_instance', roomId: string, maxPlayers?: number, status?: 'healthy' | 'unhealthy' }`) handled by `authority.configureInstance(sessionId, msg, now)`.
  - When `configureInstance` sets a room's `status` to `'unhealthy'`:
    1. Every session currently in that room is automatically migrated to a healthy available room via `selectAvailableRoom(DEFAULT_ROOM_ID, now, session.playerId, true, new Set([unhealthyRoomId]))`.
    2. Seat occupancy and event participation in the unhealthy room are cleanly released.
    3. Each migrated session receives a fresh `WelcomeSnapshotMessage` with `placementReason: 'failover_recovery'` and `placementNotice: 'Instance <oldRoomId> became unavailable. You were safely moved to <newRoomId> with all progress intact.'`, and the target room receives `PlayerJoinedMessage` broadcasts.
    4. All other instances continue running their animal simulations, events, and player ticks without interruption.

