import React, { useState } from 'react';
import { useStore } from 'zustand';
import {
  AVATAR_CUSTOMIZATION_CATALOG,
  gameStore,
  getHairColorHex,
  getOutfitColors,
  getSkinToneHex
} from '@online-zoo/game-core';

export const AvatarCustomizerModal: React.FC = () => {
  const profile = useStore(gameStore, (s) => s.identity.profile);
  const draft = useStore(gameStore, (s) => s.identity.draft);
  const setDraftDisplayName = useStore(gameStore, (s) => s.setDraftDisplayName);
  const setDraftAvatarOption = useStore(gameStore, (s) => s.setDraftAvatarOption);
  const resetDraftToDefault = useStore(gameStore, (s) => s.resetDraftToDefault);
  const cancelAvatarCustomizer = useStore(gameStore, (s) => s.cancelAvatarCustomizer);
  const confirmAvatarCustomization = useStore(
    gameStore,
    (s) => s.confirmAvatarCustomization
  );
  const [copiedId, setCopiedId] = useState(false);

  if (!draft.isOpen) {
    return null;
  }

  const handleCopyPlayerId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(profile.playerId).catch(() => {
        // Ignore clipboard fallback
      });
    }
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleRegeneratePlayerId = () => {
    const nextProfile = gameStore.getState().regeneratePlayerId();
    if (typeof window !== 'undefined') {
      const win = window as unknown as {
        __ONLINE_ZOO_RUNTIME__?: {
          multiplayerClient?: { sendIdentityUpdate: (p: typeof nextProfile) => void };
        };
      };
      win.__ONLINE_ZOO_RUNTIME__?.multiplayerClient?.sendIdentityUpdate(nextProfile);
    }
  };

  const skinHex = getSkinToneHex(draft.avatar.skinTone);
  const hairHex = getHairColorHex(draft.avatar.hairColor);
  const outfitColors = getOutfitColors(draft.avatar.outfit);

  const handleConfirm = (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    const res = confirmAvatarCustomization();
    if (res.ok && res.profile && typeof window !== 'undefined') {
      const win = window as unknown as {
        __ONLINE_ZOO_SYNC_IDENTITY__?: () => void;
        __ONLINE_ZOO_RUNTIME__?: {
          multiplayerClient?: { sendIdentityUpdate: (p: typeof res.profile) => void };
        };
      };
      if (typeof win.__ONLINE_ZOO_SYNC_IDENTITY__ === 'function') {
        win.__ONLINE_ZOO_SYNC_IDENTITY__();
      } else {
        win.__ONLINE_ZOO_RUNTIME__?.multiplayerClient?.sendIdentityUpdate(res.profile);
      }
    }
  };

  return (
    <div
      data-testid="avatar-customizer-modal"
      data-ui-interactive="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
    >
      <div className="max-h-[60vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-emerald-400/35 bg-emerald-950/95 p-5 text-white shadow-2xl sm:max-h-[85vh] sm:p-7">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-4">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/20 px-3 py-0.5 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Visitor Identity & Wardrobe
            </span>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
              Customize Your Explorer Avatar
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-emerald-200/80">
              <span>Persistent ID:</span>
              <code
                data-testid="persistent-player-id"
                className="select-all cursor-text rounded bg-black/40 px-2 py-0.5 font-mono text-amber-300"
              >
                {profile.playerId}
              </code>
              <button
                type="button"
                data-testid="customizer-copy-player-id-btn"
                onClick={handleCopyPlayerId}
                className="inline-flex items-center justify-center rounded-lg bg-amber-400 px-2.5 py-0.5 text-center text-[11px] font-bold text-emerald-950 transition hover:bg-amber-300"
              >
                {copiedId ? 'Copied!' : 'Copy ID'}
              </button>
              <button
                type="button"
                data-testid="customizer-regenerate-player-id-btn"
                onClick={handleRegeneratePlayerId}
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-2.5 py-0.5 text-center text-[11px] font-bold text-emerald-100 transition hover:bg-white/20"
              >
                New ID
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => cancelAvatarCustomizer()}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-center text-xs font-semibold text-emerald-100 transition hover:bg-white/20"
          >
            Close (ESC)
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Left Column: Live Avatar Preview Card + Display Name Input */}
          <div className="flex flex-col gap-4 md:col-span-5">
            <div
              data-testid="avatar-preview-card"
              data-preview-name={draft.displayName}
              data-preview-skin={draft.avatar.skinTone}
              data-preview-hairstyle={draft.avatar.hairstyle}
              data-preview-haircolor={draft.avatar.hairColor}
              data-preview-outfit={draft.avatar.outfit}
              data-preview-accessory={draft.avatar.accessory}
              className="flex flex-col items-center justify-center rounded-2xl border border-emerald-400/30 bg-gradient-to-b from-emerald-900/70 to-emerald-950/90 p-5 text-center shadow-inner"
            >
              {/* Overhead Nameplate Preview */}
              <div className="mb-3 inline-flex max-w-full items-center justify-center gap-1.5 rounded-full border border-white/30 bg-emerald-950/90 px-3.5 py-1 text-center text-xs font-bold text-white shadow">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: outfitColors.accent }}
                />
                <span data-testid="avatar-preview-nameplate" className="truncate">
                  {draft.displayName.trim() || profile.displayName}
                </span>
              </div>

              {/* Stylized SVG Live Avatar Figure Preview */}
              <svg
                viewBox="0 0 160 190"
                className="h-44 w-40 drop-shadow-lg"
                aria-label="Live Avatar Preview"
              >
                {/* Backpack accessory behind torso */}
                {draft.avatar.accessory === 'explorer-backpack' && (
                  <rect
                    x="44"
                    y="88"
                    width="72"
                    height="54"
                    rx="10"
                    fill="#8b5a2b"
                    stroke={outfitColors.accent}
                    strokeWidth="3"
                  />
                )}

                {/* Legs */}
                <rect x="58" y="138" width="18" height="40" rx="6" fill={outfitColors.secondary} />
                <rect x="84" y="138" width="18" height="40" rx="6" fill={outfitColors.secondary} />

                {/* Arms */}
                <rect x="38" y="88" width="14" height="44" rx="7" fill={outfitColors.primary} />
                <rect x="108" y="88" width="14" height="44" rx="7" fill={outfitColors.primary} />
                <circle cx="45" cy="134" r="6" fill={skinHex} />
                <circle cx="115" cy="134" r="6" fill={skinHex} />

                {/* Torso Jacket */}
                <rect x="52" y="84" width="56" height="58" rx="10" fill={outfitColors.primary} />
                {/* Accent Belt & Pocket */}
                <rect x="50" y="124" width="60" height="8" rx="3" fill={outfitColors.accent} />
                <rect x="84" y="96" width="14" height="14" rx="3" fill={outfitColors.accent} />

                {/* Neck & Head */}
                <rect x="72" y="72" width="16" height="16" rx="4" fill={skinHex} />
                <circle cx="80" cy="54" r="26" fill={skinHex} />

                {/* Hairstyle */}
                {draft.avatar.hairstyle === 'explorer-bob' && (
                  <path
                    d="M52 54 C52 28, 108 28, 108 54 L108 62 L100 62 L100 46 L60 46 L60 62 L52 62 Z"
                    fill={hairHex}
                  />
                )}
                {draft.avatar.hairstyle === 'sun-spiky' && (
                  <polygon
                    points="52,50 60,22 72,34 80,16 88,34 100,22 108,50"
                    fill={hairHex}
                  />
                )}
                {draft.avatar.hairstyle === 'bamboo-ponytail' && (
                  <>
                    <path d="M54 50 C54 26, 106 26, 106 50 Z" fill={hairHex} />
                    <path d="M104 44 Q126 48 120 74 Q108 68 104 52 Z" fill={hairHex} />
                  </>
                )}
                {draft.avatar.hairstyle === 'park-bun' && (
                  <>
                    <circle cx="80" cy="22" r="12" fill={hairHex} />
                    <path d="M54 50 C54 28, 106 28, 106 50 Z" fill={hairHex} />
                  </>
                )}

                {/* Eyes */}
                <circle cx="70" cy="54" r="3.5" fill="#1a1a1a" />
                <circle cx="90" cy="54" r="3.5" fill="#1a1a1a" />

                {/* Accessories on head */}
                {draft.avatar.accessory === 'safari-hat' && (
                  <>
                    <ellipse cx="80" cy="32" rx="42" ry="7" fill="#d9c193" />
                    <rect x="58" y="16" width="44" height="16" rx="6" fill="#e3cda2" />
                    <rect x="58" y="27" width="44" height="5" fill={outfitColors.accent} />
                  </>
                )}
                {draft.avatar.accessory === 'bamboo-visor' && (
                  <>
                    <rect x="54" y="32" width="52" height="7" rx="3" fill={outfitColors.accent} />
                    <path d="M50 38 Q80 46 110 38 Z" fill={outfitColors.primary} />
                  </>
                )}
                {draft.avatar.accessory === 'round-glasses' && (
                  <>
                    <circle
                      cx="70"
                      cy="54"
                      r="8"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="90"
                      cy="54"
                      r="8"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                    />
                    <line x1="78" y1="54" x2="82" y2="54" stroke="#f59e0b" strokeWidth="2.5" />
                  </>
                )}
              </svg>

              <p className="mt-2 text-center text-[11px] leading-snug text-emerald-200/90">
                Live Preview • Unsaved changes are only visible to you until confirmed.
              </p>
            </div>

            {/* Display Name Input & Validation Feedback */}
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-center">
              <label
                htmlFor="display-name-input"
                className="block text-center text-xs font-bold uppercase tracking-wider text-emerald-300"
              >
                Display Name (3–16 chars)
              </label>
              <input
                id="display-name-input"
                data-testid="display-name-input"
                type="text"
                maxLength={24}
                value={draft.displayName}
                onChange={(e) => setDraftDisplayName(e.target.value)}
                placeholder="Enter visitor name..."
                className="mt-2 w-full rounded-xl border border-white/25 bg-emerald-950/90 px-3.5 py-2 text-center text-sm font-semibold text-white placeholder-emerald-400/50 focus:border-emerald-400 focus:outline-none"
              />
              {!draft.validation.valid && draft.validation.errorMessage && (
                <p
                  data-testid="display-name-error"
                  className="mt-2 rounded-lg border border-rose-400/40 bg-rose-500/20 px-3 py-1.5 text-center text-xs font-medium leading-snug text-rose-200"
                >
                  {draft.validation.errorMessage}
                </p>
              )}
              {draft.validation.valid && (
                <p className="mt-1.5 text-center text-[11px] text-emerald-300/85">
                  ✓ Valid visitor display name ({draft.validation.normalizedName})
                </p>
              )}
            </div>
          </div>

          {/* Right Column: 5 Appearance Categories */}
          <div className="flex flex-col gap-4 md:col-span-7">
            {/* 1. Body / Skin Color */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                1. Body / Skin Tone
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AVATAR_CUSTOMIZATION_CATALOG.skinTones.map((tone) => {
                  const selected = draft.avatar.skinTone === tone.id;
                  return (
                    <button
                      key={tone.id}
                      type="button"
                      data-testid={`skin-option-${tone.id}`}
                      aria-pressed={selected}
                      onClick={() => setDraftAvatarOption('skinTone', tone.id)}
                      className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl border px-2.5 py-2 text-center text-xs font-semibold transition ${
                        selected
                          ? 'border-emerald-300 bg-emerald-500/30 text-white shadow'
                          : 'border-white/15 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full border border-white/40"
                        style={{ backgroundColor: tone.hex }}
                      />
                      <span className="w-full text-center leading-tight">{tone.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Hairstyle */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                2. Hairstyle
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {AVATAR_CUSTOMIZATION_CATALOG.hairstyles.map((style) => {
                  const selected = draft.avatar.hairstyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      data-testid={`hairstyle-option-${style.id}`}
                      aria-pressed={selected}
                      onClick={() => setDraftAvatarOption('hairstyle', style.id)}
                      className={`flex min-h-[2.75rem] items-center justify-center rounded-xl border px-3 py-2 text-center text-xs font-semibold transition ${
                        selected
                          ? 'border-emerald-300 bg-emerald-500/30 text-white shadow'
                          : 'border-white/15 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-full text-center leading-tight">{style.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Hair Color */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                3. Hair Color
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AVATAR_CUSTOMIZATION_CATALOG.hairColors.map((hc) => {
                  const selected = draft.avatar.hairColor === hc.id;
                  return (
                    <button
                      key={hc.id}
                      type="button"
                      data-testid={`haircolor-option-${hc.id}`}
                      aria-pressed={selected}
                      onClick={() => setDraftAvatarOption('hairColor', hc.id)}
                      className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-1 rounded-xl border px-2.5 py-2 text-center text-xs font-semibold transition ${
                        selected
                          ? 'border-emerald-300 bg-emerald-500/30 text-white shadow'
                          : 'border-white/15 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-full border border-white/40"
                        style={{ backgroundColor: hc.hex }}
                      />
                      <span className="w-full text-center leading-tight">{hc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Outfit */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                4. Park Outfit
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AVATAR_CUSTOMIZATION_CATALOG.outfits.map((outfit) => {
                  const selected = draft.avatar.outfit === outfit.id;
                  return (
                    <button
                      key={outfit.id}
                      type="button"
                      data-testid={`outfit-option-${outfit.id}`}
                      aria-pressed={selected}
                      onClick={() => setDraftAvatarOption('outfit', outfit.id)}
                      className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-center text-xs font-semibold transition ${
                        selected
                          ? 'border-emerald-300 bg-emerald-500/30 text-white shadow'
                          : 'border-white/15 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1">
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-white/30"
                          style={{ backgroundColor: outfit.primary }}
                        />
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-white/30"
                          style={{ backgroundColor: outfit.accent }}
                        />
                      </span>
                      <span className="w-full text-center leading-tight">{outfit.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Accessories */}
            <div>
              <span className="block text-xs font-bold uppercase tracking-wider text-emerald-300">
                5. Accessories
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AVATAR_CUSTOMIZATION_CATALOG.accessories.map((acc) => {
                  const selected = draft.avatar.accessory === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      data-testid={`accessory-option-${acc.id}`}
                      aria-pressed={selected}
                      onClick={() => setDraftAvatarOption('accessory', acc.id)}
                      className={`flex min-h-[2.75rem] items-center justify-center rounded-xl border px-2.5 py-2 text-center text-xs font-semibold transition ${
                        selected
                          ? 'border-emerald-300 bg-emerald-500/30 text-white shadow'
                          : 'border-white/15 bg-white/5 text-emerald-100/80 hover:bg-white/10'
                      }`}
                    >
                      <span className="w-full text-center leading-tight">{acc.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions: Reset to Default, Cancel, Confirm & Save */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
          <button
            type="button"
            data-testid="reset-avatar-btn"
            onClick={() => resetDraftToDefault()}
            className="inline-flex items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 px-4 py-2 text-center text-xs font-bold text-amber-200 transition hover:bg-amber-500/25"
          >
            Reset to Default Appearance
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="cancel-avatar-btn"
              onClick={() => cancelAvatarCustomizer()}
              className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-center text-xs font-bold text-white transition hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="confirm-avatar-btn"
              disabled={!draft.validation.valid}
              onClick={handleConfirm}
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-emerald-400 to-lime-400 px-5 py-2.5 text-center text-xs font-extrabold text-emerald-950 shadow-lg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Confirm & Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

