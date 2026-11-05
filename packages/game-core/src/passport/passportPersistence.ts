import { ANIMAL_SPECIES_IDS } from '../animals/animalCatalog';
import type { PlayerEncyclopediaState } from '../animals/encyclopediaPersistence';
import {
  ACHIEVEMENT_IDS,
  ACHIEVEMENTS_BY_ID,
  PASSPORT_ZONE_IDS,
  PASSPORT_ZONES_CATALOG,
  type AchievementId,
  type PassportZoneId
} from './passportCatalog';

export const PASSPORT_STORAGE_KEY = 'online-zoo:passport-progression:v1';

export interface ZoneStampRecord {
  zoneId: PassportZoneId;
  obtained: boolean;
  stampedAt: string | null;
}

export interface AchievementProgressRecord {
  achievementId: AchievementId;
  progressCount: number;
  targetCount: number;
  unlocked: boolean;
  unlockedAt: string | null;
  claimed: boolean;
  claimedAt: string | null;
}

export interface PlayerPassportState {
  schemaVersion: 1;
  stamps: Record<PassportZoneId, ZoneStampRecord>;
  achievements: Record<AchievementId, AchievementProgressRecord>;
  socialInteractionsCount: number;
  activitiesCompletedCount: number;
  earnedBadges: string[];
  activeBadge: string | null;
  updatedAt: string;
}

export interface PassportProgressSummary {
  obtainedStampsCount: number;
  totalStampsCount: number;
  discoveredSpeciesCount: number;
  totalSpeciesCount: number;
  unlockedAchievementsCount: number;
  totalAchievementsCount: number;
  claimedAchievementsCount: number;
  unclaimedRewardsCount: number;
  completedMilestones: number;
  totalMilestones: number;
  overallPercentage: number;
}

export function createDefaultPassportStamps(): Record<
  PassportZoneId,
  ZoneStampRecord
> {
  return {
    'zone-welcome-plaza': {
      zoneId: 'zone-welcome-plaza',
      obtained: false,
      stampedAt: null
    },
    'zone-panda-sanctuary': {
      zoneId: 'zone-panda-sanctuary',
      obtained: false,
      stampedAt: null
    },
    'zone-penguin-cove': {
      zoneId: 'zone-penguin-cove',
      obtained: false,
      stampedAt: null
    },
    'zone-lotus-stream': {
      zoneId: 'zone-lotus-stream',
      obtained: false,
      stampedAt: null
    },
    'zone-wind-chime-lookout': {
      zoneId: 'zone-wind-chime-lookout',
      obtained: false,
      stampedAt: null
    }
  };
}

export function createDefaultAchievementRecords(): Record<
  AchievementId,
  AchievementProgressRecord
> {
  return {
    'ach-first-stamp': {
      achievementId: 'ach-first-stamp',
      progressCount: 0,
      targetCount: ACHIEVEMENTS_BY_ID['ach-first-stamp'].targetCount,
      unlocked: false,
      unlockedAt: null,
      claimed: false,
      claimedAt: null
    },
    'ach-world-explorer': {
      achievementId: 'ach-world-explorer',
      progressCount: 0,
      targetCount: ACHIEVEMENTS_BY_ID['ach-world-explorer'].targetCount,
      unlocked: false,
      unlockedAt: null,
      claimed: false,
      claimedAt: null
    },
    'ach-first-animal': {
      achievementId: 'ach-first-animal',
      progressCount: 0,
      targetCount: ACHIEVEMENTS_BY_ID['ach-first-animal'].targetCount,
      unlocked: false,
      unlockedAt: null,
      claimed: false,
      claimedAt: null
    },
    'ach-zoologist': {
      achievementId: 'ach-zoologist',
      progressCount: 0,
      targetCount: ACHIEVEMENTS_BY_ID['ach-zoologist'].targetCount,
      unlocked: false,
      unlockedAt: null,
      claimed: false,
      claimedAt: null
    },
    'ach-social-greeting': {
      achievementId: 'ach-social-greeting',
      progressCount: 0,
      targetCount: ACHIEVEMENTS_BY_ID['ach-social-greeting'].targetCount,
      unlocked: false,
      unlockedAt: null,
      claimed: false,
      claimedAt: null
    },
    'ach-keeper-helper': {
      achievementId: 'ach-keeper-helper',
      progressCount: 0,
      targetCount: ACHIEVEMENTS_BY_ID['ach-keeper-helper'].targetCount,
      unlocked: false,
      unlockedAt: null,
      claimed: false,
      claimedAt: null
    }
  };
}

