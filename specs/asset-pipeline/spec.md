# Feature Specification: Asset Pipeline (`asset-pipeline`)

**Feature Branch**: `fix/asset-pipeline`  
**Created**: 2026-11-05  
**Status**: Draft  
**Input**: User description: "asset-pipeline: Entirely within apps/web + packages/game-assets; the server ships no assets. Manifest v2: every entry gains zoneId (or zones), sizeBytes, and a contentHash (and hashed filename). A build/test step verifies every manifest URL exists in apps/web/public and declared sizes match real files. Loading: preload ONLY the lobby zone's assets at menu time; load a zone's assets when its gate is used (behind the loading screen); keep visited zones cached in memory for the session. No more global preload-everything in ZooGameCanvas.tsx. HTTP caching: apps/web/next.config.mjs serves /assets/* with long-lived immutable caching (Cache-Control: public, max-age=31536000, immutable) and content hash in emitted filenames; pages/JS keep normal revalidation. First-visit budget: menu + lobby playable at <= ~5 MB total transfer — measure the real number and report it in PROGRESS.md. Write ASSETS.md at repo root: where assets live, how a new model is added (export GLB, builder step, manifest entry, palette check from art-style-unification), and what a returning player re-downloads (target: nothing unchanged)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manifest v2 with Content Hashing, Size Verification & Zone Scoping (Priority: P1)

Every asset entry in `@online-zoo/game-assets` (`ASSET_MANIFEST`) is upgraded to **Manifest v2**, gaining `zoneId` (primary zone), `zones` (all zones using the asset), `sizeBytes` (exact byte length of the binary `.glb` file), `contentHash` (8-character SHA-256 hex digest of the `.glb` content), and a content-hashed filename (`/assets/models/<id>.<contentHash>.glb`). Automated build and test verification ensures every manifest URL exists in `apps/web/public`, declared `sizeBytes` matches the real file size on disk, and `contentHash` matches the SHA-256 digest of the file.

**Why this priority**: Content-hashed filenames and verified byte sizes are the foundation for safe long-lived immutable HTTP caching and accurate transfer budget tracking.

**Independent Test**: Run `pnpm --filter @online-zoo/game-assets test` and verify every entry in `ASSET_MANIFEST` has a valid `zoneId`, `zones`, `sizeBytes > 0`, 8-hex `contentHash`, and content-hashed `.glb` URL matching the physical file in `apps/web/public/assets/models/`.

**Acceptance Scenarios**:

1. **Given** `ASSET_MANIFEST` in `@online-zoo/game-assets`, **When** inspected, **Then** every entry contains `zoneId`, `zones`, `sizeBytes`, `contentHash`, and a URL of the form `/assets/models/<id>.<contentHash>.glb`.
2. **Given** the generated `.glb` files in `apps/web/public/assets/models/`, **When** verified by the test suite, **Then** every manifest URL exists on disk and its byte size and SHA-256 prefix match `entry.sizeBytes` and `entry.contentHash` 100%.

---

### User Story 2 - Per-Zone Asset Preloading & Session Memory Cache (Priority: P1)

At Main Menu time, the client preloads **only** the `zoo-lobby` zone's assets (`preloadZoneAssets('zoo-lobby')`). Global module-top-level preloading (`for (const url of getPreloadUrls()) useGLTF.preload(url)`) is removed from `ZooGameCanvas.tsx`. When a player enters a zone or uses a zone gate (`enter_zone_gate`), that target zone's assets are preloaded behind the loading screen (`EntryLoadingScreen`), and visited zones remain cached in memory (`loadedZones: Set<AssetZoneId>`) for the duration of the session so re-entering a visited zone requires zero re-fetching.

**Why this priority**: Preloading only the lobby zone at menu time keeps the first-visit transfer budget small and fast while loading heavy habitat zones (`panda-forest`) on demand behind the gate transition screen.

**Independent Test**: Verify via unit tests and runtime inspection that at menu time only `zoo-lobby` assets (6 models, ~10.2 KB total) are preloaded, `panda-forest` assets are loaded only when entering `panda-forest`, and visited zones remain tracked in the session zone cache until `clearAssetCache()` is called on session teardown.

**Acceptance Scenarios**:

1. **Given** a visitor on the Main Menu, **When** menu preloading runs, **Then** only `zoo-lobby` assets are preloaded (`isZoneLoaded('zoo-lobby') === true`, `isZoneLoaded('panda-forest') === false`).
2. **Given** a visitor walking into the North Gate to `panda-forest`, **When** the gate transition triggers, **Then** `panda-forest` assets are loaded behind the transition loading screen and both `'zoo-lobby'` and `'panda-forest'` remain cached in memory for the session.

---

### User Story 3 - Immutable HTTP Caching, Transfer Budget & `ASSETS.md` Documentation (Priority: P1)

