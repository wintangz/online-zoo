import React from 'react';
import * as THREE from 'three';
import {
  DEFAULT_AVATAR_APPEARANCE,
  getHairColorHex,
  getOutfitColors,
  getSkinToneHex,
  type AvatarAppearance
} from '@online-zoo/game-core';

export interface AvatarVisualRigProps {
  appearance?: AvatarAppearance;
  fallbackAccentColor?: string;
  bodyAnimRef?: React.RefObject<THREE.Group>;
  leftLegRef?: React.RefObject<THREE.Mesh>;
  rightLegRef?: React.RefObject<THREE.Mesh>;
  leftArmRef?: React.RefObject<THREE.Mesh>;
  rightArmRef?: React.RefObject<THREE.Mesh>;
}

/**
 * Shared stylized 3D Explorer character rig rendering all 5 customizable categories:
 * - `skinTone` (6 tones)
 * - `hairstyle` (4 3D styles: `explorer-bob`, `sun-spiky`, `bamboo-ponytail`, `park-bun`)
 * - `hairColor` (6 colors)
 * - `outfit` (5 stylized park outfits)
 * - `accessory` (5 options: `safari-hat`, `bamboo-visor`, `round-glasses`, `explorer-backpack`, `none`)
 */
export const AvatarVisualRig: React.FC<AvatarVisualRigProps> = ({
  appearance = DEFAULT_AVATAR_APPEARANCE,
  fallbackAccentColor,
  bodyAnimRef,
  leftLegRef,
  rightLegRef,
  leftArmRef,
  rightArmRef
}) => {
  const skinHex = getSkinToneHex(appearance.skinTone);
  const hairHex = getHairColorHex(appearance.hairColor);
  const outfitColors = getOutfitColors(appearance.outfit);
  const accentHex = fallbackAccentColor ?? outfitColors.accent;

  return (
    <group
      ref={bodyAnimRef ?? null}
      userData={{
        skinTone: appearance.skinTone,
        hairstyle: appearance.hairstyle,
        hairColor: appearance.hairColor,
        outfit: appearance.outfit,
        accessory: appearance.accessory,
        forwardAxis: '+Z',
        eyeLocalZ: 0.21,
        backpackLocalZ: -0.25
      }}
    >
      {/* Torso / Park Jacket */}
      <mesh position={[0, 0.92, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.54, 0.64, 0.34]} />
        <meshStandardMaterial color={outfitColors.primary} roughness={0.72} />
      </mesh>

      {/* Jacket Accent Belt & Front Chest Pocket (+Z forward) */}
      <mesh position={[0, 0.66, 0]} castShadow>
        <boxGeometry args={[0.56, 0.08, 0.36]} />
        <meshStandardMaterial color={accentHex} roughness={0.55} />
      </mesh>
      <mesh name="avatar-chest-pocket" position={[0.13, 1.02, 0.18]} castShadow>
        <boxGeometry args={[0.14, 0.14, 0.03]} />
        <meshStandardMaterial color={accentHex} roughness={0.5} />
      </mesh>

      {/* Neck & Stylized Head (Skin Tone) */}
      <mesh position={[0, 1.28, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.12, 12]} />
        <meshStandardMaterial color={skinHex} roughness={0.65} />
      </mesh>
      <mesh position={[0, 1.46, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.24, 20, 16]} />
        <meshStandardMaterial color={skinHex} roughness={0.6} />
      </mesh>

      {/* Stylized Front Face & Eyes (+Z forward direction of travel) */}
      <group name="avatar-front-face">
        <mesh name="avatar-left-eye" position={[-0.08, 1.48, 0.21]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
        </mesh>
        <mesh name="avatar-right-eye" position={[0.08, 1.48, 0.21]}>
          <sphereGeometry args={[0.028, 10, 10]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.3} />
        </mesh>
      </group>

      {/* 3D Hairstyle Geometry (4 distinct styles tinted with hairColor) */}
      {appearance.hairstyle === 'explorer-bob' && (
        <group name="hairstyle-explorer-bob">
          <mesh position={[0, 1.54, -0.02]} castShadow>
            <sphereGeometry args={[0.255, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshStandardMaterial color={hairHex} roughness={0.68} />
          </mesh>
          <mesh position={[-0.21, 1.43, 0.02]} castShadow>
            <boxGeometry args={[0.07, 0.22, 0.24]} />
            <meshStandardMaterial color={hairHex} roughness={0.68} />
          </mesh>
          <mesh position={[0.21, 1.43, 0.02]} castShadow>
            <boxGeometry args={[0.07, 0.22, 0.24]} />
            <meshStandardMaterial color={hairHex} roughness={0.68} />
          </mesh>
        </group>
      )}

      {appearance.hairstyle === 'sun-spiky' && (
        <group name="hairstyle-sun-spiky">
          <mesh position={[0, 1.56, -0.01]} castShadow>
            <sphereGeometry args={[0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshStandardMaterial color={hairHex} roughness={0.62} />
          </mesh>
          <mesh position={[0, 1.74, 0.04]} rotation={[-0.25, 0, 0]} castShadow>
            <coneGeometry args={[0.09, 0.22, 8]} />
            <meshStandardMaterial color={hairHex} roughness={0.62} />
          </mesh>
          <mesh position={[-0.12, 1.71, 0]} rotation={[-0.1, 0, 0.4]} castShadow>
            <coneGeometry args={[0.08, 0.2, 8]} />
            <meshStandardMaterial color={hairHex} roughness={0.62} />
          </mesh>
          <mesh position={[0.12, 1.71, 0]} rotation={[-0.1, 0, -0.4]} castShadow>
            <coneGeometry args={[0.08, 0.2, 8]} />
            <meshStandardMaterial color={hairHex} roughness={0.62} />
          </mesh>
        </group>
      )}

      {appearance.hairstyle === 'bamboo-ponytail' && (
        <group name="hairstyle-bamboo-ponytail">
          <mesh position={[0, 1.55, -0.02]} castShadow>
            <sphereGeometry args={[0.252, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshStandardMaterial color={hairHex} roughness={0.65} />
          </mesh>
          {/* Ponytail tie & cascading tail at back (-Z) */}
          <mesh position={[0, 1.54, -0.24]} castShadow>
            <torusGeometry args={[0.055, 0.02, 8, 16]} />
            <meshStandardMaterial color={accentHex} roughness={0.45} />
          </mesh>
          <mesh position={[0, 1.42, -0.31]} rotation={[-0.45, 0, 0]} castShadow>
            <coneGeometry args={[0.095, 0.32, 12]} />
            <meshStandardMaterial color={hairHex} roughness={0.65} />
          </mesh>
        </group>
      )}

      {appearance.hairstyle === 'park-bun' && (
        <group name="hairstyle-park-bun">
          <mesh position={[0, 1.55, -0.01]} castShadow>
            <sphereGeometry args={[0.252, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshStandardMaterial color={hairHex} roughness={0.65} />
          </mesh>
          <mesh position={[0, 1.76, -0.06]} castShadow>
            <sphereGeometry args={[0.11, 14, 14]} />
            <meshStandardMaterial color={hairHex} roughness={0.65} />
          </mesh>
          <mesh position={[0, 1.69, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.085, 0.018, 8, 16]} />
            <meshStandardMaterial color={accentHex} roughness={0.45} />
          </mesh>
        </group>
      )}

      {/* 3D Accessories (5 options: safari-hat, bamboo-visor, round-glasses, explorer-backpack, none) */}
      {appearance.accessory === 'safari-hat' && (
        <group name="accessory-safari-hat">
          <mesh position={[0, 1.63, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.44, 0.04, 20]} />
            <meshStandardMaterial color="#d9c193" roughness={0.78} />
          </mesh>
          <mesh position={[0, 1.72, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.16, 18]} />
            <meshStandardMaterial color="#e3cda2" roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.66, 0]} castShadow>
            <cylinderGeometry args={[0.255, 0.265, 0.05, 18]} />
            <meshStandardMaterial color={accentHex} roughness={0.5} />
          </mesh>
        </group>
      )}

      {appearance.accessory === 'bamboo-visor' && (
        <group name="accessory-bamboo-visor">
          <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.245, 0.032, 10, 24]} />
            <meshStandardMaterial color={accentHex} roughness={0.5} />
          </mesh>
          {/* Visor brim shading the front face (+Z) */}
          <mesh position={[0, 1.59, 0.26]} rotation={[0.15, 0, 0]} castShadow>
            <boxGeometry args={[0.36, 0.025, 0.2]} />
            <meshStandardMaterial color={outfitColors.primary} roughness={0.6} />
          </mesh>
        </group>
      )}

      {appearance.accessory === 'round-glasses' && (
        <group name="accessory-round-glasses">
          <mesh position={[-0.085, 1.48, 0.235]}>
            <torusGeometry args={[0.055, 0.012, 8, 18]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0.085, 1.48, 0.235]}>
            <torusGeometry args={[0.055, 0.012, 8, 18]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.48, 0.235]}>
            <boxGeometry args={[0.06, 0.014, 0.014]} />
            <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.3} />
          </mesh>
        </group>
      )}

      {appearance.accessory === 'explorer-backpack' && (
        <group name="accessory-explorer-backpack">
          {/* Backpack mounted on back (-Z) */}
          <mesh name="avatar-backpack-body" position={[0, 0.94, -0.25]} castShadow>
            <boxGeometry args={[0.42, 0.48, 0.2]} />
            <meshStandardMaterial color="#8b5a2b" roughness={0.78} />
          </mesh>
          <mesh position={[0, 1.21, -0.25]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.075, 0.075, 0.44, 14]} />
            <meshStandardMaterial color={accentHex} roughness={0.6} />
          </mesh>
        </group>
      )}

      {/* Articulated Legs & Arms for Idle/Walk/Run/Jump states */}
      <mesh ref={leftLegRef ?? null} castShadow position={[-0.15, 0.32, 0]}>
        <boxGeometry args={[0.18, 0.54, 0.2]} />
        <meshStandardMaterial color={outfitColors.secondary} roughness={0.8} />
      </mesh>
      <mesh ref={rightLegRef ?? null} castShadow position={[0.15, 0.32, 0]}>
        <boxGeometry args={[0.18, 0.54, 0.2]} />
        <meshStandardMaterial color={outfitColors.secondary} roughness={0.8} />
      </mesh>
      <mesh ref={leftArmRef ?? null} castShadow position={[-0.37, 0.9, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.16]} />
        <meshStandardMaterial color={outfitColors.primary} roughness={0.72} />
      </mesh>
      <mesh ref={rightArmRef ?? null} castShadow position={[0.37, 0.9, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.16]} />
        <meshStandardMaterial color={outfitColors.primary} roughness={0.72} />
      </mesh>
    </group>
  );
};

