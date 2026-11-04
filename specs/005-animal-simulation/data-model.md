# Phase 1 Data Model: Animal Simulation (Feature 005)

## 1. Species & Behavior Types (`packages/game-core/src/animals/animalCatalog.ts`)

```ts
export type AnimalSpeciesId = 'panda' | 'penguin' | 'otter';

export type HabitatId =
  | 'habitat-panda-grove'
  | 'habitat-penguin-cove'
  | 'habitat-otter-stream';

export type AnimalBehaviorState =
  | 'Idle'
  | 'Walking'
  | 'Eating'
  | 'Sleeping'
  | 'Playing'
  | 'Swimming'
  | 'Resting';

export type AnimalActivityVariant =
  | 'calm-observe'
  | 'stroll'
  | 'bamboo-munch'
  | 'sit-scratch'
  | 'curled-nap'
  | 'bamboo-roll'
  | 'waddle'
  | 'group-waddle'
  | 'pool-swim'
  | 'belly-slide'
  | 'ledge-huddle'
  | 'stream-swim'
  | 'back-float'
  | 'sun-bask'
  | 'bank-scurry'
  | 'fish-feast'
  | 'clam-forage';

export interface AnimalSpeciesCatalogEntry {
  speciesId: AnimalSpeciesId;
  commonName: string;
  scientificName: string;
  habitatId: HabitatId;
  habitatName: string;
  diet: string;
  conservationStatus: string;
  summary: string;
  facts: [string, string, string, string];
  allowedBehaviors: AnimalBehaviorState[];
  feedingActivityName: string;
  feedingFoodLabel: string;
  discoveryHint: string;
  badgeIcon: string;
  accentColor: string;
}
```

## 2. Habitat Zone & Individual Animal State (`packages/game-core/src/animals/animalSimulation.ts`)

```ts
export interface HabitatObstacleCircle {
  position: [number, number];
  radius: number;
}

export interface HabitatZoneDescriptor {
  habitatId: HabitatId;
  speciesId: AnimalSpeciesId;
  name: string;
  center: [number, number, number];
  radius: number;
  hasWaterZone: boolean;
  waterCenter?: [number, number];
  waterRadius?: number;
  feedingStationPosition: [number, number, number];
  observationPoint: [number, number, number];
  obstacles: HabitatObstacleCircle[];
}

export interface AnimalInstanceState {
  animalId: string;
  speciesId: AnimalSpeciesId;
  displayName: string;
  habitatId: HabitatId;
  behaviorState: AnimalBehaviorState;
  activityVariant: AnimalActivityVariant;
  position: [number, number, number];
  targetPosition: [number, number, number];
  rotationY: number;
  speed: number;
  stateStartedAt: number;
  stateEndsAt: number;
  isGroupLeader?: boolean;
  groupLeaderId?: string;
}

export interface HabitatFeedingState {
  habitatId: HabitatId;
  speciesId: AnimalSpeciesId;
  isActive: boolean;
  startedAt: number | null;
  endsAt: number | null;
  cooldownUntil: number | null;
  triggeredBySessionId: string | null;
  lastTriggerKind: 'none' | 'player' | 'scheduled';
}
```

## 3. Player Animal Encyclopedia (`packages/game-core/src/animals/encyclopediaPersistence.ts`)

```ts
export interface AnimalDiscoveryRecord {
  speciesId: AnimalSpeciesId;
  discovered: boolean;
  discoveredAt: string | null;
  observationCount: number;
  fedCount: number;
}

export interface PlayerEncyclopediaState {
  schemaVersion: 1;
  entries: Record<AnimalSpeciesId, AnimalDiscoveryRecord>;
  lastDiscoveredSpeciesId: AnimalSpeciesId | null;
}
```

## 4. State Transitions & Validation Rules

1. **Species Behavior Constraints (`FR-002`, `FR-003`)**:
   - `panda`: Allowed states = `['Idle', 'Walking', 'Eating', 'Resting', 'Sleeping', 'Playing']`. `Swimming` is prohibited.
   - `penguin`: Allowed states = `['Idle', 'Walking', 'Swimming', 'Playing', 'Resting', 'Eating']`. Includes coordinated `group-waddle` variant where follower penguins follow `penguin-piko`.
   - `otter`: Allowed states = `['Idle', 'Walking', 'Swimming', 'Playing', 'Resting', 'Eating']`. Transitions seamlessly between water zone (`Swimming`, `back-float`) and land bank (`Walking`, `Resting`, `Eating`).
2. **Spatial Clamping (`FR-004`, `SC-002`)**:
   - Every animal's horizontal coordinates `(x, z)` satisfy `hypot(x - habitat.center[0], z - habitat.center[2]) <= habitat.radius - 0.55`.
   - Every animal's horizontal coordinates stay outside all `habitat.obstacles` (`hypot(x - obs.x, z - obs.z) >= obs.radius + 0.45`).
3. **Feeding Cooldown Rules (`FR-013`–`FR-015`, `SC-006`)**:
   - Active feeding window: `12,000 ms`.
   - Cooldown window: `30,000 ms` from feeding start.
   - Any trigger request while `isActive` or `now < cooldownUntil` is rejected with reason `'already_active'` or `'on_cooldown'`.

