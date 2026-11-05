import { beforeEach, describe, expect, it } from 'vitest';
import {
  BETA_READINESS_STORAGE_KEY,
  gameStore,
  InMemoryMultiplayerHub,
  KNOWN_BETA_LIMITATIONS,
  loadPersistedBetaReadinessState,
  MultiplayerClient,
  ONBOARDING_CONTROL_TIPS,
  parseClientMultiplayerMessage,
  PerformanceMonitor,
  PUBLIC_BETA_VERSION,
  resetBetaReadinessStorageForTest,
  savePersistedBetaReadinessState,
  VALID_BETA_FEEDBACK_CATEGORIES,
  ZooInstanceAuthority
} from '../src';

describe('Feature 010: Public Beta & Production Readiness', () => {
  beforeEach(() => {
    resetBetaReadinessStorageForTest();
    gameStore.getState().resetSession();
  });

  it('SC-001: persists onboarding completion and supports Help & Beta Center navigation', () => {
    expect(PUBLIC_BETA_VERSION).toBe('0.10.0-beta');
    expect(ONBOARDING_CONTROL_TIPS.length).toBeGreaterThanOrEqual(4);
    expect(KNOWN_BETA_LIMITATIONS.length).toBeGreaterThanOrEqual(3);
    expect(VALID_BETA_FEEDBACK_CATEGORIES).toEqual([
      'bug',
      'performance',
      'usability',
      'suggestion',
      'safety'
    ]);

    const initial = loadPersistedBetaReadinessState();
    expect(initial.hasCompletedOnboarding).toBe(false);
    expect(initial.autoQualityAdjust).toBe(true);

    expect(gameStore.getState().betaReadiness.hasCompletedOnboarding).toBe(false);
    expect(gameStore.getState().betaReadiness.isOnboardingOpen).toBe(true);

    // Dismiss onboarding
    gameStore.getState().completeOnboarding();
    expect(gameStore.getState().betaReadiness.hasCompletedOnboarding).toBe(true);
    expect(gameStore.getState().betaReadiness.isOnboardingOpen).toBe(false);

    // Reload persisted state
    const reloaded = loadPersistedBetaReadinessState();
    expect(reloaded.hasCompletedOnboarding).toBe(true);

    // Re-initializing identity preserves completed onboarding
    gameStore.getState().initializePlayerIdentity();
    expect(gameStore.getState().betaReadiness.hasCompletedOnboarding).toBe(true);
    expect(gameStore.getState().betaReadiness.isOnboardingOpen).toBe(false);

    // Open Help & Beta Center and switch tabs
    gameStore.getState().setHelpCenterOpen(true);
    expect(gameStore.getState().betaReadiness.isHelpCenterOpen).toBe(true);
    gameStore.getState().setHelpCenterTab('feedback');
    expect(gameStore.getState().betaReadiness.activeTab).toBe('feedback');
    gameStore.getState().setHelpCenterTab('ops');
    expect(gameStore.getState().betaReadiness.activeTab).toBe('ops');
  });

  it('SC-002: monitors FPS/frame time and automatically steps down quality tier under sustained low FPS', () => {
    const monitor = new PerformanceMonitor({
      windowSize: 20,
      lowFpsThreshold: 28,
      streakToDowngrade: 3
    });

    // Normal 60 FPS frames
    for (let i = 0; i < 20; i++) {
      const res = monitor.recordFrame(1 / 60, 'high', true);
      expect(res.recommendedQuality).toBeNull();
      expect(res.snapshot.fps).toBeGreaterThanOrEqual(55);
    }

    // Clear and simulate sustained 20 FPS frames (50ms per frame)
    monitor.reset();
    let steppedToMedium = false;
    for (let i = 0; i < 25; i++) {
      const res = monitor.recordFrame(0.05, 'high', true);
      if (res.recommendedQuality === 'medium') {
        steppedToMedium = true;
        break;
      }
    }
    expect(steppedToMedium).toBe(true);
    expect(monitor.getSnapshot().autoDowngradedCount).toBe(1);

    // Step down further from medium to low
    let steppedToLow = false;
    for (let i = 0; i < 25; i++) {
      const res = monitor.recordFrame(0.05, 'medium', true);
      if (res.recommendedQuality === 'low') {
        steppedToLow = true;
        break;
      }
    }
    expect(steppedToLow).toBe(true);
    expect(monitor.getSnapshot().autoDowngradedCount).toBe(2);

    // When autoQualityAdjust is false, no quality change is recommended
    monitor.reset();
    for (let i = 0; i < 25; i++) {
      const res = monitor.recordFrame(0.05, 'high', false);
      expect(res.recommendedQuality).toBeNull();
    }
  });

  it('SC-003: recovers safely from corrupted storage and preserves player data on protocol errors', () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(BETA_READINESS_STORAGE_KEY, '{corrupted_json!!');
    }
    const fallback = loadPersistedBetaReadinessState();
    expect(fallback.hasCompletedOnboarding).toBe(false);
    expect(fallback.autoQualityAdjust).toBe(true);

    savePersistedBetaReadinessState({
      hasCompletedOnboarding: true,
      autoQualityAdjust: false
    });
    expect(loadPersistedBetaReadinessState()).toMatchObject({
      hasCompletedOnboarding: true,
      autoQualityAdjust: false
    });

    // Verify client diagnostic error recording preserves wallet & passport
    const coinsBefore = gameStore.getState().dining.wallet.currencyBalance;
    gameStore.getState().recordZoneVisit('zone-welcome-plaza');
    gameStore.getState().recordClientError('FEEDBACK_RATE_LIMITED', 'Rate limit hit');

    expect(gameStore.getState().dining.wallet.currencyBalance).toBe(coinsBefore);
    expect(gameStore.getState().passport.state.stamps['zone-welcome-plaza'].obtained).toBe(true);
    expect(gameStore.getState().betaReadiness.clientErrors).toHaveLength(1);
    expect(gameStore.getState().betaReadiness.clientErrors[0]?.code).toBe(
      'FEEDBACK_RATE_LIMITED'
    );
  });

  it('SC-004: validates, stores, and rate-limits context-rich beta feedback submissions', () => {
    const parsedValid = parseClientMultiplayerMessage(
      JSON.stringify({
        type: 'submit_beta_feedback',
        category: 'usability',
        severity: 'medium',
        message: 'Mobile touch joystick feels responsive around the Lotus Pond!',
        diagnostics: {
          fps: 58,
          qualityPreset: 'high',
          viewport: '390x844',
          inputMode: 'touch'
        }
      })
    );
    expect(parsedValid?.type).toBe('submit_beta_feedback');

    const parsedInvalidCategory = parseClientMultiplayerMessage(
      JSON.stringify({
        type: 'submit_beta_feedback',
        category: 'invalid-cat',
        severity: 'low',
        message: 'Valid length message with invalid category'
      })
    );
    expect(parsedInvalidCategory).toBeNull();

    const authority = new ZooInstanceAuthority();
    const joined = authority.joinOrResumePlayer({
      playerId: 'plr_beta_tester_01',
      displayName: 'BetaExplorer'
    });
    const sessionId = joined.welcome.sessionId;

    // Too short message is rejected by authority validation
    const tooShortRes = authority.submitBetaFeedback(sessionId, {
      type: 'submit_beta_feedback',
      category: 'bug',
      severity: 'low',
      message: 'hi'
    });
    expect(tooShortRes.accepted).toBe(false);
    expect(tooShortRes.errorCode).toBe('INVALID_PAYLOAD');

    // Submit 5 valid feedback items within 60s
    for (let i = 1; i <= 5; i++) {
      const res = authority.submitBetaFeedback(
        sessionId,
        {
          type: 'submit_beta_feedback',
          category: 'bug',
          severity: 'medium',
          message: `Beta feedback report #${i} with detailed context`,
          diagnostics: {
            fps: 60,
            qualityPreset: 'auto',
            viewport: '1440x900',
            inputMode: 'desktop'
          }
        },
        10_000 + i * 100
      );
      expect(res.accepted).toBe(true);
      expect(res.ack?.feedback.diagnostics.playerId).toBe('plr_beta_tester_01');
      expect(res.ack?.feedback.diagnostics.roomId).toBe('panda-forest-1');
    }

    // 6th within 60s should be rate-limited
    const sixth = authority.submitBetaFeedback(
      sessionId,
      {
        type: 'submit_beta_feedback',
        category: 'suggestion',
        severity: 'low',
        message: 'One more suggestion within the same minute'
      },
      11_000
    );
    expect(sixth.accepted).toBe(false);
    expect(sixth.errorCode).toBe('FEEDBACK_RATE_LIMITED');

    // After 60s window expires, submission succeeds again
    const afterWindow = authority.submitBetaFeedback(
      sessionId,
      {
        type: 'submit_beta_feedback',
        category: 'suggestion',
        severity: 'low',
        message: 'Suggestion after cooldown window has elapsed'
      },
      75_000
    );
    expect(afterWindow.accepted).toBe(true);
    expect(authority.getOpsHealthSnapshot(75_000).feedbackCount).toBe(6);
  });

  it('SC-005: supports operator health snapshots, moderation report resolution, and live maintenance notices via MultiplayerClient', async () => {
    const hub = new InMemoryMultiplayerHub();
    const clientA = new MultiplayerClient({
      roomId: 'panda-forest-1',
      transportFactory: hub.createTransportFactory()
    });
    clientA.connect();
    await new Promise((r) => setTimeout(r, 20));

    expect(gameStore.getState().multiplayer.status).toBe('connected');

    // Submit a player safety report and verify openReportsCount increments
    clientA.submitPlayerReport({
      reportedPlayerId: 'plr_griefer_99',
      reportedSessionId: null,
      reportedDisplayName: 'NoisyVisitor',
      reason: 'inappropriate-chat',
      details: 'Repeatedly spamming chat near Panda Grove'
    });
    await new Promise((r) => setTimeout(r, 20));

    clientA.requestOpsSnapshot();
    await new Promise((r) => setTimeout(r, 20));
    const opsAfterReport = gameStore.getState().betaReadiness.opsSnapshot;
    expect(opsAfterReport).not.toBeNull();
    expect(opsAfterReport?.openReportsCount).toBe(1);
    const reportId = opsAfterReport?.reports[0]?.reportId;
    expect(reportId).toBeDefined();

    // Resolve the report as operator
    clientA.resolvePlayerReport(reportId!, 'resolved');
    await new Promise((r) => setTimeout(r, 20));
    const opsAfterResolve = gameStore.getState().betaReadiness.opsSnapshot;
    expect(opsAfterResolve?.openReportsCount).toBe(0);
    expect(opsAfterResolve?.reports[0]?.status).toBe('resolved');

    // Submit beta feedback through clientA
    clientA.submitBetaFeedback({
      category: 'performance',
      severity: 'low',
      message: 'Smooth 60fps around the Bamboo Bridge!'
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(gameStore.getState().betaReadiness.opsSnapshot?.feedbackItems.length).toBeGreaterThanOrEqual(
      1
    );
    expect(gameStore.getState().betaReadiness.feedbackNotice?.message).toContain('Thank you');

    // Broadcast non-disruptive maintenance notice
    clientA.setMaintenanceNotice({
      active: true,
      severity: 'warning',
      message: 'Scheduled patch in 5 minutes — active zoo instances remain online.'
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(gameStore.getState().betaReadiness.maintenanceNotice?.active).toBe(true);
    expect(gameStore.getState().betaReadiness.maintenanceNotice?.message).toContain(
      'Scheduled patch in 5 minutes'
    );
    expect(gameStore.getState().multiplayer.status).toBe('connected');

    // Clear maintenance notice
    clientA.setMaintenanceNotice({
      active: false,
      severity: 'info',
      message: ''
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(gameStore.getState().betaReadiness.maintenanceNotice).toBeNull();

    clientA.disconnect(true);
  });
});
