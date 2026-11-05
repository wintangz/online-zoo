import { createServer } from 'node:http';
import next from 'next';
import { WebSocket, WebSocketServer } from 'ws';

const dev = !process.argv.includes('--prod') && process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = Number(process.env.PORT || 3000);

const VISITOR_ACCENT_PALETTE = [
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#06b6d4'
];

const DEFAULT_AVATAR_APPEARANCE = {
  skinTone: 'golden-sand',
  hairstyle: 'explorer-bob',
  hairColor: 'chestnut-brown',
  outfit: 'ranger-emerald',
  accessory: 'safari-hat'
};

const VALID_SKIN_TONES = new Set([
  'warm-ivory',
  'golden-sand',
  'amber-tan',
  'rich-sienna',
  'deep-umber',
  'bamboo-sage'
]);
const VALID_HAIRSTYLES = new Set([
  'explorer-bob',
  'sun-spiky',
  'bamboo-ponytail',
  'park-bun'
]);
const VALID_HAIR_COLORS = new Set([
  'espresso-black',
  'chestnut-brown',
  'golden-blonde',
  'copper-auburn',
  'silver-mist',
  'forest-teal'
]);
/** @type {Record<string, string>} */
const OUTFIT_ACCENT_COLORS = {
  'ranger-emerald': '#10b981',
  'safari-khaki': '#f59e0b',
  'botanist-cobalt': '#3b82f6',
  'sunset-coral': '#ec4899',
  'panda-monochrome': '#14b8a6'
};
const VALID_ACCESSORIES = new Set([
  'safari-hat',
  'bamboo-visor',
  'round-glasses',
  'explorer-backpack',
  'none'
]);

const RESERVED_EXACT_NAMES = new Set([
  'admin',
  'administrator',
  'moderator',
  'mod',
  'system',
  'sysadmin',
  'staff',
  'official',
  'owner',
  'developer',
  'support'
]);

const BLOCKED_PROFANITY_SUBSTRINGS = [
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'bastard',
  'cunt',
  'dick',
  'pussy',
  'slut',
  'whore',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'kys',
  'nazi',
  'hitler',
  'penis',
  'vagina',
  'porn'
];

/** @type {Record<string, { id: string; label: string; icon: string; durationMs: number }>} */
const EMOTE_DESCRIPTORS = {
  wave: { id: 'wave', label: 'Wave', icon: '👋', durationMs: 3500 },
  dance: { id: 'dance', label: 'Dance', icon: '💃', durationMs: 4500 },
  clap: { id: 'clap', label: 'Clap', icon: '👏', durationMs: 3500 },
  laugh: { id: 'laugh', label: 'Laugh', icon: '😄', durationMs: 3500 },
  sit: { id: 'sit', label: 'Sit / Relax', icon: '🧘', durationMs: 6000 }
};

/** @type {Record<string, { id: string; name: string; category: 'food' | 'drink'; gerundLabel: 'Eating' | 'Drinking'; price: number; icon: string; durationMs: number }>} */
const SERVER_FOOD_CATALOG = {
  water: { id: 'water', name: 'Spring Water', category: 'drink', gerundLabel: 'Drinking', price: 5, icon: '💧', durationMs: 5000 },
  popcorn: { id: 'popcorn', name: 'Caramel Zoo Popcorn', category: 'food', gerundLabel: 'Eating', price: 10, icon: '🍿', durationMs: 5000 },
  'ice-cream': { id: 'ice-cream', name: 'Panda Swirl Ice Cream', category: 'food', gerundLabel: 'Eating', price: 12, icon: '🍦', durationMs: 5000 },
  'bubble-tea': { id: 'bubble-tea', name: 'Brown Sugar Bubble Tea', category: 'drink', gerundLabel: 'Drinking', price: 15, icon: '🧋', durationMs: 5000 },
  burger: { id: 'burger', name: 'Bamboo Grove Burger', category: 'food', gerundLabel: 'Eating', price: 20, icon: '🍔', durationMs: 5000 }
};
const VALID_FOOD_IDS = ['water', 'bubble-tea', 'ice-cream', 'burger', 'popcorn'];
const INITIAL_ZOO_COINS = 100;
const MAX_ZOO_COINS = 9999;
const MAX_FOOD_QUANTITY = 99;

function createEmptyFoodInventoryServer() {
  return {
    water: 0,
    'bubble-tea': 0,
    'ice-cream': 0,
    burger: 0,
    popcorn: 0
  };
}

/** @param {any} raw */
function sanitizeDiningWalletServer(raw) {
  const inv = /** @type {Record<string, number>} */ (createEmptyFoodInventoryServer());
  if (!raw || typeof raw !== 'object') {
    return { currencyBalance: INITIAL_ZOO_COINS, inventory: inv };
  }
  const balance =
    typeof raw.currencyBalance === 'number' && Number.isFinite(raw.currencyBalance)
      ? Math.max(0, Math.min(MAX_ZOO_COINS, Math.floor(raw.currencyBalance)))
      : INITIAL_ZOO_COINS;
  if (raw.inventory && typeof raw.inventory === 'object') {
    for (const id of VALID_FOOD_IDS) {
      const q = raw.inventory[id];
      if (typeof q === 'number' && Number.isFinite(q) && q >= 0) {
        inv[id] = Math.min(MAX_FOOD_QUANTITY, Math.floor(q));
      }
    }
  }
  return { currencyBalance: balance, inventory: inv };
}

const VALID_PASSPORT_ZONE_IDS = [
  'zone-welcome-plaza',
  'zone-panda-sanctuary',
  'zone-penguin-cove',
  'zone-lotus-stream',
  'zone-wind-chime-lookout'
];

/** @type {Array<{ zoneId: string; center: [number, number, number]; radiusMeters: number }>} */
const SERVER_PASSPORT_ZONES = [
  { zoneId: 'zone-welcome-plaza', center: [-5.2, 0, 12.6], radiusMeters: 4.2 },
  { zoneId: 'zone-panda-sanctuary', center: [8.4, 0, 9.2], radiusMeters: 6.0 },
  { zoneId: 'zone-penguin-cove', center: [-8.6, 0, 7.0], radiusMeters: 6.0 },
  { zoneId: 'zone-lotus-stream', center: [-2.0, 0, -2.5], radiusMeters: 6.0 },
  { zoneId: 'zone-wind-chime-lookout', center: [2.5, 0, -9.5], radiusMeters: 6.5 }
];

const VALID_ACHIEVEMENT_IDS = [
  'ach-first-stamp',
  'ach-world-explorer',
  'ach-first-animal',
  'ach-zoologist',
  'ach-social-greeting',
  'ach-keeper-helper'
];

/** @type {Record<string, { achievementId: string; title: string; targetCount: number; rewardCoins: number; rewardBadge: string }>} */
const SERVER_ACHIEVEMENTS_BY_ID = {
  'ach-first-stamp': {
    achievementId: 'ach-first-stamp',
    title: 'First Footsteps',
    targetCount: 1,
    rewardCoins: 15,
    rewardBadge: 'Trailblazer'
  },
  'ach-world-explorer': {
    achievementId: 'ach-world-explorer',
    title: 'Master Cartographer',
    targetCount: 5,
    rewardCoins: 50,
    rewardBadge: 'Park Ranger'
  },
  'ach-first-animal': {
    achievementId: 'ach-first-animal',
    title: 'Curious Naturalist',
    targetCount: 1,
    rewardCoins: 15,
    rewardBadge: 'Field Spotter'
  },
  'ach-zoologist': {
    achievementId: 'ach-zoologist',
    title: 'Sanctuary Zoologist',
    targetCount: 3,
    rewardCoins: 40,
    rewardBadge: 'Master Zoologist'
  },
  'ach-social-greeting': {
    achievementId: 'ach-social-greeting',
    title: 'Friendly Visitor',
    targetCount: 1,
    rewardCoins: 15,
    rewardBadge: 'Warm Welcomer'
  },
  'ach-keeper-helper': {
    achievementId: 'ach-keeper-helper',
    title: 'Sanctuary Enthusiast',
    targetCount: 1,
    rewardCoins: 20,
    rewardBadge: 'Sanctuary Gourmand'
  }
};

/** @param {string} [nowIso] */
function createDefaultPassportStateServer(nowIso = new Date().toISOString()) {
  /** @type {Record<string, { zoneId: string; obtained: boolean; stampedAt: string | null }>} */
  const stamps = {};
  for (const zid of VALID_PASSPORT_ZONE_IDS) {
    stamps[zid] = { zoneId: zid, obtained: false, stampedAt: null };
  }
  /** @type {Record<string, { achievementId: string; progressCount: number; targetCount: number; unlocked: boolean; unlockedAt: string | null; claimed: boolean; claimedAt: string | null }>} */
  const achievements = {};
  for (const aid of VALID_ACHIEVEMENT_IDS) {
    const desc = SERVER_ACHIEVEMENTS_BY_ID[aid];
    achievements[aid] = {
      achievementId: aid,
      progressCount: 0,
      targetCount: desc ? desc.targetCount : 1,
      unlocked: false,
      unlockedAt: null,
      claimed: false,
      claimedAt: null
    };
  }
  return {
    schemaVersion: 1,
    stamps,
    achievements,
    socialInteractionsCount: 0,
    activitiesCompletedCount: 0,
    earnedBadges: /** @type {string[]} */ ([]),
    activeBadge: /** @type {string | null} */ (null),
    updatedAt: nowIso
  };
}

/**
 * @param {any} raw
 * @param {string} [nowIso]
 */
function sanitizePassportStateServer(raw, nowIso = new Date().toISOString()) {
  const base = createDefaultPassportStateServer(nowIso);
  if (!raw || typeof raw !== 'object') return base;
  if (raw.stamps && typeof raw.stamps === 'object') {
    for (const zid of VALID_PASSPORT_ZONE_IDS) {
      const s = raw.stamps[zid];
      if (s && typeof s === 'object' && s.obtained === true) {
        base.stamps[zid] = {
          zoneId: zid,
          obtained: true,
          stampedAt: typeof s.stampedAt === 'string' ? s.stampedAt : nowIso
        };
      }
    }
  }
  if (raw.achievements && typeof raw.achievements === 'object') {
    for (const aid of VALID_ACHIEVEMENT_IDS) {
      const a = raw.achievements[aid];
      const desc = SERVER_ACHIEVEMENTS_BY_ID[aid];
      const target = desc ? desc.targetCount : 1;
      if (a && typeof a === 'object') {
        const rawProgress =
          typeof a.progressCount === 'number' && Number.isFinite(a.progressCount)
            ? Math.max(0, Math.min(target, Math.floor(a.progressCount)))
            : 0;
        const unlocked = Boolean(a.unlocked) || rawProgress >= target;
        const claimed = unlocked && Boolean(a.claimed);
        base.achievements[aid] = {
          achievementId: aid,
          progressCount: unlocked ? target : rawProgress,
          targetCount: target,
          unlocked,
          unlockedAt: unlocked
            ? typeof a.unlockedAt === 'string'
              ? a.unlockedAt
              : nowIso
            : null,
          claimed,
          claimedAt: claimed
            ? typeof a.claimedAt === 'string'
              ? a.claimedAt
              : nowIso
            : null
        };
      }
    }
  }
  if (typeof raw.socialInteractionsCount === 'number' && Number.isFinite(raw.socialInteractionsCount)) {
    base.socialInteractionsCount = Math.max(0, Math.floor(raw.socialInteractionsCount));
  }
  if (typeof raw.activitiesCompletedCount === 'number' && Number.isFinite(raw.activitiesCompletedCount)) {
    base.activitiesCompletedCount = Math.max(0, Math.floor(raw.activitiesCompletedCount));
  }
  if (Array.isArray(raw.earnedBadges)) {
    for (const b of raw.earnedBadges) {
      if (typeof b === 'string' && b.trim() && !base.earnedBadges.includes(b.trim())) {
        base.earnedBadges.push(b.trim());
      }
    }
  }
  for (const aid of VALID_ACHIEVEMENT_IDS) {
    const rec = base.achievements[aid];
    const desc = SERVER_ACHIEVEMENTS_BY_ID[aid];
    if (rec && rec.claimed && desc && !base.earnedBadges.includes(desc.rewardBadge)) {
      base.earnedBadges.push(desc.rewardBadge);
    }
  }
  if (typeof raw.activeBadge === 'string' && base.earnedBadges.includes(raw.activeBadge)) {
    base.activeBadge = raw.activeBadge;
  } else if (base.earnedBadges.length > 0) {
    base.activeBadge = base.earnedBadges[0] ?? null;
  }
  return base;
}

/**
 * @param {any} passport
 * @param {number} discoveredSpeciesCount
 * @param {string} [nowIso]
 */
function evaluatePassportAchievementsServer(passport, discoveredSpeciesCount, nowIso = new Date().toISOString()) {
  const stampedCount = VALID_PASSPORT_ZONE_IDS.filter(
    (zid) => passport.stamps[zid]?.obtained
  ).length;
  /** @type {Record<string, number>} */
  const counts = {
    'ach-first-stamp': Math.min(1, stampedCount),
    'ach-world-explorer': Math.min(5, stampedCount),
    'ach-first-animal': Math.min(1, discoveredSpeciesCount),
    'ach-zoologist': Math.min(3, discoveredSpeciesCount),
    'ach-social-greeting': Math.min(1, passport.socialInteractionsCount),
    'ach-keeper-helper': Math.min(1, passport.activitiesCompletedCount)
  };
  for (const aid of VALID_ACHIEVEMENT_IDS) {
    const rec = passport.achievements[aid];
    if (!rec) continue;
    const progress = Math.max(rec.progressCount, counts[aid] ?? 0);
    const unlocked = rec.unlocked || progress >= rec.targetCount;
    rec.progressCount = unlocked ? rec.targetCount : progress;
    if (unlocked && !rec.unlocked) {
      rec.unlocked = true;
      rec.unlockedAt = nowIso;
    }
  }
  passport.updatedAt = nowIso;
  return passport;
}

const VALID_REPORT_REASONS = new Set([
  'inappropriate-chat',
  'harassment-spam',
  'offensive-name',
  'other'
]);

const PROXIMITY_CHAT_RANGE_METERS = 24.0;
const SPEECH_BUBBLE_DURATION_MS = 6000;
const CHAT_RATE_WINDOW_MS = 6000;
const CHAT_MAX_MESSAGES_PER_WINDOW = 4;
const CHAT_MIN_INTERVAL_MS = 1000;

/** @param {any} candidate */
function validateDisplayNameServer(candidate) {
  if (typeof candidate !== 'string') return { valid: false, normalizedName: '' };
  const trimmed = candidate.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 3 || trimmed.length > 16) return { valid: false, normalizedName: trimmed };
  if (
    /(?: {2,}|--+|__+|##+)/.test(candidate.trim()) ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9 _#-]{1,14}[A-Za-z0-9])?$/.test(trimmed) ||
    (trimmed.includes('#') && !/^Explorer #\d{3,4}$/.test(trimmed))
  ) {
    return { valid: false, normalizedName: trimmed };
  }
  const lowerCompact = trimmed.toLowerCase().replace(/[\s_-]+/g, '');
  if (RESERVED_EXACT_NAMES.has(lowerCompact)) {
    return { valid: false, normalizedName: trimmed };
  }
  /** @type {Record<string, string>} */
  const leetMap = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };
  let leetNorm = '';
  for (const ch of trimmed.toLowerCase()) {
    const m = leetMap[ch] ?? ch;
    if (/[a-z0-9]/.test(m)) leetNorm += m;
  }
  const rawAlpha = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  for (const term of BLOCKED_PROFANITY_SUBSTRINGS) {
    if (rawAlpha.includes(term) || leetNorm.includes(term)) {
      return { valid: false, normalizedName: trimmed };
    }
  }
  return { valid: true, normalizedName: trimmed };
}

/** @param {any} rawText */
function validateChatMessageServer(rawText) {
  if (typeof rawText !== 'string') {
    return { valid: false, normalizedText: '', errorCode: 'INVALID_PAYLOAD', errorMessage: 'Message cannot be empty.' };
  }
  const cleaned = rawText.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().replace(/\s+/g, ' ');
  if (cleaned.length < 1) {
    return { valid: false, normalizedText: '', errorCode: 'INVALID_PAYLOAD', errorMessage: 'Please enter a message before sending.' };
  }
  if (cleaned.length > 140) {
    return { valid: false, normalizedText: cleaned, errorCode: 'INVALID_PAYLOAD', errorMessage: 'Message cannot exceed 140 characters.' };
  }
  /** @type {Record<string, string>} */
  const leetMap = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };
  let norm = '';
  for (const ch of cleaned.toLowerCase()) {
    const m = leetMap[ch] ?? ch;
    norm += /[a-z0-9\s]/.test(m) ? m : ' ';
  }
  const compactAlpha = norm.replace(/[^a-z]/g, '');
  const tokens = norm.split(/\s+/).filter(Boolean);
  for (const term of BLOCKED_PROFANITY_SUBSTRINGS) {
    if (tokens.includes(term) || compactAlpha.includes(term)) {
      return {
        valid: false,
        normalizedText: cleaned,
        errorCode: 'CHAT_MODERATION_BLOCKED',
        errorMessage: 'Message blocked by zoo safety and community guidelines.'
      };
    }
  }
  return { valid: true, normalizedText: cleaned };
}

/** @param {any} candidate */
function isValidAvatarAppearanceServer(candidate) {
  if (!candidate || typeof candidate !== 'object') return false;
  return (
    VALID_SKIN_TONES.has(candidate.skinTone) &&
    VALID_HAIRSTYLES.has(candidate.hairstyle) &&
    VALID_HAIR_COLORS.has(candidate.hairColor) &&
    Object.prototype.hasOwnProperty.call(OUTFIT_ACCENT_COLORS, candidate.outfit) &&
    VALID_ACCESSORIES.has(candidate.accessory)
  );
}

/** @param {any} candidate */
function sanitizeAvatarAppearanceServer(candidate) {
  if (!candidate || typeof candidate !== 'object') return { ...DEFAULT_AVATAR_APPEARANCE };
  return {
    skinTone: VALID_SKIN_TONES.has(candidate.skinTone)
      ? candidate.skinTone
      : DEFAULT_AVATAR_APPEARANCE.skinTone,
    hairstyle: VALID_HAIRSTYLES.has(candidate.hairstyle)
      ? candidate.hairstyle
      : DEFAULT_AVATAR_APPEARANCE.hairstyle,
    hairColor: VALID_HAIR_COLORS.has(candidate.hairColor)
      ? candidate.hairColor
      : DEFAULT_AVATAR_APPEARANCE.hairColor,
    outfit: Object.prototype.hasOwnProperty.call(OUTFIT_ACCENT_COLORS, candidate.outfit)
      ? candidate.outfit
      : DEFAULT_AVATAR_APPEARANCE.outfit,
    accessory: VALID_ACCESSORIES.has(candidate.accessory)
      ? candidate.accessory
      : DEFAULT_AVATAR_APPEARANCE.accessory
  };
}

/**
 * @param {any} room
 * @param {string} baseDisplayName
 * @param {string} excludeSessionId
 * @param {string} [playerId]
 */
