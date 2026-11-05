# Data Model: Food & Dining

**Feature**: `006-food-and-dining`  
**Date**: 2026-04-20

## 1. Food Catalog (`packages/game-core/src/dining/foodCatalog.ts`)

### `FoodItemId`
```ts
export type FoodItemId =
  | 'water'
  | 'bubble-tea'
  | 'ice-cream'
  | 'burger'
  | 'popcorn';
```

### `FoodItemCategory`
```ts
export type FoodItemCategory = 'food' | 'drink';
```

### `FoodCatalogItem`
```ts
export interface FoodCatalogItem {
  id: FoodItemId;
  name: string;
  category: FoodItemCategory;
  actionLabel: 'Eat' | 'Drink';
  gerundLabel: 'Eating' | 'Drinking';
  description: string;
  price: number;
  icon: string;
  durationMs: number;
  primaryColor: string;
  accentColor: string;
}
```

### Initial Catalog Table

| `id` | `name` | `category` | `price` | `icon` | `durationMs` | `description` |
|------|--------|------------|---------|--------|--------------|---------------|
| `water` | `Spring Water` | `drink` | `5` | `💧` | `5000` | `Chilled mountain spring water bottled fresh at the highland sanctuary.` |
| `popcorn` | `Caramel Zoo Popcorn` | `food` | `10` | `🍿` | `5000` | `Warm, crunchy golden popcorn glazed with sweet bamboo-honey caramel.` |
| `ice-cream` | `Panda Swirl Ice Cream` | `food` | `12` | `🍦` | `5000` | `Creamy vanilla and dark chocolate swirl served in a crispy waffle cone.` |
| `bubble-tea` | `Brown Sugar Bubble Tea` | `drink` | `15` | `🧋` | `5000` | `Silky roasted oolong milk tea with chewy brown sugar tapioca pearls.` |
| `burger` | `Bamboo Grove Burger` | `food` | `20` | `🍔` | `5000` | `Savory grilled garden patty with cheddar, crisp lettuce, and house sauce on brioche.` |

---

## 2. Player Dining Wallet & Persistence (`packages/game-core/src/dining/diningPersistence.ts`)

- **Storage Key**: `online-zoo:dining-wallet:v1`
- **Default Starting Balance**: `INITIAL_ZOO_COINS = 100`
- **Bounds**: `0 <= currencyBalance <= 9999`, `0 <= inventory[itemId] <= 99`

```ts
export interface PersistedDiningWallet {
  schemaVersion: 1;
  currencyBalance: number;
  inventory: Record<FoodItemId, number>;
  updatedAt: string;
}
```

---

## 3. Active Food Consumption & Store State (`packages/game-core/src/types.ts`)

```ts
export interface ActiveFoodConsumption {
  itemId: FoodItemId;
  label: string;
  category: FoodItemCategory;
  icon: string;
  startedAt: number;
  expiresAt: number;
}

export type FoodPurchaseErrorCode =
  | 'INVALID_ITEM'
  | 'INSUFFICIENT_FUNDS'
  | 'INVENTORY_FULL';

export type FoodConsumeErrorCode =
  | 'INVALID_ITEM'
  | 'ITEM_NOT_OWNED';

export interface DiningStoreSlice {
  wallet: PersistedDiningWallet;
  activeStallId: string | null;
  isInventoryOpen: boolean;
  localActiveConsumption: ActiveFoodConsumption | null;
  remoteActiveConsumptions: Record<string, ActiveFoodConsumption>;
  purchaseFeedback: {
    type: 'success' | 'error';
    message: string;
    code?: FoodPurchaseErrorCode | FoodConsumeErrorCode;
    timestamp: number;
  } | null;
}
```

---

## 4. World Stalls & Multi-Seat Dining Tables (`pandaForestLayout.ts`)

| Object ID | Title | Type | Position `[x, y, z]` | Seats |
|-----------|-------|------|----------------------|-------|
| `prop-plaza-food-stall` | `Plaza Refreshment Kiosk` | `open_food_stall` | `[-6.8, 0, 12.2]` | `0` |
| `prop-bamboo-tea-stall` | `Bamboo Tea & Snack Stall` | `open_food_stall` | `[9.8, 0, 3.8]` | `0` |
| `prop-plaza-cafe-table` | `Plaza Umbrella Dining Table` | `rest_bench` (`4` seats) | `[-3.8, 0, 12.6]` | `4` (`North`, `East`, `South`, `West`) |
| `prop-bamboo-picnic-table` | `Bamboo Grove Picnic Table` | `rest_bench` (`4` seats) | `[9.8, 0, 0.2]` | `4` (`West Front`, `West Back`, `East Front`, `East Back`) |

