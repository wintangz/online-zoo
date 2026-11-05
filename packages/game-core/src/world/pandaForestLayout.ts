import type {
  InteractiveObjectDescriptor,
  SolidObstacleCollider,
  WorldSeatOccupancyState
} from '../types';

export interface PandaForestLayoutConfig {
  /** Spawn Transform: Position [0, 0.1, 18], initial facing yaw 0 */
  spawnPosition: [number, number, number];
  spawnYaw: number;
  /** Playable zone bounds ([-40, 40] X/Z, y >= 0) */
  worldBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minY: number;
  };
  /** Stylized bamboo-and-stone enclosure fence (radius: 36m) */
  perimeterRadius: number;
  /** Circular water feature centered at [-8, 0, -4] (radius: 6.5m) with blocked shoreline */
  pond: {
    center: [number, number, number];
    radius: number;
    shorelineColliderRadius: number;
  };
  obstacles: SolidObstacleCollider[];
  interactiveObjects: InteractiveObjectDescriptor[];
}

export const PANDA_FOREST_INTERACTIVE_OBJECTS: InteractiveObjectDescriptor[] = [
  {
    id: 'plaque-panda-habitat',
    title: 'Giant Panda Habitat Plaque',
    promptAction: 'Read Habitat Plaque',
    archetype: 'info_plaque',
    position: [2.8, 0, 11.5],
    interactionRadius: 3.0,
    infoCard: {
      heading: 'Welcome to the Misty Bamboo Sanctuary',
      body: 'This misty highland grove replicates the temperate montane bamboo forests of Sichuan, designed with natural streams, mossy boulders, and multi-canopy shade.',
      facts: [
        'Elevation zone: Simulated 2,200m sub-alpine bamboo terrace.',
        'Flora: Over 40 clumping Golden & Arrow bamboo stalks surround the trail.',
        'Conservation Note: Quiet pathways help visitors observe natural forest acoustics.'
      ]
    }
  },
  {
    id: 'plaque-pond-ecology',
    title: 'Lotus Pond Ecology Sign',
    promptAction: 'Read Ecology Sign',
    archetype: 'info_plaque',
    position: [-1.2, 0, -3.5],
    interactionRadius: 3.0,
    infoCard: {
      heading: 'Highland Spring & Lotus Pond',
      body: 'Fed by mountain runoff, this spring-fed pond regulates humidity across the Panda Forest microclimate and is bordered by natural riverstone barriers.',
      facts: [
        'Water Filtration: Bio-gravel beds keep the spring crystal clear.',
        'Shoreline Safety: Natural boulder edging protects the fragile aquatic border.',
        'Microclimate: Cool mist keeps summer temperatures comfortable.'
      ]
    }
  },
  {
    id: 'prop-stone-lantern',
    title: 'Stone Garden Lantern',
    promptAction: 'Toggle Lantern Light',
    archetype: 'world_prop',
    position: [4.2, 0, 1.5],
    interactionRadius: 2.8,
    propReactionType: 'toggle_lantern'
  },
  {
    id: 'prop-wind-chime',
    title: 'Bamboo Wind Chime Pavilion',
    promptAction: 'Ring Bamboo Chimes',
    archetype: 'world_prop',
    position: [7.5, 0, -6.0],
    interactionRadius: 3.2,
    propReactionType: 'ring_chime'
  },
  {
    id: 'prop-scenic-bench',
    title: 'Scenic Overlook Bench',
    promptAction: 'Rest at Overlook Bench',
    archetype: 'world_prop',
    position: [-2.5, 0, -13.0],
    interactionRadius: 3.2,
    propReactionType: 'rest_bench',
    seats: [
      {
        seatIndex: 0,
        label: 'Left Seat',
        worldPosition: [-3.05, 0.1, -12.05],
        facingYaw: 0.25
      },
      {
        seatIndex: 1,
        label: 'Right Seat',
        worldPosition: [-1.95, 0.1, -12.05],
        facingYaw: 0.25
      }
    ]
  },
  {
    id: 'prop-plaza-bench',
    title: 'Entry Plaza Bamboo Bench',
    promptAction: 'Sit on Plaza Bench',
    archetype: 'world_prop',
    position: [-3.2, 0, 15.0],
    interactionRadius: 3.4,
    propReactionType: 'rest_bench',
    seats: [
      {
        seatIndex: 0,
        label: 'Left Seat',
        worldPosition: [-3.75, 0.1, 15.95],
        facingYaw: 0.15
      },
      {
        seatIndex: 1,
        label: 'Right Seat',
        worldPosition: [-2.65, 0.1, 15.95],
        facingYaw: 0.15
      }
    ]
  },
  {
    id: 'prop-pond-chair',
    title: 'Lotus Pond Viewing Chair',
    promptAction: 'Sit on Viewing Chair',
    archetype: 'world_prop',
    position: [-0.8, 0, 1.5],
    interactionRadius: 3.0,
    propReactionType: 'rest_bench',
    seats: [
      {
        seatIndex: 0,
        label: 'Center Seat',
        worldPosition: [-0.8, 0.1, 2.48],
        facingYaw: -0.45
      }
    ]
  },
  {
    id: 'station-panda-habitat',
    title: 'Giant Panda Bamboo Sanctuary Station',
    promptAction: 'Observe & Feed Giant Pandas',
    archetype: 'world_prop',
    position: [8.4, 0, 9.2],
    interactionRadius: 3.6,
    propReactionType: 'toggle_lantern'
  },
  {
    id: 'station-penguin-cove',
    title: 'Glacier Cove Penguin Feeding Station',
    promptAction: 'Observe & Feed Penguins',
    archetype: 'world_prop',
    position: [-8.6, 0, 7.0],
    interactionRadius: 3.6,
    propReactionType: 'toggle_lantern'
  },
  {
    id: 'station-otter-stream',
    title: 'Highland Stream Otter Lookout',
    promptAction: 'Observe & Feed River Otters',
    archetype: 'world_prop',
    position: [-2.8, 0, -3.2],
    interactionRadius: 3.6,
    propReactionType: 'toggle_lantern'
  },
  {
    id: 'prop-plaza-food-stall',
    title: 'Plaza Refreshment Kiosk',
    promptAction: 'Browse Food & Drinks',
    archetype: 'world_prop',
    position: [-6.8, 0, 12.2],
    interactionRadius: 3.6,
    propReactionType: 'open_food_stall'
  },
  {
    id: 'prop-bamboo-tea-stall',
    title: 'Bamboo Tea & Snack Stall',
    promptAction: 'Browse Food & Drinks',
    archetype: 'world_prop',
    position: [11.8, 0, 5.6],
    interactionRadius: 3.6,
    propReactionType: 'open_food_stall'
  },
  {
    id: 'prop-plaza-cafe-table',
    title: 'Plaza Umbrella Dining Table',
    promptAction: 'Sit at Dining Table',
    archetype: 'world_prop',
    position: [-3.8, 0, 12.6],
    interactionRadius: 3.5,
    propReactionType: 'rest_bench',
    seats: [
      {
        seatIndex: 0,
        label: 'North Seat',
        worldPosition: [-3.8, 0.1, 11.62],
        facingYaw: 0
      },
      {
        seatIndex: 1,
        label: 'East Seat',
        worldPosition: [-2.82, 0.1, 12.6],
        facingYaw: -Math.PI / 2
      },
      {
        seatIndex: 2,
        label: 'South Seat',
        worldPosition: [-3.8, 0.1, 13.58],
        facingYaw: Math.PI
      },
      {
        seatIndex: 3,
        label: 'West Seat',
        worldPosition: [-4.78, 0.1, 12.6],
        facingYaw: Math.PI / 2
      }
    ]
  },
  {
    id: 'prop-bamboo-picnic-table',
    title: 'Bamboo Grove Picnic Table',
    promptAction: 'Sit at Picnic Table',
    archetype: 'world_prop',
    position: [10.8, 0, 0.8],
    interactionRadius: 3.5,
    propReactionType: 'rest_bench',
    seats: [
      {
        seatIndex: 0,
        label: 'West Front Seat',
        worldPosition: [9.82, 0.1, 1.25],
        facingYaw: Math.PI / 2
      },
      {
        seatIndex: 1,
        label: 'West Back Seat',
        worldPosition: [9.82, 0.1, 0.35],
        facingYaw: Math.PI / 2
      },
      {
        seatIndex: 2,
        label: 'East Front Seat',
        worldPosition: [11.78, 0.1, 1.25],
        facingYaw: -Math.PI / 2
      },
      {
        seatIndex: 3,
        label: 'East Back Seat',
        worldPosition: [11.78, 0.1, 0.35],
        facingYaw: -Math.PI / 2
      }
    ]
  }
];

