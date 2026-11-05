import { beforeEach, describe, expect, it } from 'vitest';
import {
  CharacterControllerCore,
  gameStore,
  PANDA_FOREST_LAYOUT,
  resolveHorizontalWorldCollisions,
  ZooInstanceAuthority
} from '../src';

describe('Feature 011 — Streamlined HUD & Entrance Gate Arrival (FR-001..FR-007, SC-001..SC-004)', () => {
  beforeEach(() => {
    gameStore.getState().resetSession();
  });

  it('positions the Sanctuary Entrance Gate at [0, 0, 16.4] directly in front of the South Arrival Terrace spawn at [0, 0.1, 18] (FR-001, SC-001)', () => {
    const { spawnPosition, entranceGatePosition, obstacles } = PANDA_FOREST_LAYOUT;
    expect(spawnPosition).toEqual([0, 0.1, 18]);
    expect(entranceGatePosition).toEqual([0, 0, 16.4]);

    // Player starts behind (South/+Z of) the Entrance Gate looking North (-Z) into the gate
    expect(spawnPosition[2]).toBeGreaterThan(entranceGatePosition[2]);

    const westPillar = obstacles.find((o) => o.id === 'gate-pillar-west');
    const eastPillar = obstacles.find((o) => o.id === 'gate-pillar-east');
    expect(westPillar?.position).toEqual([-2.1, 0, 16.4]);
    expect(eastPillar?.position).toEqual([2.1, 0, 16.4]);
  });

  it('places all 16 multiplayer spawn slots behind the Entrance Gate (Z >= 18.0 > 16.4) facing North (FR-002, SC-001)', () => {
    const authority = new ZooInstanceAuthority();
    for (let slot = 0; slot < 16; slot++) {
      const pos = authority.computeSpawnPosition(slot);
      expect(pos[2]).toBeGreaterThanOrEqual(18.0);
      expect(pos[2]).toBeGreaterThan(PANDA_FOREST_LAYOUT.entranceGatePosition[2]);

      const joinRes = authority.joinOrResumePlayer({
        requestedRoomId: 'panda-forest-1',
        now: 1000 + slot * 10
      });
      expect(joinRes.welcome.spawnPosition[2]).toBeGreaterThanOrEqual(18.0);
      expect(joinRes.welcome.spawnYaw).toBeCloseTo(Math.PI, 4);
    }
  });

  it('walks straight forward (W / -Z) from spawn [0, 0.1, 18] cleanly through the Entrance Gate (Z = 16.4) into the Welcome Plaza without collision and unlocks the Welcome Plaza Gate stamp (FR-001, FR-003, SC-001)', () => {
    const controller = new CharacterControllerCore(PANDA_FOREST_LAYOUT.spawnPosition, Math.PI);
    expect(controller.getState().position[2]).toBeCloseTo(18.0, 3);

    // At spawn behind the gate (Z = 18.0), the Welcome Plaza Gate stamp is not yet triggered
    expect(
      gameStore.getState().evaluateProximityPassportZones(controller.getState().position)
        .newlyStampedZoneIds
    ).toEqual([]);

    let enteredWelcomePlaza = false;
    // Simulate walking forward (moveZ = -1, cameraYaw = 0) for 90 frames (1.5 seconds at 60 FPS -> ~6m North)
    for (let f = 0; f < 90; f++) {
      const step = controller.computeStep({
        input: {
          moveX: 0,
          moveZ: -1,
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

      const currentPos = controller.getState().position;
      const candidate: [number, number, number] = [
        currentPos[0] + step.desiredTranslation[0],
        currentPos[1] + step.desiredTranslation[1],
        currentPos[2] + step.desiredTranslation[2]
      ];
      const collision = resolveHorizontalWorldCollisions(candidate, 0.45);
      expect(collision.collided).toBe(false);
      controller.commitPhysicsResult(collision.position, true);

      if (collision.position[2] <= PANDA_FOREST_LAYOUT.entranceGatePosition[2]) {
        const res = gameStore.getState().evaluateProximityPassportZones(collision.position);
        if (res.newlyStampedZoneIds.includes('zone-welcome-plaza')) {
          enteredWelcomePlaza = true;
        }
      }
    }

    const finalPos = controller.getState().position;
    expect(finalPos[2]).toBeLessThan(PANDA_FOREST_LAYOUT.entranceGatePosition[2]);
    expect(finalPos[2]).toBeCloseTo(12.0, 1);
    expect(enteredWelcomePlaza).toBe(true);
  });

  it('toggles isHudCompact state cleanly for Minimal HUD mode and resets on session reset (FR-004, SC-002)', () => {
    expect(gameStore.getState().isHudCompact).toBe(false);

    gameStore.getState().toggleHudCompact();
    expect(gameStore.getState().isHudCompact).toBe(true);

    gameStore.getState().setHudCompact(false);
    expect(gameStore.getState().isHudCompact).toBe(false);

    gameStore.getState().setHudCompact(true);
    gameStore.getState().resetSession();
    expect(gameStore.getState().isHudCompact).toBe(false);
  });
});
