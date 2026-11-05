import type { PassportZoneId } from '../passport/passportCatalog';

export type SeasonalThemeId =
  | 'spring-blossom'
  | 'summer-lantern'
  | 'autumn-harvest'
  | 'none';

export interface SeasonalThemeDescriptor {
  themeId: SeasonalThemeId;
  label: string;
  badgeIcon: string;
  bannerSubtitle: string;
  accentColor: string;
  foliageTintHex: string;
}

export type ZooEventId =
  | 'event-panda-feeding-gala'
  | 'event-penguin-dive-show'
  | 'event-guided-sanctuary-tour'
  | 'event-plaza-group-photo'
  | 'event-lantern-trivia-game';

export type ZooEventStatus = 'upcoming' | 'active' | 'finished';

export type ZooEventCategory =
  | 'feeding'
  | 'observation'
  | 'guided_tour'
  | 'community_photo'
  | 'seasonal_minigame';

export interface ZooEventDescriptor {
  eventId: ZooEventId;
  title: string;
  category: ZooEventCategory;
  categoryLabel: string;
  description: string;
  instructions: string;
  actionLabel: string;
  locationLabel: string;
  zoneId: PassportZoneId;
  position: [number, number, number];
  defaultStatus: ZooEventStatus;
  defaultStartOffsetMs: number;
  defaultDurationMs: number;
  defaultMaxParticipants: number;
  targetProgress: number;
  rewardCoins: number;
  icon: string;
  isSeasonal?: boolean;
}

export interface ZooEventAdminPatch {
  eventId: ZooEventId;
  status?: ZooEventStatus;
  startTimeMs?: number;
  endTimeMs?: number;
  maxParticipants?: number;
  resetInstance?: boolean;
}

export interface ZooEventScheduleConfig {
  seasonalTheme?: SeasonalThemeId;
  eventPatches?: ZooEventAdminPatch[];
}

export interface SanitizedEventAdminConfigResult {
  valid: boolean;
  seasonalTheme?: SeasonalThemeId;
  eventPatches: ZooEventAdminPatch[];
  rejectedReasons: string[];
}

export const SEASONAL_THEME_IDS: readonly SeasonalThemeId[] = [
  'spring-blossom',
  'summer-lantern',
  'autumn-harvest',
  'none'
] as const;

export const SEASONAL_THEMES_CATALOG: readonly SeasonalThemeDescriptor[] = [
  {
    themeId: 'spring-blossom',
    label: 'Spring Blossom Festival',
    badgeIcon: '🌸',
    bannerSubtitle: 'Cherry blossom arches & floating sakura petals across the sanctuary plaza.',
    accentColor: '#f472b6',
    foliageTintHex: '#f9a8d4'
  },
  {
    themeId: 'summer-lantern',
    label: 'Summer Starlight Lanterns',
    badgeIcon: '🏮',
    bannerSubtitle: 'Warm glowing paper lanterns and festive summer garlands along the streams.',
    accentColor: '#fbbf24',
    foliageTintHex: '#fde047'
  },
  {
    themeId: 'autumn-harvest',
    label: 'Autumn Maple Harvest',
    badgeIcon: '🍁',
    bannerSubtitle: 'Golden-amber maple garlands and harvest lanterns around the habitats.',
    accentColor: '#fb923c',
    foliageTintHex: '#fdba74'
  },
  {
    themeId: 'none',
    label: 'Standard Sanctuary Season',
    badgeIcon: '🌿',
    bannerSubtitle: 'Classic evergreen bamboo sanctuary ambiance without seasonal festival props.',
    accentColor: '#34d399',
    foliageTintHex: '#4ade80'
  }
];

export const SEASONAL_THEMES_BY_ID: Readonly<
  Record<SeasonalThemeId, SeasonalThemeDescriptor>
> = {
  'spring-blossom': SEASONAL_THEMES_CATALOG[0]!,
  'summer-lantern': SEASONAL_THEMES_CATALOG[1]!,
  'autumn-harvest': SEASONAL_THEMES_CATALOG[2]!,
  none: SEASONAL_THEMES_CATALOG[3]!
};

export const ZOO_EVENT_IDS: readonly ZooEventId[] = [
  'event-panda-feeding-gala',
  'event-penguin-dive-show',
  'event-guided-sanctuary-tour',
  'event-plaza-group-photo',
  'event-lantern-trivia-game'
] as const;

export const ZOO_EVENT_STATUSES: readonly ZooEventStatus[] = [
  'upcoming',
  'active',
  'finished'
] as const;

