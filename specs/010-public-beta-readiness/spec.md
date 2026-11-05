# Feature Specification: Public Beta & Production Readiness

**Feature Branch**: `010-public-beta-readiness`  
**Created**: 2026-11-05  
**Status**: Completed (Converged)  
**Input**: User description: "Feature 010 — Public Beta & Production Readiness: Prepare Online Zoo for a controlled public beta across desktop and mobile browsers. Verify and improve onboarding, reliability, performance, responsive usability, security and player safety, observability and operations, beta feedback, and release readiness."

## Clarifications

### Session 2026-11-05

- **Q1: How do we distinguish Must-Have Public Beta requirements from Recommended and Future Production-Scale improvements?** →
  - **Must-Have for Public Beta (Implemented & Verified in Feature 010)**:
    1. First-time visitor onboarding guide with adaptive desktop/mobile control instructions, persistent completion state so returning visitors are not interrupted, and on-demand `? Help & Beta` access at any time (`US1`, `US4`).
    2. Explicit Public Beta version indicator (`Public Beta v0.10.0`) and documented Known Limitations (`FR-023`, `FR-024`).
    3. Real-time client performance telemetry (FPS, frame time `ms`, adaptive quality tier `high`/`medium`/`low` with automatic downgrade on sustained low FPS) (`US3`, `FR-010`, `FR-011`).
    4. In-game Beta Feedback & Bug Report submission (`submit_beta_feedback`) that automatically attaches diagnostic context (player ID, instance ID, FPS, quality tier, viewport, input mode, and timestamp) (`FR-021`–`FR-024`).
    5. Operator Observability, Moderation & Maintenance Console (`ops_snapshot`, `resolve_player_report`, `set_maintenance_notice`) plus `/api/health` endpoint to inspect instance health, error logs, player safety reports, beta feedback, and broadcast non-disruptive maintenance notices (`US8`, `US9`, `US10`).
    6. Documented supported device matrix, deployment/rollback runbook, and state backup/recovery procedures (`FR-025`–`FR-030`).
  - **Recommended Post-Beta Improvements**:
    - Automated external alerting webhooks (PagerDuty/Slack) on instance health degradation.
    - Persistent server-side SQLite/PostgreSQL storage adapter for cross-device account syncing.
  - **Future Production-Scale Improvements**:
    - Multi-region edge WebSocket routing, horizontal Redis pub/sub room sharding, OAuth2 social login, and automated CDN asset bundle splitting.
- **Q2: How does the onboarding experience adapt to desktop vs. mobile players without overwhelming returning visitors?** → On first world entry (`hasCompletedOnboarding === false` in `online-zoo:beta-readiness:v1`), a compact, dismissible **Welcome & Controls Banner/Modal** highlights either Desktop controls (`WASD` / Arrows, `Shift` sprint, Mouse camera, `E` interact, `Enter` chat) or Mobile Touch controls (virtual joystick, touch-drag camera, tap `Interact`) based on current viewport/touch capability. Dismissing it saves `hasCompletedOnboarding = true` so returning visitors go straight into gameplay, while a `? Help & Beta` button (`hud-help-beta-btn`) in the top HUD lets any visitor reopen Controls, Known Limitations, Beta Feedback, or Operator Diagnostics at any time.
- **Q3: How do operators monitor health, investigate reports/feedback, and announce updates without disrupting players?** → The server authority (`ZooInstanceAuthority` and `apps/web/server.mjs`) maintains structured `betaFeedback` records, `playerReports` with review status (`open` | `resolved` | `dismissed`), `errorLogs`, and an active `maintenanceNotice`. Operators can view live service metrics via the in-game **Operations & Telemetry** tab (`help-tab-ops`) or `GET /api/health`, resolve/dismiss moderation reports, and broadcast a live maintenance banner (`hud-maintenance-banner`) to all connected visitors without terminating active sessions or losing player progress.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adaptive First-Time Onboarding & On-Demand Controls Help (Priority: P1)

As a new desktop or mobile player, I want clear, input-appropriate instructions when entering the zoo and a way to reopen help or review known beta limitations at any time without being interrupted on return visits.

**Why this priority**: First-time visitors immediately need to know how to walk, look around, interact with animals/stalls, and socialize on their specific device.

**Independent Test**: Enter the zoo as a new player, verify the onboarding guide displays Desktop and Mobile control cards and Known Beta Limitations, dismiss it, reload or check persistence (`hasCompletedOnboarding === true`), and reopen it via `hud-help-beta-btn`.

**Acceptance Scenarios**:

1. **Given** a first-time player enters the zoo, **When** gameplay begins, **Then** the onboarding guide (`onboarding-guide-modal`) is accessible with clear desktop (`WASD`, `E`, `Enter`) and mobile (virtual joystick, touch camera, tap `Interact`) instructions plus a visible `Public Beta` badge (`hud-beta-badge`).
2. **Given** a player dismisses the onboarding guide (`dismiss-onboarding-btn`), **When** they continue or reload the session, **Then** `hasCompletedOnboarding` remains persisted so returning visitors are not interrupted, and clicking `? Help & Beta` (`hud-help-beta-btn`) reopens the help center at any time.

