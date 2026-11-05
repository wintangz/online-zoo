import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { PANDA_FOREST_LAYOUT } from '@online-zoo/game-core';
import { PALETTE_MATERIALS } from '../materials/paletteMaterials';

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

      {/* Stylized Flat-Shaded Bamboo & Stone Enclosure Fence Segments */}
      {segments.map((seg, idx) => (
        <group key={`perim-mesh-${idx}`} position={seg.pos} rotation={[0, seg.rotY, 0]}>
          {/* Low stone base wall */}
          <mesh
            castShadow
            receiveShadow
            position={[0, -0.75, 0]}
            material={PALETTE_MATERIALS.graniteSlate}
          >
            <boxGeometry args={[seg.width, 1.1, 0.55]} />
          </mesh>
          {/* Bamboo rail fence upper section */}
          <mesh
            castShadow
            receiveShadow
            position={[0, 0.35, 0]}
            material={PALETTE_MATERIALS.bambooStalk}
          >
            <boxGeometry args={[seg.width - 0.2, 1.1, 0.22]} />
          </mesh>
          {/* Wooden corner pillar */}
          <mesh
            castShadow
            receiveShadow
            position={[seg.width / 2 - 0.15, 0.1, 0]}
            material={PALETTE_MATERIALS.cedarBark}
          >
            <cylinderGeometry args={[0.24, 0.26, 2.6, 8]} />
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
        <mesh
          castShadow
          receiveShadow
          position={[-2.1, 0.28, 0]}
          material={PALETTE_MATERIALS.graniteSlate}
        >
          <cylinderGeometry args={[0.42, 0.48, 0.56, 8]} />
        </mesh>
        <mesh
          castShadow
          receiveShadow
          position={[2.1, 0.28, 0]}
          material={PALETTE_MATERIALS.graniteSlate}
        >
          <cylinderGeometry args={[0.42, 0.48, 0.56, 8]} />
        </mesh>

        {/* Main Sanctuary Gate Pillars */}
        <mesh
          castShadow
          position={[-2.1, 2.2, 0]}
          material={PALETTE_MATERIALS.terracottaRoof}
        >
          <cylinderGeometry args={[0.25, 0.3, 4.4, 8]} />
        </mesh>
        <mesh
          castShadow
          position={[2.1, 2.2, 0]}
          material={PALETTE_MATERIALS.terracottaRoof}
        >
          <cylinderGeometry args={[0.25, 0.3, 4.4, 8]} />
        </mesh>

        {/* Tiered Jade Roof & Crossbeams */}
        <mesh castShadow position={[0, 4.35, 0]} material={PALETTE_MATERIALS.mossShadow}>
          <boxGeometry args={[6.2, 0.45, 0.85]} />
        </mesh>
        <mesh
          castShadow
          position={[0, 3.72, 0]}
          material={PALETTE_MATERIALS.terracottaRoof}
        >
          <boxGeometry args={[5.2, 0.28, 0.48]} />
        </mesh>

        {/* Gold-Trimmed Overhead Gate Signboard */}
        <mesh
          castShadow
          position={[0, 4.02, 0.32]}
          material={PALETTE_MATERIALS.sunflowerGold}
        >
          <boxGeometry args={[2.6, 0.42, 0.12]} />
        </mesh>

        {/* Warm Hanging Welcome Lanterns */}
        <mesh position={[-2.55, 3.35, 0.2]} material={PALETTE_MATERIALS.lanternLit}>
          <dodecahedronGeometry args={[0.22, 0]} />
        </mesh>
        <mesh position={[2.55, 3.35, 0.2]} material={PALETTE_MATERIALS.lanternLit}>
          <dodecahedronGeometry args={[0.22, 0]} />
        </mesh>

        {/* Low Flanking Bamboo-and-Stone Courtyard Entry Wings */}
        <group position={[-3.75, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            position={[0, 0.35, 0]}
            material={PALETTE_MATERIALS.graniteSlate}
          >
            <boxGeometry args={[2.6, 0.7, 0.4]} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[0, 0.9, 0]}
            material={PALETTE_MATERIALS.bambooStalk}
          >
            <boxGeometry args={[2.4, 0.45, 0.18]} />
          </mesh>
        </group>
        <group position={[3.75, 0, 0]}>
          <mesh
            castShadow
            receiveShadow
            position={[0, 0.35, 0]}
            material={PALETTE_MATERIALS.graniteSlate}
          >
            <boxGeometry args={[2.6, 0.7, 0.4]} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[0, 0.9, 0]}
            material={PALETTE_MATERIALS.bambooStalk}
          >
            <boxGeometry args={[2.4, 0.45, 0.18]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};