function disambiguateDisplayNameServer(room, baseDisplayName, excludeSessionId, playerId) {
  void playerId;
  const targetLower = baseDisplayName.toLowerCase();
  const existingNamesLower = new Set();
  let hasBaseCollision = false;
  for (const session of room.activeSessions.values()) {
    if (session.sessionId === excludeSessionId) continue;
    existingNamesLower.add(session.displayName.toLowerCase());
    if (
      (session.baseDisplayName || session.displayName).toLowerCase() === targetLower ||
      session.displayName.toLowerCase() === targetLower
    ) {
      hasBaseCollision = true;
    }
  }
  if (!hasBaseCollision) return baseDisplayName;
  let suffix = 2;
  while (suffix < 100) {
    const candidate = `${baseDisplayName} #${suffix}`;
    if (!existingNamesLower.has(candidate.toLowerCase())) return candidate;
    suffix += 1;
  }
  return `${baseDisplayName} #${suffix}`;
}

const PANDA_FOREST_OBSTACLES = [
  { id: 'tree-01', position: [-10, 0, 14], radius: 1.1 },
  { id: 'tree-02', position: [10, 0, 13], radius: 1.1 },
  { id: 'tree-03', position: [14, 0, 2], radius: 1.2 },
  { id: 'tree-04', position: [12, 0, -14], radius: 1.1 },
  { id: 'tree-05', position: [-15, 0, -15], radius: 1.2 },
  { id: 'tree-06', position: [-18, 0, 4], radius: 1.1 },
  { id: 'tree-07', position: [0, 0, -22], radius: 1.3 },
  { id: 'tree-08', position: [20, 0, -6], radius: 1.1 },
  { id: 'rock-01', position: [-5.5, 0, 9.0], radius: 1.4 },
  { id: 'rock-02', position: [6.5, 0, 7.5], radius: 1.3 },
  { id: 'rock-03', position: [9.0, 0, -2.0], radius: 1.6 },
  { id: 'rock-04', position: [-20.0, 0, -4.0], radius: 1.7 },
  { id: 'rock-05', position: [-7.5, 0, -14.5], radius: 1.5 },
  { id: 'rock-06', position: [5.5, 0, -17.0], radius: 1.4 },
  { id: 'bamboo-01', position: [-6.0, 0, 15.5], radius: 1.2 },
  { id: 'bamboo-02', position: [6.0, 0, 15.5], radius: 1.2 },
  { id: 'bamboo-03', position: [8.5, 0, 4.0], radius: 1.3 },
  { id: 'bamboo-04', position: [11.5, 0, -9.5], radius: 1.3 },
  { id: 'bamboo-05', position: [-14.0, 0, 9.5], radius: 1.3 },
  { id: 'bamboo-06', position: [-12.0, 0, -12.0], radius: 1.2 },
  { id: 'bamboo-07', position: [2.5, 0, -19.5], radius: 1.3 },
  { id: 'bamboo-08', position: [-4.5, 0, -19.5], radius: 1.3 },
  { id: 'gate-pillar-west', position: [-2.6, 0, 22.5], radius: 0.45 },
  { id: 'gate-pillar-east', position: [2.6, 0, 22.5], radius: 0.45 },
  { id: 'collider-plaque-panda-habitat', position: [2.8, 0, 11.5], radius: 0.55 },
  { id: 'collider-plaque-pond-ecology', position: [-1.2, 0, -3.5], radius: 0.55 },
  { id: 'collider-prop-stone-lantern', position: [4.2, 0, 1.5], radius: 0.55 },
  { id: 'collider-prop-wind-chime', position: [7.5, 0, -6.0], radius: 0.75 },
  { id: 'collider-prop-scenic-bench', position: [-2.5, 0, -13.0], radius: 0.5 },
  { id: 'collider-prop-plaza-bench', position: [-3.2, 0, 15.0], radius: 0.5 },
  { id: 'collider-prop-pond-chair', position: [-0.8, 0, 1.5], radius: 0.45 },
  { id: 'collider-prop-plaza-food-stall', position: [-6.8, 0, 12.2], radius: 0.9 },
  { id: 'collider-prop-bamboo-tea-stall', position: [11.8, 0, 5.6], radius: 0.9 },
  { id: 'collider-prop-plaza-cafe-table', position: [-3.8, 0, 12.6], radius: 0.45 },
  { id: 'collider-prop-bamboo-picnic-table', position: [10.8, 0, 0.8], radius: 0.45 }
];

function createInitialSeatStatesServer() {
  return {
    'prop-scenic-bench': [
      {
        objectId: 'prop-scenic-bench',
        seatIndex: 0,
        label: 'Left Seat',
        worldPosition: [-3.05, 0.1, -12.05],
        facingYaw: 0.25,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      },
      {
        objectId: 'prop-scenic-bench',
        seatIndex: 1,
        label: 'Right Seat',
        worldPosition: [-1.95, 0.1, -12.05],
        facingYaw: 0.25,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      }
    ],
    'prop-plaza-bench': [
      {
        objectId: 'prop-plaza-bench',
        seatIndex: 0,
        label: 'Left Seat',
        worldPosition: [-3.75, 0.1, 15.95],
        facingYaw: 0.15,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      },
      {
        objectId: 'prop-plaza-bench',
        seatIndex: 1,
        label: 'Right Seat',
        worldPosition: [-2.65, 0.1, 15.95],
        facingYaw: 0.15,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      }
    ],
    'prop-pond-chair': [
      {
        objectId: 'prop-pond-chair',
        seatIndex: 0,
        label: 'Center Seat',
        worldPosition: [-0.8, 0.1, 2.48],
        facingYaw: -0.45,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      }
    ],
    'prop-plaza-cafe-table': [
      {
        objectId: 'prop-plaza-cafe-table',
        seatIndex: 0,
        label: 'North Seat',
        worldPosition: [-3.8, 0.1, 11.62],
        facingYaw: 0,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      },
      {
        objectId: 'prop-plaza-cafe-table',
        seatIndex: 1,
        label: 'East Seat',
        worldPosition: [-2.82, 0.1, 12.6],
        facingYaw: -Math.PI / 2,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      },
      {
        objectId: 'prop-plaza-cafe-table',
        seatIndex: 2,
        label: 'South Seat',
        worldPosition: [-3.8, 0.1, 13.58],
        facingYaw: Math.PI,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      },
      {
        objectId: 'prop-plaza-cafe-table',
        seatIndex: 3,
        label: 'West Seat',
        worldPosition: [-4.78, 0.1, 12.6],
        facingYaw: Math.PI / 2,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      }
    ],
    'prop-bamboo-picnic-table': [
      {
        objectId: 'prop-bamboo-picnic-table',
        seatIndex: 0,
        label: 'West Front Seat',
        worldPosition: [9.82, 0.1, 1.25],
        facingYaw: Math.PI / 2,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      },
      {
        objectId: 'prop-bamboo-picnic-table',
        seatIndex: 1,
        label: 'West Back Seat',
        worldPosition: [9.82, 0.1, 0.35],
        facingYaw: Math.PI / 2,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      },
      {
        objectId: 'prop-bamboo-picnic-table',
        seatIndex: 2,
        label: 'East Front Seat',
        worldPosition: [11.78, 0.1, 1.25],
        facingYaw: -Math.PI / 2,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      },
      {
        objectId: 'prop-bamboo-picnic-table',
        seatIndex: 3,
        label: 'East Back Seat',
        worldPosition: [11.78, 0.1, 0.35],
        facingYaw: -Math.PI / 2,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      }
    ]
  };
}

/**
 * @param {number[]} candidatePosition
 * @param {number} [avatarRadius]
 * @returns {{ position: [number, number, number]; collided: boolean }}
 */
function resolveHorizontalWorldCollisions(candidatePosition, avatarRadius = 0.45) {
  let x = candidatePosition[0] ?? 0;
  let z = candidatePosition[2] ?? 0;
  const y = Math.max(0.1, Math.min(4.5, candidatePosition[1] ?? 0.1));
  let collided = false;

  for (const obs of PANDA_FOREST_OBSTACLES) {
    const dx = x - (obs.position[0] ?? 0);
    const dz = z - (obs.position[2] ?? 0);
    const distSq = dx * dx + dz * dz;
    const minDist = obs.radius + avatarRadius;
    if (distSq < minDist * minDist) {
      collided = true;
      const dist = Math.sqrt(distSq);
      if (dist > 1e-5) {
        const push = (minDist - dist) / dist;
        x += dx * push;
        z += dz * push;
      } else {
        x += minDist;
      }
    }
  }

  {
    const pdx = x - -8;
    const pdz = z - -4;
    const pDistSq = pdx * pdx + pdz * pdz;
    const minPondDist = 6.7 + avatarRadius;
    if (pDistSq < minPondDist * minPondDist) {
      collided = true;
      const pDist = Math.sqrt(pDistSq);
      if (pDist > 1e-5) {
        const scale = minPondDist / pDist;
        x = -8 + pdx * scale;
        z = -4 + pdz * scale;
      } else {
        x = -8 + minPondDist;
      }
    }
  }

  {
    const distFromOriginSq = x * x + z * z;
    const maxAllowedRadius = 36 - avatarRadius;
    if (distFromOriginSq > maxAllowedRadius * maxAllowedRadius) {
      collided = true;
      const dist = Math.sqrt(distFromOriginSq);
      const scale = maxAllowedRadius / dist;
      x *= scale;
      z *= scale;
    }
  }

  x = Math.min(40, Math.max(-40, x));
  z = Math.min(40, Math.max(-40, z));

  return { position: [x, y, z], collided };
}

/** @param {string} sessionId */
function deriveAccentColor(sessionId) {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = (hash * 31 + sessionId.charCodeAt(i)) >>> 0;
  }
  return VISITOR_ACCENT_PALETTE[hash % VISITOR_ACCENT_PALETTE.length] ?? '#10b981';
}

/**
 * @param {number} spawnIndex
 * @returns {[number, number, number]}
 */
function computeSpawnPosition(spawnIndex) {
  const base = /** @type {[number, number, number]} */ ([0, 0.1, 18]);
  if (spawnIndex <= 0) return [base[0], base[1], base[2]];
  const slot = ((spawnIndex - 1) % 15) + 1;
  const radius = Math.min(2.2, 0.65 * Math.sqrt(slot));
  const angle = slot * 2.399963229728653;
  const cx = Number((base[0] + Math.cos(angle) * radius).toFixed(3));
  const cz = Number((base[2] + Math.sin(angle) * radius).toFixed(3));
  const resolved = resolveHorizontalWorldCollisions([cx, base[1], cz]);
  return [
    Number(resolved.position[0].toFixed(3)),
    base[1],
    Number(resolved.position[2].toFixed(3))
  ];
}

/** @param {any} record */
function serializePlayer(record) {
  return {
    sessionId: record.sessionId,
    playerId: record.playerId,
    displayName: record.displayName,
    accentColor: record.accentColor,
    avatar: record.avatar ? { ...record.avatar } : { ...DEFAULT_AVATAR_APPEARANCE },
    position: [...record.transform.position],
    velocity: [...record.transform.velocity],
    facingYaw: record.transform.facingYaw,
    locomotionState: record.transform.locomotionState,
    sequence: record.transform.sequence,
    serverTimestamp: record.transform.serverTimestamp,
    reconciled: record.transform.reconciled,
    discrepancyDistance: record.transform.discrepancyDistance,
    activeEmote: record.activeEmote ? { ...record.activeEmote } : null,
    seatedOn: record.seatedOn ? { ...record.seatedOn } : null,
    activeConsumption: record.activeConsumption ? { ...record.activeConsumption } : null
  };
}

const rooms = new Map();
const sessionToRoom = new Map();
const knownPlayerNames = new Map();
const friendships = new Map();
const pendingFriendRequests = new Map();
const blockedPlayers = new Map();
const playerAllowFriendJoin = new Map();
const chatRateHistory = new Map();
const playerWallets = new Map();
const processedPurchaseRequests = new Map();
const playerPassports = new Map();
const playerDiscoveredSpecies = new Map();
const processedRewardClaims = new Map();
const processedEventRewardClaims = new Map();
/** @type {any[]} */
const moderationReports = [];

const VALID_SEASONAL_THEMES = new Set([
  'spring-blossom',
  'summer-lantern',
  'autumn-harvest',
  'none'
]);

const VALID_EVENT_STATUSES = new Set(['upcoming', 'active', 'finished']);

/** @type {Record<string, { eventId: string; title: string; zoneId: string; zoneName: string; defaultStatus: string; defaultStartOffsetMs: number; defaultDurationMs: number; defaultMaxParticipants: number; targetProgress: number; rewardCoins: number; icon: string; locationLabel: string; isSeasonal?: boolean }>} */
const SERVER_EVENTS_CATALOG = {
  'event-panda-feeding-gala': {
    eventId: 'event-panda-feeding-gala',
    title: 'Giant Panda Bamboo Feast',
    zoneId: 'zone-panda-sanctuary',
    zoneName: 'Misty Bamboo Grove Sanctuary',
    defaultStatus: 'active',
    defaultStartOffsetMs: -5 * 60 * 1000,
    defaultDurationMs: 30 * 60 * 1000,
    defaultMaxParticipants: 8,
    targetProgress: 3,
    rewardCoins: 20,
    icon: '🐼',
    locationLabel: 'Misty Bamboo Grove Sanctuary (East Terrace)'
  },
  'event-penguin-dive-show': {
    eventId: 'event-penguin-dive-show',
    title: 'Glacier Cove Penguin Splash',
    zoneId: 'zone-penguin-cove',
    zoneName: 'Glacier Cove Coastal Pool',
    defaultStatus: 'upcoming',
    defaultStartOffsetMs: 10 * 60 * 1000,
    defaultDurationMs: 25 * 60 * 1000,
    defaultMaxParticipants: 8,
    targetProgress: 3,
    rewardCoins: 20,
    icon: '🐧',
    locationLabel: 'Glacier Cove Coastal Pool (West Ledges)'
  },
  'event-guided-sanctuary-tour': {
    eventId: 'event-guided-sanctuary-tour',
    title: "Ranger's Guided Sanctuary Tour",
    zoneId: 'zone-welcome-plaza',
    zoneName: 'Welcome Plaza & Courtyard',
    defaultStatus: 'active',
    defaultStartOffsetMs: -2 * 60 * 1000,
    defaultDurationMs: 40 * 60 * 1000,
    defaultMaxParticipants: 12,
    targetProgress: 3,
    rewardCoins: 25,
    icon: '🗺️',
    locationLabel: 'Welcome Plaza & Courtyard (South Gate)'
  },
  'event-plaza-group-photo': {
    eventId: 'event-plaza-group-photo',
    title: 'Golden Hour Group Photo',
    zoneId: 'zone-wind-chime-lookout',
    zoneName: 'Northern Wind-Chime Lookout',
    defaultStatus: 'upcoming',
    defaultStartOffsetMs: 20 * 60 * 1000,
    defaultDurationMs: 20 * 60 * 1000,
    defaultMaxParticipants: 10,
    targetProgress: 2,
    rewardCoins: 20,
    icon: '📸',
    locationLabel: 'Northern Wind-Chime Lookout (North Ridge)'
  },
  'event-lantern-trivia-game': {
    eventId: 'event-lantern-trivia-game',
    title: 'Seasonal Lotus Stream Mini-Game',
    zoneId: 'zone-lotus-stream',
    zoneName: 'Highland Spring & Otter Stream',
    defaultStatus: 'active',
    defaultStartOffsetMs: -3 * 60 * 1000,
    defaultDurationMs: 45 * 60 * 1000,
    defaultMaxParticipants: 8,
    targetProgress: 2,
    rewardCoins: 25,
    icon: '🏮',
    locationLabel: 'Highland Spring & Otter Stream (Central Pond)',
    isSeasonal: true
  }
};

const ORDERED_EVENT_IDS = [
  'event-panda-feeding-gala',
  'event-penguin-dive-show',
  'event-guided-sanctuary-tour',
  'event-plaza-group-photo',
  'event-lantern-trivia-game'
];

function createInitialRoomEventsServer(now = Date.now(), seasonalTheme = 'spring-blossom') {
  /** @type {Record<string, any>} */
  const map = {};
  for (const eventId of ORDERED_EVENT_IDS) {
    const desc = SERVER_EVENTS_CATALOG[eventId];
    if (!desc) continue;
    const startTimeMs = now + desc.defaultStartOffsetMs;
    const endTimeMs = startTimeMs + desc.defaultDurationMs;
    map[eventId] = {
      eventId,
      eventInstanceId: `evinst_${eventId}_1`,
      instanceSeq: 1,
      status: desc.isSeasonal && seasonalTheme === 'none' ? 'finished' : desc.defaultStatus,
      startTimeMs,
      endTimeMs,
      maxParticipants: desc.defaultMaxParticipants,
      participantSessionIds: [],
      participantPlayerIds: [],
      contributedPlayerIds: [],
      claimedPlayerIds: [],
      sharedProgressCount: 0,
      targetProgress: desc.targetProgress,
      rewardCoins: desc.rewardCoins
    };
  }
  return map;
}

/**
 * @param {any} room
 */
function buildRoomEventsSnapshotServer(room) {
  return {
    seasonalTheme: room.seasonalTheme || 'spring-blossom',
    events: ORDERED_EVENT_IDS.map((id) => {
      const ev = room.events[id];
      return {
        eventId: ev.eventId,
        eventInstanceId: ev.eventInstanceId,
        status: ev.status,
        startTimeMs: ev.startTimeMs,
        endTimeMs: ev.endTimeMs,
        maxParticipants: ev.maxParticipants,
        participantSessionIds: [...ev.participantSessionIds],
        participantPlayerIds: [...ev.participantPlayerIds],
        contributedPlayerIds: [...ev.contributedPlayerIds],
        claimedPlayerIds: [...ev.claimedPlayerIds],
        sharedProgressCount: ev.sharedProgressCount,
        targetProgress: ev.targetProgress,
        rewardCoins: ev.rewardCoins
      };
    })
  };
}

/**
 * @param {any} room
 * @param {string} sessionId
 * @param {string} [playerId]
 * @param {number} [now]
 */
function removeEventParticipantSessionServer(room, sessionId, playerId, now = Date.now()) {
  if (!room || !room.events) return null;
  let changed = false;
  for (const eventId of ORDERED_EVENT_IDS) {
    const ev = room.events[eventId];
    if (!ev) continue;
    const prevS = ev.participantSessionIds.length;
    const prevP = ev.participantPlayerIds.length;
    ev.participantSessionIds = ev.participantSessionIds.filter(
      /** @param {string} id */ (id) => id !== sessionId
    );
    if (playerId) {
      ev.participantPlayerIds = ev.participantPlayerIds.filter(
        /** @param {string} id */ (id) => id !== playerId
      );
    }
    if (ev.participantSessionIds.length !== prevS || ev.participantPlayerIds.length !== prevP) {
      changed = true;
    }
  }
  if (!changed) return null;
  const snap = buildRoomEventsSnapshotServer(room);
  return {
    type: 'zoo_events_snapshot',
    roomId: room.roomId,
    seasonalTheme: snap.seasonalTheme,
    events: snap.events,
    serverTimestamp: now
  };
}

/**
 * @param {string} playerId
 * @returns {Set<string>}
 */
