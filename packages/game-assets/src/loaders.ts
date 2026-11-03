import * as THREE from 'three';
import { ASSET_MANIFEST, getAssetUrl, getPreloadUrls, type AssetId } from './manifest';

const loadedScenesCache = new Map<AssetId, THREE.Group>();

export function registerLoadedAssetScene(id: AssetId, scene: THREE.Group): void {
  loadedScenesCache.set(id, scene);
}

export function getCachedAssetScene(id: AssetId): THREE.Group | undefined {
  return loadedScenesCache.get(id);
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
  clearAssetCache
};

