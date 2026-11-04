# Implementation Plan: Social Interaction (Feature 004)

**Branch**: `004-social-interaction` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-social-interaction/spec.md`

## Summary

Feature 004 transforms Online Zoo into an expressive, safe shared social environment by introducing:
1. **Proximity Text Chat & Overhead Speech Bubbles (`FR-001`–`FR-008`, `SC-001`–`SC-003`)**: Proximity-filtered (`<= 24m`) text communication with `6`-second overhead 3D speech bubbles on both local and remote avatars, a scrollable HUD chat log, `140`-character length validation, sliding-window rate limiting (`4` messages / `6s`, `1.0s` cooldown), and client/server content moderation.
2. **Expressive Avatar Emotes (`FR-009`–`FR-011`, `SC-004`)**: A 5-emote collection (**Wave**, **Dance**, **Clap**, **Laugh**, **Sit / Relax**) that animates the 3D avatar rig and renders an overhead emote indicator for nearby visitors while cancelling instantaneously upon movement or jump input.
3. **Multi-Seat Benches, Chairs & World Object Interactions (`FR-012`–`FR-016`, `SC-005`)**: Authoritative multi-seat support on park benches (`prop-plaza-bench` and `prop-scenic-bench` with `2` seats each, plus `prop-pond-chair`), clear proximity availability/occupancy prompts (`2/2 seats free`, `1/2 seats free`, `Occupied`), side-by-side seating for multiple visitors, and clean stand-up transitions.
4. **Friends List, Online Status & Instance Joining (`FR-017`–`FR-020`, `SC-006`)**: Persistent friend relationships, real-time friend request send/accept/reject/remove workflows, cross-room online status and instance population indicators, and single-click instance joining when capacity permits.
5. **Accessible Player Safety Controls (`FR-021`–`FR-024`, `SC-007`–`SC-008`)**: Direct 2-click HUD access to **Mute**, **Block**, and **Report** controls that suppress unwanted chat/speech bubbles/emotes/friend requests and capture structured moderation reports with recent chat context.
6. **Instance (Server) Selection, Selectable/Copiable & Tunable Player ID, and Background-Tab Resilience (`FR-025`–`FR-029`, `SC-009`–`SC-011`)**: Live server/instance directory (`panda-forest-1`, `panda-forest-2`, `panda-forest-3`, plus custom instances) with 1-click instance switching, selectable (`select-all`) and 1-click copiable Player IDs with custom ID tuning/regeneration, and background-tab `setInterval` heartbeat + server auto-reactivation so remote players never vanish and proximity chat never stops working after tab switches.

## Technical Context

**Language/Version**: TypeScript `5.6.x` (Node.js `>=20.11`)

**Primary Dependencies**:
- Application Shell & WebSocket Host: `next` (`14.2.x`), `ws` (`^8.18.0`), `react` (`18.3.x`), `react-dom` (`18.3.x`)
- 3D Rendering & Physics: `three` (`0.169+`), `@react-three/fiber` (`8.x`), `@react-three/drei` (`9.x`), `@react-three/rapier` (`1.x`)
- State Management & Styling: `zustand` (`5.x`), `tailwindcss` (`3.4.x`)
- Monorepo & Build Tooling: `pnpm` (`9.x` workspaces), `turbo` (`2.x`)

**Storage**:
- Client `localStorage` (`online-zoo:social-state:v1`) for persistent confirmed friends, muted player IDs, and blocked player IDs.
- Server volatile in-memory `ZooInstanceAuthority` / `server.mjs` state for room seat occupancy, rate-limit windows, active emotes, cross-room presence directory, pending friend requests, and captured moderation reports.

**Testing**:
- `Vitest`: Unit and multi-client integration suites (`packages/game-core/__tests__/socialInteraction.test.ts`) covering proximity range filtering (`24m`), chat moderation & rate limiting, emote lifecycle & movement cancellation, multi-seat bench occupancy & race conditions, friend requests & cross-room joining, and mute/block/report safety enforcement.
- `Playwright`: End-to-end browser verification (`apps/web/e2e/social-interaction.spec.ts`) verifying 2-player proximity chat & speech bubbles, emotes, multi-seat bench sitting/standing, friend requests & online status, and mute/block/report workflows.

**Target Platform**: Desktop and mobile browsers supporting WebGL2, WebSockets, and `localStorage`.

**Project Type**: Browser-based 3D multiplayer social zoo in a Turborepo monorepo.

**Performance Goals**:
- Proximity chat, emote, and seat occupancy broadcast delivery `< 250ms` (`SC-001`, `SC-004`).
- Movement input cancels active emotes in `< 50ms` (`SC-004`).
- 60 FPS desktop / 30–60 FPS mobile rendering with procedural emote and seated posture transforms computed in `useFrame`.

**Constraints**:
- All chat messages, seat claims, friend requests, blocks, and reports must be validated server-side (`Constitution III & VI`).
- Focusing the chat input or report modal must suppress 3D avatar movement hotkeys (`FR-008`).

**Scale/Scope**: `24m` proximity chat range, `140`-char limit, `5` emotes, `3` seatable props (`5` total seat slots across the plaza, pond, and overlook), cross-room friend presence, and full Mute/Block/Report safety suite.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Phase 0 Status | Post-Phase 1 Design Verification |
| :--- | :--- | :--- |
| **I. Gameplay-First Development** | **PASS** | Directly enriches in-world social hangouts via speech bubbles, emotes, side-by-side bench seating, and friend instance joining. |
| **II. Modular Architecture** | **PASS** | Keeps social validation/moderation/catalogs in `@online-zoo/game-core/src/social`, 3D speech bubbles/emotes/seating postures in `@online-zoo/game-client`, HUD chat/emote/social panels in `@online-zoo/ui`, and WebSocket routing in `apps/web`. |
| **III. Multiplayer Correctness** | **PASS** | Server authority enforces `24m` proximity filtering, chat rate limits, authoritative seat slot locking, cross-room capacity checks, and block enforcement. |
| **IV. Responsive by Design** | **PASS** | Chat, emote bar, stand-up button, and social drawer use responsive layouts that fit cleanly on both desktop and mobile viewports while keeping virtual touch joysticks touch-only. |
| **V. Performance and Asset Quality** | **PASS** | Emote and seated animations use zero-allocation procedural `useFrame` transforms on `AvatarVisualRig` and reuse existing instanced/GLTF bench assets. |
| **VI. Security and Player Safety** | **PASS** | Implements chat rate limiting, profanity filtering, Mute, Block, and structured Report capture (`FR-006`, `FR-007`, `FR-021`–`FR-024`). |
| **VII. Testing and Verification** | **PASS** | Full unit, multi-client `InMemoryMultiplayerHub`, and Playwright 2-browser E2E test suites verify all 5 user stories. |
| **VIII. Specification-Driven Development** | **PASS** | Maps all `24` Functional Requirements (`FR-001`–`FR-024`) and `8` Success Criteria (`SC-001`–`SC-008`) across [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/social-interaction.md](./contracts/social-interaction.md). |
| **IX. Incremental Delivery** | **PASS** | Builds directly on Feature 001 (props/interaction), Feature 002 (rooms/WebSockets), and Feature 003 (persistent `playerId` & `AvatarVisualRig`). |

## Project Structure

### Documentation (this feature)

```text
specs/004-social-interaction/
├── plan.md                                      # This file (/speckit-plan output)
├── research.md                                  # Phase 0 research decisions
├── data-model.md                                # Phase 1 entity, seating, friend & safety data model
├── quickstart.md                                # Phase 1 verification & run guide
├── checklists/
│   └── requirements.md                          # Spec quality checklist (16/16 passing)
└── contracts/
    └── social-interaction.md                    # Shared module, wire protocol & UI testid contracts
