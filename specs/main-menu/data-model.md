# Data Model: Pre-Game Main Menu (`main-menu`)

## 1. Main Menu Failure State (`MainMenuFailureState`)

```ts
export type MainMenuFailureKind =
  | 'server_unreachable'
  | 'room_full'
  | 'name_rejected';

export interface MainMenuFailureState {
  kind: MainMenuFailureKind;
  title: string;
  message: string;
  timestamp: number;
}
```

## 2. Occupancy Client (`packages/game-core/src/multiplayer/occupancyClient.ts`)

```ts
export function deriveOccupancyUrlFromWsUrl(wsUrl?: string): string;
export async function fetchServerOccupancy(
  wsUrl?: string,
  fetchImpl?: typeof fetch
): Promise<{
  ok: boolean;
  snapshot: ServerOccupancySnapshot | null;
  error?: string;
}>;
```

