# Implementation Plan: Web & Server Split (`web-server-split`)

**Branch**: `fix/web-server-split` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/web-server-split/spec.md`

## Summary

Extract the game server out of `apps/web` into a standalone `apps/server` (`@online-zoo/server`) package written in TypeScript. Consolidate all server authority (`ZooInstanceAuthority`) and hub routing (`MultiplayerServerHub`) into `apps/server` so only ONE hub implementation exists in the repo, importing shared protocol/types/validation from `@online-zoo/game-core`. Expose the WebSocket endpoint (`/ws/zoo`) and minimal HTTP occupancy endpoint (`/occupancy`) configured via `PORT` and `ALLOWED_ORIGINS`. Remove all server code (`apps/web/server.mjs` and `apps/web/src/server/multiplayerWsHub.ts`) and `ws` dependencies from `apps/web`, plumb `NEXT_PUBLIC_WS_URL` from `apps/web` through to `MultiplayerClient` with local-dev fallback (`ws://localhost:4000/ws/zoo`), and ship `.env.example` files for both apps.

## Technical Context

**Language/Version**: TypeScript 5.6.3, Node.js 20+, React 18.3, Next.js 14.2
**Primary Dependencies**: `ws` (in `apps/server` only), `@online-zoo/game-core` (shared protocol & domain logic), `next` (in `apps/web` only), `vitest`, `@playwright/test`
**Storage**: In-memory single-instance state on `apps/server`; browser `localStorage`/`sessionStorage` on `apps/web`
**Testing**: Vitest unit/integration suites (`packages/game-core`, `apps/server`, `packages/ui`) + Playwright multi-window E2E tests (`apps/web`)
**Target Platform**: Standalone Node.js process (`apps/server`) + Static/Serverless Next.js Web Client (`apps/web`)
**Project Type**: pnpm + Turborepo monorepo (`apps/server`, `apps/web`, `packages/*`)
**Performance Goals**: 20 Hz server room ticks, < 50ms HTTP `/occupancy` response, 60 FPS client rendering
**Constraints**: `apps/web` must contain zero server/authority code; `apps/server` serves no web pages and no static assets; client and server communicate strictly via the shared WebSocket protocol and HTTP occupancy endpoint.
**Scale/Scope**: 16 players per room instance, multiple room instances in memory on a single server process.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Gameplay-First Development**: PASS — Preserves 100% of existing multiplayer gameplay, room instances, animal authority, dining, passport, events, and social interactions.
- **II. Modular Architecture**: PASS — Strictly enforces the boundary between `apps/web` (pure client), `apps/server` (pure standalone server + authority), and `@online-zoo/game-core` (shared protocol & domain contracts).
- **III. Multiplayer Correctness**: PASS — Server authority (`ZooInstanceAuthority` and `MultiplayerServerHub`) runs exclusively in `apps/server`.
- **IV. Responsive by Design**: PASS — Desktop and mobile browser clients connect seamlessly via `NEXT_PUBLIC_WS_URL`.
- **V. Performance and Asset Quality**: PASS — `apps/server` is lightweight and serves no static assets.
- **VI. Security and Player Safety**: PASS — Origin validation (`ALLOWED_ORIGINS`), chat moderation, rate limiting, and authoritative validation are enforced on `apps/server`.
- **VII. Testing and Verification**: PASS — Unit tests, server integration tests, and multi-browser E2E tests verify the split architecture.
- **VIII. Specification-Driven Development**: PASS — Full SpecKit artifacts (`spec.md`, `ASSUMPTIONS.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, `tasks.md`) created.
- **IX. Incremental Delivery**: PASS — Delivers a clean move + dedupe foundation before `world-zones`.

## Project Structure

### Documentation (this feature)

```text
specs/web-server-split/
├── spec.md
├── ASSUMPTIONS.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── server-endpoints.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── server/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── httpServer.ts
│   │   ├── multiplayerHub.ts
│   │   └── zooInstanceAuthority.ts
│   └── __tests__/
│       ├── serverOccupancyAndOrigins.test.ts
│       ├── zooInstanceAuthority.test.ts
│       └── multiplayerHubIntegration.test.ts
└── web/
    ├── .env.example
    ├── package.json
    ├── playwright.config.ts
    └── src/
        └── components/
            └── ZooWorldExperience.tsx

packages/
├── game-core/
│   └── src/
│       └── multiplayer/
│           ├── index.ts
│           ├── protocol.ts
│           └── multiplayerClient.ts
└── game-client/
    └── src/
        └── runtime/
            └── ZooGameCanvas.tsx
```

**Structure Decision**: `apps/server` is added as a first-class workspace app (`@online-zoo/server`). All server authority (`ZooInstanceAuthority`) and hub logic (`MultiplayerServerHub`, `InMemoryMultiplayerHub`, `attachMultiplayerWebSocketServer`) are consolidated in `apps/server/src/`. `apps/web/server.mjs` and `apps/web/src/server/multiplayerWsHub.ts` are deleted.

## Complexity Tracking

No constitution violations. Consolidating duplicate hubs into `apps/server` reduces overall repository complexity by ~4,300 lines of duplicated code.
