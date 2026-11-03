import { describe, expect, it } from 'vitest';
import {
  InputController,
  PANDA_FOREST_LAYOUT,
  resolveHorizontalWorldCollisions
} from '../src';

describe('Desktop Input & Collision Boundary Enforcement (FR-002, FR-003, FR-012, SC-005)', () => {
  it('captures WASD, Shift runHeld, Space jumpPressed, E interactPressed, ESC menuPressed, and Alt cursorRevealHeld', () => {
    const input = new InputController();

    input.setKeyState('KeyW', true);
    input.setKeyState('KeyD', true);
    input.setKeyState('ShiftLeft', true);
    input.setKeyState('Space', true);
    input.setKeyState('KeyE', true);
    input.setKeyState('AltLeft', true);
    input.addLookDelta(0.12, -0.08, 'desktop');
    input.addZoomDelta(-0.5, 'desktop');

    const snap1 = input.consumeFrameSnapshot();
    expect(Math.hypot(snap1.moveX, snap1.moveZ)).toBeCloseTo(1.0, 4);
    expect(snap1.runHeld).toBe(true);
    expect(snap1.jumpPressed).toBe(true);
    expect(snap1.interactPressed).toBe(true);
    expect(snap1.cursorRevealHeld).toBe(true);
    expect(snap1.lookDeltaX).toBeCloseTo(0.12, 4);
    expect(snap1.lookDeltaY).toBeCloseTo(-0.08, 4);
    expect(snap1.zoomDelta).toBeCloseTo(-0.5, 4);

    // Edge-triggered flags must auto-clear on the next frame while held keys persist
    const snap2 = input.consumeFrameSnapshot();
    expect(snap2.jumpPressed).toBe(false);
    expect(snap2.interactPressed).toBe(false);
    expect(snap2.runHeld).toBe(true);
    expect(snap2.cursorRevealHeld).toBe(true);

    // Reset clears everything on window blur / menu open
    input.resetAll();
    const snap3 = input.consumeFrameSnapshot();
    expect(snap3.moveX).toBe(0);
    expect(snap3.moveZ).toBe(0);
    expect(snap3.runHeld).toBe(false);
    expect(snap3.cursorRevealHeld).toBe(false);

    // KeyF and triggerAction('interact' | 'jump' | 'menu') also queue edge-triggered actions cleanly
    input.setKeyState('KeyF', true);
    expect(input.consumeFrameSnapshot().interactPressed).toBe(true);
    input.setKeyState('KeyF', false);

    input.triggerAction('interact');
    input.triggerAction('jump');
    input.triggerAction('menu');
    const snap4 = input.consumeFrameSnapshot();
    expect(snap4.interactPressed).toBe(true);
    expect(snap4.jumpPressed).toBe(true);
    expect(snap4.menuPressed).toBe(true);
  });

  it('blocks the avatar from walking through rocks, trees, bamboo clusters, pond shoreline, and outer perimeter 100% of the time (SC-005)', () => {
    // 1. Test every solid obstacle in Panda Forest
    for (const obs of PANDA_FOREST_LAYOUT.obstacles) {
      const res = resolveHorizontalWorldCollisions([obs.position[0], 0.1, obs.position[2]], 0.45);
      expect(res.collided).toBe(true);
      expect(res.hitIds).toContain(obs.id);
      const resolvedDist = Math.hypot(
        res.position[0] - obs.position[0],
        res.position[2] - obs.position[2]
      );
      expect(resolvedDist).toBeGreaterThanOrEqual(obs.radius + 0.45 - 1e-4);
    }

    // 2. Test blocked pond shoreline at [-8, 0, -4] (FR-002)
    const pondCenter = PANDA_FOREST_LAYOUT.pond.center;
    const pondAttempt = resolveHorizontalWorldCollisions([pondCenter[0], 0.1, pondCenter[2]], 0.45);
    expect(pondAttempt.collided).toBe(true);
    expect(pondAttempt.hitIds).toContain('pond-shoreline');
    const distFromPondCenter = Math.hypot(
      pondAttempt.position[0] - pondCenter[0],
      pondAttempt.position[2] - pondCenter[2]
    );
    expect(distFromPondCenter).toBeGreaterThanOrEqual(PANDA_FOREST_LAYOUT.pond.radius);

    // 3. Test outer perimeter boundary fence (radius: 36m)
    const outsideAttempt = resolveHorizontalWorldCollisions([39, 0.1, 0], 0.45);
    expect(outsideAttempt.collided).toBe(true);
    expect(outsideAttempt.hitIds).toContain('perimeter-fence');
    expect(Math.hypot(outsideAttempt.position[0], outsideAttempt.position[2])).toBeLessThanOrEqual(
      PANDA_FOREST_LAYOUT.perimeterRadius
    );
  });
});

