import { expect, test } from '@playwright/test';

test.describe('Feature 009 — Multiplayer Expansion & Zoo Instances (Multi-Session E2E)', () => {
  test('verifies instance directory status and friend presence badges, capacity enforcement, friend-join privacy toggle, progression preservation across switches, and automatic unhealthy instance failover recovery (SC-001 to SC-005)', async ({
    browser
  }) => {
    test.setTimeout(90_000);
    const initialRoomId = 'panda-forest-1';

    const contextA = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const contextB = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. Both visitors enter Panda Forest #1 (Main Plaza)
      await pageA.goto(`/?room=${initialRoomId}`);
      await expect(pageA.getByTestId('enter-world-btn')).toBeEnabled({
        timeout: 25_000
      });
      await pageA.getByTestId('enter-world-btn').click();
      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText(
        'Connected',
        { timeout: 15_000 }
      );

      await pageB.goto(`/?room=${initialRoomId}`);
      await expect(pageB.getByTestId('enter-world-btn')).toBeEnabled({
        timeout: 25_000
      });
      await pageB.getByTestId('enter-world-btn').click();
      await expect(pageB.getByTestId('multiplayer-status-badge')).toHaveText(
        'Connected',
        { timeout: 15_000 }
      );

      const infoA = await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            multiplayerClient: { getSessionId: () => string };
            gameStore: {
              getState: () => {
                identity: { profile: { playerId: string } };
              };
            };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        return {
          sessionId: rt.multiplayerClient.getSessionId(),
          playerId: rt.gameStore.getState().identity.profile.playerId
        };
      });

      const infoB = await pageB.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            multiplayerClient: { getSessionId: () => string };
            gameStore: {
              getState: () => {
                identity: { profile: { playerId: string } };
              };
            };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        return {
          sessionId: rt.multiplayerClient.getSessionId(),
          playerId: rt.gameStore.getState().identity.profile.playerId
        };
      });

      // 2. Establish friendship between Visitor A and Visitor B
      await pageA.getByTestId('toggle-social-drawer-btn').click();
      await expect(pageA.getByTestId('social-drawer-panel')).toBeVisible();
      await pageA.getByTestId(`send-friend-request-btn-${infoB.playerId}`).click();

      await pageB.getByTestId('toggle-social-drawer-btn').click();
      await expect(pageB.getByTestId('social-drawer-panel')).toBeVisible();
      await expect(
        pageB.getByTestId(`incoming-friend-request-${infoA.playerId}`)
      ).toBeVisible({ timeout: 10_000 });
      await pageB
        .locator('[data-testid^="accept-friend-request-btn-"]')
        .first()
        .click();

      await expect(pageA.getByTestId(`friend-item-${infoB.playerId}`)).toBeVisible({
        timeout: 10_000
      });
      await expect(pageB.getByTestId(`friend-item-${infoA.playerId}`)).toBeVisible({
        timeout: 10_000
      });

      // 3. Verify Instance Directory labels, availability badges, and progression preservation on switch (SC-003, SC-004)
      await expect(pageA.getByTestId('instance-selector-section')).toBeVisible();
      await expect(
        pageA.getByTestId('instance-status-badge-panda-forest-1')
      ).toHaveText('Healthy');
      await expect(
        pageA.getByTestId('instance-status-badge-panda-forest-2')
      ).toHaveText('Healthy');

      // Visitor A switches to panda-forest-2
      await pageA.getByTestId('switch-instance-btn-panda-forest-2').click();
      await expect(pageA.getByTestId('hud-instance-badge')).toContainText(
        'panda-forest-2',
        { timeout: 10_000 }
      );
      // Visitor A's identity and coins remain intact after switching instances (SC-004)
      await expect(pageA.getByTestId('hud-player-id-badge')).toHaveText(
        infoA.playerId
      );
      await expect(pageA.getByTestId('hud-currency-badge')).toContainText(
        '100 Coins'
      );

      // Visitor B sees "1 Friend" badge on panda-forest-2 in the instance directory (SC-003)
      await expect(
        pageB.getByTestId('instance-friends-badge-panda-forest-2')
      ).toContainText('1 Friend', { timeout: 10_000 });

      // 4. Friend-Join Privacy Toggle (SC-002)
      // Visitor A disables Friend Instance Joining
      await expect(pageA.getByTestId('toggle-allow-friend-join-btn')).toHaveText(
        'Allowed'
      );
      await pageA.getByTestId('toggle-allow-friend-join-btn').click();
      await expect(pageA.getByTestId('toggle-allow-friend-join-btn')).toHaveText(
        'Private'
      );

      // Visitor B sees Private on Visitor A's friend status badge and receives clear feedback when attempting to join
      await expect(
        pageB.getByTestId(`friend-status-${infoA.playerId}`)
      ).toContainText('Private', { timeout: 10_000 });
      await pageB.getByTestId(`join-friend-btn-${infoA.playerId}`).click();
      await expect(pageB.getByTestId('social-feedback-banner')).toContainText(
        'disabled',
        { timeout: 10_000 }
      );
      await expect(pageB.getByTestId('hud-instance-badge')).toContainText(
        'panda-forest-1'
      );

      // Visitor A re-enables Friend Instance Joining
      await pageA.getByTestId('toggle-allow-friend-join-btn').click();
      await expect(pageA.getByTestId('toggle-allow-friend-join-btn')).toHaveText(
        'Allowed'
      );
      await expect(
        pageB.getByTestId(`friend-status-${infoA.playerId}`)
      ).not.toContainText('Private', { timeout: 10_000 });

      // 5. Runtime Instance Capacity Enforcement (SC-001)
      // Set panda-forest-2 capacity to 2 and have Visitor B join Visitor A in panda-forest-2
      await pageA
        .getByTestId('instance-capacity-select-panda-forest-2')
        .selectOption('2');
      await pageB
        .getByTestId(`join-friend-btn-${infoA.playerId}`)
        .click();

      await expect(pageB.getByTestId('hud-instance-badge')).toContainText(
        'panda-forest-2',
        { timeout: 10_000 }
      );
      // Now panda-forest-2 has 2/2 visitors
      await expect(
        pageA.getByTestId('instance-pop-panda-forest-2')
      ).toContainText('2/2 visitors', { timeout: 10_000 });

      // 6. Unhealthy Instance Outage Simulation & Automatic Failover Recovery (SC-005)
      await pageA
        .getByTestId('instance-health-toggle-btn-panda-forest-2')
        .click();

      // Both Visitor A and Visitor B are automatically evacuated from panda-forest-2 to a healthy instance (panda-forest-1)
      await expect(pageA.getByTestId('hud-instance-badge')).toContainText(
        'panda-forest-1',
        { timeout: 10_000 }
      );
      await expect(pageB.getByTestId('hud-instance-badge')).toContainText(
        'panda-forest-1',
        { timeout: 10_000 }
      );
      await expect(pageA.getByTestId('social-feedback-banner')).toContainText(
        'unavailable',
        { timeout: 10_000 }
      );
      await expect(
        pageA.getByTestId('instance-status-badge-panda-forest-2')
      ).toHaveText('Unavailable');

      // Restore panda-forest-2 health and capacity back to 16 for clean state
      await pageA
        .getByTestId('instance-health-toggle-btn-panda-forest-2')
        .click();
      await expect(
        pageA.getByTestId('instance-status-badge-panda-forest-2')
      ).toHaveText('Healthy', { timeout: 10_000 });
      await pageA
        .getByTestId('instance-capacity-select-panda-forest-2')
        .selectOption('16');
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
