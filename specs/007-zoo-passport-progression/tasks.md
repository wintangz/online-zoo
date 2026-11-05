# Tasks: Zoo Passport & Progression

**Input**: Design documents from `/specs/007-zoo-passport-progression/`  
**Prerequisites**: [plan.md](file:///y:/Repos/online-zoo/specs/007-zoo-passport-progression/plan.md), [spec.md](file:///y:/Repos/online-zoo/specs/007-zoo-passport-progression/spec.md), [research.md](file:///y:/Repos/online-zoo/specs/007-zoo-passport-progression/research.md), [data-model.md](file:///y:/Repos/online-zoo/specs/007-zoo-passport-progression/data-model.md), [passport-progression-protocol.md](file:///y:/Repos/online-zoo/specs/007-zoo-passport-progression/contracts/passport-progression-protocol.md)

## Phase 1: Setup & Foundational Domain Models

**Purpose**: Create the core Zoo Passport zone catalog, achievement catalog, persistence layer, exploration progress calculator, and shared TypeScript protocol contracts in `@online-zoo/game-core`.

- [X] T001 Create Zoo Passport zone catalog (`zone-welcome-plaza`, `zone-panda-sanctuary`, `zone-penguin-cove`, `zone-lotus-stream`, `zone-wind-chime-lookout`), achievement catalog (`ach-first-stamp`, `ach-world-explorer`, `ach-first-animal`, `ach-zoologist`, `ach-social-greeting`, `ach-keeper-helper`), and validation helpers in `packages/game-core/src/passport/passportCatalog.ts`
- [X] T002 Create persistent passport state (`online-zoo:passport-progression:v1`), proximity zone stamp evaluator (`evaluateProximityZoneStamp`), reactive achievement evaluator (`evaluatePassportAchievements`), reward claim helper, and overall exploration progress summary (`computePassportProgressSummary`) in `packages/game-core/src/passport/passportPersistence.ts` and barrel `packages/game-core/src/passport/index.ts`
- [X] T003 Extend shared types (`PassportStoreSlice`, `PassportToastNotification`, `PassportTabId`) in `packages/game-core/src/types.ts` and export `@online-zoo/game-core/src/passport` from `packages/game-core/src/index.ts`
- [X] T004 Extend multiplayer WebSocket protocol (`record_passport_progress`, `claim_achievement_reward`, `achievement_reward_result`, and `passportState` in `join_instance` / `welcome_snapshot`) and parser in `packages/game-core/src/multiplayer/protocol.ts`

---

## Phase 2: User Story 1, User Story 2 & User Story 4 - Passport State Slice, Zone Stamp Detection & Encyclopedia Integration (Priority: P1/P2)

**Goal**: Wire the `passport` state slice into `gameStore.ts`, connect natural 3D zone stamp proximity detection in `GameLoopController.tsx`, and synchronize species discoveries, social actions, and activities with passport achievements.

**Independent Test**: Walk into any of the 5 zoo zones or discover an animal species and verify the zone stamp and achievements update automatically in `gameStore` and persist to `localStorage`.

- [X] T005 [US1] [US2] [US4] Implement `passport` state slice and actions (`setPassportOpen`, `setPassportTab`, `recordZoneVisit`, `recordPassportSocialAction`, `recordPassportActivityCompleted`, `syncPassportWithEncyclopedia`, `applyPassportServerUpdate`, `claimAchievementRewardOffline`, `selectActivePassportBadge`, `dismissPassportToast`) in `packages/game-core/src/state/gameStore.ts`
- [X] T006 [US1] [US4] Add per-frame natural zone stamp proximity detection and `KeyP` keyboard shortcut to `packages/game-client/src/runtime/GameLoopController.tsx`

---

## Phase 3: User Story 3 - Server-Authoritative Progression & One-Time Reward Claiming (Priority: P1)

**Goal**: Validate passport progress and one-time achievement reward claims server-side in `ZooInstanceAuthority`, `apps/web/src/server/multiplayerWsHub.ts`, and `apps/web/server.mjs`, with `requestId` + `achievementId` idempotency protection so duplicate claims never grant extra Zoo Coins.

**Independent Test**: Unlock an achievement, claim its reward via `claim_achievement_reward`, verify Zoo Coins and badge are granted once, and verify duplicate requests with the same or new `requestId` never grant coins a second time.

- [X] T007 [US3] Implement authoritative passport tracking (`recordPassportProgress`, `claimAchievementReward` with `requestId` idempotency and `ACHIEVEMENT_LOCKED` / `ALREADY_CLAIMED` guards) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts`
- [X] T008 [US3] Wire `record_passport_progress` and `claim_achievement_reward` in `apps/web/src/server/multiplayerWsHub.ts` and `apps/web/server.mjs`
- [X] T009 [US3] Add client methods (`recordPassportProgress`, `claimAchievementReward`) and `achievement_reward_result` handler in `packages/game-core/src/multiplayer/multiplayerClient.ts`

---

## Phase 4: User Story 1, User Story 2, User Story 3 & User Story 4 - Zoo Passport UI Overlay & HUD Progress Visibility (Priority: P1/P2)

**Goal**: Build the responsive 3-tab Zoo Passport Modal (`Stamps`, `Encyclopedia`, `Achievements & Badges`), celebratory stamp/achievement toast notifications, and non-intrusive HUD progress indicator.

**Independent Test**: Open the Zoo Passport from the HUD, inspect obtained/unobtained zone stamps, review discovered/unknown animal species in the Encyclopedia tab, claim unlocked achievement rewards, equip a passport badge, and verify overall exploration percentage.

- [X] T010 [US1] [US2] [US3] [US4] Create `packages/ui/src/ZooPassportOverlay.tsx` (overall progress header, Zone Stamps grid with custom emblems, integrated Animal Encyclopedia tab, Achievements & Rewards tab with one-click Claim buttons, Badge selector, and discovery/unlock toast banner) and export from `packages/ui/src/index.ts`
- [X] T011 [US1] [US4] Add `hud-passport-btn` with exploration progress percentage, active passport badge pill, and unclaimed reward count indicator to `packages/ui/src/GameHudOverlay.tsx`, and mount `ZooPassportOverlay` in `apps/web/src/components/ZooWorldExperience.tsx`

---

## Phase 5: Polish & Cross-Artifact Verification

**Purpose**: Verify unit tests, multi-client authority tests, TypeScript compiler checks (`strict: true`, `checkJs: true`, `exactOptionalPropertyTypes: true`), and Playwright E2E tests.

- [X] T012 Write unit and multi-client integration tests in `packages/game-core/__tests__/passportProgression.test.ts` covering all 5 zone stamps, encyclopedia integration, all 6 achievements, server-authoritative reward claims, idempotency protection, and persistence
- [X] T013 Write Playwright E2E test in `apps/web/e2e/passport-progression.spec.ts` verifying passport stamp collection, encyclopedia review, achievement unlocking, one-time reward claiming, persistence across reload, and optional exploration progress visibility
- [X] T014 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E suite to achieve 100% convergence

