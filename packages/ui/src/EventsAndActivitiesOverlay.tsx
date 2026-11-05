import React, { useEffect } from 'react';
import { useStore } from 'zustand';
import {
  gameStore,
  PASSPORT_ZONES_BY_ID,
  SEASONAL_THEMES_BY_ID,
  SEASONAL_THEMES_CATALOG,
  ZOO_EVENTS_BY_ID,
  ZOO_EVENTS_CATALOG,
  type LiveZooEventState,
  type SeasonalThemeId,
  type ZooEventId,
  type ZooEventScheduleConfig
} from '@online-zoo/game-core';

function getRuntimeMultiplayerClient(): {
  joinZooEvent?: (eventId: ZooEventId) => void;
  leaveZooEvent?: (eventId: ZooEventId) => void;
  performEventAction?: (eventId: ZooEventId) => void;
  claimEventReward?: (eventId: ZooEventId) => string;
  configureZooEvents?: (config: ZooEventScheduleConfig) => void;
} | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    __ONLINE_ZOO_RUNTIME__?: {
      multiplayerClient?: {
        joinZooEvent?: (eventId: ZooEventId) => void;
        leaveZooEvent?: (eventId: ZooEventId) => void;
        performEventAction?: (eventId: ZooEventId) => void;
        claimEventReward?: (eventId: ZooEventId) => string;
        configureZooEvents?: (config: ZooEventScheduleConfig) => void;
      };
    };
  };
  return w.__ONLINE_ZOO_RUNTIME__?.multiplayerClient ?? null;
}

function formatEventScheduleWindow(ev: LiveZooEventState): string {
  const durationMinutes = Math.max(
    5,
    Math.round((ev.endTimeMs - ev.startTimeMs) / 60000)
  );
  if (ev.status === 'active') {
    return `Live Now • ${durationMinutes} min session`;
  }
  if (ev.status === 'upcoming') {
    return `Upcoming Schedule • ${durationMinutes} min session`;
  }
  return `Session Concluded • Next cycle soon`;
}

