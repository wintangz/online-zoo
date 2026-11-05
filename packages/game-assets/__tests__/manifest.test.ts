import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ASSET_MANIFEST,
  assetRegistry,
  getAssetsForZone,
  getAssetUrl,
  getPreloadUrls,
  getPreloadUrlsForZone,
  ZOO_PALETTE
} from '../src';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ROOT = path.resolve(__dirname, '../../../apps/web/public');

describe('@online-zoo/game-assets manifest & generated GLB files', () => {
  it('defines all 6 canonical asset entries and preload URLs', () => {
    const ids = Object.keys(ASSET_MANIFEST);
    expect(ids).toEqual([
      'avatar-explorer',
      'prop-bamboo-cluster',
      'prop-stone-lantern',
      'prop-habitat-plaque',
      'prop-wind-chime',
      'prop-wooden-bench'
    ]);
    expect(getPreloadUrls()).toHaveLength(6);
    expect(getAssetUrl('avatar-explorer')).toBe('/assets/models/avatar-explorer.glb');
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
      'prop-wooden-bench'
    ]);
    expect(pandaAssets).toHaveLength(6);
    expect(getPreloadUrlsForZone('zoo-lobby')).toHaveLength(4);
    expect(getPreloadUrlsForZone('panda-forest')).toHaveLength(6);
  });

  it('verifies generated binary .glb files exist on disk with valid glTF 2.0 header', () => {
    for (const entry of Object.values(ASSET_MANIFEST)) {
      const fullPath = path.join(PUBLIC_ROOT, entry.url);
      expect(fs.existsSync(fullPath)).toBe(true);
      const buf = fs.readFileSync(fullPath);
      expect(buf.byteLength).toBeGreaterThan(100);
      // Magic header 'glTF' (0x46546C67) and version 2
      expect(buf.readUInt32LE(0)).toBe(0x46546c67);
      expect(buf.readUInt32LE(4)).toBe(2);
    }
  });

  it('clears cached scenes cleanly via clearAssetCache', () => {
    expect(() => assetRegistry.clearAssetCache()).not.toThrow();
  });
});
