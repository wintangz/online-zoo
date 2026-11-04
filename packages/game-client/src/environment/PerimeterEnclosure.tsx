import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { PANDA_FOREST_LAYOUT } from '@online-zoo/game-core';

export const PerimeterEnclosure: React.FC = () => {
  const segments = useMemo(() => {
    const count = 24;
    const radius = PANDA_FOREST_LAYOUT.perimeterRadius;
    const list: Array<{
      pos: [number, number, number];
      rotY: number;
      width: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const nextAngle = ((i + 1) / count) * Math.PI * 2;
      const midAngle = (angle + nextAngle) / 2;
      const chordWidth = 2 * radius * Math.sin(Math.PI / count) + 0.4;

      list.push({
        pos: [Math.sin(midAngle) * radius, 1.3, Math.cos(midAngle) * radius],
        rotY: midAngle,
        width: chordWidth
      });
    }
    return list;
  }, []);

  return (
    <group name="panda-forest-perimeter">
      <RigidBody type="fixed" colliders={false} name="perimeter-fence-colliders">
        {segments.map((seg, idx) => (
          <CuboidCollider
            key={`perim-col-${idx}`}
            args={[seg.width / 2, 2.5, 0.4]}
            position={seg.pos}
            rotation={[0, seg.rotY, 0]}
          />
        ))}
      </RigidBody>

      {/* Stylized Bamboo & Stone Enclosure Wall Segments */}
      {segments.map((seg, idx) => (
        <group key={`perim-mesh-${idx}`} position={seg.pos} rotation={[0, seg.rotY, 0]}>
          {/* Low stone base wall */}
          <mesh castShadow receiveShadow position={[0, -0.75, 0]}>
            <boxGeometry args={[seg.width, 1.1, 0.55]} />
            <meshStandardMaterial color="#7c8288" roughness={0.88} />
          </mesh>
          {/* Bamboo rail fence upper section */}
          <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
            <boxGeometry args={[seg.width - 0.2, 1.1, 0.22]} />
            <meshStandardMaterial color="#589c48" roughness={0.75} />
          </mesh>
          {/* Wooden corner pillar */}
          <mesh castShadow receiveShadow position={[seg.width / 2 - 0.15, 0.1, 0]}>
            <cylinderGeometry args={[0.24, 0.26, 2.6, 12]} />
            <meshStandardMaterial color="#6e4726" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Decorative Panda Sanctuary Entrance Arch near South Spawn with Solid Pillar Colliders */}
      <group position={[0, 0, 22.5]}>
        <RigidBody type="fixed" colliders={false} name="entrance-arch-colliders">
          <CylinderCollider args={[2.2, 0.45]} position={[-2.6, 2.2, 0]} />
          <CylinderCollider args={[2.2, 0.45]} position={[2.6, 2.2, 0]} />
        </RigidBody>
        <mesh castShadow position={[-2.6, 2.2, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 4.4, 16]} />
          <meshStandardMaterial color="#8f322a" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[2.6, 2.2, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 4.4, 16]} />
          <meshStandardMaterial color="#8f322a" roughness={0.7} />
        </mesh>
        <mesh castShadow position={[0, 4.3, 0]}>
          <boxGeometry args={[6.8, 0.45, 0.7]} />
          <meshStandardMaterial color="#2a5c3b" roughness={0.65} />
        </mesh>
        <mesh castShadow position={[0, 3.7, 0]}>
          <boxGeometry args={[5.8, 0.28, 0.45]} />
          <meshStandardMaterial color="#8f322a" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
};

