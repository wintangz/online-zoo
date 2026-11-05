import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ANIMAL_SPECIES_TO_ASSET_ID,
  ASSET_MANIFEST,
  assetRegistry,
  getAnimalAssetId,
  getAssetsForZone,
  getAssetUrl,
  getPreloadUrls,
  getPreloadUrlsForZone,
  ZOO_PALETTE
} from '../src';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ROOT = path.resolve(__dirname, '../../../apps/web/public');

describe('@online-zoo/game-assets manifest & generated GLB files', () => {
  it('preserves original 6 manifest IDs and bounding radii while registering animal and prop GLBs', () => {
    expect(ASSET_MANIFEST['avatar-explorer'].boundingRadius).toBe(0.9);
    expect(ASSET_MANIFEST['prop-bamboo-cluster'].boundingRadius).toBe(1.5);
    expect(ASSET_MANIFEST['prop-stone-lantern'].boundingRadius).toBe(1.2);
    expect(ASSET_MANIFEST['prop-habitat-plaque'].boundingRadius).toBe(1.1);
    expect(ASSET_MANIFEST['prop-wind-chime'].boundingRadius).toBe(1.4);
    expect(ASSET_MANIFEST['prop-wooden-bench'].boundingRadius).toBe(1.3);

    expect(ANIMAL_SPECIES_TO_ASSET_ID).toEqual({
      panda: 'animal-panda',
      penguin: 'animal-penguin',
      otter: 'animal-otter'
    });
    expect(getAnimalAssetId('panda')).toBe('animal-panda');
    expect(getAnimalAssetId('penguin')).toBe('animal-penguin');
    expect(getAnimalAssetId('otter')).toBe('animal-otter');
    expect(getAssetUrl('avatar-explorer')).toBe('/assets/models/avatar-explorer.glb');
    expect(getAssetUrl('animal-panda')).toBe('/assets/models/animal-panda.glb');
    expect(getPreloadUrls().length).toBe(Object.keys(ASSET_MANIFEST).length);
  });

  it('declares zone-to-asset mapping and shared 20-colour palette (FR-002, FR-008)', () => {
    expect(Object.keys(ZOO_PALETTE)).toHaveLength(20);
    for (const entry of Object.values(ASSET_MANIFEST)) {
      expect(entry.zones.length).toBeGreaterThan(0);
    }
    const lobbyAssets = getAssetsForZone('zoo-lobby');
    const pandaAssets = getAssetsForZone('panda-forest');
    expect(lobbyAssets.map((a) => a.id)).toEqual([
      'avatar-explorer',
      'prop-stone-lantern',
      'prop-habitat-plaque',
      'prop-wooden-bench',
      'prop-ticket-booth',
      'prop-fountain'
    ]);
    expect(pandaAssets.map((a) => a.id)).toContain('animal-panda');
    expect(pandaAssets.map((a) => a.id)).toContain('animal-penguin');
    expect(pandaAssets.map((a) => a.id)).toContain('animal-otter');
    expect(getPreloadUrlsForZone('zoo-lobby')).toHaveLength(lobbyAssets.length);
    expect(getPreloadUrlsForZone('panda-forest')).toHaveLength(pandaAssets.length);
  });

  it('verifies generated binary .glb files exist on disk with valid glTF 2.0 header and palette materials', () => {
    const paletteKeys = new Set(Object.keys(ZOO_PALETTE));
    for (const entry of Object.values(ASSET_MANIFEST)) {
      const fullPath = path.join(PUBLIC_ROOT, entry.url);
      expect(fs.existsSync(fullPath)).toBe(true);
      const buf = fs.readFileSync(fullPath);
      expect(buf.byteLength).toBeGreaterThan(100);
      // Magic header 'glTF' (0x46546C67) and version 2
      expect(buf.readUInt32LE(0)).toBe(0x46546c67);
      expect(buf.readUInt32LE(4)).toBe(2);

      // Parse JSON chunk to verify every material name references a valid ZOO_PALETTE key
      const jsonChunkLength = buf.readUInt32LE(12);
      const jsonStr = buf.subarray(20, 20 + jsonChunkLength).toString('utf8').trim();
      const gltf = JSON.parse(jsonStr) as { materials: Array<{ name: string }> };
      expect(gltf.materials.length).toBeGreaterThan(0);
      for (const mat of gltf.materials) {
        const matchedPaletteKey = [...paletteKeys].some((key) => mat.name.includes(`_${key}_`));
        expect(matchedPaletteKey).toBe(true);
      }
    }
  });

  it('clears cached scenes cleanly via clearAssetCache', () => {
    expect(() => assetRegistry.clearAssetCache()).not.toThrow();
  });
});
