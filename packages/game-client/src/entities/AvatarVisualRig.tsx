import React from 'react';
import * as THREE from 'three';
import { getAssetUrl } from '@online-zoo/game-assets';
import {
  DEFAULT_AVATAR_APPEARANCE,
  FOOD_CATALOG_BY_ID,
  getHairColorHex,
  getOutfitColors,
  getSkinToneHex,
  type ActiveFoodConsumption,
  type AvatarAppearance
} from '@online-zoo/game-core';
import { PALETTE_COLORS, PALETTE_MATERIALS } from '../materials/paletteMaterials';

export const AVATAR_BASE_MODEL_URL = getAssetUrl('avatar-explorer');

export interface AvatarVisualRigProps {
  appearance?: AvatarAppearance;
  fallbackAccentColor?: string;
  activeConsumption?: ActiveFoodConsumption | null;
  bodyAnimRef?: React.RefObject<THREE.Group>;
  leftLegRef?: React.RefObject<THREE.Mesh>;
  rightLegRef?: React.RefObject<THREE.Mesh>;
  leftArmRef?: React.RefObject<THREE.Mesh>;
  rightArmRef?: React.RefObject<THREE.Mesh>;
}

/**
 * Shared flat-shaded low-poly 3D Explorer character rig rendering all 5 customizable categories:
 * - `skinTone` (6 tones)
 * - `hairstyle` (4 3D styles: `explorer-bob`, `sun-spiky`, `bamboo-ponytail`, `park-bun`)
 * - `hairColor` (6 colors)
 * - `outfit` (5 stylized park outfits)
 * - `accessory` (5 options: `safari-hat`, `bamboo-visor`, `round-glasses`, `explorer-backpack`, `none`)
 */
