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
  { id: 'collider-prop-pond-chair', position: [-0.8, 0, 1.5], radius: 0.45 }
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
    seatedOn: record.seatedOn ? { ...record.seatedOn } : null
  };
}

const rooms = new Map();
const sessionToRoom = new Map();
const knownPlayerNames = new Map();
const friendships = new Map();
const pendingFriendRequests = new Map();
const blockedPlayers = new Map();
const chatRateHistory = new Map();
/** @type {any[]} */
const moderationReports = [];

let globalSessionCounter = 0;
let globalMessageCounter = 0;
let globalFriendReqCounter = 0;
let globalReportCounter = 0;

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
    nextVisitorNumber: 101,
    activeSessions: new Map(),
    resumableSessions: new Map(),
    propStates: {
      'prop-stone-lantern': { active: true, lastTriggeredAt: 0 },
      'prop-wind-chime': { active: false, lastTriggeredAt: 0 },
      'prop-scenic-bench': { active: false, lastTriggeredAt: 0 },
      'prop-plaza-bench': { active: false, lastTriggeredAt: 0 },
      'prop-pond-chair': { active: false, lastTriggeredAt: 0 }
    },
    seatStates: createInitialSeatStatesServer(),
    animals: createInitialAnimalStatesServer(now),
    habitatFeedings: createInitialHabitatFeedingsServer(),
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

function getAvailableInstancesServer() {
  const labelMap = new Map();
  for (const preset of DEFAULT_PUBLIC_INSTANCES) {
    labelMap.set(preset.roomId, preset.label);
  }
  const roomIds = new Set(DEFAULT_PUBLIC_INSTANCES.map((p) => p.roomId));
  for (const rid of rooms.keys()) {
    roomIds.add(rid);
  }
  const summaries = [];
  for (const rid of roomIds) {
    const r = rooms.get(rid);
    const visitorCount = r ? r.activeSessions.size : 0;
    const maxPlayers = r ? r.maxPlayers : 16;
    summaries.push({
      roomId: rid,
      label: labelMap.get(rid) || `Custom Instance (${rid})`,
      visitorCount,
      maxPlayers,
      isFull: visitorCount >= maxPlayers
    });
  }
  return summaries;
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

function selectAvailableRoom(requestedRoomId = 'panda-forest-1') {
  const primary = getOrCreateRoom(requestedRoomId);
  if (primary.activeSessions.size < primary.maxPlayers) return primary;
  const prefix = requestedRoomId.replace(/-\d+$/, '');
  for (let i = 2; i < 100; i++) {
    const r = getOrCreateRoom(`${prefix}-${i}`);
    if (r.activeSessions.size < r.maxPlayers) return r;
  }
  return primary;
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
    const displayName = activeSession?.baseDisplayName || knownPlayerNames.get(fid) || fid;
    friends.push({
      playerId: fid,
      displayName,
      online: Boolean(activeSession),
      roomId: activeSession ? activeSession.roomId : null,
      roomVisitorCount,
      roomMaxPlayers,
      canJoin: Boolean(activeSession && roomVisitorCount < roomMaxPlayers)
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
    availableInstances: getAvailableInstancesServer(),
    serverTimestamp: now
  };
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => {
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

      let resumedRecord = null;
      let targetRoom = null;

      if (resumeToken) {
        for (const r of rooms.values()) {
          const entry = r.resumableSessions.get(resumeToken);
          if (entry && now <= entry.expiresAt && r.activeSessions.size < r.maxPlayers) {
            r.resumableSessions.delete(resumeToken);
            resumedRecord = {
              ...entry.record,
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
            targetRoom = r;
            break;
          }
        }
      }

      if (!targetRoom) {
        targetRoom = selectAvailableRoom(requestedRoomId);
      }

      let record = resumedRecord;
      const wasResumed = Boolean(resumedRecord);

      if (!record) {
        globalSessionCounter += 1;
        const visitorNum = targetRoom.nextVisitorNumber++;
        const sessionId = `sess_${globalSessionCounter.toString(16).padStart(4, '0')}_${visitorNum}`;
        const playerId =
          typeof parsed.playerId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(parsed.playerId)
            ? parsed.playerId
            : `pid_${sessionId}`;
        const newToken = `tok_${sessionId}_${Math.random().toString(36).slice(2, 10)}`;
        const spawnIndex = targetRoom.activeSessions.size;
        const spawnPosition = computeSpawnPosition(spawnIndex);

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
        spawnPosition: [...record.transform.position],
        spawnYaw: record.transform.facingYaw,
        serverTimestamp: now,
        players,
        propStates: targetRoom.propStates,
        seatStates: targetRoom.seatStates,
        availableInstances: getAvailableInstancesServer(),
        animals: targetRoom.animals,
        habitatFeedings: targetRoom.habitatFeedings
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
        spawnPosition: [...session.transform.position],
        spawnYaw: session.transform.facingYaw,
        serverTimestamp: now,
        players,
        propStates: targetRoom.propStates,
        seatStates: targetRoom.seatStates,
        availableInstances: getAvailableInstancesServer(),
        animals: targetRoom.animals,
        habitatFeedings: targetRoom.habitatFeedings
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
        spawnPosition: [...session.transform.position],
        spawnYaw: session.transform.facingYaw,
        serverTimestamp: now,
        players,
        propStates: targetRoom.propStates,
        seatStates: targetRoom.seatStates,
        availableInstances: getAvailableInstancesServer(),
        animals: targetRoom.animals,
        habitatFeedings: targetRoom.habitatFeedings
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
        createdAt: new Date(now).toISOString()
      };
      moderationReports.push(report);
      sendJson(ws, {
        type: 'report_submitted_ack',
        report
      });
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
        room.activeSessions.delete(sid);
        sessionToRoom.delete(sid);
        room.resumableSessions.delete(session.resumeToken);
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
      if (now - session.lastHeartbeatAt > 8000) {
        anyPruned = true;
        const releasedSeat = releasePlayerSeatServer(room, session, now);
        if (releasedSeat) broadcastToRoom(room.roomId, releasedSeat);
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
