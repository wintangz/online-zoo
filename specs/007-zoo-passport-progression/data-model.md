# Data Model: Zoo Passport & Progression

**Feature**: `007-zoo-passport-progression`  
**Date**: 2026-11-05

## 1. Zoo Passport Zones (`PassportZoneId` & `PassportZoneDescriptor`)

```ts
export type PassportZoneId =
  | 'zone-welcome-plaza'
  | 'zone-panda-sanctuary'
  | 'zone-penguin-cove'
  | 'zone-lotus-stream'
  | 'zone-wind-chime-lookout';

export interface PassportZoneDescriptor {
  zoneId: PassportZoneId;
  name: string;
  subtitle: string;
  description: string;
  hint: string;
  stampLabel: string;
  stampIcon: string;
  accentColor: string;
  center: [number, number, number];
  radius: number;
}
```

## 2. Achievements (`AchievementId`, `AchievementCategory`, `AchievementDescriptor`)

```ts
export type AchievementId =
  | 'ach-first-stamp'
  | 'ach-world-explorer'
  | 'ach-first-animal'
  | 'ach-zoologist'
  | 'ach-social-greeting'
  | 'ach-keeper-helper';

export type AchievementCategory =
  | 'exploration'
  | 'animal_discovery'
  | 'social'
  | 'activity';

export interface AchievementDescriptor {
  achievementId: AchievementId;
  title: string;
  category: AchievementCategory;
  categoryLabel: string;
  description: string;
  targetCount: number;
  rewardCoins: number;
  rewardBadge: string;
  icon: string;
}
```

## 3. Persisted Player Passport State (`PlayerPassportState`)

Stored in `localStorage` under `online-zoo:passport-progression:v1` and synchronized with the authoritative server session:

```ts
export interface ZoneStampRecord {
  zoneId: PassportZoneId;
  obtained: boolean;
  stampedAt: string | null;
}

export interface AchievementProgressRecord {
  achievementId: AchievementId;
  progressCount: number;
  targetCount: number;
  unlocked: boolean;
  unlockedAt: string | null;
  claimed: boolean;
  claimedAt: string | null;
}

export interface PlayerPassportState {
  schemaVersion: 1;
  stamps: Record<PassportZoneId, ZoneStampRecord>;
  achievements: Record<AchievementId, AchievementProgressRecord>;
  socialInteractionsCount: number;
  activitiesCompletedCount: number;
  earnedBadges: string[];
  activeBadge: string | null;
  updatedAt: string;
}
```

## 4. Overall Exploration Progress Summary (`PassportProgressSummary`)

Computed deterministically from `PlayerPassportState` + `PlayerEncyclopediaState`:

- `obtainedStampsCount`: `0..5` (`totalStampsCount = 5`)
- `discoveredSpeciesCount`: `0..3` (`totalSpeciesCount = 3`)
- `unlockedAchievementsCount`: `0..6` (`totalAchievementsCount = 6`)
- `claimedAchievementsCount`: `0..6`
- `unclaimedRewardsCount`: number of unlocked achievements where `claimed === false`
- `completedMilestones`: `obtainedStampsCount + discoveredSpeciesCount + unlockedAchievementsCount` (`0..14`)
- `totalMilestones`: `14`
- `overallPercentage`: `Math.round((completedMilestones / 14) * 100)` (`0..100`)