export const AvatarVisualRig: React.FC<AvatarVisualRigProps> = ({
  appearance = DEFAULT_AVATAR_APPEARANCE,
  fallbackAccentColor,
  activeConsumption,
  bodyAnimRef,
  leftLegRef,
  rightLegRef,
  leftArmRef,
  rightArmRef
}) => {
  const skinColor = getSkinToneHex(appearance.skinTone);
  const hairColor = getHairColorHex(appearance.hairColor);
  const outfitColors = getOutfitColors(appearance.outfit);
  const accentColor = fallbackAccentColor ?? outfitColors.accent;
  const activeFoodCatalogItem = activeConsumption
    ? FOOD_CATALOG_BY_ID[activeConsumption.itemId]
    : null;

  return (
    <group
      ref={bodyAnimRef ?? null}
      userData={{
        modelUrl: AVATAR_BASE_MODEL_URL,
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
        <meshStandardMaterial color={outfitColors.primary} roughness={0.78} flatShading />
      </mesh>

      {/* Jacket Accent Belt & Front Chest Pocket (+Z forward) */}
      <mesh position={[0, 0.66, 0]} castShadow>
        <boxGeometry args={[0.56, 0.08, 0.36]} />
        <meshStandardMaterial color={accentColor} roughness={0.65} flatShading />
      </mesh>
      <mesh name="avatar-chest-pocket" position={[0.13, 1.02, 0.18]} castShadow>
        <boxGeometry args={[0.14, 0.14, 0.03]} />
        <meshStandardMaterial color={accentColor} roughness={0.65} flatShading />
      </mesh>

      {/* Neck & Stylized Low-Poly Head */}
      <mesh position={[0, 1.28, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.12, 8]} />
        <meshStandardMaterial color={skinColor} roughness={0.75} flatShading />
      </mesh>
      <mesh position={[0, 1.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.42, 0.42]} />
        <meshStandardMaterial color={skinColor} roughness={0.75} flatShading />
      </mesh>

      {/* Stylized Front Face & Eyes (+Z forward direction of travel) */}
      <group name="avatar-front-face">
        <mesh
          name="avatar-left-eye"
          position={[-0.08, 1.48, 0.22]}
          material={PALETTE_MATERIALS.charcoalFur}
        >
          <boxGeometry args={[0.05, 0.05, 0.03]} />
        </mesh>
        <mesh
          name="avatar-right-eye"
          position={[0.08, 1.48, 0.22]}
          material={PALETTE_MATERIALS.charcoalFur}
        >
          <boxGeometry args={[0.05, 0.05, 0.03]} />
        </mesh>
      </group>

      {/* 3D Hairstyle Geometry (4 distinct styles tinted with hairColor) */}
      {appearance.hairstyle === 'explorer-bob' && (
        <group name="hairstyle-explorer-bob">
          <mesh position={[0, 1.62, -0.02]} castShadow>
            <boxGeometry args={[0.46, 0.18, 0.46]} />
            <meshStandardMaterial color={hairColor} roughness={0.78} flatShading />
          </mesh>
          <mesh position={[-0.21, 1.43, 0.02]} castShadow>
            <boxGeometry args={[0.07, 0.22, 0.24]} />
            <meshStandardMaterial color={hairColor} roughness={0.78} flatShading />
          </mesh>
          <mesh position={[0.21, 1.43, 0.02]} castShadow>
            <boxGeometry args={[0.07, 0.22, 0.24]} />
            <meshStandardMaterial color={hairColor} roughness={0.78} flatShading />
          </mesh>
        </group>
      )}

      {appearance.hairstyle === 'sun-spiky' && (
        <group name="hairstyle-sun-spiky">
          <mesh position={[0, 1.62, -0.01]} castShadow>
            <boxGeometry args={[0.45, 0.16, 0.45]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} flatShading />
          </mesh>
          <mesh position={[0, 1.74, 0.04]} rotation={[-0.25, 0, 0]} castShadow>
            <coneGeometry args={[0.09, 0.22, 6]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} flatShading />
          </mesh>
          <mesh position={[-0.12, 1.71, 0]} rotation={[-0.1, 0, 0.4]} castShadow>
            <coneGeometry args={[0.08, 0.2, 6]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} flatShading />
          </mesh>
          <mesh position={[0.12, 1.71, 0]} rotation={[-0.1, 0, -0.4]} castShadow>
            <coneGeometry args={[0.08, 0.2, 6]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} flatShading />
          </mesh>
        </group>
      )}

      {appearance.hairstyle === 'bamboo-ponytail' && (
        <group name="hairstyle-bamboo-ponytail">
          <mesh position={[0, 1.62, -0.02]} castShadow>
            <boxGeometry args={[0.45, 0.16, 0.45]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} flatShading />
          </mesh>
          <mesh position={[0, 1.54, -0.24]} castShadow>
            <boxGeometry args={[0.11, 0.08, 0.06]} />
            <meshStandardMaterial color={accentColor} roughness={0.6} flatShading />
          </mesh>
          <mesh position={[0, 1.42, -0.31]} rotation={[-0.45, 0, 0]} castShadow>
            <coneGeometry args={[0.095, 0.32, 6]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} flatShading />
          </mesh>
        </group>
      )}

      {appearance.hairstyle === 'park-bun' && (
        <group name="hairstyle-park-bun">
          <mesh position={[0, 1.62, -0.01]} castShadow>
            <boxGeometry args={[0.45, 0.16, 0.45]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} flatShading />
          </mesh>
          <mesh position={[0, 1.76, -0.06]} castShadow>
            <dodecahedronGeometry args={[0.11, 0]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} flatShading />
          </mesh>
          <mesh position={[0, 1.69, -0.06]}>
            <boxGeometry args={[0.16, 0.04, 0.16]} />
            <meshStandardMaterial color={accentColor} roughness={0.6} flatShading />
          </mesh>
        </group>
      )}

      {/* 3D Accessories (5 options: safari-hat, bamboo-visor, round-glasses, explorer-backpack, none) */}
      {appearance.accessory === 'safari-hat' && (
        <group name="accessory-safari-hat">
          <mesh position={[0, 1.65, 0]} castShadow material={PALETTE_MATERIALS.otterBuff}>
            <cylinderGeometry args={[0.42, 0.44, 0.04, 8]} />
          </mesh>
          <mesh position={[0, 1.74, 0]} castShadow material={PALETTE_MATERIALS.stonePath}>
            <cylinderGeometry args={[0.22, 0.26, 0.16, 8]} />
          </mesh>
          <mesh position={[0, 1.68, 0]} castShadow>
            <cylinderGeometry args={[0.255, 0.265, 0.05, 8]} />
            <meshStandardMaterial color={accentColor} roughness={0.6} flatShading />
          </mesh>
        </group>
      )}

      {appearance.accessory === 'bamboo-visor' && (
        <group name="accessory-bamboo-visor">
          <mesh position={[0, 1.6, 0]} castShadow>
            <boxGeometry args={[0.46, 0.06, 0.46]} />
            <meshStandardMaterial color={accentColor} roughness={0.6} flatShading />
          </mesh>
          <mesh position={[0, 1.59, 0.26]} rotation={[0.15, 0, 0]} castShadow>
            <boxGeometry args={[0.36, 0.025, 0.2]} />
            <meshStandardMaterial color={outfitColors.primary} roughness={0.7} flatShading />
          </mesh>
        </group>
      )}

      {appearance.accessory === 'round-glasses' && (
        <group name="accessory-round-glasses">
          <mesh
            position={[-0.085, 1.48, 0.235]}
            material={PALETTE_MATERIALS.sunflowerGold}
          >
            <torusGeometry args={[0.055, 0.012, 6, 8]} />
          </mesh>
          <mesh
            position={[0.085, 1.48, 0.235]}
            material={PALETTE_MATERIALS.sunflowerGold}
          >
            <torusGeometry args={[0.055, 0.012, 6, 8]} />
          </mesh>
          <mesh position={[0, 1.48, 0.235]} material={PALETTE_MATERIALS.sunflowerGold}>
            <boxGeometry args={[0.06, 0.014, 0.014]} />
          </mesh>
        </group>
      )}

      {appearance.accessory === 'explorer-backpack' && (
        <group name="accessory-explorer-backpack">
          <mesh
            name="avatar-backpack-body"
            position={[0, 0.94, -0.25]}
            castShadow
            material={PALETTE_MATERIALS.warmTimber}
          >
            <boxGeometry args={[0.42, 0.48, 0.2]} />
          </mesh>
          <mesh position={[0, 1.21, -0.25]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.075, 0.075, 0.44, 8]} />
            <meshStandardMaterial color={accentColor} roughness={0.65} flatShading />
          </mesh>
        </group>
      )}

      {/* Articulated Legs & Arms for Idle/Walk/Run/Jump states */}
      <mesh ref={leftLegRef ?? null} castShadow position={[-0.15, 0.32, 0]}>
        <boxGeometry args={[0.18, 0.54, 0.2]} />
        <meshStandardMaterial color={outfitColors.secondary} roughness={0.82} flatShading />
      </mesh>
      <mesh ref={rightLegRef ?? null} castShadow position={[0.15, 0.32, 0]}>
        <boxGeometry args={[0.18, 0.54, 0.2]} />
        <meshStandardMaterial color={outfitColors.secondary} roughness={0.82} flatShading />
      </mesh>
      <mesh ref={leftArmRef ?? null} castShadow position={[-0.37, 0.9, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.16]} />
        <meshStandardMaterial color={outfitColors.primary} roughness={0.78} flatShading />
      </mesh>
      <mesh ref={rightArmRef ?? null} castShadow position={[0.37, 0.9, 0]}>
        <boxGeometry args={[0.15, 0.5, 0.16]} />
        <meshStandardMaterial color={outfitColors.primary} roughness={0.78} flatShading />

        {/* Handheld 3D Food or Drink Prop during Active Consumption */}
        {activeConsumption && activeFoodCatalogItem && (
          <group
            name="avatar-handheld-food-prop"
            userData={{ itemId: activeConsumption.itemId, category: activeConsumption.category }}
            position={[-0.08, -0.26, 0.16]}
            rotation={[1.35, 0, 0]}
          >
            {activeConsumption.itemId === 'water' && (
              <group>
                <mesh castShadow material={PALETTE_MATERIALS.pondWater}>
                  <cylinderGeometry args={[0.055, 0.055, 0.2, 8]} />
                </mesh>
                <mesh position={[0, 0.12, 0]} material={PALETTE_MATERIALS.deepPoolWater}>
                  <cylinderGeometry args={[0.03, 0.03, 0.04, 8]} />
                </mesh>
              </group>
            )}

            {activeConsumption.itemId === 'bubble-tea' && (
              <group>
                <mesh castShadow material={PALETTE_MATERIALS.otterBuff}>
                  <cylinderGeometry args={[0.07, 0.052, 0.19, 8]} />
                </mesh>
                <mesh position={[0, -0.06, 0]} material={PALETTE_MATERIALS.cedarBark}>
                  <cylinderGeometry args={[0.056, 0.053, 0.06, 8]} />
                </mesh>
                <mesh
                  position={[0, 0.13, 0]}
                  rotation={[0, 0, -0.15]}
                  material={PALETTE_MATERIALS.leafCanopy}
                >
                  <cylinderGeometry args={[0.012, 0.012, 0.14, 6]} />
                </mesh>
              </group>
            )}

            {activeConsumption.itemId === 'ice-cream' && (
              <group>
                <mesh
                  position={[0, -0.05, 0]}
                  rotation={[Math.PI, 0, 0]}
                  castShadow
                  material={PALETTE_MATERIALS.otterCinnamon}
                >
                  <coneGeometry args={[0.06, 0.16, 8]} />
                </mesh>
                <mesh position={[0, 0.05, 0]} castShadow material={PALETTE_MATERIALS.blossomPink}>
                  <dodecahedronGeometry args={[0.068, 0]} />
                </mesh>
                <mesh position={[0, 0.1, 0]} castShadow material={PALETTE_MATERIALS.cedarBark}>
                  <dodecahedronGeometry args={[0.045, 0]} />
                </mesh>
              </group>
            )}

            {activeConsumption.itemId === 'burger' && (
              <group>
                <mesh position={[0, -0.035, 0]} castShadow material={PALETTE_MATERIALS.otterBuff}>
                  <cylinderGeometry args={[0.08, 0.075, 0.035, 8]} />
                </mesh>
                <mesh position={[0, 0, 0]} castShadow material={PALETTE_MATERIALS.cedarBark}>
                  <cylinderGeometry args={[0.082, 0.082, 0.032, 8]} />
                </mesh>
                <mesh position={[0, 0.022, 0]} material={PALETTE_MATERIALS.bambooStalk}>
                  <cylinderGeometry args={[0.086, 0.086, 0.016, 8]} />
                </mesh>
                <mesh position={[0, 0.048, 0]} castShadow material={PALETTE_MATERIALS.otterBuff}>
                  <cylinderGeometry args={[0.065, 0.08, 0.04, 8]} />
                </mesh>
              </group>
            )}

            {activeConsumption.itemId === 'popcorn' && (
              <group>
                <mesh castShadow material={PALETTE_MATERIALS.coralAccent}>
                  <cylinderGeometry args={[0.072, 0.055, 0.16, 8]} />
                </mesh>
                <mesh position={[0, 0.09, 0]} castShadow material={PALETTE_MATERIALS.sunflowerGold}>
                  <dodecahedronGeometry args={[0.07, 0]} />
                </mesh>
              </group>
            )}
          </group>
        )}
      </mesh>
    </group>
  );
};
