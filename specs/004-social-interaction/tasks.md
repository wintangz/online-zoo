---
description: "Task list for Feature 004: Social Interaction"
---

# Tasks: Social Interaction (Feature 004)

**Input**: Design documents from `/specs/004-social-interaction/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/social-interaction.md](./contracts/social-interaction.md), [quickstart.md](./quickstart.md)

**Tests**: Automated Vitest unit/multi-client integration tests and Playwright end-to-end tests are included per Constitution Principle VII (Testing and Verification).

**Organization**: Tasks are grouped by user story (`US1`–`US5`) to enable independent implementation and verification of each vertical slice.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`, `[US5]`)
- Exact file paths and field constraints from `data-model.md` are quoted verbatim.

---

## Phase 1: Setup (Shared Social Types & Module Structure)

**Purpose**: Establish shared TypeScript domain types and module exports for proximity chat, emotes, multi-seat benches, friends, and player safety.

- [X] T001 Define Feature 004 social domain types (`ProximityChatMessage`, `ChatValidationResult`, `EmoteId` (`'wave' | 'dance' | 'clap' | 'laugh' | 'sit'`), `ActiveAvatarEmote`, `WorldSeatSlotDescriptor`, `WorldSeatOccupancyState`, `SeatedAttachmentState`, `FriendRequestRecord`, `FriendStatusEntry`, `ReportReason` (`'inappropriate-chat' | 'harassment-spam' | 'offensive-name' | 'other'`), `PlayerModerationReport`, `PersistedSocialProfile`, and `SocialStoreSlice`) in `packages/game-core/src/types.ts`
- [X] T002 [P] Create the `packages/game-core/src/social/index.ts` barrel module and re-export it from `packages/game-core/src/index.ts`

---

## Phase 2: Foundational (Core Social Catalogs, Persistence & Wire Protocol)

**Purpose**: Core validation, persistence, layout seat definitions, store slice, and wire protocol schemas that support all five user stories.

- [X] T003 [P] Implement `packages/game-core/src/social/chatModeration.ts` with `PROXIMITY_CHAT_RANGE_METERS = 24.0`, `MAX_CHAT_MESSAGE_LENGTH = 140`, `SPEECH_BUBBLE_DURATION_MS = 6000`, `CHAT_RATE_WINDOW_MS = 6000`, `CHAT_MAX_MESSAGES_PER_WINDOW = 4`, `CHAT_MIN_INTERVAL_MS = 1000`, `validateChatMessage` (`1..140` trimmed chars + case-insensitive/leetspeak profanity filter), and `ChatRateLimiter` (`FR-002`–`FR-007`)
- [X] T004 [P] Implement `packages/game-core/src/social/emoteCatalog.ts` defining `EMOTE_CATALOG` (`'wave'`, `'dance'`, `'clap'`, `'laugh'`, `'sit'`), `VALID_EMOTE_IDS`, `isValidEmoteId`, and `getEmoteDescriptor` (`FR-009`)
- [X] T005 [P] Implement `packages/game-core/src/social/socialPersistence.ts` with `SOCIAL_STATE_STORAGE_KEY = 'online-zoo:social-state:v1'`, `loadPersistedSocialState`, and `savePersistedSocialState` for durable `friends`, `mutedPlayerIds`, and `blockedPlayerIds` (`FR-018`, `FR-021`, `FR-022`)
- [X] T006 Extend `packages/game-core/src/world/pandaForestLayout.ts` to add `seats` (`WorldSeatSlotDescriptor[]`) on `prop-scenic-bench` (`2` seats), add `prop-plaza-bench` (`2` seats at `[-3.2, 0, 15.0]`), and add `prop-pond-chair` (`1` seat at `[-0.8, 0, 1.5]`) with corresponding solid obstacle colliders (`FR-012`–`FR-016`)
- [X] T007 Extend `packages/game-core/src/multiplayer/protocol.ts` and `parseClientMultiplayerMessage` with `send_chat_message`, `trigger_emote`, `interact_seat`, `send_friend_request`, `respond_friend_request`, `remove_friend`, `join_friend_instance`, `set_player_block`, `submit_player_report`, and server messages `proximity_chat_message`, `player_emote_triggered`, `seat_state_updated`, `social_presence_update`, and `report_submitted_ack`
- [X] T008 Extend `packages/game-core/src/state/gameStore.ts` with the `social` slice (`chatMessages`, `activeSpeechBubbles`, `activeEmotes`, `seatStates`, `localSeatedState`, `friends`, `incomingRequests`, `outgoingRequests`, `mutedPlayerIds`, `blockedPlayerIds`, `recentReports`, `feedbackBanner`, and actions)

**Checkpoint**: Foundation ready — user story implementation can now proceed.

---

