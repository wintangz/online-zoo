# Implementation Plan: Events & Activities (`008-events-and-activities`)

**Branch**: `008-events-and-activities` | **Date**: 2026-11-05 | **Spec**: [spec.md](file:///y:/Repos/online-zoo/specs/008-events-and-activities/spec.md)  
**Input**: Feature specification from `/specs/008-events-and-activities/spec.md`

## Summary

Introduce scheduled and spontaneous multiplayer **Events & Activities** and toggleable **Seasonal Themes** in the Panda Forest sanctuary. Visitors can discover upcoming/active/finished events, receive non-intrusive "Starting Soon" / "Event Active" notifications, join and leave shared activities with capacity limits (`maxParticipants`), contribute to shared group objectives (`sharedProgressCount / targetProgress`), earn one-time server-validated Zoo Coin and Zoo Passport zone stamp rewards, and experience seasonal decorations (`spring-blossom`, `summer-lantern`, `autumn-harvest`, `none`) configured dynamically without a new client build.

## Technical Context

**Language/Version**: TypeScript 5.8 (`strict: true`, `checkJs: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`), Node.js >= 20  
**Primary Dependencies**: Next.js 15, React 19, Three.js / `@react-three/fiber`, Zustand 5, `ws`  
**Storage**: Browser `localStorage` (`online-zoo:events-participation:v1`) + Server-Authoritative Room Event State (`ZooInstanceAuthority` & `apps/web/server.mjs`)  
**Testing**: Vitest (`packages/game-core/__tests__/eventsAndActivities.test.ts`) + Playwright E2E (`apps/web/e2e/events-and-activities.spec.ts`)  
**Target Platform**: Desktop & Mobile Web Browsers (60 FPS WebGL + Responsive Tailwind Overlay)  
**Project Type**: Turborepo Monorepo (`@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/ui`, `@online-zoo/web`)

## Constitution Check

- **Principle I (Low-Friction Instant Social Entry)**: Events are 100% optional; joining or leaving an event never locks player movement or interrupts exploration.
- **Principle II (60 FPS Lightweight WebGL & Decoupled UI)**: Seasonal 3D decorations use lightweight procedural instanced/grouped meshes in `PandaForestEnvironment.tsx`; event schedule and participation UI live in decoupled React overlays (`EventsAndActivitiesOverlay.tsx`).
- **Principle III (Server-Authoritative Multiplayer & Economy Integrity)**: Event participation capacity (`EVENT_FULL`), shared progress, runtime schedule administration (`configure_zoo_events`), and one-time event reward claims (`claim_event_reward`) are validated authoritatively on the server with `requestId` + `(playerId, eventInstanceId)` idempotency.

## Project Structure

### Documentation (`specs/008-events-and-activities/`)

```text
specs/008-events-and-activities/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── events-activities-protocol.md
└── tasks.md
```

### Source Code Changes Across Monorepo

```text
packages/game-core/
├── src/
│   ├── events/
│   │   ├── eventsCatalog.ts          # 5 zoo events, 4 seasonal themes, validation & schedule sanitizers
│   │   ├── eventsEngine.ts           # Room event state machine, capacity & reward idempotency helpers
│   │   └── index.ts
│   ├── multiplayer/
│   │   ├── protocol.ts               # join_zoo_event, leave_zoo_event, perform_event_action, claim_event_reward, configure_zoo_events, zoo_events_snapshot, event_reward_result
│   │   ├── zooInstanceAuthority.ts   # Authoritative room event manager, disconnect cleanup, reward validation
│   │   └── multiplayerClient.ts      # Client event actions & snapshot synchronization
│   ├── state/
│   │   └── gameStore.ts              # events store slice, toast notifications, offline fallback
│   ├── types.ts                      # EventsStoreSlice, EventErrorCode, EventToastNotification
│   └── index.ts
└── __tests__/
    └── eventsAndActivities.test.ts   # Unit & multi-client authority tests for Feature 008

packages/game-client/
└── src/
    └── world/
        └── PandaForestEnvironment.tsx # Seasonal 3D decorations (blossom petals/trees, summer lanterns, autumn foliage)

packages/ui/
└── src/
    ├── EventsAndActivitiesOverlay.tsx # Event Drawer, Active Activity HUD Banner, Seasonal Switcher, Toast Banner
    ├── GameHudOverlay.tsx             # HUD Events button (🎪 Events) & active seasonal badge
    └── index.ts

apps/web/
├── src/
│   ├── components/
│   │   └── ZooWorldExperience.tsx     # Mount <EventsAndActivitiesOverlay />
│   └── server/
│       └── multiplayerWsHub.ts        # Forward Feature 008 WebSocket messages
├── server.mjs                         # Standalone server Feature 008 handlers
└── e2e/
    └── events-and-activities.spec.ts  # Multi-client Playwright E2E test
```