export const PANDA_FOREST_OBSTACLES: SolidObstacleCollider[] = [
  // Trees
  { id: 'tree-01', kind: 'tree', position: [-10, 0, 14], radius: 1.1, height: 6.0, scale: 1.2 },
  { id: 'tree-02', kind: 'tree', position: [10, 0, 13], radius: 1.1, height: 6.5, scale: 1.3 },
  { id: 'tree-03', kind: 'tree', position: [14, 0, 2], radius: 1.2, height: 7.0, scale: 1.4 },
  { id: 'tree-04', kind: 'tree', position: [12, 0, -14], radius: 1.1, height: 6.2, scale: 1.25 },
  { id: 'tree-05', kind: 'tree', position: [-15, 0, -15], radius: 1.2, height: 6.8, scale: 1.35 },
  { id: 'tree-06', kind: 'tree', position: [-18, 0, 4], radius: 1.1, height: 6.0, scale: 1.2 },
  { id: 'tree-07', kind: 'tree', position: [0, 0, -22], radius: 1.3, height: 7.2, scale: 1.45 },
  { id: 'tree-08', kind: 'tree', position: [20, 0, -6], radius: 1.1, height: 6.0, scale: 1.2 },

  // Large Boulders / Rocks
  { id: 'rock-01', kind: 'rock', position: [-5.5, 0, 9.0], radius: 1.4, height: 2.2, scale: 1.3 },
  { id: 'rock-02', kind: 'rock', position: [6.5, 0, 7.5], radius: 1.3, height: 2.0, scale: 1.2 },
  { id: 'rock-03', kind: 'rock', position: [9.0, 0, -2.0], radius: 1.6, height: 2.5, scale: 1.5 },
  { id: 'rock-04', kind: 'rock', position: [-20.0, 0, -4.0], radius: 1.7, height: 2.6, scale: 1.6 },
  { id: 'rock-05', kind: 'rock', position: [-7.5, 0, -14.5], radius: 1.5, height: 2.3, scale: 1.4 },
  { id: 'rock-06', kind: 'rock', position: [5.5, 0, -17.0], radius: 1.4, height: 2.1, scale: 1.3 },

  // Dense Bamboo Clusters
  { id: 'bamboo-01', kind: 'bamboo', position: [-6.0, 0, 15.5], radius: 1.2, height: 7.5, scale: 1.0 },
  { id: 'bamboo-02', kind: 'bamboo', position: [6.0, 0, 15.5], radius: 1.2, height: 7.5, scale: 1.1 },
  { id: 'bamboo-03', kind: 'bamboo', position: [8.5, 0, 4.0], radius: 1.3, height: 8.0, scale: 1.2 },
  { id: 'bamboo-04', kind: 'bamboo', position: [11.5, 0, -9.5], radius: 1.3, height: 8.0, scale: 1.15 },
  { id: 'bamboo-05', kind: 'bamboo', position: [-14.0, 0, 9.5], radius: 1.3, height: 7.8, scale: 1.1 },
  { id: 'bamboo-06', kind: 'bamboo', position: [-12.0, 0, -12.0], radius: 1.2, height: 7.5, scale: 1.05 },
  { id: 'bamboo-07', kind: 'bamboo', position: [2.5, 0, -19.5], radius: 1.3, height: 8.2, scale: 1.2 },
  { id: 'bamboo-08', kind: 'bamboo', position: [-4.5, 0, -19.5], radius: 1.3, height: 8.0, scale: 1.15 },

  // Entrance Sanctuary Arch Pillars (South Gate at Z = 22.5)
  { id: 'gate-pillar-west', kind: 'pillar', position: [-2.6, 0, 22.5], radius: 0.45, height: 4.4 },
  { id: 'gate-pillar-east', kind: 'pillar', position: [2.6, 0, 22.5], radius: 0.45, height: 4.4 },

  // Solid World Props, Habitat Plaques, Ecology Signs, Lantern, Chime Pavilion & Benches (FR-023, FR-012)
  { id: 'collider-plaque-panda-habitat', kind: 'pillar', position: [2.8, 0, 11.5], radius: 0.55, height: 2.0 },
  { id: 'collider-plaque-pond-ecology', kind: 'pillar', position: [-1.2, 0, -3.5], radius: 0.55, height: 2.0 },
  { id: 'collider-prop-stone-lantern', kind: 'pillar', position: [4.2, 0, 1.5], radius: 0.55, height: 2.2 },
  { id: 'collider-prop-wind-chime', kind: 'pillar', position: [7.5, 0, -6.0], radius: 0.75, height: 2.8 },
  { id: 'collider-prop-scenic-bench', kind: 'pillar', position: [-2.5, 0, -13.0], radius: 0.5, height: 1.4 },
  { id: 'collider-prop-plaza-bench', kind: 'pillar', position: [-3.2, 0, 15.0], radius: 0.5, height: 1.4 },
  { id: 'collider-prop-pond-chair', kind: 'pillar', position: [-0.8, 0, 1.5], radius: 0.45, height: 1.3 },
  { id: 'collider-prop-plaza-food-stall', kind: 'pillar', position: [-6.8, 0, 12.2], radius: 0.9, height: 2.8 },
  { id: 'collider-prop-bamboo-tea-stall', kind: 'pillar', position: [11.8, 0, 5.6], radius: 0.9, height: 2.8 },
  { id: 'collider-prop-plaza-cafe-table', kind: 'pillar', position: [-3.8, 0, 12.6], radius: 0.45, height: 1.4 },
  { id: 'collider-prop-bamboo-picnic-table', kind: 'pillar', position: [10.8, 0, 0.8], radius: 0.45, height: 1.4 }
];

