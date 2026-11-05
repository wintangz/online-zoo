import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import {
  DEFAULT_ENTRY_ZONE_ID,
  evaluateMainMenuPlayAttempt,
  fetchServerOccupancy,
  gameStore,
  getHairColorHex,
  getOutfitColors,
  getSkinToneHex,
  getZoneById,
  hasReturningVisitorFlag,
  markReturningVisitor,
  PUBLIC_BETA_VERSION,
  resolveInitialMenuSelection,
  savePlayerIdentity,
  validateDisplayName,
  WORLD_ZONES_LIST,
  type MainMenuFailureState,
  type ServerOccupancySnapshot,
  type WorldZoneId
} from '@online-zoo/game-core';

export interface MainMenuPlayPayload {
  zoneId: WorldZoneId;
  roomId: string;
  displayName: string;
}

export interface MainMenuScreenProps {
  wsUrl?: string;
  sharedRoomParam?: string | null;
  externalFailure?: MainMenuFailureState | null;
  onPlay: (payload: MainMenuPlayPayload) => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({
  wsUrl,
  sharedRoomParam,
  externalFailure,
  onPlay
}) => {
  const identityProfile = useStore(gameStore, (s) => s.identity.profile);
  const isCustomizerOpen = useStore(gameStore, (s) => s.identity.draft.isOpen);
  const hasCompletedOnboarding = useStore(
    gameStore,
    (s) => s.betaReadiness.hasCompletedOnboarding
  );
  const openAvatarCustomizer = useStore(gameStore, (s) => s.openAvatarCustomizer);
  const setSettingsModalOpen = useStore(gameStore, (s) => s.setSettingsModalOpen);

  const [displayNameInput, setDisplayNameInput] = useState<string>(identityProfile.displayName);
  const [isReturningVisitor, setIsReturningVisitor] = useState<boolean>(false);
  const [selectedZoneId, setSelectedZoneId] = useState<WorldZoneId>(DEFAULT_ENTRY_ZONE_ID);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('zoo-lobby-1');
  const [occupancy, setOccupancy] = useState<ServerOccupancySnapshot | null>(null);
  const [serverReachable, setServerReachable] = useState<boolean>(true);
  const [isCheckingServer, setIsCheckingServer] = useState<boolean>(true);
  const [menuFailure, setMenuFailure] = useState<MainMenuFailureState | null>(null);

  // Sync display name input whenever identityProfile changes (e.g. after closing AvatarCustomizerModal)
  useEffect(() => {
    const profile = gameStore.getState().initializePlayerIdentity();
    setDisplayNameInput(profile.displayName);

    const returning =
      hasReturningVisitorFlag() ||
      profile.isCustomized ||
      gameStore.getState().betaReadiness.hasCompletedOnboarding;
    setIsReturningVisitor(returning);

    const urlRoom =
      sharedRoomParam !== undefined
        ? sharedRoomParam
        : typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('room')
          : null;

    const initialSelection = resolveInitialMenuSelection({
      isReturningVisitor: returning,
      sharedRoomParam: urlRoom
    });
    setSelectedZoneId(initialSelection.selectedZoneId);
    setSelectedRoomId(initialSelection.selectedRoomId);
  }, [sharedRoomParam, hasCompletedOnboarding]);

  useEffect(() => {
    if (!isCustomizerOpen) {
      setDisplayNameInput(identityProfile.displayName);
    }
  }, [identityProfile.displayName, isCustomizerOpen]);

  const refreshOccupancy = useCallback(async () => {
    setIsCheckingServer(true);
    const result = await fetchServerOccupancy(wsUrl);
    setIsCheckingServer(false);
    if (result.ok && result.snapshot) {
      setOccupancy(result.snapshot);
      setServerReachable(true);
      setMenuFailure((prev) =>
        prev?.kind === 'server_unreachable' ? null : prev
      );
      return { ok: true, snapshot: result.snapshot };
    } else {
      setServerReachable(false);
      setOccupancy(null);
      setMenuFailure({
        kind: 'server_unreachable',
        title: 'Game Server Unreachable',
        message:
          result.error ??
          'Unable to reach the Online Zoo multiplayer server. Please check your connection or retry.',
        timestamp: Date.now()
      });
      return { ok: false, snapshot: null };
    }
  }, [wsUrl]);

  useEffect(() => {
    void refreshOccupancy();
    const interval = setInterval(() => {
      void refreshOccupancy();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshOccupancy]);

  const activeFailure = externalFailure ?? menuFailure;

  const handleDisplayNameChange = (value: string) => {
    setDisplayNameInput(value);
    if (menuFailure?.kind === 'name_rejected') {
      setMenuFailure(null);
    }
    const validation = validateDisplayName(value);
    if (validation.valid) {
      const currentProfile = gameStore.getState().identity.profile;
      const isCustom = !/^Explorer #\d+$/.test(validation.normalizedName);
      const updated = savePlayerIdentity({
        ...currentProfile,
        displayName: validation.normalizedName,
        isCustomized: isCustom || currentProfile.isCustomized,
        updatedAt: new Date().toISOString()
      });
      gameStore.setState((state) => ({
        identity: {
          ...state.identity,
          profile: updated,
          draft: {
            ...state.identity.draft,
            displayName: updated.displayName,
            validation
          }
        }
      }));
    }
  };

  const handleSelectZone = (zoneId: WorldZoneId) => {
    if (!isReturningVisitor && zoneId !== DEFAULT_ENTRY_ZONE_ID) {
      return;
    }
    const zone = getZoneById(zoneId);
    setSelectedZoneId(zoneId);
    setSelectedRoomId(zone.roomId);
    if (menuFailure?.kind === 'room_full') {
      setMenuFailure(null);
    }
  };

  const handleClickPlay = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();

    // 1. Validate display name immediately before checking server
    const preCheck = evaluateMainMenuPlayAttempt({
      displayName: displayNameInput,
      selectedZoneId,
      selectedRoomId,
      isReturningVisitor,
      serverReachable: true,
      occupancy
    });
    if (!preCheck.allowed && preCheck.failure?.kind === 'name_rejected') {
      setMenuFailure(preCheck.failure);
      return;
    }

    // 2. Refresh occupancy if server was unreachable or not yet loaded
    let currentReachable = serverReachable;
    let currentOccupancy = occupancy;
    if (!currentReachable || !currentOccupancy) {
      const fresh = await refreshOccupancy();
      currentReachable = fresh.ok;
      currentOccupancy = fresh.snapshot;
    }

    const attempt = evaluateMainMenuPlayAttempt({
      displayName: displayNameInput,
      selectedZoneId,
      selectedRoomId,
      isReturningVisitor,
      serverReachable: currentReachable,
      occupancy: currentOccupancy
    });

    if (!attempt.allowed || !attempt.targetZoneId || !attempt.targetRoomId || !attempt.normalizedDisplayName) {
      if (attempt.failure) {
        setMenuFailure(attempt.failure);
      }
      return;
    }

    // Persist profile and mark returning visitor
    const currentProfile = gameStore.getState().identity.profile;
    const isCustom = !/^Explorer #\d+$/.test(attempt.normalizedDisplayName);
    const saved = savePlayerIdentity({
      ...currentProfile,
      displayName: attempt.normalizedDisplayName,
      isCustomized: isCustom || currentProfile.isCustomized,
      updatedAt: new Date().toISOString()
    });
    gameStore.setState((state) => ({
      currentZoneId: attempt.targetZoneId!,
      identity: {
        ...state.identity,
        profile: saved
      },
      multiplayer: {
        ...state.multiplayer,
        roomId: attempt.targetRoomId!,
        localDisplayName: saved.isCustomized ? saved.displayName : state.multiplayer.localDisplayName
      }
    }));
    markReturningVisitor();
    setIsReturningVisitor(true);
    setMenuFailure(null);

    onPlay({
      zoneId: attempt.targetZoneId,
      roomId: attempt.targetRoomId,
      displayName: attempt.normalizedDisplayName
    });
  };

  const avatar = identityProfile.avatar;
  const skinHex = getSkinToneHex(avatar.skinTone);
  const hairHex = getHairColorHex(avatar.hairColor);
  const outfitColors = getOutfitColors(avatar.outfit);

  return (
    <div
      data-testid="main-menu-screen"
      className="fixed inset-0 z-40 flex select-none flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-emerald-950 via-emerald-900 to-teal-950 px-4 py-6 text-white"
    >
      <div className="w-full max-w-3xl rounded-3xl border border-emerald-400/30 bg-emerald-950/85 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="entry-zone-label"
                className="inline-flex items-center rounded-full bg-emerald-500/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-300"
              >
                Online Zoo • Social Wildlife World
              </span>
              <span
                data-testid="entry-beta-badge"
                className="inline-flex items-center rounded-full border border-amber-300/45 bg-amber-400/20 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-amber-200"
              >
                Public Beta v{PUBLIC_BETA_VERSION}
              </span>
            </div>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Online Zoo — Main Menu
            </h1>
          </div>

          <button
            type="button"
            data-testid="main-menu-settings-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              setSettingsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-300/35 bg-emerald-900/70 px-4 py-2.5 text-xs font-bold text-emerald-100 shadow transition hover:bg-emerald-800/80"
          >
            <span>⚙️</span>
            <span>Settings</span>
          </button>
        </div>

        {/* Designed Failure State Banner (Server Unreachable / Room Full / Name Rejected) */}
        {activeFailure && (
          <div
            role="alert"
            data-testid={
              activeFailure.kind === 'server_unreachable'
                ? 'menu-error-server-unreachable'
                : activeFailure.kind === 'room_full'
                  ? 'menu-error-room-full'
                  : 'menu-error-name-rejected'
            }
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-400/50 bg-rose-950/85 px-4 py-3 text-rose-100 shadow-lg"
          >
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-rose-300">
                {activeFailure.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-rose-100">
                {activeFailure.message}
              </p>
            </div>
            {activeFailure.kind === 'server_unreachable' && (
              <button
                type="button"
                data-testid="menu-retry-connection-btn"
                onClick={() => void refreshOccupancy()}
                className="rounded-xl border border-rose-300/50 bg-rose-500/30 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-500/45"
              >
                Retry Connection
              </button>
            )}
          </div>
        )}

        {/* Main 2-Column Content: PROFILE Block + SERVER/ZONE Block */}
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* 1. PROFILE BLOCK */}
          <section
            data-testid="main-menu-profile-block"
            className="flex flex-col justify-between rounded-2xl border border-emerald-400/25 bg-emerald-900/40 p-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  Explorer Profile
                </h2>
                <span className="font-mono text-[10px] text-emerald-200/75">
                  {identityProfile.playerId.slice(0, 15)}
                </span>
              </div>

              {/* Display Name Input */}
              <div className="mt-3">
                <label
                  htmlFor="main-menu-display-name-input"
                  className="block text-xs font-semibold text-emerald-100"
                >
                  Display Name
                </label>
                <input
                  id="main-menu-display-name-input"
                  data-testid="main-menu-display-name-input"
                  type="text"
                  maxLength={24}
                  value={displayNameInput}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="Enter display name (2–20 chars)"
                  className="mt-1.5 w-full rounded-xl border border-emerald-400/35 bg-emerald-950/80 px-3.5 py-2.5 text-sm font-bold text-white placeholder-emerald-300/40 focus:border-emerald-300 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-emerald-200/75">
                  2–20 characters (letters, numbers, spaces, - or _)
                </p>
              </div>

              {/* Avatar Preview Chip */}
              <div
                data-testid="main-menu-avatar-preview"
                className="mt-4 flex items-center gap-3.5 rounded-2xl border border-white/10 bg-emerald-950/60 p-3"
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 shadow-inner"
                  style={{ backgroundColor: outfitColors.primary }}
                >
                  <span
                    className="block h-6 w-6 rounded-full border border-black/20"
                    style={{ backgroundColor: skinHex }}
                  />
                  <span
                    className="absolute top-1.5 h-2.5 w-6 rounded-t-full"
                    style={{ backgroundColor: hairHex }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-extrabold text-white">
                    {displayNameInput.trim() || identityProfile.displayName}
                  </p>
                  <p className="truncate text-[11px] text-emerald-200/85">
                    Outfit: <span className="font-semibold capitalize">{avatar.outfit.replace(/_/g, ' ')}</span> • Hair: <span className="font-semibold capitalize">{avatar.hairstyle.replace(/_/g, ' ')}</span>
                  </p>
                  <p className="truncate text-[11px] text-emerald-200/75">
                    Accessory: <span className="font-semibold capitalize">{avatar.accessory.replace(/_/g, ' ')}</span>
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="entry-customize-avatar-btn"
              onClick={(e) => {
                e.currentTarget.blur();
                openAvatarCustomizer();
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/40 bg-emerald-900/70 px-4 py-2.5 text-xs font-bold text-emerald-100 shadow transition hover:bg-emerald-800/80"
            >
              <span>✨</span>
              <span>Customize Avatar & Outfit</span>
            </button>
          </section>

          {/* 2. SERVER / ZONE BLOCK */}
          <section
            data-testid="main-menu-zone-block"
            className="flex flex-col justify-between rounded-2xl border border-emerald-400/25 bg-emerald-900/40 p-4"
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                  Server & World Zones
                </h2>
                <div className="flex items-center gap-2">
                  <span
                    data-testid="main-menu-server-status"
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      serverReachable
                        ? 'bg-emerald-500/25 text-emerald-200'
                        : 'bg-rose-500/30 text-rose-200'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        serverReachable ? 'bg-emerald-300' : 'bg-rose-300'
                      }`}
                    />
                    <span>
                      {isCheckingServer && !occupancy
                        ? 'Checking...'
                        : serverReachable
                          ? `Online (${occupancy?.totalPlayers ?? 0} Visitors)`
                          : 'Unreachable'}
                    </span>
                  </span>
                </div>
              </div>

              {selectedRoomId !== getZoneById(selectedZoneId).roomId && (
                <div
                  data-testid="main-menu-shared-room-badge"
                  className="mt-2.5 rounded-xl border border-amber-300/40 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-200"
                >
                  Shared Room Link Pre-Selected: <strong className="font-mono">{selectedRoomId}</strong>
                </div>
              )}

              {/* Zone Cards List */}
              <div className="mt-3 space-y-2.5">
                {WORLD_ZONES_LIST.map((zone) => {
                  const zoneOcc = occupancy?.zones.find((z) => z.zoneId === zone.zoneId);
                  const playerCount = zoneOcc?.playerCount ?? 0;
                  const maxPlayers = zoneOcc?.maxPlayers ?? 16;
                  const isFull = zoneOcc?.isFull ?? false;
                  const isSelected = selectedZoneId === zone.zoneId;
                  const isLockedForFirstTime =
                    !isReturningVisitor && zone.zoneId !== DEFAULT_ENTRY_ZONE_ID;

                  return (
                    <button
                      key={zone.zoneId}
                      type="button"
                      data-testid={`main-menu-zone-option-${zone.zoneId}`}
                      aria-pressed={isSelected}
                      disabled={isLockedForFirstTime}
                      onClick={() => handleSelectZone(zone.zoneId)}
                      className={`flex w-full flex-col rounded-2xl border p-3 text-left transition ${
                        isSelected
                          ? 'border-emerald-300 bg-emerald-800/60 shadow-md'
                          : isLockedForFirstTime
                            ? 'cursor-not-allowed border-white/10 bg-emerald-950/40 opacity-65'
                            : 'border-white/15 bg-emerald-950/60 hover:border-emerald-400/40 hover:bg-emerald-900/50'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{zone.badgeIcon}</span>
                          <span className="text-sm font-extrabold text-white">
                            {zone.displayName}
                          </span>
                          {zone.zoneId === DEFAULT_ENTRY_ZONE_ID && (
                            <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                              Default
                            </span>
                          )}
                        </div>

                        <span
                          data-testid={`main-menu-zone-count-${zone.zoneId}`}
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            isFull
                              ? 'bg-rose-500/30 text-rose-200'
                              : 'bg-emerald-500/20 text-emerald-100'
                          }`}
                        >
                          {isFull ? `Full (${playerCount}/${maxPlayers})` : `${playerCount}/${maxPlayers} Players`}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-emerald-100/80">{zone.description}</p>

                      {isLockedForFirstTime && (
                        <p
                          data-testid={`main-menu-zone-locked-${zone.zoneId}`}
                          className="mt-1.5 text-[11px] font-semibold text-amber-300"
                        >
                          🔒 First-time visitors start in Zoo Lobby
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-emerald-200/75">
              <span>
                {isReturningVisitor
                  ? 'Returning Explorer: Any zone unlocked'
                  : 'First Visit: Starting at Zoo Lobby'}
              </span>
              <button
                type="button"
                data-testid="main-menu-refresh-zones-btn"
                onClick={() => void refreshOccupancy()}
                className="font-bold text-emerald-300 underline hover:text-emerald-200"
              >
                Refresh List
              </button>
            </div>
          </section>
        </div>

        {/* Footer Action Row: PLAY Button */}
        <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row">
          <div className="text-xs text-emerald-200/85">
            Selected Destination:{' '}
            <strong data-testid="main-menu-selected-destination" className="text-white">
              {getZoneById(selectedZoneId).displayName} ({selectedRoomId})
            </strong>
          </div>

          <button
            type="button"
            data-testid="enter-world-btn"
            onClick={(e) => void handleClickPlay(e)}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-400 px-8 py-3.5 text-center text-base font-extrabold text-emerald-950 shadow-xl transition hover:brightness-105 sm:w-auto sm:min-w-[220px]"
          >
            PLAY • Enter {getZoneById(selectedZoneId).displayName}
          </button>
        </div>
      </div>
    </div>
  );
};