function getOrInitDiscoveredSpeciesSetServer(playerId) {
  let s = playerDiscoveredSpecies.get(playerId);
  if (!s) {
    s = new Set();
    playerDiscoveredSpecies.set(playerId, s);
  }
  return s;
}

/**
 * @param {string} playerId
 * @param {any} [initialSnapshot]
 * @param {string} [nowIso]
 */
function getOrInitPlayerPassportServer(playerId, initialSnapshot, nowIso = new Date().toISOString()) {
  const existing = playerPassports.get(playerId);
  const incoming = initialSnapshot ? sanitizePassportStateServer(initialSnapshot, nowIso) : null;
  if (!existing) {
    const created = incoming || createDefaultPassportStateServer(nowIso);
    playerPassports.set(playerId, created);
    return created;
  }
  if (incoming) {
    for (const zid of VALID_PASSPORT_ZONE_IDS) {
      const incS = incoming.stamps[zid];
      const exS = existing.stamps[zid];
      if (incS?.obtained && exS && !exS.obtained) {
        existing.stamps[zid] = { ...incS };
      }
    }
    for (const aid of VALID_ACHIEVEMENT_IDS) {
      const incA = incoming.achievements[aid];
      const exA = existing.achievements[aid];
      if (incA && exA) {
        if (incA.progressCount > exA.progressCount) exA.progressCount = incA.progressCount;
        if (incA.unlocked && !exA.unlocked) {
          exA.unlocked = true;
          exA.unlockedAt = incA.unlockedAt || nowIso;
        }
        if (incA.claimed && !exA.claimed) {
          exA.claimed = true;
          exA.claimedAt = incA.claimedAt || nowIso;
        }
      }
    }
    existing.socialInteractionsCount = Math.max(
      existing.socialInteractionsCount,
      incoming.socialInteractionsCount
    );
    existing.activitiesCompletedCount = Math.max(
      existing.activitiesCompletedCount,
      incoming.activitiesCompletedCount
    );
    for (const b of incoming.earnedBadges) {
      if (!existing.earnedBadges.includes(b)) existing.earnedBadges.push(b);
    }
    if (!existing.activeBadge && incoming.activeBadge) {
      existing.activeBadge = incoming.activeBadge;
    }
    const speciesSet = getOrInitDiscoveredSpeciesSetServer(playerId);
    evaluatePassportAchievementsServer(existing, speciesSet.size, nowIso);
  }
  return existing;
}

/**
 * @param {string} playerId
 * @param {any} [initialSnapshot]
 */
function getOrInitPlayerWalletServer(playerId, initialSnapshot) {
  let w = playerWallets.get(playerId);
  if (w) return w;
  const sanitized = sanitizeDiningWalletServer(initialSnapshot);
  w = {
    currencyBalance: sanitized.currencyBalance,
    inventory: { ...sanitized.inventory }
  };
  playerWallets.set(playerId, w);
  return w;
}

let globalSessionCounter = 0;
let globalMessageCounter = 0;
let globalFriendReqCounter = 0;
let globalReportCounter = 0;
let globalFeedbackCounter = 0;
let globalErrorCounter = 0;
const serverStartedAt = Date.now();
const PUBLIC_BETA_VERSION = '0.10.0-beta';
const VALID_BETA_FEEDBACK_CATEGORIES = new Set([
  'bug',
  'performance',
  'usability',
  'suggestion',
  'safety'
]);
const VALID_BETA_FEEDBACK_SEVERITIES = new Set(['low', 'medium', 'high']);
/** @type {any[]} */
const betaFeedbackItems = [];
/** @type {Map<string, number[]>} */
const feedbackTimestampsBySession = new Map();
/** @type {any[]} */
const diagnosticErrors = [];
/** @type {any} */
let maintenanceNotice = null;

/** @param {string} playerId */
function getOrCreateFriendSet(playerId) {
  let s = friendships.get(playerId);
  if (!s) {
    s = new Set();
    friendships.set(playerId, s);
  }
  return s;
}

/** @param {string} playerId */
function getOrCreateBlockSet(playerId) {
  let s = blockedPlayers.get(playerId);
  if (!s) {
    s = new Set();
    blockedPlayers.set(playerId, s);
  }
  return s;
}

/**
 * @param {string} playerA
 * @param {string} playerB
 */
function isPlayerBlockedServer(playerA, playerB) {
  return Boolean(
    blockedPlayers.get(playerA)?.has(playerB) ||
      blockedPlayers.get(playerB)?.has(playerA)
  );
}

/** @param {string} playerId */
function findActiveSessionByPlayerIdServer(playerId) {
  for (const room of rooms.values()) {
    for (const session of room.activeSessions.values()) {
      if (session.playerId === playerId) return session;
    }
  }
  return null;
}

/**
 * @param {string} sessionId
 * @param {number} now
 */
function checkChatRateLimitServer(sessionId, now) {
  const cutoff = now - CHAT_RATE_WINDOW_MS;
  const recent = (chatRateHistory.get(sessionId) || []).filter(
    /** @param {number} ts */ (ts) => ts > cutoff
  );
  const lastRecent = recent[recent.length - 1];
  if (lastRecent !== undefined && now - lastRecent < CHAT_MIN_INTERVAL_MS) {
    chatRateHistory.set(sessionId, recent);
    return false;
  }
  if (recent.length >= CHAT_MAX_MESSAGES_PER_WINDOW) {
    chatRateHistory.set(sessionId, recent);
    return false;
  }
  recent.push(now);
  chatRateHistory.set(sessionId, recent);
  return true;
}

/**
 * @param {any} room
 * @param {any} session
 * @param {number} now
 */
function releasePlayerSeatServer(room, session, now) {
  const seatedOn = session.seatedOn;
  session.seatedOn = null;
  let updatedObjectId = seatedOn?.objectId || null;

  for (const [objId, slots] of Object.entries(room.seatStates)) {
    for (const slot of slots) {
      if (slot.occupiedBySessionId === session.sessionId) {
        slot.occupiedBySessionId = null;
        slot.occupiedByPlayerId = null;
        slot.occupiedByDisplayName = null;
        slot.occupiedAt = 0;
        updatedObjectId = objId;
      }
    }
  }

  if (!updatedObjectId) return null;
  const slots = room.seatStates[updatedObjectId] || [];
  const anyOccupied = slots.some(/** @param {any} s */ (s) => s.occupiedBySessionId !== null);
  if (room.propStates[updatedObjectId]) {
    room.propStates[updatedObjectId].active = anyOccupied;
    room.propStates[updatedObjectId].lastTriggeredAt = now;
  }

  return {
    type: 'seat_state_updated',
    roomId: room.roomId,
    objectId: updatedObjectId,
    seats: slots,
    propActive: anyOccupied,
    triggeredBySessionId: session.sessionId,
    serverTimestamp: now
  };
}

function getOrCreateRoom(roomId = 'panda-forest-1') {
  let room = rooms.get(roomId);
  if (room) return room;
  const now = Date.now();
  room = {
    roomId,
    maxPlayers: 16,
    status: 'healthy',
    nextVisitorNumber: 101,
    activeSessions: new Map(),
    resumableSessions: new Map(),
    propStates: {
      'prop-stone-lantern': { active: true, lastTriggeredAt: 0 },
      'prop-wind-chime': { active: false, lastTriggeredAt: 0 },
      'prop-scenic-bench': { active: false, lastTriggeredAt: 0 },
      'prop-plaza-bench': { active: false, lastTriggeredAt: 0 },
      'prop-pond-chair': { active: false, lastTriggeredAt: 0 },
      'prop-plaza-cafe-table': { active: false, lastTriggeredAt: 0 },
      'prop-bamboo-picnic-table': { active: false, lastTriggeredAt: 0 }
    },
    seatStates: createInitialSeatStatesServer(),
    animals: createInitialAnimalStatesServer(now),
    habitatFeedings: createInitialHabitatFeedingsServer(),
    seasonalTheme: 'spring-blossom',
    events: createInitialRoomEventsServer(now, 'spring-blossom'),
    lastScheduledFeedingAt: now,
    recentChatHistory: [],
    tickSequence: 0
  };
  rooms.set(roomId, room);
  return room;
}

/** @type {Record<string, any>} */
const SERVER_HABITAT_ZONES = {
  'habitat-panda-grove': {
    habitatId: 'habitat-panda-grove',
    speciesId: 'panda',
    center: [12.0, 0, 8.0],
    radius: 5.2,
    hasWaterZone: false,
    feedingStationPosition: [8.4, 0, 9.2],
    obstacles: [
      { position: [10.0, 13.0], radius: 1.2 },
      { position: [8.5, 4.0], radius: 1.3 }
    ]
  },
  'habitat-penguin-cove': {
    habitatId: 'habitat-penguin-cove',
    speciesId: 'penguin',
    center: [-12.5, 0, 6.0],
    radius: 5.0,
    hasWaterZone: true,
    waterCenter: [-13.3, 5.4],
    waterRadius: 2.9,
    feedingStationPosition: [-8.6, 0, 7.0],
    obstacles: [
      { position: [-14.0, 9.5], radius: 1.3 },
      { position: [-18.0, 4.0], radius: 1.1 }
    ]
  },
  'habitat-otter-stream': {
    habitatId: 'habitat-otter-stream',
    speciesId: 'otter',
    center: [-8.0, 0, -4.0],
    radius: 5.8,
    hasWaterZone: true,
    waterCenter: [-8.0, -4.0],
    waterRadius: 4.1,
    feedingStationPosition: [-2.8, 0, -3.2],
    obstacles: [{ position: [-9.2, -5.0], radius: 0.75 }]
  }
};

/** @type {Record<string, Array<{ behaviorState: string; activityVariant: string; durationMs: number; speed: number }>>} */
const SERVER_BEHAVIOR_POOL = {
  panda: [
    { behaviorState: 'Walking', activityVariant: 'stroll', durationMs: 4200, speed: 1.05 },
    { behaviorState: 'Eating', activityVariant: 'bamboo-munch', durationMs: 5200, speed: 0.4 },
    { behaviorState: 'Resting', activityVariant: 'sit-scratch', durationMs: 4000, speed: 0 },
    { behaviorState: 'Sleeping', activityVariant: 'curled-nap', durationMs: 5600, speed: 0 },
    { behaviorState: 'Playing', activityVariant: 'bamboo-roll', durationMs: 3800, speed: 1.45 },
    { behaviorState: 'Idle', activityVariant: 'calm-observe', durationMs: 3000, speed: 0 }
  ],
  penguin: [
    { behaviorState: 'Walking', activityVariant: 'group-waddle', durationMs: 4400, speed: 1.25 },
    { behaviorState: 'Walking', activityVariant: 'waddle', durationMs: 3600, speed: 1.15 },
    { behaviorState: 'Swimming', activityVariant: 'pool-swim', durationMs: 5000, speed: 1.75 },
    { behaviorState: 'Playing', activityVariant: 'belly-slide', durationMs: 3600, speed: 1.9 },
    { behaviorState: 'Resting', activityVariant: 'ledge-huddle', durationMs: 3800, speed: 0 },
    { behaviorState: 'Idle', activityVariant: 'calm-observe', durationMs: 2800, speed: 0 },
    { behaviorState: 'Eating', activityVariant: 'fish-feast', durationMs: 4200, speed: 0.6 }
  ],
  otter: [
    { behaviorState: 'Swimming', activityVariant: 'stream-swim', durationMs: 4800, speed: 1.85 },
    { behaviorState: 'Playing', activityVariant: 'back-float', durationMs: 4000, speed: 0.75 },
    { behaviorState: 'Walking', activityVariant: 'bank-scurry', durationMs: 3800, speed: 1.5 },
    { behaviorState: 'Resting', activityVariant: 'sun-bask', durationMs: 4200, speed: 0 },
    { behaviorState: 'Eating', activityVariant: 'clam-forage', durationMs: 4400, speed: 0.5 },
    { behaviorState: 'Idle', activityVariant: 'calm-observe', durationMs: 2800, speed: 0 }
  ]
};

/**
 * @param {number[]} candidate
 * @param {any} habitat
 * @param {string} behaviorState
 */
function clampPositionToHabitatServer(candidate, habitat, behaviorState) {
  let x = candidate[0] ?? 0;
  let z = candidate[2] ?? 0;
  const y = candidate[1] ?? 0;
  if (behaviorState === 'Swimming' && habitat.hasWaterZone && habitat.waterCenter && habitat.waterRadius) {
    const wdx = x - habitat.waterCenter[0];
    const wdz = z - habitat.waterCenter[1];
    const wDist = Math.hypot(wdx, wdz);
    const maxWaterR = Math.max(0.5, habitat.waterRadius - 0.35);
    if (wDist > maxWaterR && wDist > 1e-5) {
      const s = maxWaterR / wDist;
      x = habitat.waterCenter[0] + wdx * s;
      z = habitat.waterCenter[1] + wdz * s;
    }
  }
  for (const obs of habitat.obstacles) {
    const odx = x - obs.position[0];
    const odz = z - obs.position[1];
    const oDist = Math.hypot(odx, odz);
    const minObsR = obs.radius + 0.45;
    if (oDist < minObsR && oDist > 1e-5) {
      const push = (minObsR - oDist) / oDist;
      x += odx * push;
      z += odz * push;
    }
  }
  const hdx = x - habitat.center[0];
  const hdz = z - habitat.center[2];
  const hDist = Math.hypot(hdx, hdz);
  const maxHabitatR = Math.max(1.0, habitat.radius - 0.55);
  if (hDist > maxHabitatR && hDist > 1e-5) {
    const s = maxHabitatR / hDist;
    x = habitat.center[0] + hdx * s;
    z = habitat.center[2] + hdz * s;
  }
  return [x, y, z];
}

function createInitialAnimalStatesServer(now = Date.now()) {
  const initial = [
    { animalId: 'panda-bao', speciesId: 'panda', displayName: 'Bao', habitatId: 'habitat-panda-grove', behaviorState: 'Eating', activityVariant: 'bamboo-munch', position: [10.8, 0, 8.4], rotationY: -0.6 },
    { animalId: 'panda-mei', speciesId: 'panda', displayName: 'Mei', habitatId: 'habitat-panda-grove', behaviorState: 'Playing', activityVariant: 'bamboo-roll', position: [13.2, 0, 7.2], rotationY: 0.4 },
    { animalId: 'penguin-piko', speciesId: 'penguin', displayName: 'Piko', habitatId: 'habitat-penguin-cove', behaviorState: 'Walking', activityVariant: 'group-waddle', position: [-10.8, 0, 6.8], rotationY: 0.8, isGroupLeader: true },
    { animalId: 'penguin-skipper', speciesId: 'penguin', displayName: 'Skipper', habitatId: 'habitat-penguin-cove', behaviorState: 'Walking', activityVariant: 'group-waddle', position: [-11.6, 0, 7.4], rotationY: 0.8, groupLeaderId: 'penguin-piko' },
    { animalId: 'penguin-waddles', speciesId: 'penguin', displayName: 'Waddles', habitatId: 'habitat-penguin-cove', behaviorState: 'Swimming', activityVariant: 'pool-swim', position: [-13.2, 0, 5.2], rotationY: -1.1, groupLeaderId: 'penguin-piko' },
    { animalId: 'otter-lumi', speciesId: 'otter', displayName: 'Lumi', habitatId: 'habitat-otter-stream', behaviorState: 'Swimming', activityVariant: 'stream-swim', position: [-6.8, 0, -3.6], rotationY: 1.2 },
    { animalId: 'otter-pip', speciesId: 'otter', displayName: 'Pip', habitatId: 'habitat-otter-stream', behaviorState: 'Playing', activityVariant: 'back-float', position: [-5.6, 0, -4.4], rotationY: -0.5 }
  ];
  return initial.map((a, idx) => ({
    ...a,
    position: [...a.position],
    targetPosition: [...a.position],
    speed: 1.15,
    stateStartedAt: now,
    stateEndsAt: now + 3800 + (idx % 3) * 750
  }));
}

function createInitialHabitatFeedingsServer() {
  return {
    'habitat-panda-grove': { habitatId: 'habitat-panda-grove', speciesId: 'panda', isActive: false, startedAt: null, endsAt: null, cooldownUntil: null, triggeredBySessionId: null, lastTriggerKind: 'none' },
    'habitat-penguin-cove': { habitatId: 'habitat-penguin-cove', speciesId: 'penguin', isActive: false, startedAt: null, endsAt: null, cooldownUntil: null, triggeredBySessionId: null, lastTriggerKind: 'none' },
    'habitat-otter-stream': { habitatId: 'habitat-otter-stream', speciesId: 'otter', isActive: false, startedAt: null, endsAt: null, cooldownUntil: null, triggeredBySessionId: null, lastTriggerKind: 'none' }
  };
}

/**
 * @param {any} room
 * @param {string} habitatId
 * @param {number} now
 * @param {string | null} triggeredBySessionId
 * @param {string} [triggerKind]
 */
function triggerRoomHabitatFeedingServer(room, habitatId, now, triggeredBySessionId, triggerKind = 'player') {
  const habitat = SERVER_HABITAT_ZONES[habitatId];
  const cur = room.habitatFeedings[habitatId];
  if (!habitat || !cur) return { accepted: false, reason: 'invalid_habitat' };
  if (cur.isActive && cur.endsAt !== null && now < cur.endsAt) {
    return { accepted: false, reason: 'already_active' };
  }
  if (cur.cooldownUntil !== null && now < cur.cooldownUntil) {
    return { accepted: false, reason: 'on_cooldown' };
  }
  const updated = {
    habitatId,
    speciesId: habitat.speciesId,
    isActive: true,
    startedAt: now,
    endsAt: now + 12000,
    cooldownUntil: now + 30000,
    triggeredBySessionId,
    lastTriggerKind: triggerKind
  };
  room.habitatFeedings[habitatId] = updated;
  const variant = habitat.speciesId === 'panda' ? 'bamboo-munch' : habitat.speciesId === 'penguin' ? 'fish-feast' : 'clam-forage';
  let slot = 0;
  for (const animal of room.animals) {
    if (animal.habitatId !== habitatId) continue;
    const angle = (slot / 3) * Math.PI * 1.4 - 0.5;
    const target = clampPositionToHabitatServer(
      [habitat.feedingStationPosition[0] + Math.cos(angle) * 0.9, 0, habitat.feedingStationPosition[2] + Math.sin(angle) * 0.9],
      habitat,
      'Eating'
    );
    animal.behaviorState = 'Eating';
    animal.activityVariant = variant;
    animal.targetPosition = target;
    animal.speed = 1.45;
    animal.stateStartedAt = now;
    animal.stateEndsAt = now + 12000;
    slot += 1;
  }
  return { accepted: true, feedingState: updated, animals: room.animals };
}

/**
 * @param {any} room
 * @param {number} dtSeconds
 * @param {number} now
 */
