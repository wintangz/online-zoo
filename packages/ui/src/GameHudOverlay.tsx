import React from 'react';
import { useStore } from 'zustand';
import { gameStore } from '@online-zoo/game-core';

export const GameHudOverlay: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const locomotionState = useStore(gameStore, (s) => s.locomotionState);
  const activeDevice = useStore(gameStore, (s) => s.activeDevice);
  const isCursorRevealed = useStore(gameStore, (s) => s.isCursorRevealed);
  const showControlHints = useStore(gameStore, (s) => s.settings.showControlHints);
  const audioMuted = useStore(gameStore, (s) => s.settings.audioMuted);
  const propStates = useStore(gameStore, (s) => s.propStates);
  const setPhase = useStore(gameStore, (s) => s.setPhase);
  const setCursorState = useStore(gameStore, (s) => s.setCursorState);

  if (phase !== 'playing') {
    return null;
  }

  const lanternLit = propStates['prop-stone-lantern']?.active ?? true;
  const benchResting = propStates['prop-scenic-bench']?.active ?? false;

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (typeof document !== 'undefined' && document.pointerLockElement && typeof document.exitPointerLock === 'function') {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
    setPhase('paused');
    setCursorState(false, true);
  };

  return (
    <div
      data-testid="game-hud-overlay"
      className="pointer-events-none fixed inset-0 z-20 flex select-none flex-col justify-between p-4 sm:p-6"
    >
      {/* Top Bar: Zone Info + Locomotion Badge + Settings Menu Button */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-none flex flex-wrap items-center gap-2 rounded-2xl border border-white/20 bg-emerald-950/75 px-4 py-2.5 text-white shadow-lg backdrop-blur-md">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="text-sm font-bold tracking-wide">Panda Forest</span>
          <span className="text-xs text-emerald-300/80">|</span>
          <span
            data-testid="locomotion-state-badge"
            className="rounded-lg bg-emerald-500/25 px-2.5 py-0.5 text-xs font-semibold text-emerald-200"
          >
            {locomotionState}
          </span>
          <span
            data-testid="active-device-badge"
            className="rounded-lg bg-white/10 px-2 py-0.5 text-[11px] uppercase text-emerald-100"
          >
            {activeDevice}
          </span>
          {audioMuted && (
            <span className="rounded-lg bg-amber-500/25 px-2 py-0.5 text-[11px] text-amber-200">
              Muted
            </span>
          )}
          {benchResting && (
            <span
              data-testid="bench-resting-badge"
              className="rounded-lg bg-lime-400/25 px-2 py-0.5 text-[11px] text-lime-200"
            >
              Resting at Overlook
            </span>
          )}
          <span
            data-testid="lantern-state-badge"
            className="rounded-lg bg-amber-400/20 px-2 py-0.5 text-[11px] text-amber-200"
          >
            Lantern: {lanternLit ? 'Lit' : 'Off'}
          </span>
        </div>

        <button
          type="button"
          data-testid="open-settings-btn"
          onClick={handleOpenMenu}
          className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/25 bg-emerald-950/80 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-emerald-900"
        >
          <span>Menu / Settings</span>
          <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-[10px]">ESC</kbd>
        </button>
      </div>

      {/* Bottom Desktop Control Hints & Cursor Mode Indicator (centered so it never overlaps side touch/action controls) */}
      {showControlHints && activeDevice === 'desktop' && (
        <div className="mx-auto hidden items-center gap-3 pb-1 sm:flex">
          <div className="rounded-2xl border border-white/15 bg-emerald-950/75 px-4 py-2 text-xs text-emerald-100/90 shadow-lg backdrop-blur-md">
            <span>
              <strong>WASD</strong> Move • <strong>Shift</strong> Run • <strong>Space</strong> Jump
              • <strong>E</strong> Interact • <strong>Drag / Q,R</strong> Orbit •{' '}
              <strong>Scroll</strong> Zoom • Hold <strong>Alt</strong> Cursor
            </span>
          </div>

          <div
            data-testid="cursor-mode-badge"
            className="rounded-2xl border border-white/15 bg-emerald-950/75 px-3.5 py-2 text-xs font-medium text-emerald-200 shadow-lg backdrop-blur-md"
          >
            {isCursorRevealed ? 'Cursor Unlocked (Alt)' : 'Free-Look Camera Active'}
          </div>
        </div>
      )}
    </div>
  );
};