export const ZOO_EVENTS_CATALOG: readonly ZooEventDescriptor[] = [
  {
    eventId: 'event-panda-feeding-gala',
    title: 'Giant Panda Bamboo Feast',
    category: 'feeding',
    categoryLabel: 'Animal Feeding Session',
    description:
      'Join the keepers at the Misty Bamboo Grove to toss fresh highland bamboo shoots for Bao & Mei.',
    instructions:
      'Join the activity, then click "Toss Fresh Bamboo" to help feed the pandas with fellow visitors!',
    actionLabel: '🎋 Toss Fresh Bamboo',
    locationLabel: 'Misty Bamboo Grove Sanctuary (East Terrace)',
    zoneId: 'zone-panda-sanctuary',
    position: [8.4, 0, 9.2],
    defaultStatus: 'active',
    defaultStartOffsetMs: -5 * 60 * 1000,
    defaultDurationMs: 30 * 60 * 1000,
    defaultMaxParticipants: 8,
    targetProgress: 3,
    rewardCoins: 20,
    icon: '🐼'
  },
  {
    eventId: 'event-penguin-dive-show',
    title: 'Glacier Cove Penguin Splash',
    category: 'observation',
    categoryLabel: 'Special Animal Observation',
    description:
      'Watch Pippin and the penguin colony perform synchronized belly-slides and dives into the coastal pool.',
    instructions:
      'Join the splash session and click "Cheer & Toss Silver Sprat" to encourage the diving colony!',
    actionLabel: '🐟 Cheer & Toss Silver Sprat',
    locationLabel: 'Glacier Cove Coastal Pool (West Ledges)',
    zoneId: 'zone-penguin-cove',
    position: [-8.6, 0, 7.0],
    defaultStatus: 'upcoming',
    defaultStartOffsetMs: 10 * 60 * 1000,
    defaultDurationMs: 25 * 60 * 1000,
    defaultMaxParticipants: 8,
    targetProgress: 3,
    rewardCoins: 20,
    icon: '🐧'
  },
  {
    eventId: 'event-guided-sanctuary-tour',
    title: "Ranger's Guided Sanctuary Tour",
    category: 'guided_tour',
    categoryLabel: 'Guided Zoo Tour',
    description:
      'Gather at the Welcome Plaza courtyard with Park Rangers to learn wildlife conservation secrets and habitat stories.',
    instructions:
      'Join the tour group and click "Check In at Tour Stop" to complete the guided sanctuary walk!',
    actionLabel: '🧭 Check In at Tour Stop',
    locationLabel: 'Welcome Plaza & Courtyard (South Gate)',
    zoneId: 'zone-welcome-plaza',
    position: [-5.2, 0, 12.6],
    defaultStatus: 'active',
    defaultStartOffsetMs: -2 * 60 * 1000,
    defaultDurationMs: 40 * 60 * 1000,
    defaultMaxParticipants: 12,
    targetProgress: 3,
    rewardCoins: 25,
    icon: '🗺️'
  },
  {
    eventId: 'event-plaza-group-photo',
    title: 'Golden Hour Group Photo',
    category: 'community_photo',
    categoryLabel: 'Community Gathering & Photo',
    description:
      'Meet fellow visitors at the Northern Wind-Chime Lookout to strike a pose for a commemorative sanctuary group photo.',
    instructions:
      'Join the photo gathering and click "Strike Commemorative Pose" with other visitors!',
    actionLabel: '📸 Strike Commemorative Pose',
    locationLabel: 'Northern Wind-Chime Lookout (North Ridge)',
    zoneId: 'zone-wind-chime-lookout',
    position: [2.5, 0, -9.5],
    defaultStatus: 'upcoming',
    defaultStartOffsetMs: 20 * 60 * 1000,
    defaultDurationMs: 20 * 60 * 1000,
    defaultMaxParticipants: 10,
    targetProgress: 2,
    rewardCoins: 20,
    icon: '📸'
  },
  {
    eventId: 'event-lantern-trivia-game',
    title: 'Seasonal Lotus Stream Mini-Game',
    category: 'seasonal_minigame',
    categoryLabel: 'Seasonal Activity & Mini-Game',
    description:
      'Celebrate the active sanctuary festival by solving wildlife trivia riddles and floating wishes along the Otter Stream.',
    instructions:
      'Join the seasonal mini-game and click "Solve Wildlife Riddle" to contribute to the festival goal!',
    actionLabel: '🌸 Solve Wildlife Riddle',
    locationLabel: 'Highland Spring & Otter Stream (Central Pond)',
    zoneId: 'zone-lotus-stream',
    position: [-2.0, 0, -2.5],
    defaultStatus: 'active',
    defaultStartOffsetMs: -3 * 60 * 1000,
    defaultDurationMs: 45 * 60 * 1000,
    defaultMaxParticipants: 8,
    targetProgress: 2,
    rewardCoins: 25,
    icon: '🏮',
    isSeasonal: true
  }
];

export const ZOO_EVENTS_BY_ID: Readonly<
  Record<ZooEventId, ZooEventDescriptor>
> = {
  'event-panda-feeding-gala': ZOO_EVENTS_CATALOG[0]!,
  'event-penguin-dive-show': ZOO_EVENTS_CATALOG[1]!,
  'event-guided-sanctuary-tour': ZOO_EVENTS_CATALOG[2]!,
  'event-plaza-group-photo': ZOO_EVENTS_CATALOG[3]!,
  'event-lantern-trivia-game': ZOO_EVENTS_CATALOG[4]!
};

