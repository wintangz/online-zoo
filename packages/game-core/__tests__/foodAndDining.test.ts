import { beforeEach, describe, expect, it } from 'vitest';
import {
  clampCurrencyBalance,
  createDefaultDiningWallet,
  createEmptyFoodInventory,
  DINING_WALLET_STORAGE_KEY,
  FOOD_CATALOG_BY_ID,
  FOOD_CONSUMPTION_DURATION_MS,
  gameStore,
  getFoodCatalogItem,
  getTotalOwnedFoodItems,
  INITIAL_FOOD_CATALOG,
  INITIAL_ZOO_COINS,
  InMemoryMultiplayerHub,
  isValidFoodItemId,
  loadPersistedDiningWallet,
  MAX_FOOD_ITEM_QUANTITY,
  MAX_ZOO_COINS,
  MultiplayerClient,
  PANDA_FOREST_INTERACTIVE_OBJECTS,
  resetMutableRuntimeState,
  sanitizeFoodInventory,
  savePersistedDiningWallet,
  VALID_FOOD_ITEM_IDS,
  ZooInstanceAuthority
} from '../src';

describe('Feature 006: Food & Dining (US1–US5, FR-001–FR-012, SC-001–SC-005)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    resetMutableRuntimeState();
    gameStore.getState().resetSession();
  });

  it('US1: defines the 5 initial food and drink items (Water, Bubble tea, Ice cream, Burger, Popcorn) with names, descriptions, and prices, plus interactive food stalls (FR-001..FR-003, SC-001)', () => {
    expect(INITIAL_FOOD_CATALOG.length).toBe(5);
    expect(VALID_FOOD_ITEM_IDS).toEqual([
      'water',
      'bubble-tea',
      'ice-cream',
      'burger',
      'popcorn'
    ]);

    expect(FOOD_CATALOG_BY_ID.water.price).toBe(5);
    expect(FOOD_CATALOG_BY_ID.water.category).toBe('drink');
    expect(FOOD_CATALOG_BY_ID.water.actionLabel).toBe('Drink');

    expect(FOOD_CATALOG_BY_ID.popcorn.price).toBe(10);
    expect(FOOD_CATALOG_BY_ID.popcorn.category).toBe('food');

    expect(FOOD_CATALOG_BY_ID['ice-cream'].price).toBe(12);
    expect(FOOD_CATALOG_BY_ID['ice-cream'].category).toBe('food');

    expect(FOOD_CATALOG_BY_ID['bubble-tea'].price).toBe(15);
    expect(FOOD_CATALOG_BY_ID['bubble-tea'].category).toBe('drink');
    expect(FOOD_CATALOG_BY_ID['bubble-tea'].gerundLabel).toBe('Drinking');

    expect(FOOD_CATALOG_BY_ID.burger.price).toBe(20);
    expect(FOOD_CATALOG_BY_ID.burger.category).toBe('food');
    expect(FOOD_CATALOG_BY_ID.burger.gerundLabel).toBe('Eating');

    for (const item of INITIAL_FOOD_CATALOG) {
      expect(item.name.length).toBeGreaterThan(3);
      expect(item.description.length).toBeGreaterThan(15);
      expect(item.price).toBeGreaterThan(0);
      expect(item.durationMs).toBe(FOOD_CONSUMPTION_DURATION_MS);
      expect(isValidFoodItemId(item.id)).toBe(true);
      expect(getFoodCatalogItem(item.id)).toBe(item);
    }
    expect(isValidFoodItemId('pizza')).toBe(false);

    // Verify food stalls are placed in Panda Forest layout (FR-001)
    const stalls = PANDA_FOREST_INTERACTIVE_OBJECTS.filter(
      (obj) => obj.propReactionType === 'open_food_stall'
    );
    expect(stalls.map((s) => s.id)).toEqual(
      expect.arrayContaining(['prop-plaza-food-stall', 'prop-bamboo-tea-stall'])
    );
  });

  it('US3: persists and sanitizes the player dining wallet (currency balance and food inventory) across sessions (FR-007, FR-009, SC-003)', () => {
    const mockStorageMap = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => mockStorageMap.get(key) ?? null,
      setItem: (key: string, val: string) => {
        mockStorageMap.set(key, val);
      }
    };

    const initialWallet = loadPersistedDiningWallet(mockStorage);
    expect(initialWallet.currencyBalance).toBe(INITIAL_ZOO_COINS);
    expect(initialWallet.inventory).toEqual(createEmptyFoodInventory());
    expect(getTotalOwnedFoodItems(initialWallet.inventory)).toBe(0);

    // Save updated wallet and reload
    savePersistedDiningWallet(
      {
        schemaVersion: 1,
        currencyBalance: 65,
        inventory: {
          water: 1,
          'bubble-tea': 2,
          'ice-cream': 0,
          burger: 0,
          popcorn: 0
        },
        updatedAt: '2026-11-05T11:30:00.000Z'
      },
      mockStorage
    );

    expect(mockStorageMap.has(DINING_WALLET_STORAGE_KEY)).toBe(true);
    const reloaded = loadPersistedDiningWallet(mockStorage);
    expect(reloaded.currencyBalance).toBe(65);
    expect(reloaded.inventory['bubble-tea']).toBe(2);
    expect(reloaded.inventory.water).toBe(1);
    expect(getTotalOwnedFoodItems(reloaded.inventory)).toBe(3);

    // Clamp out-of-bounds values
    expect(clampCurrencyBalance(-50)).toBe(0);
    expect(clampCurrencyBalance(99999)).toBe(MAX_ZOO_COINS);
    const clampedInv = sanitizeFoodInventory({
      water: 150,
      'bubble-tea': -4,
      burger: 3.9
    });
    expect(clampedInv.water).toBe(MAX_FOOD_ITEM_QUANTITY);
    expect(clampedInv['bubble-tea']).toBe(0);
    expect(clampedInv.burger).toBe(3);
  });

  it('US2 & US3: validates currency balance on purchase, prevents negative balances, and guarantees requestId idempotency so duplicate requests never double-charge (FR-004..FR-006, FR-008, SC-002, SC-003)', () => {
    const authority = new ZooInstanceAuthority();
    const now = 1_762_310_000_000;
    const joined = authority.joinOrResumePlayer({
      playerId: 'player-11111111-2222-4333-8444-555555555555',
      displayName: 'FoodieAlice',
      diningWallet: createDefaultDiningWallet(50),
      now
    });
    const sessionId = joined.welcome.sessionId;
    expect(joined.welcome.diningWallet?.currencyBalance).toBe(50);

    // 1. Valid purchase of Burger (20 coins) -> 30 coins left, 1 burger owned
    const buy1 = authority.purchaseFoodItem(
      sessionId,
      {
        type: 'purchase_food_item',
        requestId: 'req-burger-001',
        itemId: 'burger',
        stallId: 'prop-plaza-food-stall'
      },
      now + 100
    );
    expect(buy1.success).toBe(true);
    expect(buy1.currencyBalance).toBe(30);
    expect(buy1.inventory.burger).toBe(1);

    // 2. Duplicate request with the exact same requestId ('req-burger-001') MUST NOT charge again! (FR-006, SC-002)
    const duplicateBuy1 = authority.purchaseFoodItem(
      sessionId,
      {
        type: 'purchase_food_item',
        requestId: 'req-burger-001',
        itemId: 'burger',
        stallId: 'prop-plaza-food-stall'
      },
      now + 150
    );
    expect(duplicateBuy1.success).toBe(true);
    expect(duplicateBuy1.currencyBalance).toBe(30);
    expect(duplicateBuy1.inventory.burger).toBe(1);

    // 3. Buy Bubble Tea (15 coins) -> 15 coins left
    const buy2 = authority.purchaseFoodItem(
      sessionId,
      {
        type: 'purchase_food_item',
        requestId: 'req-boba-002',
        itemId: 'bubble-tea'
      },
      now + 200
    );
    expect(buy2.success).toBe(true);
    expect(buy2.currencyBalance).toBe(15);
    expect(buy2.inventory['bubble-tea']).toBe(1);

    // 4. Attempt to buy another Burger (costs 20, only 15 coins left) -> rejected with INSUFFICIENT_FUNDS, 0 coins deducted (FR-005, SC-002)
    const insufficientBuy = authority.purchaseFoodItem(
      sessionId,
      {
        type: 'purchase_food_item',
        requestId: 'req-burger-003',
        itemId: 'burger'
      },
      now + 300
    );
    expect(insufficientBuy.success).toBe(false);
    expect(insufficientBuy.errorCode).toBe('INSUFFICIENT_FUNDS');
    expect(insufficientBuy.currencyBalance).toBe(15);
    expect(insufficientBuy.inventory.burger).toBe(1);

    // 5. Attempt to consume an unowned item ('ice-cream', quantity 0) -> rejected with ITEM_NOT_OWNED (FR-008, SC-003)
    const unownedConsume = authority.consumeFoodItem(
      sessionId,
      {
        type: 'consume_food_item',
        itemId: 'ice-cream'
      },
      now + 400
    );
    expect(unownedConsume.result.success).toBe(false);
    expect(unownedConsume.result.errorCode).toBe('ITEM_NOT_OWNED');
    expect(unownedConsume.broadcast).toBeNull();
  });

  it('US4 & US5: synchronizes food consumption animations across connected visitors and supports up to 4 visitors sitting & dining together at shared tables (FR-010..FR-012, SC-004, SC-005)', async () => {
    const hub = new InMemoryMultiplayerHub();
    const clientA = new MultiplayerClient({
      transportFactory: hub.createTransportFactory()
    });
    const clientB = new MultiplayerClient({
      transportFactory: hub.createTransportFactory()
    });

    clientA.connect();
    clientB.connect();
    await new Promise((r) => setTimeout(r, 20));

    // Client A purchases Bubble Tea and consumes it
    const reqId = clientA.purchaseFoodItem('bubble-tea', 'req-sync-boba-1');
    expect(reqId).toBe('req-sync-boba-1');
    await new Promise((r) => setTimeout(r, 15));

    clientA.consumeFoodItem('bubble-tea');
    await new Promise((r) => setTimeout(r, 15));

    // Shared gameStore reflects remote player consumption broadcast (FR-010, SC-004)
    const sessionIdA = clientA.getSessionId()!;
    expect(sessionIdA).toBeTruthy();
    const remoteConsumptionOnStore =
      gameStore.getState().dining.remoteActiveConsumptions[sessionIdA];
    expect(remoteConsumptionOnStore?.itemId).toBe('bubble-tea');

    // Client A finishes consumption early -> consumption is cleared (FR-011)
    clientA.stopConsumingFood();
    await new Promise((r) => setTimeout(r, 15));
    expect(
      gameStore.getState().dining.remoteActiveConsumptions[sessionIdA]
    ).toBeUndefined();

    clientA.disconnect(true);
    clientB.disconnect(true);

    // Verify 4 visitors can sit around the same shared 4-seat dining table simultaneously (US5, FR-012, SC-005)
    const authority = new ZooInstanceAuthority();
    const baseTime = 1_762_320_000_000;
    const tableObj = PANDA_FOREST_INTERACTIVE_OBJECTS.find(
      (o) => o.id === 'prop-plaza-cafe-table'
    )!;
    expect(tableObj.seats).toHaveLength(4);

    const dinerSessions: string[] = [];
    for (let i = 0; i < 4; i++) {
      const conn = authority.joinOrResumePlayer({
        playerId: `player-0000000${i}-1111-4222-8333-444444444444`,
        displayName: `TableGuest${i + 1}`,
        now: baseTime + i * 10
      });
      dinerSessions.push(conn.welcome.sessionId);

      // Move near the Plaza Cafe Table so proximity check passes
      authority.processPlayerMove(
        conn.welcome.sessionId,
        {
          type: 'player_move',
          sequence: 1,
          position: [tableObj.position[0], 0.1, tableObj.position[2]],
          velocity: [0, 0, 0],
          facingYaw: 0,
          locomotionState: 'Idle',
          clientTimestamp: baseTime + 50
        },
        baseTime + 50
      );

      const sitRes = authority.processSeatInteraction(
        conn.welcome.sessionId,
        {
          type: 'interact_seat',
          objectId: 'prop-plaza-cafe-table',
          action: 'sit',
          preferredSeatIndex: i,
          clientTimestamp: baseTime + 100 + i
        },
        baseTime + 100 + i
      );
      expect(sitRes.accepted).toBe(true);
      expect(
        sitRes.seatUpdate?.seats.filter((s) => s.occupiedBySessionId !== null).length
      ).toBe(i + 1);
    }

    // While seated at the table, Guest 1 buys and eats Popcorn (US5, SC-005)
    const guest1 = dinerSessions[0]!;
    const buyPopcorn = authority.purchaseFoodItem(
      guest1,
      {
        type: 'purchase_food_item',
        requestId: 'req-table-popcorn',
        itemId: 'popcorn'
      },
      baseTime + 500
    );
    expect(buyPopcorn.success).toBe(true);

    const eatPopcorn = authority.consumeFoodItem(
      guest1,
      {
        type: 'consume_food_item',
        itemId: 'popcorn'
      },
      baseTime + 600
    );
    expect(eatPopcorn.result.success).toBe(true);
    expect(eatPopcorn.broadcast?.consumption?.itemId).toBe('popcorn');

    // Step room tick past 5-second consumption window -> activeConsumption automatically expires (FR-011)
    const tickAfterExpiry = authority.buildRoomTickSnapshot(
      'panda-forest-1',
      baseTime + 600 + FOOD_CONSUMPTION_DURATION_MS + 100
    );
    const guest1State = tickAfterExpiry?.players.find((p) => p.sessionId === guest1);
    expect(guest1State?.activeConsumption).toBeNull();
    expect(guest1State?.seatedOn?.objectId).toBe('prop-plaza-cafe-table');

    // Guest 1 stands up cleanly -> 3 of 4 seats remain occupied
    const standRes = authority.processSeatInteraction(
      guest1,
      {
        type: 'interact_seat',
        objectId: 'prop-plaza-cafe-table',
        action: 'stand',
        clientTimestamp: baseTime + 7000
      },
      baseTime + 7000
    );
    expect(standRes.accepted).toBe(true);
    expect(
      standRes.seatUpdate?.seats.filter((s) => s.occupiedBySessionId !== null).length
    ).toBe(3);
  });
});
