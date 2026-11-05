# Implementation Plan: Public Beta & Production Readiness (`010-public-beta-readiness`)

**Branch**: `010-public-beta-readiness` | **Date**: 2026-11-05 | **Spec**: [spec.md](file:///y:/Repos/online-zoo/specs/010-public-beta-readiness/spec.md)  
**Input**: Feature specification from `/specs/010-public-beta-readiness/spec.md`

## Summary

Prepare Online Zoo for controlled Public Beta across desktop and mobile browsers by adding:
1. **Onboarding & Help Center (`packages/game-core/src/readiness/` & `packages/ui/src/BetaReadinessOverlay.tsx`)**: First-time visitor onboarding guide with Desktop (`WASD`, `E`, `Enter`) and Mobile (virtual joystick, touch-drag camera, tap `Interact`) instructions, persistent completion flag (`hasCompletedOnboarding`), Public Beta badge (`v0.10.0-beta`), Known Beta Limitations, and an on-demand `? Help & Beta` modal (`hud-help-beta-btn`).
2. **Real-Time Performance Monitor & Adaptive Quality Governor (`PerformanceMonitor`)**: Rolling frame-time sampler computing `fps`, `avgFrameTimeMs`, and `p95FrameTimeMs`, with automatic graphics quality step-down (`high` → `medium` → `low`) when sustained FPS falls below `28 FPS` and `autoQualityAdjust` is enabled.
3. **In-Game Beta Feedback & Diagnostic Reporting (`submit_beta_feedback`)**: Structured player feedback form (`category`, `severity`, `message`) that automatically attaches diagnostic metadata (`playerId`, `roomId`, `fps`, `qualityPreset`, `viewport`, `inputMode`) with server-side sanitization and rate limiting (`5` submissions per `60s`).
4. **Operator Observability, Moderation Triage & Controlled Maintenance (`ops_snapshot`, `resolve_player_report`, `set_maintenance_notice`, `GET /api/health`)**: Live operator console inside `? Help & Beta` (`Operations & Telemetry` tab) plus HTTP health check endpoint, enabling operators to monitor instances, inspect errors, resolve/dismiss player safety reports, review beta feedback, and broadcast a non-disruptive maintenance/update banner (`hud-maintenance-banner`).

## Technical Context

**Language/Version**: TypeScript 5.6 (`strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`), Node.js 20+  
**Primary Dependencies**: `@online-zoo/game-core` (Zustand, authority & readiness engine), `@online-zoo/game-client` (Three.js / R3F frame loop integration), `@online-zoo/ui` (React 18 + Tailwind CSS), `@online-zoo/web` (Next.js 15 + WebSocket hub & `server.mjs`)  
**Storage**: Browser `localStorage` (`online-zoo:beta-readiness:v1`) with in-memory Node/Vitest fallback and server-authoritative operational telemetry in `ZooInstanceAuthority`  
**Testing**: Vitest (`packages/game-core/__tests__/betaReadiness.test.ts`) + Playwright multi-session E2E (`apps/web/e2e/public-beta-readiness.spec.ts`)  
**Target Platform**: Desktop browsers (Chrome, Edge, Firefox, Safari) & Mobile browsers (iOS Safari, Android Chrome)  
**Performance Goals**: `60 FPS` target on desktop (`high` quality), `>= 30 FPS` target on mobile/integrated GPUs with automatic quality adaptation below `28 FPS`  

## Constitution Check

- **Separation of Concerns**: Pure performance sampling, onboarding persistence, feedback validation, and operator health aggregation live in `@online-zoo/game-core`; UI overlays live in `@online-zoo/ui`; frame-loop sampling hooks into `@online-zoo/game-client`.
- **Server Authority & Safety**: All feedback submissions, report status updates, and maintenance notices are validated, sanitized, and rate-limited by `ZooInstanceAuthority` and `apps/web/server.mjs`.
- **Zero Regression**: All existing Features 001–009 tests and E2E flows remain 100% intact.

## Project Structure

### Documentation (this feature)

```text
specs/010-public-beta-readiness/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   └── beta-readiness-protocol.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/game-core/
├── src/
│   ├── types.ts                                 # BetaReadinessState, BetaFeedbackRecord, OpsHealthSnapshot, etc.
│   ├── readiness/
│   │   ├── index.ts                             # Barrel export
│   │   ├── readinessCatalog.ts                  # Beta version, known limitations, supported devices, controls guide
│   │   ├── readinessPersistence.ts              # localStorage + in-memory persistence for onboarding & autoQualityAdjust
│   │   └── performanceMonitor.ts                # Rolling FPS/frame-time sampler & adaptive quality governor
│   ├── multiplayer/
│   │   ├── protocol.ts                          # submit_beta_feedback, resolve_player_report, set_maintenance_notice, ops_snapshot
│   │   ├── zooInstanceAuthority.ts              # Feedback store, report triage, error logging, maintenance broadcast, health snapshot
│   │   └── multiplayerClient.ts                 # Client methods & listeners for feedback, ops snapshot, and maintenance notices
│   └── state/
│       └── gameStore.ts                         # betaReadiness slice & actions
└── __tests__/
    └── betaReadiness.test.ts                    # Unit & integration tests for SC-001 to SC-005

packages/game-client/
└── src/runtime/
    └── GameLoopController.tsx                   # Feeds frame delta into PerformanceMonitor for live FPS & adaptive quality

packages/ui/
└── src/
    ├── EntryLoadingScreen.tsx                   # Displays Public Beta badge & control quick-tips
    ├── GameHudOverlay.tsx                       # Displays Public Beta badge, maintenance banner, and ? Help & Beta button
    └── BetaReadinessOverlay.tsx                 # Onboarding modal + Help & Beta Center (Controls, Feedback, Ops & Telemetry)

apps/web/
├── src/
│   ├── components/ZooWorldExperience.tsx        # Mounts BetaReadinessOverlay
│   └── server/multiplayerWsHub.ts               # Wires new beta readiness & ops messages
├── server.mjs                                   # Wires /api/health endpoint & WebSocket handlers for feedback, reports, maintenance
└── e2e/
    └── public-beta-readiness.spec.ts            # Multi-session Playwright E2E test for SC-001 to SC-005
```

