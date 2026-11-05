# Data Model: Art Style Unification (`art-style-unification`)

## 1. Asset Manifest Additions (`@online-zoo/game-assets`)

```ts
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

export const ANIMAL_SPECIES_TO_ASSET_ID: Record<'panda' | 'penguin' | 'otter', AnimalAssetId> = {
  panda: 'animal-panda',
  penguin: 'animal-penguin',
  otter: 'animal-otter'
};
```

## 2. Shared Palette Materials Module (`packages/game-client/src/materials/paletteMaterials.ts`)

- Exports `PALETTE_COLORS` (aliased from `ZOO_PALETTE` in `@online-zoo/game-assets`).
- Exports `PALETTE_MATERIALS`: pre-constructed `THREE.MeshStandardMaterial` and `THREE.MeshBasicMaterial` instances with `flatShading: true` for terrain, paths, water, fences, foliage, and UI beacons.
- Exports `createFlatStandardMaterial(colorKey, options)` helper for dynamic palette-bound flat-shaded materials.

