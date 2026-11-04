import { expect, test } from '@playwright/test';

test.describe('Feature 004 — Social Interaction (Multi-Session E2E)', () => {
  test('supports proximity text chat & 3D speech bubbles, 5 avatar emotes, simultaneous multi-seat bench sitting/standing, friend requests & online status, and mute/block/report safety controls', async ({
    browser
  }) => {
    const roomId = `e2e-social-${Date.now()}`;

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

      await expect(pageA.getByTestId('visitor-count-badge')).toContainText('Visitors: 2', {
        timeout: 15_000
      });
      await expect(pageB.getByTestId('visitor-count-badge')).toContainText('Visitors: 2', {
        timeout: 15_000
      });

      const infoA = await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            multiplayerClient: { getSessionId: () => string };
            gameStore: { getState: () => { identity: { profile: { playerId: string } } } };
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
            gameStore: { getState: () => { identity: { profile: { playerId: string } } } };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        return {
          sessionId: rt.multiplayerClient.getSessionId(),
          playerId: rt.gameStore.getState().identity.profile.playerId
        };
      });

      expect(infoA.sessionId).toBeTruthy();
      expect(infoB.sessionId).toBeTruthy();

      // 2. Proximity Text Chat, Speech Bubbles & Moderation (US1, FR-001–FR-008, SC-001–SC-003)
      const chatInputA = pageA.getByTestId('chat-message-input');
      await expect(chatInputA).toBeVisible();

      // Profanity filter check
      await chatInputA.fill('what the fuck');
      await pageA.getByTestId('chat-send-btn').click();
      await expect(pageA.getByTestId('chat-feedback-banner')).toBeVisible();

      // Valid proximity chat message -> appears in both chat lists and as 3D speech bubbles
      await chatInputA.fill('Hello from the Welcome Plaza! 🐼');
      await pageA.getByTestId('chat-send-btn').click();

      await expect(pageA.getByTestId('chat-message-list')).toContainText(
        'Hello from the Welcome Plaza! 🐼'
      );
      await expect(pageA.getByTestId('local-speech-bubble')).toContainText(
        'Hello from the Welcome Plaza! 🐼'
      );

      await expect(pageB.getByTestId('chat-message-list')).toContainText(
        'Hello from the Welcome Plaza! 🐼',
        { timeout: 10_000 }
      );
      await expect(pageB.getByTestId(`remote-speech-bubble-${infoA.sessionId}`)).toContainText(
        'Hello from the Welcome Plaza! 🐼'
      );

      // 3. Expressive Avatar Emotes & Movement Cancellation (US2, FR-009–FR-011, SC-004)
      await pageA.getByTestId('emote-btn-dance').click();
      await expect(pageA.getByTestId('local-emote-badge')).toContainText('Dance');
      await expect(pageB.getByTestId(`remote-emote-badge-${infoA.sessionId}`)).toContainText(
        'Dance',
        { timeout: 10_000 }
      );

      // Walking cancels active emote immediately
      await pageA.keyboard.down('KeyW');
      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number, dt?: number) => void };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.stepFrames(5, 1 / 60);
      });
      await pageA.keyboard.up('KeyW');
      await expect(pageA.getByTestId('local-emote-badge')).toBeHidden();

      // 4. Multi-Seat Bench Sitting & Standing (US3, FR-012–FR-016, SC-005)
      // Move both players next to Welcome Plaza Bench (`prop-plaza-bench` at [-3.2, 0, 15.0])
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
          rt.characterController.commitPhysicsResult([-3.0, 0.1, 15.8], true);
          rt.multiplayerClient.sendMoveUpdate([-3.0, 0.1, 15.8], [0, 0, 0], 0, 'Idle');
          rt.stepFrames(4, 1 / 60);
        });
      }

      await expect(pageA.getByTestId('interaction-prompt-banner')).toContainText(
        'Entry Plaza Bamboo Bench'
      );
      await expect(pageA.getByTestId('seat-availability-badge')).toContainText(
        'Available (2/2 seats free)'
      );

      // Player A presses E to sit on seat 1
      await pageA.keyboard.press('KeyE');
      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number, dt?: number) => void };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.stepFrames(2, 1 / 60);
      });
      await expect(pageA.getByTestId('stand-up-btn')).toBeVisible({ timeout: 10_000 });
      await expect(pageB.getByTestId('seat-availability-badge')).toContainText(
        'Available (1/2 seats free)',
        { timeout: 10_000 }
      );

      // Player B presses E to sit simultaneously on seat 2 of the same bench
      await pageB.keyboard.press('KeyE');
      await pageB.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number, dt?: number) => void };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.stepFrames(2, 1 / 60);
      });
      await expect(pageB.getByTestId('stand-up-btn')).toBeVisible({ timeout: 10_000 });

      // Player A clicks Stand Up -> frees their seat and sees 1/2 seats free while Player B remains seated
      await pageA.getByTestId('stand-up-btn').click();
      await expect(pageA.getByTestId('stand-up-btn')).toBeHidden();
      await expect(pageA.getByTestId('seat-availability-badge')).toContainText(
        'Available (1/2 seats free)',
        { timeout: 10_000 }
      );

      // Player B stands up -> bench returns to 2/2 seats free
      await pageB.getByTestId('stand-up-btn').click();
      await expect(pageA.getByTestId('seat-availability-badge')).toContainText(
        'Available (2/2 seats free)',
        { timeout: 10_000 }
      );

      // 5. Friends List & Online Status (US4, FR-017–FR-020, SC-006)
      await pageA.getByTestId('toggle-social-drawer-btn').click();
      await expect(pageA.getByTestId('social-drawer-panel')).toBeVisible();

      await pageA.getByTestId(`send-friend-request-btn-${infoB.playerId}`).click();

      // Player B opens Social Drawer and accepts Player A's friend request
      await pageB.getByTestId('toggle-social-drawer-btn').click();
      await expect(pageB.getByTestId(`incoming-friend-request-${infoA.playerId}`)).toBeVisible({
        timeout: 10_000
      });
      await pageB.locator('[data-testid^="accept-friend-request-btn-"]').first().click();

      // Both players see each other in their Friends list with live Online status
      await expect(pageA.getByTestId(`friend-item-${infoB.playerId}`)).toBeVisible({
        timeout: 10_000
      });
      await expect(pageA.getByTestId(`friend-status-${infoB.playerId}`)).toContainText('Online');
      await expect(pageB.getByTestId(`friend-item-${infoA.playerId}`)).toBeVisible({
        timeout: 10_000
      });

      // 6. Safety Controls: Mute, Report & Block (US5, FR-021–FR-024, SC-007–SC-008)
      // Player A reports Player B
      await pageA.getByTestId(`open-report-modal-btn-${infoB.playerId}`).click();
      await expect(pageA.getByTestId('report-player-modal')).toBeVisible();
      await pageA.getByTestId('report-reason-select').selectOption('harassment-spam');
      await pageA.getByTestId('report-details-input').fill('Testing safety report submission E2E');
      await pageA.getByTestId('submit-report-btn').click();

      await expect(pageA.getByTestId('report-player-modal')).toBeHidden();
      await expect(pageA.getByTestId('report-confirmation-banner')).toBeVisible({
        timeout: 10_000
      });

      // Player A mutes Player B
      await pageA.getByTestId(`mute-player-btn-${infoB.playerId}`).click();
      await expect(pageA.getByTestId(`mute-player-btn-${infoB.playerId}`)).toHaveText('Unmute');

      // Player A blocks Player B -> removes friendship
      await pageA.getByTestId(`block-player-btn-${infoB.playerId}`).click();
      await expect(pageA.getByTestId(`block-player-btn-${infoB.playerId}`)).toHaveText('Unblock');
      await expect(pageA.getByTestId(`friend-item-${infoB.playerId}`)).toBeHidden({
        timeout: 10_000
      });

      // 7. Selectable & Copiable Player ID, Player ID Tuning & Instance Selection (US6, FR-025–FR-029, SC-009–SC-011)
      await expect(pageA.getByTestId('social-local-player-id')).toContainText(infoA.playerId);
      await pageA.getByTestId('copy-local-player-id-btn').click();
      await expect(pageA.getByTestId('copy-local-player-id-btn')).toHaveText('Copied!');

      await expect(pageA.getByTestId(`visitor-player-id-${infoB.playerId}`)).toContainText(
        infoB.playerId
      );
      await pageA.getByTestId(`copy-visitor-id-btn-${infoB.playerId}`).click();
      await expect(pageA.getByTestId(`copy-visitor-id-btn-${infoB.playerId}`)).toHaveText(
        'Copied!'
      );

      // Player A tunes their Player ID
      await pageA.getByTestId('tune-player-id-input').fill('bamboo-ranger-77');
      await pageA.getByTestId('apply-player-id-btn').click();
      await expect(pageA.getByTestId('social-local-player-id')).toHaveText(
        'player-bamboo-ranger-77'
      );
      await expect(pageA.getByTestId('hud-player-id-badge')).toHaveText(
        'player-bamboo-ranger-77'
      );

      // Player A switches zoo instance from the Instance Selector directory
      await expect(pageA.getByTestId('instance-selector-section')).toBeVisible();
      await pageA.getByTestId('switch-instance-btn-panda-forest-2').click();
      await expect(pageA.getByTestId('hud-instance-badge')).toContainText('panda-forest-2', {
        timeout: 10_000
      });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});

