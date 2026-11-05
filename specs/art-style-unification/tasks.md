# Tasks: Art Style Unification (`art-style-unification`)

**Input**: Design documents from `/specs/art-style-unification/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

## Phase 1: Palette-Driven GLB Asset Generation & Manifest Registration (`@online-zoo/game-assets`)

- [X] T001 Update `packages/game-assets/scripts/generate-glb-assets.mjs` to build all `.glb` models strictly from `ZOO_PALETTE` colors with flat face normals, adding `'animal-panda'`, `'animal-penguin'`, `'animal-otter'`, `'prop-food-stall'`, `'prop-cafe-table'`, `'prop-picnic-table'`, `'prop-ticket-booth'`, and `'prop-fountain'` while restyling the existing 6 assets
- [X] T002 Update `packages/game-assets/src/manifest.ts` to register the animal and prop `.glb` assets, export `ANIMAL_SPECIES_TO_ASSET_ID` and `getAnimalAssetId`, and preserve the exact IDs and `boundingRadius` values of the existing 6 entries
- [X] T003 Update `packages/game-assets/__tests__/manifest.test.ts` to verify all manifest entries, preserved bounding radii, animal species mapping, and `.glb` generation

---

## Phase 2: Shared Palette Materials & Scene/Entity Refactor (`@online-zoo/game-client`)

- [X] T004 Create `packages/game-client/src/materials/paletteMaterials.ts` exporting `PALETTE_COLORS`, `PALETTE_MATERIALS`, and flat-shaded material helpers derived from `ZOO_PALETTE`, and export it from `packages/game-client/src/index.ts`
- [X] T005 Refactor `packages/game-client/src/entities/ZooAnimalsLayer.tsx` to load and render the `'animal-panda'`, `'animal-penguin'`, and `'animal-otter'` `.glb` models from `ASSET_MANIFEST` via `useGLTF(getAssetUrl(getAnimalAssetId(speciesId)))` and use `paletteMaterials.ts` with zero color literals
- [X] T006 Refactor `packages/game-client/src/entities/AvatarVisualRig.tsx`, `PlayerAvatarEntity.tsx`, and `RemotePlayerAvatar.tsx` to use flat-shaded palette materials and eliminate all color literals
- [X] T007 Refactor `packages/game-client/src/environment/TerrainAndPaths.tsx`, `PerimeterEnclosure.tsx`, `PondShoreline.tsx`, `InstancedFoliage.tsx`, `InteractiveProps.tsx`, `PandaForestScene.tsx`, and `ZooLobbyScene.tsx` so code-built geometry remains only for terrain, paths, water, and fences using `paletteMaterials.ts`, props load from `ASSET_MANIFEST`, and zero color literals appear in any scene/entity file

---

## Phase 3: Automated Compliance Test & Full Verification

- [X] T008 Create `packages/game-client/__tests__/artStyleCompliance.test.ts` that scans all scene/entity files in `packages/game-client/src/` and fails if any file uses a color literal (`#...`, `rgb(...)`, `hsl(...)`, `0x...`) outside `paletteMaterials.ts` or references a model ID missing from `ASSET_MANIFEST`
- [X] T009 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E tests and verify all checks pass

