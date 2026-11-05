import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import { useStore } from 'zustand';
import * as THREE from 'three';
import { gameStore, SEASONAL_THEMES_BY_ID } from '@online-zoo/game-core';
import { TerrainAndPaths } from './TerrainAndPaths';
import { PerimeterEnclosure } from './PerimeterEnclosure';
import { PondShoreline } from './PondShoreline';
import { InstancedFoliage } from './InstancedFoliage';
import { InteractiveProps } from './InteractiveProps';
import { PlayerAvatarEntity } from '../entities/PlayerAvatarEntity';
import { RemotePlayersLayer } from '../entities/RemotePlayersLayer';
import { ZooAnimalsLayer } from '../entities/ZooAnimalsLayer';
import { FollowCameraRig } from '../entities/FollowCameraRig';
import { GameLoopController, type GameLoopControllerProps } from '../runtime/GameLoopController';

const CLOUD_CLUSTERS: Array<{
  id: string;
  basePos: [number, number, number];
  scale: number;
  speed: number;
}> = [
  { id: 'cloud-1', basePos: [-22, 26, -28], scale: 1.35, speed: 0.35 },
  { id: 'cloud-2', basePos: [18, 30, -34], scale: 1.55, speed: 0.28 },
  { id: 'cloud-3', basePos: [-32, 24, 8], scale: 1.2, speed: 0.42 },
  { id: 'cloud-4', basePos: [28, 28, 12], scale: 1.4, speed: 0.31 },
  { id: 'cloud-5', basePos: [0, 33, -12], scale: 1.65, speed: 0.25 },
  { id: 'cloud-6', basePos: [-14, 29, 28], scale: 1.3, speed: 0.38 },
  { id: 'cloud-7', basePos: [24, 25, -8], scale: 1.15, speed: 0.45 },
  { id: 'cloud-8', basePos: [-6, 31, 36], scale: 1.5, speed: 0.3 }
];

