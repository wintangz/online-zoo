import React from 'react';
import { TerrainAndPaths } from './TerrainAndPaths';
import { PerimeterEnclosure } from './PerimeterEnclosure';
import { PondShoreline } from './PondShoreline';
import { InstancedFoliage } from './InstancedFoliage';
import { InteractiveProps } from './InteractiveProps';
import { PlayerAvatarEntity } from '../entities/PlayerAvatarEntity';
import { FollowCameraRig } from '../entities/FollowCameraRig';
import { GameLoopController, type GameLoopControllerProps } from '../runtime/GameLoopController';

export const PandaForestScene: React.FC<GameLoopControllerProps> = (props) => {
  return (
    <group name="panda-forest-root-scene">
      {/* Stylized Sunlight, Sky Hemisphere & Warm Mist */}
      <color attach="background" args={['#cfeefd']} />
      <fog attach="fog" args={['#cfeefd', 24, 62]} />
      <ambientLight intensity={0.65} color="#f5f9ff" />
      <hemisphereLight args={['#a5e3ff', '#3a7a48', 0.55]} />
      <directionalLight
        castShadow
        position={[18, 28, 16]}
        intensity={1.35}
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
      <InteractiveProps />

      {/* 60Hz Coordinated Game Loop runs first, followed by Avatar & Camera Rig */}
      <GameLoopController {...props} />
      <PlayerAvatarEntity />
      <FollowCameraRig />
    </group>
  );
};

