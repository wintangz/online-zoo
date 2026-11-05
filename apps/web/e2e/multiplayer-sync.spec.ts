import { expect, test } from '@playwright/test';

test.describe('Feature 002: Multiplayer Foundation (Multi-Session Sync & Recovery)', () => {
  test('connects two concurrent browser sessions to the same Panda Forest instance, syncs movement/animations and shared props, validates bounds, and recovers from network drops without page reload', async ({
    browser
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // 1. Enter via Main Menu in Session A (US1, FR-001..FR-004, SC-001)
      await pageA.goto('/?room=e2e-multiplayer-room');
      await expect(pageA.getByTestId('main-menu-screen')).toBeVisible();
      const enterBtnA = pageA.getByTestId('enter-world-btn');
      await expect(enterBtnA).toBeEnabled({ timeout: 10000 });
      await enterBtnA.click();

      // Enable Dev / Debug telemetry strip in Session A to inspect multiplayer & visitor badges
      await pageA.getByTestId('hud-dev-debug-toggle-btn').click();

      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 5000
      });
      await expect(pageA.getByTestId('visitor-count-badge')).toHaveText('Visitors: 1');
      await expect(pageA.getByTestId('local-visitor-badge')).toContainText('Explorer #101');

      await pageA.waitForFunction(() =>
        Boolean((window as unknown as Record<string, unknown>).__ONLINE_ZOO_RUNTIME__)
      );
      const sessionIdA = await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { multiplayerClient: { getSessionId: () => string } };
        }).__ONLINE_ZOO_RUNTIME__;
        return rt.multiplayerClient.getSessionId();
      });
      expect(sessionIdA).toBeTruthy();

      // 2. Enter via Main Menu in Session B and verify mutual presence & non-overlapping spawn plaza offsets
      await pageB.goto('/?room=e2e-multiplayer-room');
      await expect(pageB.getByTestId('main-menu-screen')).toBeVisible();
      const enterBtnB = pageB.getByTestId('enter-world-btn');
      await expect(enterBtnB).toBeEnabled({ timeout: 10000 });
      await enterBtnB.click();

      // Enable Dev / Debug telemetry strip in Session B
      await pageB.getByTestId('hud-dev-debug-toggle-btn').click();

      await expect(pageB.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 5000
      });
      await expect(pageB.getByTestId('visitor-count-badge')).toHaveText('Visitors: 2');
      await expect(pageA.getByTestId('visitor-count-badge')).toHaveText('Visitors: 2');
      await expect(pageB.getByTestId('local-visitor-badge')).toContainText('Explorer #102');

      await pageB.waitForFunction(() =>
        Boolean((window as unknown as Record<string, unknown>).__ONLINE_ZOO_RUNTIME__)
      );
      const sessionIdB = await pageB.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { multiplayerClient: { getSessionId: () => string } };
        }).__ONLINE_ZOO_RUNTIME__;
        return rt.multiplayerClient.getSessionId();
      });
      expect(sessionIdB).toBeTruthy();
      expect(sessionIdB).not.toBe(sessionIdA);

      // Verify both clients render each other's remote visitor badges
      await expect(pageA.getByTestId(`remote-visitor-badge-${sessionIdB}`)).toContainText(
        'Explorer #102'
      );
      await expect(pageB.getByTestId(`remote-visitor-badge-${sessionIdA}`)).toContainText(
        'Explorer #101'
      );

      // Verify non-stacking spawn plaza coordinates (VR-003)
      const posA = await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            mutableRuntimeState: { avatar: { position: [number, number, number] } };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        return rt.mutableRuntimeState.avatar.position;
      });
      const posB = await pageB.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            mutableRuntimeState: { avatar: { position: [number, number, number] } };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        return rt.mutableRuntimeState.avatar.position;
      });
      const spawnDist = Math.hypot(posA[0] - posB[0], posA[2] - posB[2]);
      expect(spawnDist).toBeGreaterThan(0.2);

      // 3. Synchronized Movement, Animations & Interpolation (US2, FR-006..FR-009, SC-002, SC-003)
      await pageA.keyboard.down('KeyW');
      await pageA.keyboard.down('ShiftLeft');
      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { stepFrames: (n: number, dt?: number) => void };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.stepFrames(8, 1 / 60);
      });
      await expect(pageA.getByTestId('locomotion-state-badge')).toHaveText('Running');

      // Wait briefly for 20 Hz tick and verify Session B sees Session A's Running state and updated Z coordinate
      await expect(pageB.getByTestId(`remote-visitor-badge-${sessionIdA}`)).toContainText(
        'Running',
        { timeout: 2000 }
      );

      await pageA.keyboard.up('ShiftLeft');
      await pageA.keyboard.up('KeyW');

      // Step Session B frames to verify smooth 60 FPS remote interpolation
      const interpolatedZOnB = await pageB.evaluate((sidA) => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            stepFrames: (n: number, dt?: number) => void;
            mutableRuntimeState: {
              remotePlayers: Map<string, { renderPosition: [number, number, number] }>;
            };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.stepFrames(12, 1 / 60);
        return rt.mutableRuntimeState.remotePlayers.get(sidA)?.renderPosition[2] ?? 18;
      }, sessionIdA!);
      expect(interpolatedZOnB).toBeLessThan(18.0);

      // 4. Shared World Prop Synchronization across Sessions (US2, FR-010)
      await expect(pageA.getByTestId('lantern-state-badge')).toContainText('Lantern: Lit');
      await expect(pageB.getByTestId('lantern-state-badge')).toContainText('Lantern: Lit');

      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            multiplayerClient: { sendPropInteraction: (id: string) => void };
            gameStore: { getState: () => { togglePropState: (id: string) => void } };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.gameStore.getState().togglePropState('prop-stone-lantern');
        rt.multiplayerClient.sendPropInteraction('prop-stone-lantern');
      });

      await expect(pageA.getByTestId('lantern-state-badge')).toContainText('Lantern: Off');
      await expect(pageB.getByTestId('lantern-state-badge')).toContainText('Lantern: Off', {
        timeout: 2000
      });

      // 5. Authoritative Out-of-Bounds / Speed-Hack Clamping & Reconciliation (US3, FR-011, FR-012, SC-006)
      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            multiplayerClient: {
              sendMoveUpdate: (
                pos: [number, number, number],
                vel: [number, number, number],
                yaw: number,
                state: 'Running'
              ) => void;
            };
            mutableRuntimeState: { avatar: { position: [number, number, number] } };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.mutableRuntimeState.avatar.position = [999, 0.1, 999];
        rt.multiplayerClient.sendMoveUpdate([999, 0.1, 999], [0, 0, 0], 0, 'Running');
      });

      // Wait for next 50ms server tick to clamp and snap Session A back inside the 36m perimeter
      await pageA.waitForFunction(
        () => {
          const rt = (window as unknown as {
            __ONLINE_ZOO_RUNTIME__: {
              mutableRuntimeState: { avatar: { position: [number, number, number] } };
            };
          }).__ONLINE_ZOO_RUNTIME__;
          const pos = rt.mutableRuntimeState.avatar.position;
          return Math.hypot(pos[0], pos[2]) < 36;
        },
        null,
        { timeout: 2000 }
      );

      // 6. Temporary Network Interruption & Automatic Reconnection with Session Resume (US4, FR-015, FR-016, SC-007)
      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: { multiplayerClient: { simulateNetworkDrop: (ms: number) => void } };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.multiplayerClient.simulateNetworkDrop(300);
      });
      await expect(pageA.getByTestId('multiplayer-status-badge')).toContainText('Reconnecting');
      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 4000
      });
      await expect(pageA.getByTestId('local-visitor-badge')).toContainText('Explorer #101');

      // 7. Manual In-App "Reconnect to Zoo" Button Recovery (US4, FR-017, SC-008)
      await pageA.evaluate(() => {
        const rt = (window as unknown as {
          __ONLINE_ZOO_RUNTIME__: {
            gameStore: {
              getState: () => {
                updateMultiplayerState: (p: { status: 'disconnected' }) => void;
              };
            };
          };
        }).__ONLINE_ZOO_RUNTIME__;
        rt.gameStore.getState().updateMultiplayerState({ status: 'disconnected' });
      });
      const reconnectBtn = pageA.getByTestId('reconnect-multiplayer-btn');
      await expect(reconnectBtn).toBeVisible();
      await reconnectBtn.click();
      await expect(pageA.getByTestId('multiplayer-status-badge')).toHaveText('Connected', {
        timeout: 4000
      });

      // 8. Clean Disconnection of Session B Removes Avatar & Updates Visitor Count on Session A (US1, FR-005, SC-004)
      await pageB.close();
      await expect(pageA.getByTestId('visitor-count-badge')).toHaveText('Visitors: 1', {
        timeout: 3000
      });
      await expect(pageA.getByTestId(`remote-visitor-badge-${sessionIdB}`)).toHaveCount(0);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});

