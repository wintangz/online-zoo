import { ANIMAL_SPECIES_IDS, type AnimalSpeciesId } from './animalCatalog';
import type { AnimalInstanceState } from './animalSimulation';

export const ANIMAL_ENCYCLOPEDIA_STORAGE_KEY = 'online-zoo:animal-encyclopedia:v1';
export const ANIMAL_DISCOVERY_RADIUS_METERS = 8.0;

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

export function createDefaultEncyclopediaState(): PlayerEncyclopediaState {
  return {
    schemaVersion: 1,
    entries: {
      panda: {
        speciesId: 'panda',
        discovered: false,
        discoveredAt: null,
        observationCount: 0,
        fedCount: 0
      },
      penguin: {
        speciesId: 'penguin',
        discovered: false,
        discoveredAt: null,
        observationCount: 0,
        fedCount: 0
      },
      otter: {
        speciesId: 'otter',
        discovered: false,
        discoveredAt: null,
        observationCount: 0,
        fedCount: 0
      }
    },
    lastDiscoveredSpeciesId: null
  };
}

export function loadPlayerEncyclopedia(
  storage?: Pick<Storage, 'getItem'> | null
): PlayerEncyclopediaState {
  const targetStorage =
    storage !== undefined
      ? storage
      : typeof window !== 'undefined' && window.localStorage
        ? window.localStorage
        : null;

  const fallback = createDefaultEncyclopediaState();
  if (!targetStorage) return fallback;

  try {
    const raw = targetStorage.getItem(ANIMAL_ENCYCLOPEDIA_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PlayerEncyclopediaState>;
    if (!parsed || parsed.schemaVersion !== 1 || !parsed.entries) {
      return fallback;
    }

    for (const speciesId of ANIMAL_SPECIES_IDS) {
      const entry = parsed.entries[speciesId];
      if (entry && typeof entry.discovered === 'boolean') {
        fallback.entries[speciesId] = {
          speciesId,
          discovered: entry.discovered,
          discoveredAt: typeof entry.discoveredAt === 'string' ? entry.discoveredAt : null,
          observationCount:
            typeof entry.observationCount === 'number' && entry.observationCount >= 0
              ? entry.observationCount
              : 0,
          fedCount:
            typeof entry.fedCount === 'number' && entry.fedCount >= 0 ? entry.fedCount : 0
        };
      }
    }

    if (
      parsed.lastDiscoveredSpeciesId &&
      ANIMAL_SPECIES_IDS.includes(parsed.lastDiscoveredSpeciesId)
    ) {
      fallback.lastDiscoveredSpeciesId = parsed.lastDiscoveredSpeciesId;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

export function savePlayerEncyclopedia(
  state: PlayerEncyclopediaState,
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
    targetStorage.setItem(ANIMAL_ENCYCLOPEDIA_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function recordSpeciesDiscovery(
  currentState: PlayerEncyclopediaState,
  speciesId: AnimalSpeciesId,
  nowIso = new Date().toISOString(),
  storage?: Pick<Storage, 'setItem'> | null
): { state: PlayerEncyclopediaState; newlyDiscovered: boolean } {
  const currentEntry = currentState.entries[speciesId];
  const newlyDiscovered = !currentEntry.discovered;

  const nextState: PlayerEncyclopediaState = {
    schemaVersion: 1,
    entries: {
      ...currentState.entries,
      [speciesId]: {
        speciesId,
        discovered: true,
        discoveredAt: currentEntry.discoveredAt ?? nowIso,
        observationCount: currentEntry.observationCount + 1,
        fedCount: currentEntry.fedCount
      }
    },
    lastDiscoveredSpeciesId: newlyDiscovered ? speciesId : currentState.lastDiscoveredSpeciesId
  };

  savePlayerEncyclopedia(nextState, storage);
  return { state: nextState, newlyDiscovered };
}

export function recordSpeciesFeeding(
  currentState: PlayerEncyclopediaState,
  speciesId: AnimalSpeciesId,
  nowIso = new Date().toISOString(),
  storage?: Pick<Storage, 'setItem'> | null
): PlayerEncyclopediaState {
  const currentEntry = currentState.entries[speciesId];
  const newlyDiscovered = !currentEntry.discovered;

  const nextState: PlayerEncyclopediaState = {
    schemaVersion: 1,
    entries: {
      ...currentState.entries,
      [speciesId]: {
        speciesId,
        discovered: true,
        discoveredAt: currentEntry.discoveredAt ?? nowIso,
        observationCount: Math.max(1, currentEntry.observationCount),
        fedCount: currentEntry.fedCount + 1
      }
    },
    lastDiscoveredSpeciesId: newlyDiscovered ? speciesId : currentState.lastDiscoveredSpeciesId
  };

  savePlayerEncyclopedia(nextState, storage);
  return nextState;
}

/**
 * Evaluates whether the player avatar is within natural discovery range (`<= 8.0m`)
 * of any animal belonging to an undiscovered species (FR-009, SC-005).
 */
export function evaluateProximityAnimalDiscovery(
  playerPosition: [number, number, number],
  animals: readonly AnimalInstanceState[],
  currentState: PlayerEncyclopediaState,
  nowIso = new Date().toISOString(),
  storage?: Pick<Storage, 'setItem'> | null
): {
  state: PlayerEncyclopediaState;
  newlyDiscoveredSpecies: AnimalSpeciesId[];
  closestAnimal: AnimalInstanceState | null;
  closestDistance: number;
} {
  let state = currentState;
  const newlyDiscoveredSpecies: AnimalSpeciesId[] = [];
  let closestAnimal: AnimalInstanceState | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const animal of animals) {
    const dx = playerPosition[0] - animal.position[0];
    const dz = playerPosition[2] - animal.position[2];
    const dist = Math.hypot(dx, dz);

    if (dist < closestDistance) {
      closestDistance = dist;
      closestAnimal = animal;
    }

    if (dist <= ANIMAL_DISCOVERY_RADIUS_METERS && !state.entries[animal.speciesId].discovered) {
      const res = recordSpeciesDiscovery(state, animal.speciesId, nowIso, storage);
      state = res.state;
      if (res.newlyDiscovered) {
        newlyDiscoveredSpecies.push(animal.speciesId);
      }
    }
  }

  return {
    state,
    newlyDiscoveredSpecies,
    closestAnimal,
    closestDistance
  };
}

