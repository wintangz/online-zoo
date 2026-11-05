# Protocol Contract: Food & Dining (`006-food-and-dining`)

**Transport**: WebSocket JSON frames (`<= 4096 bytes`)  
**Parser**: `parseClientMultiplayerMessage` in [`packages/game-core/src/multiplayer/protocol.ts`](file:///y:/Repos/online-zoo/packages/game-core/src/multiplayer/protocol.ts)  
**Authorities**: [`ZooInstanceAuthority`](file:///y:/Repos/online-zoo/packages/game-core/src/multiplayer/zooInstanceAuthority.ts) and [`apps/web/server.mjs`](file:///y:/Repos/online-zoo/apps/web/server.mjs)

---

## 1. Client-to-Server Messages

### 1.1 `join_instance` (Extended)
Includes optional persisted `diningWallet` so the server initializes the player's session balance and inventory within validated bounds (`0 <= currencyBalance <= 9999`, `0 <= quantity <= 99`):
```json
{
  "type": "join_instance",
  "roomId": "panda-forest-1",
  "playerId": "visitor-abc123",
  "diningWallet": {
    "currencyBalance": 100,
    "inventory": {
      "water": 0,
      "bubble-tea": 0,
      "ice-cream": 0,
      "burger": 0,
      "popcorn": 0
    }
  }
}
```

### 1.2 `purchase_food_item`
Requests an authoritative purchase of a catalog item with an idempotency `requestId`:
```json
{
  "type": "purchase_food_item",
  "itemId": "bubble-tea",
  "requestId": "buy-bubble-tea-1713600000000-1",
  "stallId": "prop-plaza-food-stall"
}
```

### 1.3 `consume_food_item`
Requests consumption of an owned item from the player's inventory:
```json
{
  "type": "consume_food_item",
  "itemId": "bubble-tea"
}
```

### 1.4 `stop_consuming_food`
Ends the player's active eating/drinking animation early:
```json
{
  "type": "stop_consuming_food"
}
```

---

## 2. Server-to-Client Messages

### 2.1 `food_purchase_result`
Sent to the purchasing client on both successful and failed purchases (and replayed identically for duplicate `requestId` packets):
```json
{
  "type": "food_purchase_result",
  "requestId": "buy-bubble-tea-1713600000000-1",
  "success": true,
  "itemId": "bubble-tea",
  "currencyBalance": 85,
  "inventory": {
    "water": 0,
    "bubble-tea": 1,
    "ice-cream": 0,
    "burger": 0,
    "popcorn": 0
  },
  "message": "Purchased Brown Sugar Bubble Tea (-15 Zoo Coins)!",
  "serverTimestamp": 1713600000100
}
```
On failure (e.g., insufficient balance):
```json
{
  "type": "food_purchase_result",
  "requestId": "buy-burger-1713600000002-1",
  "success": false,
  "itemId": "burger",
  "currencyBalance": 10,
  "inventory": {
    "water": 0,
    "bubble-tea": 0,
    "ice-cream": 0,
    "burger": 0,
    "popcorn": 0
  },
  "errorCode": "INSUFFICIENT_FUNDS",
  "message": "Not enough Zoo Coins for Bamboo Grove Burger (needs 20, you have 10).",
  "serverTimestamp": 1713600000200
}
```

### 2.2 `food_consume_result`
Sent to the consuming client to confirm updated inventory or report an error (`ITEM_NOT_OWNED`):
```json
{
  "type": "food_consume_result",
  "success": true,
  "itemId": "bubble-tea",
  "currencyBalance": 85,
  "inventory": {
    "water": 0,
    "bubble-tea": 0,
    "ice-cream": 0,
    "burger": 0,
    "popcorn": 0
  },
  "consumption": {
    "itemId": "bubble-tea",
    "label": "Brown Sugar Bubble Tea",
    "category": "drink",
    "icon": "🧋",
    "startedAt": 1713600005000,
    "expiresAt": 1713600010000
  },
  "serverTimestamp": 1713600005000
}
```

### 2.3 `player_consumption_updated`
Broadcast to all players in the instance room when a player starts or finishes consuming an item:
```json
{
  "type": "player_consumption_updated",
  "roomId": "panda-forest-1",
  "sessionId": "session-1",
  "playerId": "visitor-abc123",
  "consumption": {
    "itemId": "bubble-tea",
    "label": "Brown Sugar Bubble Tea",
    "category": "drink",
    "icon": "🧋",
    "startedAt": 1713600005000,
    "expiresAt": 1713600010000
  },
  "serverTimestamp": 1713600005000
}
```

### 2.4 `SerializedPlayerState` & `WelcomeSnapshotMessage` Extensions
- `SerializedPlayerState` includes optional `activeConsumption?: ActiveFoodConsumption | null`.
- `WelcomeSnapshotMessage` includes optional `diningWallet?: { currencyBalance: number; inventory: Record<FoodItemId, number> }`.