---

### User Story 2 - In-Game Beta Feedback & Diagnostic Issue Reporting (Priority: P1)

As a player in the Public Beta, I want to submit bug reports or usability feedback directly from the game with automatic diagnostic context attached so the team can reproduce and fix issues.

**Why this priority**: Collecting structured, context-rich player feedback is the primary goal of a controlled public beta.

**Independent Test**: Open `? Help & Beta` → `Beta Feedback` tab (`help-tab-feedback`), select category and severity, enter a feedback message, submit (`submit-beta-feedback-btn`), and verify confirmation and server recording with diagnostic metadata.

**Acceptance Scenarios**:

1. **Given** a connected player opens the `Beta Feedback` tab, **When** they submit a report with category (`bug`, `performance`, `usability`, `suggestion`, `safety`) and message (`5–500` characters), **Then** the client attaches diagnostic context (`playerId`, `roomId`, `fps`, `qualityPreset`, `viewport`, `inputMode`) and the server stores the feedback and returns a confirmation notice (`beta-feedback-confirmation`).
2. **Given** a player submits empty or rate-limited feedback, **When** validation runs, **Then** the system rejects invalid/spam submissions with a clear error message.

---

### User Story 3 - Performance Telemetry, Adaptive Quality & Reliability Safeguards (Priority: P1)

As a player on desktop or mobile, I want the game to monitor frame rate, automatically adapt visual quality if performance drops, and protect my currency, inventory, and passport progress during network interruptions or failed actions.

**Why this priority**: Smooth frame rates and zero data corruption are release blockers for public beta.

**Independent Test**: Verify `PerformanceMonitor` tracks FPS and frame times, automatically steps down quality (`high` → `medium` → `low`) when sustained low FPS is detected while `autoQualityAdjust` is enabled, and verify failed operations or network errors are logged without corrupting wallet or passport state.

**Acceptance Scenarios**:

1. **Given** `autoQualityAdjust` is enabled, **When** the performance monitor observes sustained low frame rates (`< 28 FPS`), **Then** the graphics quality preset automatically steps down (`high` → `medium` → `low`) and records a diagnostic telemetry event.
2. **Given** a network error or rejected protocol action occurs, **When** the client receives an `error_notice`, **Then** the error is recorded in the structured diagnostic log and player currency, food inventory, and passport stamps remain uncorrupted.

---

### User Story 4 - Operator Health Monitoring, Moderation Triage & Controlled Maintenance (Priority: P2)

As an operator, I want to inspect service health, instance populations, error logs, submitted beta feedback, and player safety reports, and broadcast maintenance/update notices without abruptly disconnecting visitors.

**Why this priority**: Operators need visibility into live rooms, moderation reports, and beta feedback to run a safe public beta.

**Independent Test**: Open `? Help & Beta` → `Operations & Telemetry` (`help-tab-ops`), inspect live health metrics, resolve an open player safety report, review submitted beta feedback, and toggle a live maintenance notice (`hud-maintenance-banner`) across connected clients.

**Acceptance Scenarios**:

1. **Given** player safety reports or beta feedback have been submitted, **When** an operator views the `Operations & Telemetry` panel, **Then** all open/resolved reports and feedback entries are listed with context, and clicking `Resolve` (`resolve-report-btn-<id>`) updates the report status across the authority.
2. **Given** an operator activates a maintenance/update notice (`broadcast-maintenance-btn`), **When** connected visitors are in the zoo, **Then** a non-blocking maintenance banner (`hud-maintenance-banner`) appears in the HUD of all connected players without interrupting their active session.

---

### Edge Cases

