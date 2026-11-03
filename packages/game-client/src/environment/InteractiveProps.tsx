import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useStore } from 'zustand';
import * as THREE from 'three';
import { getAssetUrl } from '@online-zoo/game-assets';
import { gameStore, PANDA_FOREST_INTERACTIVE_OBJECTS } from '@online-zoo/game-core';

export const InteractiveProps: React.FC = () => {
  const focusedObject = useStore(gameStore, (s) => s.focusedObject);
  const propStates = useStore(gameStore, (s) => s.propStates);

  // Load real .glb assets through useGLTF (Architecture Requirement 8)
  const plaqueGltf = useGLTF(getAssetUrl('prop-habitat-plaque'));
  const lanternGltf = useGLTF(getAssetUrl('prop-stone-lantern'));
  const chimeGltf = useGLTF(getAssetUrl('prop-wind-chime'));
  const benchGltf = useGLTF(getAssetUrl('prop-wooden-bench'));

  const chimeGroupRef = useRef<THREE.Group>(null);
  const targetRingRef = useRef<THREE.Mesh>(null);

  const lanternActive = propStates['prop-stone-lantern']?.active ?? true;
  const chimeState = propStates['prop-wind-chime'];
  const benchActive = propStates['prop-scenic-bench']?.active ?? false;

  const handlePropClick = (objectId: string) => {
    const st = gameStore.getState();
    if (st.phase !== 'playing' || st.focusedObject?.id !== objectId) return;
    const obj = st.focusedObject;
    if (obj.archetype === 'info_plaque') {
      st.openPlaqueModal(obj);
    } else if (obj.archetype === 'world_prop') {
      st.togglePropState(obj.id);
    }
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Animate Bamboo Wind Chime when triggered
    if (chimeGroupRef.current) {
      const elapsedSinceRing = chimeState?.lastTriggeredAt
        ? (Date.now() - chimeState.lastTriggeredAt) / 1000
        : 999;
      const swayAmplitude = elapsedSinceRing < 4.0 ? 0.26 * Math.exp(-elapsedSinceRing * 0.5) : 0.03;
      chimeGroupRef.current.rotation.z = Math.sin(t * 6.0) * swayAmplitude;
    }

    // Animate floating target ring over currently focused interactive object
    if (targetRingRef.current && focusedObject) {
      targetRingRef.current.position.set(
        focusedObject.position[0],
        2.35 + Math.sin(t * 4.0) * 0.12,
        focusedObject.position[2]
      );
      targetRingRef.current.rotation.y = t * 1.8;
    }
  });

  return (
    <group name="panda-forest-interactive-props">
      {/* 1. Giant Panda Habitat Info Plaque */}
      <group
        position={PANDA_FOREST_INTERACTIVE_OBJECTS[0].position}
        rotation={[0, -0.35, 0]}
        onClick={() => handlePropClick(PANDA_FOREST_INTERACTIVE_OBJECTS[0].id)}
      >
        <primitive object={plaqueGltf.scene.clone()} />
      </group>

      {/* 2. Lotus Pond Ecology Info Sign */}
      <group
        position={PANDA_FOREST_INTERACTIVE_OBJECTS[1].position}
        rotation={[0, 0.65, 0]}
        onClick={() => handlePropClick(PANDA_FOREST_INTERACTIVE_OBJECTS[1].id)}
      >
        <primitive object={plaqueGltf.scene.clone()} />
      </group>

      {/* 3. Stone Garden Lantern (toggle_lantern world_prop) */}
      <group
        position={PANDA_FOREST_INTERACTIVE_OBJECTS[2].position}
        onClick={() => handlePropClick(PANDA_FOREST_INTERACTIVE_OBJECTS[2].id)}
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
        position={PANDA_FOREST_INTERACTIVE_OBJECTS[3].position}
        rotation={[0, -0.5, 0]}
        onClick={() => handlePropClick(PANDA_FOREST_INTERACTIVE_OBJECTS[3].id)}
      >
        <group ref={chimeGroupRef}>
          <primitive object={chimeGltf.scene.clone()} />
        </group>
      </group>

      {/* 5. Scenic Overlook Bench (rest_bench world_prop) */}
      <group
        position={PANDA_FOREST_INTERACTIVE_OBJECTS[4].position}
        rotation={[0, 0.25, 0]}
        onClick={() => handlePropClick(PANDA_FOREST_INTERACTIVE_OBJECTS[4].id)}
      >
        <primitive object={benchGltf.scene.clone()} />
        {benchActive && (
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[1.5, 0.08, 0.5]} />
            <meshStandardMaterial
              color="#7be396"
              emissive="#39b85e"
              emissiveIntensity={0.85}
            />
          </mesh>
        )}
      </group>

      {/* Floating Highlight Beacon over the Currently Targeted Interactive Object */}
      {focusedObject && (
        <mesh ref={targetRingRef} position={[focusedObject.position[0], 2.35, focusedObject.position[2]]}>
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

