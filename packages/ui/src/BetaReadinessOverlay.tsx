import React, { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import {
  gameStore,
  KNOWN_BETA_LIMITATIONS,
  ONBOARDING_CONTROL_TIPS,
  PUBLIC_BETA_VERSION,
  SUPPORTED_DEVICE_EXPECTATIONS,
  VALID_BETA_FEEDBACK_CATEGORIES,
  type BetaFeedbackCategory,
  type BetaFeedbackSeverity,
  type HelpCenterTabId
} from '@online-zoo/game-core';

const FEEDBACK_CATEGORY_LABELS: Record<BetaFeedbackCategory, string> = {
  bug: 'Bug or Glitch',
  performance: 'Frame Rate / Lag',
  usability: 'Controls & UI Usability',
  suggestion: 'Feature Suggestion',
  safety: 'Safety / Moderation'
};

interface RuntimeMultiplayerBridge {
  submitBetaFeedback?: (payload: {
    category: BetaFeedbackCategory;
    severity: BetaFeedbackSeverity;
    message: string;
  }) => { valid: boolean; errorMessage?: string };
  resolvePlayerReport?: (reportId: string, resolution: 'resolved' | 'dismissed') => void;
  setMaintenanceNotice?: (payload: {
    active: boolean;
    severity?: 'info' | 'warning';
    message?: string;
  }) => void;
  requestOpsSnapshot?: () => void;
}

function getRuntimeMultiplayerClient(): RuntimeMultiplayerBridge | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    __ONLINE_ZOO_RUNTIME__?: {
      multiplayerClient?: RuntimeMultiplayerBridge;
    };
  };
  return w.__ONLINE_ZOO_RUNTIME__?.multiplayerClient ?? null;
}

