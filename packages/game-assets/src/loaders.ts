import * as THREE from 'three';
import {
  ASSET_MANIFEST,
  getAssetsForZone,
  getAssetUrl,
  getPreloadUrls,
  getPreloadUrlsForZone,
  type AssetId,
  type AssetZoneId
} from './manifest';

const loadedScenesCache = new Map<AssetId, THREE.Group>();
const loadedZonesCache = new Set<AssetZoneId>();
const preloadedAssetUrls = new Set<string>();

export function registerLoadedAssetScene(id: AssetId, scene: THREE.Group): void {
  loadedScenesCache.set(id, scene);
}

export function getCachedAssetScene(id: AssetId): THREE.Group | undefined {
  return loadedScenesCache.get(id);
}

/**
 * Preloads all assets belonging to a specific zone (`zoneId`) that have not yet
 * been preloaded in the current session, caching the zone in memory so subsequent
 * visits during the session do not re-trigger preloading.
 */
export function preloadZoneAssets(
  zoneId: AssetZoneId,
  preloader?: (url: string) => void
): string[] {
  const urlsForZone = getPreloadUrlsForZone(zoneId);
  const newlyPreloaded: string[] = [];

  for (const url of urlsForZone) {
    if (!preloadedAssetUrls.has(url)) {
      preloadedAssetUrls.add(url);
      newlyPreloaded.push(url);
      preloader?.(url);
    }
  }

  loadedZonesCache.add(zoneId);
  return newlyPreloaded;
}

export function isZoneLoaded(zoneId: AssetZoneId): boolean {
  return loadedZonesCache.has(zoneId);
}

export function getLoadedZones(): AssetZoneId[] {
  return [...loadedZonesCache];
}

export function getPreloadedAssetUrls(): string[] {
  return [...preloadedAssetUrls];
}

export function getZoneTransferBytes(zoneId: AssetZoneId): number {
  return getAssetsForZone(zoneId).reduce((sum, entry) => sum + entry.sizeBytes, 0);
}

export function resetZonePreloadCache(): void {
  loadedZonesCache.clear();
  preloadedAssetUrls.clear();
}

export function clearAssetCache(): void {
  for (const group of loadedScenesCache.values()) {
    group.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }
  loadedScenesCache.clear();
}

export const assetRegistry = {
  manifest: ASSET_MANIFEST,
  getAssetUrl,
  getPreloadUrls,
  getPreloadUrlsForZone,
  preloadZoneAssets,
  isZoneLoaded,
  getLoadedZones,
  getPreloadedAssetUrls,
  getZoneTransferBytes,
  resetZonePreloadCache,
  clearAssetCache
};


