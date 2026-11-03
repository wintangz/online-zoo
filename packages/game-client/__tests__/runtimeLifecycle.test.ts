// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { clearAssetCache } from '@online-zoo/game-assets';
import {
  attachDesktopInputBindings,
  gameStore,
  mutableRuntimeState,
  PANDA_FOREST_LAYOUT,
  resetMutableRuntimeState
} from '@online-zoo/game-core';
import {
  computeCameraObstacleHitDistance,
  stepGameRuntimeTick
} from '../src/runtime/GameLoopController';
import { createGameRuntimeControllers } from '../src/runtime/ZooGameCanvas';

describe('Game Client Runtime Lifecycle, Resize & Obstacle Raycast (T044)', () => {
  it('handles repeated initialization, frame stepping, and cleanup without leaking listeners or state', () => {
    for (let cycle = 0; cycle < 3; cycle++) {
      gameStore.getState().resetSession();
      gameStore.getState().setPhase('playing');
      resetMutableRuntimeState();

      const container = document.createElement('div');
      document.body.appendChild(container);

      const controllers = createGameRuntimeControllers();
      const detach = attachDesktopInputBindings(controllers.inputController, {
        targetElement: container
      });

      // Simulate pressing W to walk forward
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      for (let f = 0; f < 10; f++) {
        stepGameRuntimeTick(1 / 60, controllers);
      }
      expect(mutableRuntimeState.avatar.locomotionState).toBe('Walking');
      expect(mutableRuntimeState.avatar.position[2]).toBeLessThan(
        PANDA_FOREST_LAYOUT.spawnPosition[2]
      );

      // Cleanup cycle
      detach();
      controllers.inputController.dispose();
      clearAssetCache();
      resetMutableRuntimeState();
      container.remove();

      // Verify state is cleanly reset to spawn and further key events do not mutate disposed controller
      expect(mutableRuntimeState.avatar.position).toEqual(PANDA_FOREST_LAYOUT.spawnPosition);
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
      const snapAfterDispose = controllers.inputController.consumeFrameSnapshot();
      expect(snapAfterDispose.moveZ).toBe(0);
    }
  });

  it('clears active movement inputs on browser window resize and window blur', () => {
    gameStore.getState().resetSession();
    gameStore.getState().setPhase('playing');
    const container = document.createElement('div');
    const controllers = createGameRuntimeControllers();
    const detach = attachDesktopInputBindings(controllers.inputController, {
      targetElement: container
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' }));
    stepGameRuntimeTick(1 / 60, controllers);
    expect(mutableRuntimeState.avatar.locomotionState).toBe('Running');

    // Trigger browser resize -> resets held movement keys to Idle
    window.dispatchEvent(new Event('resize'));
    stepGameRuntimeTick(1 / 60, controllers);
    expect(mutableRuntimeState.avatar.locomotionState).toBe('Idle');

    // Trigger Alt cursor reveal (Genshin Impact style) with auto-repeat resilience
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'AltLeft', repeat: false }));
    expect(gameStore.getState().isCursorRevealed).toBe(true);
    // Repeated keydown while holding Alt must not corrupt cursor state
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'AltLeft', repeat: true }));
    expect(gameStore.getState().isCursorRevealed).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'AltLeft' }));
    expect(gameStore.getState().isCursorRevealed).toBe(false);

    detach();
    controllers.inputController.dispose();
  });

  it('prevents left-click text selection (selectstart/dragstart/contextmenu), orbits camera via LMB/RMB drag when unlocked, and recovers cursor state after pointerlockchange or modal close (T060)', () => {
    gameStore.getState().resetSession();
    gameStore.getState().setPhase('playing');

    const container = document.createElement('div');
    document.body.appendChild(container);
    const hudButton = document.createElement('button');
    document.body.appendChild(hudButton);
    hudButton.focus();
    expect(document.activeElement).toBe(hudButton);

    const controllers = createGameRuntimeControllers();
    const detach = attachDesktopInputBindings(controllers.inputController, {
      targetElement: container
    });

    // 1. Suppress accidental text selection and native drag
    const selectEvt = new Event('selectstart', { cancelable: true });
    document.dispatchEvent(selectEvt);
    expect(selectEvt.defaultPrevented).toBe(true);

    const dragEvt = new Event('dragstart', { cancelable: true });
    document.dispatchEvent(dragEvt);
    expect(dragEvt.defaultPrevented).toBe(true);

    const ctxEvt = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    container.dispatchEvent(ctxEvt);
    expect(ctxEvt.defaultPrevented).toBe(true);

    // 2. Pointer lock exit must NOT deadlock isCursorRevealed to true
    document.dispatchEvent(new Event('pointerlockchange'));
    expect(gameStore.getState().isCursorRevealed).toBe(false);

    // 3. Opening and closing a plaque modal must cleanly restore isCursorRevealed to false
    gameStore.getState().openPlaqueModal(PANDA_FOREST_LAYOUT.interactiveObjects[0]);
    expect(gameStore.getState().isCursorRevealed).toBe(true);
    gameStore.getState().closePlaqueModal();
    expect(gameStore.getState().isCursorRevealed).toBe(false);

    // 4. Left-click + drag on canvas (without pointer lock and with movementX=0) orbits camera via clientX/clientY fallback
    const initialYaw = mutableRuntimeState.camera.yaw;
    container.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, clientX: 200, clientY: 200 })
    );
    window.dispatchEvent(
      new MouseEvent('mousemove', { bubbles: true, buttons: 1, clientX: 260, clientY: 215 })
    );
    window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));

    stepGameRuntimeTick(1 / 60, controllers);
    expect(mutableRuntimeState.camera.yaw).not.toBe(initialYaw);

    // 5. Pressing Space to jump blurs any focused HUD button so it is not accidentally clicked
    hudButton.focus();
    expect(document.activeElement).toBe(hudButton);
    const spaceEvt = new KeyboardEvent('keydown', { code: 'Space', cancelable: true });
    window.dispatchEvent(spaceEvt);
    expect(spaceEvt.defaultPrevented).toBe(true);
    expect(document.activeElement).not.toBe(hudButton);

    detach();
    controllers.inputController.dispose();
    container.remove();
    hudButton.remove();
  });

  it('detects obstacle and perimeter wall hits in computeCameraObstacleHitDistance', () => {
    const obs = PANDA_FOREST_LAYOUT.obstacles[0];
    // Place pivot 3m south of obstacle, looking straight north (yaw = PI) so camera ray points south (+Z) or vice versa
    const pivotNearObstacle: [number, number, number] = [
      obs.position[0],
      1.4,
      obs.position[2] - 2.5
    ];
    // Ray along +Z (yaw = 0) hits the obstacle at z = obs.position[2]
    const hitDist = computeCameraObstacleHitDistance(pivotNearObstacle, 0, 0.15, 8.0);
    expect(hitDist).not.toBeNull();
    expect(hitDist!).toBeLessThan(3.0);
  });
});

