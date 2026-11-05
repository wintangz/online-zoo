# Data Model: Multiplayer Expansion & Zoo Instances (`009-multiplayer-expansion-and-instances`)

## 1. Instance Health & Summary Entities (`packages/game-core/src/types.ts`)

```ts
export type ZooInstanceHealthStatus = 'healthy' | 'unhealthy';

export type InstancePlacementReason =
  | 'requested'
  | 'friend_priority'
  | 'overflow_redirect'
  | 'failover_recovery';

export interface ZooInstanceSummary {
  roomId: string;
  label: string;
  visitorCount: number;
  maxPlayers: number;
  isFull: boolean;
  status: ZooInstanceHealthStatus;
  friendCount?: number;
  isOverflow?: boolean;
}
```

## 2. Room State Extensions (`ZooInstanceRoom`)

```ts
export interface ZooInstanceRoom {
  roomId: string;
  maxPlayers: number;
  status?: ZooInstanceHealthStatus;
  nextVisitorNumber: number;
  activeSessions: Map<string, PlayerSessionRecord>;
  resumableSessions: Map<
    string,
    {
      record: PlayerSessionRecord;
      disconnectedAt: number;
      expiresAt: number;
    }
  >;
  propStates: Record<string, SharedPropAuthorityState>;
  seatStates: Record<string, WorldSeatOccupancyState[]>;
  recentChatHistory: ProximityChatMessage[];
  tickSequence: number;
  lastTickAt: number;
}
```

## 3. Friend Presence & Social Privacy Extensions (`FriendStatusEntry` & `SocialStoreSlice`)

```ts
export interface FriendStatusEntry {
  playerId: string;
  displayName: string;
  online: boolean;
  roomId: string | null;
  roomVisitorCount: number;
  roomMaxPlayers: number;
  canJoin: boolean;
  allowFriendJoin?: boolean;
  roomStatus?: ZooInstanceHealthStatus;
}

export interface SocialStoreSlice {
  // ...existing fields
  allowFriendJoin: boolean;
}
```

