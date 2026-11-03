import { describe, expect, it } from 'vitest';
import { CharacterControllerCore, InputController, TouchInputAdapter } from '../src';

describe('Mobile Touch Controls & Dedicated Run Button (US2, FR-013)', () => {
  it('steers at walking speed with the virtual joystick regardless of deflection and switches to running only when the dedicated Run button is active', () => {
    const input = new InputController();
    const touch = new TouchInputAdapter(input);
    const char = new CharacterControllerCore();

    // Full joystick deflection without Run button -> Walking speed (4.0 m/s)
    touch.updateJoystickFromDisplacement(120, -120, 50);
    const snapWalk = input.consumeFrameSnapshot();
    expect(snapWalk.activeDevice).toBe('touch');
    expect(Math.hypot(snapWalk.moveX, snapWalk.moveZ)).toBeCloseTo(1.0, 4);
    expect(snapWalk.runHeld).toBe(false);

    const stepWalk = char.computeStep({
      input: snapWalk,
      cameraYaw: 0,
      isGrounded: true,
      deltaTime: 1 / 60
    });
    expect(stepWalk.locomotionState).toBe('Walking');
    expect(Math.hypot(stepWalk.velocity[0], stepWalk.velocity[2])).toBeCloseTo(4.0, 2);

    // Activate dedicated Run button -> Running speed (7.5 m/s)
    touch.setRunButton(true);
    const snapRun = input.consumeFrameSnapshot();
    expect(snapRun.runHeld).toBe(true);

    const stepRun = char.computeStep({
      input: snapRun,
      cameraYaw: 0,
      isGrounded: true,
      deltaTime: 1 / 60
    });
    expect(stepRun.locomotionState).toBe('Running');
    expect(Math.hypot(stepRun.velocity[0], stepRun.velocity[2])).toBeCloseTo(7.5, 2);

    // Release joystick -> Idle
    touch.releaseJoystick();
    touch.setRunButton(false);
    const stepIdle = char.computeStep({
      input: input.consumeFrameSnapshot(),
      cameraYaw: 0,
      isGrounded: true,
      deltaTime: 1 / 60
    });
    expect(stepIdle.locomotionState).toBe('Idle');
  });

  it('supports touch-and-drag camera rotation, two-finger pinch zoom, and Jump/Interact/Menu touch buttons', () => {
    const input = new InputController();
    const touch = new TouchInputAdapter(input);

    touch.startCameraTouch(200, 200);
    touch.moveCameraTouch(240, 180);
    touch.updatePinchZoom({ clientX: 100, clientY: 100 }, { clientX: 200, clientY: 100 });
    touch.updatePinchZoom({ clientX: 100, clientY: 100 }, { clientX: 250, clientY: 100 });
    touch.triggerJump();
    touch.triggerInteract();
    touch.triggerMenu();

    const snap = input.consumeFrameSnapshot();
    expect(snap.activeDevice).toBe('touch');
    expect(snap.lookDeltaX).toBeGreaterThan(0);
    expect(snap.lookDeltaY).toBeLessThan(0);
    expect(snap.zoomDelta).toBeLessThan(0); // Pinching outward zooms in (reduces distance)
    expect(snap.jumpPressed).toBe(true);
    expect(snap.interactPressed).toBe(true);
    expect(snap.menuPressed).toBe(true);
  });
});

