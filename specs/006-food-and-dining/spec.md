# Feature Specification: Food & Dining

**Feature Branch**: `006-food-and-dining`  
**Created**: 2026-04-20  
**Status**: Completed (Converged)  
**Input**: User description: "Feature 006 — Food & Dining: Create a simple and enjoyable food experience that encourages visitors to spend time together in the zoo, introducing food stalls, purchasable food items (Water, Bubble tea, Ice cream, Burger, Popcorn), in-game currency, persistent inventory, eating/drinking animations visible to nearby visitors, and shared multi-seat dining tables."

## Clarifications

### Session 2026-04-20

- **Q1: How is player currency initialized and validated across sessions and the authoritative server?** → Each player receives a starting balance of `100 Zoo Coins` when no saved dining wallet exists in `localStorage` (`online-zoo:dining-wallet:v1`). When connecting to an instance, the client transmits its persisted dining wallet (`currencyBalance` and `inventory` counts, clamped to valid non-negative integer bounds: `0 <= currencyBalance <= 9999`, `0 <= quantity <= 99` per catalog item). The server (`ZooInstanceAuthority` and `apps/web/server.mjs`) maintains the authoritative balance and inventory for the active session, validates every `purchase_food_item` and `consume_food_item` request server-side, deduplicates `purchase_food_item` requests by `requestId`, and returns `dining_wallet_updated` / `food_purchase_result` events so the client persists the updated authoritative state back to `localStorage`.
- **Q2: What are the initial food & drink items, their prices, and consumption categories?** →
  - `water` ("Spring Water") — Drink, `5 Zoo Coins`, refreshing hydration bottle.
  - `popcorn` ("Caramel Zoo Popcorn") — Food, `10 Zoo Coins`, crunchy golden popcorn tub.
  - `ice-cream` ("Panda Swirl Ice Cream") — Food, `12 Zoo Coins`, vanilla-chocolate swirl cone.
  - `bubble-tea` ("Brown Sugar Bubble Tea") — Drink, `15 Zoo Coins`, iced milk tea with tapioca pearls.
  - `burger` ("Bamboo Grove Burger") — Food, `20 Zoo Coins`, warm toasted brioche burger.
- **Q3: Where are food stalls and multi-seat dining areas placed in the zoo?** →
  - **Plaza Refreshment Kiosk** (`prop-plaza-food-stall`) at `[-6.8, 0, 12.2]` near the Entrance Plaza, paired with a 4-seat **Plaza Cafe Table** (`prop-plaza-cafe-table`) at `[-3.8, 0, 12.6]` (`4` seats arranged around the circular umbrella table).
  - **Bamboo Tea & Snack Stall** (`prop-bamboo-tea-stall`) at `[11.8, 0, 5.6]` along the Bamboo Path overlooking the Panda Sanctuary and Penguin Cove, paired with a 4-seat **Bamboo Picnic Table** (`prop-bamboo-picnic-table`) at `[10.8, 0, 0.8]` (`4` seats on opposing wooden benches).
- **Q4: How do eating and drinking animations behave and synchronize across multiplayer?** → Consuming an owned item triggers an authoritative `activeConsumption` state (`itemId`, `category: 'food' | 'drink'`, `startedAtMs`, `expiresAtMs`, duration `5,000 ms`) on the player in the instance room and broadcasts `player_consumption_updated` to all visitors. Both local and remote avatars render a 3D handheld food/drink prop in their right hand, perform a rhythmic eating/drinking arm-to-mouth and head-nod animation, and display a floating consumption badge above their nameplate (e.g., `🧋 Drinking Brown Sugar Bubble Tea`). Players can consume items while standing, walking, or seated at a dining table/bench, and can finish early via a "Finish / Put Away" action (`stop_consuming_food`) or by starting movement if desired, though consumption never locks player movement.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Food Stalls in the Zoo (Priority: P1)

As a visitor exploring the zoo, I want to approach food stalls placed around the plaza and habitats and browse their menu of available food and drinks with clear names, descriptions, categories, and prices on both desktop and mobile.

**Why this priority**: Food stalls anchor the physical dining areas in the 3D world and provide the entry point for discovering and buying refreshments.

**Independent Test**: Walk near `prop-plaza-food-stall` or `prop-bamboo-tea-stall` (or click its interaction prompt / HUD Food Stall button when nearby) and verify the stall menu opens displaying all 5 initial items (`Water`, `Bubble tea`, `Ice cream`, `Burger`, `Popcorn`) with their names, descriptions, icons, and prices.

**Acceptance Scenarios**:

1. **Given** a visitor approaches within `3.6m` of a food stall (`prop-plaza-food-stall` or `prop-bamboo-tea-stall`), **When** the interaction prompt appears and the visitor presses `E` or taps the prompt, **Then** the Food Stall Menu modal opens displaying the stall name and all 5 available food and drink items with names, descriptions, and prices.
2. **Given** the Food Stall Menu is open on desktop or mobile, **When** an item exceeds the player's current currency balance, **Then** the item displays clear visual feedback indicating insufficient Zoo Coins.

---

