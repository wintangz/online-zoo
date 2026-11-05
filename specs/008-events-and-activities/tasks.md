# Tasks: Events & Activities (`008-events-and-activities`)

**Input**: Design documents from `/specs/008-events-and-activities/`  
**Prerequisites**: [plan.md](file:///y:/Repos/online-zoo/specs/008-events-and-activities/plan.md), [spec.md](file:///y:/Repos/online-zoo/specs/008-events-and-activities/spec.md), [research.md](file:///y:/Repos/online-zoo/specs/008-events-and-activities/research.md), [data-model.md](file:///y:/Repos/online-zoo/specs/008-events-and-activities/data-model.md), [events-activities-protocol.md](file:///y:/Repos/online-zoo/specs/008-events-and-activities/contracts/events-activities-protocol.md)

## Phase 1: Setup & Foundational Domain Models

**Purpose**: Create the Zoo Events catalog, Seasonal Themes catalog, schedule validator, room event engine, and shared TypeScript types/protocol contracts in `@online-zoo/game-core`.

- [X] T001 Create Zoo Events catalog (`event-panda-feeding-gala`, `event-penguin-dive-show`, `event-guided-sanctuary-tour`, `event-plaza-group-photo`, `event-lantern-trivia-game`), Seasonal Themes catalog (`spring-blossom`, `summer-lantern`, `autumn-harvest`, `none`), and schedule configuration sanitizer (`sanitizeEventAdministrationConfig`) in `packages/game-core/src/events/eventsCatalog.ts`
- [X] T002 Create authoritative room event state engine (`RoomEventsEngine`: join/leave with `maxParticipants` & `EVENT_FULL`, shared progress contribution, late join/disconnect cleanup, runtime schedule patching, and persisted local participation helper) in `packages/game-core/src/events/eventsEngine.ts` and barrel `packages/game-core/src/events/index.ts`
- [X] T003 Extend shared types (`EventsStoreSlice`, `EventErrorCode`, `EventToastNotification`) in `packages/game-core/src/types.ts` and export `./events` from `packages/game-core/src/index.ts`
- [X] T004 Extend multiplayer WebSocket protocol (`join_zoo_event`, `leave_zoo_event`, `perform_event_action`, `claim_event_reward`, `configure_zoo_events`, `zoo_events_snapshot`, `event_reward_result`, and `zooEvents` in `welcome_snapshot`) in `packages/game-core/src/multiplayer/protocol.ts`

---

## Phase 2: User Story 1, User Story 2 & User Story 3 - Store State Slice & Server-Authoritative Event Management (Priority: P1)

**Goal**: Wire the `events` slice into `gameStore.ts` and implement authoritative multi-player event participation, capacity limits, disconnect cleanup, and one-time reward claiming (Zoo Coins + Passport Zone Stamp) in `ZooInstanceAuthority`, `multiplayerClient.ts`, `multiplayerWsHub.ts`, and `apps/web/server.mjs`.

- [X] T005 [US1] [US2] [US3] Implement `events` state slice and offline/online actions (`setEventsModalOpen`, `applyZooEventsSnapshot`, `applyEventRewardResult`, `joinZooEventOffline`, `leaveZooEventOffline`, `performEventActionOffline`, `claimEventActionOffline`, `configureZooEventsOffline`, `dismissEventToast`) in `packages/game-core/src/state/gameStore.ts`
- [X] T006 [US2] [US3] [US4] Implement authoritative room event handlers (`joinZooEvent`, `leaveZooEvent`, `performEventAction`, `claimEventReward` with `requestId` + `eventInstanceId` idempotency, `configureZooEvents`, and disconnect slot release) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts`
- [X] T007 [US1] [US2] [US3] [US4] Add client methods (`joinZooEvent`, `leaveZooEvent`, `performEventAction`, `claimEventReward`, `configureZooEvents`) and message handlers (`zoo_events_snapshot`, `event_reward_result`) in `packages/game-core/src/multiplayer/multiplayerClient.ts`
- [X] T008 [US2] [US3] [US4] Wire `join_zoo_event`, `leave_zoo_event`, `perform_event_action`, `claim_event_reward`, and `configure_zoo_events` in `apps/web/src/server/multiplayerWsHub.ts` and `apps/web/server.mjs`

---

## Phase 3: User Story 4 & UI Overlays - 3D Seasonal Decorations & Events UI Overlay (Priority: P1/P2)

**Goal**: Render toggleable seasonal decorations in the 3D world (`PandaForestScene.tsx`) and build the responsive `EventsAndActivitiesOverlay.tsx` and HUD indicators (`GameHudOverlay.tsx`).

- [X] T009 [US4] Render lightweight 3D seasonal decorations (`spring-blossom` cherry blossom arches & petals, `summer-lantern` festive floating lanterns, `autumn-harvest` golden maple garlands) in `packages/game-client/src/environment/PandaForestScene.tsx` and add `ESC` modal dismissal in `packages/game-client/src/runtime/GameLoopController.tsx`
- [X] T010 [US1] [US2] [US3] [US4] Create `packages/ui/src/EventsAndActivitiesOverlay.tsx` (event starting toast banner, active joined-event HUD tracker banner, Events & Activities modal with status badges, capacity indicators, shared progress bars, one-click Join/Contribute/Claim/Leave controls, and Seasonal Theme switcher) and export from `packages/ui/src/index.ts`
- [X] T011 [US1] [US4] Add `hud-events-btn` (`🎪 Events`) and `hud-seasonal-badge` to `packages/ui/src/GameHudOverlay.tsx` and mount `<EventsAndActivitiesOverlay />` in `apps/web/src/components/ZooWorldExperience.tsx`

---

## Phase 4: Polish & Cross-Artifact Verification

**Purpose**: Verify unit tests, multi-client authority tests, TypeScript checks, and Playwright E2E tests.

- [X] T012 Write unit and multi-client authority tests in `packages/game-core/__tests__/eventsAndActivities.test.ts` covering event discovery, participation capacity (`EVENT_FULL`), late join & disconnect cleanup, one-time reward claiming (Zoo Coins + Passport Stamp + idempotency), seasonal theme switching, and invalid schedule config rejection
- [X] T013 Write multi-session Playwright E2E test in `apps/web/e2e/events-and-activities.spec.ts` verifying event discovery, multi-player shared participation, capacity limit feedback, one-time reward & passport stamp claiming, seasonal theme toggling, and non-blocking exploration
- [X] T014 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E suite to achieve 100% convergence

