import type {
  InteractiveObjectDescriptor,
  SolidObstacleCollider,
  WorldSceneId,
  WorldZoneId
} from '../types';
import {
  PANDA_FOREST_LAYOUT,
  type PandaForestLayoutConfig
} from './pandaForestLayout';

export const DEFAULT_ENTRY_ZONE_ID: WorldZoneId = 'zoo-lobby';
export const DEFAULT_ENTRY_ROOM_ID = 'zoo-lobby-1';
export const PANDA_FOREST_PRIMARY_ROOM_ID = 'panda-forest-1';

export interface ZoneGateLink {
  gateId: string;
  targetZoneId: WorldZoneId;
  targetZoneDisplayName: string;
  targetRoomId: string;
  pairedGateId: string;
  promptText: string;
  position: [number, number, number];
  triggerRadius: number;
  arrivalPosition: [number, number, number];
  arrivalYaw: number;
}

export interface WorldZoneDescriptor {
  zoneId: WorldZoneId;
  displayName: string;
  description?: string;
  badgeIcon: string;
  roomId: string;
  sceneId: WorldSceneId;
  spawnPoint: [number, number, number];
  spawnYaw: number;
  hasAnimals: boolean;
  gateLinks: ZoneGateLink[];
  layout: PandaForestLayoutConfig;
}

export const ZOO_LOBBY_INTERACTIVE_OBJECTS: InteractiveObjectDescriptor[] = [
  {
    id: 'gate-to-panda-forest',
    title: 'Panda Forest Sanctuary Gate',
    promptAction: 'Enter Panda Forest?',
    archetype: 'world_prop',
    position: [0, 0, 8.5],
    interactionRadius: 3.2,
    propReactionType: 'enter_zone_gate',
    targetZoneId: 'panda-forest',
    gateId: 'gate-to-panda-forest'
  },
  {
    id: 'plaque-lobby-zone-directory',
    title: 'Online Zoo Zone Directory',
    promptAction: 'Read Zone Directory',
    archetype: 'info_plaque',
    position: [-3.8, 0, 5.5],
    interactionRadius: 3.0,
    infoCard: {
      heading: 'Online Zoo — World Zone Directory',
      body: 'Welcome to the Online Zoo Entrance Plaza! Meet friends at the central compass fountain, check the live zone signage, and step through the zone gates to explore the habitats.',
      facts: [
        'Zoo Lobby (Current Zone): Ticket Booths, Central Meeting Point & Visitor Plaza',
        'Panda Forest (North Gate): Misty Bamboo Sanctuary with Giant Pandas, Penguins & River Otters',
        'Wayfinding Tip: Walk up to any zone gate and press E to travel between zones.'
      ]
    }
  },
  {
    id: 'plaque-lobby-meeting-point',
    title: 'Central Compass Meeting Point',
    promptAction: 'Read Meeting Point Sign',
    archetype: 'info_plaque',
    position: [3.8, 0, 5.5],
    interactionRadius: 3.0,
    infoCard: {
      heading: 'Visitor Meeting Point & Ticket Plaza',
      body: 'Every visitor arrives here in the Zoo Lobby. Gather with friends by the compass fountain or plaza benches before heading through the North Gate into Panda Forest.',
      facts: [
        'Ticket Booths: Complimentary Public Beta admission for all explorers.',
        'Plaza Benches: Sit and chat with nearby visitors in the lobby.',
        'Friends List: See which zone your friends are exploring in real time.'
      ]
    }
  },
  {
    id: 'prop-lobby-bench-west',
    title: 'Lobby West Plaza Bench',
    promptAction: 'Sit on Lobby Bench',
    archetype: 'world_prop',
    position: [-5.2, 0, 0.0],
    interactionRadius: 3.2,
    propReactionType: 'rest_bench',
    seats: [
      {
        seatIndex: 0,
        label: 'North Seat',
        worldPosition: [-4.45, 0.1, -0.55],
        facingYaw: Math.PI / 2
      },
      {
        seatIndex: 1,
        label: 'South Seat',
        worldPosition: [-4.45, 0.1, 0.55],
        facingYaw: Math.PI / 2
      }
    ]
  },
  {
    id: 'prop-lobby-bench-east',
    title: 'Lobby East Plaza Bench',
    promptAction: 'Sit on Lobby Bench',
    archetype: 'world_prop',
    position: [5.2, 0, 0.0],
    interactionRadius: 3.2,
    propReactionType: 'rest_bench',
    seats: [
      {
        seatIndex: 0,
        label: 'North Seat',
        worldPosition: [4.45, 0.1, -0.55],
        facingYaw: -Math.PI / 2
      },
      {
        seatIndex: 1,
        label: 'South Seat',
        worldPosition: [4.45, 0.1, 0.55],
        facingYaw: -Math.PI / 2
      }
    ]
  },
  {
    id: 'prop-stone-lantern',
    title: 'Lobby Welcome Lantern',
    promptAction: 'Toggle Lantern Light',
    archetype: 'world_prop',
    position: [3.2, 0, -9.5],
    interactionRadius: 2.8,
    propReactionType: 'toggle_lantern'
  }
];

