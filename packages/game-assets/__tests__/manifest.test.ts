import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ANIMAL_SPECIES_TO_ASSET_ID,
  ASSET_MANIFEST,
  assetRegistry,
  getAnimalAssetId,
  getAssetsForZone,
  getAssetUrl,
  getLoadedZones,
  getPreloadedAssetUrls,
  getPreloadUrls,
  getPreloadUrlsForZone,
  getZoneTransferBytes,
  isZoneLoaded,
  MANIFEST_VERSION,
  preloadZoneAssets,
  resetZonePreloadCache,
  ZOO_PALETTE
} from '../src';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ROOT = path.resolve(__dirname, '../../../apps/web/public');
const MODELS_DIR = path.join(PUBLIC_ROOT, 'assets/models');

describe('@online-zoo/game-assets Manifest v2 & generated GLB files', () => {
  beforeEach(() => {
    resetZonePreloadCache();
  });

  it('declares Manifest v2 schema with zoneId, zones, sizeBytes, contentHash, and content-hashed URLs', () => {
    expect(MANIFEST_VERSION).toBe(2);
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
    expect(getAssetUrl('avatar-explorer')).toBe(ASSET_MANIFEST['avatar-explorer'].url);
    expect(getAssetUrl('animal-panda')).toBe(ASSET_MANIFEST['animal-panda'].url);
    expect(getPreloadUrls().length).toBe(Object.keys(ASSET_MANIFEST).length);

    for (const entry of Object.values(ASSET_MANIFEST)) {
      expect(entry.zones.length).toBeGreaterThan(0);
      expect(entry.zones).toContain(entry.zoneId);
      expect(entry.sizeBytes).toBeGreaterThan(100);
      expect(entry.contentHash).toMatch(/^[0-9a-f]{8}$/);
      expect(entry.url).toBe(`/assets/models/${entry.id}.${entry.contentHash}.glb`);
    }
  });

  it('declares zone-to-asset mapping and shared 20-colour palette (FR-002, FR-008)', () => {
    expect(Object.keys(ZOO_PALETTE)).toHaveLength(20);
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

  it('verifies every manifest URL exists in apps/web/public with matching sizeBytes, contentHash, glTF 2.0 header, and palette materials', () => {
    const paletteKeys = new Set(Object.keys(ZOO_PALETTE));
    const manifestFilenames = new Set<string>();

    for (const entry of Object.values(ASSET_MANIFEST)) {
      const fullPath = path.join(PUBLIC_ROOT, entry.url);
      expect(fs.existsSync(fullPath)).toBe(true);
      manifestFilenames.add(path.basename(fullPath));

      const stat = fs.statSync(fullPath);
      expect(stat.size).toBe(entry.sizeBytes);

      const buf = fs.readFileSync(fullPath);
      expect(buf.byteLength).toBe(entry.sizeBytes);

      const actualHash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
      expect(actualHash).toBe(entry.contentHash);

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

    // Ensure no unhashed or orphan .glb files exist in apps/web/public/assets/models
    const filesOnDisk = fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.glb'));
    expect(new Set(filesOnDisk)).toEqual(manifestFilenames);
  });

  it('preloads only the requested zone assets and caches visited zones in memory for the session', () => {
    const preloadedCalls: string[] = [];
    const newlyLoadedLobby = preloadZoneAssets('zoo-lobby', (url) => preloadedCalls.push(url));

    expect(newlyLoadedLobby).toHaveLength(6);
    expect(preloadedCalls).toEqual(getPreloadUrlsForZone('zoo-lobby'));
    expect(isZoneLoaded('zoo-lobby')).toBe(true);
    expect(isZoneLoaded('panda-forest')).toBe(false);
    expect(getLoadedZones()).toEqual(['zoo-lobby']);
    expect(getZoneTransferBytes('zoo-lobby')).toBe(30488);

    // Re-preloading zoo-lobby in the same session should be a no-op
    const repeatLobby = preloadZoneAssets('zoo-lobby', (url) => preloadedCalls.push(url));
    expect(repeatLobby).toHaveLength(0);
    expect(preloadedCalls).toHaveLength(6);

    // Crossing gate into panda-forest loads only the 8 assets not already loaded in zoo-lobby
    const newlyLoadedForest = preloadZoneAssets('panda-forest', (url) => preloadedCalls.push(url));
    expect(newlyLoadedForest).toHaveLength(8);
    expect(isZoneLoaded('panda-forest')).toBe(true);
    expect(getLoadedZones()).toEqual(['zoo-lobby', 'panda-forest']);
    expect(getPreloadedAssetUrls()).toHaveLength(14);
  });

  it('verifies next.config.mjs immutable /assets/* caching, per-zone loading in ZooGameCanvas, and ASSETS.md documentation', () => {
    const repoRoot = path.resolve(__dirname, '../../..');
    const nextConfigSource = fs.readFileSync(
      path.join(repoRoot, 'apps/web/next.config.mjs'),
      'utf8'
    );
    expect(nextConfigSource).toContain("source: '/assets/:path*'");
    expect(nextConfigSource).toContain('public, max-age=31536000, immutable');

    const canvasSource = fs.readFileSync(
      path.join(repoRoot, 'packages/game-client/src/runtime/ZooGameCanvas.tsx'),
      'utf8'
    );
    expect(canvasSource).toContain('preloadZoneGlbAssets');
    expect(canvasSource).not.toContain('getPreloadUrls()');

    const assetsDocPath = path.join(repoRoot, 'ASSETS.md');
    expect(fs.existsSync(assetsDocPath)).toBe(true);
    const assetsDoc = fs.readFileSync(assetsDocPath, 'utf8');
    expect(assetsDoc).toContain('Manifest v2');
    expect(assetsDoc).toContain('public, max-age=31536000, immutable');
  });

  it('clears cached scenes cleanly via clearAssetCache', () => {
    expect(() => assetRegistry.clearAssetCache()).not.toThrow();
  });
});
