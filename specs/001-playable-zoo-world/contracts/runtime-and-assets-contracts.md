# Runtime, Assets & UI Boundary Contracts

**Feature**: `001-playable-zoo-world`
**Packages**: `@online-zoo/game-assets`, `@online-zoo/game-client`, `@online-zoo/ui`, `apps/web`

---

## 1. Asset Manifest & GLB/glTF Loader Contract (`@online-zoo/game-assets`)

Supports GLB/glTF assets, preloading, and deterministic cleanup (`Architecture Requirement 8 & 9`).

```ts
export type AssetId =
  | 'avatar-explorer'
  | 'prop-bamboo-cluster'
  | 'prop-stone-lantern'
  | 'prop-habitat-plaque'
  | 'prop-wind-chime'
  | 'prop-wooden-bench';

export interface AssetManifestEntry {
  id: AssetId;
  url: string; // e.g. "/assets/models/avatar-explorer.glb"
  category: 'character' | 'environment' | 'interactive-prop';
  preload: boolean;
  boundingRadius: number;
}

export interface AssetRegistryContract {
  manifest: Record<AssetId, AssetManifestEntry>;
  getAssetUrl(id: AssetId): string;
  getPreloadUrls(): string[];
  clearAssetCache(): void;
}
```

---

## 2. Game Client Runtime & Lifecycle Contract (`@online-zoo/game-client`)

Separates the 3D React Three Fiber runtime from the Next.js application shell (`Architecture Requirement 1, 7, 9, 10`).

```ts
export interface ZooGameRuntimeProps {
  /** Initial spawn coordinates override (defaults to Panda Forest main gate [0, 0.1, 18]) */
  initialSpawn?: [number, number, number];
  /** Callback fired when WebGL context and initial scene assets are ready */
  onReady?: () => void;
  /** Callback fired when runtime unmounts and disposes GPU/physics resources */
  onDispose?: () => void;
}
```

### Runtime Lifecycle Guarantees (`Architecture Requirement 9`)
1. **Initialization**:
   - Mounts `<Canvas>` with adaptive DPR (`[1, 2]` desktop, `[0.85, 1.5]` mobile) and `<Physics>` world only when `apps/web` renders the client boundary (`ssr: false`).
   - Registers DOM keyboard/mouse/touch/resize/blur listeners via `InputController`.
   - Registers all Panda Forest `InteractiveObjectDescriptor` instances in `InteractionSystem`.
2. **Resize & Focus Handling**:
   - On `window.resize` or `orientationchange`: updates camera aspect ratio, projection matrix, and touch control bounds without recreating the physics world.
   - On `window.blur`, `visibilitychange`, or Pointer Lock exit via `ESC`: invokes `inputController.resetAll()` so the avatar immediately transitions to `Idle`.
3. **Cleanup / Disposal**:
   - On unmount: calls `inputController.dispose()`, exits active Pointer Lock, clears `InteractionSystem` registrations, disposes custom `THREE.BufferGeometry` / `THREE.Material` instances, and resets transient runtime state so repeated mount/unmount cycles leak zero listeners or physics bodies.

---

## 3. UI & Zustand Store Contract (`@online-zoo/ui` ↔ `@online-zoo/game-core`)

`packages/ui` never subscribes to 60 Hz position/rotation coordinates. It reads and dispatches exclusively through discrete Zustand store slices:

```ts
export type SessionPhase = 'loading' | 'ready' | 'playing' | 'paused';
export type QualityTier = 'auto' | 'low' | 'medium' | 'high';

export interface UserSettings {
  cameraSensitivity: number; // [0.2, 2.5], default 1.0
  invertCameraY: boolean;    // default false
  audioMuted: boolean;       // default false
  masterVolume: number;      // [0.0, 1.0], default 0.7
  qualityTier: QualityTier;  // default 'auto'
  showControlHints: boolean; // default true
}

export interface GameUIStoreState {
  phase: SessionPhase;
  loadingProgress: number;
  locomotionState: 'Idle' | 'Walking' | 'Running' | 'Jumping';
  activeDevice: 'desktop' | 'touch';
  isPointerLocked: boolean;
  isCursorRevealed: boolean;
  focusedObject: InteractiveObjectDescriptor | null;
  activePlaqueModal: InteractiveObjectDescriptor | null;
  propStates: Record<string, { active: boolean; lastTriggeredAt: number }>;
  settings: UserSettings;

  // Actions
  setPhase(phase: SessionPhase): void;
  setLoadingProgress(progress: number): void;
  setLocomotionState(state: 'Idle' | 'Walking' | 'Running' | 'Jumping'): void;
  setActiveDevice(device: 'desktop' | 'touch'): void;
  setCursorState(locked: boolean, revealed: boolean): void;
  setFocusedObject(obj: InteractiveObjectDescriptor | null): void;
  openPlaqueModal(obj: InteractiveObjectDescriptor): void;
  closePlaqueModal(): void;
  togglePropState(objectId: string): void;
  updateSettings(partial: Partial<UserSettings>): void;
  resetSession(): void;
}
```