function stepRoomAnimalsServer(room, dtSeconds, now) {
  for (const hid of Object.keys(room.habitatFeedings)) {
    const f = room.habitatFeedings[hid];
    if (f.isActive && f.endsAt !== null && now >= f.endsAt) f.isActive = false;
    if (f.cooldownUntil !== null && now >= f.cooldownUntil && !f.isActive) f.cooldownUntil = null;
  }
  for (let i = 0; i < room.animals.length; i++) {
    const animal = room.animals[i];
    const habitat = SERVER_HABITAT_ZONES[animal.habitatId];
    const feeding = room.habitatFeedings[animal.habitatId];
    if (now >= animal.stateEndsAt && !feeding.isActive) {
      const pool = SERVER_BEHAVIOR_POOL[animal.speciesId] ?? [];
      const candidates = pool.filter((c) => c.behaviorState !== animal.behaviorState || c.activityVariant !== animal.activityVariant);
      const chosen = candidates[(room.tickSequence + i * 7) % candidates.length] || pool[0];
      if (chosen) {
        animal.behaviorState = chosen.behaviorState;
        animal.activityVariant = chosen.activityVariant;
        animal.speed = chosen.speed;
        animal.stateStartedAt = now;
        animal.stateEndsAt = now + chosen.durationMs + ((room.tickSequence * 197 + i * 313) % 1200);
        const angle = (((room.tickSequence * 43 + i * 97) % 360) * Math.PI) / 180;
        const r = (habitat.radius - 0.9) * (0.3 + ((room.tickSequence + i * 17) % 60) / 100);
        animal.targetPosition = clampPositionToHabitatServer(
          [habitat.center[0] + Math.cos(angle) * r, 0, habitat.center[2] + Math.sin(angle) * r],
          habitat,
          animal.behaviorState
        );
      }
    }
    if (animal.speciesId === 'penguin' && animal.activityVariant === 'group-waddle' && animal.groupLeaderId) {
      const leader = room.animals.find(/** @param {any} a */ (a) => a.animalId === animal.groupLeaderId);
      if (leader) {
        const offsetAngle = leader.rotationY + Math.PI + (i % 2 === 0 ? 0.45 : -0.45);
        animal.targetPosition = clampPositionToHabitatServer(
          [leader.position[0] + Math.sin(offsetAngle) * 1.15, 0, leader.position[2] + Math.cos(offsetAngle) * 1.15],
          habitat,
          animal.behaviorState
        );
      }
    }
    const dx = animal.targetPosition[0] - animal.position[0];
    const dz = animal.targetPosition[2] - animal.position[2];
    const dist = Math.hypot(dx, dz);
    if (dist > 0.08 && animal.speed > 0) {
      const moveStep = Math.min(dist, animal.speed * dtSeconds);
      animal.position = clampPositionToHabitatServer(
        [animal.position[0] + (dx / dist) * moveStep, 0, animal.position[2] + (dz / dist) * moveStep],
        habitat,
        animal.behaviorState
      );
      animal.rotationY = Math.atan2(dx, dz);
    }
  }
}

const DEFAULT_PUBLIC_INSTANCES = [
  { roomId: 'panda-forest-1', label: 'Panda Forest #1 (Main Plaza)' },
  { roomId: 'panda-forest-2', label: 'Panda Forest #2 (Bamboo Grove)' },
  { roomId: 'panda-forest-3', label: 'Panda Forest #3 (Quiet Sanctuary)' }
];

const DEFAULT_PUBLIC_ROOM_ID_SET = new Set(DEFAULT_PUBLIC_INSTANCES.map((p) => p.roomId));

/** @param {string} playerId */
function getPlayerAllowFriendJoinServer(playerId) {
  return playerAllowFriendJoin.get(playerId) ?? true;
}

/** @param {string} roomId */
function getInstanceLabelServer(roomId) {
  const preset = DEFAULT_PUBLIC_INSTANCES.find((p) => p.roomId === roomId);
  if (preset) return preset.label;
  const overflowMatch = /^panda-forest-(\d+)$/.exec(roomId);
  if (overflowMatch) {
    return `Panda Forest #${overflowMatch[1]} (Overflow Sanctuary)`;
  }
  return `Custom Instance (${roomId})`;
}

function pruneEmptyOverflowRoomsServer() {
  for (const [roomId, room] of rooms.entries()) {
    if (
      !DEFAULT_PUBLIC_ROOM_ID_SET.has(roomId) &&
      room.activeSessions.size === 0 &&
      room.resumableSessions.size === 0 &&
      room.status !== 'unhealthy'
    ) {
      rooms.delete(roomId);
    }
  }
}

/** @param {string} [forPlayerId] */
function getAvailableInstancesServer(forPlayerId) {
  pruneEmptyOverflowRoomsServer();
  const roomIds = new Set(DEFAULT_PUBLIC_INSTANCES.map((p) => p.roomId));
  for (const rid of rooms.keys()) {
    roomIds.add(rid);
  }
  const friendSet = forPlayerId ? friendships.get(forPlayerId) : undefined;
  const summaries = [];
  for (const rid of roomIds) {
    const r = rooms.get(rid);
    const visitorCount = r ? r.activeSessions.size : 0;
    const maxPlayers = r ? r.maxPlayers : 16;
    const status = r ? r.status || 'healthy' : 'healthy';
    let friendCount = 0;
    if (forPlayerId && friendSet && r) {
      for (const s of r.activeSessions.values()) {
        if (
          s.playerId !== forPlayerId &&
          friendSet.has(s.playerId) &&
          !isPlayerBlockedServer(forPlayerId, s.playerId)
        ) {
          friendCount += 1;
        }
      }
    }
    summaries.push({
      roomId: rid,
      label: getInstanceLabelServer(rid),
      visitorCount,
      maxPlayers,
      isFull: visitorCount >= maxPlayers,
      status,
      friendCount,
      isOverflow: !DEFAULT_PUBLIC_ROOM_ID_SET.has(rid)
    });
  }
  return summaries;
}

/**
 * @param {string} playerId
 * @param {string} [keepSessionId]
 * @param {number} [now]
 */
function purgeDuplicatePlayerSessionsServer(playerId, keepSessionId, now = Date.now()) {
  if (!playerId) return;
  for (const room of rooms.values()) {
    for (const [sid, s] of room.activeSessions.entries()) {
      if (s.playerId === playerId && sid !== keepSessionId) {
        const releasedSeat = releasePlayerSeatServer(room, s, now);
        if (releasedSeat) broadcastToRoom(room.roomId, releasedSeat);
        const evUpdate = removeEventParticipantSessionServer(room, sid, s.playerId, now);
        if (evUpdate) broadcastToRoom(room.roomId, evUpdate);
        room.activeSessions.delete(sid);
        sessionToRoom.delete(sid);
        room.resumableSessions.delete(s.resumeToken);
        broadcastToRoom(
          room.roomId,
          {
            type: 'player_left',
            roomId: room.roomId,
            sessionId: sid,
            reason: 'switched_room',
            visitorCount: room.activeSessions.size,
            serverTimestamp: now
          },
          sid
        );
      }
    }
    for (const [tok, entry] of room.resumableSessions.entries()) {
      if (entry.record.playerId === playerId && entry.record.sessionId !== keepSessionId) {
        room.resumableSessions.delete(tok);
      }
    }
  }
  pruneEmptyOverflowRoomsServer();
}

/**
 * @param {any} binding
 * @param {number} [now]
 */
function ensureSessionActiveServer(binding, now = Date.now()) {
  if (!binding.sessionId) return null;
  const activeRoom = rooms.get(binding.roomId);
  const activeSession = activeRoom?.activeSessions.get(binding.sessionId);
  if (activeRoom && activeSession) {
    activeSession.lastHeartbeatAt = now;
    return { room: activeRoom, session: activeSession, reactivated: false };
  }

  for (const r of rooms.values()) {
    for (const [token, entry] of r.resumableSessions.entries()) {
      if (entry.record.sessionId === binding.sessionId) {
        r.resumableSessions.delete(token);
        const restored = {
          ...entry.record,
          lastHeartbeatAt: now,
          lastMoveAt: now
        };
        r.activeSessions.set(restored.sessionId, restored);
        sessionToRoom.set(restored.sessionId, r.roomId);
        binding.roomId = r.roomId;
        return { room: r, session: restored, reactivated: true };
      }
    }
  }
  return null;
}

/**
 * @param {string} [requestedRoomId]
 * @param {{ playerId?: string; friendPlayerIds?: string[]; preferFriendPlacement?: boolean; excludeRoomId?: string }} [options]
 */
function selectAvailableRoomWithReasonServer(requestedRoomId = 'panda-forest-1', options = {}) {
  if (options.preferFriendPlacement && options.playerId) {
    const candidateFriendIds = new Set(options.friendPlayerIds || []);
    const storedFriends = friendships.get(options.playerId);
    if (storedFriends) {
      for (const fid of storedFriends) candidateFriendIds.add(fid);
    }
    for (const fid of candidateFriendIds) {
      if (fid === options.playerId || isPlayerBlockedServer(options.playerId, fid)) continue;
      if (!getPlayerAllowFriendJoinServer(fid)) continue;
      const friendSession = findActiveSessionByPlayerIdServer(fid);
      if (!friendSession) continue;
      const friendRoom = rooms.get(friendSession.roomId);
      if (
        friendRoom &&
        friendRoom.roomId !== options.excludeRoomId &&
        friendRoom.status !== 'unhealthy' &&
        friendRoom.activeSessions.size < friendRoom.maxPlayers
      ) {
        return {
          room: friendRoom,
          placementReason: 'friend_priority',
          placementNotice: `Joined ${friendSession.baseDisplayName} in ${getInstanceLabelServer(friendRoom.roomId)}!`
        };
      }
    }
  }

  const primary = getOrCreateRoom(requestedRoomId);
  if (
    primary.roomId !== options.excludeRoomId &&
    primary.status !== 'unhealthy' &&
    primary.activeSessions.size < primary.maxPlayers
  ) {
    return {
      room: primary,
      placementReason: 'requested'
    };
  }

  const prefix = requestedRoomId.replace(/-\d+$/, '');
  for (let i = 1; i < 100; i++) {
    const candidateId = `${prefix}-${i}`;
    if (candidateId === options.excludeRoomId) continue;
    const r = getOrCreateRoom(candidateId);
    if (r.status !== 'unhealthy' && r.activeSessions.size < r.maxPlayers) {
      const reasonDesc =
        primary.status === 'unhealthy' || primary.roomId === options.excludeRoomId
          ? 'unavailable'
          : `full (${primary.activeSessions.size}/${primary.maxPlayers})`;
      return {
        room: r,
        placementReason: 'overflow_redirect',
        placementNotice: `${getInstanceLabelServer(requestedRoomId)} is currently ${reasonDesc}. Placed in ${getInstanceLabelServer(r.roomId)}.`
      };
    }
  }

  return {
    room: primary,
    placementReason: 'requested'
  };
}

/**
 * @param {string} playerId
 * @param {number} [now]
 */
function buildSocialPresenceMessage(playerId, now = Date.now()) {
  const friendSet = getOrCreateFriendSet(playerId);
  const blockSet = getOrCreateBlockSet(playerId);
  const friends = [];

  for (const fid of friendSet) {
    if (isPlayerBlockedServer(playerId, fid)) continue;
    const activeSession = findActiveSessionByPlayerIdServer(fid);
    const activeRoom = activeSession ? rooms.get(activeSession.roomId) : null;
    const roomVisitorCount = activeRoom ? activeRoom.activeSessions.size : 0;
    const roomMaxPlayers = activeRoom ? activeRoom.maxPlayers : 16;
    const roomStatus = activeRoom ? activeRoom.status || 'healthy' : 'healthy';
    const friendAllowJoin = getPlayerAllowFriendJoinServer(fid);
    const displayName = activeSession?.baseDisplayName || knownPlayerNames.get(fid) || fid;
    friends.push({
      playerId: fid,
      displayName,
      online: Boolean(activeSession),
      roomId: activeSession ? activeSession.roomId : null,
      roomVisitorCount,
      roomMaxPlayers,
      canJoin: Boolean(
        activeSession &&
          roomStatus === 'healthy' &&
          friendAllowJoin &&
          roomVisitorCount < roomMaxPlayers
      ),
      allowFriendJoin: friendAllowJoin,
      roomStatus
    });
  }

  const incomingRequests = [];
  const outgoingRequests = [];
  for (const req of pendingFriendRequests.values()) {
    if (req.status !== 'pending') continue;
    if (isPlayerBlockedServer(req.fromPlayerId, req.toPlayerId)) continue;
    if (req.toPlayerId === playerId) incomingRequests.push({ ...req });
    else if (req.fromPlayerId === playerId) outgoingRequests.push({ ...req });
  }

  return {
    type: 'social_presence_update',
    playerId,
    friends,
    incomingRequests,
    outgoingRequests,
    blockedPlayerIds: Array.from(blockSet),
    availableInstances: getAvailableInstancesServer(playerId),
    serverTimestamp: now
  };
}

/**
 * @param {'client' | 'server'} _source
 * @param {string} code
 * @param {string} message
 * @param {{ playerId?: string; roomId?: string }} [context]
 * @param {number} [now]
 */
function recordDiagnosticErrorServer(_source, code, message, context = {}, now = Date.now()) {
  globalErrorCounter += 1;
  const entry = {
    errorId: `err_${globalErrorCounter}_${now}`,
    code,
    message: String(message || '').slice(0, 200),
    roomId: context.roomId || null,
    playerId: context.playerId || null,
    timestamp: now
  };
  diagnosticErrors.push(entry);
  if (diagnosticErrors.length > 50) {
    diagnosticErrors.splice(0, diagnosticErrors.length - 50);
  }
  return entry;
}

function getOpsHealthSnapshotServer(now = Date.now()) {
  const instances = getAvailableInstancesServer();
  let totalVisitors = 0;
  let healthyInstances = 0;
  let unhealthyInstances = 0;
  for (const inst of instances) {
    totalVisitors += inst.visitorCount;
    if (inst.status === 'healthy') healthyInstances += 1;
    else unhealthyInstances += 1;
  }
  const openReportsCount = moderationReports.filter(
    /** @param {any} r */ (r) => r.status !== 'resolved' && r.status !== 'dismissed'
  ).length;
  const status = unhealthyInstances > 0 ? 'degraded' : 'ok';
  return {
    version: PUBLIC_BETA_VERSION,
    status,
    uptimeMs: Math.max(0, now - serverStartedAt),
    totalVisitors,
    healthyInstances,
    unhealthyInstances,
    openReportsCount,
    totalReportsCount: moderationReports.length,
    feedbackCount: betaFeedbackItems.length,
    recentErrorsCount: diagnosticErrors.length,
    reports: moderationReports
      .slice(-25)
      .reverse()
      .map(/** @param {any} r */ (r) => ({ ...r })),
    feedbackItems: betaFeedbackItems
      .slice(-25)
      .reverse()
      .map(/** @param {any} f */ (f) => ({
        ...f,
        diagnostics: { ...f.diagnostics }
      })),
    recentErrors: diagnosticErrors
      .slice(-25)
      .reverse()
      .map(/** @param {any} e */ (e) => ({ ...e })),
    maintenanceNotice: maintenanceNotice ? { ...maintenanceNotice } : null,
    serverTimestamp: now
  };
}

function buildOpsSnapshotMessageServer(now = Date.now()) {
  return {
    type: 'ops_snapshot',
    snapshot: getOpsHealthSnapshotServer(now)
  };
}

function broadcastOpsToAllServer(now = Date.now()) {
  const msg = buildOpsSnapshotMessageServer(now);
  for (const b of bindings) {
    if (b.sessionId && b.ws.readyState === WebSocket.OPEN) {
      sendJson(b.ws, msg);
    }
  }
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  if (req.method === 'GET' && pathname === '/api/health') {
    const health = getOpsHealthSnapshotServer(Date.now());
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(health));
    return;
  }
  handle(req, res);
});

const wss = new WebSocketServer({ noServer: true });
const bindings = new Set();

const nextUpgradeHandler = app.getUpgradeHandler();

httpServer.on('upgrade', (req, socket, head) => {
  const pathname = (req.url || '/').split('?')[0];
  if (pathname === '/ws/zoo') {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    nextUpgradeHandler(req, socket, head);
  }
});

/**
 * @param {any} ws
 * @param {any} msg
 */
function sendJson(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // Ignore
    }
  }
}

/**
 * @param {string} roomId
 * @param {any} msg
 * @param {string} [excludeSessionId]
 */
function broadcastToRoom(roomId, msg, excludeSessionId) {
  const payload = JSON.stringify(msg);
  for (const b of bindings) {
    if (
      b.roomId === roomId &&
      b.sessionId &&
      b.sessionId !== excludeSessionId &&
      b.ws.readyState === WebSocket.OPEN
    ) {
      try {
        b.ws.send(payload);
      } catch {
        // Ignore
      }
    }
  }
}

/**
 * @param {string[]} sessionIds
 * @param {any} msg
 */
function deliverToSessions(sessionIds, msg) {
  const payload = JSON.stringify(msg);
  const set = new Set(sessionIds);
  for (const b of bindings) {
    if (b.sessionId && set.has(b.sessionId) && b.ws.readyState === WebSocket.OPEN) {
      try {
        b.ws.send(payload);
      } catch {
        // Ignore
      }
    }
  }
}

function broadcastSocialPresenceToAll(now = Date.now()) {
  for (const b of bindings) {
    if (b.playerId && b.ws.readyState === WebSocket.OPEN) {
      sendJson(b.ws, buildSocialPresenceMessage(b.playerId, now));
    }
  }
}