const SkyAndAtmosphere: React.FC = () => {
  const cloudsGroupRef = useRef<THREE.Group>(null);

  const distantPeaks = useMemo(() => {
    const count = 14;
    const radius = 68;
    const peaks: Array<{
      id: string;
      pos: [number, number, number];
      height: number;
      coneRadius: number;
      color: string;
    }> = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.18;
      const height = 22 + (i % 4) * 6;
      const coneRadius = 16 + (i % 3) * 4;
      peaks.push({
        id: `mountain-peak-${i}`,
        pos: [Math.sin(angle) * radius, height * 0.42, Math.cos(angle) * radius],
        height,
        coneRadius,
        color: i % 2 === 0 ? '#6aa5b8' : '#5b93a8'
      });
    }
    return peaks;
  }, []);

  useFrame(({ clock }) => {
    if (cloudsGroupRef.current) {
      cloudsGroupRef.current.rotation.y = clock.getElapsedTime() * 0.012;
    }
  });

  return (
    <group name="panda-forest-sky-and-atmosphere">
      {/* Physical Rayleigh/Mie Atmospheric Sky Dome */}
      <Sky
        distance={450}
        sunPosition={[36, 42, -48]}
        turbidity={2.2}
        rayleigh={1.15}
        mieCoefficient={0.004}
        mieDirectionalG={0.82}
      />

      {/* Stylized Glowing Sun Disc & Corona Halo */}
      <group position={[36, 42, -48]}>
        <mesh name="sky-sun-disc">
          <sphereGeometry args={[4.2, 24, 24]} />
          <meshBasicMaterial color="#fff7cc" fog={false} />
        </mesh>
        <mesh name="sky-sun-halo">
          <sphereGeometry args={[6.8, 24, 24]} />
          <meshBasicMaterial color="#ffe082" transparent opacity={0.28} fog={false} />
        </mesh>
      </group>

      {/* Drifting Stylized Fluffy 3D Cloud Clusters overhead */}
      <group ref={cloudsGroupRef} name="sky-cloud-clusters">
        {CLOUD_CLUSTERS.map((cloud) => (
          <group key={cloud.id} position={cloud.basePos} scale={cloud.scale}>
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[2.4, 14, 12]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#e8f4ff"
                emissiveIntensity={0.35}
                roughness={0.9}
                fog={false}
              />
            </mesh>
            <mesh position={[2.0, -0.3, 0.4]}>
              <sphereGeometry args={[1.8, 12, 10]} />
              <meshStandardMaterial
                color="#f8fcff"
                emissive="#e0f0ff"
                emissiveIntensity={0.3}
                roughness={0.9}
                fog={false}
              />
            </mesh>
            <mesh position={[-1.9, -0.35, -0.3]}>
              <sphereGeometry args={[1.7, 12, 10]} />
              <meshStandardMaterial
                color="#f8fcff"
                emissive="#e0f0ff"
                emissiveIntensity={0.3}
                roughness={0.9}
                fog={false}
              />
            </mesh>
            <mesh position={[0.5, 0.5, -1.3]}>
              <sphereGeometry args={[1.6, 12, 10]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#e8f4ff"
                emissiveIntensity={0.35}
                roughness={0.9}
                fog={false}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Distant Misty Sichuan Highland Mountain Silhouettes around the Horizon */}
      <group name="distant-horizon-mountains">
        {distantPeaks.map((peak) => (
          <mesh key={peak.id} position={peak.pos}>
            <coneGeometry args={[peak.coneRadius, peak.height, 7]} />
            <meshStandardMaterial color={peak.color} roughness={0.95} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const SeasonalFestivalDecorations: React.FC = () => {
  const seasonalTheme = useStore(gameStore, (s) => s.events.seasonalTheme);
  const floatGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (floatGroupRef.current) {
      const t = clock.getElapsedTime();
      floatGroupRef.current.position.y = Math.sin(t * 1.4) * 0.14;
    }
  });

  if (seasonalTheme === 'none') {
    return null;
  }

  const themeDesc = SEASONAL_THEMES_BY_ID[seasonalTheme];
  const archPositions: Array<[number, number, number]> = [
    [-5.2, 0, 14.2],
    [-2.0, 0, -0.8],
    [7.2, 0, 7.8]
  ];

  return (
    <group name={`seasonal-decorations-${seasonalTheme}`}>
      {/* Festive Sanctuary Arches & Garlands */}
      {archPositions.map((pos, idx) => (
        <group key={`seasonal-arch-${idx}`} position={pos}>
          <mesh position={[-1.8, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 3.0, 8]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.8} />
          </mesh>
          <mesh position={[1.8, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 3.0, 8]} />
            <meshStandardMaterial color="#7c2d12" roughness={0.8} />
          </mesh>
          <mesh position={[0, 3.05, 0]} castShadow>
            <boxGeometry args={[4.1, 0.22, 0.28]} />
            <meshStandardMaterial
              color={themeDesc.accentColor}
              emissive={themeDesc.foliageTintHex}
              emissiveIntensity={0.28}
              roughness={0.5}
            />
          </mesh>
          {/* Hanging Seasonal Clusters / Lanterns */}
          {[-1.1, 0, 1.1].map((offsetX, lIdx) => (
            <mesh
              key={`arch-ornament-${idx}-${lIdx}`}
              position={[offsetX, 2.65, 0]}
            >
              <sphereGeometry args={[0.26, 12, 12]} />
              <meshStandardMaterial
                color={themeDesc.foliageTintHex}
                emissive={themeDesc.accentColor}
                emissiveIntensity={0.65}
                roughness={0.35}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Gentle Floating Festival Orbs / Petals / Lanterns */}
      <group ref={floatGroupRef} name="seasonal-floating-accents">
        {[
          [-6.4, 2.4, 12.8],
          [-3.8, 2.7, 11.4],
          [-1.2, 2.3, -2.2],
          [8.6, 2.6, 8.8],
          [-8.4, 2.5, 6.6],
          [2.4, 2.6, -8.8]
        ].map((pos, idx) => (
          <mesh
            key={`seasonal-orb-${idx}`}
            position={pos as [number, number, number]}
          >
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshStandardMaterial
              color={themeDesc.foliageTintHex}
              emissive={themeDesc.accentColor}
              emissiveIntensity={0.75}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

export const PandaForestScene: React.FC<GameLoopControllerProps> = (props) => {
  return (
    <group name="panda-forest-root-scene">
      {/* Stylized Sunlight, Sky Dome, Fluffy Clouds & Warm Highland Mist */}
      <color attach="background" args={['#b8e4ff']} />
      <fog attach="fog" args={['#cceeff', 38, 130]} />
      <SkyAndAtmosphere />
      <ambientLight intensity={0.68} color="#f5f9ff" />
      <hemisphereLight args={['#9ee0ff', '#3a7a48', 0.6]} />
      <directionalLight
        castShadow
        position={[36, 42, -48]}
        intensity={1.4}
        color="#fff6e0"
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      {/* Modular Panda Forest Environment Components */}
      <TerrainAndPaths />
      <PerimeterEnclosure />
      <PondShoreline />
      <InstancedFoliage />
      <SeasonalFestivalDecorations />
      <InteractiveProps
        {...(props.multiplayerClient !== undefined
          ? { multiplayerClient: props.multiplayerClient }
          : {})}
      />

      {/* 60Hz Coordinated Game Loop runs first, followed by Local Avatar, Remote Visitors, Zoo Animals & Camera Rig */}
      <GameLoopController {...props} />
      <ZooAnimalsLayer />
      <PlayerAvatarEntity />
      <RemotePlayersLayer />
      <FollowCameraRig />
    </group>
  );
};