export function createInitialRoomSeatStates(
  interactiveObjects: InteractiveObjectDescriptor[] = PANDA_FOREST_INTERACTIVE_OBJECTS
): Record<string, WorldSeatOccupancyState[]> {
  const seatStates: Record<string, WorldSeatOccupancyState[]> = {};
  for (const obj of interactiveObjects) {
    if (obj.seats && obj.seats.length > 0) {
      seatStates[obj.id] = obj.seats.map((slot) => ({
        objectId: obj.id,
        seatIndex: slot.seatIndex,
        label: slot.label,
        worldPosition: [...slot.worldPosition],
        facingYaw: slot.facingYaw,
        occupiedBySessionId: null,
        occupiedByPlayerId: null,
        occupiedByDisplayName: null,
        occupiedAt: 0
      }));
    }
  }
  return seatStates;
}

export const PANDA_FOREST_LAYOUT: PandaForestLayoutConfig = {
  spawnPosition: [0, 0.1, 18],
  spawnYaw: 0,
  worldBounds: {
    minX: -40,
    maxX: 40,
    minZ: -40,
    maxZ: 40,
    minY: 0
  },
  perimeterRadius: 36,
  pond: {
    center: [-8, 0, -4],
    radius: 6.5,
    shorelineColliderRadius: 6.7
  },
  obstacles: PANDA_FOREST_OBSTACLES,
  interactiveObjects: PANDA_FOREST_INTERACTIVE_OBJECTS
};