wss.on('connection', (ws, req) => {
  let defaultRoom = 'panda-forest-1';
  try {
    const u = new URL(req.url || '/', `http://${hostname}:${port}`);
    const r = u.searchParams.get('room');
    if (r && /^[a-zA-Z0-9_-]{1,48}$/.test(r)) {
      defaultRoom = r;
    }
  } catch {
    // Fallback
  }

  const binding = { ws, sessionId: null, playerId: null, roomId: defaultRoom };
  bindings.add(binding);

  ws.on('message', (data) => {
    const raw = typeof data === 'string' ? data : data.toString('utf8');
    if (raw.length > 4096) return;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      sendJson(ws, {
        type: 'error_notice',
        code: 'INVALID_PAYLOAD',
        message: 'Invalid JSON payload'
      });
      return;
    }

    if (!parsed || typeof parsed.type !== 'string') return;
    const now = Date.now();

    if (binding.sessionId && parsed.type !== 'join_instance' && parsed.type !== 'leave_instance') {
      const ensured = ensureSessionActiveServer(binding, now);
      if (ensured && ensured.reactivated) {
        broadcastToRoom(
          ensured.room.roomId,
          {
            type: 'player_joined',
            roomId: ensured.room.roomId,
            player: serializePlayer(ensured.session),
            visitorCount: ensured.room.activeSessions.size,
            serverTimestamp: now
          },
          ensured.session.sessionId
        );
        broadcastSocialPresenceToAll(now);
      }
    }

    if (parsed.type === 'join_instance') {
      const requestedRoomId =
        typeof parsed.roomId === 'string' && /^[a-zA-Z0-9_-]{1,48}$/.test(parsed.roomId)
          ? parsed.roomId
          : binding.roomId;
      const resumeToken = typeof parsed.resumeToken === 'string' ? parsed.resumeToken : null;
      const incomingPlayerId =
        typeof parsed.playerId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(parsed.playerId)
          ? parsed.playerId
          : null;

      if (incomingPlayerId) {
        if (typeof parsed.allowFriendJoin === 'boolean') {
          playerAllowFriendJoin.set(incomingPlayerId, parsed.allowFriendJoin);
        } else if (!playerAllowFriendJoin.has(incomingPlayerId)) {
          playerAllowFriendJoin.set(incomingPlayerId, true);
        }
        if (Array.isArray(parsed.blockedPlayerIds)) {
          const bset = getOrCreateBlockSet(incomingPlayerId);
          for (const bid of parsed.blockedPlayerIds) {
            if (typeof bid === 'string' && bid !== incomingPlayerId) bset.add(bid);
          }
        }
        if (Array.isArray(parsed.friendPlayerIds)) {
          const fset = getOrCreateFriendSet(incomingPlayerId);
          for (const fid of parsed.friendPlayerIds) {
            if (
              typeof fid === 'string' &&
              fid !== incomingPlayerId &&
              !isPlayerBlockedServer(incomingPlayerId, fid)
            ) {
              fset.add(fid);
              getOrCreateFriendSet(fid).add(incomingPlayerId);
            }
          }
        }
      }

      let resumedRecord = null;
      let targetRoom = null;
      let placementReason = 'requested';
      let placementNotice = undefined;

      if (resumeToken) {
        for (const r of rooms.values()) {
          const entry = r.resumableSessions.get(resumeToken);
          if (entry && now <= entry.expiresAt) {
            r.resumableSessions.delete(resumeToken);
            if (r.status !== 'unhealthy' && r.activeSessions.size < r.maxPlayers) {
              targetRoom = r;
              placementReason = 'resumed';
            } else {
              const fallback = selectAvailableRoomWithReasonServer(r.roomId, {
                ...(incomingPlayerId ? { playerId: incomingPlayerId } : {}),
                ...(Array.isArray(parsed.friendPlayerIds)
                  ? { friendPlayerIds: parsed.friendPlayerIds }
                  : {}),
                preferFriendPlacement: parsed.preferFriendPlacement ?? true,
                ...(r.status === 'unhealthy' ? { excludeRoomId: r.roomId } : {})
              });
              targetRoom = fallback.room;
              placementReason =
                r.status === 'unhealthy' ? 'failover_recovery' : fallback.placementReason;
              placementNotice =
                r.status === 'unhealthy'
                  ? `${getInstanceLabelServer(r.roomId)} became unavailable. Automatically recovered your session in ${getInstanceLabelServer(fallback.room.roomId)}.`
                  : fallback.placementNotice;
            }
            resumedRecord = {
              ...entry.record,
              roomId: targetRoom.roomId,
              lastHeartbeatAt: now,
              lastMoveAt: now,
              activeEmote: null,
              seatedOn: null,
              transform: {
                ...entry.record.transform,
                velocity: [0, 0, 0],
                locomotionState: 'Idle',
                serverTimestamp: now,
                reconciled: false,
                discrepancyDistance: 0
              }
            };
            break;
          }
        }
      }

      if (!targetRoom) {
        const selected = selectAvailableRoomWithReasonServer(requestedRoomId, {
          ...(incomingPlayerId ? { playerId: incomingPlayerId } : {}),
          ...(Array.isArray(parsed.friendPlayerIds)
            ? { friendPlayerIds: parsed.friendPlayerIds }
            : {}),
          preferFriendPlacement: Boolean(parsed.preferFriendPlacement)
        });
        targetRoom = selected.room;
        placementReason = selected.placementReason;
        placementNotice = selected.placementNotice;
      }

      let record = resumedRecord;
      const wasResumed = Boolean(resumedRecord);

      if (!record) {
        globalSessionCounter += 1;
        const visitorNum = targetRoom.nextVisitorNumber++;
        const sessionId = `sess_${globalSessionCounter.toString(16).padStart(4, '0')}_${visitorNum}`;
        const playerId = incomingPlayerId || `pid_${sessionId}`;
        if (typeof parsed.allowFriendJoin === 'boolean') {
          playerAllowFriendJoin.set(playerId, parsed.allowFriendJoin);
        } else if (!playerAllowFriendJoin.has(playerId)) {
          playerAllowFriendJoin.set(playerId, true);
        }
        const newToken = `tok_${sessionId}_${Math.random().toString(36).slice(2, 10)}`;
        const spawnIndex = targetRoom.activeSessions.size;
        let spawnPosition = computeSpawnPosition(spawnIndex);

        if (placementReason === 'friend_priority') {
          const friendSet = getOrCreateFriendSet(playerId);
          for (const s of targetRoom.activeSessions.values()) {
            if (friendSet.has(s.playerId)) {
              const nearPos = resolveHorizontalWorldCollisions(
                [s.transform.position[0] + 1.4, 0.1, s.transform.position[2] + 1.2],
                0.45
              ).position;
              spawnPosition = [Number(nearPos[0].toFixed(3)), 0.1, Number(nearPos[2].toFixed(3))];
              break;
            }
          }
        }

        let baseDisplayName = `Explorer #${visitorNum}`;
        let hasCustomName = false;
        if (
          typeof parsed.displayName === 'string' &&
          !/^Explorer #\d+$/.test(parsed.displayName.trim())
        ) {
          const nv = validateDisplayNameServer(parsed.displayName);
          if (nv.valid) {
            baseDisplayName = nv.normalizedName;
            hasCustomName = true;
          }
        }
        const displayName = disambiguateDisplayNameServer(
          targetRoom,
          baseDisplayName,
          sessionId,
          playerId
        );
        const avatar = sanitizeAvatarAppearanceServer(parsed.avatar);
        const isNonDefaultAvatar =
          avatar.skinTone !== DEFAULT_AVATAR_APPEARANCE.skinTone ||
          avatar.hairstyle !== DEFAULT_AVATAR_APPEARANCE.hairstyle ||
          avatar.hairColor !== DEFAULT_AVATAR_APPEARANCE.hairColor ||
          avatar.outfit !== DEFAULT_AVATAR_APPEARANCE.outfit ||
          avatar.accessory !== DEFAULT_AVATAR_APPEARANCE.accessory;
        const accentColor =
          hasCustomName || isNonDefaultAvatar
            ? OUTFIT_ACCENT_COLORS[avatar.outfit] || deriveAccentColor(sessionId)
            : deriveAccentColor(sessionId);

        record = {
          sessionId,
          playerId,
          resumeToken: newToken,
          baseDisplayName,
          displayName,
          accentColor,
          avatar,
          roomId: targetRoom.roomId,
          spawnIndex,
          connectedAt: now,
          lastHeartbeatAt: now,
          lastMoveAt: now,
          activeEmote: null,
          seatedOn: null,
          transform: {
            position: [...spawnPosition],
            velocity: [0, 0, 0],
            facingYaw: Math.PI,
            locomotionState: 'Idle',
            sequence: 0,
            serverTimestamp: now,
            reconciled: false,
            discrepancyDistance: 0
          }
        };
      } else {
        if (
          typeof parsed.displayName === 'string' &&
          !/^Explorer #\d+$/.test(parsed.displayName.trim())
        ) {
          const nv = validateDisplayNameServer(parsed.displayName);
          if (nv.valid) {
            record.baseDisplayName = nv.normalizedName;
            record.displayName = disambiguateDisplayNameServer(
              targetRoom,
              nv.normalizedName,
              record.sessionId,
              record.playerId
            );
          }
        }
        if (parsed.avatar) {
          record.avatar = sanitizeAvatarAppearanceServer(parsed.avatar);
        }
      }

      if (Array.isArray(parsed.blockedPlayerIds)) {
        const bset = getOrCreateBlockSet(record.playerId);
        for (const bid of parsed.blockedPlayerIds) {
          if (typeof bid === 'string' && bid !== record.playerId) bset.add(bid);
        }
      }
      if (Array.isArray(parsed.friendPlayerIds)) {
        const fset = getOrCreateFriendSet(record.playerId);
        for (const fid of parsed.friendPlayerIds) {
          if (
            typeof fid === 'string' &&
            fid !== record.playerId &&
            !isPlayerBlockedServer(record.playerId, fid)
          ) {
            fset.add(fid);
            getOrCreateFriendSet(fid).add(record.playerId);
          }
        }
      }

      if (parsed.deduplicatePlayerId === true) {
        purgeDuplicatePlayerSessionsServer(record.playerId, record.sessionId, now);
      }

      const wallet = getOrInitPlayerWalletServer(record.playerId, parsed.diningWallet);
      record.currencyBalance = wallet.currencyBalance;
      record.foodInventory = { ...wallet.inventory };
      const passport = getOrInitPlayerPassportServer(
        record.playerId,
        parsed.passportState,
        new Date(now).toISOString()
      );

      targetRoom.activeSessions.set(record.sessionId, record);
      sessionToRoom.set(record.sessionId, targetRoom.roomId);
      knownPlayerNames.set(record.playerId, record.baseDisplayName);
      binding.sessionId = record.sessionId;
      binding.playerId = record.playerId;
      binding.roomId = targetRoom.roomId;

      const players = Array.from(targetRoom.activeSessions.values()).map(serializePlayer);
      sendJson(ws, {
        type: 'welcome_snapshot',
        roomId: targetRoom.roomId,
        sessionId: record.sessionId,
        playerId: record.playerId,
        resumeToken: record.resumeToken,
        displayName: record.displayName,
        accentColor: record.accentColor,
        avatar: { ...record.avatar },
        resumed: wasResumed,
        placementReason,
        ...(placementNotice ? { placementNotice } : {}),
        allowFriendJoin: getPlayerAllowFriendJoinServer(record.playerId),
        spawnPosition: [...record.transform.position],
        spawnYaw: record.transform.facingYaw,
        serverTimestamp: now,
        players,
        propStates: targetRoom.propStates,
        seatStates: targetRoom.seatStates,
        availableInstances: getAvailableInstancesServer(record.playerId),
        animals: targetRoom.animals,
        habitatFeedings: targetRoom.habitatFeedings,
        diningWallet: {
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory }
        },
        passportState: sanitizePassportStateServer(passport, new Date(now).toISOString()),
        zooEvents: buildRoomEventsSnapshotServer(targetRoom),
        maintenanceNotice: maintenanceNotice ? { ...maintenanceNotice } : null
      });

      broadcastToRoom(
        targetRoom.roomId,
        {
          type: 'player_joined',
          roomId: targetRoom.roomId,
          player: serializePlayer(record),
          visitorCount: targetRoom.activeSessions.size,
          serverTimestamp: now
        },
        record.sessionId
      );
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'update_identity') {
      if (!binding.sessionId) return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const validPid =
        typeof parsed.playerId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(parsed.playerId);
      const nameCheck = validateDisplayNameServer(parsed.displayName);
      const validAvatar = isValidAvatarAppearanceServer(parsed.avatar);

      if (!validPid || !nameCheck.valid || !validAvatar) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INVALID_IDENTITY_UPDATE',
          message: 'Rejected invalid display name or avatar customization payload.'
        });
        return;
      }

      const oldPlayerId = session.playerId;
      session.playerId = parsed.playerId;
      binding.playerId = parsed.playerId;
      if (oldPlayerId !== parsed.playerId) {
        const oldFriends = friendships.get(oldPlayerId);
        if (oldFriends && !friendships.has(parsed.playerId)) {
          friendships.set(parsed.playerId, new Set(oldFriends));
        }
        const oldBlocks = blockedPlayers.get(oldPlayerId);
        if (oldBlocks && !blockedPlayers.has(parsed.playerId)) {
          blockedPlayers.set(parsed.playerId, new Set(oldBlocks));
        }
      }
      session.baseDisplayName = nameCheck.normalizedName;
      session.displayName = disambiguateDisplayNameServer(
        room,
        nameCheck.normalizedName,
        session.sessionId,
        parsed.playerId
      );
      session.avatar = { ...parsed.avatar };
      session.accentColor =
        OUTFIT_ACCENT_COLORS[session.avatar.outfit] || session.accentColor;
      session.lastHeartbeatAt = now;
      knownPlayerNames.set(session.playerId, session.baseDisplayName);

      broadcastToRoom(room.roomId, {
        type: 'player_identity_updated',
        roomId: room.roomId,
        sessionId: session.sessionId,
        playerId: session.playerId,
        displayName: session.displayName,
        accentColor: session.accentColor,
        avatar: { ...session.avatar },
        serverTimestamp: now
      });
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'player_move') {
      if (!binding.sessionId) return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      if (
        typeof parsed.sequence !== 'number' ||
        parsed.sequence <= session.transform.sequence ||
        !Array.isArray(parsed.position) ||
        parsed.position.length !== 3 ||
        !parsed.position.every(Number.isFinite) ||
        !Array.isArray(parsed.velocity) ||
        parsed.velocity.length !== 3 ||
        !parsed.velocity.every(Number.isFinite) ||
        typeof parsed.facingYaw !== 'number' ||
        !Number.isFinite(parsed.facingYaw)
      ) {
        return;
      }

      const prevPos = session.transform.position;
      const dt = Math.min(1.0, Math.max(0.016, (now - session.lastMoveAt) / 1000));
      let tx = parsed.position[0];
      const ty = Math.min(4.5, Math.max(0.1, parsed.position[1]));
      let tz = parsed.position[2];
      let reconciled = false;

      const dx = tx - prevPos[0];
      const dz = tz - prevPos[2];
      const dist = Math.hypot(dx, dz);
      const maxDist = 7.5 * 1.25 * dt + 12.5;
      if (dist > maxDist && dist > 1e-5) {
        const s = maxDist / dist;
        tx = prevPos[0] + dx * s;
        tz = prevPos[2] + dz * s;
        reconciled = true;
      }

      const resolved = resolveHorizontalWorldCollisions([tx, ty, tz], 0.45);
      if (resolved.collided) {
        const diff = Math.hypot(
          resolved.position[0] - parsed.position[0],
          resolved.position[2] - parsed.position[2]
        );
        if (diff > 0.02) reconciled = true;
      }

      const fx = Number(resolved.position[0].toFixed(4));
      const fy = Number(ty.toFixed(4));
      const fz = Number(resolved.position[2].toFixed(4));
      const discrepancyDistance = Number(
        Math.hypot(fx - parsed.position[0], fz - parsed.position[2]).toFixed(4)
      );

      if (session.activeEmote && (parsed.locomotionState !== 'Idle' || dist > 0.08)) {
        session.activeEmote = null;
        broadcastToRoom(room.roomId, {
          type: 'player_emote_triggered',
          roomId: room.roomId,
          sessionId: session.sessionId,
          playerId: session.playerId,
          emote: null,
          serverTimestamp: now
        });
      }

      if (
        session.seatedOn &&
        (parsed.locomotionState !== 'Idle' ||
          Math.hypot(fx - session.seatedOn.seatPosition[0], fz - session.seatedOn.seatPosition[2]) >
            0.25)
      ) {
        const released = releasePlayerSeatServer(room, session, now);
        if (released) broadcastToRoom(room.roomId, released);
      }

      session.lastMoveAt = now;
      session.lastHeartbeatAt = now;
      session.transform = {
        position: [fx, fy, fz],
        velocity: [
          Math.max(-7.5, Math.min(7.5, parsed.velocity[0])),
          Math.max(-25, Math.min(10, parsed.velocity[1])),
          Math.max(-7.5, Math.min(7.5, parsed.velocity[2]))
        ],
        facingYaw: parsed.facingYaw,
        locomotionState: ['Idle', 'Walking', 'Running', 'Jumping'].includes(
          parsed.locomotionState
        )
          ? parsed.locomotionState
          : 'Idle',
        sequence: parsed.sequence,
        serverTimestamp: now,
        reconciled,
        discrepancyDistance
      };

      const nowIso = new Date(now).toISOString();
      const passport = getOrInitPlayerPassportServer(session.playerId, undefined, nowIso);
      let anyStamped = false;
      for (const z of SERVER_PASSPORT_ZONES) {
        if (passport.stamps[z.zoneId]?.obtained) continue;
        const zdx = fx - z.center[0];
        const zdz = fz - z.center[2];
        if (Math.hypot(zdx, zdz) <= z.radiusMeters) {
          passport.stamps[z.zoneId] = {
            zoneId: z.zoneId,
            obtained: true,
            stampedAt: nowIso
          };
          anyStamped = true;
        }
      }
      if (anyStamped) {
        const spSet = getOrInitDiscoveredSpeciesSetServer(session.playerId);
        evaluatePassportAchievementsServer(passport, spSet.size, nowIso);
      }
    } else if (parsed.type === 'send_chat_message') {
      if (!binding.sessionId) return;
      const room = rooms.get(binding.roomId);
      const sender = room?.activeSessions.get(binding.sessionId);
      if (!room || !sender) return;

      const check = validateChatMessageServer(parsed.text);
      if (!check.valid) {
        sendJson(ws, {
          type: 'error_notice',
          code: check.errorCode || 'INVALID_PAYLOAD',
          message: check.errorMessage || 'Invalid chat message.'
        });
        return;
      }

      if (!checkChatRateLimitServer(binding.sessionId, now)) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'CHAT_RATE_LIMITED',
          message: 'Rate limit reached. Please wait a moment before sending another message.'
        });
        return;
      }

      globalMessageCounter += 1;
      const message = {
        messageId: `msg_${globalMessageCounter}_${now}`,
        roomId: room.roomId,
        senderSessionId: sender.sessionId,
        senderPlayerId: sender.playerId,
        senderDisplayName: sender.displayName,
        senderAccentColor: sender.accentColor,
        text: check.normalizedText,
        position: [...sender.transform.position],
        createdAt: now,
        expiresAt: now + SPEECH_BUBBLE_DURATION_MS
      };

      room.recentChatHistory.push(message);
      if (room.recentChatHistory.length > 50) {
        room.recentChatHistory.splice(0, room.recentChatHistory.length - 50);
      }

      const nowIso = new Date(now).toISOString();
      const senderPassport = getOrInitPlayerPassportServer(sender.playerId, undefined, nowIso);
      senderPassport.socialInteractionsCount += 1;
      evaluatePassportAchievementsServer(
        senderPassport,
        getOrInitDiscoveredSpeciesSetServer(sender.playerId).size,
        nowIso
      );

      const recipientSessionIds = [];
      for (const target of room.activeSessions.values()) {
        if (isPlayerBlockedServer(target.playerId, sender.playerId)) continue;
        const dist = Math.hypot(
          target.transform.position[0] - sender.transform.position[0],
          target.transform.position[2] - sender.transform.position[2]
        );
        if (dist <= PROXIMITY_CHAT_RANGE_METERS) {
          recipientSessionIds.push(target.sessionId);
        }
      }

      deliverToSessions(recipientSessionIds, {
        type: 'proximity_chat_message',
        message
      });
    } else if (parsed.type === 'trigger_emote') {
      if (!binding.sessionId) return;
      const room = rooms.get(binding.roomId);
      const sender = room?.activeSessions.get(binding.sessionId);
      if (!room || !sender) return;

      let activeEmote = null;
      if (parsed.emoteId !== null) {
        const desc = EMOTE_DESCRIPTORS[parsed.emoteId];
        if (!desc) return;
        activeEmote = {
          emoteId: desc.id,
          label: desc.label,
          icon: desc.icon,
          startedAt: now,
          expiresAt: now + desc.durationMs
        };
        const nowIso = new Date(now).toISOString();
        const senderPassport = getOrInitPlayerPassportServer(sender.playerId, undefined, nowIso);
        senderPassport.socialInteractionsCount += 1;
        evaluatePassportAchievementsServer(
          senderPassport,
          getOrInitDiscoveredSpeciesSetServer(sender.playerId).size,
          nowIso
        );
      }
      sender.activeEmote = activeEmote;
      broadcastToRoom(room.roomId, {
        type: 'player_emote_triggered',
        roomId: room.roomId,
        sessionId: sender.sessionId,
        playerId: sender.playerId,
        emote: activeEmote,
        serverTimestamp: now
      });
    } else if (parsed.type === 'interact_seat') {
      if (!binding.sessionId || typeof parsed.objectId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      if (parsed.action === 'stand') {
        const released = releasePlayerSeatServer(room, session, now);
        if (released) broadcastToRoom(room.roomId, released);
        return;
      }

      const slots = room.seatStates[parsed.objectId];
      if (!slots || slots.length === 0) return;

      if (session.seatedOn?.objectId === parsed.objectId) {
        const released = releasePlayerSeatServer(room, session, now);
        if (released) broadcastToRoom(room.roomId, released);
        return;
      }

      const freeSlot = slots.find(/** @param {any} s */ (s) => s.occupiedBySessionId === null);
      if (!freeSlot) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'SEAT_OCCUPIED',
          message: 'All seats on this bench are currently occupied.'
        });
        return;
      }

      if (session.seatedOn) {
        const prevReleased = releasePlayerSeatServer(room, session, now);
        if (prevReleased && prevReleased.objectId !== parsed.objectId) {
          broadcastToRoom(room.roomId, prevReleased);
        }
      }

      freeSlot.occupiedBySessionId = session.sessionId;
      freeSlot.occupiedByPlayerId = session.playerId;
      freeSlot.occupiedByDisplayName = session.displayName;
      freeSlot.occupiedAt = now;

      session.seatedOn = {
        objectId: parsed.objectId,
        seatIndex: freeSlot.seatIndex,
        seatPosition: [...freeSlot.worldPosition],
        facingYaw: freeSlot.facingYaw
      };
      session.transform.position = [...freeSlot.worldPosition];
      session.transform.facingYaw = freeSlot.facingYaw;
      session.transform.velocity = [0, 0, 0];
      session.transform.locomotionState = 'Idle';

      const anyOccupied = slots.some(/** @param {any} s */ (s) => s.occupiedBySessionId !== null);
      if (room.propStates[parsed.objectId]) {
        room.propStates[parsed.objectId].active = anyOccupied;
        room.propStates[parsed.objectId].lastTriggeredAt = now;
      }

      const seatNowIso = new Date(now).toISOString();
      const seatPassport = getOrInitPlayerPassportServer(session.playerId, undefined, seatNowIso);
      seatPassport.socialInteractionsCount += 1;
      evaluatePassportAchievementsServer(
        seatPassport,
        getOrInitDiscoveredSpeciesSetServer(session.playerId).size,
        seatNowIso
      );

      broadcastToRoom(room.roomId, {
        type: 'seat_state_updated',
        roomId: room.roomId,
        objectId: parsed.objectId,
        seats: slots,
        propActive: anyOccupied,
        triggeredBySessionId: session.sessionId,
        serverTimestamp: now
      });
    } else if (parsed.type === 'interact_prop') {
      if (!binding.sessionId || typeof parsed.objectId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const prop = room?.propStates[parsed.objectId];
      if (!room || !prop) return;

      prop.active = !prop.active;
      prop.lastTriggeredAt = now;
      broadcastToRoom(room.roomId, {
        type: 'prop_state_updated',
        roomId: room.roomId,
        objectId: parsed.objectId,
        active: prop.active,
        triggeredBySessionId: binding.sessionId,
        lastTriggeredAt: now
      });
    } else if (parsed.type === 'send_friend_request') {
      if (!binding.sessionId || typeof parsed.targetPlayerId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const sender = room?.activeSessions.get(binding.sessionId);
      if (!room || !sender) return;

      let targetPlayerId = parsed.targetPlayerId.trim();
      let targetDisplayName = parsed.targetDisplayName || targetPlayerId;

      const activeTarget = findActiveSessionByPlayerIdServer(targetPlayerId);
      if (activeTarget) {
        targetDisplayName = activeTarget.baseDisplayName;
      } else {
        for (const r of rooms.values()) {
          for (const s of r.activeSessions.values()) {
            if (
              s.sessionId === targetPlayerId ||
              s.displayName.toLowerCase() === targetPlayerId.toLowerCase() ||
              s.baseDisplayName.toLowerCase() === targetPlayerId.toLowerCase()
            ) {
              targetPlayerId = s.playerId;
              targetDisplayName = s.baseDisplayName;
              break;
            }
          }
        }
      }

      if (targetPlayerId === sender.playerId) return;
      if (isPlayerBlockedServer(sender.playerId, targetPlayerId)) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'PLAYER_BLOCKED',
          message: 'Cannot send friend request due to block settings.'
        });
        return;
      }

      knownPlayerNames.set(sender.playerId, sender.baseDisplayName);
      knownPlayerNames.set(targetPlayerId, targetDisplayName);

      if (!getOrCreateFriendSet(sender.playerId).has(targetPlayerId)) {
        globalFriendReqCounter += 1;
        const requestId = `freq_${globalFriendReqCounter}_${now}`;
        pendingFriendRequests.set(requestId, {
          requestId,
          fromPlayerId: sender.playerId,
          fromDisplayName: sender.baseDisplayName,
          toPlayerId: targetPlayerId,
          toDisplayName: targetDisplayName,
          status: 'pending',
          createdAt: now
        });
      }
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'respond_friend_request') {
      if (!binding.sessionId || typeof parsed.requestId !== 'string') return;
      const req = pendingFriendRequests.get(parsed.requestId);
      if (!req) return;
      pendingFriendRequests.delete(parsed.requestId);
      if (
        parsed.decision === 'accept' &&
        !isPlayerBlockedServer(req.fromPlayerId, req.toPlayerId)
      ) {
        getOrCreateFriendSet(req.fromPlayerId).add(req.toPlayerId);
        getOrCreateFriendSet(req.toPlayerId).add(req.fromPlayerId);
      }
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'remove_friend') {
      if (!binding.sessionId || typeof parsed.targetPlayerId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;
      getOrCreateFriendSet(session.playerId).delete(parsed.targetPlayerId);
      getOrCreateFriendSet(parsed.targetPlayerId).delete(session.playerId);
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'join_friend_instance') {
      if (!binding.sessionId || typeof parsed.friendPlayerId !== 'string') return;
      const currentRoom = rooms.get(binding.roomId);
      const session = currentRoom?.activeSessions.get(binding.sessionId);
      if (!currentRoom || !session) return;

      const friendSession = findActiveSessionByPlayerIdServer(parsed.friendPlayerId);
      if (!friendSession) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'FRIEND_REQUEST_INVALID',
          message: 'Friend is not currently online.'
        });
        return;
      }

      const targetRoom = rooms.get(friendSession.roomId);
      if (!targetRoom) return;
      if (targetRoom.roomId === currentRoom.roomId) {
        broadcastSocialPresenceToAll(now);
        return;
      }
      if (targetRoom.status === 'unhealthy') {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INSTANCE_UNAVAILABLE',
          message: "Friend's zoo instance is currently unavailable."
        });
        return;
      }
      if (!getPlayerAllowFriendJoinServer(parsed.friendPlayerId)) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'FRIEND_JOIN_DISABLED',
          message: `${friendSession.baseDisplayName} has disabled direct friend instance joining.`
        });
        return;
      }
      if (targetRoom.activeSessions.size >= targetRoom.maxPlayers) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'ROOM_FULL',
          message: "Friend's zoo instance is currently full."
        });
        return;
      }

      const releasedSeat = releasePlayerSeatServer(currentRoom, session, now);
      if (releasedSeat) broadcastToRoom(currentRoom.roomId, releasedSeat);
      const evUpdate = removeEventParticipantSessionServer(
        currentRoom,
        session.sessionId,
        session.playerId,
        now
      );
      if (evUpdate) broadcastToRoom(currentRoom.roomId, evUpdate);
      currentRoom.activeSessions.delete(session.sessionId);
      broadcastToRoom(
        currentRoom.roomId,
        {
          type: 'player_left',
          roomId: currentRoom.roomId,
          sessionId: session.sessionId,
          reason: 'switched_room',
          visitorCount: currentRoom.activeSessions.size,
          serverTimestamp: now
        },
        session.sessionId
      );

      const friendPos = friendSession.transform.position;
      const nearPos = resolveHorizontalWorldCollisions(
        [friendPos[0] + 1.4, 0.1, friendPos[2] + 1.2],
        0.45
      ).position;

      session.roomId = targetRoom.roomId;
      session.displayName = disambiguateDisplayNameServer(
        targetRoom,
        session.baseDisplayName,
        session.sessionId,
        session.playerId
      );
      session.activeEmote = null;
      session.seatedOn = null;
      session.transform.position = [
        Number(nearPos[0].toFixed(3)),
        0.1,
        Number(nearPos[2].toFixed(3))
      ];
      session.transform.velocity = [0, 0, 0];
      session.transform.locomotionState = 'Idle';

      targetRoom.activeSessions.set(session.sessionId, session);
      sessionToRoom.set(session.sessionId, targetRoom.roomId);
      binding.roomId = targetRoom.roomId;
      pruneEmptyOverflowRoomsServer();

      const wallet = getOrInitPlayerWalletServer(session.playerId);
      const passport = getOrInitPlayerPassportServer(
        session.playerId,
        undefined,
        new Date(now).toISOString()
      );
      const players = Array.from(targetRoom.activeSessions.values()).map(serializePlayer);
      sendJson(ws, {
        type: 'welcome_snapshot',
        roomId: targetRoom.roomId,
        sessionId: session.sessionId,
        playerId: session.playerId,
        resumeToken: session.resumeToken,
        displayName: session.displayName,
        accentColor: session.accentColor,
        avatar: { ...session.avatar },
        resumed: false,
        placementReason: 'friend_join',
        placementNotice: `Joined ${friendSession.baseDisplayName} in ${getInstanceLabelServer(targetRoom.roomId)}!`,
        allowFriendJoin: getPlayerAllowFriendJoinServer(session.playerId),
        spawnPosition: [...session.transform.position],
        spawnYaw: session.transform.facingYaw,
        serverTimestamp: now,
        players,
        propStates: targetRoom.propStates,
        seatStates: targetRoom.seatStates,
        availableInstances: getAvailableInstancesServer(session.playerId),
        animals: targetRoom.animals,
        habitatFeedings: targetRoom.habitatFeedings,
        diningWallet: {
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory }
        },
        passportState: sanitizePassportStateServer(passport, new Date(now).toISOString()),
        zooEvents: buildRoomEventsSnapshotServer(targetRoom),
        maintenanceNotice: maintenanceNotice ? { ...maintenanceNotice } : null
      });

      broadcastToRoom(
        targetRoom.roomId,
        {
          type: 'player_joined',
          roomId: targetRoom.roomId,
          player: serializePlayer(session),
          visitorCount: targetRoom.activeSessions.size,
          serverTimestamp: now
        },
        session.sessionId
      );
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'switch_instance') {
      if (!binding.sessionId || typeof parsed.targetRoomId !== 'string') return;
      const requestedRoomId = parsed.targetRoomId.trim();
      if (!/^[a-zA-Z0-9_-]{3,48}$/.test(requestedRoomId)) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INVALID_PAYLOAD',
          message: 'Invalid instance identifier.'
        });
        return;
      }

      const currentRoom = rooms.get(binding.roomId);
      const session = currentRoom?.activeSessions.get(binding.sessionId);
      if (!currentRoom || !session) return;

      if (requestedRoomId === currentRoom.roomId) {
        broadcastSocialPresenceToAll(now);
        return;
      }

      const existingTarget = rooms.get(requestedRoomId);
      if (existingTarget && existingTarget.status === 'unhealthy') {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INSTANCE_UNAVAILABLE',
          message: `Instance ${requestedRoomId} is currently unavailable.`
        });
        return;
      }

      const targetRoom = getOrCreateRoom(requestedRoomId);
      if (targetRoom.activeSessions.size >= targetRoom.maxPlayers) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'ROOM_FULL',
          message: `Instance ${requestedRoomId} is currently full (${targetRoom.activeSessions.size}/${targetRoom.maxPlayers}).`
        });
        return;
      }

      const releasedSeat = releasePlayerSeatServer(currentRoom, session, now);
      if (releasedSeat) broadcastToRoom(currentRoom.roomId, releasedSeat);
      const evUpdate = removeEventParticipantSessionServer(
        currentRoom,
        session.sessionId,
        session.playerId,
        now
      );
      if (evUpdate) broadcastToRoom(currentRoom.roomId, evUpdate);
      currentRoom.activeSessions.delete(session.sessionId);
      broadcastToRoom(
        currentRoom.roomId,
        {
          type: 'player_left',
          roomId: currentRoom.roomId,
          sessionId: session.sessionId,
          reason: 'switched_room',
          visitorCount: currentRoom.activeSessions.size,
          serverTimestamp: now
        },
        session.sessionId
      );

      const spawnIndex = targetRoom.activeSessions.size;
      const spawnPos = computeSpawnPosition(spawnIndex);

      session.roomId = targetRoom.roomId;
      session.spawnIndex = spawnIndex;
      session.displayName = disambiguateDisplayNameServer(
        targetRoom,
        session.baseDisplayName,
        session.sessionId,
        session.playerId
      );
      session.activeEmote = null;
      session.seatedOn = null;
      session.lastHeartbeatAt = now;
      session.lastMoveAt = now;
      session.transform.position = [...spawnPos];
      session.transform.velocity = [0, 0, 0];
      session.transform.facingYaw = Math.PI;
      session.transform.locomotionState = 'Idle';

      targetRoom.activeSessions.set(session.sessionId, session);
      sessionToRoom.set(session.sessionId, targetRoom.roomId);
      binding.roomId = targetRoom.roomId;
      pruneEmptyOverflowRoomsServer();

      const wallet = getOrInitPlayerWalletServer(session.playerId);
      const passport = getOrInitPlayerPassportServer(
        session.playerId,
        undefined,
        new Date(now).toISOString()
      );
      const players = Array.from(targetRoom.activeSessions.values()).map(serializePlayer);
      sendJson(ws, {
        type: 'welcome_snapshot',
        roomId: targetRoom.roomId,
        sessionId: session.sessionId,
        playerId: session.playerId,
        resumeToken: session.resumeToken,
        displayName: session.displayName,
        accentColor: session.accentColor,
        avatar: { ...session.avatar },
        resumed: false,
        placementReason: 'manual_switch',
        placementNotice: `Switched to ${getInstanceLabelServer(targetRoom.roomId)}.`,
        allowFriendJoin: getPlayerAllowFriendJoinServer(session.playerId),
        spawnPosition: [...session.transform.position],
        spawnYaw: session.transform.facingYaw,
        serverTimestamp: now,
        players,
        propStates: targetRoom.propStates,
        seatStates: targetRoom.seatStates,
        availableInstances: getAvailableInstancesServer(session.playerId),
        animals: targetRoom.animals,
        habitatFeedings: targetRoom.habitatFeedings,
        diningWallet: {
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory }
        },
        passportState: sanitizePassportStateServer(passport, new Date(now).toISOString()),
        zooEvents: buildRoomEventsSnapshotServer(targetRoom),
        maintenanceNotice: maintenanceNotice ? { ...maintenanceNotice } : null
      });

      broadcastToRoom(
        targetRoom.roomId,
        {
          type: 'player_joined',
          roomId: targetRoom.roomId,
          player: serializePlayer(session),
          visitorCount: targetRoom.activeSessions.size,
          serverTimestamp: now
        },
        session.sessionId
      );
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'set_player_block') {
      if (!binding.sessionId || typeof parsed.targetPlayerId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const bset = getOrCreateBlockSet(session.playerId);
      if (parsed.blocked) {
        bset.add(parsed.targetPlayerId);
        getOrCreateFriendSet(session.playerId).delete(parsed.targetPlayerId);
        getOrCreateFriendSet(parsed.targetPlayerId).delete(session.playerId);
        for (const [reqId, req] of pendingFriendRequests.entries()) {
          if (
            (req.fromPlayerId === session.playerId && req.toPlayerId === parsed.targetPlayerId) ||
            (req.fromPlayerId === parsed.targetPlayerId && req.toPlayerId === session.playerId)
          ) {
            pendingFriendRequests.delete(reqId);
          }
        }
      } else {
        bset.delete(parsed.targetPlayerId);
      }
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'set_social_privacy') {
      if (!binding.sessionId || typeof parsed.allowFriendJoin !== 'boolean') return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;
      playerAllowFriendJoin.set(session.playerId, parsed.allowFriendJoin);
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'configure_instance') {
      if (!binding.sessionId || typeof parsed.roomId !== 'string') return;
      const targetRoomId = parsed.roomId.trim();
      if (!/^[a-zA-Z0-9_-]{3,48}$/.test(targetRoomId)) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INVALID_PAYLOAD',
          message: 'Invalid instance identifier.'
        });
        return;
      }
      if (
        parsed.maxPlayers !== undefined &&
        (!Number.isFinite(Number(parsed.maxPlayers)) ||
          Number(parsed.maxPlayers) < 1 ||
          Number(parsed.maxPlayers) > 64)
      ) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INVALID_PAYLOAD',
          message: 'maxPlayers must be an integer between 1 and 64.'
        });
        return;
      }
      if (
        parsed.status !== undefined &&
        parsed.status !== 'healthy' &&
        parsed.status !== 'unhealthy'
      ) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INVALID_PAYLOAD',
          message: 'status must be healthy or unhealthy.'
        });
        return;
      }

      const targetRoom = getOrCreateRoom(targetRoomId);
      if (parsed.maxPlayers !== undefined) {
        targetRoom.maxPlayers = Math.max(1, Math.min(64, Math.floor(Number(parsed.maxPlayers))));
      }
      if (parsed.status !== undefined) {
        targetRoom.status = parsed.status;
      }

      if (targetRoom.status === 'unhealthy') {
        targetRoom.resumableSessions.clear();
        const sessionsToEvacuate = Array.from(targetRoom.activeSessions.values());
        for (const s of sessionsToEvacuate) {
          releasePlayerSeatServer(targetRoom, s, now);
          removeEventParticipantSessionServer(targetRoom, s.sessionId, s.playerId, now);
          targetRoom.activeSessions.delete(s.sessionId);

          const fallback = selectAvailableRoomWithReasonServer('panda-forest-1', {
            playerId: s.playerId,
            preferFriendPlacement: true,
            excludeRoomId: targetRoom.roomId
          });
          const destRoom = fallback.room;
          const spawnIndex = destRoom.activeSessions.size;
          const spawnPos = computeSpawnPosition(spawnIndex);

          s.roomId = destRoom.roomId;
          s.spawnIndex = spawnIndex;
          s.displayName = disambiguateDisplayNameServer(
            destRoom,
            s.baseDisplayName,
            s.sessionId,
            s.playerId
          );
          s.activeEmote = null;
          s.seatedOn = null;
          s.lastHeartbeatAt = now;
          s.lastMoveAt = now;
          s.transform.position = [...spawnPos];
          s.transform.velocity = [0, 0, 0];
          s.transform.facingYaw = Math.PI;
          s.transform.locomotionState = 'Idle';

          destRoom.activeSessions.set(s.sessionId, s);
          sessionToRoom.set(s.sessionId, destRoom.roomId);

          const wallet = getOrInitPlayerWalletServer(s.playerId);
          const passport = getOrInitPlayerPassportServer(
            s.playerId,
            undefined,
            new Date(now).toISOString()
          );
          const welcome = {
            type: 'welcome_snapshot',
            roomId: destRoom.roomId,
            sessionId: s.sessionId,
            playerId: s.playerId,
            resumeToken: s.resumeToken,
            displayName: s.displayName,
            accentColor: s.accentColor,
            avatar: { ...s.avatar },
            resumed: false,
            placementReason: 'failover_recovery',
            placementNotice: `${getInstanceLabelServer(targetRoom.roomId)} became unavailable. Automatically recovered your session in ${getInstanceLabelServer(destRoom.roomId)}.`,
            allowFriendJoin: getPlayerAllowFriendJoinServer(s.playerId),
            spawnPosition: [...s.transform.position],
            spawnYaw: s.transform.facingYaw,
            serverTimestamp: now,
            players: Array.from(destRoom.activeSessions.values()).map(serializePlayer),
            propStates: destRoom.propStates,
            seatStates: destRoom.seatStates,
            availableInstances: getAvailableInstancesServer(s.playerId),
            animals: destRoom.animals,
            habitatFeedings: destRoom.habitatFeedings,
            diningWallet: {
              currencyBalance: wallet.currencyBalance,
              inventory: { ...wallet.inventory }
            },
            passportState: sanitizePassportStateServer(passport, new Date(now).toISOString()),
            zooEvents: buildRoomEventsSnapshotServer(destRoom),
            maintenanceNotice: maintenanceNotice ? { ...maintenanceNotice } : null
          };

          for (const b of bindings) {
            if (b.sessionId === s.sessionId) {
              b.roomId = destRoom.roomId;
              sendJson(b.ws, welcome);
            }
          }

          broadcastToRoom(
            targetRoom.roomId,
            {
              type: 'player_left',
              roomId: targetRoom.roomId,
              sessionId: s.sessionId,
              reason: 'switched_room',
              visitorCount: targetRoom.activeSessions.size,
              serverTimestamp: now
            },
            s.sessionId
          );
          broadcastToRoom(
            destRoom.roomId,
            {
              type: 'player_joined',
              roomId: destRoom.roomId,
              player: serializePlayer(s),
              visitorCount: destRoom.activeSessions.size,
              serverTimestamp: now
            },
            s.sessionId
          );
        }
      }

      pruneEmptyOverflowRoomsServer();
      const notice =
        targetRoom.status === 'unhealthy'
          ? `${getInstanceLabelServer(targetRoom.roomId)} marked unavailable.`
          : `Updated ${getInstanceLabelServer(targetRoom.roomId)} (Capacity: ${targetRoom.maxPlayers}, Status: ${targetRoom.status}).`;

      for (const b of bindings) {
        if (b.sessionId && b.ws.readyState === WebSocket.OPEN) {
          sendJson(b.ws, {
            type: 'instance_directory_update',
            availableInstances: getAvailableInstancesServer(b.playerId || undefined),
            notice,
            serverTimestamp: now
          });
        }
      }
      broadcastSocialPresenceToAll(now);
    } else if (parsed.type === 'submit_player_report') {
      if (!binding.sessionId || typeof parsed.reportedPlayerId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const reporter = room?.activeSessions.get(binding.sessionId);
      if (!room || !reporter) return;

      const reason = VALID_REPORT_REASONS.has(parsed.reason)
        ? parsed.reason
        : 'other';
      globalReportCounter += 1;
      const report = {
        reportId: `rep_${globalReportCounter}_${now}`,
        reporterPlayerId: reporter.playerId,
        reporterSessionId: reporter.sessionId,
        reportedPlayerId: parsed.reportedPlayerId,
        reportedSessionId: parsed.reportedSessionId || null,
        reportedDisplayName: String(parsed.reportedDisplayName || 'Visitor').slice(0, 32),
        roomId: room.roomId,
        reason,
        details: String(parsed.details || '').trim().slice(0, 200),
        recentChatSnapshot: room.recentChatHistory.slice(-10).map(/** @param {any} m */ (m) => ({
          messageId: m.messageId,
          senderPlayerId: m.senderPlayerId,
          senderDisplayName: m.senderDisplayName,
          text: m.text,
          createdAt: m.createdAt
        })),
        createdAt: new Date(now).toISOString(),
        status: 'open',
        resolvedAt: null
      };
      moderationReports.push(report);
      sendJson(ws, {
        type: 'report_submitted_ack',
        report
      });
      broadcastOpsToAllServer(now);
    } else if (parsed.type === 'submit_beta_feedback') {
      if (!binding.sessionId) return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const recentTs = (feedbackTimestampsBySession.get(session.sessionId) || []).filter(
        /** @param {number} ts */ (ts) => now - ts < 60000
      );
      if (recentTs.length >= 5) {
        feedbackTimestampsBySession.set(session.sessionId, recentTs);
        recordDiagnosticErrorServer(
          'client',
          'FEEDBACK_RATE_LIMITED',
          'Beta feedback rate limit exceeded.',
          { playerId: session.playerId, roomId: room.roomId },
          now
        );
        sendJson(ws, {
          type: 'error_notice',
          code: 'FEEDBACK_RATE_LIMITED',
          message: 'Please wait a moment before submitting additional beta feedback.'
        });
        return;
      }

      const cleanMsg = String(parsed.message || '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const validCat = VALID_BETA_FEEDBACK_CATEGORIES.has(parsed.category);
      const validSev = VALID_BETA_FEEDBACK_SEVERITIES.has(parsed.severity);
      if (cleanMsg.length < 5 || cleanMsg.length > 500 || !validCat || !validSev) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INVALID_PAYLOAD',
          message: 'Beta feedback message must be between 5 and 500 characters.'
        });
        return;
      }

      recentTs.push(now);
      feedbackTimestampsBySession.set(session.sessionId, recentTs);
      globalFeedbackCounter += 1;
      const diag = parsed.diagnostics && typeof parsed.diagnostics === 'object' ? parsed.diagnostics : {};
      const feedback = {
        feedbackId: `fb_${globalFeedbackCounter}_${now}`,
        playerId: session.playerId,
        displayName: session.displayName,
        roomId: room.roomId,
        category: parsed.category,
        severity: parsed.severity,
        message: cleanMsg,
        createdAt: now,
        diagnostics: {
          playerId: session.playerId,
          roomId: room.roomId,
          fps: Number.isFinite(Number(diag.fps)) ? Math.round(Number(diag.fps)) : 60,
          avgFrameTimeMs: Number.isFinite(Number(diag.avgFrameTimeMs))
            ? Number(Number(diag.avgFrameTimeMs).toFixed(1))
            : 16.7,
          qualityPreset: ['auto', 'low', 'medium', 'high'].includes(diag.qualityPreset)
            ? diag.qualityPreset
            : 'auto',
          viewport: String(diag.viewport || '1280x720').slice(0, 32),
          inputMode: diag.inputMode === 'touch' ? 'touch' : 'desktop',
          visitorCount: room.activeSessions.size,
          userAgentSummary: String(diag.userAgentSummary || 'Browser Client').slice(0, 80)
        }
      };
      betaFeedbackItems.push(feedback);
      if (betaFeedbackItems.length > 50) {
        betaFeedbackItems.splice(0, betaFeedbackItems.length - 50);
      }
      sendJson(ws, {
        type: 'beta_feedback_ack',
        feedback,
        confirmationMessage:
          'Thank you! Your beta feedback and diagnostic snapshot have been recorded.'
      });
      broadcastOpsToAllServer(now);
    } else if (parsed.type === 'resolve_player_report') {
      if (!binding.sessionId || typeof parsed.reportId !== 'string') return;
      const resolution = parsed.resolution || parsed.status;
      if (resolution !== 'resolved' && resolution !== 'dismissed') return;
      const rep = moderationReports.find(
        /** @param {any} r */ (r) => r.reportId === parsed.reportId.trim()
      );
      if (!rep) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INVALID_PAYLOAD',
          message: 'Report ID not found.'
        });
        return;
      }
      rep.status = resolution;
      rep.resolvedAt = new Date(now).toISOString();
      broadcastOpsToAllServer(now);
    } else if (parsed.type === 'set_maintenance_notice') {
      if (!binding.sessionId || typeof parsed.active !== 'boolean') return;
      const cleanMessage = String(parsed.message || '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 240);
      if (parsed.active && cleanMessage.length < 3) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'INVALID_PAYLOAD',
          message: 'Maintenance message must be at least 3 characters when active.'
        });
        return;
      }
      maintenanceNotice = parsed.active
        ? {
            active: true,
            severity: parsed.severity === 'warning' ? 'warning' : 'info',
            message: cleanMessage,
            updatedAt: now
          }
        : null;
      broadcastOpsToAllServer(now);
    } else if (parsed.type === 'request_ops_snapshot') {
      if (!binding.sessionId) return;
      sendJson(ws, buildOpsSnapshotMessageServer(now));
    } else if (parsed.type === 'trigger_animal_feeding') {
      if (!binding.sessionId || typeof parsed.habitatId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;
      const feedRes = triggerRoomHabitatFeedingServer(
        room,
        parsed.habitatId,
        now,
        binding.sessionId,
        'player'
      );
      if (feedRes.accepted) {
        const feedNowIso = new Date(now).toISOString();
        const feedPassport = getOrInitPlayerPassportServer(session.playerId, undefined, feedNowIso);
        feedPassport.activitiesCompletedCount += 1;
        evaluatePassportAchievementsServer(
          feedPassport,
          getOrInitDiscoveredSpeciesSetServer(session.playerId).size,
          feedNowIso
        );
        broadcastToRoom(room.roomId, {
          type: 'animal_feeding_event',
          roomId: room.roomId,
          habitatId: parsed.habitatId,
          feedingState: feedRes.feedingState,
          animals: feedRes.animals,
          serverTimestamp: now
        });
      } else {
        sendJson(ws, {
          type: 'error_notice',
          code: 'ANIMAL_FEEDING_COOLDOWN',
          message:
            feedRes.reason === 'already_active'
              ? 'A feeding session is already underway at this habitat!'
              : 'The animals at this habitat were just fed and are resting. Please wait for the cooldown.'
        });
      }
    } else if (parsed.type === 'purchase_food_item') {
      if (
        !binding.sessionId ||
        typeof parsed.itemId !== 'string' ||
        typeof parsed.requestId !== 'string' ||
        !parsed.requestId.trim()
      ) {
        return;
      }
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const wallet = getOrInitPlayerWalletServer(session.playerId);
      const reqId = parsed.requestId.trim();
      const cacheKey = `${session.playerId}:${reqId}`;
      const existing = processedPurchaseRequests.get(cacheKey);
      if (existing) {
        sendJson(ws, { ...existing, inventory: { ...existing.inventory } });
        return;
      }

      const item = SERVER_FOOD_CATALOG[parsed.itemId];
      if (!item) {
        sendJson(ws, {
          type: 'food_purchase_result',
          requestId: reqId,
          success: false,
          itemId: parsed.itemId,
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory },
          errorCode: 'INVALID_ITEM',
          message: 'Selected food or drink is not on the stall menu.',
          serverTimestamp: now
        });
        return;
      }

      if (wallet.currencyBalance < item.price) {
        sendJson(ws, {
          type: 'food_purchase_result',
          requestId: reqId,
          success: false,
          itemId: item.id,
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory },
          errorCode: 'INSUFFICIENT_FUNDS',
          message: `Not enough Zoo Coins for ${item.name} (costs ${item.price}, you have ${wallet.currencyBalance}).`,
          serverTimestamp: now
        });
        return;
      }

      const curQty = wallet.inventory[item.id] ?? 0;
      if (curQty >= MAX_FOOD_QUANTITY) {
        sendJson(ws, {
          type: 'food_purchase_result',
          requestId: reqId,
          success: false,
          itemId: item.id,
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory },
          errorCode: 'INVENTORY_FULL',
          message: `Your bag is full of ${item.name}!`,
          serverTimestamp: now
        });
        return;
      }

      wallet.currencyBalance -= item.price;
      wallet.inventory[item.id] = curQty + 1;
      session.currencyBalance = wallet.currencyBalance;
      session.foodInventory = { ...wallet.inventory };

      const successRes = {
        type: 'food_purchase_result',
        requestId: reqId,
        success: true,
        itemId: item.id,
        currencyBalance: wallet.currencyBalance,
        inventory: { ...wallet.inventory },
        message: `Purchased ${item.name} (-${item.price} Zoo Coins)!`,
        serverTimestamp: now
      };
      processedPurchaseRequests.set(cacheKey, {
        ...successRes,
        inventory: { ...successRes.inventory }
      });
      sendJson(ws, successRes);
    } else if (parsed.type === 'consume_food_item') {
      if (!binding.sessionId || typeof parsed.itemId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const wallet = getOrInitPlayerWalletServer(session.playerId);
      const item = SERVER_FOOD_CATALOG[parsed.itemId];
      if (!item) {
        sendJson(ws, {
          type: 'food_consume_result',
          success: false,
          itemId: parsed.itemId,
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory },
          errorCode: 'INVALID_ITEM',
          message: 'Invalid food or drink item.',
          serverTimestamp: now
        });
        return;
      }

      const curQty = wallet.inventory[item.id] ?? 0;
      if (curQty <= 0) {
        sendJson(ws, {
          type: 'food_consume_result',
          success: false,
          itemId: item.id,
          currencyBalance: wallet.currencyBalance,
          inventory: { ...wallet.inventory },
          errorCode: 'ITEM_NOT_OWNED',
          message: `You do not own any ${item.name} in your bag.`,
          serverTimestamp: now
        });
        return;
      }

      wallet.inventory[item.id] = curQty - 1;
      session.currencyBalance = wallet.currencyBalance;
      session.foodInventory = { ...wallet.inventory };

      const consumption = {
        itemId: item.id,
        label: item.name,
        category: item.category,
        icon: item.icon,
        startedAt: now,
        expiresAt: now + item.durationMs
      };
      session.activeConsumption = consumption;

      const consNowIso = new Date(now).toISOString();
      const consPassport = getOrInitPlayerPassportServer(session.playerId, undefined, consNowIso);
      consPassport.activitiesCompletedCount += 1;
      evaluatePassportAchievementsServer(
        consPassport,
        getOrInitDiscoveredSpeciesSetServer(session.playerId).size,
        consNowIso
      );

      sendJson(ws, {
        type: 'food_consume_result',
        success: true,
        itemId: item.id,
        currencyBalance: wallet.currencyBalance,
        inventory: { ...wallet.inventory },
        consumption: { ...consumption },
        message: `${item.gerundLabel} ${item.name}!`,
        serverTimestamp: now
      });

      broadcastToRoom(room.roomId, {
        type: 'player_consumption_updated',
        roomId: room.roomId,
        sessionId: session.sessionId,
        playerId: session.playerId,
        consumption: { ...consumption },
        serverTimestamp: now
      });
    } else if (parsed.type === 'stop_consuming_food') {
      if (!binding.sessionId) return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;
      session.activeConsumption = null;
      broadcastToRoom(room.roomId, {
        type: 'player_consumption_updated',
        roomId: room.roomId,
        sessionId: session.sessionId,
        playerId: session.playerId,
        consumption: null,
        serverTimestamp: now
      });
    } else if (parsed.type === 'record_passport_progress') {
      if (!binding.sessionId) return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const nowIso = new Date(now).toISOString();
      const spSet = getOrInitDiscoveredSpeciesSetServer(session.playerId);
      if (
        typeof parsed.speciesId === 'string' &&
        ['panda', 'penguin', 'otter'].includes(parsed.speciesId)
      ) {
        spSet.add(parsed.speciesId);
      }

      const passport = getOrInitPlayerPassportServer(session.playerId, undefined, nowIso);
      if (typeof parsed.zoneId === 'string' && VALID_PASSPORT_ZONE_IDS.includes(parsed.zoneId)) {
        const curStamp = passport.stamps[parsed.zoneId];
        if (!curStamp || !curStamp.obtained) {
          passport.stamps[parsed.zoneId] = {
            zoneId: parsed.zoneId,
            obtained: true,
            stampedAt: nowIso
          };
        }
      }
      if (parsed.socialAction === true) {
        passport.socialInteractionsCount += 1;
      }
      if (parsed.activityCompleted === true) {
        passport.activitiesCompletedCount += 1;
      }
      evaluatePassportAchievementsServer(passport, spSet.size, nowIso);
    } else if (parsed.type === 'claim_achievement_reward') {
      if (
        !binding.sessionId ||
        typeof parsed.achievementId !== 'string' ||
        typeof parsed.requestId !== 'string' ||
        !parsed.requestId.trim()
      ) {
        return;
      }
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const nowIso = new Date(now).toISOString();
      const wallet = getOrInitPlayerWalletServer(session.playerId);
      const spSet = getOrInitDiscoveredSpeciesSetServer(session.playerId);
      const passport = evaluatePassportAchievementsServer(
        getOrInitPlayerPassportServer(session.playerId, undefined, nowIso),
        spSet.size,
        nowIso
      );

      const reqId = parsed.requestId.trim();
      const cacheKey = `${session.playerId}:${reqId}`;
      const existing = processedRewardClaims.get(cacheKey);
      if (existing) {
        sendJson(ws, {
          ...existing,
          passportState: sanitizePassportStateServer(existing.passportState, nowIso)
        });
        return;
      }

      const desc = SERVER_ACHIEVEMENTS_BY_ID[parsed.achievementId];
      const rec = passport.achievements[parsed.achievementId];
      if (!desc || !rec) {
        sendJson(ws, {
          type: 'achievement_reward_result',
          requestId: reqId,
          success: false,
          achievementId: parsed.achievementId,
          rewardCoinsGranted: 0,
          currencyBalance: wallet.currencyBalance,
          passportState: sanitizePassportStateServer(passport, nowIso),
          errorCode: 'INVALID_ACHIEVEMENT',
          message: 'Selected achievement does not exist.',
          serverTimestamp: now
        });
        return;
      }

      if (!rec.unlocked) {
        sendJson(ws, {
          type: 'achievement_reward_result',
          requestId: reqId,
          success: false,
          achievementId: desc.achievementId,
          rewardCoinsGranted: 0,
          currencyBalance: wallet.currencyBalance,
          passportState: sanitizePassportStateServer(passport, nowIso),
          errorCode: 'ACHIEVEMENT_LOCKED',
          message: `${desc.title} has not been unlocked yet.`,
          serverTimestamp: now
        });
        return;
      }

      if (rec.claimed) {
        sendJson(ws, {
          type: 'achievement_reward_result',
          requestId: reqId,
          success: false,
          achievementId: desc.achievementId,
          rewardCoinsGranted: 0,
          currencyBalance: wallet.currencyBalance,
          passportState: sanitizePassportStateServer(passport, nowIso),
          errorCode: 'ALREADY_CLAIMED',
          message: `Reward for ${desc.title} has already been claimed.`,
          serverTimestamp: now
        });
        return;
      }

      rec.claimed = true;
      rec.claimedAt = nowIso;
      if (!passport.earnedBadges.includes(desc.rewardBadge)) {
        passport.earnedBadges.push(desc.rewardBadge);
      }
      if (!passport.activeBadge) {
        passport.activeBadge = desc.rewardBadge;
      }
      passport.updatedAt = nowIso;

      wallet.currencyBalance += desc.rewardCoins;
      session.currencyBalance = wallet.currencyBalance;

      const successRes = {
        type: 'achievement_reward_result',
        requestId: reqId,
        success: true,
        achievementId: desc.achievementId,
        rewardCoinsGranted: desc.rewardCoins,
        rewardBadgeGranted: desc.rewardBadge,
        currencyBalance: wallet.currencyBalance,
        passportState: sanitizePassportStateServer(passport, nowIso),
        message: `Claimed +${desc.rewardCoins} Zoo Coins & "${desc.rewardBadge}" Badge!`,
        serverTimestamp: now
      };
      processedRewardClaims.set(cacheKey, {
        ...successRes,
        passportState: sanitizePassportStateServer(passport, nowIso)
      });
      sendJson(ws, successRes);
    } else if (parsed.type === 'join_zoo_event') {
      if (!binding.sessionId || typeof parsed.eventId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const ev = room.events?.[parsed.eventId];
      const desc = SERVER_EVENTS_CATALOG[parsed.eventId];
      if (!ev || !desc) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'EVENT_NOT_ACTIVE',
          message: 'Unknown zoo event.'
        });
        return;
      }

      if (ev.status !== 'active') {
        sendJson(ws, {
          type: 'error_notice',
          code: 'EVENT_NOT_ACTIVE',
          message: `"${desc.title}" is currently ${ev.status} and cannot be joined right now.`
        });
        return;
      }

      const alreadyIn =
        ev.participantSessionIds.includes(session.sessionId) ||
        ev.participantPlayerIds.includes(session.playerId);
      if (!alreadyIn) {
        if (ev.participantPlayerIds.length >= ev.maxParticipants) {
          sendJson(ws, {
            type: 'error_notice',
            code: 'EVENT_FULL',
            message: `"${desc.title}" is currently full (${ev.maxParticipants}/${ev.maxParticipants} participants).`
          });
          return;
        }
        ev.participantSessionIds.push(session.sessionId);
        ev.participantPlayerIds.push(session.playerId);
      }

      const snap = buildRoomEventsSnapshotServer(room);
      broadcastToRoom(room.roomId, {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: snap.seasonalTheme,
        events: snap.events,
        notice: `Joined "${desc.title}" (${ev.participantPlayerIds.length}/${ev.maxParticipants} participants)!`,
        serverTimestamp: now
      });
    } else if (parsed.type === 'leave_zoo_event') {
      if (!binding.sessionId || typeof parsed.eventId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const ev = room.events?.[parsed.eventId];
      const desc = SERVER_EVENTS_CATALOG[parsed.eventId];
      if (!ev || !desc) return;

      ev.participantSessionIds = ev.participantSessionIds.filter(
        /** @param {string} id */ (id) => id !== session.sessionId
      );
      ev.participantPlayerIds = ev.participantPlayerIds.filter(
        /** @param {string} id */ (id) => id !== session.playerId
      );

      const snap = buildRoomEventsSnapshotServer(room);
      broadcastToRoom(room.roomId, {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: snap.seasonalTheme,
        events: snap.events,
        notice: `Left "${desc.title}". You can rejoin anytime while it remains active.`,
        serverTimestamp: now
      });
    } else if (parsed.type === 'perform_event_action') {
      if (!binding.sessionId || typeof parsed.eventId !== 'string') return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const ev = room.events?.[parsed.eventId];
      const desc = SERVER_EVENTS_CATALOG[parsed.eventId];
      if (!ev || !desc || ev.status !== 'active') {
        sendJson(ws, {
          type: 'error_notice',
          code: 'EVENT_NOT_ACTIVE',
          message: 'Activity is not currently active.'
        });
        return;
      }

      const isParticipating =
        ev.participantSessionIds.includes(session.sessionId) ||
        ev.participantPlayerIds.includes(session.playerId);
      if (!isParticipating) {
        sendJson(ws, {
          type: 'error_notice',
          code: 'NOT_PARTICIPATING',
          message: `Join "${desc.title}" first before performing the activity action.`
        });
        return;
      }

      if (!ev.contributedPlayerIds.includes(session.playerId)) {
        ev.contributedPlayerIds.push(session.playerId);
      }
      ev.sharedProgressCount = Math.min(24, ev.sharedProgressCount + 1);

      const snap = buildRoomEventsSnapshotServer(room);
      broadcastToRoom(room.roomId, {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: snap.seasonalTheme,
        events: snap.events,
        notice: `✨ Contributed to "${desc.title}" (${ev.sharedProgressCount}/${ev.targetProgress})! Claim your reward!`,
        serverTimestamp: now
      });
    } else if (parsed.type === 'claim_event_reward') {
      if (
        !binding.sessionId ||
        typeof parsed.eventId !== 'string' ||
        typeof parsed.requestId !== 'string' ||
        !parsed.requestId.trim()
      ) {
        return;
      }
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const nowIso = new Date(now).toISOString();
      const wallet = getOrInitPlayerWalletServer(session.playerId);
      const spSet = getOrInitDiscoveredSpeciesSetServer(session.playerId);
      const passport = getOrInitPlayerPassportServer(session.playerId, undefined, nowIso);
      const reqId = parsed.requestId.trim();
      const cacheKey = `${session.playerId}:${reqId}`;
      const existing = processedEventRewardClaims.get(cacheKey);
      if (existing) {
        sendJson(ws, {
          ...existing,
          passportState: sanitizePassportStateServer(existing.passportState, nowIso)
        });
        return;
      }

      const ev = room.events?.[parsed.eventId];
      const desc = SERVER_EVENTS_CATALOG[parsed.eventId];
      if (!ev || !desc) {
        sendJson(ws, {
          type: 'event_reward_result',
          requestId: reqId,
          success: false,
          eventId: parsed.eventId,
          eventInstanceId: `evinst_${parsed.eventId}_1`,
          rewardCoinsGranted: 0,
          currencyBalance: wallet.currencyBalance,
          passportState: sanitizePassportStateServer(passport, nowIso),
          errorCode: 'INVALID_EVENT',
          message: 'Unknown zoo event.',
          serverTimestamp: now
        });
        return;
      }

      if (ev.claimedPlayerIds.includes(session.playerId)) {
        sendJson(ws, {
          type: 'event_reward_result',
          requestId: reqId,
          success: false,
          eventId: desc.eventId,
          eventInstanceId: ev.eventInstanceId,
          rewardCoinsGranted: 0,
          currencyBalance: wallet.currencyBalance,
          passportState: sanitizePassportStateServer(passport, nowIso),
          errorCode: 'ALREADY_CLAIMED',
          message: `You have already claimed the reward for this "${desc.title}" session.`,
          serverTimestamp: now
        });
        return;
      }

      if (!ev.contributedPlayerIds.includes(session.playerId)) {
        sendJson(ws, {
          type: 'event_reward_result',
          requestId: reqId,
          success: false,
          eventId: desc.eventId,
          eventInstanceId: ev.eventInstanceId,
          rewardCoinsGranted: 0,
          currencyBalance: wallet.currencyBalance,
          passportState: sanitizePassportStateServer(passport, nowIso),
          errorCode: 'REWARD_NOT_ELIGIBLE',
          message: `Participate in "${desc.title}" before claiming the activity reward.`,
          serverTimestamp: now
        });
        return;
      }

      ev.claimedPlayerIds.push(session.playerId);
      wallet.currencyBalance += ev.rewardCoins;
      session.currencyBalance = wallet.currencyBalance;

      if (!passport.stamps[desc.zoneId]?.obtained) {
        passport.stamps[desc.zoneId] = {
          zoneId: desc.zoneId,
          obtained: true,
          stampedAt: nowIso
        };
      }
      passport.activitiesCompletedCount += 1;
      evaluatePassportAchievementsServer(passport, spSet.size, nowIso);

      const successRes = {
        type: 'event_reward_result',
        requestId: reqId,
        success: true,
        eventId: desc.eventId,
        eventInstanceId: ev.eventInstanceId,
        rewardCoinsGranted: ev.rewardCoins,
        stampedZoneId: desc.zoneId,
        currencyBalance: wallet.currencyBalance,
        passportState: sanitizePassportStateServer(passport, nowIso),
        message: `Claimed +${ev.rewardCoins} Zoo Coins & ${desc.zoneName} Stamp for "${desc.title}"!`,
        serverTimestamp: now
      };
      processedEventRewardClaims.set(cacheKey, {
        ...successRes,
        passportState: sanitizePassportStateServer(passport, nowIso)
      });
      sendJson(ws, successRes);

      const snap = buildRoomEventsSnapshotServer(room);
      broadcastToRoom(room.roomId, {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: snap.seasonalTheme,
        events: snap.events,
        serverTimestamp: now
      });
    } else if (parsed.type === 'configure_zoo_events') {
      if (!binding.sessionId) return;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(binding.sessionId);
      if (!room || !session) return;

      const notices = [];
      const explicitlyPatched = new Set();

      if (parsed.seasonalTheme !== undefined) {
        if (!VALID_SEASONAL_THEMES.has(parsed.seasonalTheme)) {
          sendJson(ws, {
            type: 'error_notice',
            code: 'INVALID_EVENT_CONFIG',
            message: 'Invalid seasonal theme.'
          });
          return;
        }
      }

      if (parsed.eventPatches !== undefined) {
        if (!Array.isArray(parsed.eventPatches)) {
          sendJson(ws, {
            type: 'error_notice',
            code: 'INVALID_EVENT_CONFIG',
            message: 'eventPatches must be an array.'
          });
          return;
        }
        for (const p of parsed.eventPatches) {
          if (!p || typeof p !== 'object' || !SERVER_EVENTS_CATALOG[p.eventId]) {
            sendJson(ws, {
              type: 'error_notice',
              code: 'INVALID_EVENT_CONFIG',
              message: 'Invalid event patch.'
            });
            return;
          }
          if (p.status !== undefined && !VALID_EVENT_STATUSES.has(p.status)) {
            sendJson(ws, {
              type: 'error_notice',
              code: 'INVALID_EVENT_CONFIG',
              message: 'Invalid event status.'
            });
            return;
          }
          if (
            p.maxParticipants !== undefined &&
            (!Number.isFinite(Number(p.maxParticipants)) || Number(p.maxParticipants) < 1)
          ) {
            sendJson(ws, {
              type: 'error_notice',
              code: 'INVALID_EVENT_CONFIG',
              message: 'Invalid maxParticipants.'
            });
            return;
          }
          if (
            p.startTimeMs !== undefined &&
            p.endTimeMs !== undefined &&
            Number(p.endTimeMs) <= Number(p.startTimeMs)
          ) {
            sendJson(ws, {
              type: 'error_notice',
              code: 'INVALID_EVENT_CONFIG',
              message: 'endTimeMs must be greater than startTimeMs.'
            });
            return;
          }
        }

        for (const p of parsed.eventPatches) {
          const ev = room.events[p.eventId];
          const desc = SERVER_EVENTS_CATALOG[p.eventId];
          if (!ev || !desc) continue;
          explicitlyPatched.add(p.eventId);
          const prevStatus = ev.status;
          if (p.startTimeMs !== undefined) ev.startTimeMs = Math.floor(Number(p.startTimeMs));
          if (p.endTimeMs !== undefined) ev.endTimeMs = Math.floor(Number(p.endTimeMs));
          if (p.maxParticipants !== undefined)
            ev.maxParticipants = Math.floor(Number(p.maxParticipants));
          if (p.status !== undefined) ev.status = p.status;

          if (p.resetInstance === true || (prevStatus === 'finished' && ev.status === 'active')) {
            ev.instanceSeq = (ev.instanceSeq || 1) + 1;
            ev.eventInstanceId = `evinst_${ev.eventId}_${ev.instanceSeq}`;
            ev.participantSessionIds = [];
            ev.participantPlayerIds = [];
            ev.contributedPlayerIds = [];
            ev.claimedPlayerIds = [];
            ev.sharedProgressCount = 0;
          } else if (ev.status !== 'active') {
            ev.participantSessionIds = [];
            ev.participantPlayerIds = [];
          }

          if (prevStatus !== 'active' && ev.status === 'active') {
            notices.push(`🎉 ${desc.icon} "${desc.title}" is now active at ${desc.locationLabel}!`);
          } else if (prevStatus === 'active' && ev.status === 'finished') {
            notices.push(`🏁 "${desc.title}" has concluded.`);
          } else {
            notices.push(`Updated schedule for "${desc.title}".`);
          }
        }
      }

      if (parsed.seasonalTheme !== undefined && parsed.seasonalTheme !== room.seasonalTheme) {
        room.seasonalTheme = parsed.seasonalTheme;
        if (!explicitlyPatched.has('event-lantern-trivia-game')) {
          const seasonalEv = room.events['event-lantern-trivia-game'];
          if (seasonalEv) {
            if (room.seasonalTheme === 'none') {
              seasonalEv.status = 'finished';
              seasonalEv.participantSessionIds = [];
              seasonalEv.participantPlayerIds = [];
            } else if (seasonalEv.status !== 'active') {
              seasonalEv.instanceSeq = (seasonalEv.instanceSeq || 1) + 1;
              seasonalEv.eventInstanceId = `evinst_event-lantern-trivia-game_${seasonalEv.instanceSeq}`;
              seasonalEv.status = 'active';
              seasonalEv.participantSessionIds = [];
              seasonalEv.participantPlayerIds = [];
              seasonalEv.contributedPlayerIds = [];
              seasonalEv.claimedPlayerIds = [];
              seasonalEv.sharedProgressCount = 0;
            }
          }
        }
        notices.unshift(
          room.seasonalTheme === 'none'
            ? '🌿 Seasonal festival decorations deactivated (Standard Sanctuary Season).'
            : `🌸 Seasonal Theme updated to ${room.seasonalTheme}!`
        );
      }

      const snap = buildRoomEventsSnapshotServer(room);
      broadcastToRoom(room.roomId, {
        type: 'zoo_events_snapshot',
        roomId: room.roomId,
        seasonalTheme: snap.seasonalTheme,
        events: snap.events,
        notice: notices.join(' ') || 'Updated sanctuary event schedule.',
        serverTimestamp: now
      });
    } else if (parsed.type === 'ping') {
      if (binding.sessionId) {
        const room = rooms.get(binding.roomId);
        const session = room?.activeSessions.get(binding.sessionId);
        if (session) session.lastHeartbeatAt = now;
      }
      sendJson(ws, {
        type: 'pong',
        clientTimestamp: Number(parsed.clientTimestamp) || now,
        serverTimestamp: now
      });
    } else if (parsed.type === 'leave_instance') {
      if (!binding.sessionId) return;
      const sid = binding.sessionId;
      binding.sessionId = null;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(sid);
      if (room && session) {
        const releasedSeat = releasePlayerSeatServer(room, session, now);
        if (releasedSeat) broadcastToRoom(room.roomId, releasedSeat);
        const evUpdate = removeEventParticipantSessionServer(
          room,
          session.sessionId,
          session.playerId,
          now
        );
        if (evUpdate) broadcastToRoom(room.roomId, evUpdate);
        room.activeSessions.delete(sid);
        sessionToRoom.delete(sid);
        room.resumableSessions.delete(session.resumeToken);
        pruneEmptyOverflowRoomsServer();
        broadcastToRoom(
          room.roomId,
          {
            type: 'player_left',
            roomId: room.roomId,
            sessionId: sid,
            reason: 'left',
            visitorCount: room.activeSessions.size,
            serverTimestamp: now
          },
          sid
        );
        broadcastSocialPresenceToAll(now);
      }
    }
  });

  ws.on('close', () => {
    bindings.delete(binding);
    if (binding.sessionId) {
      const sid = binding.sessionId;
      binding.sessionId = null;
      const room = rooms.get(binding.roomId);
      const session = room?.activeSessions.get(sid);
      if (room && session) {
        const now = Date.now();
        const releasedSeat = releasePlayerSeatServer(room, session, now);
        if (releasedSeat) broadcastToRoom(room.roomId, releasedSeat);
        const evUpdate = removeEventParticipantSessionServer(
          room,
          session.sessionId,
          session.playerId,
          now
        );
        if (evUpdate) broadcastToRoom(room.roomId, evUpdate);
        room.activeSessions.delete(sid);
        sessionToRoom.delete(sid);
        room.resumableSessions.set(session.resumeToken, {
          record: session,
          disconnectedAt: now,
          expiresAt: now + 30000
        });
        broadcastToRoom(
          room.roomId,
          {
            type: 'player_left',
            roomId: room.roomId,
            sessionId: sid,
            reason: 'disconnected',
            visitorCount: room.activeSessions.size,
            serverTimestamp: now
          },
          sid
        );
        broadcastSocialPresenceToAll(now);
      }
    }
  });
});