export function isValidSeasonalThemeId(val: unknown): val is SeasonalThemeId {
  return (
    typeof val === 'string' &&
    (SEASONAL_THEME_IDS as readonly string[]).includes(val)
  );
}

export function isValidZooEventId(val: unknown): val is ZooEventId {
  return (
    typeof val === 'string' &&
    (ZOO_EVENT_IDS as readonly string[]).includes(val)
  );
}

export function isValidZooEventStatus(val: unknown): val is ZooEventStatus {
  return (
    typeof val === 'string' &&
    (ZOO_EVENT_STATUSES as readonly string[]).includes(val)
  );
}

export function getSeasonalThemeDescriptor(
  themeId: SeasonalThemeId
): SeasonalThemeDescriptor {
  return SEASONAL_THEMES_BY_ID[themeId];
}

export function getZooEventDescriptor(
  eventId: ZooEventId
): ZooEventDescriptor {
  return ZOO_EVENTS_BY_ID[eventId];
}

/**
 * Validates and sanitizes runtime event administration & schedule updates.
 * Rejects invalid event IDs, non-positive maxParticipants, or schedules where endTimeMs <= startTimeMs.
 */
export function sanitizeEventAdministrationConfig(
  raw: unknown
): SanitizedEventAdminConfigResult {
  const rejectedReasons: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return {
      valid: false,
      eventPatches: [],
      rejectedReasons: ['Configuration payload must be a non-null object.']
    };
  }

  const obj = raw as Record<string, unknown>;
  let seasonalTheme: SeasonalThemeId | undefined;

  if (obj.seasonalTheme !== undefined) {
    if (isValidSeasonalThemeId(obj.seasonalTheme)) {
      seasonalTheme = obj.seasonalTheme;
    } else {
      rejectedReasons.push(
        `Invalid seasonalTheme "${String(obj.seasonalTheme)}".`
      );
    }
  }

  const eventPatches: ZooEventAdminPatch[] = [];
  if (obj.eventPatches !== undefined) {
    if (!Array.isArray(obj.eventPatches)) {
      rejectedReasons.push('eventPatches must be an array.');
    } else {
      for (const rawPatch of obj.eventPatches) {
        if (!rawPatch || typeof rawPatch !== 'object') {
          rejectedReasons.push('Event patch must be an object.');
          continue;
        }
        const patchObj = rawPatch as Record<string, unknown>;
        if (!isValidZooEventId(patchObj.eventId)) {
          rejectedReasons.push(
            `Unknown eventId "${String(patchObj.eventId)}".`
          );
          continue;
        }

        const cleanPatch: ZooEventAdminPatch = {
          eventId: patchObj.eventId
        };

        if (patchObj.status !== undefined) {
          if (!isValidZooEventStatus(patchObj.status)) {
            rejectedReasons.push(
              `Invalid status "${String(patchObj.status)}" for ${patchObj.eventId}.`
            );
            continue;
          }
          cleanPatch.status = patchObj.status;
        }

        if (patchObj.maxParticipants !== undefined) {
          const maxP = Number(patchObj.maxParticipants);
          if (!Number.isFinite(maxP) || maxP < 1 || maxP > 64) {
            rejectedReasons.push(
              `Invalid maxParticipants (${String(patchObj.maxParticipants)}) for ${patchObj.eventId}; must be between 1 and 64.`
            );
            continue;
          }
          cleanPatch.maxParticipants = Math.floor(maxP);
        }

        const hasStart = patchObj.startTimeMs !== undefined;
        const hasEnd = patchObj.endTimeMs !== undefined;
        if (hasStart || hasEnd) {
          const startMs = hasStart ? Number(patchObj.startTimeMs) : undefined;
          const endMs = hasEnd ? Number(patchObj.endTimeMs) : undefined;
          if (
            (startMs !== undefined && (!Number.isFinite(startMs) || startMs <= 0)) ||
            (endMs !== undefined && (!Number.isFinite(endMs) || endMs <= 0))
          ) {
            rejectedReasons.push(
              `Invalid schedule timestamps for ${patchObj.eventId}.`
            );
            continue;
          }
          if (
            startMs !== undefined &&
            endMs !== undefined &&
            endMs <= startMs
          ) {
            rejectedReasons.push(
              `Invalid schedule window for ${patchObj.eventId}: endTimeMs (${endMs}) must be greater than startTimeMs (${startMs}).`
            );
            continue;
          }
          if (startMs !== undefined) {
            cleanPatch.startTimeMs = Math.floor(startMs);
          }
          if (endMs !== undefined) {
            cleanPatch.endTimeMs = Math.floor(endMs);
          }
        }

        if (patchObj.resetInstance === true) {
          cleanPatch.resetInstance = true;
        }

        eventPatches.push(cleanPatch);
      }
    }
  }

  const valid =
    rejectedReasons.length === 0 &&
    (seasonalTheme !== undefined || eventPatches.length > 0);

  return {
    valid,
    ...(seasonalTheme !== undefined ? { seasonalTheme } : {}),
    eventPatches,
    rejectedReasons
  };
}

