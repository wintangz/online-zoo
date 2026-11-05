export type PassportZoneId =
  | 'zone-welcome-plaza'
  | 'zone-panda-sanctuary'
  | 'zone-penguin-cove'
  | 'zone-lotus-stream'
  | 'zone-wind-chime-lookout';

export type AchievementId =
  | 'ach-first-stamp'
  | 'ach-world-explorer'
  | 'ach-first-animal'
  | 'ach-zoologist'
  | 'ach-social-greeting'
  | 'ach-keeper-helper';

export type AchievementCategory =
  | 'exploration'
  | 'animal_discovery'
  | 'social'
  | 'activity';

export interface PassportZoneDescriptor {
  zoneId: PassportZoneId;
  name: string;
  subtitle: string;
  description: string;
  hint: string;
  stampLabel: string;
  stampIcon: string;
  accentColor: string;
  center: [number, number, number];
  radius: number;
}

export interface AchievementDescriptor {
  achievementId: AchievementId;
  title: string;
  category: AchievementCategory;
  categoryLabel: string;
  description: string;
  targetCount: number;
  rewardCoins: number;
  rewardBadge: string;
  icon: string;
}

export const PASSPORT_ZONE_IDS: readonly PassportZoneId[] = [
  'zone-welcome-plaza',
  'zone-panda-sanctuary',
  'zone-penguin-cove',
  'zone-lotus-stream',
  'zone-wind-chime-lookout'
] as const;

export const ACHIEVEMENT_IDS: readonly AchievementId[] = [
  'ach-first-stamp',
  'ach-world-explorer',
  'ach-first-animal',
  'ach-zoologist',
  'ach-social-greeting',
  'ach-keeper-helper'
] as const;

export const PASSPORT_ZONES_CATALOG: readonly PassportZoneDescriptor[] = [
  {
    zoneId: 'zone-welcome-plaza',
    name: 'Welcome Plaza & Courtyard',
    subtitle: 'Southern Sanctuary Entrance',
    description:
      'A lively open courtyard framed by crimson torii pillars, the Plaza Refreshment Kiosk, and shaded umbrella dining tables.',
    hint: 'Walk into the Welcome Plaza courtyard near the Refreshment Kiosk and Cafe Table.',
    stampLabel: 'WELCOME PLAZA • SANCTUARY GATE',
    stampIcon: '⛩️',
    accentColor: '#f59e0b',
    center: [-2.6, 0, 12.6],
    radius: 3.6
  },
  {
    zoneId: 'zone-panda-sanctuary',
    name: 'Misty Bamboo Grove Sanctuary',
    subtitle: 'Eastern Highland Terrace',
    description:
      'Towering emerald bamboo stalks and mossy boulders where Giant Pandas munch fresh shoots and tumble across the grass.',
    hint: 'Follow the eastern trail toward the Giant Panda Bamboo Sanctuary and Tea Stall.',
    stampLabel: 'BAMBOO GROVE • PANDA SANCTUARY',
    stampIcon: '🐼',
    accentColor: '#34d399',
    center: [8.4, 0, 9.2],
    radius: 6.0
  },
  {
    zoneId: 'zone-penguin-cove',
    name: 'Glacier Cove Coastal Pool',
    subtitle: 'Western Rocky Ledges',
    description:
      'Chilled turquoise waters and smooth coastal stones where playful penguin colonies waddle, dive, and belly-slide.',
    hint: 'Stroll west from the plaza toward the Glacier Cove Penguin Pool.',
    stampLabel: 'GLACIER COVE • PENGUIN COLONY',
    stampIcon: '🐧',
    accentColor: '#38bdf8',
    center: [-8.6, 0, 7.0],
    radius: 6.0
  },
  {
    zoneId: 'zone-lotus-stream',
    name: 'Highland Spring & Otter Stream',
    subtitle: 'Central Lotus Shoreline',
    description:
      'Crystal-clear spring waters lined with blooming pink lotus pads where energetic river otters float on their backs.',
    hint: 'Visit the central Lotus Pond viewing chair and Otter Stream lookout.',
    stampLabel: 'LOTUS STREAM • OTTER WATERS',
    stampIcon: '🦦',
    accentColor: '#fbbf24',
    center: [-2.0, 0, -2.5],
    radius: 6.0
  },
  {
    zoneId: 'zone-wind-chime-lookout',
    name: 'Northern Wind-Chime Lookout',
    subtitle: 'Tranquil Bamboo Overlook',
    description:
      'A peaceful northern ridge connecting the Bronze Wind-Chime Pavilion and the Scenic Overlook Bench with panoramic views.',
    hint: 'Explore the northern path between the Wind-Chime Pavilion and Scenic Overlook Bench.',
    stampLabel: 'NORTHERN RIDGE • WIND CHIME',
    stampIcon: '🎐',
    accentColor: '#a78bfa',
    center: [2.5, 0, -9.5],
    radius: 6.5
  }
];

