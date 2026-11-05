# Tasks: Asset Pipeline (`asset-pipeline`)

**Input**: Design documents from `/specs/asset-pipeline/`
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

## Phase 1: Manifest v2 & Deterministic Content-Hashed GLB Builder (`@online-zoo/game-assets`)

- [X] T001 Update `packages/game-assets/scripts/generate-glb-assets.mjs` and `packages/game-assets/src/manifest.ts` so every generated `.glb` file uses a content-hashed filename (`/assets/models/<id>.<contentHash>.glb`) and every `ASSET_MANIFEST` entry includes `zoneId`, `zones`, `sizeBytes`, and `contentHash` (MANIFEST_VERSION = 2)
- [X] T002 Update `packages/game-assets/src/loaders.ts` to implement per-zone asset preloading (`preloadZoneAssets`, `isZoneLoaded`, `getLoadedZones`, `getPreloadedUrls`, `getZoneTransferBytes`) with session-scoped in-memory caching
- [X] T003 Update `packages/game-assets/__tests__/manifest.test.ts` to verify every manifest URL exists in `apps/web/public`, declared `sizeBytes` and `contentHash` match the physical files 100%, and per-zone preloading caches visited zones in memory

---

## Phase 2: Per-Zone Preloading in Client & Immutable HTTP Caching (`@online-zoo/game-client`, `apps/web`)

- [X] T004 Update `packages/game-client/src/runtime/ZooGameCanvas.tsx` and `apps/web/src/components/ZooWorldExperience.tsx` to remove global top-level `getPreloadUrls()` preloading, preload only `'zoo-lobby'` assets at Main Menu time, and preload target zone assets when entering a zone or using a zone gate behind the loading screen
- [X] T005 Update `apps/web/next.config.mjs` to serve `/assets/:path*` with `Cache-Control: public, max-age=31536000, immutable` while keeping normal revalidation for pages/JS

---

## Phase 3: Documentation (`ASSETS.md`), Transfer Budget Measurement & Verification

- [X] T006 Write `ASSETS.md` at the repository root documenting where assets live, how a new model is added (GLB export/builder step, manifest entry, palette check from `art-style-unification`), and what a returning player re-downloads
- [X] T007 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm --filter @online-zoo/web build` (measuring real first-visit transfer size), and Playwright E2E tests
