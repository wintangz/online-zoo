# Implementation Plan: Art Style Unification (`art-style-unification`)

**Branch**: `fix/art-style-unification` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/art-style-unification/spec.md`

## Summary

Unify the 3D visual style across Online Zoo around a strict flat-shaded low-poly art direction using the 20-color shared `ZOO_PALETTE` in `@online-zoo/game-assets`:
1. Generate flat-shaded low-poly `.glb` models from `ZOO_PALETTE` for the animal roster (`animal-panda`, `animal-penguin`, `animal-otter`), restyle the existing 6 avatar/prop `.glb` models without changing their IDs or bounding radii, and add `.glb` models for dining/lobby props (`prop-food-stall`, `prop-cafe-table`, `prop-picnic-table`, `prop-ticket-booth`, `prop-fountain`).
2. Replace the code-assembled primitive stacks in `ZooAnimalsLayer.tsx` with `useGLTF` loading of the registered animal `.glb` models.
3. Create `packages/game-client/src/materials/paletteMaterials.ts` providing shared flat-shaded palette materials and refactor all scene and entity files in `packages/game-client/src/` so code-built geometry remains only for terrain, paths, water, and fences, with zero color literals (`#...`, `rgb(...)`, `hsl(...)`, `0x...`) anywhere outside `paletteMaterials.ts`.
4. Add an automated compliance test (`packages/game-client/__tests__/artStyleCompliance.test.ts`) that fails if any scene/entity file uses a color literal outside `paletteMaterials.ts` or references a model missing from `ASSET_MANIFEST`.

## Technical Context

**Language/Version**: TypeScript 5.6 (Node >= 20, React 18, Three.js / React Three Fiber)  
**Primary Dependencies**: `@online-zoo/game-assets`, `@online-zoo/game-client`, `@online-zoo/game-core`, `three`, `@react-three/fiber`, `@react-three/drei`  
**Storage**: Deterministic binary `.glb` files generated in `apps/web/public/assets/models/`  
**Testing**: Vitest (`pnpm test`), TypeScript (`pnpm typecheck`), Playwright E2E  
**Target Platform**: Browser WebGL (`@online-zoo/game-client`)  
**Project Type**: Turborepo monorepo (`packages/game-assets`, `packages/game-client`)  
**Constraints**: `apps/server` untouched; existing manifest IDs and bounding radii preserved; zero color literals outside `paletteMaterials.ts`.

## Constitution Check

- **Architecture Law**: `apps/server` is completely untouched; all changes are in `packages/game-assets` and `packages/game-client`.
- **Versioning Law**: Uses slug `art-style-unification` on branch `fix/art-style-unification`.

## Project Structure

### Documentation (this feature)

```text
specs/art-style-unification/
├── spec.md
├── ASSUMPTIONS.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/game-assets/
├── scripts/
│   └── generate-glb-assets.mjs      # Updated: generates flat-shaded GLBs from ZOO_PALETTE for animals, avatar, and props
├── src/
│   └── manifest.ts                  # Updated: registers animal-panda, animal-penguin, animal-otter & prop GLBs + getAnimalAssetId
└── __tests__/
    └── manifest.test.ts             # Updated: verifies preserved bounding radii, animal GLB entries, and ZOO_PALETTE colors

packages/game-client/
├── src/
│   ├── materials/
│   │   └── paletteMaterials.ts      # New: shared flat-shaded palette materials & color tokens
│   ├── entities/
│   │   ├── ZooAnimalsLayer.tsx      # Refactored: renders GLB animal models from ASSET_MANIFEST
│   │   ├── AvatarVisualRig.tsx      # Refactored: uses palette materials, zero color literals
│   │   ├── PlayerAvatarEntity.tsx   # Verified zero color literals
│   │   └── RemotePlayerAvatar.tsx   # Verified zero color literals
│   └── environment/
│       ├── PandaForestScene.tsx     # Refactored: uses paletteMaterials, zero color literals
│       ├── ZooLobbyScene.tsx        # Refactored: uses GLB props & paletteMaterials, zero color literals
│       ├── TerrainAndPaths.tsx      # Refactored: uses paletteMaterials, zero color literals
│       ├── PerimeterEnclosure.tsx   # Refactored: uses paletteMaterials, zero color literals
│       ├── PondShoreline.tsx        # Refactored: uses paletteMaterials, zero color literals
│       ├── InstancedFoliage.tsx     # Refactored: uses paletteMaterials, zero color literals
│       └── InteractiveProps.tsx     # Refactored: uses GLB props & paletteMaterials, zero color literals
└── __tests__/
    └── artStyleCompliance.test.ts   # New: automated AST/regex scanner enforcing zero color literals & valid manifest refs
```

## Complexity Tracking

No constitution violations.

