# Data Model: HUD Declutter (`hud-declutter`)

## Client Store Additions (`packages/game-core/src/state/gameStore.ts`)

```ts
export interface GameStoreState {
  // ... existing fields ...
  isDevDebugOpen: boolean;
  isChatPanelOpen: boolean;
  setDevDebugOpen: (open: boolean) => void;
  toggleDevDebug: () => void;
  setChatPanelOpen: (open: boolean) => void;
  toggleChatPanel: () => void;
}
```

