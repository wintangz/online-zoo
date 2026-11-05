# Research: Art Style Unification (`art-style-unification`)

## Decision 1: Flat-Shaded Low-Poly GLB Generation from `ZOO_PALETTE`
- **Decision**: Extend `packages/game-assets/scripts/generate-glb-assets.mjs` to define `ZOO_PALETTE` in hex and normalized RGBA `[r, g, b, 1.0]`, and generate multi-part faceted low-poly `.glb` models with hard face normals (`flat-shaded`) for:
  - Existing 6 entries (preserving exact IDs and bounding radii): `'avatar-explorer'` (`0.9`), `'prop-bamboo-cluster'` (`1.5`), `'prop-stone-lantern'` (`1.2`), `'prop-habitat-plaque'` (`1.1`), `'prop-wind-chime'` (`1.4`), `'prop-wooden-bench'` (`1.3`)
  - Animal roster entries: `'animal-panda'`, `'animal-penguin'`, `'animal-otter'`
  - Dining & lobby prop entries: `'prop-food-stall'`, `'prop-cafe-table'`, `'prop-picnic-table'`, `'prop-ticket-booth'`, `'prop-fountain'`
- **Rationale**: Ensures every animal and prop is a real binary `.glb` registered in `ASSET_MANIFEST` and built exclusively from `ZOO_PALETTE`, eliminating code-assembled primitive stacks in `ZooAnimalsLayer.tsx`, `InteractiveProps.tsx`, and `ZooLobbyScene.tsx`.

## Decision 2: Shared Palette Materials Module (`paletteMaterials.ts`)
- **Decision**: Create `packages/game-client/src/materials/paletteMaterials.ts` as the single source of truth for Three.js materials and color values in `@online-zoo/game-client`. All scene and entity files import `PALETTE_COLORS` and `PALETTE_MATERIALS` from `../materials/paletteMaterials`.
- **Rationale**: Centralizes `flatShading: true` material definitions and allows `artStyleCompliance.test.ts` to strictly forbid `#...`, `rgb(...)`, `hsl(...)`, and `0x...` literals in every other file in `packages/game-client/src/`.

