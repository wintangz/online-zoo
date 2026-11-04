import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from 'zustand';
import * as THREE from 'three';
import {
  ANIMAL_SPECIES_CATALOG,
  gameStore,
  mutableRuntimeState,
  ZOO_HABITAT_ZONES,
  type AnimalInstanceState
} from '@online-zoo/game-core';

const PandaModel: React.FC<{ isEating: boolean }> = ({ isEating }) => (
  <group name="panda-mesh-rig">
    {/* Chubby White Torso */}
    <mesh position={[0, 0.52, 0]} castShadow>
      <sphereGeometry args={[0.46, 16, 16]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.85} />
    </mesh>
    {/* Black Shoulder Saddle Band */}
    <mesh position={[0, 0.62, 0.14]} scale={[1.04, 0.72, 0.7]} castShadow>
      <sphereGeometry args={[0.45, 16, 14]} />
      <meshStandardMaterial color="#1e293b" roughness={0.9} />
    </mesh>
    {/* Round Panda Head */}
    <group position={[0, 0.92, 0.36]}>
      <mesh castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.85} />
      </mesh>
      {/* Black Ears */}
      <mesh position={[-0.22, 0.25, -0.04]} castShadow>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      <mesh position={[0.22, 0.25, -0.04]} castShadow>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </mesh>
      {/* Black Eye Patches */}
      <mesh position={[-0.11, 0.05, 0.27]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      <mesh position={[0.11, 0.05, 0.27]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* Snout & Nose */}
      <mesh position={[0, -0.04, 0.29]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial color="#f1f5f9" />
      </mesh>
      <mesh position={[0, -0.01, 0.37]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
    </group>
    {/* Four Black Limbs */}
    <mesh position={[-0.26, 0.2, 0.24]} castShadow>
      <cylinderGeometry args={[0.12, 0.13, 0.38, 10]} />
      <meshStandardMaterial color="#0f172a" roughness={0.9} />
    </mesh>
    <mesh position={[0.26, 0.2, 0.24]} castShadow>
      <cylinderGeometry args={[0.12, 0.13, 0.38, 10]} />
      <meshStandardMaterial color="#0f172a" roughness={0.9} />
    </mesh>
    <mesh position={[-0.26, 0.2, -0.22]} castShadow>
      <cylinderGeometry args={[0.12, 0.13, 0.38, 10]} />
      <meshStandardMaterial color="#0f172a" roughness={0.9} />
    </mesh>
    <mesh position={[0.26, 0.2, -0.22]} castShadow>
      <cylinderGeometry args={[0.12, 0.13, 0.38, 10]} />
      <meshStandardMaterial color="#0f172a" roughness={0.9} />
    </mesh>
    {/* Held Bamboo Stalk when Eating */}
    {isEating && (
      <mesh position={[0.18, 0.65, 0.56]} rotation={[0.4, 0, -0.5]}>
        <cylinderGeometry args={[0.035, 0.035, 0.75, 8]} />
        <meshStandardMaterial color="#4ade80" emissive="#16a34a" emissiveIntensity={0.25} />
      </mesh>
    )}
  </group>
);

const PenguinModel: React.FC = () => (
  <group name="penguin-mesh-rig">
    {/* Dark Slate Dorsal Body */}
    <mesh position={[0, 0.44, 0]} scale={[0.85, 1.25, 0.8]} castShadow>
      <sphereGeometry args={[0.26, 14, 14]} />
      <meshStandardMaterial color="#1e293b" roughness={0.7} />
    </mesh>
    {/* White Belly Patch */}
    <mesh position={[0, 0.42, 0.08]} scale={[0.7, 1.1, 0.68]}>
      <sphereGeometry args={[0.24, 14, 14]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.8} />
    </mesh>
    {/* Head */}
    <group position={[0, 0.78, 0.04]}>
      <mesh castShadow>
        <sphereGeometry args={[0.18, 14, 14]} />
        <meshStandardMaterial color="#0f172a" roughness={0.75} />
      </mesh>
      {/* Beak */}
      <mesh position={[0, -0.02, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.055, 0.16, 10]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.6} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.07, 0.04, 0.15]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.07, 0.04, 0.15]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
    {/* Side Flippers */}
    <mesh position={[-0.24, 0.44, 0]} rotation={[0, 0, 0.22]} scale={[0.25, 0.9, 0.45]}>
      <sphereGeometry args={[0.22, 10, 10]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    <mesh position={[0.24, 0.44, 0]} rotation={[0, 0, -0.22]} scale={[0.25, 0.9, 0.45]}>
      <sphereGeometry args={[0.22, 10, 10]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    {/* Webbed Orange Feet */}
    <mesh position={[-0.09, 0.05, 0.08]}>
      <boxGeometry args={[0.1, 0.05, 0.18]} />
      <meshStandardMaterial color="#f97316" />
    </mesh>
    <mesh position={[0.09, 0.05, 0.08]}>
      <boxGeometry args={[0.1, 0.05, 0.18]} />
      <meshStandardMaterial color="#f97316" />
    </mesh>
  </group>
);

const OtterModel: React.FC<{ isFloatingOrEating: boolean }> = ({ isFloatingOrEating }) => (
  <group name="otter-mesh-rig">
    {/* Sleek Streamlined Chestnut Torso */}
    <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.85, 1.35, 0.75]} castShadow>
      <capsuleGeometry args={[0.16, 0.36, 8, 12]} />
      <meshStandardMaterial color="#78350f" roughness={0.75} />
    </mesh>
    {/* Cream Belly / Throat Patch */}
    <mesh position={[0, 0.21, 0.06]} rotation={[Math.PI / 2, 0, 0]} scale={[0.7, 1.2, 0.6]}>
      <capsuleGeometry args={[0.14, 0.32, 8, 10]} />
      <meshStandardMaterial color="#fde68a" roughness={0.85} />
    </mesh>
    {/* Head & Whiskered Snout */}
    <group position={[0, 0.34, 0.36]}>
      <mesh castShadow>
        <sphereGeometry args={[0.16, 12, 12]} />
        <meshStandardMaterial color="#92400e" roughness={0.75} />
      </mesh>
      <mesh position={[0, -0.02, 0.14]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshStandardMaterial color="#fef3c7" />
      </mesh>
      <mesh position={[0, 0.01, 0.2]}>
        <sphereGeometry args={[0.03, 8, 8]} />
        <meshStandardMaterial color="#1c1917" />
      </mesh>
    </group>
    {/* Tapered Swimming Tail */}
    <mesh position={[0, 0.18, -0.42]} rotation={[-Math.PI / 2.3, 0, 0]}>
      <coneGeometry args={[0.09, 0.42, 10]} />
      <meshStandardMaterial color="#78350f" roughness={0.8} />
    </mesh>
    {/* Clam / Pebble Prop on Chest when Back-Floating or Eating */}
    {isFloatingOrEating && (
      <mesh position={[0, 0.38, 0.12]}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.4} />
      </mesh>
    )}
  </group>
);

