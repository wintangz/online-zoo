import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, useGLTF } from '@react-three/drei';
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import { useStore } from 'zustand';
import * as THREE from 'three';
import { getAssetUrl, ZOO_PALETTE } from '@online-zoo/game-assets';
import {
  findGateLinkByObjectId,
  gameStore,
  ZOO_LOBBY_INTERACTIVE_OBJECTS
} from '@online-zoo/game-core';
import { PlayerAvatarEntity } from '../entities/PlayerAvatarEntity';
import { RemotePlayersLayer } from '../entities/RemotePlayersLayer';
import { FollowCameraRig } from '../entities/FollowCameraRig';
import { GameLoopController, type GameLoopControllerProps } from '../runtime/GameLoopController';

export const ZooLobbyScene: React.FC<GameLoopControllerProps> = (props) => {
  const focusedObject = useStore(gameStore, (s) => s.focusedObject);
  const seatStates = useStore(gameStore, (s) => s.social.seatStates);

  const plaqueGltf = useGLTF(getAssetUrl('prop-habitat-plaque'));
  const benchGltf = useGLTF(getAssetUrl('prop-wooden-bench'));
  const lanternGltf = useGLTF(getAssetUrl('prop-stone-lantern'));

  const targetRingRef = useRef<THREE.Mesh>(null);

  const westBenchSeats = seatStates['prop-lobby-bench-west'] ?? [];
  const eastBenchSeats = seatStates['prop-lobby-bench-east'] ?? [];

  const handleLobbyObjectClick = (objectId: string) => {
    const st = gameStore.getState();
    if (st.phase !== 'playing' || st.focusedObject?.id !== objectId) return;
    const obj = st.focusedObject;
    if (obj.propReactionType === 'enter_zone_gate') {
      const gateLink = findGateLinkByObjectId(st.currentZoneId, obj.id);
      if (gateLink) {
        props.inputController.resetAll();
        props.multiplayerClient?.switchZoneViaGate(gateLink);
      }
    } else if (obj.archetype === 'info_plaque') {
      st.openPlaqueModal(obj);
    } else if (obj.seats && obj.seats.length > 0) {
      const isSeatedHere = st.social.localSeatedState?.objectId === obj.id;
      props.multiplayerClient?.sendSeatInteraction(obj.id, isSeatedHere ? 'stand' : 'sit');
    }
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (targetRingRef.current && focusedObject) {
      targetRingRef.current.position.set(
        focusedObject.position[0],
        2.35 + Math.sin(t * 4.0) * 0.12,
        focusedObject.position[2]
      );
      targetRingRef.current.rotation.y = t * 1.8;
    }
  });

  const directoryObj = ZOO_LOBBY_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'plaque-lobby-zone-directory'
  ) ?? {
    id: 'plaque-lobby-zone-directory',
    position: [-3.8, 0, 5.5] as [number, number, number]
  };
  const meetingPointObj = ZOO_LOBBY_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'plaque-lobby-meeting-point'
  ) ?? {
    id: 'plaque-lobby-meeting-point',
    position: [0, 0, -2.0] as [number, number, number]
  };
  const westBenchObj = ZOO_LOBBY_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'prop-lobby-bench-west'
  ) ?? {
    id: 'prop-lobby-bench-west',
    position: [-4.8, 0, 0.8] as [number, number, number]
  };
  const eastBenchObj = ZOO_LOBBY_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'prop-lobby-bench-east'
  ) ?? {
    id: 'prop-lobby-bench-east',
    position: [4.8, 0, 0.8] as [number, number, number]
  };
  const northGateObj = ZOO_LOBBY_INTERACTIVE_OBJECTS.find(
    (o) => o.id === 'gate-to-panda-forest'
  ) ?? {
    id: 'gate-to-panda-forest',
    position: [0, 0, -14.0] as [number, number, number]
  };

  return (
    <group name="zoo-lobby-root-scene">
      {/* Flat-Shaded Low-Poly Atmosphere */}
      <color attach="background" args={[ZOO_PALETTE.skyMist]} />
      <fog attach="fog" args={[ZOO_PALETTE.skyMist, 32, 110]} />
      <Sky
        distance={450}
        sunPosition={[28, 38, -36]}
        turbidity={2.0}
        rayleigh={1.1}
        mieCoefficient={0.004}
        mieDirectionalG={0.8}
      />
      <ambientLight intensity={0.72} color={ZOO_PALETTE.snowCream} />
      <hemisphereLight args={[ZOO_PALETTE.skyMist, ZOO_PALETTE.meadowGrass, 0.58]} />
      <directionalLight
        castShadow
        position={[28, 38, -36]}
        intensity={1.35}
        color={ZOO_PALETTE.snowCream}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
      />

      {/* Ground Meadow & Central Paved Entrance Plaza */}
      <RigidBody type="fixed" colliders={false} name="zoo-lobby-ground">
        <CuboidCollider args={[36, 0.5, 36]} position={[0, -0.5, 0]} />
        <CylinderCollider args={[1.6, 1.35]} position={[0, 1.6, -2.0]} />
        <CylinderCollider args={[1.8, 1.6]} position={[-5.2, 1.8, 11.5]} />
        <CylinderCollider args={[1.8, 1.6]} position={[5.2, 1.8, 11.5]} />
      </RigidBody>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[34, 32]} />
        <meshStandardMaterial color={ZOO_PALETTE.meadowGrass} roughness={0.92} flatShading />
      </mesh>

      {/* Paved Entrance Courtyard & North-South Walkway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -2.0]} receiveShadow>
        <circleGeometry args={[10.5, 24]} />
        <meshStandardMaterial color={ZOO_PALETTE.graniteSlate} roughness={0.85} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 1.5]} receiveShadow>
        <planeGeometry args={[5.4, 32]} />
        <meshStandardMaterial color={ZOO_PALETTE.stonePath} roughness={0.88} flatShading />
      </mesh>

      {/* West & East Ticket Booths at the Entrance */}
      {([-5.2, 5.2] as const).map((xPos, idx) => (
        <group
          key={`lobby-ticket-booth-${idx}`}
          name={`lobby-ticket-booth-${idx === 0 ? 'west' : 'east'}`}
          position={[xPos, 0, 11.5]}
        >
          <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.4, 2.2, 2.2]} />
            <meshStandardMaterial color={ZOO_PALETTE.warmTimber} roughness={0.8} flatShading />
          </mesh>
          <mesh position={[0, 1.25, idx === 0 ? 1.12 : -1.12]}>
            <boxGeometry args={[1.4, 0.9, 0.08]} />
            <meshStandardMaterial color={ZOO_PALETTE.snowCream} roughness={0.5} flatShading />
          </mesh>
          <mesh position={[0, 2.65, 0]} castShadow>
            <coneGeometry args={[2.1, 1.2, 4]} />
            <meshStandardMaterial color={ZOO_PALETTE.terracottaRoof} roughness={0.7} flatShading />
          </mesh>
          <mesh position={[0, 2.15, 0]}>
            <boxGeometry args={[2.55, 0.18, 2.35]} />
            <meshStandardMaterial color={ZOO_PALETTE.sunflowerGold} roughness={0.55} flatShading />
          </mesh>
        </group>
      ))}

      {/* Central Meeting Point Fountain & Interactive Plaque */}
      <group
        name="lobby-meeting-point-fountain"
        position={meetingPointObj.position}
        onClick={() => handleLobbyObjectClick(meetingPointObj.id)}
      >
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.45, 1.6, 0.7, 12]} />
          <meshStandardMaterial color={ZOO_PALETTE.stonePath} roughness={0.82} flatShading />
        </mesh>
        <mesh position={[0, 0.66, 0]}>
          <cylinderGeometry args={[1.22, 1.22, 0.12, 12]} />
          <meshStandardMaterial color={ZOO_PALETTE.pondTeal} roughness={0.35} flatShading />
        </mesh>
        <mesh position={[0, 1.35, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.38, 1.4, 8]} />
          <meshStandardMaterial color={ZOO_PALETTE.graniteSlate} roughness={0.8} flatShading />
        </mesh>
        <mesh position={[0, 2.15, 0]} castShadow>
          <octahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color={ZOO_PALETTE.sunflowerGold} roughness={0.45} flatShading />
        </mesh>
      </group>

      {/* Zone Directory Signboard (Lists Zoo Lobby & Panda Forest) */}
      <group
        name="lobby-zone-directory-signboard"
        position={directoryObj.position}
        rotation={[0, 0.35, 0]}
        onClick={() => handleLobbyObjectClick(directoryObj.id)}
      >
        <primitive object={plaqueGltf.scene.clone()} />
        <mesh position={[0, 1.65, 0]} castShadow>
          <boxGeometry args={[1.5, 0.95, 0.16]} />
          <meshStandardMaterial color={ZOO_PALETTE.cedarBark} roughness={0.78} flatShading />
        </mesh>
        <mesh position={[0, 1.82, 0.1]}>
          <boxGeometry args={[1.25, 0.24, 0.04]} />
          <meshStandardMaterial color={ZOO_PALETTE.leafCanopy} roughness={0.55} flatShading />
        </mesh>
        <mesh position={[0, 1.48, 0.1]}>
          <boxGeometry args={[1.25, 0.24, 0.04]} />
          <meshStandardMaterial color={ZOO_PALETTE.sunflowerGold} roughness={0.55} flatShading />
        </mesh>
      </group>

      {/* West & East Lobby Benches */}
      <group
        name="prop-lobby-bench-west"
        position={westBenchObj.position}
        rotation={[0, Math.PI / 2, 0]}
        onClick={() => handleLobbyObjectClick(westBenchObj.id)}
      >
        <primitive object={benchGltf.scene.clone()} />
        {westBenchSeats.map((slot, idx) => (
          <mesh key={slot.seatIndex} position={[idx === 0 ? -0.42 : 0.42, 0.62, 0]}>
            <boxGeometry args={[0.62, 0.06, 0.45]} />
            <meshStandardMaterial
              color={slot.occupiedBySessionId ? ZOO_PALETTE.coralAccent : ZOO_PALETTE.bambooStalk}
              flatShading
            />
          </mesh>
        ))}
      </group>

      <group
        name="prop-lobby-bench-east"
        position={eastBenchObj.position}
        rotation={[0, -Math.PI / 2, 0]}
        onClick={() => handleLobbyObjectClick(eastBenchObj.id)}
      >
        <primitive object={benchGltf.scene.clone()} />
        {eastBenchSeats.map((slot, idx) => (
          <mesh key={slot.seatIndex} position={[idx === 0 ? -0.42 : 0.42, 0.62, 0]}>
            <boxGeometry args={[0.62, 0.06, 0.45]} />
            <meshStandardMaterial
              color={slot.occupiedBySessionId ? ZOO_PALETTE.coralAccent : ZOO_PALETTE.bambooStalk}
              flatShading
            />
          </mesh>
        ))}
      </group>

      {/* Decorative Lanterns Flanking the North Gate */}
      <group position={[-3.8, 0, -11.5]}>
        <primitive object={lanternGltf.scene.clone()} />
      </group>
      <group position={[3.8, 0, -11.5]}>
        <primitive object={lanternGltf.scene.clone()} />
      </group>

      {/* North Zone Gate Archway -> Panda Forest */}
      <group
        name="gate-to-panda-forest"
        position={northGateObj.position}
        onClick={() => handleLobbyObjectClick(northGateObj.id)}
      >
        {/* Left & Right Gate Pillars */}
        <mesh position={[-2.2, 1.9, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.32, 0.38, 3.8, 8]} />
          <meshStandardMaterial color={ZOO_PALETTE.cedarBark} roughness={0.8} flatShading />
        </mesh>
        <mesh position={[2.2, 1.9, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.32, 0.38, 3.8, 8]} />
          <meshStandardMaterial color={ZOO_PALETTE.cedarBark} roughness={0.8} flatShading />
        </mesh>
        {/* Jade Sanctuary Crossbeam & Roof */}
        <mesh position={[0, 3.7, 0]} castShadow>
          <boxGeometry args={[5.8, 0.48, 0.75]} />
          <meshStandardMaterial color={ZOO_PALETTE.leafCanopy} roughness={0.65} flatShading />
        </mesh>
        <mesh position={[0, 4.2, 0]} castShadow>
          <boxGeometry args={[6.4, 0.36, 1.1]} />
          <meshStandardMaterial color={ZOO_PALETTE.sunflowerGold} roughness={0.55} flatShading />
        </mesh>
        {/* Glowing Threshold Portal Ring */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[1.4, 2.1, 16]} />
          <meshStandardMaterial
            color={ZOO_PALETTE.sunflowerGold}
            emissive={ZOO_PALETTE.lanternAmber}
            emissiveIntensity={0.65}
            flatShading
          />
        </mesh>
      </group>

      {/* Low-Poly Perimeter Trees */}
      {[
        [-10.5, 0, -9.0],
        [10.5, 0, -9.0],
        [-11.5, 0, 9.0],
        [11.5, 0, 9.0]
      ].map((pos, idx) => (
        <group key={`lobby-tree-${idx}`} position={pos as [number, number, number]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <cylinderGeometry args={[0.24, 0.34, 2.2, 6]} />
            <meshStandardMaterial color={ZOO_PALETTE.cedarBark} roughness={0.88} flatShading />
          </mesh>
          <mesh position={[0, 2.8, 0]} castShadow>
            <coneGeometry args={[1.65, 2.6, 7]} />
            <meshStandardMaterial color={ZOO_PALETTE.leafCanopy} roughness={0.85} flatShading />
          </mesh>
          <mesh position={[0, 4.1, 0]} castShadow>
            <coneGeometry args={[1.2, 2.0, 7]} />
            <meshStandardMaterial
              color={ZOO_PALETTE.bambooStalk}
              roughness={0.85}
              flatShading
            />
          </mesh>
        </group>
      ))}

      {/* Floating Highlight Beacon over Focused Object */}
      {focusedObject && (
        <mesh
          ref={targetRingRef}
          position={[focusedObject.position[0], 2.35, focusedObject.position[2]]}
        >
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial
            color={ZOO_PALETTE.sunflowerGold}
            emissive={ZOO_PALETTE.lanternAmber}
            emissiveIntensity={1.2}
            flatShading
          />
        </mesh>
      )}

      {/* 60Hz Coordinated Game Loop, Local Avatar, Remote Visitors & Camera Rig (NO Animals in Lobby) */}
      <GameLoopController {...props} />
      <PlayerAvatarEntity />
      <RemotePlayersLayer />
      <FollowCameraRig />
    </group>
  );
};
