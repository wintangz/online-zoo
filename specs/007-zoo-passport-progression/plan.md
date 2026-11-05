# Implementation Plan: Zoo Passport & Progression

**Branch**: `007-zoo-passport-progression` | **Date**: 2026-11-05 | **Spec**: [spec.md](file:///y:/Repos/online-zoo/specs/007-zoo-passport-progression/spec.md)  
**Input**: Feature specification from `/specs/007-zoo-passport-progression/spec.md`

## Summary

Implement a lightweight, optional Zoo Passport & Progression system (`007-zoo-passport-progression`) that rewards natural exploration, animal discovery, social interaction, and zoo activities without mandatory quests or pay-to-win mechanics. Players receive a personal Zoo Passport tracking 5 zoo zone stamps (`zone-welcome-plaza`, `zone-panda-sanctuary`, `zone-penguin-cove`, `zone-lotus-stream`, `zone-wind-chime-lookout`), 3 Animal Encyclopedia species entries (`panda`, `penguin`, `otter`), and 6 achievements across 4 categories (`exploration`, `animal_discovery`, `social`, `activity`). Unlocked achievements grant one-time Zoo Coin and cosmetic badge rewards validated server-side (`ZooInstanceAuthority` and `apps/web/server.mjs`) with `requestId` + `achievementId` idempotency protection so duplicate claims never grant extra currency.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`, `checkJs: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`), Node.js 22+  
**Primary Dependencies**: Next.js 15, React 19, Three.js / `@react-three/fiber`, `@react-three/drei`, Zustand 5, Tailwind CSS 4, `ws`  
**Storage**: Browser `localStorage` (`online-zoo:passport-progression:v1`, synchronized with `online-zoo:animal-encyclopedia:v1` and `online-zoo:dining-wallet:v1`) + authoritative in-memory server session & player progression store in `ZooInstanceAuthority` and `apps/web/server.mjs`  
**Testing**: Vitest 2 (`@online-zoo/game-core`) and Playwright (`@online-zoo/web/e2e`)  
**Target Platform**: Modern Desktop (Keyboard/Mouse) and Mobile (Touchscreen) Web Browsers  
**Project Type**: Multiplayer 3D Web Game Monorepo (`apps/web`, `packages/game-core`, `packages/game-client`, `packages/ui`, `packages/game-assets`, `packages/config`)  
**Performance Goals**: 60 FPS desktop / 30+ FPS mobile; O(1) per-frame proximity zone check (`5` zones); `< 50 ms` authoritative reward claim round-trip  
**Constraints**: Zero mandatory quests, timers, or movement locks; 100% server-authoritative reward claiming with idempotency protection against duplicate requests  
**Scale/Scope**: 5 zoo zones with custom stamp emblems, 3 animal encyclopedia entries, 6 achievements across 4 categories, 6 cosmetic passport badges, and unified Passport UI overlay

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Gameplay-First Development**: PASS — Zone stamps and achievements trigger naturally from real 3D world movement, animal observation, social interaction, and dining, while remaining 100% optional.
- **II. Modular Architecture**: PASS — Domain catalogs, proximity evaluation, achievement rules, and persistence reside in `@online-zoo/game-core/src/passport/`; server authority lives in `ZooInstanceAuthority` and `apps/web/server.mjs`; UI lives in `@online-zoo/ui/src/ZooPassportOverlay.tsx`.
- **III. Multiplayer Correctness**: PASS — Achievement reward claims (`claim_achievement_reward`) are validated server-side with `requestId` and `achievementId` deduplication so clients cannot forge or double-claim Zoo Coins.
- **IV. Responsive by Design**: PASS — Passport modal and HUD progress pill are usable via click, tap, or keyboard shortcut (`P` / `ESC`) on both desktop (`1280x800`) and mobile viewports.
- **V. Performance and Asset Quality**: PASS — Zone proximity checks evaluate 5 2D circles in `< 0.01 ms` per frame with zero allocations when no new zone is entered.
- **VI. Security and Player Safety**: PASS — Server validates achievement unlock eligibility and one-time claim state before crediting `currencyBalance`.
- **VII. Testing and Verification**: PASS — Covered by unit/multi-client tests in `packages/game-core/__tests__/passportProgression.test.ts` and multi-session E2E tests in `apps/web/e2e/passport-progression.spec.ts`.
- **VIII. Specification-Driven Development**: PASS — Full SpecKit artifacts (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`) created and verified.
- **IX. Incremental Delivery**: PASS — Integrates cleanly with Features 001–006 while preserving all existing tests and HUD entry points.

## Project Structure

### Documentation (this feature)

```text
specs/007-zoo-passport-progression/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── passport-progression-protocol.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/game-core/
├── src/
│   ├── passport/
│   │   ├── passportCatalog.ts         # 5 Zoo Zones, 6 Achievements, 6 Badges, overall progress math
│   │   ├── passportPersistence.ts     # localStorage load/save, zone proximity evaluation, achievement evaluator
│   │   └── index.ts                   # Barrel export
│   ├── types.ts                       # PassportStoreSlice & shared domain types
│   ├── state/gameStore.ts             # Zustand passport slice & cross-feature hooks (encyclopedia/social/dining)
│   └── multiplayer/
│       ├── protocol.ts                # record_passport_progress, claim_achievement_reward, achievement_reward_result
│       ├── zooInstanceAuthority.ts    # Server-authoritative passport progression & one-time reward claiming
│       └── multiplayerClient.ts       # Client methods & handlers for passport progress & reward claims
└── __tests__/
    └── passportProgression.test.ts    # Unit & multi-client authority tests for stamps, achievements, and rewards

packages/game-client/
└── src/
    └── runtime/
        └── GameLoopController.tsx     # Per-frame natural zone stamp proximity check & keyboard shortcut ('P')

packages/ui/
└── src/
    ├── ZooPassportOverlay.tsx         # 3-tab Zoo Passport Modal (Stamps, Encyclopedia, Achievements) + Toast
    ├── GameHudOverlay.tsx             # HUD Passport Progress button & active badge display
    └── index.ts                       # Export ZooPassportOverlay

apps/web/
├── server.mjs                         # Production/dev WebSocket server handlers for passport & reward claims
├── src/
│   ├── server/multiplayerWsHub.ts     # Next.js WS hub wiring for passport & reward claims
│   └── components/ZooWorldExperience.tsx # Mount <ZooPassportOverlay />
└── e2e/
    └── passport-progression.spec.ts   # End-to-end Playwright test
```

**Structure Decision**: Extends the existing monorepo packages (`@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/ui`, `@online-zoo/web`) with a dedicated `passport` domain module and unified UI overlay.

## Complexity Tracking

No constitution violations or unjustified complexity.