const SingleAnimalEntity: React.FC<{
  animal: AnimalInstanceState;
  index: number;
  isInspected: boolean;
}> = ({ animal, index, isInspected }) => {
  const rootRef = useRef<THREE.Group>(null);
  const rigRef = useRef<THREE.Group>(null);
  const catalog = ANIMAL_SPECIES_CATALOG[animal.speciesId];

  useFrame(({ clock }) => {
    const liveAnimals = mutableRuntimeState.animalSimulation.getAnimals();
    const live = liveAnimals.find((a) => a.animalId === animal.animalId) ?? animal;
    const t = clock.getElapsedTime() + index * 1.37;

    if (rootRef.current) {
      rootRef.current.position.lerp(
        new THREE.Vector3(live.position[0], live.position[1], live.position[2]),
        0.22
      );
      // Smoothly interpolate yaw
      const currentY = rootRef.current.rotation.y;
      let diff = live.rotationY - currentY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rootRef.current.rotation.y = currentY + diff * 0.18;
    }

    if (rigRef.current) {
      // Reset base transforms before applying behavior animation
      rigRef.current.position.set(0, 0, 0);
      rigRef.current.rotation.set(0, 0, 0);
      rigRef.current.scale.set(1, 1, 1);

      if (live.speciesId === 'panda') {
        if (live.behaviorState === 'Playing' || live.activityVariant === 'bamboo-roll') {
          rigRef.current.position.y = 0.42;
          rigRef.current.rotation.x = t * 4.2;
        } else if (live.behaviorState === 'Sleeping') {
          rigRef.current.position.y = -0.14;
          rigRef.current.rotation.z = 0.45;
          const breath = 1 + Math.sin(t * 2.2) * 0.04;
          rigRef.current.scale.set(breath, 0.82, breath);
        } else if (live.behaviorState === 'Resting' || live.behaviorState === 'Eating') {
          rigRef.current.position.y = -0.06;
          rigRef.current.rotation.x = -0.2 + Math.sin(t * 5.0) * 0.06;
        } else if (live.behaviorState === 'Walking') {
          rigRef.current.position.y = Math.abs(Math.sin(t * 5.5)) * 0.08;
          rigRef.current.rotation.z = Math.sin(t * 5.5) * 0.08;
        }
      } else if (live.speciesId === 'penguin') {
        if (live.behaviorState === 'Swimming') {
          rigRef.current.position.y = -0.12 + Math.sin(t * 4.0) * 0.04;
          rigRef.current.rotation.x = Math.PI / 2.4;
          rigRef.current.rotation.z = Math.sin(t * 6.0) * 0.1;
        } else if (live.behaviorState === 'Playing' || live.activityVariant === 'belly-slide') {
          rigRef.current.position.y = -0.15;
          rigRef.current.rotation.x = Math.PI / 2.1;
        } else if (live.behaviorState === 'Walking') {
          rigRef.current.position.y = Math.abs(Math.sin(t * 7.5)) * 0.06;
          rigRef.current.rotation.z = Math.sin(t * 7.5) * 0.16;
        } else {
          rigRef.current.rotation.y = Math.sin(t * 2.0) * 0.12;
        }
      } else if (live.speciesId === 'otter') {
        if (live.behaviorState === 'Playing' || live.activityVariant === 'back-float') {
          rigRef.current.position.y = -0.05 + Math.sin(t * 3.2) * 0.03;
          rigRef.current.rotation.z = Math.PI;
          rigRef.current.rotation.x = Math.sin(t * 2.5) * 0.08;
        } else if (live.behaviorState === 'Swimming') {
          rigRef.current.position.y = -0.08 + Math.sin(t * 5.0) * 0.04;
          rigRef.current.rotation.y = Math.sin(t * 6.5) * 0.14;
        } else if (live.behaviorState === 'Walking') {
          rigRef.current.position.y = Math.abs(Math.sin(t * 8.0)) * 0.09;
          rigRef.current.rotation.x = Math.sin(t * 8.0) * 0.12;
        }
      }
    }
  });

  return (
    <group
      ref={rootRef}
      name={`zoo-animal-${animal.animalId}`}
      position={animal.position}
      rotation={[0, animal.rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        gameStore.getState().inspectAnimal(animal.animalId);
      }}
    >
      <group ref={rigRef}>
        {animal.speciesId === 'panda' && (
          <PandaModel isEating={animal.behaviorState === 'Eating'} />
        )}
        {animal.speciesId === 'penguin' && <PenguinModel />}
        {animal.speciesId === 'otter' && (
          <OtterModel
            isFloatingOrEating={
              animal.behaviorState === 'Eating' || animal.activityVariant === 'back-float'
            }
          />
        )}
      </group>

      {/* Highlight Ring when Inspected */}
      {isInspected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.68, 0.85, 24]} />
          <meshBasicMaterial color={catalog.accentColor} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floating Animal Name & Behavior Tag */}
      <Html position={[0, 1.55, 0]} center distanceFactor={14} zIndexRange={[10, 0]}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            gameStore.getState().inspectAnimal(animal.animalId);
          }}
          className="pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-slate-950/80 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-md backdrop-blur-sm transition hover:border-emerald-300/60 hover:bg-slate-900"
        >
          <span>{catalog.badgeIcon}</span>
          <span>{animal.displayName}</span>
          <span
            className="rounded-full px-1.5 py-0.2 text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${catalog.accentColor}33`,
              color: catalog.accentColor
            }}
          >
            {animal.behaviorState}
          </span>
        </button>
      </Html>
    </group>
  );
};

