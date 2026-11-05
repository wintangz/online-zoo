# Data Model: Streamlined HUD & Entrance Gate Arrival (`011-hud-gate-ergonomics`)

## 1. `WorldLayoutConfig` (`packages/game-core/src/types.ts`)

```ts
export interface WorldLayoutConfig {
  zoneId: string;
  zoneTitle: string;
  spawnPosition: [number, number, number];
  spawnYaw: number;
  entranceGatePosition: [number, number, number];
  perimeterRadius: number;
  pond: {
    center: [number, number, number];
    radius: number;
  };
  obstacles: WorldObstacleCollider[];
  interactiveObjects: InteractiveObjectDescriptor[];
}
```

## 2. `GameStoreState` HUD Ergonomics Slice (`packages/game-core/src/types.ts`)

```ts
export interface GameStoreState {
  // ...existing slices
  isHudCompact: boolean;
  setHudCompact: (compact: boolean) => void;
  toggleHudCompact: () => void;
}
```

