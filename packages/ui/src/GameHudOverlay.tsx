import React, { useEffect, useState } from 'react';
import { useStore } from 'zustand';
import {
  ANIMAL_SPECIES_IDS,
  computePassportProgressSummary,
  gameStore,
  getTotalOwnedFoodItems,
  getZoneById,
  SEASONAL_THEMES_BY_ID
} from '@online-zoo/game-core';

export const GameHudOverlay: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const locomotionState = useStore(gameStore, (s) => s.locomotionState);
  const activeDevice = useStore(gameStore, (s) => s.activeDevice);
  const isPointerLocked = useStore(gameStore, (s) => s.isPointerLocked);
  const isCursorRevealed = useStore(gameStore, (s) => s.isCursorRevealed);
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
  const seasonalTheme = useStore(gameStore, (s) => s.events.seasonalTheme);
  const eventsList = useStore(gameStore, (s) => s.events.events);
  const isEventsModalOpen = useStore(gameStore, (s) => s.events.isEventsModalOpen);
  const maintenanceNotice = useStore(gameStore, (s) => s.betaReadiness.maintenanceNotice);
  const isHelpCenterOpen = useStore(gameStore, (s) => s.betaReadiness.isHelpCenterOpen);
  const isDevDebugOpen = useStore(gameStore, (s) => s.isDevDebugOpen);
  const isChatPanelOpen = useStore(gameStore, (s) => s.isChatPanelOpen);
  const currentZoneId = useStore(gameStore, (s) => s.currentZoneId);
  const activeZone = getZoneById(currentZoneId);

  const setPhase = useStore(gameStore, (s) => s.setPhase);
  const openAvatarCustomizer = useStore(gameStore, (s) => s.openAvatarCustomizer);
  const setSocialDrawerOpen = useStore(gameStore, (s) => s.setSocialDrawerOpen);
  const setEncyclopediaOpen = useStore(gameStore, (s) => s.setEncyclopediaOpen);
  const setInventoryOpen = useStore(gameStore, (s) => s.setInventoryOpen);
  const openFoodStall = useStore(gameStore, (s) => s.openFoodStall);
  const closeFoodStall = useStore(gameStore, (s) => s.closeFoodStall);
  const setPassportOpen = useStore(gameStore, (s) => s.setPassportOpen);
  const setEventsModalOpen = useStore(gameStore, (s) => s.setEventsModalOpen);
  const setHelpCenterOpen = useStore(gameStore, (s) => s.setHelpCenterOpen);
  const toggleDevDebug = useStore(gameStore, (s) => s.toggleDevDebug);
  const toggleChatPanel = useStore(gameStore, (s) => s.toggleChatPanel);
  const [copiedHudId, setCopiedHudId] = useState(false);

  const discoveredSpeciesCount = ANIMAL_SPECIES_IDS.filter(
    (sid) => encyclopedia.entries[sid]?.discovered
  ).length;
  const totalFoodItems = getTotalOwnedFoodItems(diningWallet.inventory);
  const passportStats = computePassportProgressSummary(passportState, encyclopedia);
  const activeEventsCount = eventsList.filter((ev) => ev.status === 'active').length;
  const seasonalDescriptor = SEASONAL_THEMES_BY_ID[seasonalTheme];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.code === 'KeyJ' && phase === 'playing') {
        e.preventDefault();
        setEncyclopediaOpen(!gameStore.getState().animalSim.isEncyclopediaOpen);
      } else if (e.code === 'KeyB' && phase === 'playing') {
        e.preventDefault();
        setInventoryOpen(!gameStore.getState().dining.isInventoryOpen);
      } else if (e.code === 'KeyM' && phase === 'playing') {
        e.preventDefault();
        const curStall = gameStore.getState().dining.activeStallId;
        if (curStall) {
          closeFoodStall();
        } else {
          openFoodStall('prop-plaza-food-stall');
        }
      } else if (e.code === 'KeyP' && phase === 'playing') {
        e.preventDefault();
        setPassportOpen(!gameStore.getState().passport.isPassportOpen);
      } else if (e.code === 'KeyC' && phase === 'playing') {
        e.preventDefault();
        gameStore.getState().toggleChatPanel();
      } else if (e.code === 'KeyH' && phase === 'playing') {
        e.preventDefault();
        gameStore.getState().toggleDevDebug();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, setEncyclopediaOpen, setInventoryOpen, openFoodStall, closeFoodStall, setPassportOpen]);

  if (phase !== 'playing' && phase !== 'paused') {
    return null;
  }

  const lanternLit = propStates['prop-stone-lantern']?.active ?? true;
  const benchActive =
    Boolean(social.localSeatedState) ||
    (propStates['prop-scenic-bench']?.active ?? false) ||
    (propStates['prop-plaza-bench']?.active ?? false) ||
    (propStates['prop-pond-chair']?.active ?? false);
  const onlineFriendsCount = social.friends.filter((f) => f.online).length;
  const pendingRequestsCount = social.incomingRequests.length;

  const statusBadgeColors: Record<typeof multiplayer.status, string> = {
    connected: 'bg-emerald-500/30 border-emerald-300/50 text-emerald-100',
    connecting: 'bg-amber-500/30 border-amber-300/50 text-amber-100',
    reconnecting: 'bg-amber-500/35 border-amber-300/60 text-amber-100',
    disconnected: 'bg-rose-500/35 border-rose-300/60 text-rose-100'
  };

  const statusLabels: Record<typeof multiplayer.status, string> = {
    connected: 'Connected',
    connecting: 'Connecting...',
    reconnecting: `Reconnecting (${multiplayer.reconnectAttempt}/${multiplayer.maxReconnectAttempts})`,
    disconnected: 'Offline'
  };

  const triggerManualReconnect = () => {
    if (typeof window !== 'undefined') {
      const fn = (window as unknown as Record<string, unknown>).__ONLINE_ZOO_RECONNECT__;
      if (typeof fn === 'function') {
        (fn as () => void)();
      }
    }
  };

  const handleCopyHudPlayerId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(identityProfile.playerId).catch(() => {
        // Ignore clipboard errors in headless mode
      });
    }
    setCopiedHudId(true);
    setTimeout(() => setCopiedHudId(false), 1800);
  };

  return (
    <div
      data-testid="game-hud-overlay"
      className="pointer-events-none fixed inset-0 z-20 flex select-none flex-col justify-between p-3 sm:p-4"
    >
      {/* Top-Left Persistent Chip: ONLY Current Zone Name + Player Name & Avatar Chip */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div
          data-testid="hud-status-bar"
          className="pointer-events-auto flex max-w-[94vw] flex-col gap-1 rounded-2xl border border-white/15 bg-emerald-950/75 px-3 py-1.5 text-white shadow-lg backdrop-blur-md"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="hud-zone-badge"
              className="inline-flex items-center gap-1 text-xs font-extrabold tracking-tight text-white"
            >
              <span>{activeZone.badgeIcon}</span>
              <span>{activeZone.displayName}</span>
            </span>

            <span className="text-white/25">•</span>

            <button
              type="button"
              data-testid="open-avatar-customizer-btn"
              data-ui-interactive="true"
              onClick={(e) => {
                e.currentTarget.blur();
                openAvatarCustomizer();
              }}
              title="Customize Avatar & Display Name"
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-400/35 bg-emerald-900/65 px-2.5 py-0.5 text-[11px] font-semibold leading-none text-emerald-100 transition hover:bg-emerald-800/80 active:scale-95"
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: multiplayer.localAccentColor ?? '#10b981' }}
              />
              <span data-testid="local-visitor-badge" className="leading-none">
                {identityProfile.isCustomized
                  ? identityProfile.displayName
                  : multiplayer.localDisplayName ?? identityProfile.displayName}
              </span>
              <span className="text-[10px] text-emerald-300">✨</span>
            </button>
          </div>

          {/* Dev / Debug Diagnostic Strip (hidden by default; opt-in via Dev Toggle [H]) */}
          {isDevDebugOpen && (
            <div
              data-testid="hud-secondary-details-strip"
              className="flex flex-wrap items-center gap-1 border-t border-white/10 pt-1 text-[10px] text-emerald-100/80"
            >
              <span
                data-testid="multiplayer-status-badge"
                data-connection-status={multiplayer.status}
                className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${statusBadgeColors[multiplayer.status]}`}
              >
                <span
                  className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                    multiplayer.status === 'connected'
                      ? 'bg-emerald-300'
                      : multiplayer.status === 'disconnected'
                        ? 'bg-rose-300'
                        : 'animate-pulse bg-amber-300'
                  }`}
                />
                <span className="leading-none">{statusLabels[multiplayer.status]}</span>
              </span>

              <span
                data-testid="visitor-count-badge"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold leading-none text-emerald-100"
              >
                Visitors: {multiplayer.visitorCount}
              </span>

              <span
                data-testid="hud-currency-badge"
                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full border border-amber-300/45 bg-amber-500/20 px-2 py-0.5 text-[10px] font-extrabold leading-none text-amber-200"
              >
                <span>🪙</span>
                <span>{diningWallet.currencyBalance} Coins</span>
              </span>

              <span
                data-testid="hud-beta-badge"
                className="inline-flex items-center justify-center whitespace-nowrap rounded border border-amber-300/35 bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider leading-none text-amber-200"
              >
                Public Beta
              </span>

              <span
                data-testid="hud-instance-badge"
                data-instance-id={multiplayer.roomId}
                className="inline-flex items-center justify-center whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-sky-200"
              >
                Server: {multiplayer.roomId}
              </span>

              <span
                data-testid="hud-player-id-badge"
                title={identityProfile.playerId}
                className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded bg-black/25 px-1.5 py-0.5 font-mono text-[9px] leading-none text-emerald-200"
              >
                <span>ID: {identityProfile.playerId.slice(0, 13)}…</span>
                <button
                  type="button"
                  data-testid="hud-copy-player-id-btn"
                  data-ui-interactive="true"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleCopyHudPlayerId();
                  }}
                  className="rounded bg-emerald-400/20 px-1 py-0.5 font-sans text-[9px] font-bold leading-none text-emerald-100 hover:bg-emerald-400/35"
                >
                  {copiedHudId ? 'Copied!' : 'Copy'}
                </button>
              </span>

              <span
                data-testid="locomotion-state-badge"
                className="inline-flex items-center justify-center whitespace-nowrap rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-emerald-200"
              >
                {locomotionState}
              </span>

              <span
                data-testid="active-device-badge"
                className="inline-flex items-center justify-center whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none text-emerald-200/80"
              >
                {activeDevice}
              </span>

              <span
                data-testid="cursor-mode-badge"
                className="inline-flex items-center justify-center whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium leading-none text-emerald-200/80"
              >
                {isCursorRevealed
                  ? 'Cursor Unlocked (Alt)'
                  : isPointerLocked
                    ? 'Pointer Locked'
                    : 'Free-Look Camera Active'}
              </span>

              <span
                data-testid="lantern-state-badge"
                className="inline-flex items-center justify-center whitespace-nowrap rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-medium leading-none text-amber-200"
              >
                Lantern: {lanternLit ? 'Lit' : 'Off'}
              </span>

              {Object.values(multiplayer.remoteVisitors).map((visitor) => (
                <span
                  key={visitor.sessionId}
                  data-testid={`remote-visitor-badge-${visitor.sessionId}`}
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium leading-none text-emerald-100"
                >
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: visitor.accentColor }}
                  />
                  <span>
                    {visitor.displayName} ({visitor.locomotionState})
                  </span>
                </span>
              ))}

              {benchActive && (
                <span
                  data-testid="bench-resting-badge"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded bg-sky-400/20 px-1.5 py-0.5 text-[9px] font-medium leading-none text-sky-200"
                >
                  Resting at Bench
                </span>
              )}

              {passportState.activeBadge && (
                <span
                  data-testid="hud-active-badge"
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded bg-indigo-500/25 px-1.5 py-0.5 text-[9px] font-bold leading-none text-indigo-100"
                >
                  <span>🎖️</span>
                  <span>{passportState.activeBadge}</span>
                </span>
              )}

              {seasonalTheme !== 'none' && (
                <span
                  data-testid="hud-seasonal-badge"
                  data-seasonal-theme={seasonalTheme}
                  className="inline-flex items-center justify-center gap-1 whitespace-nowrap rounded bg-pink-500/20 px-1.5 py-0.5 text-[9px] font-bold leading-none text-pink-100"
                >
                  <span>{seasonalDescriptor.badgeIcon}</span>
                  <span>{seasonalDescriptor.label}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Live Maintenance / Release Notice Banner (FR-015, US10) */}
      {maintenanceNotice?.active && (
        <div
          data-testid="hud-maintenance-banner"
          data-severity={maintenanceNotice.severity}
          className={`pointer-events-auto mx-auto mt-1 flex w-full max-w-xl items-center justify-between gap-3 rounded-2xl border px-3.5 py-2 text-xs font-semibold shadow-xl backdrop-blur-md ${
            maintenanceNotice.severity === 'warning'
              ? 'border-amber-300/60 bg-amber-950/90 text-amber-100'
              : 'border-sky-300/60 bg-sky-950/90 text-sky-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{maintenanceNotice.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
            <span>{maintenanceNotice.message}</span>
          </div>
          <span className="whitespace-nowrap rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            Live Notice
          </span>
        </div>
      )}

      {/* Reconnection / Disconnected Banner (FR-010, Edge Case 2) */}
      {(multiplayer.status === 'reconnecting' || multiplayer.status === 'disconnected') && (
        <div
          data-testid="multiplayer-connection-banner"
          className="pointer-events-auto mx-auto my-auto flex max-w-md flex-col items-center gap-2 rounded-2xl border border-amber-300/40 bg-emerald-950/90 px-5 py-4 text-center text-white shadow-2xl backdrop-blur-md"
        >
          <p className="text-sm font-bold text-amber-200">
            {multiplayer.status === 'reconnecting'
              ? `Connection interrupted — attempting to resume session (${multiplayer.reconnectAttempt}/${multiplayer.maxReconnectAttempts})...`
              : 'Disconnected from Panda Forest multiplayer instance'}
          </p>
          {multiplayer.lastDisconnectReason && (
            <p className="text-xs text-emerald-200/85">{multiplayer.lastDisconnectReason}</p>
          )}
          {multiplayer.status === 'disconnected' && (
            <button
              type="button"
              data-testid="reconnect-multiplayer-btn"
              data-ui-interactive="true"
              onClick={triggerManualReconnect}
              className="mt-1 inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-emerald-400 px-4 py-1.5 text-center text-xs font-bold leading-none text-emerald-950 shadow transition hover:bg-emerald-300"
            >
              Reconnect to Zoo
            </button>
          )}
        </div>
      )}

      {/* Bottom-Right Area: ONE Small Unified Dock Row for Everything Else */}
      <div className="flex flex-col items-end self-end gap-1.5">
        <div
          data-testid="hud-action-dock"
          className="pointer-events-auto flex max-w-[94vw] flex-wrap items-center justify-end gap-1.5 rounded-2xl border border-white/20 bg-emerald-950/85 px-2.5 py-1.5 shadow-xl backdrop-blur-md"
        >
          <button
            type="button"
            data-testid="hud-chat-panel-btn"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              toggleChatPanel();
            }}
            className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-center text-[11px] font-bold leading-none transition active:scale-95 ${
              isChatPanelOpen
                ? 'border-emerald-300 bg-emerald-400 text-emerald-950 shadow'
                : 'border-white/15 bg-white/10 text-emerald-50 hover:bg-white/20'
            }`}
          >
            <span>💬</span>
            <span>Chat &amp; Emotes [C]</span>
          </button>

          <button
            type="button"
            data-testid="toggle-social-drawer-btn"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              setSocialDrawerOpen(!social.isSocialDrawerOpen);
            }}
            className={`relative inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-center text-[11px] font-bold leading-none transition active:scale-95 ${
              social.isSocialDrawerOpen
                ? 'border-teal-300 bg-teal-400 text-emerald-950 shadow'
                : 'border-white/15 bg-white/10 text-emerald-50 hover:bg-white/20'
            }`}
          >
            <span>🤝</span>
            <span>Social &amp; Friends ({onlineFriendsCount})</span>
            {pendingRequestsCount > 0 && (
              <span
                data-testid="pending-friend-requests-badge"
                className="ml-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-extrabold text-white"
              >
                {pendingRequestsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="hud-passport-btn"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              setPassportOpen(!isPassportOpen);
            }}
            className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-center text-[11px] font-bold leading-none transition active:scale-95 ${
              isPassportOpen
                ? 'border-indigo-300 bg-indigo-500 text-white shadow'
                : 'border-white/15 bg-white/10 text-emerald-50 hover:bg-white/20'
            }`}
          >
            <span>🛂</span>
            <span>
              Passport ({passportStats.overallPercentage}%) [P]
            </span>
          </button>

          <button
            type="button"
            data-testid="animal-encyclopedia-button"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              setEncyclopediaOpen(!isEncyclopediaOpen);
            }}
            className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-center text-[11px] font-bold leading-none transition active:scale-95 ${
              isEncyclopediaOpen
                ? 'border-emerald-300 bg-emerald-500 text-emerald-950 shadow'
                : 'border-white/15 bg-white/10 text-emerald-50 hover:bg-white/20'
            }`}
          >
            <span>📖</span>
            <span>
              Encyclopedia ({discoveredSpeciesCount}/{ANIMAL_SPECIES_IDS.length}) [J]
            </span>
          </button>

          <button
            type="button"
            data-testid="hud-food-stall-btn"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              if (activeStallId) {
                closeFoodStall();
              } else {
                openFoodStall('prop-plaza-food-stall');
              }
            }}
            className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-center text-[11px] font-bold leading-none transition active:scale-95 ${
              activeStallId
                ? 'border-amber-300 bg-amber-400 text-emerald-950 shadow'
                : 'border-white/15 bg-white/10 text-emerald-50 hover:bg-white/20'
            }`}
          >
            <span>🧋</span>
            <span>Food Stall [M]</span>
          </button>

          <button
            type="button"
            data-testid="toggle-food-inventory-btn"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              setInventoryOpen(!isInventoryOpen);
            }}
            className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-center text-[11px] font-bold leading-none transition active:scale-95 ${
              isInventoryOpen
                ? 'border-lime-300 bg-lime-400 text-emerald-950 shadow'
                : 'border-white/15 bg-white/10 text-emerald-50 hover:bg-white/20'
            }`}
          >
            <span>🎒</span>
            <span>Food Bag ({totalFoodItems}) [B]</span>
          </button>

          <button
            type="button"
            data-testid="hud-events-btn"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              setEventsModalOpen(!isEventsModalOpen);
            }}
            className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-center text-[11px] font-bold leading-none transition active:scale-95 ${
              isEventsModalOpen
                ? 'border-amber-300 bg-amber-400 text-emerald-950 shadow'
                : 'border-white/15 bg-white/10 text-emerald-50 hover:bg-white/20'
            }`}
          >
            <span>🎉</span>
            <span>Events ({activeEventsCount} Live) [V]</span>
          </button>

          <button
            type="button"
            data-testid="hud-help-beta-btn"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              setHelpCenterOpen(!isHelpCenterOpen, 'controls');
            }}
            className={`inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-center text-[11px] font-bold leading-none transition active:scale-95 ${
              isHelpCenterOpen
                ? 'border-amber-300 bg-amber-400 text-emerald-950 shadow'
                : 'border-amber-300/40 bg-white/10 text-amber-200 hover:bg-white/20'
            }`}
          >
            <span>❓</span>
            <span>Help &amp; Beta</span>
          </button>

          <button
            type="button"
            data-testid="open-settings-btn"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              setPhase(phase === 'paused' ? 'playing' : 'paused');
            }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-white/20 bg-white/10 px-2.5 py-1 text-center text-[11px] font-bold leading-none text-white transition hover:bg-white/20 active:scale-95"
          >
            ⚙️ Settings [ESC]
          </button>

          <button
            type="button"
            data-testid="hud-dev-debug-toggle-btn"
            data-ui-interactive="true"
            onClick={(e) => {
              e.currentTarget.blur();
              toggleDevDebug();
            }}
            title="Toggle Dev / Debug Telemetry Strip (H)"
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl border px-2 py-1 text-center text-[10px] font-bold leading-none transition active:scale-95 ${
              isDevDebugOpen
                ? 'border-sky-300 bg-sky-400 text-sky-950 shadow'
                : 'border-white/15 bg-white/5 text-emerald-200/80 hover:bg-white/15'
            }`}
          >
            🛠️ {isDevDebugOpen ? 'Hide Debug [H]' : 'Debug [H]'}
          </button>
        </div>
      </div>
    </div>
  );
};
