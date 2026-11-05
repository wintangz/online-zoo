import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, useGLTF } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { useStore } from 'zustand';
import {
   type AssetZoneId,
  clearAssetCache,
  getLoadedZones,
  getPreloadedAssetUrls,
  isZoneLoaded,
  preloadZoneAssets
} from '@online-zoo/game-assets';
import {
  attachDesktopInputBindings,
  CameraControllerCore,
  CharacterControllerCore,
  gameStore,
  InputController,
  InteractionSystem,
  MultiplayerClient,
  type MultiplayerClientOptions,
  mutableRuntimeState,
  PANDA_FOREST_LAYOUT,
  resetMutableRuntimeState
} from '@online-zoo/game-core';
import { PandaForestScene } from '../environment/PandaForestScene';
import { ZooLobbyScene } from '../environment/ZooLobbyScene';

/**
 * Preloads ONLY the specified zone's GLB assets via useGLTF.preload and caches
 * the zone in memory for the current session.
 */
export function preloadZoneGlbAssets(zoneId: AssetZoneId): string[] {
  return preloadZoneAssets(zoneId, (url) => {
    useGLTF.preload(url);
  });
}

export interface ZooGameRuntimeProps {
  initialSpawn?: [number, number, number] | undefined;
  inputController?: InputController | undefined;
  multiplayerOptions?: MultiplayerClientOptions | undefined;
  enableMultiplayer?: boolean | undefined;
  onReady?: (() => void) | undefined;
  onDispose?: (() => void) | undefined;
}

export function createGameRuntimeControllers(
  initialSpawn: [number, number, number] = PANDA_FOREST_LAYOUT.spawnPosition,
  externalInputController?: InputController,
  multiplayerOptions?: MultiplayerClientOptions
) {
  const inputController = externalInputController ?? new InputController();
  const characterController = new CharacterControllerCore(
    initialSpawn,
    Math.PI // Face North (-Z) down the Panda Forest trail at spawn, aligned with initial camera view
  );
  const cameraController = new CameraControllerCore(0, 0.45, 5.5);
  const interactionSystem = new InteractionSystem();
  const multiplayerClient = new MultiplayerClient({
    ...multiplayerOptions,
    onAuthoritativePositionApplied: (pos, yaw) => {
      characterController.commitPhysicsResult(pos, true);
      if (typeof yaw === 'number') {
        const st = characterController.getState();
        st.facingYaw = yaw;
        st.targetYaw = yaw;
      }
      multiplayerOptions?.onAuthoritativePositionApplied?.(pos, yaw);
    }
  });

  return {
    inputController,
    characterController,
    cameraController,
    interactionSystem,
    multiplayerClient
  };
}

