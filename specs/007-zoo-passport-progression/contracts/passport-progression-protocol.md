# WebSocket Protocol Contract: Zoo Passport & Progression

**Feature**: `007-zoo-passport-progression`  
**Date**: 2026-11-05

## 1. Handshake Extension (`join_instance` & `welcome_snapshot`)

### Client → Server: `JoinInstanceMessage`
Includes optional `passportState` snapshot so the server initializes the player's authoritative passport progression upon connection:

```ts
export interface JoinInstanceMessage {
  type: 'join_instance';
  // ...existing fields
  passportState?: PlayerPassportState;
}
```

### Server → Client: `WelcomeSnapshotMessage`
Returns the sanitized authoritative `passportState`:

```ts
export interface WelcomeSnapshotMessage {
  type: 'welcome_snapshot';
  // ...existing fields
  passportState?: PlayerPassportState;
}
```

---

## 2. Recording Passport Progress (`record_passport_progress`)

Sent when the client detects a zone visit, species discovery, social action, or activity completion, in addition to automatic server-side triggers during movement/chat/emote/feeding/dining:

```ts
export interface RecordPassportProgressMessage {
  type: 'record_passport_progress';
  zoneId?: PassportZoneId;
  speciesId?: AnimalSpeciesId;
  socialAction?: boolean;
  activityCompleted?: boolean;
}
```

---

## 3. Claiming Achievement Rewards (`claim_achievement_reward` & `achievement_reward_result`)

### Client → Server: `ClaimAchievementRewardMessage`

```ts
export interface ClaimAchievementRewardMessage {
  type: 'claim_achievement_reward';
  achievementId: AchievementId;
  requestId: string;
}
```

### Server → Client: `AchievementRewardResultMessage`

```ts
export type AchievementRewardErrorCode =
  | 'INVALID_ACHIEVEMENT'
  | 'ACHIEVEMENT_LOCKED'
  | 'ALREADY_CLAIMED';

export interface AchievementRewardResultMessage {
  type: 'achievement_reward_result';
  requestId: string;
  success: boolean;
  achievementId: string;
  rewardCoinsGranted: number;
  rewardBadgeGranted?: string;
  currencyBalance: number;
  passportState: PlayerPassportState;
  errorCode?: AchievementRewardErrorCode;
  message: string;
  serverTimestamp: number;
}
```

### Server Validation Rules
1. **Idempotency by `requestId`**: If `${playerId}:${requestId}` was already processed, return the cached `AchievementRewardResultMessage` without crediting coins again.
2. **Valid Achievement ID**: Reject unknown `achievementId` with `INVALID_ACHIEVEMENT` (`rewardCoinsGranted: 0`).
3. **Unlock Requirement**: Verify the achievement is unlocked (`unlocked === true`); otherwise reject with `ACHIEVEMENT_LOCKED` (`rewardCoinsGranted: 0`).
4. **One-Time Claim Enforcement**: Verify `claimed === false`; if already claimed, reject with `ALREADY_CLAIMED` (`rewardCoinsGranted: 0`).
5. **Atomic Grant**: Set `claimed = true`, increment `wallet.currencyBalance` by `descriptor.rewardCoins`, append `descriptor.rewardBadge` to `earnedBadges`, and return `success: true`.