### User Story 2 - Purchase Food & Drinks with In-Game Currency (Priority: P1)

As a player, I want to purchase food and drinks using my in-game Zoo Coins with strict server validation so that valid purchases deduct the exact price and add the item to my inventory, while failed or duplicate requests never overcharge me.

**Why this priority**: Reliable, authoritative purchase validation and idempotency are core functional and constitutional requirements (`Principle III: Multiplayer Correctness`).

**Independent Test**: Purchase an affordable item (e.g., `Water` for `5` coins or `Bubble tea` for `15` coins) and verify currency decreases by the exact price and inventory count increases by `1`; attempt a purchase exceeding current balance and verify currency is unchanged and an error message is shown; submit duplicate `requestId` packets and verify the player is charged only once.

**Acceptance Scenarios**:

1. **Given** a player has `100 Zoo Coins` and requests to buy `bubble-tea` (`15` coins) with `requestId: "req-1"`, **When** the server processes the purchase, **Then** the player's balance becomes `85 Zoo Coins`, their `bubble-tea` inventory count increments by `1`, and a purchase confirmation is displayed.
2. **Given** a player has `10 Zoo Coins` and attempts to buy `burger` (`20` coins), **When** the purchase request is evaluated, **Then** the purchase is rejected with `"insufficient_funds"`, the balance remains `10 Zoo Coins`, inventory is unchanged, and clear feedback is shown in the UI.
3. **Given** a network retry sends the same `purchase_food_item` `requestId` twice, **When** the server receives the duplicate `requestId`, **Then** it returns the cached result without deducting currency or incrementing inventory a second time.

---

### User Story 3 - View & Persist Inventory Across Sessions (Priority: P1)

As a player, I want to view my owned food and drinks in an accessible inventory bar/drawer, consume only items I own, and have my currency balance and remaining inventory persist across page reloads and sessions.

**Why this priority**: Persistent inventory ensures players keep items they bought and can carry snacks from a stall over to a dining table with friends.

**Independent Test**: Purchase two items, reload the page or reconnect to the zoo, and verify both the remaining currency balance and the purchased items remain in the player's inventory.

**Acceptance Scenarios**:

1. **Given** a player purchases `ice-cream` and `popcorn`, **When** they inspect the HUD Inventory bar/drawer, **Then** both items appear with their owned quantities and a `Consume` action button.
2. **Given** a player reloads the browser and re-enters the zoo, **When** the session initializes, **Then** their saved currency balance and unconsumed food/drink quantities are restored and synchronized with the instance authority.
3. **Given** a player has `0` of an item, **When** a `consume_food_item` request for that item is sent, **Then** the server rejects the request with `"item_not_owned"` and does not trigger consumption.

---

### User Story 4 - Eat and Drink with Multiplayer Animations (Priority: P2)

As a player, I want to consume owned food or drinks with an appropriate eating or drinking animation and 3D handheld item visible to both myself and nearby visitors, while retaining the ability to move or stop the interaction naturally.

**Why this priority**: Visible eating and drinking animations bring the social dining experience to life for groups of visitors hanging out together.

**Independent Test**: Consume an owned `bubble-tea` or `burger` and verify: (a) the owned quantity decrements by `1`, (b) the avatar holds the 3D item and plays an eating/drinking animation with a floating consumption indicator, (c) remote players in the same room receive `player_consumption_updated` and render the animation, and (d) the player can still walk or click "Finish" to end the animation early without locking movement.

**Acceptance Scenarios**:

1. **Given** a player owns at least `1` `burger`, **When** they click `Eat` / `Consume` on `burger`, **Then** their `burger` count decreases by `1`, their avatar displays a 3D burger prop in hand with an eating animation and floating status badge, and all connected visitors in the same instance see the animation.
2. **Given** a player is actively eating or drinking, **When** the consumption duration (`5,000 ms`) completes or the player clicks `Finish`, **Then** the consumption animation cleanly ends and the handheld prop is put away.
3. **Given** a player is actively eating or drinking, **When** they press movement keys (`WASD` / arrows / joystick), **Then** they can walk normally without movement being permanently or unexpectedly locked.

---

### User Story 5 - Share Multi-Seat Dining Tables with Visitors (Priority: P2)

As a visitor, I want to sit at multi-seat dining tables near food stalls, see how many seats are available, share the table with up to 3 other visitors simultaneously, eat or drink while seated, and stand up whenever I want.

**Why this priority**: Communal dining tables next to stalls encourage players to gather, chat, and eat together.

**Independent Test**: Have two players approach `prop-plaza-cafe-table` or `prop-bamboo-picnic-table`, verify both can sit in different seats at the same table simultaneously, verify seat availability updates (`2/4 seats free`), verify both can consume food/drinks while seated, and verify standing up frees the seat.

**Acceptance Scenarios**:

1. **Given** `prop-plaza-cafe-table` (`4` seats) has `1` seated visitor, **When** a second visitor approaches the table, **Then** the table displays `3/4 seats free` and allows the second visitor to sit at an unoccupied seat around the same table.
2. **Given** a player is seated at a dining table, **When** they consume an owned food or drink item from their inventory, **Then** their avatar remains seated at the table while performing the eating/drinking animation visible to tablemates.
3. **Given** a player is seated at a dining table, **When** they press `E`, click `Stand Up`, or provide movement input, **Then** they stand up smoothly and their seat becomes available for other visitors.

