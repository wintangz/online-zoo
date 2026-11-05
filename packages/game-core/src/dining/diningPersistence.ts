import {
  VALID_FOOD_ITEM_IDS,
  type FoodItemId
} from './foodCatalog';

export const DINING_WALLET_STORAGE_KEY = 'online-zoo:dining-wallet:v1';
export const INITIAL_ZOO_COINS = 100;
export const MAX_ZOO_COINS = 9999;
export const MAX_FOOD_ITEM_QUANTITY = 99;

export type FoodInventoryRecord = Record<FoodItemId, number>;

export interface PersistedDiningWallet {
  schemaVersion: 1;
  currencyBalance: number;
  inventory: FoodInventoryRecord;
  updatedAt: string;
}

export function createEmptyFoodInventory(): FoodInventoryRecord {
  return {
    water: 0,
    'bubble-tea': 0,
    'ice-cream': 0,
    burger: 0,
    popcorn: 0
  };
}

export function createDefaultDiningWallet(
  initialCoins = INITIAL_ZOO_COINS
): PersistedDiningWallet {
  return {
    schemaVersion: 1,
    currencyBalance: clampCurrencyBalance(initialCoins),
    inventory: createEmptyFoodInventory(),
    updatedAt: new Date().toISOString()
  };
}

export function clampCurrencyBalance(val: unknown): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    return INITIAL_ZOO_COINS;
  }
  return Math.max(0, Math.min(MAX_ZOO_COINS, Math.floor(val)));
}

export function sanitizeFoodInventory(raw: unknown): FoodInventoryRecord {
  const clean = createEmptyFoodInventory();
  if (!raw || typeof raw !== 'object') {
    return clean;
  }
  const record = raw as Record<string, unknown>;
  for (const itemId of VALID_FOOD_ITEM_IDS) {
    const qty = record[itemId];
    if (typeof qty === 'number' && Number.isFinite(qty) && qty >= 0) {
      clean[itemId] = Math.min(MAX_FOOD_ITEM_QUANTITY, Math.floor(qty));
    }
  }
  return clean;
}

export function sanitizeDiningWalletSnapshot(raw: unknown): {
  currencyBalance: number;
  inventory: FoodInventoryRecord;
} {
  if (!raw || typeof raw !== 'object') {
    return {
      currencyBalance: INITIAL_ZOO_COINS,
      inventory: createEmptyFoodInventory()
    };
  }
  const obj = raw as Record<string, unknown>;
  return {
    currencyBalance:
      typeof obj.currencyBalance === 'number' && Number.isFinite(obj.currencyBalance)
        ? clampCurrencyBalance(obj.currencyBalance)
        : INITIAL_ZOO_COINS,
    inventory: sanitizeFoodInventory(obj.inventory)
  };
}

export function loadPersistedDiningWallet(
  storage?: Pick<Storage, 'getItem'>
): PersistedDiningWallet {
  const targetStorage =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!targetStorage) {
    return createDefaultDiningWallet();
  }
  try {
    const raw = targetStorage.getItem(DINING_WALLET_STORAGE_KEY);
    if (!raw) {
      return createDefaultDiningWallet();
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sanitized = sanitizeDiningWalletSnapshot(parsed);
    return {
      schemaVersion: 1,
      currencyBalance: sanitized.currencyBalance,
      inventory: sanitized.inventory,
      updatedAt:
        typeof parsed.updatedAt === 'string'
          ? parsed.updatedAt
          : new Date().toISOString()
    };
  } catch {
    return createDefaultDiningWallet();
  }
}

export function savePersistedDiningWallet(
  wallet: PersistedDiningWallet,
  storage?: Pick<Storage, 'setItem'>
): void {
  const targetStorage =
    storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!targetStorage) {
    return;
  }
  try {
    const payload: PersistedDiningWallet = {
      schemaVersion: 1,
      currencyBalance: clampCurrencyBalance(wallet.currencyBalance),
      inventory: sanitizeFoodInventory(wallet.inventory),
      updatedAt: wallet.updatedAt || new Date().toISOString()
    };
    targetStorage.setItem(DINING_WALLET_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

export function getTotalOwnedFoodItems(inventory: FoodInventoryRecord): number {
  let total = 0;
  for (const itemId of VALID_FOOD_ITEM_IDS) {
    total += inventory[itemId] ?? 0;
  }
  return total;
}

