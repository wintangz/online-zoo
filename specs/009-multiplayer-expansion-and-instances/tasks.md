# Tasks: Multiplayer Expansion & Zoo Instances (`009-multiplayer-expansion-and-instances`)

**Input**: Design documents from `/specs/009-multiplayer-expansion-and-instances/`  
**Prerequisites**: [plan.md](file:///y:/Repos/online-zoo/specs/009-multiplayer-expansion-and-instances/plan.md), [spec.md](file:///y:/Repos/online-zoo/specs/009-multiplayer-expansion-and-instances/spec.md), [research.md](file:///y:/Repos/online-zoo/specs/009-multiplayer-expansion-and-instances/research.md), [data-model.md](file:///y:/Repos/online-zoo/specs/009-multiplayer-expansion-and-instances/data-model.md), [instance-management-protocol.md](file:///y:/Repos/online-zoo/specs/009-multiplayer-expansion-and-instances/contracts/instance-management-protocol.md)

## Phase 1: Setup & Foundational Domain Models

**Purpose**: Extend shared types, social persistence (`allowFriendJoin`), and multiplayer WebSocket protocol contracts in `@online-zoo/game-core`.

- [X] T001 Extend `ZooInstanceHealthStatus`, `InstancePlacementReason`, `ZooInstanceSummary` (`status`, `friendCount`, `isOverflow`), `ZooInstanceRoom` (`status`), `FriendStatusEntry` (`allowFriendJoin`, `roomStatus`), and `SocialStoreSlice` (`allowFriendJoin`) in `packages/game-core/src/types.ts`
- [X] T002 Extend `SocialPersistenceSnapshot` in `packages/game-core/src/social/socialPersistence.ts` to persist `allowFriendJoin: boolean` (default `true`) across browser sessions
- [X] T003 Extend multiplayer protocol (`SetSocialPrivacyMessage`, `ConfigureInstanceMessage`, `InstanceDirectoryUpdateMessage`, `INSTANCE_UNAVAILABLE` & `FRIEND_JOIN_DISABLED` error codes, and `preferFriendPlacement` / `allowFriendJoin` / `placementReason` / `placementNotice` on `join_instance` & `welcome_snapshot`) in `packages/game-core/src/multiplayer/protocol.ts`

---

## Phase 2: User Story 1, User Story 2, User Story 3 & User Story 4 - Store State & Server-Authoritative Instance Engine (Priority: P1/P2)

**Goal**: Implement friend-prioritized room allocation, capacity overflow, empty overflow pruning, duplicate session prevention, friend privacy enforcement, and automatic unhealthy instance failover in `ZooInstanceAuthority`, `gameStore.ts`, `multiplayerClient.ts`, `multiplayerWsHub.ts`, and `apps/web/server.mjs`.

- [X] T004 [US1] [US2] [US3] [US4] Implement friend-prioritized room selection (`selectAvailableRoom`), duplicate session purging (`purgeDuplicatePlayerSessions`), empty overflow pruning (`pruneEmptyOverflowRooms`), friend privacy (`setSocialPrivacy` & `FRIEND_JOIN_DISABLED`), and runtime instance capacity/health management with automatic failover evacuation (`configureInstance`) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts`
- [X] T005 [US2] [US3] [US4] Update `packages/game-core/src/state/gameStore.ts` to manage `allowFriendJoin` (`setAllowFriendJoin`) and surface `placementNotice` / instance directory updates
- [X] T006 [US1] [US2] [US3] [US4] Update `packages/game-core/src/multiplayer/multiplayerClient.ts` to send `preferFriendPlacement` & `allowFriendJoin` on join, expose `setSocialPrivacy` and `configureInstance`, and handle `instance_directory_update` and failover `welcome_snapshot` transitions
- [X] T007 [US1] [US2] [US3] [US4] Wire `set_social_privacy`, `configure_instance` (including multi-client failover evacuation broadcasts), and `instance_directory_update` in `apps/web/src/server/multiplayerWsHub.ts` and `apps/web/server.mjs`

---

## Phase 3: UI Discovery, Friend Privacy & Instance Management Controls (Priority: P1/P2)

**Goal**: Enhance the HUD instance indicator and the Social & Instances Drawer (`SocialInteractionOverlay.tsx`) with friend presence badges, prioritized instance sorting, friend-join privacy toggle, and instance capacity/health controls.

- [X] T008 [US2] [US3] [US4] Update `packages/ui/src/SocialInteractionOverlay.tsx` and `packages/ui/src/GameHudOverlay.tsx` to display prioritized friend counts per instance (`instance-friends-badge-<roomId>`), instance health status (`Healthy` / `Unavailable`), the "Allow Friends to Join My Instance" privacy toggle (`toggle-allow-friend-join-btn`), and instance capacity/health management controls (`instance-health-toggle-btn-<roomId>`, `instance-capacity-select-<roomId>`)

---

## Phase 4: Polish & Cross-Artifact Verification

**Purpose**: Verify unit tests, multi-client authority tests, TypeScript checks, and Playwright E2E tests.

- [X] T009 Write unit and multi-instance authority tests in `packages/game-core/__tests__/multiplayerInstancesExpansion.test.ts` covering concurrent instances, capacity overflow & empty overflow cleanup (`SC-001`), friend-prioritized entry & friend privacy (`SC-002`), duplicate-free session transitions (`SC-003`), persistent identity/wallet/passport state across instances (`SC-004`), and automatic unhealthy instance failover recovery (`SC-005`)
- [X] T010 Write multi-session Playwright E2E test in `apps/web/e2e/multiplayer-instances-expansion.spec.ts` verifying instance discovery, friend-prioritized placement & friend privacy (`FRIEND_JOIN_DISABLED`), capacity enforcement (`ROOM_FULL`), persistent state across instance switches, and automatic recovery when an instance becomes unhealthy
- [X] T011 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E suite to achieve 100% convergence