```

### Source Code (repository root)

```text
online-zoo/
├── apps/
│   └── web/
│       ├── server.mjs                           # Updated with proximity chat, emotes, multi-seat benches, friends/join & safety/reports
│       ├── src/
│       │   ├── components/
│       │   │   └── ZooWorldExperience.tsx       # Mounts SocialInteractionOverlay
│       │   └── server/
│       │       └── multiplayerWsHub.ts          # Routes Feature 004 social/chat/seat/friend/safety messages through ZooInstanceAuthority
│       └── e2e/
│           └── social-interaction.spec.ts       # New Feature 004 Playwright E2E suite
├── packages/
│   ├── game-core/
│   │   ├── src/
│   │   │   ├── index.ts                         # Re-exports social module
│   │   │   ├── types.ts                         # Adds chat, emote, multi-seat, friend, and safety/report types
│   │   │   ├── social/
│   │   │   │   ├── index.ts                     # Barrel export for social module
│   │   │   │   ├── chatModeration.ts            # Proximity chat validation (1-140 chars), profanity filter & ChatRateLimiter
│   │   │   │   ├── emoteCatalog.ts              # 5-emote catalog (wave, dance, clap, laugh, sit) & helpers
│   │   │   │   └── socialPersistence.ts         # localStorage persistence for friends, mutedPlayerIds & blockedPlayerIds
│   │   │   ├── world/
│   │   │   │   └── pandaForestLayout.ts         # Adds multi-seat descriptors to prop-scenic-bench, prop-plaza-bench & prop-pond-chair
│   │   │   ├── state/
│   │   │   │   └── gameStore.ts                 # Adds social slice (chat, active气泡/emotes, seat occupancy, friends, mute/block/reports)
│   │   │   └── multiplayer/
│   │   │       ├── protocol.ts                  # Adds chat, emote, seat, friend, instance-join & safety message schemas
│   │   │       ├── zooInstanceAuthority.ts      # Authoritative 24m chat filter, rate limit, emotes, multi-seat locking, friend presence & reports
│   │   │       └── multiplayerClient.ts         # Client methods for chat, emotes, seating, friends, instance joining & safety
│   │   └── __tests__/
│   │       └── socialInteraction.test.ts        # Unit & multi-client integration tests for all Feature 004 requirements
│   ├── game-client/
│   │   └── src/
│   │       ├── entities/
│   │       │   ├── PlayerAvatarEntity.tsx       # Renders overhead 3D speech bubble, emote badge, procedural emote & seated postures
│   │       │   └── RemotePlayerAvatar.tsx       # Renders remote overhead 3D speech bubble, emote badge, procedural emote & seated postures
│   │       ├── environment/
│   │       │   └── InteractiveProps.tsx         # Renders prop-plaza-bench, prop-pond-chair & multi-seat visual indicators
│   │       └── runtime/
│   │           ├── GameLoopController.tsx       # Cancels active emotes/seating on movement input & routes bench sit/stand interactions
│   │           └── ZooGameCanvas.tsx            # Exposes social client actions on window runtime bridge
│   └── ui/
│       └── src/
│           ├── index.ts                         # Exports SocialInteractionOverlay
│           ├── SocialInteractionOverlay.tsx     # Proximity chat panel, 5-emote bar, Friends & Nearby Visitors drawer, Mute/Block/Report UI
│           ├── InteractionPromptBanner.tsx      # Displays seat availability ("2/2 seats free", "Occupied") and "Stand Up" button
│           └── GameHudOverlay.tsx               # Integrates Social & Friends drawer toggle and seated status indicator
```

**Structure Decision**: Preserves strict modular separation across `@online-zoo/game-core`, `@online-zoo/game-client`, `@online-zoo/ui`, and `apps/web`, with shared validation and authority rules in `@online-zoo/game-core`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| None (All 9 Constitution Principles Pass) | All social, chat, emote, seating, friend, and safety systems fit cleanly within existing monorepo packages. | Client-only chat/seating or unmoderated chat would violate Constitution Principles III and VI. |