export const PASSPORT_ZONES_BY_ID: Readonly<
  Record<PassportZoneId, PassportZoneDescriptor>
> = {
  'zone-welcome-plaza': PASSPORT_ZONES_CATALOG[0]!,
  'zone-panda-sanctuary': PASSPORT_ZONES_CATALOG[1]!,
  'zone-penguin-cove': PASSPORT_ZONES_CATALOG[2]!,
  'zone-lotus-stream': PASSPORT_ZONES_CATALOG[3]!,
  'zone-wind-chime-lookout': PASSPORT_ZONES_CATALOG[4]!
};

export const ACHIEVEMENTS_CATALOG: readonly AchievementDescriptor[] = [
  {
    achievementId: 'ach-first-stamp',
    title: 'First Footsteps',
    category: 'exploration',
    categoryLabel: 'Exploration',
    description: 'Collect your first zone stamp in the Zoo Passport by visiting a sanctuary area.',
    targetCount: 1,
    rewardCoins: 15,
    rewardBadge: 'Trailblazer',
    icon: '🧭'
  },
  {
    achievementId: 'ach-world-explorer',
    title: 'Master Cartographer',
    category: 'exploration',
    categoryLabel: 'Exploration',
    description: 'Collect all 5 zoo zone stamps across the entire Panda Forest sanctuary.',
    targetCount: 5,
    rewardCoins: 50,
    rewardBadge: 'Park Ranger',
    icon: '🗺️'
  },
  {
    achievementId: 'ach-first-animal',
    title: 'Curious Naturalist',
    category: 'animal_discovery',
    categoryLabel: 'Animal Discovery',
    description: 'Discover your first animal species and record it in the Animal Encyclopedia.',
    targetCount: 1,
    rewardCoins: 15,
    rewardBadge: 'Field Spotter',
    icon: '🔍'
  },
  {
    achievementId: 'ach-zoologist',
    title: 'Sanctuary Zoologist',
    category: 'animal_discovery',
    categoryLabel: 'Animal Discovery',
    description: 'Discover all 3 initial animal species (Giant Panda, Penguin, and River Otter).',
    targetCount: 3,
    rewardCoins: 40,
    rewardBadge: 'Master Zoologist',
    icon: '🎓'
  },
  {
    achievementId: 'ach-social-greeting',
    title: 'Friendly Visitor',
    category: 'social',
    categoryLabel: 'Social Interaction',
    description: 'Greet fellow visitors by sending a chat message, performing an emote, or sharing a seat.',
    targetCount: 1,
    rewardCoins: 15,
    rewardBadge: 'Warm Welcomer',
    icon: '👋'
  },
  {
    achievementId: 'ach-keeper-helper',
    title: 'Sanctuary Enthusiast',
    category: 'activity',
    categoryLabel: 'Activities',
    description: 'Participate in an animal feeding session or enjoy a food or drink treat in the zoo.',
    targetCount: 1,
    rewardCoins: 20,
    rewardBadge: 'Sanctuary Gourmand',
    icon: '🎋'
  }
];

export const ACHIEVEMENTS_BY_ID: Readonly<
  Record<AchievementId, AchievementDescriptor>
> = {
  'ach-first-stamp': ACHIEVEMENTS_CATALOG[0]!,
  'ach-world-explorer': ACHIEVEMENTS_CATALOG[1]!,
  'ach-first-animal': ACHIEVEMENTS_CATALOG[2]!,
  'ach-zoologist': ACHIEVEMENTS_CATALOG[3]!,
  'ach-social-greeting': ACHIEVEMENTS_CATALOG[4]!,
  'ach-keeper-helper': ACHIEVEMENTS_CATALOG[5]!
};

export function isValidPassportZoneId(val: unknown): val is PassportZoneId {
  return (
    typeof val === 'string' &&
    (PASSPORT_ZONE_IDS as readonly string[]).includes(val)
  );
}

export function isValidAchievementId(val: unknown): val is AchievementId {
  return (
    typeof val === 'string' &&
    (ACHIEVEMENT_IDS as readonly string[]).includes(val)
  );
}

export function getPassportZoneDescriptor(
  zoneId: PassportZoneId
): PassportZoneDescriptor {
  return PASSPORT_ZONES_BY_ID[zoneId];
}

export function getAchievementDescriptor(
  achievementId: AchievementId
): AchievementDescriptor {
  return ACHIEVEMENTS_BY_ID[achievementId];
}

