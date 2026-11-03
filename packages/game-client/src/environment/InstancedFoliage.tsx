import React, { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { RigidBody, CylinderCollider } from '@react-three/rapier';
import { PANDA_FOREST_OBSTACLES } from '@online-zoo/game-core';

export const InstancedFoliage: React.FC = () => {
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

  // Expand each bamboo cluster into 5 individual stalks for lush GPU-instanced rendering
  const bambooStalkTransforms = useMemo(() => {
    const offsets: Array<[number, number]> = [
      [0, 0],
      [0.42, 0.28],
      [-0.4, 0.3],
      [0.35, -0.38],
      [-0.38, -0.32]
    ];
    return bambooClusters.flatMap((cluster) =>
      offsets.map(([ox, oz], idx) => ({
        key: `${cluster.id}-stalk-${idx}`,
        position: [
          cluster.position[0] + ox,
          (cluster.height * 0.5) * (0.9 + (idx % 3) * 0.06),
          cluster.position[2] + oz
        ] as [number, number, number],
        scale: [1, 0.9 + (idx % 3) * 0.08, 1] as [number, number, number]
      }))
    );
  }, [bambooClusters]);

  return (
    <group name="panda-forest-instanced-foliage">
      {/* Fixed Rapier Colliders for all solid obstacles (FR-003, SC-005) */}
      <RigidBody type="fixed" colliders={false} name="foliage-and-rock-colliders">
        {PANDA_FOREST_OBSTACLES.map((obs) => (
          <CylinderCollider
            key={`col-${obs.id}`}
            args={[obs.height / 2, obs.radius]}
            position={[obs.position[0], obs.height / 2, obs.position[2]]}
          />
        ))}
      </RigidBody>

      {/* GPU-Instanced Tree Trunks */}
      <Instances limit={32} castShadow receiveShadow>
        <cylinderGeometry args={[0.38, 0.55, 3.2, 12]} />
        <meshStandardMaterial color="#6e492a" roughness={0.85} />
        {trees.map((t) => (
          <Instance
            key={`trunk-${t.id}`}
            position={[t.position[0], 1.6, t.position[2]]}
            scale={t.scale ?? 1}
          />
        ))}
      </Instances>

      {/* GPU-Instanced Tree Canopies */}
      <Instances limit={32} castShadow receiveShadow>
        <coneGeometry args={[2.4, 4.4, 12]} />
        <meshStandardMaterial color="#2f7d44" roughness={0.78} />
        {trees.map((t) => (
          <Instance
            key={`canopy-${t.id}`}
            position={[t.position[0], 4.4, t.position[2]]}
            scale={t.scale ?? 1}
          />
        ))}
      </Instances>

      {/* GPU-Instanced Mossy Boulders / Rocks */}
      <Instances limit={32} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial color="#788287" roughness={0.88} />
        {rocks.map((r) => (
          <Instance
            key={`rock-${r.id}`}
            position={[r.position[0], 0.85, r.position[2]]}
            scale={[r.scale ?? 1, (r.scale ?? 1) * 0.78, r.scale ?? 1]}
          />
        ))}
      </Instances>

      {/* GPU-Instanced Bamboo Stalks */}
      <Instances limit={128} castShadow receiveShadow>
        <cylinderGeometry args={[0.11, 0.14, 7.2, 10]} />
        <meshStandardMaterial color="#48a856" roughness={0.62} />
        {bambooStalkTransforms.map((s) => (
          <Instance key={s.key} position={s.position} scale={s.scale} />
        ))}
      </Instances>

      {/* GPU-Instanced Bamboo Leaf Crowns */}
      <Instances limit={64} castShadow>
        <sphereGeometry args={[1.35, 10, 10]} />
        <meshStandardMaterial color="#5cc46b" roughness={0.72} />
        {bambooClusters.map((b) => (
          <Instance
            key={`bamboo-crown-${b.id}`}
            position={[b.position[0], 6.4, b.position[2]]}
            scale={[1.2, 0.75, 1.2]}
          />
        ))}
      </Instances>
    </group>
  );
};

