# Research & Technical Decisions: Food & Dining

**Feature**: `006-food-and-dining`  
**Date**: 2026-04-20

## Decision 1: Authoritative Wallet & Idempotent Purchase Validation

- **Decision**:
  - Each player starts with `INITIAL_ZOO_COINS = 100` and `0` quantity of each food item when no persisted wallet exists in `localStorage` (`online-zoo:dining-wallet:v1`).
  - On `join_instance`, the client sends its sanitized `diningWallet` snapshot (`currencyBalance` clamped to `[0, 9999]`, `inventory` per item clamped to `[0, 99]`).
  - The authoritative server (`ZooInstanceAuthority` and `apps/web/server.mjs`) stores `currencyBalance`, `inventory`, and a `processedPurchaseRequestIds: Map<string, FoodPurchaseResultMessage>` on the player's session record (and preserves them across `resumableSessions` and `switchRoom`).
  - When `purchase_food_item` arrives with `{ itemId, requestId }`:
    1. If `requestId` is already in `processedPurchaseRequestIds`, return the cached `FoodPurchaseResultMessage` immediately without modifying `currencyBalance` or `inventory`.
    2. Validate `itemId` against `FOOD_CATALOG`.
    3. Verify `session.currencyBalance >= item.price` and `(session.inventory[itemId] ?? 0) < MAX_ITEM_STACK (99)`.
    4. If valid, deduct `item.price`, increment `session.inventory[itemId]`, cache the success result under `requestId`, and send `food_purchase_result` (`success: true`) to the buyer.
    5. If insufficient funds, return `food_purchase_result` (`success: false, errorCode: 'INSUFFICIENT_FUNDS'`) with unchanged balance and inventory.
- **Rationale**: Satisfies Constitution Principle III (server authority over currency, inventory, and purchases) and all purchase acceptance criteria (`FR-004`–`FR-006`, `SC-002`) while supporting offline/single-tab fallback and session persistence.
- **Alternatives Considered**:
  - Client-only currency deduction: Rejected because it violates Constitution Principle III.

## Decision 2: Server-Validated Consumption & Synchronized 3D Eating/Drinking State

- **Decision**:
  - When a player clicks `Eat` or `Drink` on an owned inventory item, the client sends `consume_food_item` (`{ itemId }`).
  - The server verifies `(session.inventory[itemId] ?? 0) > 0`. If `<= 0`, it returns `food_consume_result` (`success: false, errorCode: 'ITEM_NOT_OWNED'`).
  - On success, the server decrements `session.inventory[itemId]` by `1`, sets `session.activeConsumption = { itemId, label: item.name, category: item.category, icon: item.icon, startedAt: nowMs, expiresAt: nowMs + item.durationMs }`, sends `food_consume_result` (`success: true`) to the player, and broadcasts `player_consumption_updated` to all players in the room.
  - During `stepRoomTick(nowMs)`, any `activeConsumption` with `expiresAt <= nowMs` is automatically cleared. Players can also send `stop_consuming_food` to finish early.
  - Movement (`player_move`) does NOT cancel consumption unless the player explicitly clicks `Finish`, ensuring eating/drinking never locks movement (`FR-011`) and works while standing, walking, or seated at a dining table.
- **Rationale**: Ensures inventory cannot be spoofed, synchronizes eating/drinking visuals across all visitors in real time, and keeps movement completely unrestricted.

## Decision 3: 3D Food Stalls, Multi-Seat Dining Tables, and Handheld Avatar Props

- **Decision**:
  - Add 4 new entries to `PANDA_FOREST_INTERACTIVE_OBJECTS` in `pandaForestLayout.ts`:
    1. `prop-plaza-food-stall` ("Plaza Refreshment Kiosk", `[-6.8, 0, 12.2]`, `propReactionType: 'open_food_stall'`)
    2. `prop-bamboo-tea-stall` ("Bamboo Tea & Snack Stall", `[9.8, 0, 3.8]`, `propReactionType: 'open_food_stall'`)
    3. `prop-plaza-cafe-table` ("Plaza Umbrella Dining Table", `[-3.8, 0, 12.6]`, `propReactionType: 'rest_bench'`, `4` seats around the table)
    4. `prop-bamboo-picnic-table` ("Bamboo Grove Picnic Table", `[9.8, 0, 0.2]`, `propReactionType: 'rest_bench'`, `4` seats on opposing benches)
  - Render stylized 3D food stall kiosks (striped canopy roof, wooden counter, display treats, warm lantern glow) and 4-seat dining tables (tabletop, umbrella/picnic benches, and per-seat availability indicator pads) in `InteractiveProps.tsx` with matching solid colliders.
  - Extend `AvatarVisualRig.tsx` and `applyAvatarProceduralPose` in `PlayerAvatarEntity.tsx` to accept `activeConsumption`:
    - When `activeConsumption` is active, attach a stylized 3D food/drink prop mesh (water bottle, bubble tea cup with straw, ice cream cone, burger, or popcorn tub) to `rightArmRef` and animate `rightArm.rotation.x` / `rightArm.rotation.z` rhythmically raising the item toward the mouth while keeping legs responsive to sitting or walking.
- **Rationale**: Reuses the proven `InteractiveObjectDescriptor` + `seatStates` architecture from Feature 004 and procedural rig animation from Feature 003 with zero external asset bloat.

