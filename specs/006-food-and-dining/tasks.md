# Tasks: Food & Dining

**Input**: Design documents from `/specs/006-food-and-dining/`  
**Prerequisites**: [plan.md](file:///y:/Repos/online-zoo/specs/006-food-and-dining/plan.md), [spec.md](file:///y:/Repos/online-zoo/specs/006-food-and-dining/spec.md), [research.md](file:///y:/Repos/online-zoo/specs/006-food-and-dining/research.md), [data-model.md](file:///y:/Repos/online-zoo/specs/006-food-and-dining/data-model.md), [food-and-dining-protocol.md](file:///y:/Repos/online-zoo/specs/006-food-and-dining/contracts/food-and-dining-protocol.md)

## Phase 1: Setup & Foundational Domain Models

**Purpose**: Create the core food catalog, dining wallet persistence, TypeScript domain types, and protocol contracts in `@online-zoo/game-core`.

- [X] T001 Create food catalog (`water`, `bubble-tea`, `ice-cream`, `burger`, `popcorn`) and validation helpers in `packages/game-core/src/dining/foodCatalog.ts`
- [X] T002 Create persistent dining wallet (`online-zoo:dining-wallet:v1`, starting balance `100` Zoo Coins, bounds clamping) in `packages/game-core/src/dining/diningPersistence.ts` and barrel `packages/game-core/src/dining/index.ts`
- [X] T003 Extend shared types (`WorldPropReaction`, `ActiveFoodConsumption`, `DiningStoreSlice`, `PlayerSessionRecord`, `RemoteVisitorSummary`) in `packages/game-core/src/types.ts` and export from `packages/game-core/src/index.ts`
- [X] T004 Extend multiplayer WebSocket protocol (`purchase_food_item`, `consume_food_item`, `stop_consuming_food`, `food_purchase_result`, `food_consume_result`, `player_consumption_updated`) and parser in `packages/game-core/src/multiplayer/protocol.ts`

---

## Phase 2: User Story 1 & User Story 5 - Food Stalls & Multi-Seat Dining Tables in the 3D World (Priority: P1/P2)

**Goal**: Place interactive food stalls (`prop-plaza-food-stall`, `prop-bamboo-tea-stall`) and 4-seat communal dining tables (`prop-plaza-cafe-table`, `prop-bamboo-picnic-table`) in `pandaForestLayout.ts` and render their 3D models, seat indicators, and colliders in `InteractiveProps.tsx`.

**Independent Test**: Approach `prop-plaza-food-stall` or `prop-bamboo-tea-stall` to trigger `open_food_stall`, and approach `prop-plaza-cafe-table` or `prop-bamboo-picnic-table` (`4` seats each) to sit with up to 4 concurrent visitors.

- [X] T005 [US1] [US5] Add `prop-plaza-food-stall`, `prop-bamboo-tea-stall`, `prop-plaza-cafe-table` (4 seats), and `prop-bamboo-picnic-table` (4 seats) plus solid colliders to `packages/game-core/src/world/pandaForestLayout.ts`
- [X] T006 [US1] [US5] Render 3D food stalls and 4-seat dining tables with per-seat availability pads and Rapier colliders in `packages/game-client/src/environment/InteractiveProps.tsx`
- [X] T007 [US1] Wire `open_food_stall` interaction trigger in `packages/game-client/src/runtime/GameLoopController.tsx` and `packages/ui/src/InteractionPromptBanner.tsx`

---

## Phase 3: User Story 2 & User Story 3 - Authoritative Purchases, Idempotency & Persistent Inventory (Priority: P1)

**Goal**: Validate currency balance, idempotency `requestId`, and inventory ownership server-side in `ZooInstanceAuthority` and `apps/web/server.mjs`, synchronize state in `gameStore.ts` and `multiplayerClient.ts`, and persist across sessions.

**Independent Test**: Purchase affordable items, reject unaffordable items without deducting currency, deduplicate identical `requestId` packets, reject consuming unowned items, and persist wallet/inventory across reloads.

- [X] T008 [US2] [US3] Add `dining` state slice and actions (`openFoodStall`, `closeFoodStall`, `setInventoryOpen`, `applyDiningWalletUpdate`, `setPurchaseFeedback`, `setLocalActiveConsumption`, `setRemoteActiveConsumption`, `purchaseFoodItemOffline`, `consumeFoodItemOffline`) in `packages/game-core/src/state/gameStore.ts`
- [X] T009 [US2] [US3] Implement authoritative wallet tracking, idempotent `purchaseFoodItem`, validated `consumeFoodItem`, `stopConsumingFood`, and tick expiration in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts`
- [X] T010 [US2] [US3] Wire `purchase_food_item`, `consume_food_item`, and `stop_consuming_food` in `apps/web/src/server/multiplayerWsHub.ts` and `apps/web/server.mjs`
- [X] T011 [US2] [US3] Add client methods (`purchaseFoodItem`, `consumeFoodItem`, `stopConsumingFood`) and server message handlers in `packages/game-core/src/multiplayer/multiplayerClient.ts`

---

## Phase 4: User Story 4 - Eating & Drinking Animations & Responsive Dining UI (Priority: P2)

**Goal**: Render 3D handheld food/drink props and eating/drinking animations on local and remote avatars, and provide a responsive Food Stall Shop Modal, HUD Wallet/Inventory Drawer, and Active Consumption bar.

**Independent Test**: Consume an owned item and verify both local and remote avatars display the 3D handheld prop, eating/drinking arm motion, and overhead consumption badge while movement remains unlocked.

- [X] T012 [US4] Render 3D handheld food/drink props in `packages/game-client/src/entities/AvatarVisualRig.tsx` and eating/drinking procedural animation + overhead consumption badges in `packages/game-client/src/entities/PlayerAvatarEntity.tsx` and `packages/game-client/src/entities/RemotePlayerAvatar.tsx`
- [X] T013 [US1] [US2] [US3] [US4] Create `packages/ui/src/FoodAndDiningOverlay.tsx` (Food Stall Menu Modal, Inventory & Wallet Drawer, Active Consumption Pill with Finish button) and export from `packages/ui/src/index.ts`
- [X] T014 [US1] [US3] Add Zoo Coins balance badge and Food & Bag toggle button to `packages/ui/src/GameHudOverlay.tsx` and mount `FoodAndDiningOverlay` in `apps/web/src/components/ZooWorldExperience.tsx`

---

## Phase 5: Polish & Cross-Artifact Verification

**Purpose**: Verify unit tests, multi-client authority tests, TypeScript compiler checks (`strict: true`, `checkJs: true`, `exactOptionalPropertyTypes: true`), and Playwright E2E tests.

- [X] T015 Write unit and multi-client integration tests in `packages/game-core/__tests__/foodAndDining.test.ts` covering catalog, wallet persistence, authoritative purchase validation, idempotency, inventory consumption, and 4-seat dining tables
- [X] T016 Write Playwright E2E test in `apps/web/e2e/food-and-dining.spec.ts` verifying food stall browsing, purchases, insufficient balance handling, inventory persistence across reload, eating/drinking animations, and shared dining tables
- [X] T017 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E suite to achieve 100% convergence
