# Research: Public Beta & Production Readiness (`010-public-beta-readiness`)

## Decision 1: Non-Intrusive First-Time Onboarding with Persistent Completion
- **Decision**: Display a compact, input-aware **Welcome to Online Zoo (Public Beta)** guide automatically when a new player enters the world (`hasCompletedOnboarding === false`), and persist `hasCompletedOnboarding = true` in `localStorage` (`online-zoo:beta-readiness:v1`) as soon as the visitor clicks **Got It, Let's Explore!** (`dismiss-onboarding-btn`). Provide a permanent `? Help & Beta` button (`hud-help-beta-btn`) in the top HUD so both new and returning players can access controls, known limitations, feedback, and operator tools at any time without blocking core HUD buttons or world interaction prompts.
- **Rationale**: Satisfies `FR-001`–`FR-004` and `SC-001` while ensuring returning players (and existing automated E2E tests that click HUD buttons right after entering the world) are never blocked by a full-screen modal backdrop.

## Decision 2: Rolling Frame-Time Sampler & Adaptive Graphics Quality Governor
- **Decision**: Implement `PerformanceMonitor` in `@online-zoo/game-core/src/readiness/performanceMonitor.ts` using a 60-sample rolling window of frame deltas (`dtSeconds`). Compute instantaneous/rolling `fps`, `avgFrameTimeMs`, and `p95FrameTimeMs`. When `autoQualityAdjust` is enabled and rolling FPS stays below `28 FPS` for a sustained evaluation window (with a cooldown between adjustments), automatically step down `settings.graphicsQuality` (`high` → `medium` → `low`).
- **Rationale**: Directly fulfills `US3` and `SC-002` with deterministic unit testability and zero external profiling dependencies.

## Decision 3: Context-Rich In-Game Beta Feedback & Operator Console
- **Decision**: Extend the WebSocket protocol and `ZooInstanceAuthority` with:
  - `submit_beta_feedback`: Validates category (`bug`, `performance`, `usability`, `suggestion`, `safety`), severity (`low`, `medium`, `high`), and message (`5–500` chars), enforces a per-session rate limit (`5` per `60s`), attaches client diagnostic context (`fps`, `qualityPreset`, `roomId`, `viewport`, `inputMode`), and broadcasts an updated `ops_snapshot`.
  - `resolve_player_report`: Allows operators to mark any submitted player safety report as `'resolved'` or `'dismissed'`.
  - `set_maintenance_notice`: Allows operators to activate or clear a non-disruptive maintenance/update banner (`hud-maintenance-banner`) across all connected clients.
  - `GET /api/health`: Exposes JSON operational health metrics (`status`, `version`, `uptimeMs`, `totalVisitors`, `healthyInstances`, `unhealthyInstances`, `openReportsCount`, `feedbackCount`, `maintenanceNotice`) for external uptime monitors and operator verification.
- **Rationale**: Provides complete end-to-end observability, moderation workflow closure, and zero-disruption update communication (`SC-004`, `SC-005`).

