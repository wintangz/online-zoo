# Feature Specification: Art Style Unification (`art-style-unification`)

**Feature Branch**: `fix/art-style-unification`  
**Created**: 2026-11-05  
**Status**: Draft  
**Input**: User description: "art-style-unification: Client + assets only; apps/server untouched. Write a style guide in the spec: flat-shaded low-poly; a fixed shared palette of ~20 named colours defined in @online-zoo/game-assets; vertex colours or palette materials only; NO photographic textures; NO smooth-shaded primitives with one-off hex colours. Animals become real low-poly GLB models registered in the asset manifest, built from the palette, flat-shaded — no more code-assembled primitive stacks in ZooAnimalsLayer.tsx. Start with the current animal roster (panda, penguin, otter); the pipeline must let future animals slot in as new manifest entries. Rendering only — server animal state/authority unchanged. Restyle the existing avatar and prop models to the guide, keeping their manifest ids and bounding radii so gameplay/server code does not change. Code-built geometry may remain ONLY for terrain, paths, water, and fences, using palette materials from one shared materials module — no colour literals anywhere else in scene files. Add an automated test/check that fails when a scene/entity file uses a colour literal (#..., rgb(...), hsl(...), 0x...) outside the shared palette module, or references a model missing from the manifest."

## Art Style Guide — Flat-Shaded Low-Poly Sanctuary

### 1. Core Visual Identity
- **Shading**: Strictly **flat-shaded low-poly** (`flatShading: true` on all `THREE.MeshStandardMaterial` instances; hard per-face normals in generated `.glb` assets).
- **Textures**: **Zero photographic or bitmap textures**. All surfaces derive their visual identity from clean faceted silhouettes and the shared named color palette (`ZOO_PALETTE`).
- **Forbidden Patterns**:
  - Smooth-shaded primitives (`sphereGeometry` with high segments and smooth normals) using ad-hoc hex colors.
  - Inline color literals (`#...`, `rgb(...)`, `hsl(...)`, `0x...`) anywhere in scene or entity files outside the shared palette/materials module.
  - Code-assembled primitive stacks for animals or props where a registered `.glb` asset belongs.

### 2. Fixed Shared 20-Color Named Palette (`ZOO_PALETTE` in `@online-zoo/game-assets`)
All 3D assets, materials, lights, and sky/fog accents must reference only these 20 named colors defined in `@online-zoo/game-assets`:

| Palette Key | Hex Value | Primary Usage |
| :--- | :--- | :--- |
| `leafCanopy` | `#3a7d44` | Tree canopies, sanctuary arches, primary ranger jacket |
| `meadowGrass` | `#68a357` | Main ground turf, grassy clearings |
| `mossShadow` | `#254d32` | Deep foliage shadows, inner habitat rings, dark trim |
| `bambooStalk` | `#8fc93a` | Bamboo stalks, fresh shoots, available seat indicators |
| `stonePath` | `#d6cfc2` | Flagstone paths, arrival terraces, fountain basins |
| `graniteSlate` | `#7d8491` | Boulders, lantern stone, perimeter wall base, penguin dorsal |
| `charcoalFur` | `#22272e` | Panda limbs/ears/patches, penguin head/flippers, dark eyes |
| `snowCream` | `#f7f5fb` | Panda body/head, penguin belly, cloud clusters, warm highlights |
| `warmTimber` | `#8c5a3c` | Wooden benches, kiosks, picnic tables, explorer backpack |
| `cedarBark` | `#5c3a21` | Tree trunks, gate pillars, support posts, dark timber |
| `terracottaRoof` | `#c85a32` | Sanctuary gate pillars, kiosk awnings, festive arches |
| `sunflowerGold` | `#f4b942` | Roof trim, plaques, focus beacon, gold accents |
| `lanternAmber` | `#ff9f1c` | Lit lantern glow, penguin beak/feet, active emissive accents |
| `pondTeal` | `#2ec4b6` | Lotus pond surface, fountain water, water bottle prop |
| `deepWater` | `#1a659e` | Penguin cove pool, deep water emissive tint |
| `blossomPink` | `#ff8fa3` | Lotus blooms, spring festival accents, ice cream scoop |
| `otterCinnamon` | `#9c6644` | River otter body/tail, forage basket, warm earth |
| `otterBuff` | `#e0b084` | Otter snout/belly patch, safari hat, wooden countertops |
| `skyMist` | `#cfe8ef` | Sky dome background, horizon fog, distant mountain mist |
| `coralAccent` | `#e76f51` | Occupied seat indicator, festive ornaments, popcorn cup |

