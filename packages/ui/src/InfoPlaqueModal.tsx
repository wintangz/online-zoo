import React from 'react';
import { useStore } from 'zustand';
import { gameStore } from '@online-zoo/game-core';

export const InfoPlaqueModal: React.FC = () => {
  const activePlaqueModal = useStore(gameStore, (s) => s.activePlaqueModal);
  const closePlaqueModal = useStore(gameStore, (s) => s.closePlaqueModal);

  if (!activePlaqueModal || !activePlaqueModal.infoCard) {
    return null;
  }

  const { heading, body, facts } = activePlaqueModal.infoCard;

  return (
    <div
      data-testid="info-plaque-modal"
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl border border-amber-300/40 bg-emerald-950/95 p-6 text-white shadow-2xl">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">
          {activePlaqueModal.title}
        </div>
        <h2 className="text-2xl font-extrabold text-white">{heading}</h2>
        <p className="mt-3 text-sm leading-relaxed text-emerald-100/90">{body}</p>

        <ul className="mt-4 space-y-2 rounded-2xl border border-emerald-500/25 bg-emerald-900/45 p-4 text-xs text-emerald-100">
          {facts.map((fact, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-0.5 text-amber-300">•</span>
              <span>{fact}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          data-testid="close-plaque-btn"
          onClick={(e) => {
            e.currentTarget.blur();
            closePlaqueModal();
          }}
          className="mt-6 w-full select-none rounded-2xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-amber-300"
        >
          Close Plaque (ESC)
        </button>
      </div>
    </div>
  );
};

