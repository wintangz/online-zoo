# Quickstart: Zoo Passport & Progression

**Feature**: `007-zoo-passport-progression`  
**Date**: 2026-11-05

## 1. Run Unit & Multi-Client Authority Tests

```bash
pnpm --filter @online-zoo/game-core test
```

This runs `packages/game-core/__tests__/passportProgression.test.ts`, verifying:
- All 5 Zoo Passport zones (`zone-welcome-plaza`, `zone-panda-sanctuary`, `zone-penguin-cove`, `zone-lotus-stream`, `zone-wind-chime-lookout`) and proximity stamp collection.
- Persistent storage (`online-zoo:passport-progression:v1`) across sessions and sanitization of malformed data.
- Automatic unlocking of all 6 achievements across `exploration`, `animal_discovery`, `social`, and `activity` categories.
- Server-authoritative one-time reward claiming (`ZooInstanceAuthority.claimAchievementReward`), `requestId` idempotency, and rejection of locked or already-claimed rewards.

## 2. Run End-to-End Playwright Verification

```bash
pnpm --filter @online-zoo/web exec playwright test e2e/passport-progression.spec.ts
```

This verifies:
- Opening the Zoo Passport from the HUD (`hud-passport-btn`) and inspecting initial `0%` exploration progress (`0/5` stamps, `0/3` species, `0/6` achievements).
- Walking into zoo zones to collect recognizable zone stamps (`zone-welcome-plaza`, `zone-panda-sanctuary`) with toast notifications.
- Discovering animal species (`panda`, `penguin`, `otter`) and reviewing them in the Passport Encyclopedia tab.
- Unlocking achievements across categories and claiming Zoo Coin & badge rewards (`claim-achievement-btn-ach-first-stamp`), verifying currency increases once and duplicate claims are blocked.
- Reloading the browser and confirming all stamps, encyclopedia entries, unlocked/claimed achievements, badges, and Zoo Coins persist.