export function createDefaultPassportState(
  nowIso = new Date().toISOString()
): PlayerPassportState {
  return {
    schemaVersion: 1,
    stamps: createDefaultPassportStamps(),
    achievements: createDefaultAchievementRecords(),
    socialInteractionsCount: 0,
    activitiesCompletedCount: 0,
    earnedBadges: [],
    activeBadge: null,
    updatedAt: nowIso
  };
}

export function sanitizePlayerPassportState(
  raw: unknown,
  nowIso = new Date().toISOString()
): PlayerPassportState {
  const clean = createDefaultPassportState(nowIso);
  if (!raw || typeof raw !== 'object') {
    return clean;
  }

  const obj = raw as Record<string, unknown>;

  if (obj.stamps && typeof obj.stamps === 'object') {
    const rawStamps = obj.stamps as Record<string, unknown>;
    for (const zoneId of PASSPORT_ZONE_IDS) {
      const entry = rawStamps[zoneId];
      if (entry && typeof entry === 'object') {
        const rec = entry as Record<string, unknown>;
        const obtained = rec.obtained === true;
        clean.stamps[zoneId] = {
          zoneId,
          obtained,
          stampedAt:
            obtained && typeof rec.stampedAt === 'string'
              ? rec.stampedAt
              : obtained
                ? nowIso
                : null
        };
      }
    }
  }

  if (obj.achievements && typeof obj.achievements === 'object') {
    const rawAchievements = obj.achievements as Record<string, unknown>;
    for (const achId of ACHIEVEMENT_IDS) {
      const entry = rawAchievements[achId];
      if (entry && typeof entry === 'object') {
        const rec = entry as Record<string, unknown>;
        const targetCount = ACHIEVEMENTS_BY_ID[achId].targetCount;
        const progressCount =
          typeof rec.progressCount === 'number' && Number.isFinite(rec.progressCount)
            ? Math.max(0, Math.min(targetCount, Math.floor(rec.progressCount)))
            : 0;
        const unlocked = rec.unlocked === true || progressCount >= targetCount;
        const claimed = unlocked && rec.claimed === true;
        clean.achievements[achId] = {
          achievementId: achId,
          progressCount: unlocked ? targetCount : progressCount,
          targetCount,
          unlocked,
          unlockedAt:
            unlocked && typeof rec.unlockedAt === 'string'
              ? rec.unlockedAt
              : unlocked
                ? nowIso
                : null,
          claimed,
          claimedAt:
            claimed && typeof rec.claimedAt === 'string'
              ? rec.claimedAt
              : claimed
                ? nowIso
                : null
        };
      }
    }
  }

  if (
    typeof obj.socialInteractionsCount === 'number' &&
    Number.isFinite(obj.socialInteractionsCount) &&
    obj.socialInteractionsCount >= 0
  ) {
    clean.socialInteractionsCount = Math.min(
      9999,
      Math.floor(obj.socialInteractionsCount)
    );
  }

  if (
    typeof obj.activitiesCompletedCount === 'number' &&
    Number.isFinite(obj.activitiesCompletedCount) &&
    obj.activitiesCompletedCount >= 0
  ) {
    clean.activitiesCompletedCount = Math.min(
      9999,
      Math.floor(obj.activitiesCompletedCount)
    );
  }

  if (Array.isArray(obj.earnedBadges)) {
    const badges: string[] = [];
    for (const b of obj.earnedBadges) {
      if (typeof b === 'string' && b.trim().length > 0 && !badges.includes(b)) {
        badges.push(b);
      }
    }
    clean.earnedBadges = badges;
  }

  if (
    typeof obj.activeBadge === 'string' &&
    clean.earnedBadges.includes(obj.activeBadge)
  ) {
    clean.activeBadge = obj.activeBadge;
  }

  if (typeof obj.updatedAt === 'string' && obj.updatedAt.length > 0) {
    clean.updatedAt = obj.updatedAt;
  }

  return clean;
}

export function loadPlayerPassportState(
  storage?: Pick<Storage, 'getItem'> | null
): PlayerPassportState {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;

  if (!targetStorage) {
    return createDefaultPassportState();
  }

  try {
    const raw = targetStorage.getItem(PASSPORT_STORAGE_KEY);
    if (!raw) {
      return createDefaultPassportState();
    }
    const parsed = JSON.parse(raw) as unknown;
    return sanitizePlayerPassportState(parsed);
  } catch {
    return createDefaultPassportState();
  }
}

export function savePlayerPassportState(
  state: PlayerPassportState,
  storage?: Pick<Storage, 'setItem'> | null
): boolean {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;

  if (!targetStorage) return false;
  try {
    const sanitized = sanitizePlayerPassportState(state, state.updatedAt);
    targetStorage.setItem(PASSPORT_STORAGE_KEY, JSON.stringify(sanitized));
    return true;
  } catch {
    return false;
  }
}

