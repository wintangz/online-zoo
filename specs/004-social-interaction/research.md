# Phase 0 Research: Social Interaction (Feature 004)

**Feature**: `004-social-interaction` | **Date**: 2026-11-05

## 1. Proximity Text Chat Range, Rate Limiting & Moderation

- **Decision**:
  - Implement server-authoritative proximity filtering in `ZooInstanceAuthority` and `apps/web/server.mjs` using a `24.0`-meter horizontal radius (`PROXIMITY_CHAT_RANGE_METERS = 24.0`) around the speaker's authoritative `[x, z]` position.
  - Validate chat messages (`1–140` trimmed characters) and filter prohibited/profane content on both client and server via `validateChatMessage(text)` in `packages/game-core/src/social/chatModeration.ts`, reusing the deterministic case-insensitive and leetspeak-normalized moderation engine established in Feature 003.
  - Enforce a sliding-window rate limiter (`ChatRateLimiter`) allowing at most `4` messages per `6,000ms` window with a minimum `1,000ms` cooldown between consecutive messages per session.
  - Render active messages (`6,000ms` TTL) as overhead 3D speech bubbles above `PlayerAvatarEntity` (`data-testid="local-speech-bubble"`) and `RemotePlayerAvatar` (`data-testid="remote-speech-bubble-{sessionId}"`) using `@react-three/drei` `<Html>`, while maintaining up to `50` recent messages in the HUD chat log (`data-testid="chat-message-list"`).
- **Rationale**:
  - Server-side distance filtering guarantees distant visitors (`> 24m`) never receive out-of-range chat packets (`FR-002`, `SC-001`), while dual client/server moderation and rate limiting satisfy Constitution Principle VI (Security and Player Safety).
- **Alternatives Considered**:
  - *Client-only range filtering*: Rejected because broadcasting all room messages to every client leaks out-of-range conversations and violates server authority.
  - *Global room chat*: Rejected because `FR-002` explicitly requires proximity-based communication.

## 2. Expressive Avatar Emotes & Instant Movement Cancellation

- **Decision**:
  - Provide a curated 5-emote catalog (`wave`, `dance`, `clap`, `laugh`, `sit`) in `packages/game-core/src/social/emoteCatalog.ts`.
  - Synchronize emotes via `trigger_emote` -> `player_emote_triggered` messages with a deterministic expiration timestamp (`startedAt + durationMs`).
  - Drive procedural 3D limb and torso animations inside `PlayerAvatarEntity` and `RemotePlayerAvatar` `useFrame` loops alongside an overhead emote badge (`data-testid="local-emote-badge"` / `data-testid="remote-emote-badge-{sessionId}"`).
  - Immediately cancel any active emote when directional movement or jump input is detected in `GameLoopController` (`< 16ms`) and when non-idle movement arrives at `ZooInstanceAuthority`.
- **Rationale**:
  - Procedural `useFrame` animations require zero extra GLB downloads, run at 60–120 Hz without React re-renders, and can be interrupted instantaneously on movement input (`FR-011`, `SC-004`).
- **Alternatives Considered**:
  - *Fixed-duration animation locks*: Rejected because `FR-011` requires that emotes never interrupt or lock normal gameplay unexpectedly.

## 3. Multi-Seat Benches, Chairs & World Object Interactions

- **Decision**:
  - Extend `InteractiveObjectDescriptor` in `packages/game-core/src/types.ts` with optional `seats?: WorldSeatSlotDescriptor[]` defining individual seat world coordinates and outward-facing yaw angles.
  - Configure two 2-seat park benches (`prop-plaza-bench` at `[-3.2, 0, 15.0]` near the entry plaza and `prop-scenic-bench` at `[-2.5, 0, -13.0]` at the habitat overlook, each with `2` distinct seats: Left Seat `0` and Right Seat `1`) plus a 1-seat viewing chair (`prop-pond-chair` at `[-0.8, 0, 1.5]`), alongside existing habitat plaques, stone lantern, and bamboo wind chime pavilion.
  - Track seat occupancy authoritatively per room (`room.seatStates`), assigning the requesting visitor to the first available seat slot (or rejecting with `SEAT_OCCUPIED` if full), snapping their avatar to the seat's world position and facing yaw, and automatically releasing the seat when the visitor stands up (`stand_up` button, `E` interact key, or `WASD`/`Space` movement) or disconnects.
- **Rationale**:
  - Authoritative per-slot occupancy prevents two players from overlapping on the same seat while allowing multiple visitors to sit side-by-side on the same bench simultaneously (`FR-013`–`FR-015`, `SC-005`).
- **Alternatives Considered**:
  - *Boolean toggle per bench*: Rejected because a single boolean cannot assign distinct seat positions to two simultaneous visitors or prevent seat stacking.

## 4. Persistent Friends List, Cross-Room Online Status & Instance Joining

- **Decision**:
  - Persist confirmed friendships and social preferences in `localStorage` (`online-zoo:social-state:v1`) and synchronize the player's friend graph with `ZooInstanceAuthority` / `server.mjs` upon joining.
  - Maintain a cross-room player presence directory in the multiplayer authority so connected players receive real-time `social_presence_update` payloads listing their confirmed friends' online status, active `roomId`, and room capacity (`visitorCount / maxPlayers`), as well as incoming and outgoing friend requests.
  - Support in-place instance switching via `join_friend_instance`: when a player requests to join an online friend's room, the authority verifies room capacity (`< maxPlayers`), cleanly removes the player from their current room (broadcasting `player_left` and releasing any occupied seat), and joins them directly into the friend's exact `roomId` (sending a fresh `welcome_snapshot` and broadcasting `player_joined` to the target room), or returns `ROOM_FULL` if the friend's instance is at capacity.
- **Rationale**:
  - In-place server room transition over the active connection avoids full page reloads, works identically in both `InMemoryMultiplayerHub` and WebSocket `server.mjs`, and enforces authoritative room capacity checks (`FR-017`–`FR-020`, `SC-006`).
- **Alternatives Considered**:
  - *Full browser `window.location.href` reload on instance join*: Rejected because in-session room switching is faster, preserves test/runtime handles, and updates URL query parameters cleanly via `history.replaceState`.

## 5. Accessible Player Safety Controls: Mute, Block & Structured Reporting

- **Decision**:
  - Expose 1-click/2-click safety actions (`Friend`, `Mute`/`Unmute`, `Block`/`Unblock`, `Report`) directly on each visitor entry in the HUD Social & Visitors drawer and next to sender names in the chat panel (`FR-024`, `SC-008`).
  - Filter chat messages, overhead speech bubbles, and emote badges on the client whenever `senderPlayerId` (or `senderSessionId`) is in `mutedPlayerIds` or `blockedPlayerIds`, and also enforce block rules on the server so blocked players cannot send friend requests or retain friendships (`FR-021`, `FR-022`, `SC-007`).
  - Capture structured moderation reports (`submit_player_report` -> `report_submitted_ack`) containing `reportId`, `reporterPlayerId`, `reportedPlayerId`, `reportedDisplayName`, `roomId`, `reason` (`inappropriate-chat` | `harassment-spam` | `offensive-name` | `other`), `details`, `createdAt`, and a server-captured snapshot of recent proximity chat messages from the reported visitor (`FR-023`, `SC-008`).
- **Rationale**:
  - Combining client-side rendering suppression with server-side block and report recording ensures immediate relief for the affected player and tamper-evident context for moderation review.
- **Alternatives Considered**:
  - *Placing safety controls inside the pause/settings modal*: Rejected because `FR-024` requires safety controls to be accessible without navigating complicated menus.

