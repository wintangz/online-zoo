# Data Model: Events & Activities (`008-events-and-activities`)

## 1. Seasonal Themes (`SeasonalThemeId`)

```ts
export type SeasonalThemeId =
  | 'spring-blossom'
  | 'summer-lantern'
  | 'autumn-harvest'
  | 'none';

export interface SeasonalThemeDescriptor {
  themeId: SeasonalThemeId;
  label: string;
  badgeIcon: string;
  bannerSubtitle: string;
  accentColor: string;
  foliageTintHex: string;
}
```

## 2. Event Catalog (`ZooEventId`, `ZooEventDescriptor`)

```ts
export type ZooEventId =
  | 'event-panda-feeding-gala'
  | 'event-penguin-dive-show'
  | 'event-guided-sanctuary-tour'
  | 'event-plaza-group-photo'
  | 'event-lantern-trivia-game';

export type ZooEventStatus = 'upcoming' | 'active' | 'finished';

export type ZooEventCategory =
  | 'feeding'
  | 'observation'
  | 'guided_tour'
  | 'community_photo'
  | 'seasonal_minigame';

export interface ZooEventDescriptor {
  eventId: ZooEventId;
  title: string;
  category: ZooEventCategory;
  categoryLabel: string;
  description: string;
  instructions: string;
  actionLabel: string;
  locationLabel: string;
  zoneId: PassportZoneId;
  position: [number, number, number];
  defaultMaxParticipants: number;
  targetProgress: number;
  rewardCoins: number;
  icon: string;
  isSeasonal?: boolean;
}
```

## 3. Live Room Event State (`LiveZooEventState`)

```ts
export interface LiveZooEventState {
  eventId: ZooEventId;
  eventInstanceId: string;
  status: ZooEventStatus;
  startTimeMs: number;
  endTimeMs: number;
  maxParticipants: number;
  participantSessionIds: string[];
  participantPlayerIds: string[];
  contributedPlayerIds: string[];
  claimedPlayerIds: string[];
  sharedProgressCount: number;
  targetProgress: number;
  rewardCoins: number;
}
```

## 4. Runtime Event Administration (`ZooEventAdminPatch`, `ZooEventScheduleConfig`)

```ts
export interface ZooEventAdminPatch {
  eventId: ZooEventId;
  status?: ZooEventStatus;
  startTimeMs?: number;
  endTimeMs?: number;
  maxParticipants?: number;
  resetInstance?: boolean;
}

export interface ZooEventScheduleConfig {
  seasonalTheme?: SeasonalThemeId;
  eventPatches?: ZooEventAdminPatch[];
}
```

