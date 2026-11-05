# Implementation Plan: Multiplayer Expansion & Zoo Instances

**Branch**: `009-multiplayer-expansion-and-instances` | **Date**: 2026-11-05 | **Spec**: [spec.md](file:///y:/Repos/online-zoo/specs/009-multiplayer-expansion-and-instances/spec.md)  
**Input**: Feature specification from `/specs/009-multiplayer-expansion-and-instances/spec.md`

## Summary

Expand the Online Zoo multiplayer architecture to support concurrent multi-instance scaling, friend-prioritized instance placement, configurable instance capacity, friend-join privacy settings (`allowFriendJoin`), empty overflow instance cleanup, duplicate-free session transitions, and fault-isolated automatic recovery when an instance becomes unhealthy (`status: 'unhealthy'`).

## Technical Context

**Language/Version**: TypeScript 5.6 (Strict mode: `strict: true`, `checkJs: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`), Node.js 20+  
**Primary Dependencies**: `@online-zoo/game-core` (Zustand 5, `ZooInstanceAuthority`, `MultiplayerClient`), `@online-zoo/ui` (React 18, Tailwind CSS 3), `@online-zoo/web` (Next.js 15, `ws` WebSocket server)  
**Storage**: Browser `localStorage` (`online-zoo:social-preferences:v1` for `allowFriendJoin` privacy persistence) + authoritative in-memory server state per room and per player in `ZooInstanceAuthority`  
**Testing**: Vitest 2 (`packages/game-core/__tests__/multiplayerInstancesExpansion.test.ts`) + Playwright multi-session E2E (`apps/web/e2e/multiplayer-instances-expansion.spec.ts`)  
**Target Platform**: Desktop & Mobile Web Browsers  
**Project Type**: Turborepo Monorepo (`packages/game-core`, `packages/ui`, `apps/web`)  
**Performance Goals**: Sub-50ms instance transition & automatic failover evacuation; zero duplicate sessions during concurrent burst joins or rapid switches  
**Constraints**: Failure of one instance must never disrupt other instances; all player progression (identity, wallet, inventory, passport) must survive instance switches and failovers intact

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Spec-Driven & Declarative Asset-First Design**: Pass. All instance states, privacy settings, and failover messages are strictly typed in `@online-zoo/game-core`.
- **II. Decoupled Package Architecture**: Pass. Multi-instance allocation, friend-priority routing, overflow pruning, and unhealthy failover live in `@online-zoo/game-core`; UI controls live in `@online-zoo/ui`; WebSocket transport wiring lives in `apps/web`.
- **III. Server-Authoritative Multiplayer & Data Integrity**: Pass. `ZooInstanceAuthority` authoritatively enforces `maxPlayers`, `status: 'healthy' | 'unhealthy'`, `allowFriendJoin`, and session deduplication across rooms.
- **IV. Automated Verification & E2E Zero-Regression**: Pass. Dedicated unit/authority tests and multi-session Playwright E2E tests verify capacity overflow, friend-priority placement, friend privacy, and automatic unhealthy instance failover.

## Project Structure

### Documentation (this feature)

```text
specs/009-multiplayer-expansion-and-instances/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── instance-management-protocol.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/game-core/
├── src/
│   ├── types.ts                              # Extend ZooInstanceRoom, ZooInstanceSummary, FriendStatusEntry, SocialStoreSlice
│   ├── social/
│   │   └── socialPersistence.ts              # Persist allowFriendJoin in SocialPersistenceSnapshot
│   ├── state/
│   │   └── gameStore.ts                      # Add allowFriendJoin, instanceNotice, and privacy/instance actions
│   └── multiplayer/
│       ├── protocol.ts                       # Add set_social_privacy, configure_instance, instance_directory_update, error codes
│       ├── zooInstanceAuthority.ts           # Friend-prioritized room selection, overflow pruning, deduplication, unhealthy failover
│       └── multiplayerClient.ts              # Client methods for setSocialPrivacy, configureInstance, and directory/failover handling
└── __tests__/
    └── multiplayerInstancesExpansion.test.ts # Unit & multi-client authority tests for SC-001..SC-005

packages/ui/
└── src/
    ├── GameHudOverlay.tsx                    # Friendly instance label + status indicator in HUD
    └── SocialInteractionOverlay.tsx          # Enhanced instance directory (friend badges, status, admin capacity/health controls, privacy toggle)

apps/web/
├── src/server/
│   └── multiplayerWsHub.ts                   # Wire set_social_privacy, configure_instance, and multi-session failover broadcasts
├── server.mjs                                # Wire set_social_privacy, configure_instance, and multi-session failover broadcasts
└── e2e/
    └── multiplayer-instances-expansion.spec.ts # Multi-session Playwright E2E test for Feature 009
```

**Structure Decision**: Extend the existing monorepo packages cleanly without introducing redundant overlays or breaking existing Feature 001–008 tests.