- **Returning Player Noise**: Once a player dismisses the onboarding guide, `hasCompletedOnboarding: true` is persisted in `localStorage` so subsequent reloads never pop up the guide unprompted.
- **Feedback Spam / Rate Limiting**: A single session cannot submit more than 5 beta feedback entries per 60 seconds (`RATE_LIMITED`), and feedback text is sanitized and bounded (`5–500` chars).
- **Sustained Low FPS on Mobile/Integrated GPUs**: Adaptive quality never loops or oscillates rapidly; it applies a cooldown between quality downgrades and lets the player manually override quality in Settings at any time.
- **Corrupted `localStorage` Payloads**: All persisted slices (`identity`, `dining`, `passport`, `social`, `encyclopedia`, `betaReadiness`) sanitize malformed JSON and fall back to safe defaults without throwing unhandled exceptions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST display a clear Public Beta indicator (`hud-beta-badge`) on both the entry screen and the in-game HUD.
- **FR-002**: The game MUST provide an onboarding & controls guide (`onboarding-guide-modal`) explaining movement, camera, interaction (`E` / tap), chat, and zoo activities for both desktop and mobile input methods.
- **FR-003**: Dismissing the onboarding guide MUST persist completion state (`hasCompletedOnboarding`) so returning players are not interrupted on subsequent visits.
- **FR-004**: Players MUST be able to open the Help & Beta Center (`hud-help-beta-btn`) at any time during gameplay to review controls, known beta limitations (`known-limitations-section`), submit beta feedback, or inspect operator telemetry.
- **FR-005**: The game MUST track real-time client performance metrics (`fps`, `avgFrameTimeMs`, `p95FrameTimeMs`) and support automatic graphics quality adaptation (`autoQualityAdjust`: `high` → `medium` → `low`) when sustained low FPS is detected.
- **FR-006**: The game MUST protect persistent player data (`identity`, `diningWallet`, `passportState`, `social`, `betaReadiness`) against malformed storage payloads and failed network operations.
- **FR-007**: Players MUST be able to submit structured Beta Feedback (`submit_beta_feedback`) with category (`bug`, `performance`, `usability`, `suggestion`, `safety`), severity (`low`, `medium`, `high`), message (`5–500` chars), and automatically attached diagnostic context (`fps`, `qualityPreset`, `roomId`, `viewport`, `inputMode`).
- **FR-008**: The server authority MUST enforce rate limits and input sanitization on beta feedback submissions, chat messages, and moderation reports.
- **FR-009**: Operators MUST be able to inspect live service health (`ops_snapshot` and `/api/health`), including uptime, active instances, total visitors, error counts, player safety reports, and beta feedback items.
- **FR-010**: Operators MUST be able to update the status of player safety reports (`resolve_player_report`: `resolved` | `dismissed`) and broadcast or clear a non-disruptive maintenance/update banner (`set_maintenance_notice`) to all connected visitors.
- **FR-011**: Supported browsers, minimum device expectations, known beta limitations, deployment/rollback procedures, and backup/recovery steps MUST be documented in the feature readiness artifacts.

### Key Entities

- **`BetaReadinessPersistenceState`**: Client-persisted onboarding and telemetry preference state (`hasCompletedOnboarding`, `autoQualityAdjust`, `lastSeenVersion`).
- **`PerformanceTelemetrySample`**: Rolling client performance snapshot (`fps`, `avgFrameTimeMs`, `p95FrameTimeMs`, `qualityPreset`, `autoDowngradedCount`).
- **`BetaFeedbackRecord`**: Structured player feedback entry (`feedbackId`, `playerId`, `displayName`, `roomId`, `category`, `severity`, `message`, `diagnostics`, `createdAt`).
- **`ModerationReportEntry`**: Extended safety report record with operator triage status (`status: 'open' | 'resolved' | 'dismissed'`, `resolvedAt`).
- **`MaintenanceNoticeState`**: Active operator maintenance/update announcement (`active`, `message`, `severity`, `updatedAt`).
- **`ServiceHealthSnapshot`**: Aggregated operational health metrics (`status`, `version`, `uptimeMs`, `totalVisitors`, `healthyInstances`, `unhealthyInstances`, `openReportsCount`, `feedbackCount`, `recentErrorsCount`, `maintenanceNotice`).

## Release Tier Classification

| Tier | Scope | Items |
| :--- | :--- | :--- |
| **Must-Have for Public Beta** | Implemented & verified in Feature 010 | Adaptive Desktop/Mobile Onboarding Guide, `? Help & Beta` Center, Known Beta Limitations, Public Beta Badge, FPS Monitor & Auto-Quality Governor, Structured Beta Feedback with Diagnostics, Operator Health/Moderation/Maintenance Console, `/api/health` endpoint, Release & Rollback Runbook |
| **Recommended Improvements** | Early post-beta iteration | Webhook alerting for unhealthy rooms, persistent SQLite/Postgres backing store for operator audit logs, automated replay export |
| **Future Production-Scale** | Full commercial launch | Multi-region WebSocket edge cluster, Redis pub/sub cross-node instance bus, OAuth account linking, CDN asset streaming |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Onboarding & Returning Visitor Ergonomics)**: 100% of new visitors can view desktop and mobile control instructions and known beta limitations on entry, dismissing the guide persists `hasCompletedOnboarding = true` across reloads, and the guide remains re-accessible via `hud-help-beta-btn`.
- **SC-002 (Performance Monitoring & Adaptive Quality)**: The performance monitor accurately computes rolling FPS and frame times and automatically steps down `graphicsQuality` (`high` → `medium` → `low`) when sustained FPS falls below `28 FPS` with `autoQualityAdjust` enabled.
- **SC-003 (Data Integrity & Reliability Under Failure)**: 100% of simulated storage corruption and rejected protocol operations leave player identity, Zoo Coins, food inventory, and Zoo Passport stamps intact while recording structured diagnostic error entries.
- **SC-004 (Context-Rich Beta Feedback)**: Players can submit beta feedback (`submit_beta_feedback`) that automatically includes `playerId`, `roomId`, `fps`, `qualityPreset`, `viewport`, and `inputMode`, with rate-limiting (`max 5 / 60s`) preventing spam.
- **SC-005 (Operator Observability, Moderation Triage & Non-Disruptive Maintenance)**: Operators can view live service health (`ops_snapshot` & `/api/health`), resolve player safety reports (`resolve_player_report`), review beta feedback, and broadcast a live maintenance notice (`hud-maintenance-banner`) to all connected visitors without dropping sessions.