export const ZOO_LOBBY_OBSTACLES: SolidObstacleCollider[] = [
  // Ticket Booths flanking the South Arrival Plaza
  { id: 'lobby-ticket-booth-west', kind: 'pillar', position: [-6.5, 0, 12.0], radius: 1.35, height: 3.4 },
  { id: 'lobby-ticket-booth-east', kind: 'pillar', position: [6.5, 0, 12.0], radius: 1.35, height: 3.4 },

  // Signage & Meeting Point Pillars
  { id: 'collider-lobby-zone-directory', kind: 'pillar', position: [-3.8, 0, 5.5], radius: 0.55, height: 2.4 },
  { id: 'collider-lobby-meeting-point', kind: 'pillar', position: [3.8, 0, 5.5], radius: 0.55, height: 2.4 },

  // Benches & Welcome Lantern
  { id: 'collider-lobby-bench-west', kind: 'pillar', position: [-5.2, 0, 0.0], radius: 0.5, height: 1.4 },
  { id: 'collider-lobby-bench-east', kind: 'pillar', position: [5.2, 0, 0.0], radius: 0.5, height: 1.4 },
  { id: 'collider-lobby-lantern', kind: 'pillar', position: [3.2, 0, -9.5], radius: 0.5, height: 2.2 },

  // North Gate Archway Pillars (Gate to Panda Forest at Z = 8.5)
  { id: 'lobby-north-gate-west', kind: 'pillar', position: [-2.2, 0, 8.5], radius: 0.45, height: 4.4 },
  { id: 'lobby-north-gate-east', kind: 'pillar', position: [2.2, 0, 8.5], radius: 0.45, height: 4.4 },

  // Ornamental Plaza Trees
  { id: 'lobby-tree-sw', kind: 'tree', position: [-11.5, 0, 9.0], radius: 1.0, height: 5.5, scale: 1.1 },
  { id: 'lobby-tree-se', kind: 'tree', position: [11.5, 0, 9.0], radius: 1.0, height: 5.5, scale: 1.1 },
  { id: 'lobby-tree-nw', kind: 'tree', position: [-10.5, 0, -9.0], radius: 1.0, height: 5.8, scale: 1.15 },
  { id: 'lobby-tree-ne', kind: 'tree', position: [10.5, 0, -9.0], radius: 1.0, height: 5.8, scale: 1.15 }
];

export const ZOO_LOBBY_LAYOUT: PandaForestLayoutConfig = {
  spawnPosition: [0, 0.1, 18],
  spawnYaw: Math.PI,
  entranceGatePosition: [0, 0, 8.5],
  worldBounds: {
    minX: -28,
    maxX: 28,
    minZ: -28,
    maxZ: 28,
    minY: 0
  },
  perimeterRadius: 24,
  pond: {
    center: [0, 0, -2.0],
    radius: 1.8,
    shorelineColliderRadius: 2.0
  },
  obstacles: ZOO_LOBBY_OBSTACLES,
  interactiveObjects: ZOO_LOBBY_INTERACTIVE_OBJECTS
};