// 20 Hz server tick & stale session cleanup (< 10s timeout)
setInterval(() => {
  const now = Date.now();
  let anyPruned = false;
  for (const room of rooms.values()) {
    for (const [tok, entry] of room.resumableSessions.entries()) {
      if (now > entry.expiresAt) room.resumableSessions.delete(tok);
    }

    for (const session of Array.from(room.activeSessions.values())) {
      if (session.activeEmote && session.activeEmote.expiresAt <= now) {
        session.activeEmote = null;
      }
      if (session.activeConsumption && session.activeConsumption.expiresAt <= now) {
        session.activeConsumption = null;
      }
      if (now - session.lastHeartbeatAt > 8000) {
        anyPruned = true;
        const releasedSeat = releasePlayerSeatServer(room, session, now);
        if (releasedSeat) broadcastToRoom(room.roomId, releasedSeat);
        const evUpdate = removeEventParticipantSessionServer(
          room,
          session.sessionId,
          session.playerId,
          now
        );
        if (evUpdate) broadcastToRoom(room.roomId, evUpdate);
        room.activeSessions.delete(session.sessionId);
        sessionToRoom.delete(session.sessionId);
        room.resumableSessions.set(session.resumeToken, {
          record: session,
          disconnectedAt: now,
          expiresAt: now + 30000
        });
        broadcastToRoom(
          room.roomId,
          {
            type: 'player_left',
            roomId: room.roomId,
            sessionId: session.sessionId,
            reason: 'timeout',
            visitorCount: room.activeSessions.size,
            serverTimestamp: now
          },
          session.sessionId
        );
      }
    }

    if (room.activeSessions.size > 0) {
      room.tickSequence += 1;
      stepRoomAnimalsServer(room, 0.05, now);
      const players = Array.from(room.activeSessions.values()).map(serializePlayer);
      broadcastToRoom(room.roomId, {
        type: 'room_state_tick',
        roomId: room.roomId,
        tickSequence: room.tickSequence,
        serverTimestamp: now,
        visitorCount: room.activeSessions.size,
        players,
        animals: room.animals,
        habitatFeedings: room.habitatFeedings
      });
    }
  }
  if (anyPruned) {
    broadcastSocialPresenceToAll(now);
  }
}, 50);

httpServer.listen(port, () => {
  console.log(`> Online Zoo + Multiplayer WebSocket Hub ready on http://${hostname}:${port}`);
});
