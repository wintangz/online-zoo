import React from 'react';
import { useStore } from 'zustand';
import { gameStore, type QualityTier } from '@online-zoo/game-core';

export const SettingsMenuModal: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const settings = useStore(gameStore, (s) => s.settings);
  const updateSettings = useStore(gameStore, (s) => s.updateSettings);
  const setPhase = useStore(gameStore, (s) => s.setPhase);
  const setCursorState = useStore(gameStore, (s) => s.setCursorState);

  if (phase !== 'paused') {
    return null;
  }

  const handleResume = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    setPhase('playing');
    setCursorState(false, false);
  };

  return (
    <div
      data-testid="settings-menu-modal"
      className="fixed inset-0 z-50 flex select-none items-center justify-center bg-black/60 p-4 backdrop-blur-md"
    >
      <div className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-emerald-950/95 p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold">Game Menu & Settings</h2>
          <span className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            Paused
          </span>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          {/* Camera Rotation Sensitivity */}
          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold text-emerald-200">
              <label htmlFor="camera-sensitivity-slider">Camera Rotation Sensitivity</label>
              <span data-testid="sensitivity-value">{settings.cameraSensitivity.toFixed(2)}x</span>
            </div>
            <input
              id="camera-sensitivity-slider"
              data-testid="camera-sensitivity-slider"
              type="range"
              min={0.2}
              max={2.5}
              step={0.05}
              value={settings.cameraSensitivity}
              onChange={(e) =>
                updateSettings({ cameraSensitivity: parseFloat(e.target.value) })
              }
              className="w-full accent-emerald-400"
            />
          </div>

          {/* Master Volume */}
          <div>
            <div className="mb-1 flex justify-between text-xs font-semibold text-emerald-200">
              <label htmlFor="master-volume-slider">Master Volume</label>
              <span>{Math.round(settings.masterVolume * 100)}%</span>
            </div>
            <input
              id="master-volume-slider"
              data-testid="master-volume-slider"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(e) => updateSettings({ masterVolume: parseFloat(e.target.value) })}
              className="w-full accent-emerald-400"
            />
          </div>

          {/* Quality Tier */}
          <div className="flex items-center justify-between">
            <label htmlFor="quality-tier-select" className="text-xs font-semibold text-emerald-200">
              Rendering Quality Tier
            </label>
            <select
              id="quality-tier-select"
              data-testid="quality-tier-select"
              value={settings.qualityTier}
              onChange={(e) =>
                updateSettings({ qualityTier: e.target.value as QualityTier })
              }
              className="rounded-xl border border-emerald-500/40 bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <option value="auto">Auto (Adaptive)</option>
              <option value="low">Low (Mobile Saver)</option>
              <option value="medium">Medium</option>
              <option value="high">High (Desktop Max)</option>
            </select>
          </div>

          {/* Checkboxes */}
          <div className="space-y-2 pt-1 text-xs">
            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-emerald-900/40 px-3 py-2">
              <span>Invert Camera Y-Axis</span>
              <input
                data-testid="invert-y-toggle"
                type="checkbox"
                checked={settings.invertCameraY}
                onChange={(e) => updateSettings({ invertCameraY: e.target.checked })}
                className="h-4 w-4 accent-emerald-400"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-emerald-900/40 px-3 py-2">
              <span>Mute Audio</span>
              <input
                data-testid="audio-mute-toggle"
                type="checkbox"
                checked={settings.audioMuted}
                onChange={(e) => updateSettings({ audioMuted: e.target.checked })}
                className="h-4 w-4 accent-emerald-400"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between rounded-xl bg-emerald-900/40 px-3 py-2">
              <span>Show On-Screen Control Hints</span>
              <input
                data-testid="control-hints-toggle"
                type="checkbox"
                checked={settings.showControlHints}
                onChange={(e) => updateSettings({ showControlHints: e.target.checked })}
                className="h-4 w-4 accent-emerald-400"
              />
            </label>
          </div>
        </div>

        <button
          type="button"
          data-testid="resume-game-btn"
          onClick={handleResume}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-400 px-5 py-3 text-sm font-bold text-emerald-950 shadow-lg transition hover:brightness-105"
        >
          Resume Panda Forest (ESC)
        </button>
      </div>
    </div>
  );
};