export const ZooGameCanvas: React.FC<ZooGameRuntimeProps> = ({
  initialSpawn = PANDA_FOREST_LAYOUT.spawnPosition,
  inputController: externalInputController,
  multiplayerOptions,
  enableMultiplayer = true,
  onReady,
  onDispose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qualityTier = useStore(gameStore, (s) => s.settings.qualityTier);
  const currentZoneId = useStore(gameStore, (s) => s.currentZoneId);
  const transitionTargetZone = useStore(gameStore, (s) => s.transitionTargetZone);
  const [adaptiveDpr, setAdaptiveDpr] = useState<number>(1.25);

  // Preload active zone assets and any zone being transitioned into behind the loading screen
  useMemo(() => {
    preloadZoneGlbAssets(currentZoneId);
    if (transitionTargetZone) {
      preloadZoneGlbAssets(transitionTargetZone);
    }
  }, [currentZoneId, transitionTargetZone]);

  const controllers = useMemo(
    () => createGameRuntimeControllers(initialSpawn, externalInputController, multiplayerOptions),
    [initialSpawn, externalInputController, multiplayerOptions]
  );

  // Calculate effective DPR based on user qualityTier setting & PerformanceMonitor
  const effectiveDpr = useMemo<[number, number]>(() => {
    if (qualityTier === 'low') return [0.75, 1.0];
    if (qualityTier === 'medium') return [1.0, 1.25];
    if (qualityTier === 'high') return [1.25, 2.0];
    return [0.85, adaptiveDpr];
  }, [qualityTier, adaptiveDpr]);

  useEffect(() => {
    resetMutableRuntimeState(initialSpawn, Math.PI);
    controllers.characterController.reset(initialSpawn, Math.PI);
    controllers.cameraController.reset(0, 0.45, 5.5);

    // Initialize persistent player identity & avatar before connecting (FR-001, FR-011)
    gameStore.getState().initializePlayerIdentity();

    const detachDesktop = attachDesktopInputBindings(controllers.inputController, {
      targetElement: containerRef.current
    });

    const unsubDevice = gameStore.subscribe((state, prevState) => {
      if (state.activeDevice !== prevState.activeDevice) {
        controllers.inputController.setActiveDevice(state.activeDevice);
      }
    });

    if (enableMultiplayer) {
      controllers.multiplayerClient.connect();
    }

    // Expose runtime handle immediately on mount so HUD and E2E browsers can inspect & control state
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__ONLINE_ZOO_RECONNECT__ = () => {
        controllers.multiplayerClient.connect();
      };
      (window as unknown as Record<string, unknown>).__ONLINE_ZOO_SYNC_IDENTITY__ = () => {
        controllers.multiplayerClient.sendIdentityUpdate(gameStore.getState().identity.profile);
      };
      const stepGameRuntimeTickPromise = import('./GameLoopController').then((mod) => {
        (window as unknown as Record<string, unknown>).__ONLINE_ZOO_RUNTIME__ = {
          ...controllers,
          gameStore,
          mutableRuntimeState,
          getLoadedZones,
          getPreloadedAssetUrls,
          isZoneLoaded,
          stepFrames: (frames = 1, dt = 1 / 60) => {
            for (let i = 0; i < frames; i++) {
              mod.stepGameRuntimeTick(dt, controllers);
            }
          }
        };
      });
      void stepGameRuntimeTickPromise;
    }

    // Advance loading progress to 100% and mark ready
    const st = gameStore.getState();
    st.setLoadingProgress(100);
    if (st.phase === 'loading') {
      st.setPhase('ready');
    }
    onReady?.();

    return () => {
      unsubDevice();
      detachDesktop();
      controllers.multiplayerClient.disconnect(true);
      controllers.inputController.dispose();
      clearAssetCache();
      resetMutableRuntimeState(initialSpawn, PANDA_FOREST_LAYOUT.spawnYaw);
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).__ONLINE_ZOO_RECONNECT__;
        delete (window as unknown as Record<string, unknown>).__ONLINE_ZOO_SYNC_IDENTITY__;
      }
      onDispose?.();
    };
  }, [controllers, enableMultiplayer, initialSpawn, onReady, onDispose]);

  return (
    <div
      ref={containerRef}
      data-testid="zoo-game-canvas-container"
      className="relative h-full w-full cursor-grab select-none overflow-hidden bg-sky-100 active:cursor-grabbing"
    >
      <Canvas
        shadows={qualityTier !== 'low'}
        dpr={effectiveDpr}
        camera={{ fov: 55, near: 0.1, far: 300, position: [0, 3.6, 23] }}
        gl={{ antialias: qualityTier !== 'low', powerPreference: 'high-performance' }}
      >
        <PerformanceMonitor
          onIncline={() => setAdaptiveDpr(1.75)}
          onDecline={() => setAdaptiveDpr(1.0)}
        />
        <Suspense fallback={null}>
          <Physics gravity={[0, -18, 0]}>
            {currentZoneId === 'zoo-lobby' ? (
              <ZooLobbyScene {...controllers} />
            ) : (
              <PandaForestScene {...controllers} />
            )}
          </Physics>
        </Suspense>
      </Canvas>
    </div>
  );
};