## Phase 3: User Story 1 - Proximity Text Chat and Overhead Speech Bubbles (Priority: P1) 🎯 MVP

**Goal**: Enable proximity-based (`<= 24m`) text chat with `6`-second overhead 3D speech bubbles above speakers, a scrollable chat history panel, `140`-character length limit, anti-spam rate limiting (`4` msgs / `6s`, `1s` cooldown), profanity moderation, and movement key suppression while typing.

**Independent Test**: Connect two players within `24m`, send a valid chat message, verify overhead speech bubbles (`local-speech-bubble` and `remote-speech-bubble-{sessionId}`) and chat history entries; move beyond `24m` and verify out-of-range filtering; test rate limit and profanity rejection.

- [X] T009 [US1] Implement authoritative proximity chat handling (`processChatMessage` with `24.0m` horizontal distance check, `validateChatMessage`, `ChatRateLimiter`, and room chat log buffer) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` (`FR-001`–`FR-007`, `SC-001`, `SC-003`)
- [X] T010 [US1] Wire `sendChatMessage(text)` and incoming `proximity_chat_message` / chat `error_notice` handling in `packages/game-core/src/multiplayer/multiplayerClient.ts` (`FR-001`–`FR-007`)
- [X] T011 [P] [US1] Render `6`-second overhead 3D speech bubbles on `packages/game-client/src/entities/PlayerAvatarEntity.tsx` (`data-testid="local-speech-bubble"`) and `packages/game-client/src/entities/RemotePlayerAvatar.tsx` (`data-testid="remote-speech-bubble-{sessionId}"`), respecting mute/block filters (`FR-003`, `SC-002`)
- [X] T012 [US1] Create `packages/ui/src/SocialInteractionOverlay.tsx` (and export from `packages/ui/src/index.ts`) implementing the Proximity Chat panel (`data-testid="proximity-chat-panel"`, `data-testid="chat-message-list"`, `data-testid="chat-message-input"` with `maxLength={140}`, `data-testid="chat-send-btn"`, and `data-testid="chat-feedback-banner"`) with movement hotkey suppression while focused (`FR-001`, `FR-004`–`FR-008`)

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Expressive Avatar Emotes (Priority: P2)

**Goal**: Provide a 5-emote collection (`wave`, `dance`, `clap`, `laugh`, `sit`) with synchronized 3D avatar limb animations, overhead emote badges, and immediate cancellation upon movement or jump input.

**Independent Test**: Trigger each emote (`wave`, `dance`, `clap`, `laugh`, `sit`), verify local and remote avatar animation + overhead emote badge (`local-emote-badge` and `remote-emote-badge-{sessionId}`), then press a movement key and verify the emote cancels immediately (`< 50ms`).

- [X] T013 [US2] Implement authoritative emote triggering and movement-based cancellation (`processTriggerEmote` and automatic emote clear on non-idle `processPlayerMove`) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` and `packages/game-core/src/multiplayer/multiplayerClient.ts` (`FR-009`–`FR-011`, `SC-004`)
- [X] T014 [P] [US2] Add procedural 3D limb/torso emote animations (`wave`, `dance`, `clap`, `laugh`, `sit`) and overhead emote badges (`data-testid="local-emote-badge"` and `data-testid="remote-emote-badge-{sessionId}"`) in `packages/game-client/src/entities/PlayerAvatarEntity.tsx` and `packages/game-client/src/entities/RemotePlayerAvatar.tsx` (`FR-009`, `FR-010`)
- [X] T015 [US2] Add the 5-button Emote Picker Bar (`data-testid="emote-picker-bar"` with `emote-btn-wave`, `emote-btn-dance`, `emote-btn-clap`, `emote-btn-laugh`, `emote-btn-sit`) to `packages/ui/src/SocialInteractionOverlay.tsx` and cancel active emotes immediately on movement/jump input in `packages/game-client/src/runtime/GameLoopController.tsx` (`FR-009`–`FR-011`, `SC-004`)

**Checkpoint**: User Stories 1 and 2 are functional and testable.

---

## Phase 5: User Story 3 - Sitting on Benches and Interacting with World Objects (Priority: P3)

**Goal**: Allow visitors to sit side-by-side on multi-seat benches (`prop-plaza-bench`, `prop-scenic-bench`) and chairs (`prop-pond-chair`), see accurate seat availability/occupancy prompts (`2/2 seats free`, `1/2 seats free`, `Occupied`), and stand up cleanly via button or movement input.

**Independent Test**: Walk two visitors to `prop-plaza-bench`, have both sit down and verify they occupy `seatIndex: 0` and `seatIndex: 1` simultaneously without overlap; verify a third visitor sees `"Occupied"`; press `"Stand Up"` or move to vacate the seat.

