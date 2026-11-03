import React, { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CameraControllerCore,
  CharacterControllerCore,
  gameStore,
  InputController,
  InteractionSystem,
  mutableRuntimeState,
  PANDA_FOREST_LAYOUT,
  resolveHorizontalWorldCollisions
} from '@online-zoo/game-core';

export interface GameLoopControllerProps {
  inputController: InputController;
  characterController: CharacterControllerCore;
  cameraController: CameraControllerCore;
  interactionSystem: InteractionSystem;
}

/**
 * Computes analytical ray-obstacle intersection distance from the avatar camera pivot
 * toward the desired camera position against all solid obstacles and the outer perimeter wall.
 * Guarantees 100% camera obstacle pull-in (FR-011, SC-004).
 */
export function computeCameraObstacleHitDistance(
  pivot: [number, number, number],
  yaw: number,
  pitch: number,
  maxDistance: number
): number | null {
  const dirX = Math.cos(pitch) * Math.sin(yaw);
  const dirY = Math.sin(pitch);
  const dirZ = Math.cos(pitch) * Math.cos(yaw);

  let closestHit: number | null = null;

  // 1. Check ray against cylinder obstacles (trees, rocks, bamboo clusters)
  for (const obs of PANDA_FOREST_LAYOUT.obstacles) {
    if (pivot[1] > obs.height + 0.5) continue;
    const ox = pivot[0] - obs.position[0];
    const oz = pivot[2] - obs.position[2];
    const a = dirX * dirX + dirZ * dirZ;
    if (a < 1e-6) continue;
    const b = 2 * (ox * dirX + oz * dirZ);
    const c = ox * ox + oz * oz - obs.radius * obs.radius;
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sqrtDisc = Math.sqrt(disc);
      const t1 = (-b - sqrtDisc) / (2 * a);
      if (t1 > 0.2 && t1 < maxDistance) {
        const hitY = pivot[1] + dirY * t1;
        if (hitY <= obs.height + 0.2) {
          if (closestHit === null || t1 < closestHit) {
            closestHit = t1;
          }
        }
      }
    }
  }

  // 2. Check ray against outer perimeter enclosure wall (radius: 36m)
  {
    const a = dirX * dirX + dirZ * dirZ;
    if (a > 1e-6) {
      const b = 2 * (pivot[0] * dirX + pivot[2] * dirZ);
      const r = PANDA_FOREST_LAYOUT.perimeterRadius;
      const c = pivot[0] * pivot[0] + pivot[2] * pivot[2] - r * r;
      const disc = b * b - 4 * a * c;
      if (disc >= 0) {
        const t2 = (-b + Math.sqrt(disc)) / (2 * a);
        if (t2 > 0.2 && t2 < maxDistance) {
          if (closestHit === null || t2 < closestHit) {
            closestHit = t2;
          }
        }
      }
    }
  }

  return closestHit;
}

