# Implementation Plan: Food & Dining

**Branch**: `006-food-and-dining` | **Date**: 2026-04-20 | **Spec**: [spec.md](file:///y:/Repos/online-zoo/specs/006-food-and-dining/spec.md)  
**Input**: Feature specification from `/specs/006-food-and-dining/spec.md`

## Summary

Feature 006 (`006-food-and-dining`) introduces a cozy, authoritative social dining experience in the Online Zoo:
1. **Food Stalls & Initial Food Catalog**: Adds two interactive food stalls (`prop-plaza-food-stall` near the Entrance Plaza and `prop-bamboo-tea-stall` along the Bamboo Path) selling 5 initial refreshments (`water`, `bubble-tea`, `ice-cream`, `burger`, `popcorn`) with names, descriptions, categories (`food` | `drink`), icons, colors, and prices (`5` to `20` Zoo Coins).
2. **Authoritative Purchases & Idempotency**: Extends `ZooInstanceAuthority` and `apps/web/server.mjs` to track per-player currency (`currencyBalance`, default `100 Zoo Coins`) and inventory (`Record<FoodItemId, number>`), validate `purchase_food_item` requests server-side, reject insufficient balance or invalid items without deducting currency, and deduplicate repeated `requestId` packets so players are never double-charged.
3. **Persistent Inventory & Consumption**: Persists the player's dining wallet (`currencyBalance` and `inventory`) in `localStorage` (`online-zoo:dining-wallet:v1`), synchronizes it upon joining an instance, and validates `consume_food_item` requests server-side (decrementing owned count by `1` and rejecting unowned items).
4. **Eating & Drinking Animations & Multiplayer Visibility**: Broadcasts `player_consumption_updated` events and `activeConsumption` player states across the room. Both local and remote 3D avatars render a handheld 3D food/drink prop in their right hand, play a procedural eating/drinking arm-to-mouth and head-nod animation for `5,000 ms`, display a floating overhead consumption badge, and allow finishing early (`stop_consuming_food`) without ever locking movement.
5. **Multi-Seat Dining Tables**: Places two 4-seat communal dining tables (`prop-plaza-cafe-table` and `prop-bamboo-picnic-table`) next to the food stalls, supporting up to 4 concurrent seated visitors per table with live seat availability indicators (`X/4 seats free`) and seamless seated dining.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`, `checkJs: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`)  
**Primary Dependencies**: Next.js 15, React 19, Three.js / `@react-three/fiber` / `@react-three/drei`, `@react-three/rapier`, Zustand, `ws`  
**Storage**: Browser `localStorage` (`online-zoo:dining-wallet:v1`) synchronized with authoritative server room session state  
**Testing**: Vitest (`packages/game-core/__tests__/foodAndDining.test.ts`) + Playwright E2E (`apps/web/e2e/food-and-dining.spec.ts`)  
**Target Platform**: Desktop (`1280x720+`) and Mobile (`390x844+`) WebGL browsers  
**Project Type**: Turborepo / pnpm monorepo (`apps/web`, `packages/game-core`, `packages/game-client`, `packages/ui`, `packages/game-assets`, `packages/config`)  
**Performance Goals**: 60 FPS client rendering, `O(1)` purchase/consume validation per message, zero per-frame heap allocations in 3D avatar pose loop  
**Constraints**: Must adhere to `.specify/memory/constitution.md` Principle III ("The server MUST NOT trust client-provided positions, currency, inventory, or purchase results").

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven Development**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/food-and-dining-protocol.md`, `quickstart.md`, and `tasks.md` authored prior to implementation. (**PASS**)
- **II. Monorepo Package Boundaries**: Pure catalog, wallet persistence, protocol validation, and authority logic live in `packages/game-core`; 3D stalls, tables, and avatar handheld props live in `packages/game-client`; 2D Food Stall Shop Modal & Inventory Bar live in `packages/ui`; server WebSocket wiring lives in `apps/web`. (**PASS**)
- **III. Multiplayer Correctness**: `ZooInstanceAuthority` and `apps/web/server.mjs` validate `purchase_food_item` and `consume_food_item` against authoritative session wallet balances, enforce `requestId` idempotency, and broadcast `player_consumption_updated`. (**PASS**)
- **IV. Incremental Vertical Slices**: Builds cleanly on Feature 002 (Multiplayer), Feature 003 (Avatar Rig), Feature 004 (Multi-Seat World Props), and Feature 005 (Animal Simulation) without breaking any existing tests. (**PASS**)
- **V. Testable Acceptance Criteria**: Covered by unit/multi-client authority tests (`foodAndDining.test.ts`) and Playwright E2E (`food-and-dining.spec.ts`). (**PASS**)
- **VI. Simplicity & YAGNI**: Focused strictly on the 5 initial items, 2 food stalls, 2 4-seat dining tables, persistent wallet/inventory, and multiplayer eating/drinking animations. (**PASS**)

## Project Structure

### Documentation (this feature)

```text
specs/006-food-and-dining/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── food-and-dining-protocol.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/game-core/
├── src/
│   ├── dining/
│   │   ├── foodCatalog.ts
│   │   ├── diningPersistence.ts
│   │   └── index.ts
│   ├── types.ts
│   ├── index.ts
│   ├── world/
│   │   └── pandaForestLayout.ts
│   ├── state/
│   │   └── gameStore.ts
│   └── multiplayer/
│       ├── protocol.ts
│       ├── zooInstanceAuthority.ts
│       └── multiplayerClient.ts
└── __tests__/
    └── foodAndDining.test.ts

packages/game-client/
└── src/
    ├── environment/
    │   └── InteractiveProps.tsx
    ├── entities/
    │   ├── AvatarVisualRig.tsx
    │   ├── PlayerAvatarEntity.tsx
    │   └── RemotePlayerAvatar.tsx
    └── runtime/
        └── GameLoopController.tsx

packages/ui/
└── src/
    ├── FoodAndDiningOverlay.tsx
    ├── GameHudOverlay.tsx
    ├── InteractionPromptBanner.tsx
    └── index.ts

apps/web/
├── server.mjs
├── src/
│   ├── components/
│   │   └── ZooWorldExperience.tsx
│   └── server/
│       └── multiplayerWsHub.ts
└── e2e/
    └── food-and-dining.spec.ts
```

**Structure Decision**: Follows existing monorepo package boundaries (`@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/ui`, `@online-zoo/web`).

## Complexity Tracking

No constitution violations.

