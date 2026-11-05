# Online Zoo — 3D Asset Pipeline (`ASSETS.md`)

This document describes where 3D assets live, how the deterministic GLB builder and **Manifest v2** operate, how to add or update a 3D model, how per-zone loading and session caching work, and what a returning player re-downloads across visits.

---

## 1. Where Assets Live

Online Zoo enforces a strict separation between client assets and the standalone WebSocket game server:

- **Builder & Palette Source (`packages/game-assets/scripts/generate-glb-assets.mjs`)**: Deterministic Node script that constructs spec-compliant glTF 2.0 binary (`.glb`) models using flat-shaded low-poly primitives and materials restricted to the shared 20-colour `ZOO_PALETTE`.
- **Manifest v2 & Zone Loaders (`packages/game-assets/src/manifest.ts`, `packages/game-assets/src/loaders.ts`)**: Typed registry (`MANIFEST_VERSION = 2`) declaring every asset's `id`, content-hashed `url`, `category`, `preload`, `boundingRadius`, primary `zoneId`, `zones` array, exact `sizeBytes`, and 8-character SHA-256 `contentHash`.
- **Emitted Static Models (`apps/web/public/assets/models/<id>.<contentHash>.glb`)**: Content-hashed binary `.glb` files served statically by `apps/web`.
- **Server (`apps/server`)**: Ships **zero** 3D assets, textures, or static files.

---

## 2. Manifest v2 Schema

Every entry in `ASSET_MANIFEST` (`packages/game-assets/src/manifest.ts`) conforms to `AssetManifestEntry`:

```ts
export interface AssetManifestEntry {
  id: AssetId;
  url: string; // e.g. '/assets/models/avatar-explorer.b5792409.glb'
  category: 'character' | 'environment' | 'interactive-prop';
  preload: boolean;
  boundingRadius: number;
  zoneId: AssetZoneId; // Primary zone ('zoo-lobby' | 'panda-forest')
  zones: AssetZoneId[]; // All zones that reference this asset
  sizeBytes: number; // Exact byte length of the emitted .glb file
  contentHash: string; // 8-char lowercase hex SHA-256 prefix of the .glb bytes
}
```

### Current Registered Assets (14 Models)

| Asset ID | Content-Hashed URL | Primary `zoneId` | `zones` | `sizeBytes` | `contentHash` |
| --- | --- | --- | --- | --- | --- |
| `avatar-explorer` | `/assets/models/avatar-explorer.b5792409.glb` | `zoo-lobby` | `zoo-lobby`, `panda-forest` | `6,508 B` | `b5792409` |
| `prop-stone-lantern` | `/assets/models/prop-stone-lantern.c50f35d4.glb` | `zoo-lobby` | `zoo-lobby`, `panda-forest` | `4,612 B` | `c50f35d4` |
| `prop-habitat-plaque` | `/assets/models/prop-habitat-plaque.dbed8168.glb` | `zoo-lobby` | `zoo-lobby`, `panda-forest` | `4,616 B` | `dbed8168` |
| `prop-wooden-bench` | `/assets/models/prop-wooden-bench.e9d4fd30.glb` | `zoo-lobby` | `zoo-lobby`, `panda-forest` | `4,608 B` | `e9d4fd30` |
| `prop-ticket-booth` | `/assets/models/prop-ticket-booth.0ea43e4f.glb` | `zoo-lobby` | `zoo-lobby` | `5,572 B` | `0ea43e4f` |
| `prop-fountain` | `/assets/models/prop-fountain.84170130.glb` | `zoo-lobby` | `zoo-lobby` | `4,572 B` | `84170130` |
| `prop-bamboo-cluster` | `/assets/models/prop-bamboo-cluster.e531c805.glb` | `panda-forest` | `panda-forest` | `4,616 B` | `e531c805` |
| `prop-wind-chime` | `/assets/models/prop-wind-chime.a5978ba1.glb` | `panda-forest` | `panda-forest` | `6,512 B` | `a5978ba1` |
| `animal-panda` | `/assets/models/animal-panda.d4f67abf.glb` | `panda-forest` | `panda-forest` | `12,224 B` | `d4f67abf` |
| `animal-penguin` | `/assets/models/animal-penguin.b00d605a.glb` | `panda-forest` | `panda-forest` | `10,328 B` | `b00d605a` |
| `animal-otter` | `/assets/models/animal-otter.44089dd4.glb` | `panda-forest` | `panda-forest` | `10,300 B` | `44089dd4` |
| `prop-food-stall` | `/assets/models/prop-food-stall.8858c1e6.glb` | `panda-forest` | `panda-forest` | `8,424 B` | `8858c1e6` |
| `prop-cafe-table` | `/assets/models/prop-cafe-table.075cef39.glb` | `panda-forest` | `panda-forest` | `4,584 B` | `075cef39` |
| `prop-picnic-table` | `/assets/models/prop-picnic-table.19f4edde.glb` | `panda-forest` | `panda-forest` | `5,564 B` | `19f4edde` |

