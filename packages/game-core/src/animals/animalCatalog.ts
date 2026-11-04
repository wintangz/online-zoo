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

export interface InitialAnimalDescriptor {
  animalId: string;
  speciesId: AnimalSpeciesId;
  displayName: string;
  habitatId: HabitatId;
  initialBehavior: AnimalBehaviorState;
  initialVariant: AnimalActivityVariant;
  initialPosition: [number, number, number];
  initialRotationY: number;
  isGroupLeader?: boolean;
  groupLeaderId?: string;
}

export const ANIMAL_SPECIES_IDS: readonly AnimalSpeciesId[] = ['panda', 'penguin', 'otter'] as const;

export const ANIMAL_SPECIES_CATALOG: Record<AnimalSpeciesId, AnimalSpeciesCatalogEntry> = {
  panda: {
    speciesId: 'panda',
    commonName: 'Giant Panda',
    scientificName: 'Ailuropoda melanoleuca',
    habitatId: 'habitat-panda-grove',
    habitatName: 'Misty Bamboo Grove Sanctuary',
    diet: 'Herbivorous specialist — 99% fresh arrow & golden bamboo shoots, stems, and leaves',
    conservationStatus: 'Vulnerable (Recovering)',
    summary:
      'Known for their distinctive black-and-white coat and playful tumbling antics, Giant Pandas spend their days foraging on fresh bamboo and napping on mossy boulders.',
    facts: [
      'A Giant Panda possesses a modified wrist bone ("pseudo-thumb") that helps it grip bamboo stalks with precision.',
      'Adult pandas spend 10 to 14 hours a day eating up to 38 kilograms of bamboo to meet their energy needs.',
      'Young and adult pandas alike enjoy rolling down grassy slopes and tumbling as natural play behavior.',
      'Unlike hibernating bears, Giant Pandas stay active year-round and migrate between mountain elevations.'
    ],
    allowedBehaviors: ['Idle', 'Walking', 'Eating', 'Resting', 'Sleeping', 'Playing'],
    feedingActivityName: 'Fresh Bamboo Shoot Feast',
    feedingFoodLabel: 'Fresh Bamboo Bundles',
    discoveryHint: 'Explore the East Misty Bamboo Grove terrace near the entrance trail.',
    badgeIcon: '🐼',
    accentColor: '#34d399'
  },
  penguin: {
    speciesId: 'penguin',
    commonName: 'Humboldt & Subantarctic Penguin',
    scientificName: 'Spheniscus humboldti',
    habitatId: 'habitat-penguin-cove',
    habitatName: 'Glacier Cove Coastal Pool',
    diet: 'Piscivorous — schooling silver anchovies, sardines, and small coastal squid',
    conservationStatus: 'Vulnerable',
    summary:
      'Highly social aquatic birds that waddle in coordinated colony groups on rocky coastal ledges before diving and belly-sliding into cool currents.',
    facts: [
      'Penguins "fly" underwater using stiff, flipper-like wings, reaching bursts of up to 24 km/h while chasing fish.',
      'They move in tight social flocks on land and water to coordinate foraging and stay close to colony mates.',
      'A dense double layer of interlocking feathers traps warm air so they stay comfortable in chilled water.',
      'Each penguin has a unique chest spot pattern and vocal call used to recognize partners and friends.'
    ],
    allowedBehaviors: ['Idle', 'Walking', 'Swimming', 'Playing', 'Resting', 'Eating'],
    feedingActivityName: 'Coastal Silver Fish Toss',
    feedingFoodLabel: 'Chilled Silver Fish',
    discoveryHint: 'Visit the West Glacier Cove Pool along the western stone pathway.',
    badgeIcon: '🐧',
    accentColor: '#38bdf8'
  },
  otter: {
    speciesId: 'otter',
    commonName: 'Asian Small-Clawed River Otter',
    scientificName: 'Aonyx cinereus',
    habitatId: 'habitat-otter-stream',
    habitatName: 'Highland Spring & Lotus Stream',
    diet: 'Carnivorous forager — freshwater clams, river crabs, crayfish, and small stream fish',
    conservationStatus: 'Vulnerable',
    summary:
      'Energetic, curious semi-aquatic mammals that dart between mossy boulders and spring-fed waters, floating on their backs and juggling smooth river pebbles.',
    facts: [
      'As the smallest otter species in the world, their partially webbed paws have sensitive fingertips used to forage for shellfish under stones.',
      'River otters are famous for floating effortlessly on their backs while cracking open clams or playing with pebbles.',
      'They live in close-knit family groups and communicate using over a dozen chirps, whistles, and squeaks.',
      'When diving, an otter can close its nostrils and ears completely to keep water out while swimming.'
    ],
    allowedBehaviors: ['Idle', 'Walking', 'Swimming', 'Playing', 'Resting', 'Eating'],
    feedingActivityName: 'River Clam & Shellfish Forage',
    feedingFoodLabel: 'Freshwater Clams & Crab',
    discoveryHint: 'Walk to the central Highland Spring & Lotus Pond shoreline.',
    badgeIcon: '🦦',
    accentColor: '#fbbf24'
  }
};