### 3. Asset & Geometry Rules
- **Animals**: Every species in the roster (`panda` → `'animal-panda'`, `penguin` → `'animal-penguin'`, `otter` → `'animal-otter'`) is a flat-shaded low-poly `.glb` model registered in `ASSET_MANIFEST` and built from `ZOO_PALETTE`. Future animal species slot in by adding a new `AssetId` entry (`animal-<species>`) and `ANIMAL_MODEL_ASSET_IDS` mapping.
- **Avatars & Props**: Existing manifest assets (`avatar-explorer`, `prop-bamboo-cluster`, `prop-stone-lantern`, `prop-habitat-plaque`, `prop-wind-chime`, `prop-wooden-bench`) plus dining/kiosk props (`prop-food-stall`, `prop-cafe-table`, `prop-picnic-table`) are built from `ZOO_PALETTE` with flat per-face normals, keeping existing manifest IDs and bounding radii intact.
- **Code-Built Geometry**: Permitted **only** for terrain, paths, water, and fences (plus dynamic procedural avatar limb/customization attachments and physics colliders), using shared flat-shaded palette materials from `packages/game-client/src/materials/paletteMaterials.ts`.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Low-Poly GLB Animal Roster (Priority: P1)

Visitors exploring Panda Forest see the Giant Panda, Humboldt Penguin, and Asian Small-Clawed Otter rendered as cohesive flat-shaded low-poly `.glb` models loaded from `ASSET_MANIFEST`, rather than smooth-shaded primitive sphere/capsule stacks in `ZooAnimalsLayer.tsx`.

**Why this priority**: Animals are the centerpiece of Online Zoo and previously used ad-hoc smooth-shaded sphere/cylinder stacks with hardcoded hex literals.

**Independent Test**: Load `ASSET_MANIFEST` and `ZooAnimalsLayer.tsx` and verify `animal-panda`, `animal-penguin`, and `animal-otter` are registered `.glb` files generated from `ZOO_PALETTE` and rendered via `useGLTF`.

**Acceptance Scenarios**:

1. **Given** `ASSET_MANIFEST` in `@online-zoo/game-assets`, **When** inspected, **Then** it includes `'animal-panda'`, `'animal-penguin'`, and `'animal-otter'` with valid `.glb` files built strictly from `ZOO_PALETTE` colors.
2. **Given** `ZooAnimalsLayer.tsx`, **When** rendering animals, **Then** it loads the species `.glb` model from `ASSET_MANIFEST` via `ANIMAL_SPECIES_TO_ASSET_ID` without code-assembled primitive stacks or inline hex literals.

---

### User Story 2 - Restyled Avatar & Prop Models + Shared Palette Materials (Priority: P1)

All existing avatar and prop `.glb` models (`avatar-explorer`, `prop-bamboo-cluster`, `prop-stone-lantern`, `prop-habitat-plaque`, `prop-wind-chime`, `prop-wooden-bench`) are restyled to `ZOO_PALETTE` while keeping their exact manifest IDs and bounding radii. Code-built geometry in scenes is limited to terrain, paths, water, and fences using materials from one shared palette materials module (`paletteMaterials.ts`).

**Why this priority**: Ensures complete visual cohesion across Zoo Lobby and Panda Forest without altering any server state or collision radii.

**Independent Test**: Verify `manifest.test.ts` confirms all manifest IDs and bounding radii remain unchanged and all `.glb` files only use `ZOO_PALETTE` colors.

**Acceptance Scenarios**:

1. **Given** the existing 6 manifest IDs (`avatar-explorer`, `prop-bamboo-cluster`, `prop-stone-lantern`, `prop-habitat-plaque`, `prop-wind-chime`, `prop-wooden-bench`), **When** `art-style-unification` is applied, **Then** their `id` and `boundingRadius` values remain identical to pre-unification values.
2. **Given** terrain, paths, water, and fences across `PandaForestScene` and `ZooLobbyScene`, **When** rendered, **Then** they use shared flat-shaded materials from `paletteMaterials.ts`.

---

### User Story 3 - Automated Art Style & Manifest Compliance Check (Priority: P1)

An automated test (`packages/game-client/__tests__/artStyleCompliance.test.ts`) scans all scene and entity files in `packages/game-client/src/` and fails if any file uses a color literal (`#...`, `rgb(...)`, `hsl(...)`, `0x...`) outside the shared palette module, or references an asset ID missing from `ASSET_MANIFEST`.

**Why this priority**: Prevents regressions and enforces the art style law automatically on every `pnpm test` run.

**Independent Test**: Run `pnpm test` and verify `artStyleCompliance.test.ts` scans every `.ts`/`.tsx` file in `packages/game-client/src/` and passes with zero violations.

**Acceptance Scenarios**:

1. **Given** any scene or entity file in `packages/game-client/src/` outside `paletteMaterials.ts`, **When** scanned by `artStyleCompliance.test.ts`, **Then** zero `#...`, `rgb(...)`, `hsl(...)`, or `0x...` color literals are present.
2. **Given** any `getAssetUrl(...)` reference in `packages/game-client/src/`, **When** scanned by `artStyleCompliance.test.ts`, **Then** every referenced ID exists in `ASSET_MANIFEST`.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `apps/server` MUST remain completely untouched by `art-style-unification`.
- **FR-002**: `@online-zoo/game-assets` MUST define the 20-color `ZOO_PALETTE` and register flat-shaded low-poly `.glb` models built strictly from `ZOO_PALETTE` for the animal roster (`animal-panda`, `animal-penguin`, `animal-otter`), avatar (`avatar-explorer`), and interactive/environment props (`prop-bamboo-cluster`, `prop-stone-lantern`, `prop-habitat-plaque`, `prop-wind-chime`, `prop-wooden-bench`, `prop-food-stall`, `prop-cafe-table`, `prop-picnic-table`).
- **FR-003**: Existing manifest entries (`avatar-explorer`, `prop-bamboo-cluster`, `prop-stone-lantern`, `prop-habitat-plaque`, `prop-wind-chime`, `prop-wooden-bench`) MUST preserve their exact `id` and `boundingRadius` values.
- **FR-004**: `ZooAnimalsLayer.tsx` MUST render animals using their `.glb` models from `ASSET_MANIFEST` (mapped by species ID so future animals slot in as new manifest entries) instead of code-assembled primitive stacks.
- **FR-005**: `packages/game-client/src/materials/paletteMaterials.ts` MUST provide shared flat-shaded palette materials and color tokens derived from `ZOO_PALETTE`. No scene or entity file in `packages/game-client/src/` outside `paletteMaterials.ts` may contain color literals (`#...`, `rgb(...)`, `hsl(...)`, `0x...`).
- **FR-006**: Code-built environment geometry in scene files MUST be limited to terrain, paths, water, and fences (plus instanced natural boundary markers/foliage and colliders) using the shared palette materials module.
- **FR-007**: Automated tests MUST fail if any scene/entity file uses a color literal outside the shared palette module or references a model missing from `ASSET_MANIFEST`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scene and entity files in `packages/game-client/src/` (outside `paletteMaterials.ts`) contain `0` color literals (`#...`, `rgb(...)`, `hsl(...)`, `0x...`).
- **SC-002**: 100% of `getAssetUrl(...)` model references in `packages/game-client/src/` resolve to valid entries in `ASSET_MANIFEST` with generated `.glb` binaries on disk.
- **SC-003**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E tests pass with zero errors.