- [X] T016 [US3] Implement authoritative multi-seat occupancy (`processSeatInteraction`, seat assignment, `SEAT_OCCUPIED` guard, and automatic seat release on movement or disconnect) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` and `packages/game-core/src/multiplayer/multiplayerClient.ts` (`FR-012`–`FR-015`, `SC-005`)
- [X] T017 [P] [US3] Render `prop-plaza-bench`, `prop-pond-chair`, and seat occupancy indicators in `packages/game-client/src/environment/InteractiveProps.tsx`, and render seated avatar posture (`legs bent forward`, `lowered hip offset`) in `packages/game-client/src/entities/PlayerAvatarEntity.tsx` and `packages/game-client/src/entities/RemotePlayerAvatar.tsx` (`FR-012`–`FR-016`)
- [X] T018 [US3] Update `packages/game-client/src/runtime/GameLoopController.tsx` and `packages/ui/src/InteractionPromptBanner.tsx` to display live seat availability (`"2/2 seats free"`, `"1/2 seats free"`, `"Occupied"`), trigger `sendSeatInteraction`, and provide a `"Stand Up"` control (`data-testid="stand-up-btn"`) (`FR-012`–`FR-015`, `SC-005`)

**Checkpoint**: User Stories 1, 2, and 3 are functional and testable.

---

## Phase 6: User Story 4 - Friends List, Online Status, and Joining a Friend's Instance (Priority: P4)

**Goal**: Enable sending, accepting, and rejecting friend requests, removing friends, viewing a persistent friends list with live cross-room online status, and joining an online friend's zoo instance when capacity permits.

**Independent Test**: Send a friend request from Visitor A to Visitor B, accept it on Visitor B, verify both see each other as `"Online"` with room info in their Friends list, test joining a friend's instance (and verify `"ROOM_FULL"` handling when at capacity), and test removing a friend.

- [X] T019 [US4] Implement cross-room player presence directory, friend request lifecycle (`send_friend_request`, `respond_friend_request`, `remove_friend`), and in-place instance switching (`join_friend_instance` with `ROOM_FULL` capacity check) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` and `packages/game-core/src/multiplayer/multiplayerClient.ts` (`FR-017`–`FR-020`, `SC-006`)
- [X] T020 [US4] Add the Friends & Nearby Visitors drawer (`data-testid="social-drawer-panel"`, `send-friend-request-btn-{playerId}`, `accept-friend-request-btn-{requestId}`, `reject-friend-request-btn-{requestId}`, `friend-item-{playerId}`, `friend-status-{playerId}`, `join-friend-btn-{playerId}`, `remove-friend-btn-{playerId}`) to `packages/ui/src/SocialInteractionOverlay.tsx` and add the toggle button (`data-testid="toggle-social-drawer-btn"`) to `packages/ui/src/GameHudOverlay.tsx` (`FR-017`–`FR-020`, `SC-006`)

**Checkpoint**: User Stories 1 through 4 are functional and testable.

---

## Phase 7: User Story 5 - Accessible Player Safety Controls: Mute, Block, and Report (Priority: P5)

**Goal**: Provide 2-click HUD access to Mute, Block, and Report controls that immediately suppress chat/speech bubbles/emotes/friend requests from muted or blocked players and record structured moderation reports with recent chat context.

**Independent Test**: Mute Visitor B and verify their chat/speech bubbles/emotes are hidden; Block Visitor B and verify friendship removal + friend request blocking; Report Visitor B with a reason and details and verify the captured `PlayerModerationReport` and confirmation banner (`data-testid="report-confirmation-banner"`).