export function stepGameRuntimeTick(
  dt: number,
  controllers: GameLoopControllerProps
): void {
  const { inputController, characterController, cameraController, interactionSystem } = controllers;
  const storeState = gameStore.getState();

  const snapshot = inputController.consumeFrameSnapshot();
  storeState.setActiveDevice(snapshot.activeDevice);

  // Handle menu button toggle from touch or keyboard
  if (snapshot.menuPressed) {
    if (storeState.activePlaqueModal) {
      storeState.closePlaqueModal();
    } else if (storeState.phase === 'playing') {
      storeState.setPhase('paused');
      storeState.setCursorState(false, true);
      inputController.resetAll();
      return;
    } else if (storeState.phase === 'paused') {
      storeState.setPhase('playing');
      storeState.setCursorState(false, false);
    }
  }

  if (storeState.phase !== 'playing') {
    return;
  }

  const prevAvatar = characterController.getState();
  const prevCam = cameraController.getState();

  // 1. Step Character Locomotion
  const stepOut = characterController.computeStep({
    input: snapshot,
    cameraYaw: prevCam.yaw,
    isGrounded: prevAvatar.isGrounded,
    deltaTime: dt
  });

  const candidateX = prevAvatar.position[0] + stepOut.desiredTranslation[0];
  const candidateY = prevAvatar.position[1] + stepOut.desiredTranslation[1];
  const candidateZ = prevAvatar.position[2] + stepOut.desiredTranslation[2];

  // 2. Resolve horizontal collisions against rocks, trees, bamboo, pond shoreline, and perimeter
  const collisionResolved = resolveHorizontalWorldCollisions(
    [candidateX, candidateY, candidateZ],
    0.45,
    PANDA_FOREST_LAYOUT
  );

  const grounded =
    stepOut.velocity[1] <= 0 &&
    collisionResolved.position[1] <= PANDA_FOREST_LAYOUT.worldBounds.minY + 0.1001;
  const finalY = grounded ? 0.1 : collisionResolved.position[1];

  characterController.commitPhysicsResult(
    [collisionResolved.position[0], finalY, collisionResolved.position[2]],
    grounded
  );

  const updatedAvatar = characterController.getState();
  mutableRuntimeState.avatar = updatedAvatar;
  storeState.setLocomotionState(updatedAvatar.locomotionState);

  // 3. Step Camera Controller with Obstacle Pull-In
  const pivot: [number, number, number] = [
    updatedAvatar.position[0],
    updatedAvatar.position[1] + 1.4,
    updatedAvatar.position[2]
  ];
  const hitDist = computeCameraObstacleHitDistance(
    pivot,
    prevCam.yaw,
    prevCam.pitch,
    prevCam.targetDistance
  );

  const camOut = cameraController.step({
    targetPosition: updatedAvatar.position,
    lookDeltaX: snapshot.lookDeltaX,
    lookDeltaY: snapshot.lookDeltaY,
    zoomDelta: snapshot.zoomDelta,
    sensitivity: storeState.settings.cameraSensitivity,
    invertY: storeState.settings.invertCameraY,
    obstacleHitDistance: hitDist,
    deltaTime: dt
  });

  mutableRuntimeState.camera = {
    yaw: camOut.yaw,
    pitch: camOut.pitch,
    targetDistance: camOut.targetDistance,
    effectiveDistance: camOut.effectiveDistance,
    pivotOffset: [0, 1.4, 0]
  };
  mutableRuntimeState.cameraPosition = camOut.cameraPosition;
  mutableRuntimeState.cameraLookAt = camOut.lookAtTarget;
  mutableRuntimeState.frameCount += 1;
  mutableRuntimeState.lastDeltaTime = dt;

  // 4. Evaluate Proximity Interactions (FR-016 - FR-018)
  const evalResult = interactionSystem.evaluate(
    updatedAvatar.position,
    updatedAvatar.facingYaw
  );
  storeState.setFocusedObject(evalResult.focusedObject);

  // Auto-dismiss info plaque modal if player walks outside interaction radius
  if (
    storeState.activePlaqueModal &&
    evalResult.focusedObject?.id !== storeState.activePlaqueModal.id
  ) {
    storeState.closePlaqueModal();
  }

  // Trigger interaction when E or mobile Interact button is pressed
  if (snapshot.interactPressed && evalResult.focusedObject) {
    const triggered = interactionSystem.trigger(evalResult.focusedObject.id);
    if (triggered) {
      if (triggered.archetype === 'info_plaque') {
        if (storeState.activePlaqueModal?.id === triggered.descriptor.id) {
          storeState.closePlaqueModal();
        } else {
          inputController.resetAll();
          storeState.openPlaqueModal(triggered.descriptor);
        }
      } else if (triggered.archetype === 'world_prop') {
        storeState.togglePropState(triggered.descriptor.id);
      }
    }
  }
}

export const GameLoopController: React.FC<GameLoopControllerProps> = (props) => {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__ONLINE_ZOO_RUNTIME__ = {
        ...props,
        gameStore,
        mutableRuntimeState,
        stepFrames: (frames = 1, dt = 1 / 60) => {
          for (let i = 0; i < frames; i++) {
            stepGameRuntimeTick(dt, props);
          }
        }
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).__ONLINE_ZOO_RUNTIME__;
      }
    };
  }, [props]);

  useFrame((_, delta) => {
    stepGameRuntimeTick(delta, props);
  });

  return null;
};

