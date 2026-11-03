import React from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { mutableRuntimeState } from '@online-zoo/game-core';

export const FollowCameraRig: React.FC = () => {
  const { camera } = useThree();

  useFrame(() => {
    const [cx, cy, cz] = mutableRuntimeState.cameraPosition;
    const [lx, ly, lz] = mutableRuntimeState.cameraLookAt;

    camera.position.set(cx, cy, cz);
    camera.lookAt(lx, ly, lz);
  });

  return null;
};

