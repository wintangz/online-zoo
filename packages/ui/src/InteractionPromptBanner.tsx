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
  const seatStates = useStore(gameStore, (s) => s.social.seatStates);
  const localSeatedState = useStore(gameStore, (s) => s.social.localSeatedState);

  if (phase !== 'playing' || activePlaqueModal) {
    return null;
  }

  const handleStandUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (!localSeatedState) return;
    if (typeof window !== 'undefined') {
      const w = window as unknown as {
        __ONLINE_ZOO_RUNTIME__?: {
          multiplayerClient?: {
            sendSeatInteraction: (objectId: string, action: 'sit' | 'stand') => void;
          };
        };
      };
      w.__ONLINE_ZOO_RUNTIME__?.multiplayerClient?.sendSeatInteraction(
        localSeatedState.objectId,
        'stand'
      );
    }
    gameStore.getState().setLocalSeatedState(null);
  };

  if (localSeatedState) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-30 flex select-none justify-center px-4">
        <button
          type="button"
          data-testid="stand-up-btn"
          onClick={handleStandUp}
          className="pointer-events-auto inline-flex select-none items-center justify-center gap-3 rounded-2xl border border-amber-300/60 bg-emerald-950/90 px-5 py-3 text-center text-white shadow-2xl backdrop-blur-md transition hover:scale-[1.02] active:scale-95"
        >
          <span className="inline-flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-lg bg-amber-400 px-2 text-center text-xs font-black leading-none text-emerald-950">
            {activeDevice === 'touch' ? 'TAP' : 'E'}
          </span>
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
              Stand Up
            </p>
            <p className="text-sm font-bold leading-snug text-white">
              Leave Seat (or press Move / Jump)
            </p>
          </div>
        </button>
      </div>
    );
  }

  if (!focusedObject) {
    return null;
  }

  const slots = focusedObject.seats ? seatStates[focusedObject.id] ?? [] : [];
  const totalSeats = slots.length;
  const freeSeats = slots.filter((s) => s.occupiedBySessionId === null).length;
  const isFullSeatObject = totalSeats > 0 && freeSeats === 0;

  const availabilityLabel =
    totalSeats > 0
      ? isFullSeatObject
        ? `Occupied (0/${totalSeats} seats free)`
        : `Available (${freeSeats}/${totalSeats} ${totalSeats === 1 ? 'seat' : 'seats'} free)`
      : null;

  const handleActivate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (totalSeats > 0 && typeof window !== 'undefined') {
      const w = window as unknown as {
        __ONLINE_ZOO_RUNTIME__?: {
          multiplayerClient?: {
            sendSeatInteraction: (objectId: string, action: 'sit' | 'stand') => void;
          };
        };
      };
      if (w.__ONLINE_ZOO_RUNTIME__?.multiplayerClient) {
        w.__ONLINE_ZOO_RUNTIME__.multiplayerClient.sendSeatInteraction(
          focusedObject.id,
          'sit'
        );
        return;
      }
    }
    inputController.triggerAction('interact');
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-30 flex select-none justify-center px-4">
      <button
        type="button"
        data-testid="interaction-prompt-banner"
        data-seat-available={totalSeats > 0 ? String(!isFullSeatObject) : undefined}
        onClick={handleActivate}
        className={`pointer-events-auto inline-flex select-none items-center justify-center gap-3 rounded-2xl border px-5 py-3 text-white shadow-2xl backdrop-blur-md transition hover:scale-[1.02] active:scale-95 ${
          isFullSeatObject
            ? 'border-rose-400/50 bg-rose-950/90'
            : 'border-amber-300/50 bg-emerald-950/90'
        }`}
      >
        <span
          className={`inline-flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-lg px-2 text-center text-xs font-black leading-none ${
            isFullSeatObject
              ? 'bg-rose-400 text-rose-950'
              : 'bg-amber-400 text-emerald-950'
          }`}
        >
          {isFullSeatObject ? 'FULL' : activeDevice === 'touch' ? 'TAP' : 'E'}
        </span>
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">
            {isFullSeatObject ? 'Seat Occupied' : focusedObject.promptAction}
          </p>
          <p className="text-sm font-bold leading-snug text-white">{focusedObject.title}</p>
          {availabilityLabel && (
            <span
              data-testid="seat-availability-badge"
              className={`mt-0.5 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-none ${
                isFullSeatObject
                  ? 'bg-rose-500/30 text-rose-200'
                  : 'bg-emerald-500/30 text-emerald-200'
              }`}
            >
              {availabilityLabel}
            </span>
          )}
        </div>
      </button>
    </div>
  );
};