/**
 * Pure spatial helper that resolves horizontal (X/Z) position against all solid obstacles,
 * the blocked pond shoreline collider (FR-002), and the outer perimeter enclosure (radius: 36m).
 * Used both as a deterministic validation guard and in unit/integration tests.
 */
export function resolveHorizontalWorldCollisions(
  candidatePosition: [number, number, number],
  avatarRadius = 0.45,
  layout: PandaForestLayoutConfig = PANDA_FOREST_LAYOUT
): { position: [number, number, number]; collided: boolean; hitIds: string[] } {
  let x = candidatePosition[0];
  let z = candidatePosition[2];
  const y = Math.max(layout.worldBounds.minY, candidatePosition[1]);
  let collided = false;
  const hitIds: string[] = [];

  // 1. Resolve circular solid obstacles (rocks, trees, bamboo clusters)
  for (const obs of layout.obstacles) {
    const dx = x - obs.position[0];
    const dz = z - obs.position[2];
    const distSq = dx * dx + dz * dz;
    const minDist = obs.radius + avatarRadius;
    if (distSq < minDist * minDist) {
      collided = true;
      hitIds.push(obs.id);
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

  // 2. Resolve blocked pond shoreline barrier (FR-002: centered at [-8, 0, -4], radius 6.5m)
  {
    const pdx = x - layout.pond.center[0];
    const pdz = z - layout.pond.center[2];
    const pDistSq = pdx * pdx + pdz * pdz;
    const minPondDist = layout.pond.shorelineColliderRadius + avatarRadius;
    if (pDistSq < minPondDist * minPondDist) {
      collided = true;
      hitIds.push('pond-shoreline');
      const pDist = Math.sqrt(pDistSq);
      if (pDist > 1e-5) {
        const scale = minPondDist / pDist;
        x = layout.pond.center[0] + pdx * scale;
        z = layout.pond.center[2] + pdz * scale;
      } else {
        x = layout.pond.center[0] + minPondDist;
      }
    }
  }

  // 3. Resolve outer perimeter enclosure fence (radius: 36m)
  {
    const distFromOriginSq = x * x + z * z;
    const maxAllowedRadius = layout.perimeterRadius - avatarRadius;
    if (distFromOriginSq > maxAllowedRadius * maxAllowedRadius) {
      collided = true;
      hitIds.push('perimeter-fence');
      const dist = Math.sqrt(distFromOriginSq);
      const scale = maxAllowedRadius / dist;
      x *= scale;
      z *= scale;
    }
  }

  // 4. Hard world bounds safety clamp ([-40, 40] X/Z)
  x = Math.min(layout.worldBounds.maxX, Math.max(layout.worldBounds.minX, x));
  z = Math.min(layout.worldBounds.maxZ, Math.max(layout.worldBounds.minZ, z));

  return {
    position: [x, y, z],
    collided,
    hitIds
  };
}
