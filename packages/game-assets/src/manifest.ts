export type AssetId =
  | 'avatar-explorer'
  | 'prop-bamboo-cluster'
  | 'prop-stone-lantern'
  | 'prop-habitat-plaque'
  | 'prop-wind-chime'
  | 'prop-wooden-bench';

export interface AssetManifestEntry {
  id: AssetId;
  url: string;
  category: 'character' | 'environment' | 'interactive-prop';
  preload: boolean;
  boundingRadius: number;
}

export const ASSET_MANIFEST: Record<AssetId, AssetManifestEntry> = {
  'avatar-explorer': {
    id: 'avatar-explorer',
    url: '/assets/models/avatar-explorer.glb',
    category: 'character',
    preload: true,
    boundingRadius: 0.9
  },
  'prop-bamboo-cluster': {
    id: 'prop-bamboo-cluster',
    url: '/assets/models/prop-bamboo-cluster.glb',
    category: 'environment',
    preload: true,
    boundingRadius: 1.5
  },
  'prop-stone-lantern': {
    id: 'prop-stone-lantern',
    url: '/assets/models/prop-stone-lantern.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.2
  },
  'prop-habitat-plaque': {
    id: 'prop-habitat-plaque',
    url: '/assets/models/prop-habitat-plaque.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.1
  },
  'prop-wind-chime': {
    id: 'prop-wind-chime',
    url: '/assets/models/prop-wind-chime.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.4
  },
  'prop-wooden-bench': {
    id: 'prop-wooden-bench',
    url: '/assets/models/prop-wooden-bench.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.3
  }
};

export function getAssetUrl(id: AssetId): string {
  return ASSET_MANIFEST[id].url;
}

export function getPreloadUrls(): string[] {
  return Object.values(ASSET_MANIFEST)
    .filter((entry) => entry.preload)
    .map((entry) => entry.url);
}