export const ZooAnimalsLayer: React.FC = () => {
  const animals = useStore(gameStore, (s) => s.animalSim.animals);
  const habitatFeedings = useStore(gameStore, (s) => s.animalSim.habitatFeedings);
  const inspectedAnimalId = useStore(gameStore, (s) => s.animalSim.inspectedAnimalId);

  const pandaHabitat = ZOO_HABITAT_ZONES['habitat-panda-grove'];
  const penguinHabitat = ZOO_HABITAT_ZONES['habitat-penguin-cove'];
  const otterHabitat = ZOO_HABITAT_ZONES['habitat-otter-stream'];

  const pandaFeeding = habitatFeedings['habitat-panda-grove'];
  const penguinFeeding = habitatFeedings['habitat-penguin-cove'];
  const otterFeeding = habitatFeedings['habitat-otter-stream'];

  return (
    <group name="zoo-animals-and-habitats-layer">
      {/* 1. Panda Habitat Sanctuary Ground Ring & Bamboo Feeding Trough */}
      <group name="habitat-panda-grove-props">
        <mesh
          position={[pandaHabitat.center[0], 0.015, pandaHabitat.center[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[pandaHabitat.radius, 32]} />
          <meshStandardMaterial color="#2f6e41" roughness={0.95} />
        </mesh>
        {/* Panda Feeding Station */}
        <group position={pandaHabitat.feedingStationPosition}>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.72, 0.42, 12]} />
            <meshStandardMaterial color="#78350f" roughness={0.9} />
          </mesh>
          {pandaFeeding?.isActive && (
            <group position={[0, 0.5, 0]}>
              <mesh position={[-0.18, 0.15, 0]} rotation={[0.2, 0, 0.3]}>
                <cylinderGeometry args={[0.06, 0.06, 0.85, 8]} />
                <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.6} />
              </mesh>
              <mesh position={[0.18, 0.15, 0.1]} rotation={[-0.2, 0, -0.25]}>
                <cylinderGeometry args={[0.06, 0.06, 0.85, 8]} />
                <meshStandardMaterial color="#4ade80" emissive="#22c55e" emissiveIntensity={0.6} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* 2. Penguin Cove Coastal Pool & Fish Feeder */}
      <group name="habitat-penguin-cove-props">
        <mesh
          position={[penguinHabitat.center[0], 0.015, penguinHabitat.center[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
        >
          <circleGeometry args={[penguinHabitat.radius, 32]} />
          <meshStandardMaterial color="#64748b" roughness={0.85} />
        </mesh>
        {penguinHabitat.waterCenter && penguinHabitat.waterRadius && (
          <mesh
            position={[penguinHabitat.waterCenter[0], 0.03, penguinHabitat.waterCenter[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[penguinHabitat.waterRadius, 28]} />
            <meshStandardMaterial
              color="#0284c7"
              emissive="#0369a1"
              emissiveIntensity={0.25}
              roughness={0.25}
            />
          </mesh>
        )}
        {/* Penguin Fish Bucket Feeder */}
        <group position={penguinHabitat.feedingStationPosition}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.38, 0.5, 12]} />
            <meshStandardMaterial color="#0284c7" roughness={0.6} />
          </mesh>
          {penguinFeeding?.isActive && (
            <group position={[0, 0.58, 0]}>
              <mesh position={[-0.12, 0, 0]} rotation={[0, 0.3, Math.PI / 2]}>
                <coneGeometry args={[0.1, 0.38, 8]} />
                <meshStandardMaterial color="#e2e8f0" emissive="#38bdf8" emissiveIntensity={0.7} />
              </mesh>
              <mesh position={[0.14, 0.05, 0.08]} rotation={[0, -0.4, Math.PI / 2]}>
                <coneGeometry args={[0.1, 0.38, 8]} />
                <meshStandardMaterial color="#e2e8f0" emissive="#38bdf8" emissiveIntensity={0.7} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* 3. Otter Stream Forage Basket */}
      <group name="habitat-otter-stream-props">
        <group position={otterHabitat.feedingStationPosition}>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.42, 0.36, 12]} />
            <meshStandardMaterial color="#92400e" roughness={0.85} />
          </mesh>
          {otterFeeding?.isActive && (
            <group position={[0, 0.45, 0]}>
              <mesh position={[-0.1, 0, 0]}>
                <sphereGeometry args={[0.12, 10, 10]} />
                <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.65} />
              </mesh>
              <mesh position={[0.12, 0.02, 0.08]}>
                <sphereGeometry args={[0.12, 10, 10]} />
                <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.65} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* Render All 7 Individual Zoo Animals */}
      {animals.map((animal, idx) => (
        <SingleAnimalEntity
          key={animal.animalId}
          animal={animal}
          index={idx}
          isInspected={inspectedAnimalId === animal.animalId}
        />
      ))}
    </group>
  );
};

