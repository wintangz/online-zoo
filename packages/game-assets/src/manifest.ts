export type AssetId =
  | 'avatar-explorer'
  | 'prop-bamboo-cluster'
  | 'prop-stone-lantern'
  | 'prop-habitat-plaque'
  | 'prop-wind-chime'
  | 'prop-wooden-bench';

export type AssetZoneId = 'zoo-lobby' | 'panda-forest';

export const ZOO_PALETTE = {
  leafCanopy: '#3a7d44',
  meadowGrass: '#68a357',
  mossShadow: '#254d32',
  bambooStalk: '#8fc93a',
  stonePath: '#d6cfc2',
  graniteSlate: '#7d8491',
  charcoalFur: '#22272e',
  snowCream: '#f7f5fb',
  warmTimber: '#8c5a3c',
  cedarBark: '#5c3a21',
  terracottaRoof: '#c85a32',
  sunflowerGold: '#f4b942',
  lanternAmber: '#ff9f1c',
  pondTeal: '#2ec4b6',
  deepWater: '#1a659e',
  blossomPink: '#ff8fa3',
  otterCinnamon: '#9c6644',
  otterBuff: '#e0b084',
  skyMist: '#cfe8ef',
  coralAccent: '#e76f51'
} as const;

export type ZooPaletteColorKey = keyof typeof ZOO_PALETTE;

export interface AssetManifestEntry {
  id: AssetId;
  url: string;
  category: 'character' | 'environment' | 'interactive-prop';
  preload: boolean;
  boundingRadius: number;
  zones: AssetZoneId[];
}

export const ASSET_MANIFEST: Record<AssetId, AssetManifestEntry> = {
  'avatar-explorer': {
    id: 'avatar-explorer',
    url: '/assets/models/avatar-explorer.glb',
    category: 'character',
    preload: true,
    boundingRadius: 0.9,
    zones: ['zoo-lobby', 'panda-forest']
  },
  'prop-bamboo-cluster': {
    id: 'prop-bamboo-cluster',
    url: '/assets/models/prop-bamboo-cluster.glb',
    category: 'environment',
    preload: true,
    boundingRadius: 1.5,
    zones: ['panda-forest']
  },
  'prop-stone-lantern': {
    id: 'prop-stone-lantern',
    url: '/assets/models/prop-stone-lantern.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.2,
    zones: ['zoo-lobby', 'panda-forest']
  },
  'prop-habitat-plaque': {
    id: 'prop-habitat-plaque',
    url: '/assets/models/prop-habitat-plaque.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.1,
    zones: ['zoo-lobby', 'panda-forest']
  },
  'prop-wind-chime': {
    id: 'prop-wind-chime',
    url: '/assets/models/prop-wind-chime.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.4,
    zones: ['panda-forest']
  },
  'prop-wooden-bench': {
    id: 'prop-wooden-bench',
    url: '/assets/models/prop-wooden-bench.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.3,
    zones: ['zoo-lobby', 'panda-forest']
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

export function getAssetsForZone(zoneId: AssetZoneId): AssetManifestEntry[] {
  return Object.values(ASSET_MANIFEST).filter((entry) => entry.zones.includes(zoneId));
}

export function getPreloadUrlsForZone(zoneId: AssetZoneId): string[] {
  return getAssetsForZone(zoneId)
    .filter((entry) => entry.preload)
    .map((entry) => entry.url);
}
