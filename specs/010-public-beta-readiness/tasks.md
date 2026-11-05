# Tasks: Public Beta & Production Readiness (`010-public-beta-readiness`)

**Input**: Design documents from `/specs/010-public-beta-readiness/`  
**Prerequisites**: [plan.md](file:///y:/Repos/online-zoo/specs/010-public-beta-readiness/plan.md), [spec.md](file:///y:/Repos/online-zoo/specs/010-public-beta-readiness/spec.md), [research.md](file:///y:/Repos/online-zoo/specs/010-public-beta-readiness/research.md), [data-model.md](file:///y:/Repos/online-zoo/specs/010-public-beta-readiness/data-model.md), [beta-readiness-protocol.md](file:///y:/Repos/online-zoo/specs/010-public-beta-readiness/contracts/beta-readiness-protocol.md)

## Phase 1: Setup & Foundational Readiness Module (`@online-zoo/game-core`)

**Purpose**: Define shared readiness types, onboarding & beta limitations catalog, persistence, and rolling FPS / adaptive quality monitor.

- [X] T001 Extend `packages/game-core/src/types.ts` with `BetaFeedbackCategory`, `BetaFeedbackSeverity`, `BetaDiagnosticContext`, `BetaFeedbackRecord`, `PlayerReportStatus`, `MaintenanceNoticeState`, `DiagnosticErrorEntry`, `OpsHealthSnapshot`, `PerformanceTelemetrySnapshot`, and `BetaReadinessStoreSlice`
- [X] T002 Create `packages/game-core/src/readiness/readinessCatalog.ts`, `packages/game-core/src/readiness/readinessPersistence.ts`, `packages/game-core/src/readiness/performanceMonitor.ts`, and `packages/game-core/src/readiness/index.ts`, and export them from `packages/game-core/src/index.ts`
- [X] T003 Extend `packages/game-core/src/multiplayer/protocol.ts` with `SubmitBetaFeedbackMessage`, `ResolvePlayerReportMessage`, `SetMaintenanceNoticeMessage`, `RequestOpsSnapshotMessage`, `BetaFeedbackAckMessage`, and `OpsSnapshotMessage`

---

## Phase 2: Store State, Server Authority & Client Telemetry Integration (Priority: P1/P2)

**Goal**: Implement feedback submission with rate limiting, player report triage (`open`/`resolved`/`dismissed`), error log capture, maintenance notice broadcast, and live FPS/adaptive quality hooks.

- [X] T004 [US2] [US3] [US4] Extend `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` with `submitBetaFeedback` (including 5/60s rate limit and sanitization), `resolvePlayerReport`, `setMaintenanceNotice`, `recordDiagnosticError`, and `getOpsHealthSnapshot`
- [X] T005 [US1] [US2] [US3] [US4] Update `packages/game-core/src/state/gameStore.ts` with the `betaReadiness` slice and actions (`setOnboardingOpen`, `completeOnboarding`, `setHelpCenterTab`, `setAutoQualityAdjust`, `updatePerformanceTelemetry`, `setBetaFeedbackNotice`, `setOpsSnapshot`, `recordClientError`)
- [X] T006 [US2] [US3] [US4] Update `packages/game-core/src/multiplayer/multiplayerClient.ts` to expose `submitBetaFeedback`, `resolvePlayerReport`, `setMaintenanceNotice`, and `requestOpsSnapshot`, and handle `beta_feedback_ack`, `ops_snapshot`, and `welcome_snapshot.maintenanceNotice`
- [X] T007 [US2] [US4] Update `apps/web/src/server/multiplayerWsHub.ts` and `apps/web/server.mjs` to handle `submit_beta_feedback`, `resolve_player_report`, `set_maintenance_notice`, `request_ops_snapshot`, and `GET /api/health`
- [X] T008 [US3] Update `packages/game-client/src/runtime/GameLoopController.tsx` to feed frame delta into `PerformanceMonitor` and trigger automatic quality adaptation when `autoQualityAdjust` is enabled

---

## Phase 3: Onboarding, Help & Beta Center, and Operator Console UI (`@online-zoo/ui` & `@online-zoo/web`)

**Goal**: Surface the Public Beta badge, non-intrusive first-time onboarding card, on-demand `? Help & Beta` modal (Controls & Limitations, Beta Feedback form, and Operations & Telemetry console), and live maintenance banner.

- [X] T009 [US1] [US2] [US3] [US4] Create `packages/ui/src/BetaReadinessOverlay.tsx` and update `packages/ui/src/EntryLoadingScreen.tsx`, `packages/ui/src/GameHudOverlay.tsx`, `packages/ui/src/index.ts`, and `apps/web/src/components/ZooWorldExperience.tsx`

---

## Phase 4: Verification & Cross-Artifact Convergence

**Purpose**: Verify unit tests, multi-client authority tests, `/api/health` endpoint, TypeScript checks, and Playwright E2E tests.

- [X] T010 Write unit and integration tests in `packages/game-core/__tests__/betaReadiness.test.ts` covering onboarding persistence (`SC-001`), `PerformanceMonitor` FPS calculation & adaptive quality step-down (`SC-002`), storage corruption resilience (`SC-003`), beta feedback submission & rate limiting (`SC-004`), and operator report triage, maintenance notices & health snapshots (`SC-005`)
- [X] T011 Write multi-session Playwright E2E test in `apps/web/e2e/public-beta-readiness.spec.ts` verifying Public Beta badge, onboarding guide dismissal & persistence, Help & Beta Center tabs, in-game Beta Feedback submission with diagnostic context, operator report resolution, live maintenance notice banner across sessions, and `/api/health` endpoint
- [X] T012 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E suite to achieve 100% convergence
