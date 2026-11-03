import React, { useMemo } from 'react';
import { RigidBody, CylinderCollider } from '@react-three/rapier';
import { PANDA_FOREST_LAYOUT } from '@online-zoo/game-core';

export const PondShoreline: React.FC = () => {
  const { center, radius, shorelineColliderRadius } = PANDA_FOREST_LAYOUT.pond;

  const shorelineRocks = useMemo(() => {
    const count = 20;
    const rocks: Array<{ pos: [number, number, number]; scale: [number, number, number]; rotY: number }> = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius + 0.15;
      rocks.push({
        pos: [center[0] + Math.cos(angle) * r, 0.22, center[2] + Math.sin(angle) * r],
        scale: [0.95 + (i % 3) * 0.25, 0.48 + (i % 2) * 0.18, 0.85],
        rotY: angle + 0.4
      });
    }
    return rocks;
  }, [center, radius]);

  const lilyPads = useMemo(
    () => [
      { pos: [center[0] - 1.8, 0.06, center[2] + 1.2] as [number, number, number], r: 0.55 },
      { pos: [center[0] + 2.1, 0.06, center[2] - 1.4] as [number, number, number], r: 0.65 },
      { pos: [center[0] - 0.5, 0.06, center[2] - 2.4] as [number, number, number], r: 0.5 },
      { pos: [center[0] + 1.4, 0.06, center[2] + 2.0] as [number, number, number], r: 0.6 }
    ],
    [center]
  );

  return (
    <group name="panda-forest-pond-shoreline">
      {/* Blocked Pond Shoreline Collider (FR-002): prevents avatar from entering pond water */}
      <RigidBody type="fixed" colliders={false} position={center} name="pond-shoreline-collider">
        <CylinderCollider args={[2.0, shorelineColliderRadius]} position={[0, 1.0, 0]} />
      </RigidBody>

      {/* Stylized Spring Water Surface */}
      <mesh receiveShadow position={[center[0], 0.04, center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 48]} />
        <meshStandardMaterial
          color="#38a3b8"
          roughness={0.18}
          metalness={0.25}
          emissive="#124e5e"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Shoreline River Boulders */}
      {shorelineRocks.map((rock, idx) => (
        <mesh
          key={`pond-rock-${idx}`}
          castShadow
          receiveShadow
          position={rock.pos}
          rotation={[0, rock.rotY, 0]}
          scale={rock.scale}
        >
          <dodecahedronGeometry args={[0.6, 1]} />
          <meshStandardMaterial color="#878e94" roughness={0.88} />
        </mesh>
      ))}

      {/* Floating Lily Pads & Lotus Blooms */}
      {lilyPads.map((pad, idx) => (
        <group key={`lily-pad-${idx}`} position={pad.pos}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[pad.r, 20]} />
            <meshStandardMaterial color="#429e52" roughness={0.75} />
          </mesh>
          <mesh castShadow position={[0, 0.08, 0]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial color="#f7a8c4" roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

