import { expect, test } from '@playwright/test';

test.describe('Feature 010 — Public Beta & Production Readiness (Multi-Session E2E)', () => {
  test('verifies onboarding guide & persistence, Help & Beta Center, adaptive quality telemetry, context-rich beta feedback, moderation report triage, live maintenance banner, and /api/health endpoint (SC-001 to SC-005)', async ({
    browser,
    request
  }) => {
    test.setTimeout(90_000);
    const roomId = 'panda-forest-1';

    const contextA = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const contextB = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. SC-001: First-time visitor sees Public Beta badge and Onboarding Guide
      await pageA.goto(`/?room=${roomId}`);
      await expect(pageA.getByTestId('entry-beta-badge')).toContainText('Public Beta v0.10.0-beta', {
        timeout: 25_000
      });
      await expect(pageA.getByTestId('enter-world-btn')).toBeEnabled({
        timeout: 25_000
      });
      await pageA.getByTestId('enter-world-btn').click();

      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 15_000
      });
      await expect(pageA.getByTestId('hud-beta-badge')).toHaveText('Public Beta');
      await expect(pageA.getByTestId('onboarding-guide-modal')).toBeVisible();

      // Dismiss onboarding and verify persistence across reload
      await pageA.getByTestId('dismiss-onboarding-btn').click();
      await expect(pageA.getByTestId('onboarding-guide-modal')).toBeHidden();

      await pageA.reload();
      await expect(pageA.getByTestId('enter-world-btn')).toBeEnabled({
        timeout: 25_000
      });
      await pageA.getByTestId('enter-world-btn').click();
      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 15_000
      });
      await expect(pageA.getByTestId('onboarding-guide-modal')).toBeHidden();

      // Open Help & Beta Center from HUD and verify Controls & Known Beta Limitations
      await pageA.getByTestId('hud-help-beta-btn').click();
      await expect(pageA.getByTestId('help-beta-modal')).toBeVisible();
      await expect(pageA.getByTestId('known-limitations-section')).toBeVisible();

      // 2. SC-002: Adaptive quality step-down under sustained low FPS
      await pageA.getByTestId('help-tab-ops').click();
      await expect(pageA.getByTestId('ops-telemetry-panel')).toBeVisible();

      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            gameStore: {
              getState: () => {
                updateSettings: (p: { qualityTier: 'high' }) => void;
              };
            };
            performanceMonitor: { reset: () => void };
            stepFrames: (frames: number, dt: number) => void;
          };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.gameStore.getState().updateSettings({ qualityTier: 'high' });
        rt.performanceMonitor.reset();
        rt.stepFrames(17, 0.05); // 20 FPS sustained -> first step-down ('high' -> 'medium')
      });

      await expect(pageA.getByTestId('ops-quality-preset')).toHaveText('medium');
      await expect(pageA.getByTestId('ops-auto-downgrades')).not.toHaveText('0');

      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            stepFrames: (frames: number, dt: number) => void;
          };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.stepFrames(6, 0.05); // Continued 20 FPS -> second step-down ('medium' -> 'low')
      });

      await expect(pageA.getByTestId('ops-quality-preset')).toHaveText('low');

      // 3. SC-004 & SC-003: Submit context-rich Beta Feedback and verify data integrity
      await pageA.getByTestId('help-tab-feedback').click();
      await pageA.getByTestId('beta-feedback-category-select').selectOption('usability');
      await pageA.getByTestId('beta-feedback-severity-select').selectOption('medium');
      await pageA
        .getByTestId('beta-feedback-input')
        .fill('Controls and camera orbit feel smooth on desktop and mobile!');
      await pageA.getByTestId('submit-beta-feedback-btn').click();

      await expect(pageA.getByTestId('beta-feedback-notice')).toContainText('Thank you', {
        timeout: 10_000
      });
      await expect(pageA.getByTestId('hud-currency-badge')).toContainText('100 Coins');

      // 4. SC-005: Visitor B joins, Visitor A submits & resolves a safety report, and broadcasts a live maintenance notice
      await pageB.goto(`/?room=${roomId}`);
      await expect(pageB.getByTestId('enter-world-btn')).toBeEnabled({
        timeout: 25_000
      });
      await pageB.getByTestId('enter-world-btn').click();
      await expect(pageB.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 15_000
      });

      const infoB = await pageB.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            multiplayerClient: { getSessionId: () => string };
            gameStore: {
              getState: () => {
                identity: { profile: { playerId: string; displayName: string } };
              };
            };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        return {
          sessionId: rt.multiplayerClient.getSessionId(),
          playerId: rt.gameStore.getState().identity.profile.playerId,
          displayName: rt.gameStore.getState().identity.profile.displayName
        };
      });

      // Visitor A submits a moderation report for Visitor B
      await pageA.evaluate((target) => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            multiplayerClient: {
              submitPlayerReport: (p: {
                reportedPlayerId: string;
                reportedSessionId: string;
                reportedDisplayName: string;
                reason: 'inappropriate-chat';
                details: string;
              }) => void;
            };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.multiplayerClient.submitPlayerReport({
          reportedPlayerId: target.playerId,
          reportedSessionId: target.sessionId,
          reportedDisplayName: target.displayName,
          reason: 'inappropriate-chat',
          details: 'E2E moderation triage verification'
        });
      }, infoB);

      await pageA.getByTestId('help-tab-ops').click();
      await expect(pageA.getByTestId('ops-feedback-list')).toContainText(
        'Controls and camera orbit feel smooth on desktop and mobile!',
        { timeout: 10_000 }
      );
      await expect(pageA.getByTestId('ops-reports-list')).toContainText(
        'E2E moderation triage verification',
        { timeout: 10_000 }
      );

      // Resolve the open report in the Operator Console
      const resolveBtn = pageA.locator('[data-testid^="resolve-report-btn-"]').first();
      await expect(resolveBtn).toBeVisible();
      await resolveBtn.click();

      await expect(pageA.locator('[data-testid^="ops-report-status-"]').first()).toHaveText(
        'resolved',
        { timeout: 10_000 }
      );

      // Broadcast a non-disruptive maintenance notice and verify both connected visitors see it
      await pageA
        .getByTestId('maintenance-message-input')
        .fill('Scheduled sanctuary update in 5 minutes — active sessions stay connected.');
      await pageA.getByTestId('broadcast-maintenance-btn').click();

      await expect(pageA.getByTestId('hud-maintenance-banner')).toContainText(
        'Scheduled sanctuary update in 5 minutes',
        { timeout: 10_000 }
      );
      await expect(pageB.getByTestId('hud-maintenance-banner')).toContainText(
        'Scheduled sanctuary update in 5 minutes',
        { timeout: 10_000 }
      );
      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText('Connected');
      await expect(pageB.getByTestId('multiplayer-status-badge')).toHaveText('Connected');

      // Verify HTTP /api/health endpoint
      const healthRes = await request.get('/api/health');
      expect(healthRes.ok()).toBe(true);
      const healthJson = (await healthRes.json()) as {
        version: string;
        status: string;
        totalVisitors: number;
      };
      expect(healthJson.version).toBe('0.10.0-beta');
      expect(healthJson.status).toBe('ok');
      expect(healthJson.totalVisitors).toBeGreaterThanOrEqual(2);

      // Clear maintenance banner
      await pageA.getByTestId('clear-maintenance-btn').click();
      await expect(pageA.getByTestId('hud-maintenance-banner')).toBeHidden({
        timeout: 10_000
      });
      await expect(pageB.getByTestId('hud-maintenance-banner')).toBeHidden({
        timeout: 10_000
      });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});

