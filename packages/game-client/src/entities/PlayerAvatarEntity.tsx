import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CapsuleCollider, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { getAssetUrl } from '@online-zoo/game-assets';
import { mutableRuntimeState } from '@online-zoo/game-core';

export const PlayerAvatarEntity: React.FC = () => {
  const avatarGltf = useGLTF(getAssetUrl('avatar-explorer'));
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const visualGroupRef = useRef<THREE.Group>(null);
  const bodyAnimRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const { position, facingYaw, locomotionState } = mutableRuntimeState.avatar;

    // 1. Update kinematic rigid body position in Rapier
    if (rigidBodyRef.current) {
      rigidBodyRef.current.setNextKinematicTranslation({
        x: position[0],
        y: position[1] + 0.9,
        z: position[2]
      });
    }

    // 2. Update 3D visual transform & facing rotation directly (zero React re-renders)
    if (visualGroupRef.current) {
      visualGroupRef.current.position.set(position[0], position[1], position[2]);
      visualGroupRef.current.rotation.y = facingYaw;
    }

    // 3. Procedural locomotion animation for Idle, Walking, Running, and Jumping (FR-005)
    if (bodyAnimRef.current && leftLegRef.current && rightLegRef.current && leftArmRef.current && rightArmRef.current) {
      if (locomotionState === 'Idle') {
        bodyAnimRef.current.position.y = Math.sin(t * 2.4) * 0.025;
        bodyAnimRef.current.rotation.x = 0;
        leftLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.x = 0;
        leftArmRef.current.rotation.x = Math.sin(t * 2.0) * 0.04;
        rightArmRef.current.rotation.x = -Math.sin(t * 2.0) * 0.04;
      } else if (locomotionState === 'Walking') {
        const freq = 8.5;
        bodyAnimRef.current.position.y = Math.abs(Math.sin(t * freq)) * 0.055;
        bodyAnimRef.current.rotation.x = 0.06;
        leftLegRef.current.rotation.x = Math.sin(t * freq) * 0.55;
        rightLegRef.current.rotation.x = -Math.sin(t * freq) * 0.55;
        leftArmRef.current.rotation.x = -Math.sin(t * freq) * 0.45;
        rightArmRef.current.rotation.x = Math.sin(t * freq) * 0.45;
      } else if (locomotionState === 'Running') {
        const freq = 14.0;
        bodyAnimRef.current.position.y = Math.abs(Math.sin(t * freq)) * 0.095;
        bodyAnimRef.current.rotation.x = 0.16;
        leftLegRef.current.rotation.x = Math.sin(t * freq) * 0.92;
        rightLegRef.current.rotation.x = -Math.sin(t * freq) * 0.92;
        leftArmRef.current.rotation.x = -Math.sin(t * freq) * 0.85;
        rightArmRef.current.rotation.x = Math.sin(t * freq) * 0.85;
      } else if (locomotionState === 'Jumping') {
        bodyAnimRef.current.position.y = 0.08;
        bodyAnimRef.current.rotation.x = -0.05;
        leftLegRef.current.rotation.x = -0.35;
        rightLegRef.current.rotation.x = 0.25;
        leftArmRef.current.rotation.x = -0.65;
        rightArmRef.current.rotation.x = -0.65;
      }
    }
  });

  return (
    <>
      <RigidBody
        ref={rigidBodyRef}
        type="kinematicPosition"
        colliders={false}
        position={[0, 1.0, 18]}
        name="player-avatar-body"
      >
        <CapsuleCollider args={[0.45, 0.45]} />
      </RigidBody>

      <group ref={visualGroupRef} name="player-avatar-visual" position={[0, 0.1, 18]}>
        <group ref={bodyAnimRef}>
          {/* Loaded GLB Explorer Avatar Torso/Head/Hat/Backpack */}
          <primitive object={avatarGltf.scene.clone()} />

          {/* Articulated Legs & Arms for expressive Idle/Walk/Run/Jump states */}
          <mesh ref={leftLegRef} castShadow position={[-0.16, 0.32, 0]}>
            <boxGeometry args={[0.18, 0.52, 0.2]} />
            <meshStandardMaterial color="#3b4d3e" roughness={0.8} />
          </mesh>
          <mesh ref={rightLegRef} castShadow position={[0.16, 0.32, 0]}>
            <boxGeometry args={[0.18, 0.52, 0.2]} />
            <meshStandardMaterial color="#3b4d3e" roughness={0.8} />
          </mesh>
          <mesh ref={leftArmRef} castShadow position={[-0.38, 0.88, 0]}>
            <boxGeometry args={[0.16, 0.52, 0.16]} />
            <meshStandardMaterial color="#388e56" roughness={0.75} />
          </mesh>
          <mesh ref={rightArmRef} castShadow position={[0.38, 0.88, 0]}>
            <boxGeometry args={[0.16, 0.52, 0.16]} />
            <meshStandardMaterial color="#388e56" roughness={0.75} />
          </mesh>
        </group>
      </group>
    </>
  );
};

