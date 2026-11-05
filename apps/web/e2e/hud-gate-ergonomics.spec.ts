import { expect, test } from '@playwright/test';

test.describe('Feature 011 — Streamlined HUD & Entrance Gate Arrival E2E', () => {
  test('spawns behind the Sanctuary Entrance Gate (Z = 18 > 16.4), walks forward through the gate into the Welcome Plaza, and renders a non-overlapping streamlined HUD with Minimal HUD toggle', async ({
    page
  }) => {
    const roomId = `e2e-gate-hud-${Date.now()}`;
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/?room=${roomId}`);

    const enterButton = page.getByTestId('enter-world-btn');
    await expect(enterButton).toBeEnabled({ timeout: 25_000 });
    await enterButton.click();

    // 1. Verify Decluttered HUD Layout on Fresh Join
    const statusBar = page.getByTestId('hud-status-bar');
    const actionDock = page.getByTestId('hud-action-dock');
    const onboardingModal = page.getByTestId('onboarding-guide-modal');

    await expect(statusBar).toBeVisible();
    await expect(actionDock).toBeVisible();
    await expect(onboardingModal).toBeVisible();
    await expect(page.getByTestId('hud-secondary-details-strip')).toHaveCount(0);
    await expect(page.getByTestId('animal-status-strip')).toHaveCount(0);
    await expect(page.getByTestId('proximity-chat-panel')).toHaveCount(0);

    // Dismiss onboarding card
    await page.getByTestId('dismiss-onboarding-btn').click();
    await expect(onboardingModal).toBeHidden();

    // Test Dev / Debug HUD toggle button
    await page.getByTestId('hud-dev-debug-toggle-btn').click();
    await expect(page.getByTestId('hud-secondary-details-strip')).toBeVisible();
    await expect(page.getByTestId('animal-status-strip')).toBeVisible();
    await expect(page.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
      timeout: 15_000
    });
    await page.getByTestId('hud-dev-debug-toggle-btn').click();
    await expect(page.getByTestId('hud-secondary-details-strip')).toHaveCount(0);
    await expect(page.getByTestId('animal-status-strip')).toHaveCount(0);

    // 2. Verify Starting Behind the Entrance Gate & Walking Forward Into the Gate (US1, FR-001..FR-003, SC-001)
    const initialCheck = await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: {
          mutableRuntimeState: { avatar: { position: [number, number, number]; facingYaw: number } };
        };
      }).__ONLINE_ZOO_RUNTIME__;
      return {
        z: rt.mutableRuntimeState.avatar.position[2],
        yaw: rt.mutableRuntimeState.avatar.facingYaw
      };
    });

    // Player starts at Z = 18.0 (strictly behind the Entrance Gate at Z = 16.4)
    expect(initialCheck.z).toBeGreaterThan(16.4);
    expect(initialCheck.z).toBeCloseTo(18.0, 1);

    // Press W to walk straight forward through the Entrance Gate (Z = 16.4) into the Welcome Plaza (Z < 16.4)
    await page.keyboard.down('KeyW');
    await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number, dt?: number) => void };
      }).__ONLINE_ZOO_RUNTIME__;
      rt.stepFrames(85, 1 / 60);
    });
    await page.keyboard.up('KeyW');

    const afterWalkCheck = await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: {
          mutableRuntimeState: { avatar: { position: [number, number, number] } };
          gameStore: {
            getState: () => {
              passport: { state: { stamps: Record<string, { obtained: boolean }> } };
            };
          };
        };
      }).__ONLINE_ZOO_RUNTIME__;
      return {
        z: rt.mutableRuntimeState.avatar.position[2],
        welcomePlazaStamped:
          rt.gameStore.getState().passport.state.stamps['zone-welcome-plaza']?.obtained ?? false
      };
    });

    // Player has walked through the Entrance Gate (Z < 16.4) into the Welcome Plaza and earned the gate stamp
    expect(afterWalkCheck.z).toBeLessThan(16.4);
    expect(afterWalkCheck.welcomePlazaStamped).toBe(true);
  });
});

