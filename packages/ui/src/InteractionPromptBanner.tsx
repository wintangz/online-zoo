import React from 'react';
import { useStore } from 'zustand';
import { gameStore, type InputController } from '@online-zoo/game-core';

export interface InteractionPromptBannerProps {
  inputController: InputController;
}

export const InteractionPromptBanner: React.FC<InteractionPromptBannerProps> = ({
  inputController
}) => {
  const phase = useStore(gameStore, (s) => s.phase);
  const focusedObject = useStore(gameStore, (s) => s.focusedObject);
  const activeDevice = useStore(gameStore, (s) => s.activeDevice);
  const activePlaqueModal = useStore(gameStore, (s) => s.activePlaqueModal);

  if (phase !== 'playing' || !focusedObject || activePlaqueModal) {
    return null;
  }

  const handleActivate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    inputController.triggerAction('interact');
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex select-none justify-center px-4">
      <button
        type="button"
        data-testid="interaction-prompt-banner"
        onClick={handleActivate}
        className="pointer-events-auto flex select-none items-center gap-3 rounded-2xl border border-amber-300/50 bg-emerald-950/90 px-5 py-3 text-white shadow-2xl backdrop-blur-md transition hover:scale-[1.02] active:scale-95"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-xs font-black text-emerald-950">
          {activeDevice === 'touch' ? 'TAP' : 'E'}
        </span>
        <div className="text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            {focusedObject.promptAction}
          </p>
          <p className="text-sm font-bold text-white">{focusedObject.title}</p>
        </div>
      </button>
    </div>
  );
};
