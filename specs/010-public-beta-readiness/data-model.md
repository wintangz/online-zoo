# Data Model: Public Beta & Production Readiness (`010-public-beta-readiness`)

## 1. Beta Feedback & Diagnostic Context

```ts
export type BetaFeedbackCategory =
  | 'bug'
  | 'performance'
  | 'usability'
  | 'suggestion'
  | 'safety';

export type BetaFeedbackSeverity = 'low' | 'medium' | 'high';

export interface BetaDiagnosticContext {
  playerId: string;
  roomId: string;
  fps: number;
  avgFrameTimeMs: number;
  qualityPreset: GraphicsQualityPreset;
  viewport: string;
  inputMode: 'desktop' | 'touch';
  visitorCount: number;
  userAgentSummary: string;
}

export interface BetaFeedbackRecord {
  feedbackId: string;
  playerId: string;
  displayName: string;
  roomId: string;
  category: BetaFeedbackCategory;
  severity: BetaFeedbackSeverity;
  message: string;
  diagnostics: BetaDiagnosticContext;
  createdAt: number;
}
```

## 2. Moderation Report Status & Operational Health

```ts
export type PlayerReportStatus = 'open' | 'resolved' | 'dismissed';

// PlayerReportRecord extended with:
// status?: PlayerReportStatus;
// resolvedAt?: number | null;

export interface MaintenanceNoticeState {
  active: boolean;
  message: string;
  severity: 'info' | 'warning';
  updatedAt: number;
}

export interface DiagnosticErrorEntry {
  errorId: string;
  code: string;
  message: string;
  roomId: string | null;
  playerId: string | null;
  timestamp: number;
}

export interface OpsHealthSnapshot {
  version: string;
  status: 'ok' | 'degraded';
  uptimeMs: number;
  totalVisitors: number;
  healthyInstances: number;
  unhealthyInstances: number;
  openReportsCount: number;
  totalReportsCount: number;
  feedbackCount: number;
  recentErrorsCount: number;
  reports: PlayerReportRecord[];
  feedbackItems: BetaFeedbackRecord[];
  recentErrors: DiagnosticErrorEntry[];
  maintenanceNotice: MaintenanceNoticeState | null;
  serverTimestamp: number;
}
```

## 3. Client Performance & Onboarding Persistence Slice

```ts
export interface PerformanceTelemetrySnapshot {
  fps: number;
  avgFrameTimeMs: number;
  p95FrameTimeMs: number;
  lowFpsStreak: number;
  autoDowngradedCount: number;
}

export interface PersistedBetaReadinessState {
  schemaVersion: 1;
  hasCompletedOnboarding: boolean;
  autoQualityAdjust: boolean;
  lastSeenVersion: string;
}
```

