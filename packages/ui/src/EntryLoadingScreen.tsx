import React from 'react';
import { useStore } from 'zustand';
import { gameStore, getZoneById, PUBLIC_BETA_VERSION } from '@online-zoo/game-core';

export interface EntryLoadingScreenProps {
  onEnterWorld?: () => void;
}

export const EntryLoadingScreen: React.FC<EntryLoadingScreenProps> = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const loadingProgress = useStore(gameStore, (s) => s.loadingProgress);
  const currentZoneId = useStore(gameStore, (s) => s.currentZoneId);
  const transitionTargetZone = useStore(gameStore, (s) => s.transitionTargetZone);

  if (transitionTargetZone) {
    const targetZone = getZoneById(transitionTargetZone);
    return (
      <div
        data-testid="zone-transition-loading-screen"
        className="fixed inset-0 z-50 flex select-none flex-col items-center justify-center bg-emerald-950/90 px-6 text-white backdrop-blur-md"
      >
        <div className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-emerald-950/90 p-6 text-center shadow-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Switching Zone...
          </p>
          <h2
            data-testid="zone-transition-destination-name"
            className="mt-1 text-2xl font-extrabold text-white"
          >
            {targetZone.badgeIcon} {targetZone.displayName}
          </h2>
          <p className="mt-2 text-xs text-emerald-100/80">{targetZone.description}</p>
        </div>
      </div>
    );
  }

  if (phase !== 'loading') {
    return null;
  }

  const activeZone = getZoneById(currentZoneId);

  return (
    <div
      data-testid="entry-loading-screen"
      className="fixed inset-0 z-50 flex select-none flex-col items-center justify-center bg-gradient-to-b from-emerald-950/95 via-emerald-900/90 to-teal-950/95 px-6 text-white backdrop-blur-md"
    >
      <div className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-emerald-950/85 p-7 text-center shadow-2xl">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <span data-testid="entry-zone-label">Online Zoo • {activeZone.displayName}</span>
          </div>
          <span
            data-testid="entry-beta-badge"
            className="inline-flex items-center justify-center rounded-full border border-amber-300/45 bg-amber-400/20 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-amber-200"
          >
            Public Beta v{PUBLIC_BETA_VERSION}
          </span>
        </div>

        <h2 className="text-2xl font-extrabold tracking-tight text-white">
          {activeZone.badgeIcon} Entering {activeZone.displayName}...
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-emerald-100/80">
          {activeZone.description}
        </p>

        {/* Loading Progress Bar */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs font-medium text-emerald-200">
            <span>Loading 3D Environment...</span>
            <span data-testid="loading-progress-value">{loadingProgress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-900/80 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, loadingProgress))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
