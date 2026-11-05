import { expect, test } from '@playwright/test';

test.describe('Feature 008 — Events & Activities (Multi-Session E2E)', () => {
  test('verifies event discovery, start notifications, multi-player shared participation, non-blocking exploration, one-time reward + passport stamp claims, and seasonal theme administration', async ({
    browser
  }) => {
    test.setTimeout(90_000);
    const roomId = `e2e-events-${Date.now()}`;

    const contextA = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const contextB = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. Both visitors enter the same Panda Forest instance
      await pageA.goto(`/?room=${roomId}`);
      await expect(pageA.getByTestId('enter-world-btn')).toBeEnabled({
        timeout: 25_000
      });
      await pageA.getByTestId('enter-world-btn').click();
      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText(
        'Connected',
        { timeout: 15_000 }
      );

      await pageB.goto(`/?room=${roomId}`);
      await expect(pageB.getByTestId('enter-world-btn')).toBeEnabled({
        timeout: 25_000
      });
      await pageB.getByTestId('enter-world-btn').click();
      await expect(pageB.getByTestId('multiplayer-status-badge')).toHaveText(
        'Connected',
        { timeout: 15_000 }
      );

      // 2. Verify HUD seasonal badge & Events button (SC-001, SC-004)
      await expect(pageA.getByTestId('hud-seasonal-badge')).toContainText(
        'Spring Blossom Festival'
      );
      await expect(pageA.getByTestId('hud-events-btn')).toContainText(
        'Events (3 Active)'
      );
      await expect(pageA.getByTestId('hud-currency-badge')).toContainText(
        '100 Coins'
      );

      // Open Events & Activities Modal on Page A
      await pageA.getByTestId('hud-events-btn').click();
      await expect(pageA.getByTestId('zoo-events-modal')).toBeVisible();

      const eventIds = [
        'event-panda-feeding-gala',
        'event-penguin-dive-show',
        'event-guided-sanctuary-tour',
        'event-plaza-group-photo',
        'event-lantern-trivia-game'
      ];
      for (const eid of eventIds) {
        await expect(pageA.getByTestId(`event-card-${eid}`)).toBeVisible();
        await expect(pageA.getByTestId(`event-status-${eid}`)).toBeVisible();
        await expect(pageA.getByTestId(`event-schedule-${eid}`)).toBeVisible();
      }

      await expect(
        pageA.getByTestId('event-status-event-panda-feeding-gala')
      ).toHaveText('Active');
      await expect(
        pageA.getByTestId('event-status-event-penguin-dive-show')
      ).toHaveText('Upcoming');
      await expect(
        pageA.getByTestId('event-status-event-plaza-group-photo')
      ).toHaveText('Upcoming');

      // 3. Start Upcoming Penguin Dive Show from Page A -> Both Page A and Page B receive toast notification & Active status (SC-001)
      await pageA
        .getByTestId('toggle-event-status-btn-event-penguin-dive-show')
        .click();

      await expect(
        pageA.getByTestId('event-status-event-penguin-dive-show')
      ).toHaveText('Active');
      await expect(pageB.getByTestId('event-toast-banner')).toBeVisible({
        timeout: 10_000
      });
      await expect(pageB.getByTestId('event-toast-banner')).toContainText(
        'Glacier Cove Penguin Splash'
      );

      // Open Events Modal on Page B via the toast notification button
      await pageB.getByTestId('toast-open-events-btn').click();
      await expect(pageB.getByTestId('zoo-events-modal')).toBeVisible();
      await expect(
        pageB.getByTestId('event-status-event-penguin-dive-show')
      ).toHaveText('Active');

      // 4. Multi-Player Shared Participation & Group Progress in Panda Feeding Gala (SC-002)
      await pageA.getByTestId('join-event-btn-event-panda-feeding-gala').click();
      await expect(
        pageA.getByTestId('event-participants-event-panda-feeding-gala')
      ).toContainText('1 / 8 Participants');
      await expect(
        pageB.getByTestId('event-participants-event-panda-feeding-gala')
      ).toContainText('1 / 8 Participants');

      await pageB.getByTestId('join-event-btn-event-panda-feeding-gala').click();
      await expect(
        pageA.getByTestId('event-participants-event-panda-feeding-gala')
      ).toContainText('2 / 8 Participants');
      await expect(
        pageB.getByTestId('event-participants-event-panda-feeding-gala')
      ).toContainText('2 / 8 Participants');

      // Both players contribute to the shared activity goal (0/3 -> 2/3)
      await pageA
        .getByTestId('event-action-btn-event-panda-feeding-gala')
        .click();
      await expect(
        pageA.getByTestId('event-progress-event-panda-feeding-gala')
      ).toHaveText('1 / 3');
      await expect(
        pageB.getByTestId('event-progress-event-panda-feeding-gala')
      ).toHaveText('1 / 3');

      await pageB
        .getByTestId('event-action-btn-event-panda-feeding-gala')
        .click();
      await expect(
        pageA.getByTestId('event-progress-event-panda-feeding-gala')
      ).toHaveText('2 / 3');

      // 5. Claim One-Time Event Reward on Page A (+20 Zoo Coins & Panda Sanctuary Stamp) (SC-003)
      await expect(
        pageA.getByTestId('claim-event-reward-btn-event-panda-feeding-gala')
      ).toBeEnabled();
      await pageA
        .getByTestId('claim-event-reward-btn-event-panda-feeding-gala')
        .click();

      await expect(
        pageA.getByTestId('claim-event-reward-btn-event-panda-feeding-gala')
      ).toHaveText('✓ Reward Claimed', { timeout: 10_000 });
      await expect(pageA.getByTestId('events-modal-coins-badge')).toContainText(
        '120 Zoo Coins'
      );
      await expect(pageA.getByTestId('hud-currency-badge')).toContainText(
        '120 Coins'
      );

      // Verify duplicate server claim is rejected with ALREADY_CLAIMED and 0 extra coins
      await pageA.evaluate(() => {
        const rt = (
          window as unknown as {
            __ONLINE_ZOO_RUNTIME__: {
              multiplayerClient: {
                claimEventReward: (eventId: string, reqId?: string) => string;
              };
            };
          }
        ).__ONLINE_ZOO_RUNTIME__;
        rt.multiplayerClient.claimEventReward(
          'event-panda-feeding-gala',
          'dup_event_claim_e2e_01'
        );
      });
      await expect(pageA.getByTestId('event-feedback-banner')).toContainText(
        'already claimed'
      );
      await expect(pageA.getByTestId('events-modal-coins-badge')).toContainText(
        '120 Zoo Coins'
      );

      // 6. Toggle Seasonal Theme to Summer Starlight Lanterns and then Standard Season (none) (SC-004)
      await pageA
        .getByTestId('seasonal-theme-select')
        .selectOption('summer-lantern');
      await expect(pageA.getByTestId('modal-seasonal-theme-label')).toHaveText(
        'Summer Starlight Lanterns'
      );
      await expect(pageB.getByTestId('modal-seasonal-theme-label')).toHaveText(
        'Summer Starlight Lanterns'
      );

      await pageA.getByTestId('seasonal-theme-select').selectOption('none');
      await expect(pageA.getByTestId('modal-seasonal-theme-label')).toHaveText(
        'Standard Sanctuary Season'
      );
      await expect(
        pageA.getByTestId('event-status-event-lantern-trivia-game')
      ).toHaveText('Finished');
      await expect(pageA.getByTestId('hud-seasonal-badge')).toBeHidden();

      // 7. Close modal and verify non-blocking movement while participating + Leave Activity from tracker banner (SC-002, SC-005)
      await pageA.getByTestId('close-events-modal-btn').click();
      await expect(pageA.getByTestId('zoo-events-modal')).toBeHidden();
      await expect(
        pageA.getByTestId('active-event-tracker-banner')
      ).toBeVisible();

      // Player A can freely move around the sanctuary while participating in the event
      const movedPos = await pageA.evaluate(() => {
        const rt = (
          window as unknown as {
            __ONLINE_ZOO_RUNTIME__: {
              characterController: {
                commitPhysicsResult: (
                  pos: [number, number, number],
                  grounded: boolean
                ) => void;
                getState: () => { position: [number, number, number] };
              };
              stepFrames: (n: number, dt?: number) => void;
            };
          }
        ).__ONLINE_ZOO_RUNTIME__;
        rt.characterController.commitPhysicsResult([3.5, 0.1, 14.0], true);
        rt.stepFrames(2, 1 / 60);
        return rt.characterController.getState().position;
      });
      expect(movedPos[0]).toBeCloseTo(3.5, 1);

      // Leave activity from compact tracker banner -> frees participant slot on Page B (2/8 -> 1/8)
      await pageA.getByTestId('leave-active-event-btn').click();
      await expect(
        pageA.getByTestId('active-event-tracker-banner')
      ).toBeHidden();
      await expect(
        pageB.getByTestId('event-participants-event-panda-feeding-gala')
      ).toContainText('1 / 8 Participants');
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});

