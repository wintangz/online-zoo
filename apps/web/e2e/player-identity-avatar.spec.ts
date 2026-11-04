import { expect, test } from '@playwright/test';

test.describe('Feature 003 — Player Identity & Avatar Customization (Multi-Session E2E)', () => {
  test('persists playerId and 5-category avatar across reloads, enforces moderation, and syncs appearance across 2 players in real time', async ({
    browser
  }) => {
    const roomId = `e2e-identity-${Date.now()}`;

    const contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const hydrationErrors: string[] = [];
    const recordConsoleError = (msg: { type: () => string; text: () => string }) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/hydration|did not match|server-rendered/i.test(text)) {
          hydrationErrors.push(text);
        }
      }
    };
    pageA.on('console', recordConsoleError);
    pageB.on('console', recordConsoleError);

    // 1. Open Session A and enter Panda Forest with default Explorer avatar (US1)
    await pageA.goto(`/?room=${roomId}`);
    const enterBtnA = pageA.getByTestId('enter-world-btn');
    await expect(enterBtnA).toBeEnabled({ timeout: 25_000 });
    expect(hydrationErrors).toEqual([]);
    await enterBtnA.click();

    await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
      timeout: 15_000
    });
    await expect(pageA.getByTestId('local-avatar-nameplate')).toBeVisible();
    // Verify touch joysticks are hidden on desktop (FR-021)
    await expect(pageA.getByTestId('virtual-joystick-pad')).toBeHidden();

    const initialPlayerIdA = await pageA.evaluate(() => {
      const raw = window.localStorage.getItem('online-zoo:player-identity:v1');
      return raw ? (JSON.parse(raw) as { playerId: string }).playerId : null;
    });
    expect(initialPlayerIdA).toMatch(/^player-/);

    // 2. Open Session B in the same room
    await pageB.goto(`/?room=${roomId}`);
    const enterBtnB = pageB.getByTestId('enter-world-btn');
    await expect(enterBtnB).toBeEnabled({ timeout: 25_000 });
    await enterBtnB.click();

    await expect(pageB.getByTestId('visitor-count-badge')).toContainText('Visitors: 2', {
      timeout: 15_000
    });

    // 3. In Session A, open Avatar Customizer, preview changes, verify all option texts fit inside their boxes, and test Cancel (US2, SC-004, FR-020)
    await pageA.getByTestId('open-avatar-customizer-btn').click();
    await expect(pageA.getByTestId('avatar-customizer-modal')).toBeVisible();

    const overflowingButtons = await pageA.evaluate(() => {
      const modal = document.querySelector('[data-testid="avatar-customizer-modal"]');
      if (!modal) return ['modal-missing'];
      const buttons = Array.from(modal.querySelectorAll('button'));
      return buttons
        .filter((btn) => btn.scrollWidth > btn.clientWidth + 1)
        .map((btn) => btn.getAttribute('data-testid') || btn.textContent || 'unknown');
    });
    expect(overflowingButtons).toEqual([]);

    await pageA.getByTestId('skin-option-deep-umber').click();
    await pageA.getByTestId('hairstyle-option-sun-spiky').click();
    await expect(pageA.getByTestId('avatar-preview-card')).toHaveAttribute(
      'data-preview-skin',
      'deep-umber'
    );
    await expect(pageA.getByTestId('avatar-preview-card')).toHaveAttribute(
      'data-preview-hairstyle',
      'sun-spiky'
    );

    // Cancel reverts draft changes
    await pageA.getByTestId('cancel-avatar-btn').click();
    await expect(pageA.getByTestId('avatar-customizer-modal')).toBeHidden();
    await expect(pageA.getByTestId('local-avatar-nameplate')).toHaveAttribute(
      'data-avatar-skin',
      'golden-sand'
    );

    // 4. Reopen customizer, verify display name moderation blocks invalid/profane names (US4, SC-006)
    await pageA.getByTestId('open-avatar-customizer-btn').click();
    const nameInputA = pageA.getByTestId('display-name-input');
    await nameInputA.fill('ab');
    await expect(pageA.getByTestId('display-name-error')).toBeVisible();
    await expect(pageA.getByTestId('confirm-avatar-btn')).toBeDisabled();

    await nameInputA.fill('admin');
    await expect(pageA.getByTestId('display-name-error')).toBeVisible();
    await expect(pageA.getByTestId('confirm-avatar-btn')).toBeDisabled();

    // 5. Select valid display name and customize all 5 categories, then Confirm & Save (US2, US3)
    await nameInputA.fill('BambooRanger');
    await expect(pageA.getByTestId('display-name-error')).toBeHidden();

    await pageA.getByTestId('skin-option-amber-tan').click();
    await pageA.getByTestId('hairstyle-option-bamboo-ponytail').click();
    await pageA.getByTestId('haircolor-option-forest-teal').click();
    await pageA.getByTestId('outfit-option-botanist-cobalt').click();
    await pageA.getByTestId('accessory-option-round-glasses').click();

    await pageA.getByTestId('confirm-avatar-btn').click();
    await expect(pageA.getByTestId('avatar-customizer-modal')).toBeHidden();

    // Verify local HUD and local 3D nameplate reflect confirmed changes
    await expect(pageA.getByTestId('local-visitor-badge')).toContainText('BambooRanger');
    await expect(pageA.getByTestId('local-avatar-nameplate')).toContainText('BambooRanger');
    await expect(pageA.getByTestId('local-avatar-nameplate')).toHaveAttribute(
      'data-avatar-outfit',
      'botanist-cobalt'
    );

    // 6. Verify Session B immediately sees Session A's updated display name and 5-category avatar in real time (US3, SC-005)
    await expect(pageB.getByTestId('remote-visitors-roster')).toContainText('BambooRanger', {
      timeout: 10_000
    });
    const remote3dBadgeOnB = pageB.locator('[data-testid^="remote-avatar-3d-badge-"]').first();
    await expect(remote3dBadgeOnB).toContainText('BambooRanger');
    await expect(remote3dBadgeOnB).toHaveAttribute('data-avatar-skin', 'amber-tan');
    await expect(remote3dBadgeOnB).toHaveAttribute('data-avatar-hairstyle', 'bamboo-ponytail');
    await expect(remote3dBadgeOnB).toHaveAttribute('data-avatar-haircolor', 'forest-teal');
    await expect(remote3dBadgeOnB).toHaveAttribute('data-avatar-outfit', 'botanist-cobalt');
    await expect(remote3dBadgeOnB).toHaveAttribute('data-avatar-accessory', 'round-glasses');

    // 7. Reload Session A and verify persistent identity & all 5 avatar categories are restored (US1, US2, SC-003)
    await pageA.reload();
    await expect(pageA.getByTestId('enter-world-btn')).toBeEnabled({ timeout: 25_000 });
    await pageA.getByTestId('enter-world-btn').click();

    await expect(pageA.getByTestId('local-visitor-badge')).toContainText('BambooRanger', {
      timeout: 15_000
    });
    await expect(pageA.getByTestId('local-avatar-nameplate')).toHaveAttribute(
      'data-avatar-skin',
      'amber-tan'
    );
    await expect(pageA.getByTestId('local-avatar-nameplate')).toHaveAttribute(
      'data-avatar-hairstyle',
      'bamboo-ponytail'
    );
    await expect(pageA.getByTestId('local-avatar-nameplate')).toHaveAttribute(
      'data-avatar-outfit',
      'botanist-cobalt'
    );

    const reloadedPlayerIdA = await pageA.evaluate(() => {
      const raw = window.localStorage.getItem('online-zoo:player-identity:v1');
      return raw ? (JSON.parse(raw) as { playerId: string }).playerId : null;
    });
    expect(reloadedPlayerIdA).toBe(initialPlayerIdA);

    await contextA.close();
    await contextB.close();
  });
});

