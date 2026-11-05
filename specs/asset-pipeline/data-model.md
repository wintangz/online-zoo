# Data Model: Asset Pipeline (`asset-pipeline`)

## 1. `AssetManifestEntry` (Manifest v2 in `packages/game-assets/src/manifest.ts`)

```ts
export interface AssetManifestEntry {
  id: AssetId;
  url: string; // '/assets/models/<id>.<contentHash>.glb'
  category: 'character' | 'environment' | 'interactive-prop';
  preload: boolean;
  boundingRadius: number;
  zoneId: AssetZoneId; // Primary zone ('zoo-lobby' or 'panda-forest')
  zones: AssetZoneId[]; // All zones where this asset is used
  sizeBytes: number; // Exact file size in bytes on disk
  contentHash: string; // 8-character lowercase hex SHA-256 digest prefix
}
```

## 2. Session Zone Asset Cache (`packages/game-assets/src/loaders.ts`)

- `loadedZones: Set<AssetZoneId>`: Tracks which zones have had their assets preloaded during the active session.
- `preloadedUrls: Set<string>`: Tracks individual content-hashed asset URLs already preloaded in the session so shared assets (e.g. `avatar-explorer`, `prop-stone-lantern`) are never preloaded twice when moving from `'zoo-lobby'` to `'panda-forest'`.
- `preloadZoneAssets(zoneId: AssetZoneId, preloader?: (url: string) => void): string[]`: Preloads all non-yet-preloaded asset URLs for `zoneId`, marks `zoneId` in `loadedZones`, and returns the list of newly preloaded URLs.

