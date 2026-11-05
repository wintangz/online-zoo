import { expect, test } from '@playwright/test';

test.describe('Feature 007 — Zoo Passport & Progression (E2E)', () => {
  test('verifies Zoo Passport 5 zone stamps, proximity stamp collection, integrated Animal Encyclopedia, 6 achievements across 4 categories, one-time server-validated reward claiming, and cross-session persistence', async ({
    page
  }) => {
    test.setTimeout(90_000);
    const roomId = `e2e-passport-${Date.now()}`;

    await page.goto(`/?room=${roomId}`);
    await expect(page.getByTestId('enter-world-btn')).toBeEnabled({ timeout: 25_000 });
    await page.getByTestId('enter-world-btn').click();
    await expect(page.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
      timeout: 15_000
    });

    // 1. At spawn [0, 0.1, 18], overall progress is 0% (0/14 milestones) (SC-001, SC-006)
    await expect(page.getByTestId('hud-passport-btn')).toContainText('Passport (0%)');
    await expect(page.getByTestId('hud-currency-badge')).toContainText('100 Coins');

    await page.getByTestId('hud-passport-btn').click();
    await expect(page.getByTestId('zoo-passport-modal')).toBeVisible();
    await expect(page.getByTestId('passport-overall-progress')).toContainText(
      '0 / 14 Milestones'
    );
    await expect(page.getByTestId('passport-progress-percentage')).toHaveText('0%');

    // Verify all 5 zones are displayed and initially Unobtained (SC-001)
    const zoneIds = [
      'zone-welcome-plaza',
      'zone-panda-sanctuary',
      'zone-penguin-cove',
      'zone-lotus-stream',
      'zone-wind-chime-lookout'
    ];
    for (const zid of zoneIds) {
      await expect(page.getByTestId(`passport-zone-card-${zid}`)).toBeVisible();
      await expect(page.getByTestId(`passport-zone-status-${zid}`)).toHaveText(
        'Unobtained'
      );
    }

    // Verify Encyclopedia tab shows all 3 species as Undiscovered / Unknown Species (SC-003)
    await page.getByTestId('passport-tab-encyclopedia').click();
    for (const sid of ['panda', 'penguin', 'otter']) {
      await expect(page.getByTestId(`passport-species-card-${sid}`)).toBeVisible();
      await expect(page.getByTestId(`passport-species-status-${sid}`)).toHaveText(
        'Undiscovered'
      );
    }

    // Verify Achievements tab shows all 6 achievements as Locked (SC-004)
    await page.getByTestId('passport-tab-achievements').click();
    for (const aid of [
      'ach-first-stamp',
      'ach-world-explorer',
      'ach-first-animal',
      'ach-zoologist',
      'ach-social-greeting',
      'ach-keeper-helper'
    ]) {
      await expect(page.getByTestId(`passport-achievement-card-${aid}`)).toBeVisible();
      await expect(page.getByTestId(`passport-achievement-status-${aid}`)).toHaveText(
        'Locked'
      );
      await expect(page.getByTestId(`claim-achievement-btn-${aid}`)).toBeDisabled();
    }

    await page.getByTestId('close-passport-btn').click();
    await expect(page.getByTestId('zoo-passport-modal')).toBeHidden();

    // 2. Walk into Welcome Plaza [-5.2, 0.1, 12.6] and Panda Sanctuary [8.4, 0.1, 9.2] -> automatically collects stamps and unlocks ach-first-stamp (SC-001, SC-002, SC-004)
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
      rt.characterController.commitPhysicsResult([-5.2, 0.1, 12.6], true);
      rt.multiplayerClient.sendMoveUpdate([-5.2, 0.1, 12.6], [0, 0, 0], 0, 'Idle');
      rt.stepFrames(3, 1 / 60);
      rt.characterController.commitPhysicsResult([8.4, 0.1, 9.2], true);
      rt.multiplayerClient.sendMoveUpdate([8.4, 0.1, 9.2], [0, 0, 0], 0, 'Idle');
      rt.stepFrames(3, 1 / 60);
    });

    await expect(page.getByTestId('passport-toast-banner')).toBeVisible();

    // 3. Inspect Giant Panda ('panda-bao') to discover Panda species (unlocks ach-first-animal) and perform Wave emote (unlocks ach-social-greeting)
    await page.getByTestId('animal-badge-panda-bao').click();
    await expect(page.getByTestId('animal-info-panel')).toBeVisible();
    await page.getByTestId('close-animal-info-btn').click();

    await page.getByTestId('emote-btn-wave').click();

    // 4. Open Zoo Passport and verify Stamps, Encyclopedia, and Achievements (SC-001 – SC-004, SC-006)
    await page.getByTestId('hud-passport-btn').click();
    await expect(page.getByTestId('zoo-passport-modal')).toBeVisible();

    // 2 stamps + 1 species + 3 unlocked achievements (ach-first-stamp, ach-first-animal, ach-social-greeting) = 6 / 14 milestones (43%)
    await expect(page.getByTestId('passport-overall-progress')).toContainText(
      '6 / 14 Milestones'
    );
    await expect(page.getByTestId('passport-progress-percentage')).toHaveText('43%');

    await page.getByTestId('passport-tab-stamps').click();
    await expect(page.getByTestId('passport-zone-status-zone-welcome-plaza')).toHaveText(
      'Obtained'
    );
    await expect(page.getByTestId('passport-zone-status-zone-panda-sanctuary')).toHaveText(
      'Obtained'
    );
    await expect(page.getByTestId('passport-zone-status-zone-penguin-cove')).toHaveText(
      'Unobtained'
    );

    await page.getByTestId('passport-tab-encyclopedia').click();
    await expect(page.getByTestId('passport-species-status-panda')).toHaveText(
      'Discovered'
    );
    await expect(page.getByTestId('passport-species-card-panda')).toContainText(
      'Giant Panda'
    );
    await expect(page.getByTestId('passport-species-status-otter')).toHaveText(
      'Undiscovered'
    );
    await expect(page.getByTestId('passport-species-card-otter')).toContainText(
      'Unknown Species'
    );

    // 5. Claim ach-first-stamp (+15 Zoo Coins & "Trailblazer" Badge) and verify one-time reward protection (SC-005)
    await page.getByTestId('passport-tab-achievements').click();
    await expect(page.getByTestId('passport-achievement-status-ach-first-stamp')).toHaveText(
      'Ready to Claim'
    );
    await expect(page.getByTestId('claim-achievement-btn-ach-first-stamp')).toBeEnabled();

    await page.getByTestId('claim-achievement-btn-ach-first-stamp').click();

    await expect(page.getByTestId('passport-achievement-status-ach-first-stamp')).toHaveText(
      'Claimed',
      { timeout: 10_000 }
    );
    await expect(page.getByTestId('claim-achievement-btn-ach-first-stamp')).toBeDisabled();
    await expect(page.getByTestId('passport-wallet-coins')).toContainText('115 Zoo Coins');
    await expect(page.getByTestId('hud-currency-badge')).toContainText('115 Coins');
    await expect(page.getByTestId('hud-active-badge')).toContainText('Trailblazer');

    // Attempt duplicate server claim for ach-first-stamp -> rejected with ALREADY_CLAIMED and 0 extra coins
    await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: {
          multiplayerClient: {
            claimAchievementReward: (id: string, reqId?: string) => string;
          };
        };
      }).__ONLINE_ZOO_RUNTIME__;
      rt.multiplayerClient.claimAchievementReward(
        'ach-first-stamp',
        'duplicate_e2e_claim_attempt'
      );
    });
    await expect(page.getByTestId('passport-reward-feedback')).toContainText(
      'already been claimed'
    );
    await expect(page.getByTestId('passport-wallet-coins')).toContainText('115 Zoo Coins');

    // 6. Reload Page and verify full persistence across sessions (SC-002, SC-003, SC-004, SC-005, SC-006)
    await page.reload();
    await expect(page.getByTestId('enter-world-btn')).toBeEnabled({ timeout: 25_000 });
    await page.getByTestId('enter-world-btn').click();
    await expect(page.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
      timeout: 15_000
    });

    await expect(page.getByTestId('hud-passport-btn')).toContainText('Passport (43%)');
    await expect(page.getByTestId('hud-currency-badge')).toContainText('115 Coins');
    await expect(page.getByTestId('hud-active-badge')).toContainText('Trailblazer');

    await page.getByTestId('hud-passport-btn').click();
    await expect(page.getByTestId('passport-zone-status-zone-welcome-plaza')).toHaveText(
      'Obtained'
    );
    await expect(page.getByTestId('passport-zone-status-zone-panda-sanctuary')).toHaveText(
      'Obtained'
    );
    await page.getByTestId('passport-tab-achievements').click();
    await expect(page.getByTestId('passport-achievement-status-ach-first-stamp')).toHaveText(
      'Claimed'
    );
  });
});

