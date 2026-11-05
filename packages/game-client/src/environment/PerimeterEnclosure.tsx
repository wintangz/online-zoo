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

      {/* Sanctuary Entrance Gate Archway in front of South Arrival Terrace (Z = 16.4) */}
      <group
        name="sanctuary-entrance-gate"
        position={PANDA_FOREST_LAYOUT.entranceGatePosition}
      >
        <RigidBody type="fixed" colliders={false} name="entrance-arch-colliders">
          <CylinderCollider args={[2.2, 0.45]} position={[-2.1, 2.2, 0]} />
          <CylinderCollider args={[2.2, 0.45]} position={[2.1, 2.2, 0]} />
        </RigidBody>

        {/* Stone Plinth Bases */}
        <mesh castShadow receiveShadow position={[-2.1, 0.28, 0]}>
          <cylinderGeometry args={[0.42, 0.48, 0.56, 16]} />
          <meshStandardMaterial color="#7c8288" roughness={0.85} />
        </mesh>
        <mesh castShadow receiveShadow position={[2.1, 0.28, 0]}>
          <cylinderGeometry args={[0.42, 0.48, 0.56, 16]} />
          <meshStandardMaterial color="#7c8288" roughness={0.85} />
        </mesh>

        {/* Main Crimson Sanctuary Gate Pillars */}
        <mesh castShadow position={[-2.1, 2.2, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 4.4, 16]} />
          <meshStandardMaterial color="#8f322a" roughness={0.68} />
        </mesh>
        <mesh castShadow position={[2.1, 2.2, 0]}>
          <cylinderGeometry args={[0.25, 0.3, 4.4, 16]} />
          <meshStandardMaterial color="#8f322a" roughness={0.68} />
        </mesh>

        {/* Tiered Jade Roof & Crimson Crossbeams */}
        <mesh castShadow position={[0, 4.35, 0]}>
          <boxGeometry args={[6.2, 0.45, 0.85]} />
          <meshStandardMaterial color="#2a5c3b" roughness={0.62} />
        </mesh>
        <mesh castShadow position={[0, 3.72, 0]}>
          <boxGeometry args={[5.2, 0.28, 0.48]} />
          <meshStandardMaterial color="#8f322a" roughness={0.7} />
        </mesh>

        {/* Gold-Trimmed Overhead Gate Signboard */}
        <mesh castShadow position={[0, 4.02, 0.32]}>
          <boxGeometry args={[2.6, 0.42, 0.12]} />
          <meshStandardMaterial color="#d97706" roughness={0.45} metalness={0.25} />
        </mesh>

        {/* Warm Hanging Welcome Lanterns */}
        <mesh position={[-2.55, 3.35, 0.2]}>
          <sphereGeometry args={[0.22, 14, 14]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive="#f59e0b"
            emissiveIntensity={0.85}
          />
        </mesh>
        <mesh position={[2.55, 3.35, 0.2]}>
          <sphereGeometry args={[0.22, 14, 14]} />
          <meshStandardMaterial
            color="#fef08a"
            emissive="#f59e0b"
            emissiveIntensity={0.85}
          />
        </mesh>

        {/* Low Flanking Bamboo-and-Stone Courtyard Entry Wings (visual threshold framing) */}
        <group position={[-3.75, 0, 0]}>
          <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
            <boxGeometry args={[2.6, 0.7, 0.4]} />
            <meshStandardMaterial color="#7c8288" roughness={0.88} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
            <boxGeometry args={[2.4, 0.45, 0.18]} />
            <meshStandardMaterial color="#589c48" roughness={0.75} />
          </mesh>
        </group>
        <group position={[3.75, 0, 0]}>
          <mesh castShadow receiveShadow position={[0, 0.35, 0]}>
            <boxGeometry args={[2.6, 0.7, 0.4]} />
            <meshStandardMaterial color="#7c8288" roughness={0.88} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
            <boxGeometry args={[2.4, 0.45, 0.18]} />
            <meshStandardMaterial color="#589c48" roughness={0.75} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

