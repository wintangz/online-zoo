# Research: Asset Pipeline (`asset-pipeline`)

## Decision 1: Deterministic GLB Builder & Content Hashing

- **Decision**: Compute `crypto.createHash('sha256').update(glbBuffer).digest('hex').slice(0, 8)` in `packages/game-assets/scripts/generate-glb-assets.mjs` for each generated `.glb` buffer, emit `apps/web/public/assets/models/<id>.<contentHash>.glb` (removing any stale `.glb` files in that directory), and export/verify the exact `{ sizeBytes, contentHash, url }` in `packages/game-assets/src/manifest.ts`.
- **Rationale**: Deterministic binary generation guarantees identical SHA-256 hashes across builds unless a model's geometry or palette assignment changes, making content-hashed URLs stable in source control and tests.

## Decision 2: Per-Zone Preloading & Session Cache

- **Decision**:
  1. Remove the top-level `for (const url of getPreloadUrls()) useGLTF.preload(url)` loop from `packages/game-client/src/runtime/ZooGameCanvas.tsx`.
  2. Add `preloadZoneAssets(zoneId, preloader?)`, `isZoneLoaded(zoneId)`, `getLoadedZones()`, and `getZoneTransferBytes(zoneId)` to `packages/game-assets/src/loaders.ts`.
  3. Trigger `preloadZoneAssets('zoo-lobby')` when the Main Menu mounts, and trigger `preloadZoneAssets(targetZoneId)` when `ZooGameCanvas` mounts or transitions to a zone via a gate (`transitionTargetZone` / `currentZoneId`), keeping visited zones in `loadedZones: Set<AssetZoneId>` for the session.
- **Rationale**: Ensures first-time visitors at the Main Menu only download the 6 `'zoo-lobby'` models (~10 KB), and `'panda-forest'` models are loaded only when entering `'panda-forest'` and cached for the rest of the session.

## Decision 3: Immutable HTTP Caching in `apps/web/next.config.mjs`

- **Decision**: Add `async headers()` to `apps/web/next.config.mjs` matching `source: '/assets/:path*'` with header `Cache-Control: public, max-age=31536000, immutable`.
- **Rationale**: Because every `.glb` URL in `ASSET_MANIFEST` contains an 8-char SHA-256 content hash (`/assets/models/<id>.<contentHash>.glb`), browsers and CDNs can safely cache `/assets/*` for 1 year without revalidation, while HTML/JS routes keep Next.js's default revalidation behavior.

