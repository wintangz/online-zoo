import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { PALETTE_MATERIALS } from '../materials/paletteMaterials';

export const TerrainAndPaths: React.FC = () => {
  // Stepping stones along the main pathway from South Arrival Terrace (Z = 20.6) through Entrance Gate (Z = 16.4) to northern overlook (Z = -18)
  const steppingStones = useMemo(() => {
    const stones: Array<{
      pos: [number, number, number];
      scale: [number, number, number];
      rotY: number;
    }> = [];
    for (let z = 20.6; z >= -18; z -= 1.6) {
      const curveX = z >= 15.0 ? 0 : Math.sin((z - 15.0) * 0.14) * 1.4;
      stones.push({
        pos: [curveX, 0.03, z],
        scale: [2.4, 0.06, 1.3],
        rotY: z >= 15.0 ? 0 : Math.cos((z - 15.0) * 0.14) * 0.15
      });
    }
    // Branch path toward the Lotus Pond boardwalk
    for (let i = 0; i < 6; i++) {
      stones.push({
        pos: [-0.8 - i * 0.85, 0.03, 2.0 - i * 0.9],
        scale: [1.6, 0.06, 1.1],
        rotY: 0.45
      });
    }
    // Branch path toward the Wind Chime Pavilion
    for (let i = 0; i < 6; i++) {
      stones.push({
        pos: [1.5 + i * 1.1, 0.03, -1.0 - i * 0.85],
        scale: [1.6, 0.06, 1.1],
        rotY: -0.45
      });
    }
    return stones;
  }, []);

  return (
    <group name="panda-forest-terrain-and-paths">
      {/* Physics Ground Collider */}
      <RigidBody type="fixed" colliders={false} name="ground-body">
        <CuboidCollider args={[45, 0.5, 45]} position={[0, -0.5, 0]} />
      </RigidBody>

      {/* Main Flat-Shaded Meadow Ground */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        material={PALETTE_MATERIALS.meadowGrass}
      >
        <circleGeometry args={[38, 32]} />
      </mesh>

      {/* Inner Mossy Clearing */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, -2]}
        material={PALETTE_MATERIALS.leafCanopy}
      >
        <circleGeometry args={[20, 28]} />
      </mesh>

      {/* South Arrival Terrace (Outside Entrance Gate at Z = 18.6) */}
      <mesh
        receiveShadow
        position={[0, 0.02, 18.6]}
        material={PALETTE_MATERIALS.stonePath}
      >
        <cylinderGeometry args={[3.4, 3.6, 0.05, 16]} />
      </mesh>

      {/* Flagstone Walking Paths */}
      {steppingStones.map((stone, idx) => (
        <mesh
          key={`path-stone-${idx}`}
          receiveShadow
          castShadow
          position={stone.pos}
          rotation={[0, stone.rotY, 0]}
          material={PALETTE_MATERIALS.stonePath}
        >
          <boxGeometry args={stone.scale} />
        </mesh>
      ))}
    </group>
  );
};