export const ZOO_HABITAT_ZONES: Record<HabitatId, HabitatZoneDescriptor> = {
  'habitat-panda-grove': {
    habitatId: 'habitat-panda-grove',
    speciesId: 'panda',
    name: 'Misty Bamboo Grove Sanctuary',
    center: [12.0, 0, 8.0],
    radius: 5.2,
    hasWaterZone: false,
    feedingStationPosition: [8.4, 0, 9.2],
    observationPoint: [6.0, 0, 10.2],
    obstacles: [
      { position: [10.0, 13.0], radius: 1.2 },
      { position: [8.5, 4.0], radius: 1.3 }
    ]
  },
  'habitat-penguin-cove': {
    habitatId: 'habitat-penguin-cove',
    speciesId: 'penguin',
    name: 'Glacier Cove Coastal Pool',
    center: [-12.5, 0, 6.0],
    radius: 5.0,
    hasWaterZone: true,
    waterCenter: [-13.3, 5.4],
    waterRadius: 2.9,
    feedingStationPosition: [-8.6, 0, 7.0],
    observationPoint: [-7.0, 0, 8.0],
    obstacles: [
      { position: [-14.0, 9.5], radius: 1.3 },
      { position: [-18.0, 4.0], radius: 1.1 }
    ]
  },
  'habitat-otter-stream': {
    habitatId: 'habitat-otter-stream',
    speciesId: 'otter',
    name: 'Highland Spring & Lotus Stream',
    center: [-8.0, 0, -4.0],
    radius: 5.8,
    hasWaterZone: true,
    waterCenter: [-8.0, -4.0],
    waterRadius: 4.1,
    feedingStationPosition: [-2.8, 0, -3.2],
    observationPoint: [-1.2, 0, -3.5],
    obstacles: [
      { position: [-9.2, -5.0], radius: 0.75 }
    ]
  }
};

export const INITIAL_ZOO_ANIMALS: readonly InitialAnimalDescriptor[] = [
  {
    animalId: 'panda-bao',
    speciesId: 'panda',
    displayName: 'Bao',
    habitatId: 'habitat-panda-grove',
    initialBehavior: 'Eating',
    initialVariant: 'bamboo-munch',
    initialPosition: [10.8, 0, 8.4],
    initialRotationY: -0.6
  },
  {
    animalId: 'panda-mei',
    speciesId: 'panda',
    displayName: 'Mei',
    habitatId: 'habitat-panda-grove',
    initialBehavior: 'Playing',
    initialVariant: 'bamboo-roll',
    initialPosition: [13.2, 0, 7.2],
    initialRotationY: 0.4
  },
  {
    animalId: 'penguin-piko',
    speciesId: 'penguin',
    displayName: 'Piko',
    habitatId: 'habitat-penguin-cove',
    initialBehavior: 'Walking',
    initialVariant: 'group-waddle',
    initialPosition: [-10.8, 0, 6.8],
    initialRotationY: 0.8,
    isGroupLeader: true
  },
  {
    animalId: 'penguin-skipper',
    speciesId: 'penguin',
    displayName: 'Skipper',
    habitatId: 'habitat-penguin-cove',
    initialBehavior: 'Walking',
    initialVariant: 'group-waddle',
    initialPosition: [-11.6, 0, 7.4],
    initialRotationY: 0.8,
    groupLeaderId: 'penguin-piko'
  },
  {
    animalId: 'penguin-waddles',
    speciesId: 'penguin',
    displayName: 'Waddles',
    habitatId: 'habitat-penguin-cove',
    initialBehavior: 'Swimming',
    initialVariant: 'pool-swim',
    initialPosition: [-13.2, 0, 5.2],
    initialRotationY: -1.1,
    groupLeaderId: 'penguin-piko'
  },
  {
    animalId: 'otter-lumi',
    speciesId: 'otter',
    displayName: 'Lumi',
    habitatId: 'habitat-otter-stream',
    initialBehavior: 'Swimming',
    initialVariant: 'stream-swim',
    initialPosition: [-6.8, 0, -3.6],
    initialRotationY: 1.2
  },
  {
    animalId: 'otter-pip',
    speciesId: 'otter',
    displayName: 'Pip',
    habitatId: 'habitat-otter-stream',
    initialBehavior: 'Playing',
    initialVariant: 'back-float',
    initialPosition: [-5.6, 0, -4.4],
    initialRotationY: -0.5
  }
] as const;

export function getSpeciesCatalogEntry(speciesId: AnimalSpeciesId): AnimalSpeciesCatalogEntry {
  return ANIMAL_SPECIES_CATALOG[speciesId];
}

export function getHabitatZone(habitatId: HabitatId): HabitatZoneDescriptor {
  return ZOO_HABITAT_ZONES[habitatId];
}