`apps/web/next.config.mjs` serves `/assets/:path*` with `Cache-Control: public, max-age=31536000, immutable` while keeping normal revalidation for HTML pages and JS chunks. The total first-visit transfer budget (Main Menu + Zoo Lobby playable) is measured and verified to be well under the `≤ ~5 MB` budget. A comprehensive `ASSETS.md` guide at the repository root documents where assets live, how a new model is added, and what a returning player re-downloads (`0 bytes` for unchanged assets).

**Why this priority**: Ensures returning visitors never re-download unchanged 3D models and gives contributors a clear, repeatable workflow for adding palette-compliant assets.

**Independent Test**: Inspect `apps/web/next.config.mjs` headers configuration, verify `ASSETS.md` at repo root, and measure the production build + lobby asset transfer size.

**Acceptance Scenarios**:

1. **Given** `apps/web/next.config.mjs`, **When** HTTP headers are resolved for `/assets/models/...`, **Then** `Cache-Control: public, max-age=31536000, immutable` is returned.
2. **Given** a fresh visit to the Main Menu + Zoo Lobby, **When** total transfer bytes (HTML/CSS/JS + 6 `zoo-lobby` `.glb` files) are measured, **Then** the total is strictly `≤ 5 MB` and reported in `PROGRESS.md`.

---

### Edge Cases

- **Returning visitor selecting `panda-forest` directly from the Main Menu**: When a returning visitor selects `panda-forest` on the Main Menu and clicks PLAY, `ZooGameCanvas` preloads `currentZoneId` (`panda-forest`) on mount before marking the scene ready.
- **Stale unhashed `.glb` files in `apps/web/public/assets/models/`**: The generator script `generate-glb-assets.mjs` cleans up old `.glb` files in `apps/web/public/assets/models/` before writing the current content-hashed `.glb` files so no orphan files accumulate.
- **Architecture Law compliance**: `apps/server` ships zero assets and does not depend on `@online-zoo/game-assets`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `AssetManifestEntry` in `packages/game-assets/src/manifest.ts` MUST include `zoneId: AssetZoneId` (primary zone), `zones: AssetZoneId[]`, `sizeBytes: number`, `contentHash: string` (8-char SHA-256 hex prefix), and a content-hashed `url` (`/assets/models/<id>.<contentHash>.glb`).
- **FR-002**: `packages/game-assets/scripts/generate-glb-assets.mjs` MUST deterministically generate the 14 `.glb` files, compute each file's exact `sizeBytes` and 8-character SHA-256 `contentHash`, write `/assets/models/<id>.<contentHash>.glb`, and verify/sync `MANIFEST_V2_META` in `packages/game-assets/src/manifest.ts`.
- **FR-003**: `packages/game-assets/__tests__/manifest.test.ts` MUST verify that every manifest URL exists in `apps/web/public`, its file size matches `entry.sizeBytes`, and its SHA-256 prefix matches `entry.contentHash`.
- **FR-004**: `packages/game-client/src/runtime/ZooGameCanvas.tsx` MUST NOT globally preload all manifest URLs at module import time; instead, `ZooWorldExperience.tsx` / `MainMenuScreen.tsx` MUST preload only `'zoo-lobby'` assets at menu time, and `ZooGameCanvas.tsx` MUST preload the active/target zone's assets on zone entry or gate transition while caching visited zones in memory for the session.
- **FR-005**: `apps/web/next.config.mjs` MUST configure `headers()` to serve `/assets/:path*` with `Cache-Control: public, max-age=31536000, immutable`.
- **FR-006**: `ASSETS.md` MUST be created at the repository root documenting where assets live, how a new model is added (GLB export/definition, builder step, manifest entry, palette check from `art-style-unification`), and what a returning player re-downloads.

### Key Entities

- **`AssetManifestEntry` (Manifest v2)**: Metadata descriptor for each 3D `.glb` asset with `id`, `url` (content-hashed), `category`, `preload`, `boundingRadius`, `zoneId`, `zones`, `sizeBytes`, and `contentHash`.
- **`ZoneAssetLoader` (`loaders.ts`)**: Session-scoped zone asset loader tracking `loadedZones: Set<AssetZoneId>` and `preloadedUrls: Set<string>` so visited zones stay cached in memory for the session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of `ASSET_MANIFEST` entries have verified `sizeBytes`, 8-char `contentHash`, and content-hashed `.glb` filenames in `apps/web/public/assets/models/`.
- **SC-002**: At Main Menu time, only the 6 `'zoo-lobby'` assets (`10,248 bytes` / `10.0 KB`) are preloaded; `'panda-forest'` assets (`19,560 bytes` across 8 additional models) are loaded only when entering `'panda-forest'`.
- **SC-003**: First-visit total transfer size (Main Menu + Zoo Lobby playable) is measured and strictly `≤ 5 MB`.
- **SC-004**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E tests pass with zero regressions.

