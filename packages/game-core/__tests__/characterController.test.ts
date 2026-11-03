import { describe, expect, it } from 'vitest';
import {
  CharacterControllerCore,
  InputController,
  normalizeAngleRadians
} from '../src';

describe('CharacterControllerCore (US1 Locomotion & State Machine)', () => {
  it('moves in all 8 cardinal and diagonal directions and faces movement direction within 0.3s (SC-002)', () => {
    const directions: Array<{ name: string; x: number; z: number }> = [
      { name: 'N (W)', x: 0, z: -1 },
      { name: 'S (S)', x: 0, z: 1 },
      { name: 'E (D)', x: 1, z: 0 },
      { name: 'W (A)', x: -1, z: 0 },
      { name: 'NE (W+D)', x: Math.SQRT1_2, z: -Math.SQRT1_2 },
      { name: 'NW (W+A)', x: -Math.SQRT1_2, z: -Math.SQRT1_2 },
      { name: 'SE (S+D)', x: Math.SQRT1_2, z: Math.SQRT1_2 },
      { name: 'SW (S+A)', x: -Math.SQRT1_2, z: Math.SQRT1_2 }
    ];

    for (const dir of directions) {
      const ctrl = new CharacterControllerCore([0, 0.1, 0], 0);
      const expectedTargetYaw = normalizeAngleRadians(Math.atan2(dir.x, dir.z));

      // Simulate 0.25s (15 frames at 60 FPS, < 0.3s SC-002 requirement)
      let lastStep = ctrl.computeStep({
        input: {
          moveX: dir.x,
          moveZ: dir.z,
          runHeld: false,
          jumpPressed: false,
          interactPressed: false,
          menuPressed: false,
          cursorRevealHeld: false,
          lookDeltaX: 0,
          lookDeltaY: 0,
          zoomDelta: 0,
          activeDevice: 'desktop'
        },
        cameraYaw: 0,
        isGrounded: true,
        deltaTime: 1 / 60
      });

      for (let i = 0; i < 14; i++) {
        lastStep = ctrl.computeStep({
          input: {
            moveX: dir.x,
            moveZ: dir.z,
            runHeld: false,
            jumpPressed: false,
            interactPressed: false,
            menuPressed: false,
            cursorRevealHeld: false,
            lookDeltaX: 0,
            lookDeltaY: 0,
            zoomDelta: 0,
            activeDevice: 'desktop'
          },
          cameraYaw: 0,
          isGrounded: true,
          deltaTime: 1 / 60
        });
      }

      const speed = Math.hypot(lastStep.velocity[0], lastStep.velocity[2]);
      expect(speed).toBeCloseTo(4.0, 2);
      expect(lastStep.locomotionState).toBe('Walking');
      const angleDiff = Math.abs(normalizeAngleRadians(lastStep.facingYaw - expectedTargetYaw));
      expect(angleDiff).toBeLessThan(0.05);
    }
  });

  it('enforces walk speed <= 4.0 m/s, run speed <= 7.5 m/s, jump impulse +6.5 m/s, gravity -18.0 m/s^2, and prevents mid-air double jumps', () => {
    const ctrl = new CharacterControllerCore([0, 0.1, 18], 0);
    const input = new InputController();

    // 1. Walk
    input.setKeyState('KeyW', true);
    const walkStep = ctrl.computeStep({
      input: input.consumeFrameSnapshot(),
      cameraYaw: 0,
      isGrounded: true,
      deltaTime: 1 / 60
    });
    expect(walkStep.locomotionState).toBe('Walking');
    expect(Math.hypot(walkStep.velocity[0], walkStep.velocity[2])).toBeLessThanOrEqual(4.0001);

    // 2. Run
    input.setKeyState('ShiftLeft', true);
    const runStep = ctrl.computeStep({
      input: input.consumeFrameSnapshot(),
      cameraYaw: 0,
      isGrounded: true,
      deltaTime: 1 / 60
    });
    expect(runStep.locomotionState).toBe('Running');
    expect(Math.hypot(runStep.velocity[0], runStep.velocity[2])).toBeCloseTo(7.5, 2);

    // 3. Jump impulse (+6.5 m/s)
    input.setKeyState('Space', true);
    const jumpStep = ctrl.computeStep({
      input: input.consumeFrameSnapshot(),
      cameraYaw: 0,
      isGrounded: true,
      deltaTime: 1 / 60
    });
    expect(jumpStep.locomotionState).toBe('Jumping');
    expect(jumpStep.velocity[1]).toBeCloseTo(6.5, 3);

    // 4. Mid-air repeated jump attempt must be ignored and gravity (-18.0 m/s^2) applied
    input.setKeyState('Space', false);
    input.setKeyState('Space', true);
    const airStep = ctrl.computeStep({
      input: input.consumeFrameSnapshot(),
      cameraYaw: 0,
      isGrounded: false,
      deltaTime: 0.1
    });
    expect(airStep.locomotionState).toBe('Jumping');
    expect(airStep.velocity[1]).toBeCloseTo(6.5 - 18.0 * 0.1, 3);
  });

  it('completes 24 consecutive state transitions across Idle, Walking, Running, and Jumping with 100% reliability (SC-003)', () => {
    const ctrl = new CharacterControllerCore();
    const input = new InputController();

    for (let cycle = 0; cycle < 6; cycle++) {
      // Idle
      input.resetAll();
      expect(
        ctrl.computeStep({
          input: input.consumeFrameSnapshot(),
          cameraYaw: 0,
          isGrounded: true,
          deltaTime: 1 / 60
        }).locomotionState
      ).toBe('Idle');

      // Walking
      input.setKeyState('KeyW', true);
      expect(
        ctrl.computeStep({
          input: input.consumeFrameSnapshot(),
          cameraYaw: 0,
          isGrounded: true,
          deltaTime: 1 / 60
        }).locomotionState
      ).toBe('Walking');

      // Running
      input.setKeyState('ShiftLeft', true);
      expect(
        ctrl.computeStep({
          input: input.consumeFrameSnapshot(),
          cameraYaw: 0,
          isGrounded: true,
          deltaTime: 1 / 60
        }).locomotionState
      ).toBe('Running');

      // Jumping
      input.setKeyState('Space', true);
      expect(
        ctrl.computeStep({
          input: input.consumeFrameSnapshot(),
          cameraYaw: 0,
          isGrounded: true,
          deltaTime: 1 / 60
        }).locomotionState
      ).toBe('Jumping');
    }
  });
});

