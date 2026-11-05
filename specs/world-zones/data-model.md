# Data Model: World Zones & Entrance Lobby (`world-zones`)

## 1. `WorldZoneDescriptor` & `ZoneGateLink` (`@online-zoo/game-core`)

```ts
export type WorldZoneId = 'zoo-lobby' | 'panda-forest';
export type WorldSceneId = 'zoo-lobby' | 'panda-forest';

export interface ZoneGateLink {
  gateId: string;
  targetZoneId: WorldZoneId;
  targetZoneDisplayName: string;
  targetRoomId: string;
  pairedGateId: string;
  promptText: string;
  position: [number, number, number];
  triggerRadius: number;
  arrivalPosition: [number, number, number];
  arrivalYaw: number;
}

export interface WorldZoneDescriptor {
  zoneId: WorldZoneId;
  displayName: string;
  badgeIcon: string;
  roomId: string;
  sceneId: WorldSceneId;
  spawnPoint: [number, number, number];
  spawnYaw: number;
  hasAnimals: boolean;
  gateLinks: ZoneGateLink[];
  layout: PandaForestLayoutConfig;
}
```

## 2. `FriendStatusEntry` Extension (`@online-zoo/game-core`)

```ts
export interface FriendStatusEntry {
  playerId: string;
  displayName: string;
  online: boolean;
  roomId: string | null;
  zoneId?: WorldZoneId | null;
  zoneDisplayName?: string | null;
  roomVisitorCount: number;
  roomMaxPlayers: number;
  canJoin: boolean;
  allowFriendJoin?: boolean;
  roomStatus?: ZooInstanceHealthStatus;
}
```

## 3. `AssetManifestEntry` Extension (`@online-zoo/game-assets`)

```ts
export interface AssetManifestEntry {
  id: AssetId;
  name: string;
  category: 'avatar' | 'environment' | 'foliage' | 'prop' | 'animal';
  url: string;
  boundingRadius: number;
  zones: ('zoo-lobby' | 'panda-forest')[];
  attribution: {
    title: string;
    author: string;
    license: 'CC0-1.0' | 'CC-BY-4.0';
    sourceUrl: string;
  };
}
```
