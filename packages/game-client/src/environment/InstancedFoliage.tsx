import React, { useMemo } from 'react';
import { Instances, Instance, useGLTF } from '@react-three/drei';
import { RigidBody, CylinderCollider } from '@react-three/rapier';
import { getAssetUrl } from '@online-zoo/game-assets';
import { PANDA_FOREST_OBSTACLES } from '@online-zoo/game-core';
import { PALETTE_MATERIALS } from '../materials/paletteMaterials';

export const InstancedFoliage: React.FC = () => {
  const bambooGltf = useGLTF(getAssetUrl('prop-bamboo-cluster'));

  const trees = useMemo(
    () => PANDA_FOREST_OBSTACLES.filter((o) => o.kind === 'tree'),
    []
  );
  const rocks = useMemo(
    () => PANDA_FOREST_OBSTACLES.filter((o) => o.kind === 'rock'),
    []
  );
  const bambooClusters = useMemo(
    () => PANDA_FOREST_OBSTACLES.filter((o) => o.kind === 'bamboo'),
    []
  );

  return (
    <group name="panda-forest-instanced-foliage">
      {/* Fixed Rapier Colliders for all solid obstacles */}
      <RigidBody type="fixed" colliders={false} name="foliage-and-rock-colliders">
        {PANDA_FOREST_OBSTACLES.map((obs) => (
          <CylinderCollider
            key={`col-${obs.id}`}
            args={[obs.height / 2, obs.radius]}
            position={[obs.position[0], obs.height / 2, obs.position[2]]}
          />
        ))}
      </RigidBody>

      {/* GPU-Instanced Low-Poly Tree Trunks */}
      <Instances
        limit={32}
        castShadow
        receiveShadow
        material={PALETTE_MATERIALS.cedarBark}
      >
        <cylinderGeometry args={[0.38, 0.55, 3.2, 8]} />
        {trees.map((t) => (
          <Instance
            key={`trunk-${t.id}`}
            position={[t.position[0], 1.6, t.position[2]]}
            scale={t.scale ?? 1}
          />
        ))}
      </Instances>

      {/* GPU-Instanced Low-Poly Tree Canopies */}
      <Instances
        limit={32}
        castShadow
        receiveShadow
        material={PALETTE_MATERIALS.leafCanopy}
      >
        <coneGeometry args={[2.4, 4.4, 7]} />
        {trees.map((t) => (
          <Instance
            key={`canopy-${t.id}`}
            position={[t.position[0], 4.4, t.position[2]]}
            scale={t.scale ?? 1}
          />
        ))}
      </Instances>

      {/* GPU-Instanced Low-Poly Mossy Boulders / Rocks */}
      <Instances
        limit={32}
        castShadow
        receiveShadow
        material={PALETTE_MATERIALS.graniteSlate}
      >
        <dodecahedronGeometry args={[1.05, 0]} />
        {rocks.map((r) => (
          <Instance
            key={`rock-${r.id}`}
            position={[r.position[0], 0.85, r.position[2]]}
            scale={[r.scale ?? 1, (r.scale ?? 1) * 0.78, r.scale ?? 1]}
          />
        ))}
      </Instances>

      {/* Registered GLB Bamboo Clusters */}
      {bambooClusters.map((b) => (
        <group
          key={`bamboo-cluster-${b.id}`}
          position={b.position}
          scale={b.scale ?? 1}
        >
          <primitive object={bambooGltf.scene.clone()} />
        </group>
      ))}
    </group>
  );
};
