import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, useGLTF } from '@react-three/drei';
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier';
import { useStore } from 'zustand';
import * as THREE from 'three';
import { getAssetUrl } from '@online-zoo/game-assets';
import {
  findGateLinkByObjectId,
  gameStore,
  ZOO_LOBBY_INTERACTIVE_OBJECTS
} from '@online-zoo/game-core';
import { PALETTE_COLORS, PALETTE_MATERIALS } from '../materials/paletteMaterials';
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
  const ticketBoothGltf = useGLTF(getAssetUrl('prop-ticket-booth'));
  const fountainGltf = useGLTF(getAssetUrl('prop-fountain'));

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
    position: [0, 0, 8.5] as [number, number, number]
  };

  return (
    <group name="zoo-lobby-root-scene">
      {/* Flat-Shaded Low-Poly Atmosphere */}
      <color attach="background" args={[PALETTE_COLORS.skyMist]} />
      <fog attach="fog" args={[PALETTE_COLORS.skyMist, 32, 110]} />
      <Sky
        distance={450}
        sunPosition={[28, 38, -36]}
        turbidity={2.0}
        rayleigh={1.1}
        mieCoefficient={0.004}
        mieDirectionalG={0.8}
      />
      <ambientLight intensity={0.72} color={PALETTE_COLORS.snowCream} />
      <hemisphereLight
        args={[PALETTE_COLORS.skyMist, PALETTE_COLORS.meadowGrass, 0.58]}
      />
      <directionalLight
        castShadow
        position={[28, 38, -36]}
        intensity={1.35}
        color={PALETTE_COLORS.snowCream}
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

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        material={PALETTE_MATERIALS.meadowGrass}
      >
        <circleGeometry args={[34, 32]} />
      </mesh>

      {/* Paved Entrance Courtyard & North-South Walkway */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, -2.0]}
        receiveShadow
        material={PALETTE_MATERIALS.graniteSlate}
      >
        <circleGeometry args={[10.5, 24]} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.03, 1.5]}
        receiveShadow
        material={PALETTE_MATERIALS.stonePath}
      >
        <planeGeometry args={[5.4, 32]} />
      </mesh>

      {/* West & East Ticket Booths at the Entrance (Registered GLB prop-ticket-booth) */}
      {([-5.2, 5.2] as const).map((xPos, idx) => (
        <group
          key={`lobby-ticket-booth-${idx}`}
          name={`lobby-ticket-booth-${idx === 0 ? 'west' : 'east'}`}
          position={[xPos, 0, 11.5]}
        >
          <primitive object={ticketBoothGltf.scene.clone()} />
        </group>
      ))}

      {/* Central Meeting Point Fountain & Interactive Plaque (Registered GLB prop-fountain) */}
      <group
        name="lobby-meeting-point-fountain"
        position={meetingPointObj.position}
        onClick={() => handleLobbyObjectClick(meetingPointObj.id)}
      >
        <primitive object={fountainGltf.scene.clone()} />
      </group>

      {/* Zone Directory Signboard (Registered GLB prop-habitat-plaque) */}
      <group
        name="lobby-zone-directory-signboard"
        position={directoryObj.position}
        rotation={[0, 0.35, 0]}
        onClick={() => handleLobbyObjectClick(directoryObj.id)}
      >
        <primitive object={plaqueGltf.scene.clone()} />
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

      <group
        name="prop-lobby-bench-east"
        position={eastBenchObj.position}
        rotation={[0, -Math.PI / 2, 0]}
        onClick={() => handleLobbyObjectClick(eastBenchObj.id)}
      >
        <primitive object={benchGltf.scene.clone()} />
        {eastBenchSeats.map((slot, idx) => (
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
        <mesh
          position={[-2.2, 1.9, 0]}
          castShadow
          receiveShadow
          material={PALETTE_MATERIALS.cedarBark}
        >
          <cylinderGeometry args={[0.32, 0.38, 3.8, 8]} />
        </mesh>
        <mesh
          position={[2.2, 1.9, 0]}
          castShadow
          receiveShadow
          material={PALETTE_MATERIALS.cedarBark}
        >
          <cylinderGeometry args={[0.32, 0.38, 3.8, 8]} />
        </mesh>
        {/* Jade Sanctuary Crossbeam & Roof */}
        <mesh
          position={[0, 3.7, 0]}
          castShadow
          material={PALETTE_MATERIALS.leafCanopy}
        >
          <boxGeometry args={[5.8, 0.48, 0.75]} />
        </mesh>
        <mesh
          position={[0, 4.2, 0]}
          castShadow
          material={PALETTE_MATERIALS.sunflowerGold}
        >
          <boxGeometry args={[6.4, 0.36, 1.1]} />
        </mesh>
        {/* Glowing Threshold Portal Ring */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.05, 0]}
          material={PALETTE_MATERIALS.portalRing}
        >
          <ringGeometry args={[1.4, 2.1, 16]} />
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
          <mesh
            position={[0, 1.1, 0]}
            castShadow
            material={PALETTE_MATERIALS.cedarBark}
          >
            <cylinderGeometry args={[0.24, 0.34, 2.2, 6]} />
          </mesh>
          <mesh
            position={[0, 2.8, 0]}
            castShadow
            material={PALETTE_MATERIALS.leafCanopy}
          >
            <coneGeometry args={[1.65, 2.6, 7]} />
          </mesh>
          <mesh
            position={[0, 4.1, 0]}
            castShadow
            material={PALETTE_MATERIALS.bambooStalk}
          >
            <coneGeometry args={[1.2, 2.0, 7]} />
          </mesh>
        </group>
      ))}

      {/* Floating Highlight Beacon over Focused Object */}
      {focusedObject && (
        <mesh
          ref={targetRingRef}
          position={[focusedObject.position[0], 2.35, focusedObject.position[2]]}
          material={PALETTE_MATERIALS.focusBeacon}
        >
          <octahedronGeometry args={[0.24, 0]} />
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