- **Lobby Zone (`zoo-lobby`) Total Model Transfer**: `30,488 bytes` (~29.8 KB across 6 `.glb` models).
- **All Zones Combined (14 `.glb` models)**: `93,040 bytes` (~90.9 KB).

---

## 3. How to Add a New 3D Model

Follow these 4 steps whenever adding or updating a 3D model:

1. **Export / Define the Low-Poly Model Using `ZOO_PALETTE`**:
   - Add your model definition to `ASSET_DEFINITIONS` in `packages/game-assets/scripts/generate-glb-assets.mjs` (or export a flat-shaded low-poly `.glb` whose material names follow `<id>_<paletteKey>_<index>` using only keys from the 20-colour `ZOO_PALETTE`).
2. **Run the Builder Step to Emit Content-Hashed `.glb` Files**:
   ```bash
   node packages/game-assets/scripts/generate-glb-assets.mjs --json
   ```
   - This writes `/assets/models/<id>.<contentHash>.glb` into `apps/web/public/assets/models/`, removes any stale/unhashed `.glb` files, and prints the JSON summary containing `url`, `sizeBytes`, and `contentHash`.
3. **Register the Manifest v2 Entry**:
   - Add the new `AssetId` to `packages/game-assets/src/manifest.ts` and populate `ASSET_MANIFEST[<id>]` with `url`, `category`, `preload`, `boundingRadius`, `zoneId`, `zones`, `sizeBytes`, and `contentHash` from the builder output.
   - Reference the model in `@online-zoo/game-client` exclusively via `getAssetUrl('<id>')` and shared palette helpers from `packages/game-client/src/materials/paletteMaterials.ts` (never hardcode hex/RGB/HSL colour literals in scene or entity files).
4. **Run the Automated Verification & Palette Compliance Checks**:
   ```bash
   pnpm --filter @online-zoo/game-assets test
   pnpm --filter @online-zoo/game-client test
   ```
   - `packages/game-assets/__tests__/manifest.test.ts` verifies that every manifest URL exists on disk in `apps/web/public`, its byte size matches `sizeBytes`, its SHA-256 prefix matches `contentHash`, no orphan `.glb` files exist, and all glTF materials use `ZOO_PALETTE`.
   - `packages/game-client/__tests__/artStyleCompliance.test.ts` scans all scene and entity source files to ensure zero raw colour literals (`#...`, `rgb(...)`, `hsl(...)`, `0x...`) exist outside `paletteMaterials.ts` and every `getAssetUrl(...)` call resolves to a valid `ASSET_MANIFEST` entry.

---

## 4. Per-Zone Loading & Session Caching

- **Menu Time (`ZooWorldExperience.tsx`)**: Preloads **only** the `zoo-lobby` zone's 6 assets (`30,488 bytes`) via `preloadZoneGlbAssets('zoo-lobby')`. Assets exclusive to `panda-forest` (panda, penguin, otter, bamboo cluster, wind chime, food stall, cafe table, picnic table) are **not** downloaded at menu time.
- **Zone Gate Transition (`GameLoopController.tsx` & `ZooGameCanvas.tsx`)**: When a player interacts with a zone gate (behind `EntryLoadingScreen`), `preloadZoneGlbAssets(targetZoneId)` loads only the uncached assets for the destination zone.
- **Session Memory Cache (`loaders.ts`)**: Visited zones (`loadedZonesCache`) and preloaded URLs (`preloadedAssetUrls`) remain cached in memory for the duration of the browser session so walking back and forth between `zoo-lobby` and `panda-forest` never re-triggers asset downloads.

---

## 5. HTTP Caching & What a Returning Player Re-Downloads

`apps/web/next.config.mjs` configures HTTP response headers for `/assets/:path*`:

```http
Cache-Control: public, max-age=31536000, immutable
```

- **Unchanged 3D Models**: Because every `.glb` filename embeds its 8-character SHA-256 `contentHash` (`/assets/models/<id>.<contentHash>.glb`) and is served with `max-age=31536000, immutable`, a returning player's browser serves all unchanged 3D models directly from local disk cache with **0 bytes re-downloaded** (target: nothing unchanged).
- **Updated 3D Models**: If a model's geometry or palette material changes, `generate-glb-assets.mjs` produces a new `<contentHash>` filename and updates `ASSET_MANIFEST`. Returning players download **only** the newly hashed `.glb` file while all other unchanged models remain cached.
- **HTML Pages & App Bundles**: Next.js pages keeps normal revalidation so HTML shell updates and new manifest pointers are picked up immediately on deployment.