export const WORLD_ZONES_BY_ID: Record<WorldZoneId, WorldZoneDescriptor> = {
  'zoo-lobby': {
    zoneId: 'zoo-lobby',
    displayName: 'Zoo Lobby',
    description: 'Central entrance plaza, ticket booths, and zone directory.',
    badgeIcon: '🎟️',
    roomId: DEFAULT_ENTRY_ROOM_ID,
    sceneId: 'zoo-lobby',
    spawnPoint: [0, 0.1, 18],
    spawnYaw: Math.PI,
    hasAnimals: false,
    gateLinks: [
      {
        gateId: 'gate-to-panda-forest',
        targetZoneId: 'panda-forest',
        targetZoneDisplayName: 'Panda Forest',
        targetRoomId: PANDA_FOREST_PRIMARY_ROOM_ID,
        pairedGateId: 'gate-to-zoo-lobby',
        promptText: 'Enter Panda Forest?',
        position: [0, 0, 8.5],
        triggerRadius: 3.2,
        arrivalPosition: [0, 0.1, 14.2],
        arrivalYaw: Math.PI
      }
    ],
    layout: ZOO_LOBBY_LAYOUT
  },
  'panda-forest': {
    zoneId: 'panda-forest',
    displayName: 'Panda Forest',
    description: 'Highland bamboo sanctuary, lotus pond, and wildlife habitats.',
    badgeIcon: '🐼',
    roomId: PANDA_FOREST_PRIMARY_ROOM_ID,
    sceneId: 'panda-forest',
    spawnPoint: [0, 0.1, 18],
    spawnYaw: Math.PI,
    hasAnimals: true,
    gateLinks: [
      {
        gateId: 'gate-to-zoo-lobby',
        targetZoneId: 'zoo-lobby',
        targetZoneDisplayName: 'Zoo Lobby',
        targetRoomId: DEFAULT_ENTRY_ROOM_ID,
        pairedGateId: 'gate-to-panda-forest',
        promptText: 'Enter Zoo Lobby?',
        position: [0, 0, 16.4],
        triggerRadius: 2.8,
        arrivalPosition: [0, 0.1, 11.2],
        arrivalYaw: 0
      }
    ],
    layout: PANDA_FOREST_LAYOUT
  }
};

export const WORLD_ZONES_LIST: WorldZoneDescriptor[] = [
  WORLD_ZONES_BY_ID['zoo-lobby'],
  WORLD_ZONES_BY_ID['panda-forest']
];

export const WORLD_ZONE_IDS: WorldZoneId[] = ['zoo-lobby', 'panda-forest'];

export function isValidWorldZoneId(value: unknown): value is WorldZoneId {
  return value === 'zoo-lobby' || value === 'panda-forest';
}

export function getZoneById(zoneId: WorldZoneId): WorldZoneDescriptor {
  return WORLD_ZONES_BY_ID[zoneId] ?? WORLD_ZONES_BY_ID['zoo-lobby'];
}

export function resolveZoneForRoomId(roomId: string | null | undefined): WorldZoneDescriptor {
  if (!roomId) {
    return WORLD_ZONES_BY_ID['zoo-lobby'];
  }
  const normalized = roomId.trim().toLowerCase();
  if (normalized === 'zoo-lobby' || normalized.startsWith('zoo-lobby-')) {
    return WORLD_ZONES_BY_ID['zoo-lobby'];
  }
  return WORLD_ZONES_BY_ID['panda-forest'];
}

export function getLayoutForRoomId(roomId: string | null | undefined): PandaForestLayoutConfig {
  return resolveZoneForRoomId(roomId).layout;
}

export function findGateLinkByObjectId(
  zoneId: WorldZoneId,
  objectId: string
): ZoneGateLink | null {
  const zone = getZoneById(zoneId);
  return zone.gateLinks.find((link) => link.gateId === objectId) ?? null;
}