export function countObtainedZoneStamps(state: PlayerPassportState): number {
  let count = 0;
  for (const zoneId of PASSPORT_ZONE_IDS) {
    if (state.stamps[zoneId]?.obtained) {
      count += 1;
    }
  }
  return count;
}

export function countDiscoveredSpecies(
  encyclopedia: PlayerEncyclopediaState
): number {
  let count = 0;
  for (const speciesId of ANIMAL_SPECIES_IDS) {
    if (encyclopedia.entries[speciesId]?.discovered) {
      count += 1;
    }
  }
  return count;
}

/**
 * Evaluates all 6 achievements against current passport stamps, encyclopedia discoveries,
 * social interactions, and activity completions, unlocking any newly satisfied achievements.
 */
export function evaluatePassportAchievements(
  currentState: PlayerPassportState,
  discoveredSpeciesCount: number,
  nowIso = new Date().toISOString()
): {
  state: PlayerPassportState;
  newlyUnlockedAchievementIds: AchievementId[];
} {
  const obtainedStamps = countObtainedZoneStamps(currentState);
  const newlyUnlocked: AchievementId[] = [];
  const nextAchievements: Record<AchievementId, AchievementProgressRecord> = {
    ...currentState.achievements
  };

  const progressMap: Record<AchievementId, number> = {
    'ach-first-stamp': Math.min(1, obtainedStamps),
    'ach-world-explorer': Math.min(5, obtainedStamps),
    'ach-first-animal': Math.min(1, discoveredSpeciesCount),
    'ach-zoologist': Math.min(3, discoveredSpeciesCount),
    'ach-social-greeting': Math.min(1, currentState.socialInteractionsCount),
    'ach-keeper-helper': Math.min(1, currentState.activitiesCompletedCount)
  };

  let changed = false;
  for (const achId of ACHIEVEMENT_IDS) {
    const prev = currentState.achievements[achId];
    const targetCount = ACHIEVEMENTS_BY_ID[achId].targetCount;
    const rawProgress = Math.max(prev.progressCount, progressMap[achId]);
    const nextProgress = Math.min(targetCount, rawProgress);
    const shouldUnlock = prev.unlocked || nextProgress >= targetCount;

    if (
      nextProgress !== prev.progressCount ||
      shouldUnlock !== prev.unlocked
    ) {
      changed = true;
      if (shouldUnlock && !prev.unlocked) {
        newlyUnlocked.push(achId);
      }
      nextAchievements[achId] = {
        ...prev,
        progressCount: shouldUnlock ? targetCount : nextProgress,
        unlocked: shouldUnlock,
        unlockedAt: prev.unlockedAt ?? (shouldUnlock ? nowIso : null)
      };
    }
  }

  if (!changed) {
    return {
      state: currentState,
      newlyUnlockedAchievementIds: []
    };
  }

  return {
    state: {
      ...currentState,
      achievements: nextAchievements,
      updatedAt: nowIso
    },
    newlyUnlockedAchievementIds: newlyUnlocked
  };
}

export function recordPassportZoneStamp(
  currentState: PlayerPassportState,
  zoneId: PassportZoneId,
  discoveredSpeciesCount: number,
  nowIso = new Date().toISOString(),
  storage?: Pick<Storage, 'setItem'> | null
): {
  state: PlayerPassportState;
  newlyStamped: boolean;
  newlyUnlockedAchievementIds: AchievementId[];
} {
  const existing = currentState.stamps[zoneId];
  if (existing.obtained) {
    const evalRes = evaluatePassportAchievements(
      currentState,
      discoveredSpeciesCount,
      nowIso
    );
    if (evalRes.newlyUnlockedAchievementIds.length > 0) {
      savePlayerPassportState(evalRes.state, storage);
    }
    return {
      state: evalRes.state,
      newlyStamped: false,
      newlyUnlockedAchievementIds: evalRes.newlyUnlockedAchievementIds
    };
  }

  const withStamp: PlayerPassportState = {
    ...currentState,
    stamps: {
      ...currentState.stamps,
      [zoneId]: {
        zoneId,
        obtained: true,
        stampedAt: nowIso
      }
    },
    updatedAt: nowIso
  };

  const evalRes = evaluatePassportAchievements(
    withStamp,
    discoveredSpeciesCount,
    nowIso
  );
  savePlayerPassportState(evalRes.state, storage);

  return {
    state: evalRes.state,
    newlyStamped: true,
    newlyUnlockedAchievementIds: evalRes.newlyUnlockedAchievementIds
  };
}

