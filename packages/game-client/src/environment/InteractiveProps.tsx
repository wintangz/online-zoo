import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { useStore } from 'zustand';
import * as THREE from 'three';
import { getAssetUrl, ZOO_PALETTE } from '@online-zoo/game-assets';
import {
  findGateLinkByObjectId,
  gameStore,
  MultiplayerClient,
  PANDA_FOREST_INTERACTIVE_OBJECTS
} from '@online-zoo/game-core';

export interface InteractivePropsProps {
  multiplayerClient?: MultiplayerClient;
}

export const InteractiveProps: React.FC<InteractivePropsProps> = ({ multiplayerClient }) => {
  const focusedObject = useStore(gameStore, (s) => s.focusedObject);
  const propStates = useStore(gameStore, (s) => s.propStates);
  const seatStates = useStore(gameStore, (s) => s.social.seatStates);

  // Load real .glb assets through useGLTF (Architecture Requirement 8)
  const plaqueGltf = useGLTF(getAssetUrl('prop-habitat-plaque'));
  const lanternGltf = useGLTF(getAssetUrl('prop-stone-lantern'));
  const chimeGltf = useGLTF(getAssetUrl('prop-wind-chime'));
  const benchGltf = useGLTF(getAssetUrl('prop-wooden-bench'));

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
    position: [0, 0, 22.8] as [number, number, number]
  };

  return (
    <group name="panda-forest-interactive-props">
      {/* Solid Rapier Colliders for interactive signs, plaques, lantern, chime pavilion, and benches/chairs (FR-023, FR-012) */}
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

      {/* 3. Stone Garden Lantern (toggle_lantern world_prop) */}
      <group
        position={obj2.position}
        onClick={() => handlePropClick(obj2.id)}
      >
        <primitive object={lanternGltf.scene.clone()} />
        <mesh position={[0, 1.6, 0]}>
          <sphereGeometry args={[0.26, 16, 16]} />
          <meshStandardMaterial
            color={lanternActive ? '#ffd54f' : '#52585c'}
            emissive={lanternActive ? '#ffab00' : '#000000'}
            emissiveIntensity={lanternActive ? 2.2 : 0}
          />
        </mesh>
        {lanternActive && (
          <pointLight position={[0, 1.7, 0]} color="#ffca58" intensity={4.5} distance={9} />
        )}
      </group>

      {/* 4. Bamboo Wind Chime Pavilion (ring_chime world_prop) */}
      <group
        position={obj3.position}
        rotation={[0, -0.5, 0]}
        onClick={() => handlePropClick(obj3.id)}
      >
        <group ref={chimeGroupRef}>
          <primitive object={chimeGltf.scene.clone()} />
        </group>
      </group>

      {/* 5. Scenic Overlook Bench (2-seat rest_bench world_prop) */}
      <group
        position={obj4.position}
        rotation={[0, 0.25, 0]}
        onClick={() => handlePropClick(obj4.id)}
      >
        <primitive object={benchGltf.scene.clone()} />
        {scenicBenchSeats.map((slot, idx) => (
          <mesh key={slot.seatIndex} position={[idx === 0 ? -0.42 : 0.42, 0.62, 0]}>
            <boxGeometry args={[0.62, 0.06, 0.45]} />
            <meshStandardMaterial
              color={slot.occupiedBySessionId ? '#f59e0b' : '#7be396'}
              emissive={slot.occupiedBySessionId ? '#d97706' : '#39b85e'}
              emissiveIntensity={slot.occupiedBySessionId ? 0.9 : 0.35}
            />
          </mesh>
        ))}
      </group>

      {/* 6. Entry Plaza Bamboo Bench (2-seat rest_bench near spawn) */}
      <group
        position={obj5.position}
        rotation={[0, 0.15, 0]}
        onClick={() => handlePropClick(obj5.id)}
      >
        <primitive object={benchGltf.scene.clone()} />
        {plazaBenchSeats.map((slot, idx) => (
          <mesh key={slot.seatIndex} position={[idx === 0 ? -0.42 : 0.42, 0.62, 0]}>
            <boxGeometry args={[0.62, 0.06, 0.45]} />
            <meshStandardMaterial
              color={slot.occupiedBySessionId ? '#f59e0b' : '#7be396'}
              emissive={slot.occupiedBySessionId ? '#d97706' : '#39b85e'}
              emissiveIntensity={slot.occupiedBySessionId ? 0.9 : 0.35}
            />
          </mesh>
        ))}
      </group>

      {/* 7. Lotus Pond Viewing Chair (1-seat rest_bench near pond) */}
      <group
        position={obj6.position}
        rotation={[0, -0.45, 0]}
        onClick={() => handlePropClick(obj6.id)}
      >
        <group scale={[0.6, 1.0, 0.9]}>
          <primitive object={benchGltf.scene.clone()} />
        </group>
        {pondChairSeats.map((slot) => (
          <mesh key={slot.seatIndex} position={[0, 0.62, 0]}>
            <boxGeometry args={[0.55, 0.06, 0.45]} />
            <meshStandardMaterial
              color={slot.occupiedBySessionId ? '#f59e0b' : '#7be396'}
              emissive={slot.occupiedBySessionId ? '#d97706' : '#39b85e'}
              emissiveIntensity={slot.occupiedBySessionId ? 0.9 : 0.35}
            />
          </mesh>
        ))}
      </group>

      {/* 8. Plaza Refreshment Kiosk (Food Stall #1 - Feature 006) */}
      <group
        name="prop-plaza-food-stall"
        position={plazaFoodStallObj.position}
        rotation={[0, 0.35, 0]}
        onClick={() => handlePropClick(plazaFoodStallObj.id)}
      >
        {/* Wooden Counter Base */}
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 1.1, 1.25]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.78} />
        </mesh>
        {/* Countertop */}
        <mesh position={[0, 1.14, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[2.05, 0.1, 1.38]} />
          <meshStandardMaterial color="#e6ccb2" roughness={0.65} />
        </mesh>
        {/* Support Posts */}
        <mesh position={[-0.85, 1.75, 0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.3, 10]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.8} />
        </mesh>
        <mesh position={[0.85, 1.75, 0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.3, 10]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.8} />
        </mesh>
        <mesh position={[-0.85, 1.75, -0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.3, 10]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.8} />
        </mesh>
        <mesh position={[0.85, 1.75, -0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.3, 10]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.8} />
        </mesh>
        {/* Striped Canopy Awning Roof */}
        <mesh position={[0, 2.48, 0]} castShadow>
          <coneGeometry args={[1.55, 0.72, 4]} />
          <meshStandardMaterial color="#10b981" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.22, 0.68]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[2.1, 0.16, 0.12]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.5} />
        </mesh>
        {/* Sample Food & Drink Props on Counter */}
        <mesh position={[-0.45, 1.32, 0.25]} castShadow>
          <cylinderGeometry args={[0.1, 0.08, 0.26, 12]} />
          <meshStandardMaterial color="#d69e66" roughness={0.5} />
        </mesh>
        <mesh position={[0, 1.28, 0.28]} castShadow>
          <sphereGeometry args={[0.14, 14, 12]} />
          <meshStandardMaterial color="#d97706" roughness={0.65} />
        </mesh>
        <mesh position={[0.45, 1.32, 0.25]} castShadow>
          <cylinderGeometry args={[0.11, 0.08, 0.24, 12]} />
          <meshStandardMaterial color="#fbbf24" roughness={0.55} />
        </mesh>
        <pointLight position={[0, 2.0, 0.4]} color="#ffe082" intensity={2.2} distance={6} />
      </group>

      {/* 9. Bamboo Tea & Snack Stall (Food Stall #2 - Feature 006) */}
      <group
        name="prop-bamboo-tea-stall"
        position={bambooTeaStallObj.position}
        rotation={[0, -0.65, 0]}
        onClick={() => handlePropClick(bambooTeaStallObj.id)}
      >
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 1.1, 1.25]} />
          <meshStandardMaterial color="#6b8e23" roughness={0.75} />
        </mesh>
        <mesh position={[0, 1.14, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[2.05, 0.1, 1.38]} />
          <meshStandardMaterial color="#f3e5ab" roughness={0.62} />
        </mesh>
        <mesh position={[-0.85, 1.75, 0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.3, 10]} />
          <meshStandardMaterial color="#4a6b18" roughness={0.75} />
        </mesh>
        <mesh position={[0.85, 1.75, 0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.3, 10]} />
          <meshStandardMaterial color="#4a6b18" roughness={0.75} />
        </mesh>
        <mesh position={[-0.85, 1.75, -0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.3, 10]} />
          <meshStandardMaterial color="#4a6b18" roughness={0.75} />
        </mesh>
        <mesh position={[0.85, 1.75, -0.5]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 1.3, 10]} />
          <meshStandardMaterial color="#4a6b18" roughness={0.75} />
        </mesh>
        <mesh position={[0, 2.48, 0]} castShadow>
          <coneGeometry args={[1.55, 0.72, 6]} />
          <meshStandardMaterial color="#d97706" roughness={0.6} />
        </mesh>
        <mesh position={[-0.4, 1.32, 0.24]} castShadow>
          <cylinderGeometry args={[0.1, 0.08, 0.28, 12]} />
          <meshStandardMaterial color="#38bdf8" roughness={0.4} />
        </mesh>
        <mesh position={[0.35, 1.32, 0.24]} castShadow>
          <coneGeometry args={[0.11, 0.28, 12]} />
          <meshStandardMaterial color="#fdf4ff" roughness={0.5} />
        </mesh>
        <pointLight position={[0, 2.0, 0.4]} color="#ffd54f" intensity={2.2} distance={6} />
      </group>

      {/* 10. Plaza Umbrella Dining Table (4-seat communal table - Feature 006) */}
      <group
        name="prop-plaza-cafe-table"
        position={plazaCafeTableObj.position}
        onClick={() => handlePropClick(plazaCafeTableObj.id)}
      >
        {/* Table Pedestal & Round Tabletop */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.26, 0.84, 14]} />
          <meshStandardMaterial color="#5c3a21" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.84, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.68, 0.68, 0.08, 22]} />
          <meshStandardMaterial color="#d2a679" roughness={0.65} />
        </mesh>
        {/* Parasol Pole & Canopy */}
        <mesh position={[0, 1.65, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 1.65, 10]} />
          <meshStandardMaterial color="#e5e7eb" roughness={0.5} />
        </mesh>
        <mesh position={[0, 2.48, 0]} castShadow>
          <coneGeometry args={[1.35, 0.48, 8]} />
          <meshStandardMaterial color="#14b8a6" roughness={0.6} />
        </mesh>
        {/* 4 Seats around the table (North, East, South, West) */}
        {plazaCafeTableSeats.map((slot) => {
          const offsetX = slot.worldPosition[0] - plazaCafeTableObj.position[0];
          const offsetZ = slot.worldPosition[2] - plazaCafeTableObj.position[2];
          return (
            <group key={slot.seatIndex} position={[offsetX, 0, offsetZ]}>
              <mesh position={[0, 0.28, 0]} castShadow>
                <cylinderGeometry args={[0.24, 0.2, 0.52, 14]} />
                <meshStandardMaterial color="#8b5a2b" roughness={0.78} />
              </mesh>
              <mesh position={[0, 0.56, 0]}>
                <cylinderGeometry args={[0.25, 0.25, 0.05, 14]} />
                <meshStandardMaterial
                  color={slot.occupiedBySessionId ? '#f59e0b' : '#7be396'}
                  emissive={slot.occupiedBySessionId ? '#d97706' : '#39b85e'}
                  emissiveIntensity={slot.occupiedBySessionId ? 0.9 : 0.35}
                />
              </mesh>
            </group>
          );
        })}
      </group>

      {/* 11. Bamboo Grove Picnic Table (4-seat communal table - Feature 006) */}
      <group
        name="prop-bamboo-picnic-table"
        position={bambooPicnicTableObj.position}
        onClick={() => handlePropClick(bambooPicnicTableObj.id)}
      >
        {/* Picnic Table Top & Legs */}
        <mesh position={[0, 0.78, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.92, 0.08, 1.65]} />
          <meshStandardMaterial color="#9c6634" roughness={0.74} />
        </mesh>
        <mesh position={[0, 0.38, -0.55]} castShadow>
          <boxGeometry args={[0.8, 0.76, 0.12]} />
          <meshStandardMaterial color="#6e4720" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.38, 0.55]} castShadow>
          <boxGeometry args={[0.8, 0.76, 0.12]} />
          <meshStandardMaterial color="#6e4720" roughness={0.8} />
        </mesh>
        {/* West & East Benches */}
        <mesh position={[-0.95, 0.46, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.08, 1.55]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.78} />
        </mesh>
        <mesh position={[0.95, 0.46, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.08, 1.55]} />
          <meshStandardMaterial color="#8b5a2b" roughness={0.78} />
        </mesh>
        {/* 4 Seat Availability Pads */}
        {bambooPicnicTableSeats.map((slot) => {
          const offsetX = slot.worldPosition[0] - bambooPicnicTableObj.position[0];
          const offsetZ = slot.worldPosition[2] - bambooPicnicTableObj.position[2];
          return (
            <mesh key={slot.seatIndex} position={[offsetX, 0.52, offsetZ]}>
              <boxGeometry args={[0.36, 0.05, 0.52]} />
              <meshStandardMaterial
                color={slot.occupiedBySessionId ? '#f59e0b' : '#7be396'}
                emissive={slot.occupiedBySessionId ? '#d97706' : '#39b85e'}
                emissiveIntensity={slot.occupiedBySessionId ? 0.9 : 0.35}
              />
            </mesh>
          );
        })}
      </group>

      {/* 12. South Return Gate Portal to Zoo Lobby (world-zones FR-004, FR-005) */}
      <group
        name="gate-to-zoo-lobby"
        position={southGateToLobbyObj.position}
        onClick={() => handlePropClick(southGateToLobbyObj.id)}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1.35, 2.05, 16]} />
          <meshStandardMaterial
            color={ZOO_PALETTE.sunflowerGold}
            emissive={ZOO_PALETTE.lanternAmber}
            emissiveIntensity={0.65}
            flatShading
          />
        </mesh>
      </group>

      {/* Floating Highlight Beacon over the Currently Targeted Interactive Object */}
      {focusedObject && (
        <mesh
          ref={targetRingRef}
          position={[focusedObject.position[0], 2.35, focusedObject.position[2]]}
        >
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial
            color="#ffe066"
            emissive="#f59f00"
            emissiveIntensity={1.4}
          />
        </mesh>
      )}
    </group>
  );
};
