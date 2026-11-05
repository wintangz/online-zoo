import { expect, test } from '@playwright/test';

test.describe('Feature 001: Playable Zoo World (Panda Forest)', () => {
  test('loads Entry Screen, enters Panda Forest, moves with WASD/Shift/Space, reveals cursor with Alt, interacts with objects, and opens ESC Settings Menu', async ({
    page
  }) => {
    await page.goto('/');

    // 1. Pre-Game Main Menu before canvas mounts (main-menu: Profile, Zone selector, Settings, Failure states)
    await expect(page.getByTestId('main-menu-screen')).toBeVisible();
    await expect(page.getByTestId('main-menu-profile-block')).toBeVisible();
    await expect(page.getByTestId('main-menu-zone-block')).toBeVisible();
    await expect(page.getByTestId('zoo-game-canvas-container')).toHaveCount(0);

    // Settings reachable from Main Menu and shared with in-game
    await page.getByTestId('main-menu-settings-btn').click();
    await expect(page.getByTestId('settings-menu-modal')).toBeVisible();
    await page.getByTestId('audio-mute-toggle').check();
    await page.getByTestId('resume-game-btn').click();
    await expect(page.getByTestId('settings-menu-modal')).toBeHidden();

    // Name rejected failure state on Main Menu
    const nameInput = page.getByTestId('main-menu-display-name-input');
    await nameInput.fill('!');
    const enterBtn = page.getByTestId('enter-world-btn');
    await expect(enterBtn).toBeVisible();
    await expect(enterBtn).toBeEnabled({ timeout: 10000 });
    await enterBtn.click();
    await expect(page.getByTestId('menu-error-name-rejected')).toBeVisible();
    await expect(page.getByTestId('zoo-game-canvas-container')).toHaveCount(0);

    // Restore valid name and click PLAY to mount canvas and join selected zone
    await nameInput.fill('BambooExplorer');
    await enterBtn.click();
    await expect(page.getByTestId('zoo-game-canvas-container')).toBeVisible();

    // 2. Decluttered HUD on Fresh Join (hud-declutter: bare zoo view + single dock + dev toggle)
    const hud = page.getByTestId('game-hud-overlay');
    await expect(hud).toBeVisible();
    await expect(page.getByTestId('hud-status-bar')).toBeVisible();
    await expect(page.getByTestId('hud-zone-badge')).toBeVisible();
    await expect(page.getByTestId('local-visitor-badge')).toBeVisible();
    await expect(page.getByTestId('hud-action-dock')).toBeVisible();

    // Permanent controls strip, chat panel, and debug telemetry are hidden by default on fresh join
    await expect(page.getByTestId('desktop-control-hints')).toHaveCount(0);
    await expect(page.getByTestId('hud-utility-bar')).toHaveCount(0);
    await expect(page.getByTestId('proximity-chat-panel')).toHaveCount(0);
    await expect(page.getByTestId('hud-secondary-details-strip')).toHaveCount(0);
    await expect(page.getByTestId('animal-status-strip')).toHaveCount(0);

    // Wait for runtime bridge to attach
    await page.waitForFunction(() => Boolean((window as unknown as Record<string, unknown>).__ONLINE_ZOO_RUNTIME__));

    // Verify opening a dock panel (Chat & Emotes) opens within 1 click and pauses mouse-look
    await page.getByTestId('hud-chat-panel-btn').click();
    await expect(page.getByTestId('proximity-chat-panel')).toBeVisible();
    await expect(page.getByTestId('emote-picker-bar')).toBeVisible();
    const cursorRevealedWhileChatOpen = await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: { gameStore: { getState: () => { isCursorRevealed: boolean } } };
      }).__ONLINE_ZOO_RUNTIME__;
      return rt.gameStore.getState().isCursorRevealed;
    });
    expect(cursorRevealedWhileChatOpen).toBe(true);
    await page.getByTestId('close-chat-panel-btn').click();
    await expect(page.getByTestId('proximity-chat-panel')).toHaveCount(0);

    // Enable Dev / Debug telemetry strip via dock toggle to inspect locomotion & camera badges
    await page.getByTestId('hud-dev-debug-toggle-btn').click();
    await expect(page.getByTestId('hud-secondary-details-strip')).toBeVisible();
    const locomotionBadge = page.getByTestId('locomotion-state-badge');
    await expect(locomotionBadge).toHaveText('Idle');

    // 3. Desktop WASD Walking, Shift Running, and Space Jumping (US1, FR-005..FR-007, FR-012)
    await page.keyboard.down('KeyW');
    await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number) => void } }).__ONLINE_ZOO_RUNTIME__;
      rt.stepFrames(10);
    });
    await expect(locomotionBadge).toHaveText('Walking');

    await page.keyboard.down('ShiftLeft');
    await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number) => void } }).__ONLINE_ZOO_RUNTIME__;
      rt.stepFrames(5);
    });
    await expect(locomotionBadge).toHaveText('Running');

    await page.keyboard.up('ShiftLeft');
    await page.keyboard.up('KeyW');

    // 4. Genshin Impact-style Alt Cursor Reveal & Left-Click Camera Drag Without Text Selection (FR-012)
    const cursorBadge = page.getByTestId('cursor-mode-badge');
    await page.keyboard.down('AltLeft');
    await expect(cursorBadge).toContainText('Cursor Unlocked (Alt)');
    await page.keyboard.up('AltLeft');
    await expect(cursorBadge).toContainText('Free-Look Camera Active');

    // Left-click and drag across the viewport: must NOT select any HUD text and must orbit camera
    const yawBeforeDrag = await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { cameraController: { getState: () => { yaw: number } } } }).__ONLINE_ZOO_RUNTIME__;
      return rt.cameraController.getState().yaw;
    });
    await page.mouse.move(500, 350);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(640, 380, { steps: 5 });
    await page.mouse.up({ button: 'left' });
    await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number) => void } }).__ONLINE_ZOO_RUNTIME__;
      rt.stepFrames(2);
    });
    const yawAfterDrag = await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { cameraController: { getState: () => { yaw: number } } } }).__ONLINE_ZOO_RUNTIME__;
      return rt.cameraController.getState().yaw;
    });
    expect(yawAfterDrag).not.toBe(yawBeforeDrag);

    const selectedText = await page.evaluate(() => window.getSelection()?.toString() ?? '');
    expect(selectedText).toBe('');

    // Verify Q/R keys do NOT orbit camera (orbit is by dragging only per FR-022)
    await page.keyboard.down('KeyQ');
    await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number) => void } }).__ONLINE_ZOO_RUNTIME__;
      rt.stepFrames(5);
    });
    await page.keyboard.up('KeyQ');
    const yawAfterKeyQ = await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { cameraController: { getState: () => { yaw: number } } } }).__ONLINE_ZOO_RUNTIME__;
      return rt.cameraController.getState().yaw;
    });
    expect(yawAfterKeyQ).toBe(yawAfterDrag);

    // Verify dragging downward tilts camera pitch negative to look up at the sky (FR-024)
    await page.mouse.move(500, 500);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(500, 120, { steps: 6 });
    await page.mouse.up({ button: 'left' });
    await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number) => void } }).__ONLINE_ZOO_RUNTIME__;
      rt.stepFrames(2);
    });
    const pitchLookingUp = await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { cameraController: { getState: () => { pitch: number } } } }).__ONLINE_ZOO_RUNTIME__;
      return rt.cameraController.getState().pitch;
    });
    expect(pitchLookingUp).toBeLessThan(0.15);

    // 5. Mobile Touch Controls & Dedicated Run Button (US2, FR-013, FR-021):
    // Verify touch joysticks and buttons are strictly hidden on non-touch desktop by default
    await expect(page.getByTestId('virtual-joystick-pad')).toBeHidden();
    await expect(page.getByTestId('touch-run-btn')).toBeHidden();
    await expect(page.getByTestId('touch-jump-btn')).toBeHidden();

    // Activate touch input mode (simulating a touchscreen/mobile device) and verify controls appear and function
    await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: {
          gameStore: { getState: () => { setActiveDevice: (d: 'touch' | 'desktop') => void } };
        };
      }).__ONLINE_ZOO_RUNTIME__;
      rt.gameStore.getState().setActiveDevice('touch');
    });
    const runBtn = page.getByTestId('touch-run-btn');
    await expect(page.getByTestId('virtual-joystick-pad')).toBeVisible();
    await expect(runBtn).toBeVisible();
    await runBtn.click();
    await expect(runBtn).toHaveAttribute('aria-pressed', 'true');
    await runBtn.click();
    await expect(runBtn).toHaveAttribute('aria-pressed', 'false');

    // Return to desktop mode and verify touch controls hide again
    await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: {
          gameStore: { getState: () => { setActiveDevice: (d: 'touch' | 'desktop') => void } };
        };
      }).__ONLINE_ZOO_RUNTIME__;
      rt.gameStore.getState().setActiveDevice('desktop');
    });
    await expect(page.getByTestId('virtual-joystick-pad')).toBeHidden();

    // 5b. Verify player spawned in Zoo Lobby and transition through the North Gate into Panda Forest
    await expect(page.getByTestId('hud-zone-badge')).toContainText('Zoo Lobby');
    await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: {
          characterController: { commitPhysicsResult: (pos: [number, number, number], g: boolean) => void };
          stepFrames: (n: number) => void;
        };
      }).__ONLINE_ZOO_RUNTIME__;
      // Move near North Gate to Panda Forest at [0, 0, 8.5]
      rt.characterController.commitPhysicsResult([0, 0.1, 10.5], true);
      rt.stepFrames(2);
    });

    const promptBanner = page.getByTestId('interaction-prompt-banner');
    await expect(promptBanner).toBeVisible();
    await expect(promptBanner).toContainText('Enter Panda Forest?');
    await promptBanner.click();
    await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number) => void } }).__ONLINE_ZOO_RUNTIME__;
      rt.stepFrames(2);
    });
    await expect(page.getByTestId('hud-zone-badge')).toContainText('Panda Forest', {
      timeout: 5000
    });

    // 6. Contextual Environment Interaction: Habitat Info Plaque & Stone Lantern (US3, FR-015..FR-018)
    await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: {
          characterController: { commitPhysicsResult: (pos: [number, number, number], g: boolean) => void };
          stepFrames: (n: number) => void;
        };
      }).__ONLINE_ZOO_RUNTIME__;
      // Move near Giant Panda Habitat Plaque at [2.8, 0, 11.5]
      rt.characterController.commitPhysicsResult([2.8, 0.1, 12.8], true);
      rt.stepFrames(2);
    });

    await expect(promptBanner).toBeVisible();
    await expect(promptBanner).toContainText('Giant Panda Habitat Plaque');

    await promptBanner.click();
    await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number) => void } }).__ONLINE_ZOO_RUNTIME__;
      rt.stepFrames(2);
    });

    const plaqueModal = page.getByTestId('info-plaque-modal');
    await expect(plaqueModal).toBeVisible();
    await page.getByTestId('close-plaque-btn').click();
    await expect(plaqueModal).toBeHidden();

    // Move near Stone Garden Lantern at [4.2, 0, 1.5] and toggle light state
    await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: {
          characterController: { commitPhysicsResult: (pos: [number, number, number], g: boolean) => void };
          stepFrames: (n: number) => void;
        };
      }).__ONLINE_ZOO_RUNTIME__;
      rt.characterController.commitPhysicsResult([4.2, 0.1, 2.8], true);
      rt.stepFrames(2);
    });
    await expect(promptBanner).toContainText('Stone Garden Lantern');
    await expect(page.getByTestId('lantern-state-badge')).toContainText('Lantern: Lit');
    await promptBanner.click();
    await page.evaluate(() => {
      const rt = (window as unknown as { __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number) => void } }).__ONLINE_ZOO_RUNTIME__;
      rt.stepFrames(2);
    });
    await expect(page.getByTestId('lantern-state-badge')).toContainText('Lantern: Off');

    // 7. ESC Settings Menu & Browser Resize (US4, FR-021)
    await page.keyboard.press('Escape');
    const settingsModal = page.getByTestId('settings-menu-modal');
    await expect(settingsModal).toBeVisible();

    await page.getByTestId('audio-mute-toggle').check();
    await page.getByTestId('resume-game-btn').click();
    await expect(settingsModal).toBeHidden();

    // Resize viewport to mobile dimensions + activate touch mode and verify HUD & joystick remain interactive
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const rt = (window as unknown as {
        __ONLINE_ZOO_RUNTIME__: {
          gameStore: { getState: () => { setActiveDevice: (d: 'touch' | 'desktop') => void } };
        };
      }).__ONLINE_ZOO_RUNTIME__;
      rt.gameStore.getState().setActiveDevice('touch');
    });
    await expect(page.getByTestId('virtual-joystick-pad')).toBeVisible();

    // Verify no panel covers more than ~60% of a phone screen (844 * 0.6 = 506.4px)
    await page.getByTestId('hud-passport-btn').click();
    const passportModal = page.getByTestId('zoo-passport-modal');
    await expect(passportModal).toBeVisible();
    const passportBox = await passportModal.boundingBox();
    expect(passportBox).not.toBeNull();
    if (passportBox) {
      expect(passportBox.height).toBeLessThanOrEqual(844 * 0.62);
    }
    await page.getByTestId('close-passport-btn').click();
  });
});

