import * as THREE from 'three';
import { ZOO_PALETTE, type ZooPaletteColorKey } from '@online-zoo/game-assets';

export { ZOO_PALETTE, type ZooPaletteColorKey };

/**
 * Shared 20-color palette tokens for Online Zoo scene and entity files.
 * Scene and entity files must import colors/materials from this module rather than using color literals.
 */
export const PALETTE_COLORS = ZOO_PALETTE;

export function createFlatStandardMaterial(
  colorKey: ZooPaletteColorKey,
  options: {
    roughness?: number;
    metalness?: number;
    emissiveKey?: ZooPaletteColorKey;
    emissiveIntensity?: number;
    fog?: boolean;
  } = {}
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: ZOO_PALETTE[colorKey],
    roughness: options.roughness ?? 0.85,
    metalness: options.metalness ?? 0.02,
    flatShading: true,
    ...(options.emissiveKey !== undefined
      ? {
          emissive: ZOO_PALETTE[options.emissiveKey],
          emissiveIntensity: options.emissiveIntensity ?? 0.4
        }
      : {}),
    ...(options.fog !== undefined ? { fog: options.fog } : {})
  });
}

export const PALETTE_MATERIALS = {
  // Terrain & Paths
  meadowGrass: createFlatStandardMaterial('meadowGrass', { roughness: 0.92 }),
  leafCanopy: createFlatStandardMaterial('leafCanopy', { roughness: 0.85 }),
  mossShadow: createFlatStandardMaterial('mossShadow', { roughness: 0.92 }),
  bambooStalk: createFlatStandardMaterial('bambooStalk', { roughness: 0.78 }),
  stonePath: createFlatStandardMaterial('stonePath', { roughness: 0.85 }),
  graniteSlate: createFlatStandardMaterial('graniteSlate', { roughness: 0.88 }),

  // Fences, Timber & Gates
  warmTimber: createFlatStandardMaterial('warmTimber', { roughness: 0.8 }),
  cedarBark: createFlatStandardMaterial('cedarBark', { roughness: 0.85 }),
  terracottaRoof: createFlatStandardMaterial('terracottaRoof', { roughness: 0.72 }),
  sunflowerGold: createFlatStandardMaterial('sunflowerGold', { roughness: 0.55 }),

  // Water & Ponds
  pondWater: createFlatStandardMaterial('pondTeal', {
    roughness: 0.25,
    metalness: 0.12,
    emissiveKey: 'deepWater',
    emissiveIntensity: 0.22
  }),
  deepPoolWater: createFlatStandardMaterial('deepWater', {
    roughness: 0.25,
    metalness: 0.12,
    emissiveKey: 'pondTeal',
    emissiveIntensity: 0.25
  }),

  // Accents, Blooms & UI Indicators
  blossomPink: createFlatStandardMaterial('blossomPink', { roughness: 0.65 }),
  otterCinnamon: createFlatStandardMaterial('otterCinnamon', { roughness: 0.82 }),
  otterBuff: createFlatStandardMaterial('otterBuff', { roughness: 0.78 }),
  charcoalFur: createFlatStandardMaterial('charcoalFur', { roughness: 0.85 }),
  snowCream: createFlatStandardMaterial('snowCream', { roughness: 0.82 }),
  coralAccent: createFlatStandardMaterial('coralAccent', { roughness: 0.68 }),
  skyMistMountain: createFlatStandardMaterial('skyMist', { roughness: 0.95 }),

  // Emissive Interactive Indicators
  lanternLit: createFlatStandardMaterial('sunflowerGold', {
    roughness: 0.4,
    emissiveKey: 'lanternAmber',
    emissiveIntensity: 1.8
  }),
  lanternUnlit: createFlatStandardMaterial('graniteSlate', {
    roughness: 0.85
  }),
  seatAvailable: createFlatStandardMaterial('bambooStalk', {
    roughness: 0.65,
    emissiveKey: 'leafCanopy',
    emissiveIntensity: 0.35
  }),
  seatOccupied: createFlatStandardMaterial('coralAccent', {
    roughness: 0.65,
    emissiveKey: 'lanternAmber',
    emissiveIntensity: 0.75
  }),
  focusBeacon: createFlatStandardMaterial('sunflowerGold', {
    roughness: 0.4,
    emissiveKey: 'lanternAmber',
    emissiveIntensity: 1.2
  }),
  portalRing: createFlatStandardMaterial('sunflowerGold', {
    roughness: 0.5,
    emissiveKey: 'lanternAmber',
    emissiveIntensity: 0.65
  }),
  cloudPuff: createFlatStandardMaterial('snowCream', {
    roughness: 0.9,
    emissiveKey: 'skyMist',
    emissiveIntensity: 0.3,
    fog: false
  }),
  sunDisc: new THREE.MeshBasicMaterial({
    color: ZOO_PALETTE.snowCream,
    fog: false
  }),
  sunHalo: new THREE.MeshBasicMaterial({
    color: ZOO_PALETTE.sunflowerGold,
    transparent: true,
    opacity: 0.28,
    fog: false
  })
} as const;

