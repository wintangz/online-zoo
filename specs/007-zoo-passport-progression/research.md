# Research & Architectural Decisions: Zoo Passport & Progression

**Feature**: `007-zoo-passport-progression`  
**Date**: 2026-11-05

## Decision 1: Natural Zone Stamp Detection & Spatial Placement

- **Decision**: Define 5 distinct circular discovery zones in `packages/game-core/src/passport/passportCatalog.ts` that map directly to the landmarks of the Panda Forest world without overlapping the initial spawn ring (`[0, 0.1, 18]`, radius `2.2 m`):
  1. `zone-welcome-plaza` ("Welcome Plaza & Refreshment Courtyard") — Center `[-5.2, 0, 12.6]`, radius `4.2 m`.
  2. `zone-panda-sanctuary` ("Misty Bamboo Grove Sanctuary") — Center `[8.4, 0, 9.2]`, radius `6.0 m`.
  3. `zone-penguin-cove` ("Glacier Cove Coastal Pool") — Center `[-8.6, 0, 7.0]`, radius `6.0 m`.
  4. `zone-lotus-stream` ("Highland Spring & Otter Stream") — Center `[-2.0, 0, -2.5]`, radius `6.0 m`.
  5. `zone-wind-chime-lookout` ("Northern Wind-Chime Lookout") — Center `[2.5, 0, -9.5]`, radius `6.5 m`.
- **Rationale**: Keeping all 5 zones outside the initial spawn point ensures a new player begins with `0/5` obtained stamps and experiences genuine discovery as soon as they walk into the Welcome Plaza or along the habitat trails.
- **Alternatives Considered**: Auto-stamping `zone-welcome-plaza` on spawn was rejected because players would never see the unobtained state of the first stamp or experience earning it by walking into the plaza.

## Decision 2: Unified Animal Encyclopedia & Cross-Feature Achievement Reactivity

- **Decision**: Integrate the Animal Encyclopedia (`panda`, `penguin`, `otter`) directly into the Zoo Passport's **Encyclopedia** tab while keeping the dedicated `animal-encyclopedia-button` HUD shortcut and `AnimalSimulationOverlay` modal functional. In `gameStore.ts`, whenever a zone is stamped, an animal species is discovered (`inspectAnimal` or proximity discovery), a social action is performed (chat, emote, sitting, or friend request), or an activity is completed (habitat feeding or food/drink consumption), the store automatically re-evaluates achievement conditions and unlocks any newly satisfied achievements.
- **Rationale**: Guarantees 100% reactive achievement unlocking across Features 004, 005, 006, and 007 while maintaining full backward compatibility with all existing E2E tests.
- **Alternatives Considered**: Polling achievement conditions on a timer was rejected in favor of deterministic event-driven evaluation on state transitions.

## Decision 3: Server-Authoritative One-Time Reward Claiming & Idempotency

- **Decision**: Add `record_passport_progress` and `claim_achievement_reward` client-to-server WebSocket messages and `achievement_reward_result` server-to-client responses. `ZooInstanceAuthority` and `apps/web/server.mjs` track per-player passport state (`stamps`, `achievements`, `earnedBadges`) alongside their dining wallet (`currencyBalance`, `inventory`). When `claim_achievement_reward` is received:
  1. Check `processedRewardClaims` by `${playerId}:${requestId}` — if present, return the cached response without crediting coins again.
  2. Validate `achievementId` (`INVALID_ACHIEVEMENT` if unknown).
  3. Verify the achievement is unlocked (`ACHIEVEMENT_LOCKED` if not unlocked).
  4. Verify the achievement has not already been claimed (`ALREADY_CLAIMED` if `claimed === true`).
  5. Mark `claimed = true`, add `rewardCoins` to `wallet.currencyBalance`, add `rewardBadge` to `earnedBadges`, and return `achievement_reward_result`.
- **Rationale**: Satisfies Principle III (Multiplayer Correctness) and Principle VI (Security and Player Safety), ensuring Zoo Coins can never be duplicated via packet replay or double-clicking.
- **Alternatives Considered**: Client-only coin crediting was rejected because currency is server-authoritative in Online Zoo.