- [X] T021 [US5] Implement server-side block enforcement (`set_player_block` removing friendships and blocking friend requests/chat) and structured moderation report capture (`submit_player_report` recording `reportId`, `reporterPlayerId`, `reportedPlayerId`, `reportedDisplayName`, `roomId`, `reason`, `details` (`<= 200` chars), `createdAt`, and `recentChatSnapshot`) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` and `packages/game-core/src/multiplayer/multiplayerClient.ts` (`FR-021`–`FR-024`, `SC-007`, `SC-008`)
- [X] T022 [US5] Add `Mute`/`Unmute` (`data-testid="mute-player-btn-{playerId}"`), `Block`/`Unblock` (`data-testid="block-player-btn-{playerId}"`), and `Report` (`data-testid="open-report-modal-btn-{playerId}"`, `data-testid="report-player-modal"`, `data-testid="report-reason-select"`, `data-testid="report-details-input"`, `data-testid="submit-report-btn"`, `data-testid="report-confirmation-banner"`) controls to `packages/ui/src/SocialInteractionOverlay.tsx` and mount `SocialInteractionOverlay` in `apps/web/src/components/ZooWorldExperience.tsx` (`FR-021`–`FR-024`, `SC-007`, `SC-008`)

---

## Phase 8: Server Synchronization, Automated Tests & Polish

**Purpose**: Synchronize `InMemoryMultiplayerHub`, `multiplayerWsHub.ts`, and standalone `apps/web/server.mjs` for all Feature 004 messages, expose runtime helpers, and verify with unit, integration, and Playwright E2E test suites.

- [X] T023 Route all Feature 004 multiplayer messages (`send_chat_message`, `trigger_emote`, `interact_seat`, `send_friend_request`, `respond_friend_request`, `remove_friend`, `join_friend_instance`, `set_player_block`, `submit_player_report`) across `InMemoryMultiplayerHub` in `packages/game-core/src/multiplayer/multiplayerClient.ts`, `apps/web/src/server/multiplayerWsHub.ts`, `apps/web/server.mjs`, and `packages/game-client/src/runtime/ZooGameCanvas.tsx`
- [X] T024 [P] Create comprehensive Vitest unit and multi-client integration tests in `packages/game-core/__tests__/socialInteraction.test.ts` covering proximity chat (`24m` range, `140`-char limit, rate limit, moderation), 5 emotes & movement cancellation, 2-seat benches & occupancy, friend requests/online status/instance join, and mute/block/report safety controls (`SC-001`–`SC-008`)
- [X] T025 Create Playwright end-to-end tests in `apps/web/e2e/social-interaction.spec.ts` and run full verification (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:e2e`) per `specs/004-social-interaction/quickstart.md`

---

## Phase 9: User Story 6 - Instance (Server) Selection, Tunable/Copiable Player ID & Background-Tab Resilience (`FR-025`–`FR-029`, `SC-009`–`SC-011`)

**Goal**: Provide a live Instance (Server) selector with population counts and 1-click room switching, make Player IDs selectable (`select-all`), 1-click copiable, and tunable/regeneratable, and ensure backgrounded tabs never lose remote players or break proximity chat.

**Independent Test**: Switch instances between `panda-forest-1`, `panda-forest-2`, and a custom room via `switchInstance`; tune and regenerate `playerId` and verify server synchronization; simulate a background tab pause (`> 8s` without `useFrame`) and verify background heartbeats + server auto-reactivation keep all visitors visible and proximity chat working.

- [X] T026 [US6] Define `ZooInstanceSummary` (`roomId`, `label`, `visitorCount`, `maxPlayers`), `switch_instance` client message, `availableInstances` in `welcome_snapshot` / `social_presence_update`, and `validateCustomPlayerId` / `tunePlayerId` / `regeneratePlayerId` actions in `packages/game-core/src/types.ts`, `packages/game-core/src/identity/identityPersistence.ts`, `packages/game-core/src/multiplayer/protocol.ts`, and `packages/game-core/src/state/gameStore.ts` (`FR-025`–`FR-028`)
- [X] T027 [US6] Implement authoritative instance directory & room switching (`getAvailableInstances`, `switchPlayerInstance`), background-tab heartbeat timer (`setInterval` in `MultiplayerClient`), and automatic session reactivation on still-open sockets in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts`, `packages/game-core/src/multiplayer/multiplayerClient.ts`, `apps/web/src/server/multiplayerWsHub.ts`, and `apps/web/server.mjs` (`FR-025`, `FR-026`, `FR-029`, `SC-009`, `SC-011`)
- [X] T028 [US6] Add Instance (Server) Selection UI, selectable (`select-all`) + 1-click Copy ID buttons, and Player ID Tuning / Regenerate controls in `packages/ui/src/GameHudOverlay.tsx`, `packages/ui/src/SocialInteractionOverlay.tsx`, and `packages/ui/src/AvatarCustomizerModal.tsx` (`FR-025`–`FR-028`, `SC-009`, `SC-010`)
- [X] T029 [US6] Add unit and integration tests in `packages/game-core/__tests__/socialInteraction.test.ts` covering instance directory & switching, Player ID tuning/regeneration, and background-tab timeout auto-recovery (`SC-009`–`SC-011`)
- [X] T030 [US6] Run full verification (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:e2e`) and mark all tasks converged

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: `T001`–`T002` — immediate start.
- **Phase 2 (Foundational)**: `T003`–`T008` — depends on Phase 1; blocks User Story phases.
- **Phase 3 (`US1` - Proximity Chat & Speech Bubbles)**: `T009`–`T012`.
- **Phase 4 (`US2` - Emotes)**: `T013`–`T015`.
- **Phase 5 (`US3` - Multi-Seat Benches & World Interactions)**: `T016`–`T018`.
- **Phase 6 (`US4` - Friends, Online Status & Instance Joining)**: `T019`–`T020`.
- **Phase 7 (`US5` - Safety: Mute, Block & Report)**: `T021`–`T022`.
- **Phase 8 (Server Sync & Verification)**: `T023`–`T025`.
