import React from 'react';
import { useStore } from 'zustand';
import {
  FOOD_CATALOG_BY_ID,
  gameStore,
  getTotalOwnedFoodItems,
  INITIAL_FOOD_CATALOG,
  PANDA_FOREST_INTERACTIVE_OBJECTS,
  type FoodItemId
} from '@online-zoo/game-core';

function getRuntimeMultiplayerClient(): {
  purchaseFoodItem: (itemId: FoodItemId, requestId?: string, stallId?: string) => string;
  consumeFoodItem: (itemId: FoodItemId) => void;
  stopConsumingFood: () => void;
} | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    __ONLINE_ZOO_RUNTIME__?: {
      multiplayerClient?: {
        purchaseFoodItem: (itemId: FoodItemId, requestId?: string, stallId?: string) => string;
        consumeFoodItem: (itemId: FoodItemId) => void;
        stopConsumingFood: () => void;
      };
    };
  };
  return w.__ONLINE_ZOO_RUNTIME__?.multiplayerClient ?? null;
}

export const FoodAndDiningOverlay: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const wallet = useStore(gameStore, (s) => s.dining.wallet);
  const activeStallId = useStore(gameStore, (s) => s.dining.activeStallId);
  const isInventoryOpen = useStore(gameStore, (s) => s.dining.isInventoryOpen);
  const localActiveConsumption = useStore(gameStore, (s) => s.dining.localActiveConsumption);
  const purchaseFeedback = useStore(gameStore, (s) => s.dining.purchaseFeedback);
  const localSeatedState = useStore(gameStore, (s) => s.social.localSeatedState);

  const openFoodStall = useStore(gameStore, (s) => s.openFoodStall);
  const closeFoodStall = useStore(gameStore, (s) => s.closeFoodStall);
  const setInventoryOpen = useStore(gameStore, (s) => s.setInventoryOpen);

  if (phase !== 'playing') {
    return null;
  }

  const totalOwned = getTotalOwnedFoodItems(wallet.inventory);
  const stallDescriptor = activeStallId
    ? PANDA_FOREST_INTERACTIVE_OBJECTS.find((o) => o.id === activeStallId)
    : null;
  const stallTitle = stallDescriptor?.title ?? 'Plaza Refreshment Kiosk';

  const handleBuyItem = (itemId: FoodItemId) => {
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.purchaseFoodItem(itemId, undefined, activeStallId ?? 'prop-plaza-food-stall');
    } else {
      gameStore.getState().purchaseFoodItemOffline(itemId);
    }
  };

  const handleConsumeItem = (itemId: FoodItemId) => {
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.consumeFoodItem(itemId);
    } else {
      gameStore.getState().consumeFoodItemOffline(itemId);
    }
  };

  const handleStopConsuming = () => {
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.stopConsumingFood();
    } else {
      gameStore.getState().setLocalActiveConsumption(null);
    }
  };

  return (
    <>
      {/* 1. Active Eating / Drinking Status Pill (FR-010, FR-011) */}
      {localActiveConsumption && (
        <div
          data-testid="active-consumption-pill"
          data-food-item={localActiveConsumption.itemId}
          className="pointer-events-none fixed inset-x-0 bottom-44 z-30 flex justify-center px-4"
        >
          <div className="pointer-events-auto inline-flex items-center gap-3 rounded-2xl border border-lime-300/60 bg-emerald-950/92 px-4 py-2.5 text-white shadow-2xl backdrop-blur-md">
            <span className="text-xl">{localActiveConsumption.icon}</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-lime-300">
                {FOOD_CATALOG_BY_ID[localActiveConsumption.itemId].gerundLabel}
                {localSeatedState ? ' at Table' : ''}
              </span>
              <span className="text-sm font-bold text-white">
                {localActiveConsumption.label}
              </span>
            </div>
            <button
              type="button"
              data-testid="stop-consumption-btn"
              onClick={handleStopConsuming}
              className="ml-2 rounded-xl border border-white/25 bg-white/15 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/25"
            >
              Finish
            </button>
          </div>
        </div>
      )}

      {/* 2. Player Food & Drink Inventory Drawer (FR-007, FR-008, FR-009) */}
      {isInventoryOpen && (
        <div
          data-testid="food-inventory-drawer"
          className="pointer-events-auto fixed right-4 top-16 z-30 max-h-[60vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-amber-300/40 bg-emerald-950/95 p-5 text-white shadow-2xl backdrop-blur-lg sm:right-6 sm:top-20 sm:max-h-[80vh]"
        >
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-amber-200">
                🎒 Food &amp; Drink Bag
              </h2>
              <p className="text-xs text-emerald-200/85">
                Owned items: <strong>{totalOwned}</strong> • Persists across visits
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                data-testid="inventory-currency-balance"
                className="inline-flex items-center gap-1 rounded-xl border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 text-xs font-extrabold text-amber-200"
              >
                🪙 {wallet.currencyBalance} Coins
              </span>
              <button
                type="button"
                data-testid="close-food-inventory-btn"
                onClick={() => setInventoryOpen(false)}
                className="rounded-xl bg-white/10 px-2.5 py-1 text-xs font-bold text-emerald-100 hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>

          {purchaseFeedback && (
            <div
              data-testid="inventory-feedback-banner"
              className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
                purchaseFeedback.type === 'error'
                  ? 'border-rose-400/50 bg-rose-950/80 text-rose-200'
                  : 'border-emerald-400/50 bg-emerald-900/80 text-emerald-100'
              }`}
            >
              {purchaseFeedback.message}
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2.5">
            {INITIAL_FOOD_CATALOG.map((item) => {
              const count = wallet.inventory[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  data-testid={`inventory-item-row-${item.id}`}
                  className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/5 px-3.5 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{item.name}</p>
                      <p className="text-[11px] text-emerald-300/90">
                        Owned:{' '}
                        <span
                          data-testid={`inventory-item-count-${item.id}`}
                          className="font-extrabold text-amber-300"
                        >
                          {count}
                        </span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid={`consume-food-btn-${item.id}`}
                    disabled={count <= 0}
                    onClick={() => handleConsumeItem(item.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      count > 0
                        ? 'bg-amber-400 text-emerald-950 shadow hover:bg-amber-300 active:scale-95'
                        : 'cursor-not-allowed bg-white/10 text-white/40'
                    }`}
                  >
                    {item.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-between border-t border-white/15 pt-3">
            <button
              type="button"
              data-testid="open-food-stall-from-bag-btn"
              onClick={() => {
                setInventoryOpen(false);
                openFoodStall('prop-plaza-food-stall');
              }}
              className="w-full rounded-xl border border-amber-300/50 bg-amber-500/20 px-3 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30"
            >
              🏪 Browse Food Stall Menu
            </button>
          </div>
        </div>
      )}

      {/* 3. Food Stall Menu Modal (FR-001 through FR-006) */}
      {activeStallId && (
        <div
          data-testid="food-stall-modal"
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
        >
          <div className="flex max-h-[60vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-amber-300/45 bg-emerald-950/95 text-white shadow-2xl sm:max-h-[85vh]">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-emerald-900/60 px-5 py-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-amber-300">
                  Zoo Food &amp; Refreshments
                </p>
                <h2
                  data-testid="food-stall-title"
                  className="text-lg font-extrabold tracking-tight text-white sm:text-xl"
                >
                  🏪 {stallTitle}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <div
                  data-testid="stall-currency-balance"
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-400/50 bg-amber-500/20 px-3.5 py-1.5 text-sm font-black text-amber-200"
                >
                  <span>🪙</span>
                  <span>{wallet.currencyBalance} Zoo Coins</span>
                </div>
                <button
                  type="button"
                  data-testid="close-food-stall-btn"
                  onClick={closeFoodStall}
                  className="rounded-2xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
                >
                  Close (ESC)
                </button>
              </div>
            </div>

            {/* Feedback Banner */}
            {purchaseFeedback && (
              <div
                data-testid="food-purchase-feedback"
                data-feedback-type={purchaseFeedback.type}
                data-feedback-code={purchaseFeedback.code ?? ''}
                className={`mx-5 mt-4 rounded-2xl border px-4 py-2.5 text-xs font-bold ${
                  purchaseFeedback.type === 'error'
                    ? 'border-rose-400/60 bg-rose-950/85 text-rose-200'
                    : 'border-emerald-400/60 bg-emerald-900/85 text-emerald-100'
                }`}
              >
                {purchaseFeedback.message}
              </div>
            )}

            {/* Menu Catalog Grid */}
            <div className="grid grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
              {INITIAL_FOOD_CATALOG.map((item) => {
                const ownedCount = wallet.inventory[item.id] ?? 0;
                const canAfford = wallet.currencyBalance >= item.price;

                return (
                  <div
                    key={item.id}
                    data-testid={`stall-item-card-${item.id}`}
                    data-can-afford={String(canAfford)}
                    className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                      canAfford
                        ? 'border-white/15 bg-white/5 hover:border-amber-300/45'
                        : 'border-rose-400/30 bg-rose-950/25'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{item.icon}</span>
                          <div>
                            <h3
                              data-testid={`stall-item-name-${item.id}`}
                              className="text-sm font-extrabold text-white"
                            >
                              {item.name}
                            </h3>
                            <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                              {item.category}
                            </span>
                          </div>
                        </div>
                        <span
                          data-testid={`stall-item-price-${item.id}`}
                          className={`rounded-xl px-2.5 py-1 text-xs font-black ${
                            canAfford
                              ? 'bg-amber-400/20 text-amber-300'
                              : 'bg-rose-500/25 text-rose-200'
                          }`}
                        >
                          {item.price} Coins
                        </span>
                      </div>

                      <p
                        data-testid={`stall-item-desc-${item.id}`}
                        className="mt-2 text-xs leading-relaxed text-emerald-100/85"
                      >
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                      <div className="flex flex-col">
                        <span
                          data-testid={`stall-item-owned-${item.id}`}
                          className="text-[11px] font-semibold text-emerald-300"
                        >
                          In Bag: <strong>{ownedCount}</strong>
                        </span>
                        {!canAfford && (
                          <span
                            data-testid={`insufficient-coins-badge-${item.id}`}
                            className="text-[10px] font-bold text-rose-300"
                          >
                            Insufficient Zoo Coins
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {ownedCount > 0 && (
                          <button
                            type="button"
                            data-testid={`stall-consume-btn-${item.id}`}
                            onClick={() => handleConsumeItem(item.id)}
                            className="rounded-xl border border-lime-300/50 bg-lime-500/20 px-3 py-1.5 text-xs font-bold text-lime-200 transition hover:bg-lime-500/35"
                          >
                            {item.actionLabel} ({ownedCount})
                          </button>
                        )}

                        <button
                          type="button"
                          data-testid={`buy-food-btn-${item.id}`}
                          onClick={() => handleBuyItem(item.id)}
                          className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition active:scale-95 ${
                            canAfford
                              ? 'bg-amber-400 text-emerald-950 shadow hover:bg-amber-300'
                              : 'border border-rose-400/40 bg-rose-950/60 text-rose-200 hover:bg-rose-900/70'
                          }`}
                        >
                          Buy ({item.price} 🪙)
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

