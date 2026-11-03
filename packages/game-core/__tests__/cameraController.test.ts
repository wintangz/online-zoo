import { describe, expect, it } from 'vitest';
import { CameraControllerCore } from '../src';

describe('CameraControllerCore (US1 360 Orbit, Pitch, Zoom & Obstacle Pull-In)', () => {
  it('supports continuous 360-degree horizontal yaw wrapping in [0, 2*PI)', () => {
    const cam = new CameraControllerCore(0, 0.45, 5.5);

    // Rotate full circle negatively and positively
    const step1 = cam.step({
      targetPosition: [0, 0, 0],
      lookDeltaX: Math.PI * 2.5,
      lookDeltaY: 0,
      zoomDelta: 0,
      sensitivity: 1.0,
      invertY: false,
      obstacleHitDistance: null,
      deltaTime: 1 / 60
    });
    expect(step1.yaw).toBeGreaterThanOrEqual(0);
    expect(step1.yaw).toBeLessThan(Math.PI * 2);

    const step2 = cam.step({
      targetPosition: [0, 0, 0],
      lookDeltaX: -Math.PI * 3.2,
      lookDeltaY: 0,
      zoomDelta: 0,
      sensitivity: 1.0,
      invertY: false,
      obstacleHitDistance: null,
      deltaTime: 1 / 60
    });
    expect(step2.yaw).toBeGreaterThanOrEqual(0);
    expect(step2.yaw).toBeLessThan(Math.PI * 2);
  });

  it('clamps vertical pitch to [0.15 rad, 1.35 rad] and targetDistance to [2.5 m, 10.0 m]', () => {
    const cam = new CameraControllerCore(0, 0.5, 5.5);

    const highPitch = cam.step({
      targetPosition: [0, 0, 0],
      lookDeltaX: 0,
      lookDeltaY: 10.0,
      zoomDelta: 50.0,
      sensitivity: 1.0,
      invertY: false,
      obstacleHitDistance: null,
      deltaTime: 1 / 60
    });
    expect(highPitch.pitch).toBeCloseTo(1.35, 4);
    expect(highPitch.targetDistance).toBeCloseTo(10.0, 4);

    const lowPitch = cam.step({
      targetPosition: [0, 0, 0],
      lookDeltaX: 0,
      lookDeltaY: -10.0,
      zoomDelta: -50.0,
      sensitivity: 1.0,
      invertY: false,
      obstacleHitDistance: null,
      deltaTime: 1 / 60
    });
    expect(lowPitch.pitch).toBeCloseTo(0.15, 4);
    expect(lowPitch.targetDistance).toBeCloseTo(2.5, 4);
  });

  it('pulls effectiveDistance forward in front of solid obstacles and recovers when unobstructed (FR-011, SC-004)', () => {
    const cam = new CameraControllerCore(0, 0.45, 6.0);

    // Obstacle hit at 2.2m
    const obstructed = cam.step({
      targetPosition: [0, 0, 0],
      lookDeltaX: 0,
      lookDeltaY: 0,
      zoomDelta: 0,
      sensitivity: 1.0,
      invertY: false,
      obstacleHitDistance: 2.2,
      deltaTime: 1 / 60
    });
    expect(obstructed.effectiveDistance).toBeCloseTo(2.2 - 0.35, 3);
    expect(obstructed.effectiveDistance).toBeLessThan(obstructed.targetDistance);
    expect(obstructed.effectiveDistance).toBeGreaterThanOrEqual(0.8);

    // Recover when obstacle clears
    let recovered = obstructed;
    for (let i = 0; i < 60; i++) {
      recovered = cam.step({
        targetPosition: [0, 0, 0],
        lookDeltaX: 0,
        lookDeltaY: 0,
        zoomDelta: 0,
        sensitivity: 1.0,
        invertY: false,
        obstacleHitDistance: null,
        deltaTime: 1 / 30
      });
    }
    expect(recovered.effectiveDistance).toBeCloseTo(6.0, 1);
  });
});

