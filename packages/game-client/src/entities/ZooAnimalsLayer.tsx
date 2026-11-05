import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { useStore } from 'zustand';
import * as THREE from 'three';
import { getAnimalAssetId, getAssetUrl } from '@online-zoo/game-assets';
import {
  ANIMAL_SPECIES_CATALOG,
  gameStore,
  mutableRuntimeState,
  ZOO_HABITAT_ZONES,
  type AnimalInstanceState,
  type AnimalSpeciesId
} from '@online-zoo/game-core';
import { PALETTE_COLORS, PALETTE_MATERIALS } from '../materials/paletteMaterials';

const AnimalGlbRig: React.FC<{ speciesId: AnimalSpeciesId }> = ({ speciesId }) => {
  const assetId = getAnimalAssetId(speciesId);
  const gltf = useGLTF(getAssetUrl(assetId));
  const clonedScene = useMemo(() => gltf.scene.clone(), [gltf.scene]);

  return (
    <group name={`${speciesId}-mesh-rig`}>
      <primitive object={clonedScene} />
    </group>
  );
};

const SingleAnimalEntity: React.FC<{
  animal: AnimalInstanceState;
  index: number;
  isInspected: boolean;
  isDevDebugOpen: boolean;
}> = ({ animal, index, isInspected, isDevDebugOpen }) => {
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
      const currentY = rootRef.current.rotation.y;
      let diff = live.rotationY - currentY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rootRef.current.rotation.y = currentY + diff * 0.18;
    }

    if (rigRef.current) {
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
        <AnimalGlbRig speciesId={animal.speciesId} />
      </group>

      {/* Highlight Ring when Inspected */}
      {isInspected && (
        <mesh
          position={[0, 0.05, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={PALETTE_MATERIALS.sunflowerGold}
        >
          <ringGeometry args={[0.68, 0.85, 16]} />
        </mesh>
      )}

      {/* Floating Animal Name & Behavior Tag (Dev/Debug Toggle Only) */}
      {isDevDebugOpen && (
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
                backgroundColor: PALETTE_COLORS.mossShadow,
                color: PALETTE_COLORS.sunflowerGold
              }}
            >
              {animal.behaviorState}
            </span>
          </button>
        </Html>
      )}
    </group>
  );
};

export const ZooAnimalsLayer: React.FC = () => {
  const animals = useStore(gameStore, (s) => s.animalSim.animals);
  const habitatFeedings = useStore(gameStore, (s) => s.animalSim.habitatFeedings);
  const inspectedAnimalId = useStore(gameStore, (s) => s.animalSim.inspectedAnimalId);
  const isDevDebugOpen = useStore(gameStore, (s) => s.isDevDebugOpen);

  const pandaHabitat = ZOO_HABITAT_ZONES['habitat-panda-grove'];
  const penguinHabitat = ZOO_HABITAT_ZONES['habitat-penguin-cove'];
  const otterHabitat = ZOO_HABITAT_ZONES['habitat-otter-stream'];

  const pandaFeeding = habitatFeedings['habitat-panda-grove'];
  const penguinFeeding = habitatFeedings['habitat-penguin-cove'];
  const otterFeeding = habitatFeedings['habitat-otter-stream'];

  return (
    <group name="zoo-animals-and-habitats-layer">
      {/* 1. Panda Habitat Sanctuary Ground Ring & Feeding Marker */}
      <group name="habitat-panda-grove-props">
        <mesh
          position={[pandaHabitat.center[0], 0.015, pandaHabitat.center[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          material={PALETTE_MATERIALS.mossShadow}
        >
          <circleGeometry args={[pandaHabitat.radius, 24]} />
        </mesh>
        <group position={pandaHabitat.feedingStationPosition}>
          <mesh
            position={[0, 0.04, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={
              pandaFeeding?.isActive
                ? PALETTE_MATERIALS.seatAvailable
                : PALETTE_MATERIALS.warmTimber
            }
          >
            <ringGeometry args={[0.45, 0.72, 12]} />
          </mesh>
        </group>
      </group>

      {/* 2. Penguin Cove Coastal Pool & Feeding Marker */}
      <group name="habitat-penguin-cove-props">
        <mesh
          position={[penguinHabitat.center[0], 0.015, penguinHabitat.center[2]]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow
          material={PALETTE_MATERIALS.graniteSlate}
        >
          <circleGeometry args={[penguinHabitat.radius, 24]} />
        </mesh>
        {penguinHabitat.waterCenter && penguinHabitat.waterRadius && (
          <mesh
            position={[penguinHabitat.waterCenter[0], 0.03, penguinHabitat.waterCenter[1]]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={PALETTE_MATERIALS.deepPoolWater}
          >
            <circleGeometry args={[penguinHabitat.waterRadius, 24]} />
          </mesh>
        )}
        <group position={penguinHabitat.feedingStationPosition}>
          <mesh
            position={[0, 0.04, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={
              penguinFeeding?.isActive
                ? PALETTE_MATERIALS.seatAvailable
                : PALETTE_MATERIALS.pondWater
            }
          >
            <ringGeometry args={[0.35, 0.58, 12]} />
          </mesh>
        </group>
      </group>

      {/* 3. Otter Stream Forage Marker */}
      <group name="habitat-otter-stream-props">
        <group position={otterHabitat.feedingStationPosition}>
          <mesh
            position={[0, 0.04, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            material={
              otterFeeding?.isActive
                ? PALETTE_MATERIALS.focusBeacon
                : PALETTE_MATERIALS.otterCinnamon
            }
          >
            <ringGeometry args={[0.35, 0.58, 12]} />
          </mesh>
        </group>
      </group>

      {/* Render All Zoo Animals via Registered GLB Models */}
      {animals.map((animal, idx) => (
        <SingleAnimalEntity
          key={animal.animalId}
          animal={animal}
          index={idx}
          isInspected={inspectedAnimalId === animal.animalId}
          isDevDebugOpen={isDevDebugOpen}
        />
      ))}
    </group>
  );
};