export function evaluateProximityZoneStamp(
  playerPosition: [number, number, number],
  currentState: PlayerPassportState,
  discoveredSpeciesCount: number,
  nowIso = new Date().toISOString(),
  storage?: Pick<Storage, 'setItem'> | null
): {
  state: PlayerPassportState;
  newlyStampedZoneIds: PassportZoneId[];
  newlyUnlockedAchievementIds: AchievementId[];
} {
  let workingState = currentState;
  const newlyStampedZoneIds: PassportZoneId[] = [];
  const newlyUnlockedAchievementIds: AchievementId[] = [];

  for (const zone of PASSPORT_ZONES_CATALOG) {
    if (workingState.stamps[zone.zoneId].obtained) {
      continue;
    }
    const dx = playerPosition[0] - zone.center[0];
    const dz = playerPosition[2] - zone.center[2];
    if (dx * dx + dz * dz <= zone.radius * zone.radius) {
      const res = recordPassportZoneStamp(
        workingState,
        zone.zoneId,
        discoveredSpeciesCount,
        nowIso,
        storage
      );
      workingState = res.state;
      if (res.newlyStamped) {
        newlyStampedZoneIds.push(zone.zoneId);
      }
      for (const achId of res.newlyUnlockedAchievementIds) {
        if (!newlyUnlockedAchievementIds.includes(achId)) {
          newlyUnlockedAchievementIds.push(achId);
        }
      }
    }
  }

  return {
    state: workingState,
    newlyStampedZoneIds,
    newlyUnlockedAchievementIds
  };
}

export function recordPassportSocialInteraction(
  currentState: PlayerPassportState,
  discoveredSpeciesCount: number,
  nowIso = new Date().toISOString(),
  storage?: Pick<Storage, 'setItem'> | null
): {
  state: PlayerPassportState;
  newlyUnlockedAchievementIds: AchievementId[];
} {
  const updated: PlayerPassportState = {
    ...currentState,
    socialInteractionsCount: Math.min(
      9999,
      currentState.socialInteractionsCount + 1
    ),
    updatedAt: nowIso
  };
  const evalRes = evaluatePassportAchievements(
    updated,
    discoveredSpeciesCount,
    nowIso
  );
  savePlayerPassportState(evalRes.state, storage);
  return evalRes;
}

export function recordPassportActivityCompletion(
  currentState: PlayerPassportState,
  discoveredSpeciesCount: number,
  nowIso = new Date().toISOString(),
  storage?: Pick<Storage, 'setItem'> | null
): {
  state: PlayerPassportState;
  newlyUnlockedAchievementIds: AchievementId[];
} {
  const updated: PlayerPassportState = {
    ...currentState,
    activitiesCompletedCount: Math.min(
      9999,
      currentState.activitiesCompletedCount + 1
    ),
    updatedAt: nowIso
  };
  const evalRes = evaluatePassportAchievements(
    updated,
    discoveredSpeciesCount,
    nowIso
  );
  savePlayerPassportState(evalRes.state, storage);
  return evalRes;
}

export function computePassportProgressSummary(
  passportState: PlayerPassportState,
  encyclopediaState: PlayerEncyclopediaState
): PassportProgressSummary {
  const obtainedStampsCount = countObtainedZoneStamps(passportState);
  const totalStampsCount = PASSPORT_ZONE_IDS.length;

  const discoveredSpeciesCount = countDiscoveredSpecies(encyclopediaState);
  const totalSpeciesCount = ANIMAL_SPECIES_IDS.length;

  let unlockedAchievementsCount = 0;
  let claimedAchievementsCount = 0;
  let unclaimedRewardsCount = 0;

  for (const achId of ACHIEVEMENT_IDS) {
    const rec = passportState.achievements[achId];
    if (rec.unlocked) {
      unlockedAchievementsCount += 1;
      if (rec.claimed) {
        claimedAchievementsCount += 1;
      } else {
        unclaimedRewardsCount += 1;
      }
    }
  }

  const totalAchievementsCount = ACHIEVEMENT_IDS.length;
  const completedMilestones =
    obtainedStampsCount + discoveredSpeciesCount + unlockedAchievementsCount;
  const totalMilestones =
    totalStampsCount + totalSpeciesCount + totalAchievementsCount;
  const overallPercentage =
    totalMilestones > 0
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0;

  return {
    obtainedStampsCount,
    totalStampsCount,
    discoveredSpeciesCount,
    totalSpeciesCount,
    unlockedAchievementsCount,
    totalAchievementsCount,
    claimedAchievementsCount,
    unclaimedRewardsCount,
    completedMilestones,
    totalMilestones,
    overallPercentage
  };
}