export const EventsAndActivitiesOverlay: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const seasonalTheme = useStore(gameStore, (s) => s.events.seasonalTheme);
  const events = useStore(gameStore, (s) => s.events.events);
  const isEventsModalOpen = useStore(
    gameStore,
    (s) => s.events.isEventsModalOpen
  );
  const activeEventToast = useStore(
    gameStore,
    (s) => s.events.activeEventToast
  );
  const eventFeedback = useStore(gameStore, (s) => s.events.eventFeedback);
  const localSessionId = useStore(
    gameStore,
    (s) => s.multiplayer.localSessionId
  );
  const playerId = useStore(gameStore, (s) => s.identity.profile.playerId);
  const passportStamps = useStore(gameStore, (s) => s.passport.state.stamps);
  const currencyBalance = useStore(
    gameStore,
    (s) => s.dining.wallet.currencyBalance
  );

  const setEventsModalOpen = useStore(gameStore, (s) => s.setEventsModalOpen);
  const dismissEventToast = useStore(gameStore, (s) => s.dismissEventToast);
  const joinZooEventOffline = useStore(gameStore, (s) => s.joinZooEventOffline);
  const leaveZooEventOffline = useStore(
    gameStore,
    (s) => s.leaveZooEventOffline
  );
  const performEventActionOffline = useStore(
    gameStore,
    (s) => s.performEventActionOffline
  );
  const claimEventRewardOffline = useStore(
    gameStore,
    (s) => s.claimEventRewardOffline
  );
  const configureZooEventsOffline = useStore(
    gameStore,
    (s) => s.configureZooEventsOffline
  );

  useEffect(() => {
    if (!activeEventToast) return;
    const timer = setTimeout(() => {
      dismissEventToast();
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeEventToast, dismissEventToast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      if (e.code === 'KeyV' && phase === 'playing') {
        e.preventDefault();
        setEventsModalOpen(!gameStore.getState().events.isEventsModalOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, setEventsModalOpen]);

  if (phase !== 'playing') {
    return null;
  }

  const isPlayerInEvent = (ev: LiveZooEventState): boolean => {
    return (
      ev.participantPlayerIds.includes(playerId) ||
      (localSessionId !== null &&
        ev.participantSessionIds.includes(localSessionId)) ||
      ev.participantSessionIds.includes('local-session')
    );
  };

  const hasPlayerContributed = (ev: LiveZooEventState): boolean => {
    return ev.contributedPlayerIds.includes(playerId);
  };

  const hasPlayerClaimed = (ev: LiveZooEventState): boolean => {
    return ev.claimedPlayerIds.includes(playerId);
  };

  const handleJoinEvent = (eventId: ZooEventId) => {
    const mp = getRuntimeMultiplayerClient();
    if (
      mp?.joinZooEvent &&
      gameStore.getState().multiplayer.status === 'connected'
    ) {
      mp.joinZooEvent(eventId);
    } else {
      joinZooEventOffline(eventId);
    }
  };

  const handleLeaveEvent = (eventId: ZooEventId) => {
    const mp = getRuntimeMultiplayerClient();
    if (
      mp?.leaveZooEvent &&
      gameStore.getState().multiplayer.status === 'connected'
    ) {
      mp.leaveZooEvent(eventId);
    } else {
      leaveZooEventOffline(eventId);
    }
  };

  const handlePerformAction = (eventId: ZooEventId) => {
    const mp = getRuntimeMultiplayerClient();
    if (
      mp?.performEventAction &&
      gameStore.getState().multiplayer.status === 'connected'
    ) {
      mp.performEventAction(eventId);
    } else {
      performEventActionOffline(eventId);
    }
  };

  const handleClaimReward = (eventId: ZooEventId) => {
    const mp = getRuntimeMultiplayerClient();
    if (
      mp?.claimEventReward &&
      gameStore.getState().multiplayer.status === 'connected'
    ) {
      mp.claimEventReward(eventId);
    } else {
      claimEventRewardOffline(eventId);
    }
  };

  const handleConfigureEvents = (config: ZooEventScheduleConfig) => {
    const mp = getRuntimeMultiplayerClient();
    if (
      mp?.configureZooEvents &&
      gameStore.getState().multiplayer.status === 'connected'
    ) {
      mp.configureZooEvents(config);
    } else {
      configureZooEventsOffline(config);
    }
  };

  const joinedActiveEvent = events.find(
    (ev) => ev.status === 'active' && isPlayerInEvent(ev)
  );
  const currentSeasonalDesc = SEASONAL_THEMES_BY_ID[seasonalTheme];
  const activeEventsCount = events.filter((e) => e.status === 'active').length;

  return (
    <>
      {/* Non-Intrusive Event Starting Toast Banner (FR-002, SC-001) */}
      {activeEventToast && (
        <div
          data-testid="event-toast-banner"
          className="pointer-events-auto fixed left-1/2 top-20 z-30 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-300/60 bg-emerald-950/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md"
        >
          <span className="text-2xl">{activeEventToast.icon}</span>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
              Live Zoo Activity Notification
            </span>
            <span className="text-sm font-bold text-white">
              {activeEventToast.title}
            </span>
            <span className="text-xs text-emerald-200/90">
              📍 {activeEventToast.subtitle}
            </span>
          </div>
          <button
            type="button"
            data-testid="toast-open-events-btn"
            onClick={() => {
              dismissEventToast();
              setEventsModalOpen(true);
            }}
            className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-emerald-950 transition hover:bg-amber-300"
          >
            View Event
          </button>
          <button
            type="button"
            data-testid="dismiss-event-toast-btn"
            onClick={dismissEventToast}
            className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-emerald-200 hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      )}

      {/* Compact Non-Blocking Active Event Tracker Banner when Joined (FR-005, FR-006, SC-002, SC-005) */}
      {joinedActiveEvent && !isEventsModalOpen && (
        <div
          data-testid="active-event-tracker-banner"
          className="pointer-events-auto fixed bottom-20 right-4 z-20 flex w-80 flex-col gap-2 rounded-2xl border border-amber-300/50 bg-emerald-950/90 p-3.5 text-white shadow-xl backdrop-blur-md sm:right-6 sm:w-96"
        >
          {(() => {
            const desc = ZOO_EVENTS_BY_ID[joinedActiveEvent.eventId];
            const contributed = hasPlayerContributed(joinedActiveEvent);
            const claimed = hasPlayerClaimed(joinedActiveEvent);
            return (
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{desc.icon}</span>
                    <div>
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                        Participating ({joinedActiveEvent.participantPlayerIds.length}/
                        {joinedActiveEvent.maxParticipants})
                      </div>
                      <div className="text-sm font-bold leading-tight text-white">
                        {desc.title}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="leave-active-event-btn"
                    onClick={() => handleLeaveEvent(joinedActiveEvent.eventId)}
                    className="rounded-lg border border-rose-400/40 bg-rose-500/20 px-2.5 py-1 text-[11px] font-bold text-rose-200 transition hover:bg-rose-500/35"
                  >
                    Leave
                  </button>
                </div>

                <p className="text-xs text-emerald-100/90">{desc.instructions}</p>

                <div className="flex items-center justify-between text-xs font-semibold text-emerald-200">
                  <span>Shared Group Progress:</span>
                  <span>
                    {joinedActiveEvent.sharedProgressCount} /{' '}
                    {joinedActiveEvent.targetProgress}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    data-testid="perform-event-action-btn"
                    onClick={() => handlePerformAction(joinedActiveEvent.eventId)}
                    className="flex-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-extrabold text-emerald-950 shadow transition hover:bg-emerald-400"
                  >
                    {desc.actionLabel}
                  </button>
                  {contributed && !claimed && (
                    <button
                      type="button"
                      data-testid="claim-active-event-reward-btn"
                      onClick={() => handleClaimReward(joinedActiveEvent.eventId)}
                      className="rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-extrabold text-emerald-950 shadow transition hover:bg-amber-300"
                    >
                      🎁 Claim +{joinedActiveEvent.rewardCoins} Coins
                    </button>
                  )}
                  {claimed && (
                    <span className="rounded-xl border border-lime-400/40 bg-lime-500/20 px-2.5 py-1 text-[11px] font-bold text-lime-200">
                      ✓ Reward Claimed
                    </span>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Main Events & Activities Modal (FR-001..FR-010) */}
      {isEventsModalOpen && (
        <div
          data-testid="zoo-events-modal"
          className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
        >
          <div className="flex max-h-[60vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-amber-300/40 bg-emerald-950/95 text-white shadow-2xl sm:max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-emerald-900/60 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400/20 text-2xl">
                  🎪
                </span>
                <div>
                  <h2 className="text-lg font-extrabold tracking-wide text-white sm:text-xl">
                    Sanctuary Events & Shared Activities
                  </h2>
                  <p className="text-xs text-emerald-200/90">
                    Optional group activities, feeding sessions, guided tours & seasonal festivals ({activeEventsCount} Active)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  data-testid="events-modal-coins-badge"
                  className="rounded-xl border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-extrabold text-amber-200"
                >
                  🪙 {currencyBalance} Zoo Coins
                </span>
                <button
                  type="button"
                  data-testid="close-events-modal-btn"
                  onClick={() => setEventsModalOpen(false)}
                  className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
                >
                  Close (ESC)
                </button>
              </div>
            </div>

            {/* Seasonal Festival & Atmosphere Bar (FR-009, FR-010, SC-004) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-emerald-900/35 px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{currentSeasonalDesc.badgeIcon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                      Seasonal Sanctuary Theme:
                    </span>
                    <span
                      data-testid="modal-seasonal-theme-label"
                      className="text-xs font-bold text-white"
                    >
                      {currentSeasonalDesc.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/85">
                    {currentSeasonalDesc.bannerSubtitle}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="seasonal-theme-select"
                  className="text-xs font-semibold text-emerald-200"
                >
                  Season:
                </label>
                <select
                  id="seasonal-theme-select"
                  data-testid="seasonal-theme-select"
                  value={seasonalTheme}
                  onChange={(e) =>
                    handleConfigureEvents({
                      seasonalTheme: e.target.value as SeasonalThemeId
                    })
                  }
                  className="rounded-xl border border-white/25 bg-emerald-950 px-3 py-1.5 text-xs font-bold text-white focus:border-amber-300 focus:outline-none"
                >
                  {SEASONAL_THEMES_CATALOG.map((theme) => (
                    <option key={theme.themeId} value={theme.themeId}>
                      {theme.badgeIcon} {theme.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Feedback Banner */}
            {eventFeedback && (
              <div
                data-testid="event-feedback-banner"
                className={`mx-5 mt-3 flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-bold ${
                  eventFeedback.type === 'error'
                    ? 'border-rose-400/50 bg-rose-500/20 text-rose-100'
                    : 'border-lime-400/50 bg-lime-500/20 text-lime-100'
                }`}
              >
                <span>{eventFeedback.message}</span>
                {eventFeedback.code && (
                  <span className="rounded bg-black/30 px-2 py-0.5 font-mono text-[10px]">
                    {eventFeedback.code}
                  </span>
                )}
              </div>
            )}

            {/* Events & Activities Cards List */}
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {ZOO_EVENTS_CATALOG.map((desc) => {
                const live =
                  events.find((e) => e.eventId === desc.eventId) ?? {
                    eventId: desc.eventId,
                    eventInstanceId: `evinst_${desc.eventId}_1`,
                    status: desc.defaultStatus,
                    startTimeMs: Date.now(),
                    endTimeMs: Date.now() + desc.defaultDurationMs,
                    maxParticipants: desc.defaultMaxParticipants,
                    participantSessionIds: [],
                    participantPlayerIds: [],
                    contributedPlayerIds: [],
                    claimedPlayerIds: [],
                    sharedProgressCount: 0,
                    targetProgress: desc.targetProgress,
                    rewardCoins: desc.rewardCoins
                  };

                const joined = isPlayerInEvent(live);
                const contributed = hasPlayerContributed(live);
                const claimed = hasPlayerClaimed(live);
                const participantCount = live.participantPlayerIds.length;
                const isFull = participantCount >= live.maxParticipants;
                const zoneDesc = PASSPORT_ZONES_BY_ID[desc.zoneId];
                const isZoneStamped = Boolean(
                  passportStamps[desc.zoneId]?.obtained
                );

                const statusBadgeStyle =
                  live.status === 'active'
                    ? 'border-emerald-400/50 bg-emerald-500/25 text-emerald-200'
                    : live.status === 'upcoming'
                      ? 'border-sky-400/50 bg-sky-500/25 text-sky-200'
                      : 'border-slate-400/40 bg-slate-500/25 text-slate-300';

                const statusLabel =
                  live.status === 'active'
                    ? 'Active'
                    : live.status === 'upcoming'
                      ? 'Upcoming'
                      : 'Finished';

                const progressPercent = Math.min(
                  100,
                  Math.round(
                    (live.sharedProgressCount / Math.max(1, live.targetProgress)) *
                      100
                  )
                );

                return (
                  <div
                    key={desc.eventId}
                    data-testid={`event-card-${desc.eventId}`}
                    className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${
                      joined
                        ? 'border-amber-300/60 bg-emerald-900/55 shadow-lg'
                        : 'border-white/15 bg-emerald-900/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl">
                          {desc.icon}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-extrabold text-white">
                              {desc.title}
                            </h3>
                            <span
                              data-testid={`event-status-${desc.eventId}`}
                              className={`rounded-lg border px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide ${statusBadgeStyle}`}
                            >
                              {statusLabel}
                            </span>
                            {desc.isSeasonal && (
                              <span className="rounded-lg border border-pink-400/40 bg-pink-500/20 px-2 py-0.5 text-[10px] font-bold text-pink-200">
                                🌸 Seasonal Event
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-emerald-200/90">
                            <span>📍 {desc.locationLabel}</span>
                            <span>•</span>
                            <span data-testid={`event-schedule-${desc.eventId}`}>
                              🕒 {formatEventScheduleWindow(live)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Capacity & Participant Indicator (FR-004, SC-002) */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          data-testid={`event-participants-${desc.eventId}`}
                          className={`rounded-xl border px-3 py-1 text-xs font-bold ${
                            isFull && !joined
                              ? 'border-rose-400/50 bg-rose-500/25 text-rose-200'
                              : 'border-white/20 bg-white/10 text-emerald-100'
                          }`}
                        >
                          {isFull && !joined
                            ? `Event Full (${participantCount}/${live.maxParticipants})`
                            : `👥 ${participantCount} / ${live.maxParticipants} Participants`}
                        </span>

                        <button
                          type="button"
                          data-testid={`toggle-event-status-btn-${desc.eventId}`}
                          onClick={() =>
                            handleConfigureEvents({
                              eventPatches: [
                                {
                                  eventId: desc.eventId,
                                  status:
                                    live.status === 'active'
                                      ? 'finished'
                                      : 'active',
                                  resetInstance: live.status === 'finished'
                                }
                              ]
                            })
                          }
                          className="rounded-xl border border-sky-400/35 bg-sky-500/15 px-2.5 py-1 text-[11px] font-bold text-sky-200 transition hover:bg-sky-500/30"
                        >
                          {live.status === 'active'
                            ? 'End Session'
                            : 'Start Session Now'}
                        </button>
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-emerald-100/90">
                      {desc.description}
                    </p>

                    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs text-amber-100/95">
                      <strong>How to Participate:</strong> {desc.instructions}
                    </div>

                    {/* Shared Progress Bar & Reward Details */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-[200px] flex-1 flex-col gap-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-200">
                          <span>Shared Activity Goal</span>
                          <span data-testid={`event-progress-${desc.eventId}`}>
                            {live.sharedProgressCount} / {live.targetProgress}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-300 transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-xl border border-amber-400/35 bg-amber-500/15 px-2.5 py-1 font-bold text-amber-200">
                          🎁 Reward: +{live.rewardCoins} Coins & {zoneDesc.stampIcon}{' '}
                          {zoneDesc.name} Stamp {isZoneStamped ? '(Stamped ✓)' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Action Controls */}
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-2.5">
                      {!joined ? (
                        <button
                          type="button"
                          data-testid={`join-event-btn-${desc.eventId}`}
                          disabled={live.status !== 'active' || isFull}
                          onClick={() => handleJoinEvent(desc.eventId)}
                          className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                            live.status !== 'active'
                              ? 'cursor-not-allowed border border-white/15 bg-white/5 text-emerald-300/50'
                              : isFull
                                ? 'cursor-not-allowed border border-rose-400/40 bg-rose-500/20 text-rose-200'
                                : 'bg-emerald-400 text-emerald-950 shadow hover:bg-emerald-300'
                          }`}
                        >
                          {live.status !== 'active'
                            ? `Status: ${statusLabel}`
                            : isFull
                              ? 'Event Full'
                              : 'Join Activity'}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            data-testid={`leave-event-btn-${desc.eventId}`}
                            onClick={() => handleLeaveEvent(desc.eventId)}
                            className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-500/35"
                          >
                            Leave Activity
                          </button>

                          <button
                            type="button"
                            data-testid={`event-action-btn-${desc.eventId}`}
                            onClick={() => handlePerformAction(desc.eventId)}
                            className="rounded-xl bg-emerald-400 px-4 py-2 text-xs font-extrabold text-emerald-950 shadow transition hover:bg-emerald-300"
                          >
                            {desc.actionLabel}
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        data-testid={`claim-event-reward-btn-${desc.eventId}`}
                        disabled={!contributed || claimed}
                        onClick={() => handleClaimReward(desc.eventId)}
                        className={`rounded-xl px-4 py-2 text-xs font-extrabold transition ${
                          claimed
                            ? 'cursor-default border border-lime-400/40 bg-lime-500/25 text-lime-200'
                            : contributed
                              ? 'bg-amber-400 text-emerald-950 shadow hover:bg-amber-300'
                              : 'cursor-not-allowed border border-white/15 bg-white/5 text-emerald-200/50'
                        }`}
                      >
                        {claimed
                          ? '✓ Reward Claimed'
                          : contributed
                            ? `Claim +${live.rewardCoins} Coins & Stamp`
                            : 'Participate to Claim Reward'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

