import { beforeEach, describe, expect, it } from 'vitest';
import {
  ANIMAL_SPECIES_CATALOG,
  ANIMAL_SPECIES_IDS,
  AnimalSimulationSystem,
  createDefaultEncyclopediaState,
  evaluateProximityAnimalDiscovery,
  FEEDING_ACTIVE_DURATION_MS,
  FEEDING_COOLDOWN_MS,
  gameStore,
  getHabitatZone,
  HABITAT_BOUNDARY_MARGIN,
  HABITAT_OBSTACLE_CLEARANCE,
  InMemoryMultiplayerHub,
  loadPlayerEncyclopedia,
  MultiplayerClient,
  mutableRuntimeState,
  recordSpeciesDiscovery,
  resetMutableRuntimeState,
  ZOO_HABITAT_ZONES,
  type AnimalBehaviorState,
  type AnimalSpeciesId
} from '../src';

describe('Feature 005: Animal Simulation (US1–US5, FR-001–FR-017, SC-001–SC-006)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    resetMutableRuntimeState();
    gameStore.getState().resetSession();
  });

  it('US1: initializes Panda, Penguin, and Otter species and transitions through species-specific behavior repertoires without violating species constraints (FR-001..FR-003, FR-005, SC-001)', () => {
    const startNow = 1_762_300_000_000;
    const sim = new AnimalSimulationSystem(startNow);
    const initialAnimals = sim.getAnimals();

    // At least 2 animals per species across all 3 initial species
    for (const speciesId of ANIMAL_SPECIES_IDS) {
      const speciesAnimals = initialAnimals.filter((a) => a.speciesId === speciesId);
      expect(speciesAnimals.length).toBeGreaterThanOrEqual(2);
    }

    const observedStatesBySpecies: Record<AnimalSpeciesId, Set<AnimalBehaviorState>> = {
      panda: new Set(),
      penguin: new Set(),
      otter: new Set()
    };
    const observedVariantsBySpecies: Record<AnimalSpeciesId, Set<string>> = {
      panda: new Set(),
      penguin: new Set(),
      otter: new Set()
    };

    // Step 160 seconds at 0.25s intervals
    let currentTime = startNow;
    for (let stepIdx = 0; stepIdx < 640; stepIdx++) {
      currentTime += 250;
      sim.step(0.25, currentTime);
      for (const animal of sim.getAnimals()) {
        observedStatesBySpecies[animal.speciesId].add(animal.behaviorState);
        observedVariantsBySpecies[animal.speciesId].add(animal.activityVariant);

        // Pandas must NEVER enter Swimming
        if (animal.speciesId === 'panda') {
          expect(animal.behaviorState).not.toBe('Swimming');
        }
        // Every state must belong to the species' allowedBehaviors catalog
        expect(ANIMAL_SPECIES_CATALOG[animal.speciesId].allowedBehaviors).toContain(
          animal.behaviorState
        );
      }
    }

    // Each species exhibits >= 4 distinct behavior states (SC-001)
    expect(observedStatesBySpecies.panda.size).toBeGreaterThanOrEqual(4);
    expect(observedStatesBySpecies.penguin.size).toBeGreaterThanOrEqual(4);
    expect(observedStatesBySpecies.otter.size).toBeGreaterThanOrEqual(4);

    // Species-specific signature activities observed (FR-003)
    expect(observedVariantsBySpecies.panda.has('bamboo-munch')).toBe(true);
    expect(observedVariantsBySpecies.panda.has('bamboo-roll')).toBe(true);
    expect(observedVariantsBySpecies.penguin.has('group-waddle')).toBe(true);
    expect(observedVariantsBySpecies.penguin.has('pool-swim')).toBe(true);
    expect(observedVariantsBySpecies.otter.has('stream-swim')).toBe(true);
    expect(observedVariantsBySpecies.otter.has('back-float')).toBe(true);
  });

  it('US1: keeps 100% of simulated animal positions strictly inside habitat boundaries and outside obstacle circles (FR-004, SC-002)', () => {
    const startNow = 1_762_300_000_000;
    const sim = new AnimalSimulationSystem(startNow);

    let currentTime = startNow;
    for (let i = 0; i < 400; i++) {
      currentTime += 200;
      sim.step(0.2, currentTime);

      for (const animal of sim.getAnimals()) {
        const habitat = getHabitatZone(animal.habitatId);
        const distFromCenter = Math.hypot(
          animal.position[0] - habitat.center[0],
          animal.position[2] - habitat.center[2]
        );
        expect(distFromCenter).toBeLessThanOrEqual(
          habitat.radius - HABITAT_BOUNDARY_MARGIN + 1e-4
        );

        for (const obs of habitat.obstacles) {
          const distFromObs = Math.hypot(
            animal.position[0] - obs.position[0],
            animal.position[2] - obs.position[1]
          );
          expect(distFromObs).toBeGreaterThanOrEqual(
            obs.radius + HABITAT_OBSTACLE_CLEARANCE - 0.08
          );
        }
      }
    }
  });

  it('US3 & US4: provides complete species educational content and records natural proximity & inspection discoveries persistently in the Animal Encyclopedia (FR-006..FR-012, SC-004, SC-005)', () => {
    // Verify species catalog completeness (FR-007)
    for (const speciesId of ANIMAL_SPECIES_IDS) {
      const entry = ANIMAL_SPECIES_CATALOG[speciesId];
      expect(entry.commonName.length).toBeGreaterThan(3);
      expect(entry.scientificName.length).toBeGreaterThan(3);
      expect(entry.habitatName.length).toBeGreaterThan(3);
      expect(entry.diet.length).toBeGreaterThan(10);
      expect(entry.facts.length).toBeGreaterThanOrEqual(3);
    }

    const mockStorageMap = new Map<string, string>();
    const mockStorage = {
      getItem: (k: string) => mockStorageMap.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mockStorageMap.set(k, v);
      }
    };

    let enc = createDefaultEncyclopediaState();
    expect(enc.entries.panda.discovered).toBe(false);
    expect(enc.entries.penguin.discovered).toBe(false);
    expect(enc.entries.otter.discovered).toBe(false);

    const animals = mutableRuntimeState.animalSimulation.getAnimals();
    const pandaBao = animals.find((a) => a.animalId === 'panda-bao')!;

    // Approaching within 8.0m of PandaBao automatically discovers 'panda'
    const proxRes = evaluateProximityAnimalDiscovery(
      [pandaBao.position[0] + 2.0, 0.1, pandaBao.position[2] + 1.5],
      animals,
      enc,
      '2026-11-05T02:00:00.000Z',
      mockStorage
    );
    expect(proxRes.newlyDiscoveredSpecies).toEqual(['panda']);
    enc = proxRes.state;
    expect(enc.entries.panda.discovered).toBe(true);
    expect(enc.entries.penguin.discovered).toBe(false);

    // Record Penguin and Otter discoveries and verify reload from storage (SC-005)
    enc = recordSpeciesDiscovery(enc, 'penguin', '2026-11-05T02:01:00.000Z', mockStorage).state;
    enc = recordSpeciesDiscovery(enc, 'otter', '2026-11-05T02:02:00.000Z', mockStorage).state;

    const reloaded = loadPlayerEncyclopedia(mockStorage);
    expect(reloaded.entries.panda.discovered).toBe(true);
    expect(reloaded.entries.penguin.discovered).toBe(true);
    expect(reloaded.entries.otter.discovered).toBe(true);

    // Inspecting an animal in gameStore opens the Animal Info Panel and marks species discovered
    gameStore.getState().inspectAnimal('penguin-piko');
    expect(gameStore.getState().animalSim.inspectedAnimalId).toBe('penguin-piko');
    expect(gameStore.getState().animalSim.encyclopedia.entries.penguin.discovered).toBe(true);
  });

  it('US5: transitions habitat animals into Eating during a feeding session and enforces active & cooldown rate limits (FR-013..FR-015, SC-006)', () => {
    const startNow = 1_762_300_000_000;
    const sim = new AnimalSimulationSystem(startNow);

    const firstTrigger = sim.triggerHabitatFeeding(
      'habitat-panda-grove',
      startNow,
      'sess-101',
      'player'
    );
    expect(firstTrigger.accepted).toBe(true);
    expect(firstTrigger.feedingState?.isActive).toBe(true);

    // All pandas are now in Eating state heading toward the feeding station
    const pandas = sim.getAnimals().filter((a) => a.speciesId === 'panda');
    for (const p of pandas) {
      expect(p.behaviorState).toBe('Eating');
      expect(p.activityVariant).toBe('bamboo-munch');
    }

    // Duplicate trigger while active is rejected with 'already_active'
    const duplicateDuringActive = sim.triggerHabitatFeeding(
      'habitat-panda-grove',
      startNow + 3000,
      'sess-102',
      'player'
    );
    expect(duplicateDuringActive.accepted).toBe(false);
    expect(duplicateDuringActive.reason).toBe('already_active');

    // Step past active window (12s) but still inside cooldown window (30s)
    const duringCooldownTime = startNow + FEEDING_ACTIVE_DURATION_MS + 2000;
    sim.step(0.1, duringCooldownTime);
    expect(sim.getHabitatFeedings()['habitat-panda-grove'].isActive).toBe(false);

    const duplicateDuringCooldown = sim.triggerHabitatFeeding(
      'habitat-panda-grove',
      duringCooldownTime,
      'sess-101',
      'player'
    );
    expect(duplicateDuringCooldown.accepted).toBe(false);
    expect(duplicateDuringCooldown.reason).toBe('on_cooldown');

    // Step past full 30s cooldown -> feeding can be triggered again
    const afterCooldownTime = startNow + FEEDING_COOLDOWN_MS + 500;
    sim.step(0.1, afterCooldownTime);
    const retrigger = sim.triggerHabitatFeeding(
      'habitat-panda-grove',
      afterCooldownTime,
      'sess-101',
      'player'
    );
    expect(retrigger.accepted).toBe(true);
  });

  it('US2 & US5: synchronizes authoritative animal behavior states and feeding events across multiple connected visitors and recovers after reconnection (FR-016, FR-017, SC-003)', async () => {
    const hub = new InMemoryMultiplayerHub();
    const clientA = new MultiplayerClient({
      transportFactory: hub.createTransportFactory(),
      reconnectBackoffMs: [20, 40, 60]
    });
    const clientB = new MultiplayerClient({
      transportFactory: hub.createTransportFactory(),
      reconnectBackoffMs: [20, 40, 60]
    });

    clientA.connect();
    clientB.connect();
    await new Promise((r) => setTimeout(r, 15));

    // Step authoritative server ticks so animals advance and broadcast in room_state_tick
    const baseNow = Date.now();
    hub.stepServerTick(baseNow + 5000);

    const authorityAnimals = hub.authority.getRoomAnimals();
    const storeAnimals = gameStore.getState().animalSim.animals;
    expect(storeAnimals.length).toBe(authorityAnimals.length);
    for (let i = 0; i < authorityAnimals.length; i++) {
      expect(storeAnimals[i]?.animalId).toBe(authorityAnimals[i]?.animalId);
      expect(storeAnimals[i]?.behaviorState).toBe(authorityAnimals[i]?.behaviorState);
      expect(storeAnimals[i]?.position[0]).toBeCloseTo(authorityAnimals[i]!.position[0], 3);
    }

    // Client A triggers Penguin feeding -> authority validates & broadcasts animal_feeding_event to room
    clientA.sendTriggerAnimalFeeding('habitat-penguin-cove', baseNow + 6000);
    await new Promise((r) => setTimeout(r, 10));

    const penguinFeeding = gameStore.getState().animalSim.habitatFeedings['habitat-penguin-cove'];
    expect(penguinFeeding.isActive).toBe(true);
    const penguinsInStore = gameStore
      .getState()
      .animalSim.animals.filter((a) => a.speciesId === 'penguin');
    for (const penguin of penguinsInStore) {
      expect(penguin.behaviorState).toBe('Eating');
    }

    // Simulate temporary network drop & reconnect on Client B -> cleanly resynchronizes animal states (FR-017)
    clientB.simulateNetworkDrop(40);
    await new Promise((r) => setTimeout(r, 90));
    expect(gameStore.getState().multiplayer.status).toBe('connected');
    expect(
      gameStore.getState().animalSim.habitatFeedings['habitat-penguin-cove'].isActive
    ).toBe(true);
    expect(ZOO_HABITAT_ZONES['habitat-penguin-cove'].speciesId).toBe('penguin');

    clientA.disconnect(true);
    clientB.disconnect(true);
  });
});