export const BetaReadinessOverlay: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const betaReadiness = useStore(gameStore, (s) => s.betaReadiness);
  const settings = useStore(gameStore, (s) => s.settings);
  const identityProfile = useStore(gameStore, (s) => s.identity.profile);
  const multiplayer = useStore(gameStore, (s) => s.multiplayer);
  const activeDevice = useStore(gameStore, (s) => s.activeDevice);
  const submittedReportsLocal = useStore(gameStore, (s) => s.social.submittedReports);

  const completeOnboarding = useStore(gameStore, (s) => s.completeOnboarding);
  const setOnboardingOpen = useStore(gameStore, (s) => s.setOnboardingOpen);
  const setHelpCenterOpen = useStore(gameStore, (s) => s.setHelpCenterOpen);
  const setHelpCenterTab = useStore(gameStore, (s) => s.setHelpCenterTab);
  const setAutoQualityAdjust = useStore(gameStore, (s) => s.setAutoQualityAdjust);
  const setBetaFeedbackNotice = useStore(gameStore, (s) => s.setBetaFeedbackNotice);

  const [feedbackCategory, setFeedbackCategory] = useState<BetaFeedbackCategory>('bug');
  const [feedbackSeverity, setFeedbackSeverity] = useState<BetaFeedbackSeverity>('medium');
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const [maintenanceSeverity, setMaintenanceSeverity] = useState<'info' | 'warning'>('warning');
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    'Scheduled sanctuary update in 10 minutes — active sessions will stay connected.'
  );

  useEffect(() => {
    if (betaReadiness.isHelpCenterOpen) {
      getRuntimeMultiplayerClient()?.requestOpsSnapshot?.();
    }
  }, [betaReadiness.isHelpCenterOpen, betaReadiness.activeTab]);

  if (phase !== 'playing') {
    return null;
  }

  const showOnboardingCard =
    betaReadiness.isOnboardingOpen && !betaReadiness.hasCompletedOnboarding;
  const showHelpModal = betaReadiness.isHelpCenterOpen;

  if (!showOnboardingCard && !showHelpModal) {
    return null;
  }

  const viewportLabel =
    typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '1280x720';

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = feedbackMessage.trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
      setBetaFeedbackNotice({
        type: 'error',
        message: 'Feedback message must be between 5 and 500 characters.'
      });
      return;
    }
    const client = getRuntimeMultiplayerClient();
    if (client?.submitBetaFeedback) {
      const res = client.submitBetaFeedback({
        category: feedbackCategory,
        severity: feedbackSeverity,
        message: trimmed
      });
      if (res.valid) {
        setFeedbackMessage('');
      }
    } else {
      setBetaFeedbackNotice({
        type: 'success',
        message: 'Thank you! Beta feedback has been recorded locally with device diagnostics.'
      });
      setFeedbackMessage('');
    }
  };

  const handleTabSwitch = (tab: HelpCenterTabId) => {
    setHelpCenterTab(tab);
    if (tab === 'ops') {
      getRuntimeMultiplayerClient()?.requestOpsSnapshot?.();
    }
  };

  const opsReports = betaReadiness.opsSnapshot?.reports ?? submittedReportsLocal;
  const opsFeedbackItems = betaReadiness.opsSnapshot?.feedbackItems ?? [];
  const opsRecentErrors =
    betaReadiness.opsSnapshot?.recentErrors && betaReadiness.opsSnapshot.recentErrors.length > 0
      ? betaReadiness.opsSnapshot.recentErrors
      : betaReadiness.clientErrors;

  return (
    <>
      {/* Non-blocking Compact Welcome & Arrival Guide Card (FR-001, FR-002, SC-001) */}
      {showOnboardingCard && (
        <aside
          data-testid="onboarding-guide-modal"
          aria-label="Welcome & Controls Guide"
          className="pointer-events-auto fixed left-3 top-[8.25rem] z-20 w-full max-w-xs rounded-2xl border border-emerald-300/40 bg-emerald-950/90 p-3 text-white shadow-xl backdrop-blur-md sm:left-4"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-200">
                <span>✨ Public Beta (v{PUBLIC_BETA_VERSION})</span>
              </span>
              <h2 className="mt-1 text-sm font-extrabold tracking-tight text-white">
                Welcome to Panda Forest Sanctuary!
              </h2>
              <p className="mt-0.5 text-[11px] leading-snug text-emerald-100/90">
                You are outside the <strong>Sanctuary Gate</strong> — press{' '}
                <strong className="text-amber-200">W / ↑</strong> to walk forward through the gate
                into the Welcome Plaza!
              </p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {ONBOARDING_CONTROL_TIPS.slice(0, 4).map((tip) => (
              <div
                key={tip.id}
                className="rounded-xl border border-emerald-500/20 bg-emerald-900/45 p-1.5 text-[10px]"
              >
                <p className="font-bold text-emerald-200">{tip.actionLabel}</p>
                <p className="font-semibold text-amber-200">{tip.keysOrGesture}</p>
              </div>
            ))}
          </div>

          <div className="mt-2.5 flex items-center justify-end gap-1.5">
            <button
              type="button"
              data-testid="onboarding-open-help-btn"
              onClick={() => {
                completeOnboarding();
                setHelpCenterOpen(true, 'controls');
              }}
              className="rounded-lg border border-emerald-300/35 bg-emerald-900/75 px-2.5 py-1 text-[11px] font-bold text-emerald-100 transition hover:bg-emerald-800"
            >
              Full Guide
            </button>
            <button
              type="button"
              data-testid="dismiss-onboarding-btn"
              onClick={() => completeOnboarding()}
              className="rounded-lg bg-gradient-to-r from-emerald-400 to-lime-400 px-3 py-1 text-[11px] font-extrabold text-emerald-950 shadow transition hover:brightness-105"
            >
              Got It!
            </button>
          </div>
        </aside>
      )}

      {/* Help, Beta Feedback & Operator Readiness Center Modal (FR-002..FR-015, SC-001..SC-005) */}
      {showHelpModal && (
        <div
          data-testid="help-beta-modal"
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="flex max-h-[60vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-emerald-400/35 bg-emerald-950/95 text-white shadow-2xl sm:max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-emerald-900/50 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/20 text-xl">
                  🛡️
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold tracking-tight text-white">
                      Help, Public Beta &amp; Operator Readiness Center
                    </h2>
                    <span className="rounded-full border border-amber-300/45 bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-200">
                      v{PUBLIC_BETA_VERSION}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/85">
                    Controls reference, known beta scope, in-game feedback &amp; live operator
                    diagnostics
                  </p>
                </div>
              </div>

              <button
                type="button"
                data-testid="close-help-beta-btn"
                onClick={() => setHelpCenterOpen(false)}
                className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
              >
                Close (ESC)
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-white/10 bg-emerald-950/80 px-6 py-3">
              <button
                type="button"
                data-testid="help-tab-controls"
                onClick={() => handleTabSwitch('controls')}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                  betaReadiness.activeTab === 'controls'
                    ? 'bg-amber-400 text-emerald-950 shadow'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                }`}
              >
                📖 Controls &amp; Beta Scope
              </button>
              <button
                type="button"
                data-testid="help-tab-feedback"
                onClick={() => handleTabSwitch('feedback')}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                  betaReadiness.activeTab === 'feedback'
                    ? 'bg-amber-400 text-emerald-950 shadow'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                }`}
              >
                💬 Submit Beta Feedback
              </button>
              <button
                type="button"
                data-testid="help-tab-ops"
                onClick={() => handleTabSwitch('ops')}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                  betaReadiness.activeTab === 'ops'
                    ? 'bg-amber-400 text-emerald-950 shadow'
                    : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                }`}
              >
                📊 Operator Health &amp; Moderation
              </button>
            </div>

            {/* Tab Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {betaReadiness.activeTab === 'controls' && (
                <div className="space-y-6">
                  {/* Controls Section */}
                  <section>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-300">
                        Desktop &amp; Mobile Controls
                      </h3>
                      <button
                        type="button"
                        data-testid="reopen-onboarding-btn"
                        onClick={() => {
                          setHelpCenterOpen(false);
                          setOnboardingOpen(true);
                        }}
                        className="rounded-lg border border-emerald-400/35 bg-emerald-900/60 px-3 py-1 text-xs font-bold text-emerald-200 transition hover:bg-emerald-800"
                      >
                        Show Welcome Card
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {ONBOARDING_CONTROL_TIPS.map((tip) => (
                        <div
                          key={tip.id}
                          className="rounded-2xl border border-emerald-400/25 bg-emerald-900/40 p-4"
                        >
                          <p className="text-sm font-extrabold text-white">{tip.actionLabel}</p>
                          <p className="mt-1 text-xs font-bold text-amber-300">
                            {tip.keysOrGesture}
                          </p>
                          <p className="mt-1.5 text-xs leading-relaxed text-emerald-100/90">
                            {tip.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Supported Devices & Browsers */}
                  <section>
                    <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-amber-300">
                      Supported Devices &amp; Performance Targets
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {SUPPORTED_DEVICE_EXPECTATIONS.map((item) => (
                        <div
                          key={item.platform}
                          className="rounded-2xl border border-white/15 bg-white/5 p-3.5 text-xs"
                        >
                          <p className="font-extrabold text-emerald-200">{item.platform}</p>
                          <p className="mt-1 text-emerald-100/85">
                            <strong>Browsers:</strong> {item.browsers}
                          </p>
                          <p className="mt-0.5 text-amber-200/90">
                            <strong>Target:</strong> {item.targetFps} ({item.notes})
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Known Beta Limitations */}
                  <section data-testid="known-limitations-section">
                    <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-amber-300">
                      Known Public Beta Scope &amp; Limitations
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {KNOWN_BETA_LIMITATIONS.map((lim) => (
                        <div
                          key={lim.id}
                          className="rounded-2xl border border-amber-400/25 bg-amber-950/25 p-3.5 text-xs"
                        >
                          <p className="font-extrabold text-amber-200">{lim.title}</p>
                          <p className="mt-1 leading-relaxed text-emerald-100/85">{lim.summary}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {betaReadiness.activeTab === 'feedback' && (
                <div className="space-y-6">
                  <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                    <div className="rounded-2xl border border-emerald-400/25 bg-emerald-900/40 p-4">
                      <h3 className="text-sm font-extrabold text-white">
                        Share Public Beta Feedback or Report a Bug
                      </h3>
                      <p className="mt-1 text-xs text-emerald-100/85">
                        Your feedback automatically attaches lightweight diagnostic context so our
                        team can reproduce issues quickly.
                      </p>

                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="beta-feedback-category"
                            className="block text-xs font-bold text-emerald-200"
                          >
                            Category
                          </label>
                          <select
                            id="beta-feedback-category"
                            data-testid="beta-feedback-category-select"
                            value={feedbackCategory}
                            onChange={(e) =>
                              setFeedbackCategory(e.target.value as BetaFeedbackCategory)
                            }
                            className="mt-1 w-full rounded-xl border border-white/20 bg-emerald-950 px-3 py-2 text-xs font-semibold text-white"
                          >
                            {VALID_BETA_FEEDBACK_CATEGORIES.map((catId) => (
                              <option key={catId} value={catId}>
                                {FEEDBACK_CATEGORY_LABELS[catId]}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="beta-feedback-severity"
                            className="block text-xs font-bold text-emerald-200"
                          >
                            Impact / Severity
                          </label>
                          <select
                            id="beta-feedback-severity"
                            data-testid="beta-feedback-severity-select"
                            value={feedbackSeverity}
                            onChange={(e) =>
                              setFeedbackSeverity(e.target.value as BetaFeedbackSeverity)
                            }
                            className="mt-1 w-full rounded-xl border border-white/20 bg-emerald-950 px-3 py-2 text-xs font-semibold text-white"
                          >
                            <option value="low">Low — Minor polish or suggestion</option>
                            <option value="medium">Medium — Noticeable gameplay or UI issue</option>
                            <option value="high">High — Blocks exploration or causes errors</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-4">
                        <label
                          htmlFor="beta-feedback-message"
                          className="block text-xs font-bold text-emerald-200"
                        >
                          Message (5–500 characters)
                        </label>
                        <textarea
                          id="beta-feedback-message"
                          data-testid="beta-feedback-input"
                          rows={3}
                          maxLength={500}
                          value={feedbackMessage}
                          onChange={(e) => setFeedbackMessage(e.target.value)}
                          placeholder="Describe what happened, how the controls felt, or what you would love to see next..."
                          className="mt-1 w-full rounded-xl border border-white/20 bg-emerald-950/90 p-3 text-xs text-white placeholder-emerald-300/50"
                        />
                      </div>

                      {/* Auto-attached Diagnostics Preview */}
                      <div
                        data-testid="beta-feedback-diagnostics-preview"
                        className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-[11px] text-emerald-200"
                      >
                        <span className="font-bold text-amber-300">Auto-Attached Context:</span>
                        <span>Player: {identityProfile.playerId}</span>
                        <span>•</span>
                        <span>Instance: {multiplayer.roomId}</span>
                        <span>•</span>
                        <span>FPS: {betaReadiness.telemetry.fps}</span>
                        <span>•</span>
                        <span>Quality: {settings.qualityTier}</span>
                        <span>•</span>
                        <span>Viewport: {viewportLabel}</span>
                        <span>•</span>
                        <span>Input: {activeDevice}</span>
                      </div>

                      {betaReadiness.feedbackNotice && (
                        <div
                          data-testid="beta-feedback-notice"
                          className={`mt-3 rounded-xl border px-3.5 py-2 text-xs font-bold ${
                            betaReadiness.feedbackNotice.type === 'error'
                              ? 'border-rose-300/40 bg-rose-500/20 text-rose-100'
                              : 'border-amber-300/40 bg-amber-500/20 text-amber-100'
                          }`}
                        >
                          {betaReadiness.feedbackNotice.message}
                        </div>
                      )}

                      <div className="mt-4 flex justify-end">
                        <button
                          type="submit"
                          data-testid="submit-beta-feedback-btn"
                          className="rounded-xl bg-gradient-to-r from-amber-400 to-lime-400 px-5 py-2.5 text-xs font-extrabold text-emerald-950 shadow transition hover:brightness-105"
                        >
                          Submit Beta Feedback
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {betaReadiness.activeTab === 'ops' && (
                <div className="space-y-6">
                  {/* Client Performance & Adaptive Quality Panel (SC-002) */}
                  <section
                    data-testid="ops-telemetry-panel"
                    className="rounded-2xl border border-emerald-400/25 bg-emerald-900/40 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-white">
                          Client Frame Telemetry &amp; Adaptive Quality Guard
                        </h3>
                        <p className="text-xs text-emerald-200/85">
                          Automatically steps down quality tier if sustained frame rate drops below
                          28 FPS
                        </p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-emerald-950/80 px-3 py-1.5 text-xs font-bold text-emerald-100">
                        <input
                          type="checkbox"
                          data-testid="ops-auto-quality-toggle"
                          checked={betaReadiness.autoQualityAdjust}
                          onChange={(e) => setAutoQualityAdjust(e.target.checked)}
                          className="h-4 w-4 accent-amber-400"
                        />
                        <span>Auto Quality Step-Down</span>
                      </label>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                      <div className="rounded-xl bg-emerald-950/70 p-2.5 text-center">
                        <p className="text-[11px] text-emerald-300">Current FPS</p>
                        <p
                          data-testid="ops-current-fps"
                          className="text-base font-extrabold text-white"
                        >
                          {betaReadiness.telemetry.fps}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-950/70 p-2.5 text-center">
                        <p className="text-[11px] text-emerald-300">Avg Frame</p>
                        <p
                          data-testid="ops-avg-frame-ms"
                          className="text-base font-extrabold text-white"
                        >
                          {betaReadiness.telemetry.avgFrameTimeMs} ms
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-950/70 p-2.5 text-center">
                        <p className="text-[11px] text-emerald-300">P95 Frame</p>
                        <p
                          data-testid="ops-p95-frame-ms"
                          className="text-base font-extrabold text-white"
                        >
                          {betaReadiness.telemetry.p95FrameTimeMs} ms
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-950/70 p-2.5 text-center">
                        <p className="text-[11px] text-emerald-300">Quality Tier</p>
                        <p
                          data-testid="ops-quality-preset"
                          className="text-base font-extrabold uppercase text-amber-300"
                        >
                          {settings.qualityTier}
                        </p>
                      </div>
                      <div className="rounded-xl bg-emerald-950/70 p-2.5 text-center">
                        <p className="text-[11px] text-emerald-300">Auto Step-Downs</p>
                        <p
                          data-testid="ops-auto-downgrades"
                          className="text-base font-extrabold text-white"
                        >
                          {betaReadiness.telemetry.autoDowngradedCount}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Live Service & Instance Health Summary (SC-005) */}
                  <section
                    data-testid="ops-health-summary"
                    className="rounded-2xl border border-white/15 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-white">
                        Live Service Health &amp; Instance Telemetry
                      </h3>
                      <button
                        type="button"
                        data-testid="refresh-ops-snapshot-btn"
                        onClick={() => getRuntimeMultiplayerClient()?.requestOpsSnapshot?.()}
                        className="rounded-lg border border-emerald-300/35 bg-emerald-900/70 px-3 py-1 text-xs font-bold text-emerald-100 transition hover:bg-emerald-800"
                      >
                        Refresh Snapshot
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-xl bg-black/25 p-2.5 text-xs">
                        <p className="text-emerald-300">Service Status</p>
                        <p
                          data-testid="ops-service-status"
                          className="mt-0.5 font-extrabold uppercase text-emerald-200"
                        >
                          {betaReadiness.opsSnapshot?.status ?? 'ok'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/25 p-2.5 text-xs">
                        <p className="text-emerald-300">Active Visitors / Rooms</p>
                        <p className="mt-0.5 font-extrabold text-white">
                          {betaReadiness.opsSnapshot?.totalVisitors ?? multiplayer.visitorCount}{' '}
                          visitors • {betaReadiness.opsSnapshot?.healthyInstances ?? 3} healthy
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/25 p-2.5 text-xs">
                        <p className="text-emerald-300">Open Safety Reports</p>
                        <p
                          data-testid="ops-open-reports-count"
                          className="mt-0.5 font-extrabold text-amber-300"
                        >
                          {betaReadiness.opsSnapshot?.openReportsCount ??
                            opsReports.filter(
                              (r) => r.status !== 'resolved' && r.status !== 'dismissed'
                            ).length}
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/25 p-2.5 text-xs">
                        <p className="text-emerald-300">Feedback / Errors</p>
                        <p className="mt-0.5 font-extrabold text-white">
                          {betaReadiness.opsSnapshot?.feedbackCount ?? opsFeedbackItems.length}{' '}
                          feedback • {opsRecentErrors.length} errors
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Non-Disruptive Maintenance Notice Broadcast Panel (FR-015, SC-005) */}
                  <section
                    data-testid="ops-maintenance-panel"
                    className="rounded-2xl border border-amber-300/30 bg-amber-950/30 p-4"
                  >
                    <h3 className="text-sm font-extrabold text-amber-200">
                      Non-Disruptive Maintenance &amp; Update Banner
                    </h3>
                    <p className="mt-0.5 text-xs text-emerald-100/85">
                      Broadcast a live maintenance or release notice to all connected visitors
                      without interrupting active sessions.
                    </p>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <select
                        data-testid="maintenance-severity-select"
                        value={maintenanceSeverity}
                        onChange={(e) =>
                          setMaintenanceSeverity(e.target.value as 'info' | 'warning')
                        }
                        className="rounded-xl border border-white/20 bg-emerald-950 px-3 py-2 text-xs font-bold text-white"
                      >
                        <option value="info">Info Notice</option>
                        <option value="warning">Warning Banner</option>
                      </select>
                      <input
                        type="text"
                        data-testid="maintenance-message-input"
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        placeholder="Enter maintenance or update announcement..."
                        className="flex-1 rounded-xl border border-white/20 bg-emerald-950 px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        data-testid="broadcast-maintenance-btn"
                        onClick={() =>
                          getRuntimeMultiplayerClient()?.setMaintenanceNotice?.({
                            active: true,
                            severity: maintenanceSeverity,
                            message: maintenanceMessage
                          })
                        }
                        className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-extrabold text-emerald-950 shadow transition hover:bg-amber-300"
                      >
                        Broadcast Banner
                      </button>
                      <button
                        type="button"
                        data-testid="clear-maintenance-btn"
                        onClick={() =>
                          getRuntimeMultiplayerClient()?.setMaintenanceNotice?.({
                            active: false,
                            severity: 'info',
                            message: ''
                          })
                        }
                        className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
                      >
                        Clear
                      </button>
                    </div>
                  </section>

                  {/* Moderation & Player Safety Triage Queue (FR-012, SC-005) */}
                  <section data-testid="ops-reports-list" className="space-y-2">
                    <h3 className="text-sm font-extrabold text-white">
                      Player Safety &amp; Moderation Reports ({opsReports.length})
                    </h3>
                    {opsReports.length === 0 ? (
                      <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-emerald-200/80">
                        No moderation reports submitted in this session.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {opsReports.map((rep) => {
                          const status = rep.status ?? 'open';
                          return (
                            <div
                              key={rep.reportId}
                              data-testid={`ops-report-item-${rep.reportId}`}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/15 bg-emerald-900/45 p-3 text-xs"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-white">
                                    Reported: {rep.reportedDisplayName} ({rep.reportedPlayerId})
                                  </span>
                                  <span
                                    data-testid={`ops-report-status-${rep.reportId}`}
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                      status === 'resolved'
                                        ? 'bg-emerald-500/30 text-emerald-200'
                                        : status === 'dismissed'
                                          ? 'bg-white/15 text-emerald-200'
                                          : 'bg-rose-500/30 text-rose-200'
                                    }`}
                                  >
                                    {status}
                                  </span>
                                </div>
                                <p className="mt-1 text-emerald-100/85">
                                  <strong>Reason:</strong> {rep.reason} •{' '}
                                  <strong>Instance:</strong> {rep.roomId}
                                  {rep.details ? ` • "${rep.details}"` : ''}
                                </p>
                              </div>

                              {status === 'open' && (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    data-testid={`resolve-report-btn-${rep.reportId}`}
                                    onClick={() =>
                                      getRuntimeMultiplayerClient()?.resolvePlayerReport?.(
                                        rep.reportId,
                                        'resolved'
                                      )
                                    }
                                    className="rounded-lg bg-emerald-400 px-3 py-1 text-xs font-extrabold text-emerald-950 transition hover:bg-emerald-300"
                                  >
                                    Resolve
                                  </button>
                                  <button
                                    type="button"
                                    data-testid={`dismiss-report-btn-${rep.reportId}`}
                                    onClick={() =>
                                      getRuntimeMultiplayerClient()?.resolvePlayerReport?.(
                                        rep.reportId,
                                        'dismissed'
                                      )
                                    }
                                    className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/20"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* Beta Feedback Triage List (FR-013, SC-004) */}
                  <section data-testid="ops-feedback-list" className="space-y-2">
                    <h3 className="text-sm font-extrabold text-white">
                      Submitted Beta Feedback ({opsFeedbackItems.length})
                    </h3>
                    {opsFeedbackItems.length === 0 ? (
                      <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-emerald-200/80">
                        No beta feedback items submitted yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {opsFeedbackItems.map((fb) => (
                          <div
                            key={fb.feedbackId}
                            data-testid={`ops-feedback-item-${fb.feedbackId}`}
                            className="rounded-2xl border border-white/15 bg-emerald-900/35 p-3 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-extrabold text-amber-200">
                                [{fb.category.toUpperCase()} • {fb.severity.toUpperCase()}]{' '}
                                {fb.displayName} ({fb.playerId})
                              </span>
                              <span className="text-[11px] text-emerald-300">
                                {fb.roomId} • {fb.diagnostics.fps} FPS •{' '}
                                {fb.diagnostics.qualityPreset} • {fb.diagnostics.inputMode}
                              </span>
                            </div>
                            <p className="mt-1 text-white">{fb.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
