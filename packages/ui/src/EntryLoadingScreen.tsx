import React from 'react';
import { useStore } from 'zustand';
import { gameStore } from '@online-zoo/game-core';

export interface EntryLoadingScreenProps {
  onEnterWorld?: () => void;
}

export const EntryLoadingScreen: React.FC<EntryLoadingScreenProps> = ({ onEnterWorld }) => {
  const phase = useStore(gameStore, (s) => s.phase);
  const loadingProgress = useStore(gameStore, (s) => s.loadingProgress);
  const setPhase = useStore(gameStore, (s) => s.setPhase);

  if (phase !== 'loading' && phase !== 'ready') {
    return null;
  }

  const isReady = phase === 'ready' || loadingProgress >= 100;

  const handleEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setPhase('playing');
    onEnterWorld?.();
  };

  return (
    <div
      data-testid="entry-loading-screen"
      className="fixed inset-0 z-50 flex select-none flex-col items-center justify-center bg-gradient-to-b from-emerald-950/95 via-emerald-900/90 to-teal-950/95 px-6 text-white backdrop-blur-md"
    >
      <div className="w-full max-w-lg rounded-3xl border border-emerald-400/30 bg-emerald-950/80 p-8 shadow-2xl">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-300">
          <span>Online Zoo • Feature 001</span>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Panda Forest Sanctuary
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-emerald-100/85">
          Explore the misty highland bamboo grove, stroll along the Lotus Pond boardwalk, and
          discover interactive habitat signs and garden props.
        </p>

        {/* Loading Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-xs font-medium text-emerald-200">
            <span>{isReady ? 'World Assets Ready' : 'Loading 3D Environment...'}</span>
            <span data-testid="loading-progress-value">{loadingProgress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-emerald-900/80 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-lime-300 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(5, loadingProgress))}%` }}
            />
          </div>
        </div>

        {/* Quick Controls Summary */}
        <div className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-900/40 p-4 text-xs text-emerald-100">
          <div>
            <p className="font-semibold text-emerald-300">Desktop Controls</p>
            <p className="mt-1">WASD: Move • Shift: Run</p>
            <p>Space: Jump • E: Interact</p>
            <p>Mouse: Orbit • Hold Alt: Cursor</p>
          </div>
          <div>
            <p className="font-semibold text-emerald-300">Mobile Touch</p>
            <p className="mt-1">Left Joystick: Walk Steer</p>
            <p>Run Button: Sprint Toggle</p>
            <p>Right Drag: 360° Camera</p>
          </div>
        </div>

        <button
          type="button"
          data-testid="enter-world-btn"
          disabled={!isReady}
          onClick={handleEnter}
          className="mt-7 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-400 px-6 py-3.5 text-base font-bold text-emerald-950 shadow-lg transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isReady ? 'Enter Panda Forest' : 'Preparing World...'}
        </button>
      </div>
    </div>
  );
};