### Edge Cases

- **Insufficient currency balance**: Attempting to buy an item whose price exceeds `currencyBalance` returns an error (`"insufficient_funds"`), deducts `0` coins, and displays a clear notice in the stall UI.
- **Duplicate purchase packets (double-click / network retry)**: Re-sending the same `requestId` returns the existing purchase receipt without charging the player twice.
- **Consuming unowned item**: Attempting to consume an item with `quantity <= 0` returns `"item_not_owned"` and does not start an animation.
- **Consuming while already consuming**: Starting consumption of a new owned item replaces the active consumption animation with the newly consumed item cleanly.
- **Player disconnects while seated at a dining table and consuming**: Both their occupied table seat and active consumption state are automatically cleared for remaining visitors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The world MUST include interactive food stalls placed in appropriate social areas (`prop-plaza-food-stall` at the Entrance Plaza and `prop-bamboo-tea-stall` along the Bamboo Path).
- **FR-002**: Approaching and interacting with a food stall MUST open a desktop- and mobile-friendly Food Stall Menu displaying the initial catalog (`water`, `bubble-tea`, `ice-cream`, `burger`, `popcorn`) with item names, categories (`food` | `drink`), descriptions, and prices.
- **FR-003**: Players MUST have an in-game currency balance (`Zoo Coins`, initialized to `100` for new players) displayed in the HUD and stall menu.
- **FR-004**: The authoritative server (`ZooInstanceAuthority` and `apps/web/server.mjs`) MUST validate every `purchase_food_item` request against the catalog price and the player's server-tracked currency balance, deducting currency and adding to inventory ONLY when the purchase succeeds.
- **FR-005**: Failed purchases (such as insufficient balance or invalid `itemId`) MUST NOT deduct currency and MUST provide clear visual feedback to the player.
- **FR-006**: Purchase requests MUST include a client `requestId` and the server MUST enforce idempotency so duplicate requests never charge the player multiple times.
- **FR-007**: Players MUST be able to view their owned food and drink items and quantities in an accessible HUD Inventory interface and consume any owned item.
- **FR-008**: Consuming an owned item MUST be validated server-side, decrement the item's inventory quantity by `1`, and reject attempts to consume unowned items.
- **FR-009**: Player currency balance and inventory MUST persist across browser sessions (`localStorage` key `online-zoo:dining-wallet:v1`) and synchronize with the instance authority upon joining.
- **FR-010**: Consuming food or drinks MUST trigger an item-appropriate eating or drinking animation and 3D handheld visual prop on the player's avatar that is broadcast to and rendered for nearby visitors in the same instance.
- **FR-011**: Players MUST be able to finish or stop an eating/drinking animation early, and food consumption MUST NOT permanently lock player movement.
- **FR-012**: Multi-seat dining tables (`prop-plaza-cafe-table` and `prop-bamboo-picnic-table`, `4` seats each) MUST allow multiple visitors to sit around the same table simultaneously, display clear seat availability states, support eating/drinking while seated, and allow standing up at any time.

### Key Entities

- **`FoodCatalogItem`**: Static definition of a purchasable item (`id: FoodItemId`, `name`, `category: 'food' | 'drink'`, `description`, `price`, `icon`, `durationMs`, `primaryColor`, `accentColor`).
- **`PlayerDiningWallet`**: Per-player currency and inventory state (`currencyBalance: number`, `inventory: Record<FoodItemId, number>`, `updatedAt: string`).
- **`ActiveFoodConsumption`**: Active eating/drinking state synchronized across multiplayer (`itemId: FoodItemId`, `category: 'food' | 'drink'`, `startedAtMs: number`, `expiresAtMs: number`).
- **`WorldPropPlacement` (`category: 'stall' | 'table'`)**: Interactive 3D food stalls and multi-seat dining tables placed in `pandaForestLayout.ts`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors can approach either food stall, open the menu on desktop (`1280x720`) or mobile (`390x844`), and inspect all 5 initial food/drink items (`Water`, `Bubble tea`, `Ice cream`, `Burger`, `Popcorn`) with names, descriptions, and prices.
- **SC-002**: Valid purchases deduct the exact item price and increment inventory in `100%` of test cases, while insufficient-balance or duplicate-`requestId` requests deduct `0` extra coins in `100%` of test cases.
- **SC-003**: Purchased inventory and remaining currency balance persist across browser reloads with `100%` consistency.
- **SC-004**: Consuming an owned item decrements its quantity by `1` and broadcasts `player_consumption_updated` to all connected clients in the instance within `100ms` (local test harness), rendering the eating/drinking animation and badge without locking movement.
- **SC-005**: Up to `4` visitors can sit simultaneously around each multi-seat dining table (`prop-plaza-cafe-table` and `prop-bamboo-picnic-table`), consume items while seated, and stand up cleanly.

