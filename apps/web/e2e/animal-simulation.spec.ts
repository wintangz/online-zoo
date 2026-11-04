import { expect, test } from '@playwright/test';

test.describe('Feature 005: Animal Simulation, Encyclopedia Discovery & Feeding E2E', () => {
  test('verifies autonomous animal behaviors, species inspection panel, persistent encyclopedia discovery, feeding cooldowns, and multiplayer consistency', async ({
    browser
  }) => {
    test.setTimeout(90_000);
    const contextA = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 720 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const roomId = `e2e-animals-${Date.now()}`;

    try {
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

      // 1. Verify all 3 initial species (Panda, Penguin, Otter) are active in the habitat status strip (US1, SC-001)
      await expect(pageA.getByTestId('animal-status-strip')).toBeVisible();
      await expect(pageA.getByTestId('animal-badge-panda-bao')).toBeVisible();
      await expect(pageA.getByTestId('animal-badge-penguin-piko')).toBeVisible();
      await expect(pageA.getByTestId('animal-badge-otter-lumi')).toBeVisible();

      // 2. Verify Multiplayer Consistency between Session A and Session B (US2, SC-003)
      const stateBaoOnA = await pageA.getByTestId('animal-state-panda-bao').innerText();
      const stateBaoOnB = await pageB.getByTestId('animal-state-panda-bao').innerText();
      expect(stateBaoOnA).toBe(stateBaoOnB);

      // 3. Open Animal Encyclopedia initially and verify Undiscovered state (US4, FR-010, FR-011)
      await pageA.getByTestId('animal-encyclopedia-button').click();
      await expect(pageA.getByTestId('animal-encyclopedia-modal')).toBeVisible();
      await expect(pageA.getByTestId('encyclopedia-status-panda')).toHaveText('Undiscovered');
      await expect(pageA.getByTestId('encyclopedia-status-penguin')).toHaveText('Undiscovered');
      await expect(pageA.getByTestId('encyclopedia-status-otter')).toHaveText('Undiscovered');
      await pageA.getByTestId('close-encyclopedia-btn').click();

      // 4. Inspect Giant Panda ("Bao") -> opens Animal Information Panel & records discovery (US3 & US4, SC-004, SC-005)
      await pageA.getByTestId('animal-badge-panda-bao').click();
      await expect(pageA.getByTestId('animal-info-panel')).toBeVisible();
      await expect(pageA.getByTestId('animal-info-common-name')).toHaveText('Giant Panda');
      await expect(pageA.getByTestId('animal-info-individual-name')).toHaveText('Bao');
      await expect(pageA.getByTestId('animal-info-habitat')).toContainText(
        'Misty Bamboo Grove Sanctuary'
      );
      await expect(pageA.getByTestId('animal-info-diet')).toContainText('bamboo');
      await expect(pageA.getByTestId('animal-discovery-toast')).toContainText('Giant Panda');

      // 5. Trigger Panda Bamboo Feeding Session from Session A -> both Session A and Session B see Panda Eating! (US5, SC-006)
      await pageA.getByTestId('animal-trigger-feeding-button').click();
      await expect(pageA.getByTestId('animal-info-behavior-badge')).toContainText('Eating');
      await expect(pageA.getByTestId('animal-feeding-status')).toContainText('Feeding Active');
      await expect(pageB.getByTestId('animal-state-panda-bao')).toHaveText('Eating', {
        timeout: 3000
      });

      // Clicking feed again while active shows rate-limit/active notice (FR-015, SC-006)
      await pageA.getByTestId('animal-trigger-feeding-button').click();
      await expect(pageA.getByTestId('animal-feeding-notice')).toContainText('already underway');

      // 6. Inspect Penguin ("Piko") and Otter ("Lumi") to unlock 3/3 species in Encyclopedia (US4, SC-005)
      await pageA.getByTestId('animal-badge-penguin-piko').click();
      await expect(pageA.getByTestId('animal-info-common-name')).toContainText('Penguin');

      await pageA.getByTestId('animal-badge-otter-lumi').click();
      await expect(pageA.getByTestId('animal-info-common-name')).toContainText('Otter');
      await pageA.getByTestId('close-animal-info-btn').click();

      await expect(pageA.getByTestId('animal-encyclopedia-button')).toContainText(
        'Encyclopedia (3/3)'
      );

      // 7. Reload Session A and verify 3/3 Encyclopedia discoveries persist across sessions (FR-012, SC-005)
      await pageA.reload();
      await expect(pageA.getByTestId('enter-world-btn')).toBeEnabled({ timeout: 25_000 });
      await pageA.getByTestId('enter-world-btn').click();
      await expect(pageA.getByTestId('animal-encyclopedia-button')).toContainText(
        'Encyclopedia (3/3)'
      );
      await pageA.getByTestId('animal-encyclopedia-button').click();
      await expect(pageA.getByTestId('encyclopedia-progress-badge')).toHaveText(
        '3 / 3 Species Discovered'
      );
      await expect(pageA.getByTestId('encyclopedia-status-panda')).toHaveText('Discovered');
      await expect(pageA.getByTestId('encyclopedia-status-penguin')).toHaveText('Discovered');
      await expect(pageA.getByTestId('encyclopedia-status-otter')).toHaveText('Discovered');
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});

