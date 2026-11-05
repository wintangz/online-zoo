import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { useStore } from 'zustand';
import * as THREE from 'three';
import { getAssetUrl } from '@online-zoo/game-assets';
import {
  findGateLinkByObjectId,
  gameStore,
  MultiplayerClient,
  PANDA_FOREST_INTERACTIVE_OBJECTS
} from '@online-zoo/game-core';
import { PALETTE_COLORS, PALETTE_MATERIALS } from '../materials/paletteMaterials';

export interface InteractivePropsProps {
  multiplayerClient?: MultiplayerClient;
}

export const InteractiveProps: React.FC<InteractivePropsProps> = ({ multiplayerClient }) => {
  const focusedObject = useStore(gameStore, (s) => s.focusedObject);
  const propStates = useStore(gameStore, (s) => s.propStates);
  const seatStates = useStore(gameStore, (s) => s.social.seatStates);

  // Load real .glb assets through useGLTF from ASSET_MANIFEST
  const plaqueGltf = useGLTF(getAssetUrl('prop-habitat-plaque'));
  const lanternGltf = useGLTF(getAssetUrl('prop-stone-lantern'));
  const chimeGltf = useGLTF(getAssetUrl('prop-wind-chime'));
  const benchGltf = useGLTF(getAssetUrl('prop-wooden-bench'));
  const foodStallGltf = useGLTF(getAssetUrl('prop-food-stall'));
  const cafeTableGltf = useGLTF(getAssetUrl('prop-cafe-table'));
  const picnicTableGltf = useGLTF(getAssetUrl('prop-picnic-table'));

  const chimeGroupRef = useRef<THREE.Group>(null);
  const targetRingRef = useRef<THREE.Mesh>(null);

  const lanternActive = propStates['prop-stone-lantern']?.active ?? true;
  const chimeState = propStates['prop-wind-chime'];

  const handlePropClick = (objectId: string) => {
    const st = gameStore.getState();
    if (st.phase !== 'playing' || st.focusedObject?.id !== objectId) return;
    const obj = st.focusedObject;
    if (obj.propReactionType === 'enter_zone_gate') {
      const gateLink = findGateLinkByObjectId(st.currentZoneId, obj.id);
      if (gateLink) {
        multiplayerClient?.switchZoneViaGate(gateLink);
      }
    } else if (obj.archetype === 'info_plaque') {
      st.openPlaqueModal(obj);
    } else if (obj.propReactionType === 'open_food_stall') {
      st.openFoodStall(obj.id);
    } else if (obj.seats && obj.seats.length > 0) {
      const isSeatedHere = st.social.localSeatedState?.objectId === obj.id;
      multiplayerClient?.sendSeatInteraction(obj.id, isSeatedHere ? 'stand' : 'sit');
    } else if (obj.archetype === 'world_prop') {
      st.togglePropState(obj.id);
      multiplayerClient?.sendPropInteraction(obj.id);
    }
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (chimeGroupRef.current) {
      const elapsedSinceRing = chimeState?.lastTriggeredAt
        ? (Date.now() - chimeState.lastTriggeredAt) / 1000
        : 999;
      const swayAmplitude = elapsedSinceRing < 4.0 ? 0.26 * Math.exp(-elapsedSinceRing * 0.5) : 0.03;
      chimeGroupRef.current.rotation.z = Math.sin(t * 6.0) * swayAmplitude;
    }

    if (targetRingRef.current && focusedObject) {
      targetRingRef.current.position.set(
        focusedObject.position[0],
        2.35 + Math.sin(t * 4.0) * 0.12,
        focusedObject.position[2]
      );
      targetRingRef.current.rotation.y = t * 1.8;
    }
  });

  const scenicBenchSeats = seatStates['prop-scenic-bench'] ?? [];
  const plazaBenchSeats = seatStates['prop-plaza-bench'] ?? [];
  const pondChairSeats = seatStates['prop-pond-chair'] ?? [];
  const plazaCafeTableSeats = seatStates['prop-plaza-cafe-table'] ?? [];
  const bambooPicnicTableSeats = seatStates['prop-bamboo-picnic-table'] ?? [];

  const obj0 = PANDA_FOREST_INTERACTIVE_OBJECTS[0] ?? {
    id: 'plaque-panda-habitat',
    position: [-2.8, 0, -2.2] as [number, number, number]
  };
  const obj1 = PANDA_FOREST_INTERACTIVE_OBJECTS[1] ?? {
    id: 'plaque-lotus-pond',
    position: [7.6, 0, -1.5] as [number, number, number]
  };
  const obj2 = PANDA_FOREST_INTERACTIVE_OBJECTS[2] ?? {
    id: 'prop-stone-lantern',
    position: [4.2, 0, 5.2] as [number, number, number]
  };
  const obj3 = PANDA_FOREST_INTERACTIVE_OBJECTS[3] ?? {
    id: 'prop-bamboo-chime',
    position: [-5.5, 0, 6.2] as [number, number, number]
  };
  const obj4 = PANDA_FOREST_INTERACTIVE_OBJECTS[4] ?? {
    id: 'prop-scenic-bench',
    position: [-6.8, 0, 0.8] as [number, number, number]
  };
  const obj5 = PANDA_FOREST_INTERACTIVE_OBJECTS[5] ?? {
    id: 'prop-plaza-bench',
    position: [-3.2, 0, 14.5] as [number, number, number]
  };
  const obj6 = PANDA_FOREST_INTERACTIVE_OBJECTS[6] ?? {
    id: 'prop-pond-chair',
    position: [5.4, 0, -0.2] as [number, number, number]
  };
  const plazaFoodStallObj = PANDA_FOREST_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'prop-plaza-food-stall'
  ) ?? {
    id: 'prop-plaza-food-stall',
    position: [-6.8, 0, 12.2] as [number, number, number]
  };
  const bambooTeaStallObj = PANDA_FOREST_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'prop-bamboo-tea-stall'
  ) ?? {
    id: 'prop-bamboo-tea-stall',
    position: [10.8, 0, 5.2] as [number, number, number]
  };
  const plazaCafeTableObj = PANDA_FOREST_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'prop-plaza-cafe-table'
  ) ?? {
    id: 'prop-plaza-cafe-table',
    position: [-3.8, 0, 12.6] as [number, number, number]
  };
  const bambooPicnicTableObj = PANDA_FOREST_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'prop-bamboo-picnic-table'
  ) ?? {
    id: 'prop-bamboo-picnic-table',
    position: [10.8, 0, 0.8] as [number, number, number]
  };
  const southGateToLobbyObj = PANDA_FOREST_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'gate-to-zoo-lobby'
  ) ?? {
    id: 'gate-to-zoo-lobby',
    position: [0, 0, 16.4] as [number, number, number]
  };

  return (
    <group name="panda-forest-interactive-props">
      {/* Solid Rapier Colliders for interactive signs, plaques, lantern, chime pavilion, and benches/chairs */}
      <RigidBody type="fixed" colliders={false} name="interactive-props-colliders">
        <CylinderCollider
          args={[1.0, 0.55]}
          position={[obj0.position[0], 1.0, obj0.position[2]]}
        />
        <CylinderCollider
          args={[1.0, 0.55]}
          position={[obj1.position[0], 1.0, obj1.position[2]]}
        />
        <CylinderCollider
          args={[1.1, 0.55]}
          position={[obj2.position[0], 1.1, obj2.position[2]]}
        />
        <CylinderCollider
          args={[1.4, 0.75]}
          position={[obj3.position[0], 1.4, obj3.position[2]]}
        />
        <CuboidCollider
          args={[0.5, 0.7, 0.35]}
          position={[obj4.position[0], 0.7, obj4.position[2]]}
          rotation={[0, 0.25, 0]}
        />
        <CuboidCollider
          args={[0.5, 0.7, 0.35]}
          position={[obj5.position[0], 0.7, obj5.position[2]]}
          rotation={[0, 0.15, 0]}
        />
        <CylinderCollider
          args={[0.65, 0.45]}
          position={[obj6.position[0], 0.65, obj6.position[2]]}
        />
        <CylinderCollider
          args={[1.4, 0.9]}
          position={[plazaFoodStallObj.position[0], 1.4, plazaFoodStallObj.position[2]]}
        />
        <CylinderCollider
          args={[1.4, 0.9]}
          position={[bambooTeaStallObj.position[0], 1.4, bambooTeaStallObj.position[2]]}
        />
        <CylinderCollider
          args={[0.7, 0.45]}
          position={[plazaCafeTableObj.position[0], 0.7, plazaCafeTableObj.position[2]]}
        />
        <CylinderCollider
          args={[0.7, 0.45]}
          position={[bambooPicnicTableObj.position[0], 0.7, bambooPicnicTableObj.position[2]]}
        />
      </RigidBody>

      {/* 1. Giant Panda Habitat Info Plaque */}
      <group
        position={obj0.position}
        rotation={[0, -0.35, 0]}
        onClick={() => handlePropClick(obj0.id)}
      >
        <primitive object={plaqueGltf.scene.clone()} />
      </group>

      {/* 2. Lotus Pond Ecology Info Sign */}
      <group
        position={obj1.position}
        rotation={[0, 0.65, 0]}
        onClick={() => handlePropClick(obj1.id)}
      >
        <primitive object={plaqueGltf.scene.clone()} />
      </group>

      {/* 3. Stone Garden Lantern */}
      <group
        position={obj2.position}
        onClick={() => handlePropClick(obj2.id)}
      >
        <primitive object={lanternGltf.scene.clone()} />
        <mesh
          position={[0, 1.6, 0]}
          material={
            lanternActive
              ? PALETTE_MATERIALS.lanternLit
              : PALETTE_MATERIALS.lanternUnlit
          }
        >
          <dodecahedronGeometry args={[0.26, 0]} />
        </mesh>
        {lanternActive && (
          <pointLight
            position={[0, 1.7, 0]}
            color={PALETTE_COLORS.lanternAmber}
            intensity={4.5}
            distance={9}
          />
        )}
      </group>

      {/* 4. Bamboo Wind Chime Pavilion */}
      <group
        position={obj3.position}
        rotation={[0, -0.5, 0]}
        onClick={() => handlePropClick(obj3.id)}
      >
        <group ref={chimeGroupRef}>
          <primitive object={chimeGltf.scene.clone()} />
        </group>
      </group>

      {/* 5. Scenic Overlook Bench */}
      <group
        position={obj4.position}
        rotation={[0, 0.25, 0]}
        onClick={() => handlePropClick(obj4.id)}
      >
        <primitive object={benchGltf.scene.clone()} />
        {scenicBenchSeats.map((slot, idx) => (
          <mesh
            key={slot.seatIndex}
            position={[idx === 0 ? -0.42 : 0.42, 0.62, 0]}
            material={
              slot.occupiedBySessionId
                ? PALETTE_MATERIALS.seatOccupied
                : PALETTE_MATERIALS.seatAvailable
            }
          >
            <boxGeometry args={[0.62, 0.06, 0.45]} />
          </mesh>
        ))}
      </group>

      {/* 6. Entry Plaza Bamboo Bench */}
      <group
        position={obj5.position}
        rotation={[0, 0.15, 0]}
        onClick={() => handlePropClick(obj5.id)}
      >
        <primitive object={benchGltf.scene.clone()} />
        {plazaBenchSeats.map((slot, idx) => (
          <mesh
            key={slot.seatIndex}
            position={[idx === 0 ? -0.42 : 0.42, 0.62, 0]}
            material={
              slot.occupiedBySessionId
                ? PALETTE_MATERIALS.seatOccupied
                : PALETTE_MATERIALS.seatAvailable
            }
          >
            <boxGeometry args={[0.62, 0.06, 0.45]} />
          </mesh>
        ))}
      </group>

      {/* 7. Lotus Pond Viewing Chair */}
      <group
        position={obj6.position}
        rotation={[0, -0.45, 0]}
        onClick={() => handlePropClick(obj6.id)}
      >
        <group scale={[0.6, 1.0, 0.9]}>
          <primitive object={benchGltf.scene.clone()} />
        </group>
        {pondChairSeats.map((slot) => (
          <mesh
            key={slot.seatIndex}
            position={[0, 0.62, 0]}
            material={
              slot.occupiedBySessionId
                ? PALETTE_MATERIALS.seatOccupied
                : PALETTE_MATERIALS.seatAvailable
            }
          >
            <boxGeometry args={[0.55, 0.06, 0.45]} />
          </mesh>
        ))}
      </group>

      {/* 8. Plaza Refreshment Kiosk (Registered GLB prop-food-stall) */}
      <group
        name="prop-plaza-food-stall"
        position={plazaFoodStallObj.position}
        rotation={[0, 0.35, 0]}
        onClick={() => handlePropClick(plazaFoodStallObj.id)}
      >
        <primitive object={foodStallGltf.scene.clone()} />
        <pointLight
          position={[0, 2.0, 0.4]}
          color={PALETTE_COLORS.sunflowerGold}
          intensity={2.2}
          distance={6}
        />
      </group>

      {/* 9. Bamboo Tea & Snack Stall (Registered GLB prop-food-stall) */}
      <group
        name="prop-bamboo-tea-stall"
        position={bambooTeaStallObj.position}
        rotation={[0, -0.65, 0]}
        onClick={() => handlePropClick(bambooTeaStallObj.id)}
      >
        <primitive object={foodStallGltf.scene.clone()} />
        <pointLight
          position={[0, 2.0, 0.4]}
          color={PALETTE_COLORS.sunflowerGold}
          intensity={2.2}
          distance={6}
        />
      </group>

      {/* 10. Plaza Umbrella Dining Table (Registered GLB prop-cafe-table) */}
      <group
        name="prop-plaza-cafe-table"
        position={plazaCafeTableObj.position}
        onClick={() => handlePropClick(plazaCafeTableObj.id)}
      >
        <primitive object={cafeTableGltf.scene.clone()} />
        {plazaCafeTableSeats.map((slot) => {
          const offsetX = slot.worldPosition[0] - plazaCafeTableObj.position[0];
          const offsetZ = slot.worldPosition[2] - plazaCafeTableObj.position[2];
          return (
            <group key={slot.seatIndex} position={[offsetX, 0, offsetZ]}>
              <mesh
                position={[0, 0.56, 0]}
                material={
                  slot.occupiedBySessionId
                    ? PALETTE_MATERIALS.seatOccupied
                    : PALETTE_MATERIALS.seatAvailable
                }
              >
                <cylinderGeometry args={[0.25, 0.25, 0.05, 8]} />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* 11. Bamboo Grove Picnic Table (Registered GLB prop-picnic-table) */}
      <group
        name="prop-bamboo-picnic-table"
        position={bambooPicnicTableObj.position}
        onClick={() => handlePropClick(bambooPicnicTableObj.id)}
      >
        <primitive object={picnicTableGltf.scene.clone()} />
        {bambooPicnicTableSeats.map((slot) => {
          const offsetX = slot.worldPosition[0] - bambooPicnicTableObj.position[0];
          const offsetZ = slot.worldPosition[2] - bambooPicnicTableObj.position[2];
          return (
            <mesh
              key={slot.seatIndex}
              position={[offsetX, 0.52, offsetZ]}
              material={
                slot.occupiedBySessionId
                  ? PALETTE_MATERIALS.seatOccupied
                  : PALETTE_MATERIALS.seatAvailable
              }
            >
              <boxGeometry args={[0.36, 0.05, 0.52]} />
            </mesh>
          );
        })}
      </group>

      {/* 12. South Return Gate Portal to Zoo Lobby */}
      <group
        name="gate-to-zoo-lobby"
        position={southGateToLobbyObj.position}
        onClick={() => handlePropClick(southGateToLobbyObj.id)}
      >
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0]}
          material={PALETTE_MATERIALS.portalRing}
        >
          <ringGeometry args={[1.35, 2.05, 16]} />
        </mesh>
      </group>

      {/* Floating Highlight Beacon over the Currently Targeted Interactive Object */}
      {focusedObject && (
        <mesh
          ref={targetRingRef}
          position={[focusedObject.position[0], 2.35, focusedObject.position[2]]}
          material={PALETTE_MATERIALS.focusBeacon}
        >
          <octahedronGeometry args={[0.24, 0]} />
        </mesh>
      )}
    </group>
  );
};
