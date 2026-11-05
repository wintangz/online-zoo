import React, { useEffect } from 'react';
import { useStore } from 'zustand';
import {
  ACHIEVEMENTS_CATALOG,
  ANIMAL_SPECIES_CATALOG,
  ANIMAL_SPECIES_IDS,
  computePassportProgressSummary,
  gameStore,
  PASSPORT_ZONES_CATALOG,
  type AchievementId
} from '@online-zoo/game-core';

function getRuntimeMultiplayerClient(): {
  claimAchievementReward: (achievementId: AchievementId, requestId?: string) => string;
} | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    __ONLINE_ZOO_RUNTIME__?: {
      multiplayerClient?: {
        claimAchievementReward: (achievementId: AchievementId, requestId?: string) => string;
      };
    };
  };
  return w.__ONLINE_ZOO_RUNTIME__?.multiplayerClient ?? null;
}

export const ZooPassportOverlay: React.FC = () => {
  const phase = useStore(gameStore, (s) => s.phase);
  const passportState = useStore(gameStore, (s) => s.passport.state);
  const isPassportOpen = useStore(gameStore, (s) => s.passport.isPassportOpen);
  const activeTab = useStore(gameStore, (s) => s.passport.activeTab);
  const activeToast = useStore(gameStore, (s) => s.passport.activeToast);
  const rewardFeedback = useStore(gameStore, (s) => s.passport.rewardFeedback);
  const encyclopedia = useStore(gameStore, (s) => s.animalSim.encyclopedia);
  const wallet = useStore(gameStore, (s) => s.dining.wallet);

  const setPassportOpen = useStore(gameStore, (s) => s.setPassportOpen);
  const setPassportTab = useStore(gameStore, (s) => s.setPassportTab);
  const dismissPassportToast = useStore(gameStore, (s) => s.dismissPassportToast);
  const selectActivePassportBadge = useStore(
    gameStore,
    (s) => s.selectActivePassportBadge
  );

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      dismissPassportToast();
    }, 4500);
    return () => clearTimeout(timer);
  }, [activeToast, dismissPassportToast]);

  if (phase !== 'playing') {
    return null;
  }

  const summary = computePassportProgressSummary(passportState, encyclopedia);

  const handleClaimReward = (achievementId: AchievementId) => {
    const mp = getRuntimeMultiplayerClient();
    if (mp) {
      mp.claimAchievementReward(achievementId);
    } else {
      gameStore.getState().claimAchievementRewardOffline(achievementId);
    }
  };

  return (
    <>
      {/* 1. Non-intrusive Stamp & Achievement Unlock Toast Banner (FR-007, FR-011) */}
      {activeToast && (
        <div
          data-testid="passport-toast-banner"
          data-toast-kind={activeToast.kind}
          className="pointer-events-none fixed inset-x-0 top-20 z-30 flex justify-center px-4"
        >
          <div className="pointer-events-auto inline-flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-emerald-950/95 px-4 py-2.5 text-white shadow-2xl backdrop-blur-md">
            <span className="text-2xl">{activeToast.icon}</span>
            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                {activeToast.title}
              </span>
              <span className="text-xs font-semibold text-emerald-100">
                {activeToast.subtitle}
              </span>
            </div>
            <button
              type="button"
              data-testid="open-passport-from-toast-btn"
              onClick={() => {
                setPassportOpen(
                  true,
                  activeToast.kind === 'achievement' ? 'achievements' : 'stamps'
                );
                dismissPassportToast();
              }}
              className="ml-2 rounded-xl bg-amber-400 px-2.5 py-1 text-[11px] font-extrabold text-emerald-950 transition hover:bg-amber-300"
            >
              View
            </button>
            <button
              type="button"
              data-testid="dismiss-passport-toast-btn"
              onClick={() => dismissPassportToast()}
              className="rounded-xl bg-white/10 px-2 py-1 text-[11px] font-bold text-emerald-200 hover:bg-white/20"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Main Zoo Passport & Progression Modal (FR-001 – FR-011) */}
      {isPassportOpen && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
          <div
            data-testid="zoo-passport-modal"
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-amber-300/45 bg-emerald-950/95 text-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-emerald-900/50 px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛂</span>
                  <h2 className="text-lg font-extrabold tracking-tight text-amber-200">
                    Zoo Passport &amp; Exploration Journal
                  </h2>
                </div>
                <p className="mt-0.5 text-xs text-emerald-200/85">
                  Optional keepsake of your Panda Forest discoveries — explore at your own pace
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <span
                  data-testid="passport-wallet-coins"
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-400/50 bg-amber-500/20 px-3 py-1.5 text-xs font-extrabold text-amber-200"
                >
                  🪙 {wallet.currencyBalance} Zoo Coins
                </span>
                <button
                  type="button"
                  data-testid="close-passport-btn"
                  onClick={() => setPassportOpen(false)}
                  className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-white/20"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Overall Exploration Progress Bar + Active Cosmetic Badge Selector (SC-006) */}
            <div className="border-b border-white/10 bg-black/25 px-6 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                    Exploration Progress
                  </span>
                  <span
                    data-testid="passport-overall-progress"
                    className="rounded-lg bg-white/10 px-2.5 py-0.5 text-xs font-bold text-white"
                  >
                    {summary.completedMilestones} / {summary.totalMilestones} Milestones
                  </span>
                  <span
                    data-testid="passport-progress-percentage"
                    className="rounded-lg bg-amber-400/25 px-2.5 py-0.5 text-xs font-extrabold text-amber-300"
                  >
                    {summary.overallPercentage}%
                  </span>
                </div>

                {/* Cosmetic Title Badge Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-200/90">
                    Title Badge:
                  </span>
                  <select
                    data-testid="passport-active-badge"
                    value={passportState.activeBadge ?? ''}
                    onChange={(e) =>
                      selectActivePassportBadge(e.target.value ? e.target.value : null)
                    }
                    className="rounded-xl border border-amber-300/40 bg-emerald-900 px-2.5 py-1 text-xs font-bold text-amber-200 focus:outline-none"
                  >
                    <option value="">None Equipped</option>
                    {passportState.earnedBadges.map((badge) => (
                      <option key={badge} value={badge}>
                        🎖️ {badge}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-300"
                  style={{ width: `${summary.overallPercentage}%` }}
                />
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-white/15 bg-emerald-950/60 px-6 pt-3">
              <button
                type="button"
                data-testid="passport-tab-stamps"
                onClick={() => setPassportTab('stamps')}
                className={`rounded-t-2xl border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                  activeTab === 'stamps'
                    ? 'border-amber-400 bg-white/10 text-amber-200'
                    : 'border-transparent text-emerald-200/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                🗺️ Zone Stamps ({summary.obtainedStampsCount}/{summary.totalStampsCount})
              </button>
              <button
                type="button"
                data-testid="passport-tab-encyclopedia"
                onClick={() => setPassportTab('encyclopedia')}
                className={`rounded-t-2xl border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                  activeTab === 'encyclopedia'
                    ? 'border-amber-400 bg-white/10 text-amber-200'
                    : 'border-transparent text-emerald-200/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                🐼 Animal Encyclopedia ({summary.discoveredSpeciesCount}/
                {summary.totalSpeciesCount})
              </button>
              <button
                type="button"
                data-testid="passport-tab-achievements"
                onClick={() => setPassportTab('achievements')}
                className={`rounded-t-2xl border-b-2 px-4 py-2.5 text-xs font-extrabold transition ${
                  activeTab === 'achievements'
                    ? 'border-amber-400 bg-white/10 text-amber-200'
                    : 'border-transparent text-emerald-200/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                🏆 Achievements ({summary.unlockedAchievementsCount}/
                {summary.totalAchievementsCount})
              </button>
            </div>

            {/* Tab Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* TAB 1: ZONE STAMPS (FR-001 – FR-003, SC-001, SC-002) */}
              {activeTab === 'stamps' && (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {PASSPORT_ZONES_CATALOG.map((zone) => {
                    const record = passportState.stamps[zone.zoneId];
                    const obtained = Boolean(record?.obtained);
                    return (
                      <div
                        key={zone.zoneId}
                        data-testid={`passport-zone-card-${zone.zoneId}`}
                        data-obtained={obtained ? 'true' : 'false'}
                        className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                          obtained
                            ? 'border-amber-300/50 bg-gradient-to-br from-emerald-900/80 to-emerald-950/90 shadow-lg'
                            : 'border-white/15 bg-white/5 opacity-80'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 text-2xl ${
                                  obtained
                                    ? 'rotate-[-4deg] border-amber-300 bg-amber-400/20 shadow-md'
                                    : 'border-dashed border-white/25 bg-black/25 grayscale'
                                }`}
                              >
                                {zone.stampIcon}
                              </div>
                              <div>
                                <h3 className="text-sm font-extrabold text-white">
                                  {zone.name}
                                </h3>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
                                  {zone.stampLabel}
                                </p>
                              </div>
                            </div>

                            <span
                              data-testid={`passport-zone-status-${zone.zoneId}`}
                              className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-extrabold ${
                                obtained
                                  ? 'border border-emerald-400/40 bg-emerald-400/25 text-emerald-200'
                                  : 'border border-white/15 bg-white/10 text-emerald-200/60'
                              }`}
                            >
                              {obtained ? 'Obtained' : 'Unobtained'}
                            </span>
                          </div>

                          <p className="mt-3 text-xs leading-relaxed text-emerald-100/90">
                            {zone.description}
                          </p>
                        </div>

                        <div className="mt-3 border-t border-white/10 pt-2.5 text-[11px]">
                          {obtained ? (
                            <span className="font-semibold text-amber-200">
                              ✓ Stamped in Passport
                            </span>
                          ) : (
                            <span className="italic text-emerald-300/80">
                              💡 {zone.hint}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: ANIMAL ENCYCLOPEDIA (FR-004, FR-005, SC-003) */}
              {activeTab === 'encyclopedia' && (
                <div className="flex flex-col gap-3.5">
                  {ANIMAL_SPECIES_IDS.map((speciesId) => {
                    const catalog = ANIMAL_SPECIES_CATALOG[speciesId];
                    const record = encyclopedia.entries[speciesId];
                    const discovered = Boolean(record?.discovered);
                    return (
                      <div
                        key={speciesId}
                        data-testid={`passport-species-card-${speciesId}`}
                        data-discovered={discovered ? 'true' : 'false'}
                        className={`rounded-2xl border p-4 transition ${
                          discovered
                            ? 'border-emerald-300/45 bg-emerald-900/60'
                            : 'border-white/15 bg-white/5 opacity-80'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl ${
                                discovered
                                  ? 'border-emerald-300/50 bg-emerald-800/70'
                                  : 'border-dashed border-white/20 bg-black/30 grayscale'
                              }`}
                            >
                              {discovered ? catalog.badgeIcon : '❓'}
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold text-white">
                                {discovered ? catalog.commonName : 'Unknown Species'}
                              </h3>
                              <p className="text-xs italic text-emerald-200/80">
                                {discovered
                                  ? `${catalog.scientificName} • ${catalog.habitatName}`
                                  : 'Undiscovered Sanctuary Resident'}
                              </p>
                            </div>
                          </div>

                          <span
                            data-testid={`passport-species-status-${speciesId}`}
                            className={`rounded-xl px-2.5 py-1 text-xs font-extrabold ${
                              discovered
                                ? 'border border-emerald-400/40 bg-emerald-400/20 text-emerald-200'
                                : 'border border-white/15 bg-white/10 text-emerald-200/60'
                            }`}
                          >
                            {discovered ? 'Discovered' : 'Undiscovered'}
                          </span>
                        </div>

                        {discovered ? (
                          <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs text-emerald-100">
                            <p>{catalog.summary}</p>
                            <div className="flex flex-wrap gap-3 text-[11px] text-amber-200">
                              <span>
                                <strong>Diet:</strong> {catalog.diet}
                              </span>
                              <span>
                                <strong>Status:</strong> {catalog.conservationStatus}
                              </span>
                            </div>
                            <ul className="list-inside list-disc space-y-1 text-[11px] text-emerald-200/90">
                              {catalog.facts.slice(0, 2).map((fact, idx) => (
                                <li key={idx}>{fact}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="mt-3 border-t border-white/10 pt-2.5 text-xs italic text-emerald-300/80">
                            💡 Discovery Hint: {catalog.discoveryHint}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: ACHIEVEMENTS & REWARDS (FR-006 – FR-010, SC-004, SC-005) */}
              {activeTab === 'achievements' && (
                <div className="flex flex-col gap-3.5">
                  {rewardFeedback && (
                    <div
                      data-testid="passport-reward-feedback"
                      className={`rounded-2xl border px-4 py-2.5 text-xs font-bold ${
                        rewardFeedback.type === 'error'
                          ? 'border-rose-400/50 bg-rose-950/80 text-rose-200'
                          : 'border-amber-300/60 bg-amber-500/20 text-amber-200'
                      }`}
                    >
                      {rewardFeedback.message}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {ACHIEVEMENTS_CATALOG.map((ach) => {
                      const rec = passportState.achievements[ach.achievementId];
                      const unlocked = Boolean(rec?.unlocked);
                      const claimed = Boolean(rec?.claimed);
                      const progress = rec?.progressCount ?? 0;
                      const statusLabel = claimed
                        ? 'Claimed'
                        : unlocked
                          ? 'Ready to Claim'
                          : 'Locked';

                      return (
                        <div
                          key={ach.achievementId}
                          data-testid={`passport-achievement-card-${ach.achievementId}`}
                          data-unlocked={unlocked ? 'true' : 'false'}
                          data-claimed={claimed ? 'true' : 'false'}
                          className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                            claimed
                              ? 'border-emerald-400/45 bg-emerald-900/50'
                              : unlocked
                                ? 'border-amber-300/65 bg-gradient-to-br from-amber-500/20 to-emerald-900/80 shadow-lg'
                                : 'border-white/15 bg-white/5 opacity-85'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className="text-2xl">{ach.icon}</span>
                                <div>
                                  <h3 className="text-sm font-extrabold text-white">
                                    {ach.title}
                                  </h3>
                                  <p className="text-[11px] font-semibold text-emerald-300">
                                    Progress: {progress} / {ach.targetCount}
                                  </p>
                                </div>
                              </div>

                              <span
                                data-testid={`passport-achievement-status-${ach.achievementId}`}
                                className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-extrabold ${
                                  claimed
                                    ? 'border border-emerald-400/40 bg-emerald-400/20 text-emerald-200'
                                    : unlocked
                                      ? 'border border-amber-300/60 bg-amber-400/25 text-amber-200'
                                      : 'border border-white/15 bg-white/10 text-emerald-200/60'
                                }`}
                              >
                                {statusLabel}
                              </span>
                            </div>

                            <p className="mt-2.5 text-xs text-emerald-100/90">
                              {ach.description}
                            </p>

                            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-bold text-amber-200">
                              <span className="rounded-lg bg-black/30 px-2 py-0.5">
                                🪙 +{ach.rewardCoins} Zoo Coins
                              </span>
                              <span className="rounded-lg bg-black/30 px-2 py-0.5">
                                🎖️ &ldquo;{ach.rewardBadge}&rdquo; Badge
                              </span>
                            </div>
                          </div>

                          <div className="mt-3.5 border-t border-white/10 pt-3">
                            <button
                              type="button"
                              data-testid={`claim-achievement-btn-${ach.achievementId}`}
                              disabled={!unlocked || claimed}
                              onClick={() => handleClaimReward(ach.achievementId)}
                              className={`w-full rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                                unlocked && !claimed
                                  ? 'bg-amber-400 text-emerald-950 shadow hover:bg-amber-300 active:scale-95'
                                  : claimed
                                    ? 'cursor-default bg-emerald-500/25 text-emerald-200'
                                    : 'cursor-not-allowed bg-white/10 text-white/40'
                              }`}
                            >
                              {claimed
                                ? 'Reward Claimed ✓'
                                : unlocked
                                  ? `Claim +${ach.rewardCoins} Zoo Coins`
                                  : 'Locked'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
