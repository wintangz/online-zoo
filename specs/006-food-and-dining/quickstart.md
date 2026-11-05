# Quickstart: Food & Dining (`006-food-and-dining`)

## 1. Run Unit & Authority Tests

```bash
pnpm --filter @online-zoo/game-core test
```

Verifies:
- Initial food catalog (`water`, `bubble-tea`, `ice-cream`, `burger`, `popcorn`) and prices (`5`–`20` Zoo Coins).
- Authoritative `purchase_food_item` balance validation, insufficient funds rejection without currency deduction, and idempotent `requestId` deduplication.
- Persistent `online-zoo:dining-wallet:v1` serialization/deserialization and bounds clamping.
- Authoritative `consume_food_item` inventory decrement, unowned item rejection, and `player_consumption_updated` broadcast.
- Multi-seat dining tables (`prop-plaza-cafe-table` and `prop-bamboo-picnic-table`, `4` seats each) allowing multiple visitors to sit and dine together.

## 2. Run Playwright E2E Verification

```bash
pnpm --filter @online-zoo/web exec playwright test e2e/food-and-dining.spec.ts
```

Verifies:
- Visiting a food stall and browsing all 5 items with names, descriptions, and prices.
- Purchasing food/drinks with Zoo Coins, rejecting unaffordable purchases without deducting coins, and persisting wallet/inventory across reload.
- Consuming an owned item, rendering the eating/drinking animation and floating badge across connected visitors, and sitting together at a multi-seat dining table.

