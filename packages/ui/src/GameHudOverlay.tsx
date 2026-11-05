import React, { useState } from 'react';
import { useStore } from 'zustand';
import {
  computePassportProgressSummary,
  gameStore,
  getTotalOwnedFoodItems,
  SEASONAL_THEMES_BY_ID
} from '@online-zoo/game-core';

export const GameHudOverlay: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const locomotionState = useStore(gameStore, (s) => s.locomotionState);
  const activeDevice = useStore(gameStore, (s) => s.activeDevice);
  const isCursorRevealed = useStore(gameStore, (s) => s.isCursorRevealed);
  const showControlHints = useStore(gameStore, (s) => s.settings.showControlHints);
  const audioMuted = useStore(gameStore, (s) => s.settings.audioMuted);
  const propStates = useStore(gameStore, (s) => s.propStates);
  const multiplayer = useStore(gameStore, (s) => s.multiplayer);
  const identityProfile = useStore(gameStore, (s) => s.identity.profile);
  const social = useStore(gameStore, (s) => s.social);
  const encyclopedia = useStore(gameStore, (s) => s.animalSim.encyclopedia);
  const isEncyclopediaOpen = useStore(gameStore, (s) => s.animalSim.isEncyclopediaOpen);
  const diningWallet = useStore(gameStore, (s) => s.dining.wallet);
  const isInventoryOpen = useStore(gameStore, (s) => s.dining.isInventoryOpen);
  const activeStallId = useStore(gameStore, (s) => s.dining.activeStallId);
  const passportState = useStore(gameStore, (s) => s.passport.state);
  const isPassportOpen = useStore(gameStore, (s) => s.passport.isPassportOpen);
  const zooEventsMap = useStore(gameStore, (s) => s.events.events);
  const seasonalTheme = useStore(gameStore, (s) => s.events.seasonalTheme);
  const isEventsModalOpen = useStore(gameStore, (s) => s.events.isEventsModalOpen);
  const setPhase = useStore(gameStore, (s) => s.setPhase);
  const setCursorState = useStore(gameStore, (s) => s.setCursorState);
  const openAvatarCustomizer = useStore(gameStore, (s) => s.openAvatarCustomizer);
  const setSocialDrawerOpen = useStore(gameStore, (s) => s.setSocialDrawerOpen);
  const setEncyclopediaOpen = useStore(gameStore, (s) => s.setEncyclopediaOpen);
  const setInventoryOpen = useStore(gameStore, (s) => s.setInventoryOpen);
  const openFoodStall = useStore(gameStore, (s) => s.openFoodStall);
  const closeFoodStall = useStore(gameStore, (s) => s.closeFoodStall);
  const setPassportOpen = useStore(gameStore, (s) => s.setPassportOpen);
  const setEventsModalOpen = useStore(gameStore, (s) => s.setEventsModalOpen);
  const [hudCopied, setHudCopied] = useState(false);

  const discoveredSpeciesCount = Object.values(encyclopedia.entries).filter(
    (e) => e.discovered
  ).length;
  const totalOwnedFood = getTotalOwnedFoodItems(diningWallet.inventory);
  const passportSummary = computePassportProgressSummary(
    passportState,
    encyclopedia
  );
  const activeEventsCount = Object.values(zooEventsMap).filter(
    (e) => e.status === 'active'
  ).length;
  const activeSeasonDef = SEASONAL_THEMES_BY_ID[seasonalTheme];

  if (phase !== 'playing') {
    return null;
  }

  const handleCopyHudId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(identityProfile.playerId).catch(() => {
        // Ignore clipboard fallback
      });
    }
    setHudCopied(true);
    setTimeout(() => setHudCopied(false), 1800);
  };

  const lanternLit = propStates['prop-stone-lantern']?.active ?? true;
  const benchResting =
    Boolean(social.localSeatedState) || (propStates['prop-scenic-bench']?.active ?? false);
  const remoteVisitorList = Object.values(multiplayer.remoteVisitors);
  const pendingRequestsCount = social.incomingRequests.length;

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (
      typeof document !== 'undefined' &&
      document.pointerLockElement &&
      typeof document.exitPointerLock === 'function'
    ) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
    setPhase('paused');
    setCursorState(false, true);
  };

  const handleManualReconnect = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
    if (typeof window !== 'undefined') {
      const w = window as unknown as {
        __ONLINE_ZOO_RECONNECT__?: () => void;
        __ONLINE_ZOO_RUNTIME__?: { multiplayerClient?: { connect: () => void } };
      };
      if (typeof w.__ONLINE_ZOO_RECONNECT__ === 'function') {
        w.__ONLINE_ZOO_RECONNECT__();
      } else {
        w.__ONLINE_ZOO_RUNTIME__?.multiplayerClient?.connect();
      }
    }
  };

  const statusConfig = (() => {
    switch (multiplayer.status) {
      case 'connected':
        return {
          dotClass: 'bg-emerald-400',
          badgeClass: 'bg-emerald-500/25 text-emerald-200 border-emerald-400/30',
          label: 'Connected'
        };
      case 'connecting':
        return {
          dotClass: 'bg-sky-400 animate-pulse',
          badgeClass: 'bg-sky-500/25 text-sky-200 border-sky-400/30',
          label: 'Connecting...'
        };
      case 'reconnecting':
        return {
          dotClass: 'bg-amber-400 animate-pulse',
          badgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/30',
          label: `Reconnecting (${multiplayer.reconnectAttempt}/${multiplayer.maxReconnectAttempts})...`
        };
      case 'disconnected':
      default:
        return {
          dotClass: 'bg-rose-400',
          badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-400/30',
          label: 'Disconnected (Offline Mode)'
        };
    }
  })();

  return (
    <div
      data-testid="game-hud-overlay"
      className="pointer-events-none fixed inset-0 z-20 flex select-none flex-col justify-between p-4 sm:p-6"
    >
      {/* Top Bar: Zone Info + Multiplayer Status + Locomotion Badge + Social/Avatar/Settings Buttons */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/20 bg-emerald-950/75 px-4 py-2.5 text-center text-white shadow-lg backdrop-blur-md">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusConfig.dotClass}`} />
            <span className="whitespace-nowrap text-sm font-bold leading-none tracking-wide">
              Panda Forest
            </span>
            <span className="text-xs leading-none text-emerald-300/80">|</span>

            {/* Multiplayer Connection Status Badge (FR-014) */}
            <span
              data-testid="multiplayer-status-badge"
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg border px-2.5 py-1 text-center text-xs font-semibold leading-none ${statusConfig.badgeClass}`}
            >
              {statusConfig.label}
            </span>

            {/* Visitor Count Badge (FR-014) */}
            <span
              data-testid="visitor-count-badge"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-white/15 px-2.5 py-1 text-center text-xs font-semibold leading-none text-emerald-100"
            >
              Visitors: {multiplayer.visitorCount}
            </span>

            {/* Instance / Server Selector Badge (FR-025, FR-026) */}
            <button
              type="button"
              data-testid="hud-instance-badge"
              title="Click to view or switch zoo instances / servers"
              onClick={(e) => {
                e.currentTarget.blur();
                setSocialDrawerOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-sky-400/35 bg-sky-500/20 px-2.5 py-1 text-center text-xs font-semibold leading-none text-sky-200 transition hover:bg-sky-500/35"
            >
              <span>Server:</span>
              <span className="font-mono font-bold text-white">{multiplayer.roomId}</span>
            </button>

            {/* Local Visitor Identity Badge + Selectable/Copiable ID (FR-002, FR-013, FR-028) */}
            {(multiplayer.localDisplayName || identityProfile.displayName) && (
              <span
                data-testid="local-visitor-badge"
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-1 text-center text-xs font-semibold leading-none text-white"
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: multiplayer.localAccentColor ?? '#10b981' }}
                />
                <span className="leading-none">
                  {identityProfile.isCustomized
                    ? identityProfile.displayName
                    : multiplayer.localDisplayName ?? identityProfile.displayName}
                </span>
              </span>
            )}

            <span className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-amber-300/30 bg-black/35 px-2 py-1 text-center text-[11px] leading-none text-amber-200">
              <code
                data-testid="hud-player-id-badge"
                className="select-all cursor-text font-mono text-[11px] font-bold text-amber-300"
              >
                {identityProfile.playerId}
              </code>
              <button
                type="button"
                data-testid="hud-copy-player-id-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  handleCopyHudId();
                }}
                className="inline-flex items-center justify-center rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold leading-none text-emerald-950 transition hover:bg-amber-300"
              >
                {hudCopied ? 'Copied!' : 'Copy'}
              </button>
            </span>

            {/* Manual In-App Reconnect Button (FR-017, SC-008) */}
            {(multiplayer.status === 'disconnected' || multiplayer.status === 'reconnecting') && (
              <button
                type="button"
                data-testid="reconnect-multiplayer-btn"
                onClick={handleManualReconnect}
                className="pointer-events-auto inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-emerald-500 px-3 py-1 text-center text-xs font-bold leading-none text-emerald-950 shadow transition hover:bg-emerald-400 active:scale-95"
              >
                Reconnect to Zoo
              </button>
            )}

            <span className="text-xs leading-none text-emerald-300/80">|</span>
            <span
              data-testid="locomotion-state-badge"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-emerald-500/25 px-2.5 py-1 text-center text-xs font-semibold leading-none text-emerald-200"
            >
              {social.localSeatedState ? 'Seated' : locomotionState}
            </span>
            <span
              data-testid="active-device-badge"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-white/10 px-2 py-1 text-center text-[11px] font-medium uppercase leading-none text-emerald-100"
            >
              {activeDevice}
            </span>
            {audioMuted && (
              <span className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-amber-500/25 px-2 py-1 text-center text-[11px] font-medium leading-none text-amber-200">
                Muted
              </span>
            )}
            {benchResting && (
              <span
                data-testid="bench-resting-badge"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-lime-400/25 px-2 py-1 text-center text-[11px] font-medium leading-none text-lime-200"
              >
                Resting at Bench
              </span>
            )}
            <span
              data-testid="lantern-state-badge"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-amber-400/20 px-2 py-1 text-center text-[11px] font-medium leading-none text-amber-200"
            >
              Lantern: {lanternLit ? 'Lit' : 'Off'}
            </span>
            <span
              data-testid="hud-currency-badge"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-amber-400/40 bg-amber-500/20 px-2.5 py-1 text-center text-xs font-extrabold leading-none text-amber-200"
            >
              🪙 {diningWallet.currencyBalance} Coins
            </span>
            {passportState.activeBadge && (
              <span
                data-testid="hud-active-badge"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-lime-400/45 bg-lime-500/20 px-2.5 py-1 text-center text-xs font-extrabold leading-none text-lime-200"
              >
                🎖️ {passportState.activeBadge}
              </span>
            )}
            {seasonalTheme !== 'none' && activeSeasonDef && (
              <span
                data-testid="hud-seasonal-badge"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-pink-400/45 bg-pink-500/20 px-2.5 py-1 text-center text-xs font-extrabold leading-none text-pink-200"
              >
                {activeSeasonDef.badgeIcon} {activeSeasonDef.label}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="hud-events-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                setEventsModalOpen(!isEventsModalOpen);
              }}
              className="pointer-events-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-amber-300/60 bg-emerald-900/95 px-4 py-2.5 text-center text-xs font-extrabold leading-none text-amber-200 shadow-lg backdrop-blur-md transition hover:bg-emerald-800"
            >
              <span>🎪 Events ({activeEventsCount} Active)</span>
            </button>

            <button
              type="button"
              data-testid="hud-passport-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                setPassportOpen(!isPassportOpen);
              }}
              className="pointer-events-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-amber-300/55 bg-emerald-900/95 px-4 py-2.5 text-center text-xs font-extrabold leading-none text-amber-200 shadow-lg backdrop-blur-md transition hover:bg-emerald-800"
            >
              <span>🛂 Passport ({passportSummary.overallPercentage}%)</span>
            </button>

            <button
              type="button"
              data-testid="hud-food-stall-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                if (activeStallId) {
                  closeFoodStall();
                } else {
                  openFoodStall('prop-plaza-food-stall');
                }
              }}
              className="pointer-events-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-amber-300/45 bg-emerald-900/90 px-4 py-2.5 text-center text-xs font-bold leading-none text-amber-100 shadow-lg backdrop-blur-md transition hover:bg-emerald-800"
            >
              <span>🍔 Food Stall</span>
            </button>

            <button
              type="button"
              data-testid="toggle-food-inventory-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                setInventoryOpen(!isInventoryOpen);
              }}
              className="pointer-events-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-lime-300/40 bg-emerald-900/90 px-4 py-2.5 text-center text-xs font-bold leading-none text-lime-100 shadow-lg backdrop-blur-md transition hover:bg-emerald-800"
            >
              <span>🎒 Food Bag ({totalOwnedFood})</span>
            </button>

            <button
              type="button"
              data-testid="animal-encyclopedia-button"
              onClick={(e) => {
                e.currentTarget.blur();
                setEncyclopediaOpen(!isEncyclopediaOpen);
              }}
              className="pointer-events-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-emerald-300/40 bg-emerald-900/90 px-4 py-2.5 text-center text-xs font-bold leading-none text-emerald-100 shadow-lg backdrop-blur-md transition hover:bg-emerald-800"
            >
              <span>🐼 Encyclopedia ({discoveredSpeciesCount}/3)</span>
            </button>

            <button
              type="button"
              data-testid="toggle-social-drawer-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                setSocialDrawerOpen(!social.isSocialDrawerOpen);
              }}
              className="pointer-events-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-amber-300/40 bg-emerald-900/90 px-4 py-2.5 text-center text-xs font-bold leading-none text-amber-100 shadow-lg backdrop-blur-md transition hover:bg-emerald-800"
            >
              <span>Social & Friends</span>
              {pendingRequestsCount > 0 && (
                <span
                  data-testid="pending-friend-requests-badge"
                  className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-400 px-1 text-center text-[10px] font-black leading-none text-emerald-950"
                >
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              data-testid="open-avatar-customizer-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                openAvatarCustomizer();
              }}
              className="pointer-events-auto inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl border border-emerald-300/35 bg-emerald-900/85 px-4 py-2.5 text-center text-xs font-bold leading-none text-emerald-100 shadow-lg backdrop-blur-md transition hover:bg-emerald-800"
            >
              <span>Customize Avatar</span>
            </button>

            <button
              type="button"
              data-testid="open-settings-btn"
              onClick={handleOpenMenu}
              className="pointer-events-auto inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-white/25 bg-emerald-950/80 px-4 py-2.5 text-center text-xs font-bold leading-none text-white shadow-lg backdrop-blur-md transition hover:bg-emerald-900"
            >
              <span>Menu / Settings</span>
              <kbd className="inline-flex items-center justify-center rounded bg-white/15 px-1.5 py-0.5 text-center text-[10px] leading-none">
                ESC
              </kbd>
            </button>
          </div>
        </div>

        {/* Active Remote Visitors Strip (FR-009, FR-024) */}
        {remoteVisitorList.length > 0 && (
          <div
            data-testid="remote-visitors-roster"
            className="pointer-events-auto flex flex-wrap items-center gap-2"
          >
            {remoteVisitorList.map((visitor) => (
              <button
                key={visitor.sessionId}
                type="button"
                data-testid={`remote-visitor-badge-${visitor.sessionId}`}
                onClick={() => setSocialDrawerOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/20 bg-emerald-950/80 px-3 py-1 text-center text-xs font-semibold leading-none text-white shadow backdrop-blur-md transition hover:border-amber-300/50"
              >
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: visitor.accentColor }}
                />
                <span>{visitor.displayName}</span>
                <span className="text-[10px] text-emerald-300/90">
                  ({visitor.seatedOn ? 'Seated' : visitor.locomotionState})
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Desktop Control Hints & Cursor Mode Indicator */}
      {showControlHints && activeDevice === 'desktop' && (
        <div className="mx-auto hidden items-center justify-center gap-3 pb-1 lg:flex">
          <div className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-emerald-950/75 px-4 py-2 text-center text-xs text-emerald-100/90 shadow-lg backdrop-blur-md">
            <span>
              <strong>WASD</strong> Move • <strong>Shift</strong> Run • <strong>Space</strong> Jump
              • <strong>E</strong> Interact/Sit • <strong>Drag</strong> Orbit •{' '}
              <strong>Scroll</strong> Zoom
            </span>
          </div>

          <div
            data-testid="cursor-mode-badge"
            className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl border border-white/15 bg-emerald-950/75 px-3.5 py-2 text-center text-xs font-medium text-emerald-200 shadow-lg backdrop-blur-md"
          >
            {isCursorRevealed ? 'Cursor Unlocked (Alt)' : 'Free-Look Camera Active'}
          </div>
        </div>
      )}
    </div>
  );
};
