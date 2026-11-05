export type AnimalAssetId = 'animal-panda' | 'animal-penguin' | 'animal-otter';

export type AssetId =
  | 'avatar-explorer'
  | 'prop-bamboo-cluster'
  | 'prop-stone-lantern'
  | 'prop-habitat-plaque'
  | 'prop-wind-chime'
  | 'prop-wooden-bench'
  | 'prop-food-stall'
  | 'prop-cafe-table'
  | 'prop-picnic-table'
  | 'prop-ticket-booth'
  | 'prop-fountain'
  | AnimalAssetId;

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

export const ANIMAL_SPECIES_TO_ASSET_ID: Record<'panda' | 'penguin' | 'otter', AnimalAssetId> = {
  panda: 'animal-panda',
  penguin: 'animal-penguin',
  otter: 'animal-otter'
};

export const MANIFEST_VERSION = 2 as const;

export interface AssetManifestEntry {
  id: AssetId;
  url: string;
  category: 'character' | 'environment' | 'interactive-prop';
  preload: boolean;
  boundingRadius: number;
  zoneId: AssetZoneId;
  zones: AssetZoneId[];
  sizeBytes: number;
  contentHash: string;
}

export const ASSET_MANIFEST: Record<AssetId, AssetManifestEntry> = {
  'avatar-explorer': {
    id: 'avatar-explorer',
    url: '/assets/models/avatar-explorer.b5792409.glb',
    category: 'character',
    preload: true,
    boundingRadius: 0.9,
    zoneId: 'zoo-lobby',
    zones: ['zoo-lobby', 'panda-forest'],
    sizeBytes: 6508,
    contentHash: 'b5792409'
  },
  'prop-bamboo-cluster': {
    id: 'prop-bamboo-cluster',
    url: '/assets/models/prop-bamboo-cluster.e531c805.glb',
    category: 'environment',
    preload: true,
    boundingRadius: 1.5,
    zoneId: 'panda-forest',
    zones: ['panda-forest'],
    sizeBytes: 4616,
    contentHash: 'e531c805'
  },
  'prop-stone-lantern': {
    id: 'prop-stone-lantern',
    url: '/assets/models/prop-stone-lantern.c50f35d4.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.2,
    zoneId: 'zoo-lobby',
    zones: ['zoo-lobby', 'panda-forest'],
    sizeBytes: 4612,
    contentHash: 'c50f35d4'
  },
  'prop-habitat-plaque': {
    id: 'prop-habitat-plaque',
    url: '/assets/models/prop-habitat-plaque.dbed8168.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.1,
    zoneId: 'zoo-lobby',
    zones: ['zoo-lobby', 'panda-forest'],
    sizeBytes: 4616,
    contentHash: 'dbed8168'
  },
  'prop-wind-chime': {
    id: 'prop-wind-chime',
    url: '/assets/models/prop-wind-chime.a5978ba1.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.4,
    zoneId: 'panda-forest',
    zones: ['panda-forest'],
    sizeBytes: 6512,
    contentHash: 'a5978ba1'
  },
  'prop-wooden-bench': {
    id: 'prop-wooden-bench',
    url: '/assets/models/prop-wooden-bench.e9d4fd30.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.3,
    zoneId: 'zoo-lobby',
    zones: ['zoo-lobby', 'panda-forest'],
    sizeBytes: 4608,
    contentHash: 'e9d4fd30'
  },
  'animal-panda': {
    id: 'animal-panda',
    url: '/assets/models/animal-panda.d4f67abf.glb',
    category: 'character',
    preload: true,
    boundingRadius: 1.1,
    zoneId: 'panda-forest',
    zones: ['panda-forest'],
    sizeBytes: 12224,
    contentHash: 'd4f67abf'
  },
  'animal-penguin': {
    id: 'animal-penguin',
    url: '/assets/models/animal-penguin.b00d605a.glb',
    category: 'character',
    preload: true,
    boundingRadius: 0.75,
    zoneId: 'panda-forest',
    zones: ['panda-forest'],
    sizeBytes: 10328,
    contentHash: 'b00d605a'
  },
  'animal-otter': {
    id: 'animal-otter',
    url: '/assets/models/animal-otter.44089dd4.glb',
    category: 'character',
    preload: true,
    boundingRadius: 0.85,
    zoneId: 'panda-forest',
    zones: ['panda-forest'],
    sizeBytes: 10300,
    contentHash: '44089dd4'
  },
  'prop-food-stall': {
    id: 'prop-food-stall',
    url: '/assets/models/prop-food-stall.8858c1e6.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.8,
    zoneId: 'panda-forest',
    zones: ['panda-forest'],
    sizeBytes: 8424,
    contentHash: '8858c1e6'
  },
  'prop-cafe-table': {
    id: 'prop-cafe-table',
    url: '/assets/models/prop-cafe-table.075cef39.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.4,
    zoneId: 'panda-forest',
    zones: ['panda-forest'],
    sizeBytes: 4584,
    contentHash: '075cef39'
  },
  'prop-picnic-table': {
    id: 'prop-picnic-table',
    url: '/assets/models/prop-picnic-table.19f4edde.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.5,
    zoneId: 'panda-forest',
    zones: ['panda-forest'],
    sizeBytes: 5564,
    contentHash: '19f4edde'
  },
  'prop-ticket-booth': {
    id: 'prop-ticket-booth',
    url: '/assets/models/prop-ticket-booth.0ea43e4f.glb',
    category: 'environment',
    preload: true,
    boundingRadius: 1.9,
    zoneId: 'zoo-lobby',
    zones: ['zoo-lobby'],
    sizeBytes: 5572,
    contentHash: '0ea43e4f'
  },
  'prop-fountain': {
    id: 'prop-fountain',
    url: '/assets/models/prop-fountain.84170130.glb',
    category: 'interactive-prop',
    preload: true,
    boundingRadius: 1.6,
    zoneId: 'zoo-lobby',
    zones: ['zoo-lobby'],
    sizeBytes: 4572,
    contentHash: '84170130'
  }
};

export function getAssetUrl(id: AssetId): string {
  return ASSET_MANIFEST[id].url;
}

export function getAnimalAssetId(speciesId: 'panda' | 'penguin' | 'otter'): AnimalAssetId {
  return ANIMAL_SPECIES_TO_ASSET_ID[speciesId];
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
