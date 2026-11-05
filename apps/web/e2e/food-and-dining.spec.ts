import { expect, test } from '@playwright/test';

test.describe('Feature 006 — Food & Dining (Multi-Session E2E)', () => {
  test('verifies interactive food stalls, 5-item menu catalog, currency validation & insufficient funds protection, persistent food inventory across reloads, multiplayer eating/drinking animations, and shared 4-seat dining tables', async ({
    browser
  }) => {
    test.setTimeout(90_000);
    const roomId = `e2e-dining-${Date.now()}`;

    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. Both players enter the same Panda Forest instance
      await pageA.goto(`/?room=${roomId}`);
      await expect(pageA.getByTestId('enter-world-btn')).toBeEnabled({ timeout: 25_000 });
      await pageA.getByTestId('enter-world-btn').click();
      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 15_000
      });

      await pageB.goto(`/?room=${roomId}`);
      await expect(pageB.getByTestId('enter-world-btn')).toBeEnabled({ timeout: 25_000 });
      await pageB.getByTestId('enter-world-btn').click();
      await expect(pageB.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 15_000
      });

      await expect(pageA.getByTestId('hud-currency-badge')).toContainText('100 Coins');

      // 2. Approach Plaza Refreshment Kiosk (`prop-plaza-food-stall` at [-6.8, 0, 12.2]) and open Stall Menu (US1, SC-001)
      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            characterController: {
              commitPhysicsResult: (pos: [number, number, number], grounded: boolean) => void;
            };
            stepFrames: (n: number, dt?: number) => void;
          };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.characterController.commitPhysicsResult([-6.8, 0.1, 13.6], true);
        rt.stepFrames(4, 1 / 60);
      });

      await expect(pageA.getByTestId('interaction-prompt-banner')).toContainText(
        'Plaza Refreshment Kiosk'
      );
      await pageA.keyboard.press('KeyE');
      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number, dt?: number) => void };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.stepFrames(2, 1 / 60);
      });

      await expect(pageA.getByTestId('food-stall-modal')).toBeVisible();
      await expect(pageA.getByTestId('stall-currency-balance')).toContainText('100 Zoo Coins');

      // Verify all 5 initial food & drink items are displayed with names, descriptions, and prices (FR-002, FR-003, SC-001)
      for (const itemId of ['water', 'bubble-tea', 'ice-cream', 'burger', 'popcorn']) {
        await expect(pageA.getByTestId(`stall-item-card-${itemId}`)).toBeVisible();
        await expect(pageA.getByTestId(`stall-item-name-${itemId}`)).toBeVisible();
        await expect(pageA.getByTestId(`stall-item-desc-${itemId}`)).toBeVisible();
        await expect(pageA.getByTestId(`stall-item-price-${itemId}`)).toBeVisible();
      }

      // 3. Purchase Bubble Tea (15 Coins) and 4 Burgers (4 * 20 = 80 Coins) -> 5 Coins remaining (US2, SC-002)
      await pageA.getByTestId('buy-food-btn-bubble-tea').click();
      await expect(pageA.getByTestId('stall-currency-balance')).toContainText('85 Zoo Coins');
      await expect(pageA.getByTestId('stall-item-owned-bubble-tea')).toContainText('1');

      for (let i = 0; i < 4; i++) {
        await pageA.getByTestId('buy-food-btn-burger').click();
      }
      await expect(pageA.getByTestId('stall-currency-balance')).toContainText('5 Zoo Coins');
      await expect(pageA.getByTestId('stall-item-owned-burger')).toContainText('4');

      // Attempt to purchase another Burger (costs 20 Coins, only 5 Coins left) -> fails with INSUFFICIENT_FUNDS and 0 coins deducted (FR-005, SC-002)
      await expect(pageA.getByTestId('insufficient-coins-badge-burger')).toBeVisible();
      await pageA.getByTestId('buy-food-btn-burger').click();
      await expect(pageA.getByTestId('food-purchase-feedback')).toHaveAttribute(
        'data-feedback-code',
        'INSUFFICIENT_FUNDS'
      );
      await expect(pageA.getByTestId('stall-currency-balance')).toContainText('5 Zoo Coins');
      await expect(pageA.getByTestId('stall-item-owned-burger')).toContainText('4');

      await pageA.getByTestId('close-food-stall-btn').click();
      await expect(pageA.getByTestId('food-stall-modal')).toBeHidden();
      await expect(pageA.getByTestId('toggle-food-inventory-btn')).toContainText('Food Bag (5)');

      // 4. Reload Page A and verify wallet & inventory persist across sessions (US3, FR-009, SC-003)
      await pageA.reload();
      await expect(pageA.getByTestId('enter-world-btn')).toBeEnabled({ timeout: 25_000 });
      await pageA.getByTestId('enter-world-btn').click();
      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 15_000
      });

      await expect(pageA.getByTestId('hud-currency-badge')).toContainText('5 Coins');
      await expect(pageA.getByTestId('toggle-food-inventory-btn')).toContainText('Food Bag (5)');

      const sessionIdA = await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            multiplayerClient: { getSessionId: () => string };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        return rt.multiplayerClient.getSessionId();
      });
      expect(sessionIdA).toBeTruthy();

      // 5. Both visitors approach Plaza Cafe Table (`prop-plaza-cafe-table` at [-3.8, 0, 12.6], 4 seats) and sit together (US5, FR-012, SC-005)
      for (const page of [pageA, pageB]) {
        await page.evaluate(() => {
          const rt = (window as unknown as {
            __ONLINE_ZOO_RUNTIME__: {
              characterController: {
                commitPhysicsResult: (pos: [number, number, number], grounded: boolean) => void;
              };
              multiplayerClient: {
                sendMoveUpdate: (
                  pos: [number, number, number],
                  vel: [number, number, number],
                  yaw: number,
                  state: 'Idle'
                ) => void;
              };
              stepFrames: (n: number, dt?: number) => void;
            };
          }).__ONLINE_ZOO_RUNTIME__;
          rt.characterController.commitPhysicsResult([-3.8, 0.1, 13.6], true);
          rt.multiplayerClient.sendMoveUpdate([-3.8, 0.1, 13.6], [0, 0, 0], 0, 'Idle');
          rt.stepFrames(4, 1 / 60);
        });
      }

      await expect(pageA.getByTestId('interaction-prompt-banner')).toContainText(
        'Plaza Umbrella Dining Table'
      );
      await expect(pageA.getByTestId('seat-availability-badge')).toContainText(
        'Available (4/4 seats free)'
      );

      // Player A sits at seat 1
      await pageA.keyboard.press('KeyE');
      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number, dt?: number) => void };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.stepFrames(2, 1 / 60);
      });
      await expect(pageA.getByTestId('stand-up-btn')).toBeVisible({ timeout: 10_000 });
      await expect(pageB.getByTestId('seat-availability-badge')).toContainText(
        'Available (3/4 seats free)',
        { timeout: 10_000 }
      );

      // Player B sits at seat 2 around the same table
      await pageB.keyboard.press('KeyE');
      await pageB.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number, dt?: number) => void };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.stepFrames(2, 1 / 60);
      });
      await expect(pageB.getByTestId('stand-up-btn')).toBeVisible({ timeout: 10_000 });
      await expect(pageA.getByTestId('seat-availability-badge')).toContainText(
        'Available (2/4 seats free)',
        { timeout: 10_000 }
      );

      // 6. While seated at the shared table, Player A opens Food Bag and drinks Bubble Tea -> visible to both players (US4 & US5, SC-004, SC-005)
      await pageA.getByTestId('toggle-food-inventory-btn').click();
      await expect(pageA.getByTestId('food-inventory-drawer')).toBeVisible();
      await expect(pageA.getByTestId('inventory-item-count-bubble-tea')).toHaveText('1');

      await pageA.getByTestId('consume-food-btn-bubble-tea').click();
      await expect(pageA.getByTestId('inventory-item-count-bubble-tea')).toHaveText('0');
      await expect(pageA.getByTestId('active-consumption-pill')).toContainText(
        'Drinking at Table'
      );
      await expect(pageA.getByTestId('local-consumption-badge')).toContainText(
        'Drinking Brown Sugar Bubble Tea'
      );

      // Player B sees Player A's synchronized eating/drinking animation badge overhead (FR-010, SC-004)
      await expect(
        pageB.getByTestId(`remote-consumption-badge-${sessionIdA}`)
      ).toContainText('Drinking Brown Sugar Bubble Tea', { timeout: 10_000 });

      // 7. Player A finishes drinking early and stands up cleanly (FR-011, FR-012)
      await pageA.getByTestId('stop-consumption-btn').click();
      await expect(pageA.getByTestId('active-consumption-pill')).toBeHidden();
      await expect(pageB.getByTestId(`remote-consumption-badge-${sessionIdA}`)).toBeHidden({
        timeout: 10_000
      });

      await pageA.getByTestId('stand-up-btn').click();
      await expect(pageA.getByTestId('stand-up-btn')).toBeHidden();
      await expect(pageB.getByTestId('seat-availability-badge')).toContainText(
        'Available (3/4 seats free)',
        { timeout: 10_000 }
      );
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});

