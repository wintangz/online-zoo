import {
  ANIMAL_SPECIES_CATALOG,
  getHabitatZone,
  INITIAL_ZOO_ANIMALS,
  ZOO_HABITAT_ZONES,
  type AnimalActivityVariant,
  type AnimalBehaviorState,
  type AnimalSpeciesId,
  type HabitatId,
  type HabitatZoneDescriptor
} from './animalCatalog';

export const FEEDING_ACTIVE_DURATION_MS = 12_000;
export const FEEDING_COOLDOWN_MS = 30_000;
export const SCHEDULED_FEEDING_INTERVAL_MS = 90_000;
export const HABITAT_BOUNDARY_MARGIN = 0.55;
export const HABITAT_OBSTACLE_CLEARANCE = 0.45;

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

export interface TriggerFeedingResult {
  accepted: boolean;
  reason?: 'invalid_habitat' | 'already_active' | 'on_cooldown';
  feedingState?: HabitatFeedingState;
  animals?: AnimalInstanceState[];
}

interface BehaviorTransitionCandidate {
  behaviorState: AnimalBehaviorState;
  activityVariant: AnimalActivityVariant;
  durationMs: number;
  speed: number;
}

const SPECIES_BEHAVIOR_POOL: Record<AnimalSpeciesId, readonly BehaviorTransitionCandidate[]> = {
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
 * Clamps a candidate [x, y, z] position strictly within the designated habitat boundary
 * and outside all obstacle circles in the habitat (FR-004, SC-002).
 */
export function clampPositionToHabitat(
  candidate: [number, number, number],
  habitat: HabitatZoneDescriptor,
  behaviorState?: AnimalBehaviorState
): [number, number, number] {
  let x = candidate[0];
  let z = candidate[2];
  const y = candidate[1];

  // 1. If Swimming and habitat has a water zone, clamp inside waterRadius
  if (
    behaviorState === 'Swimming' &&
    habitat.hasWaterZone &&
    habitat.waterCenter &&
    habitat.waterRadius
  ) {
    const wdx = x - habitat.waterCenter[0];
    const wdz = z - habitat.waterCenter[1];
    const wDist = Math.hypot(wdx, wdz);
    const maxWaterR = Math.max(0.5, habitat.waterRadius - 0.35);
    if (wDist > maxWaterR && wDist > 1e-5) {
      const scale = maxWaterR / wDist;
      x = habitat.waterCenter[0] + wdx * scale;
      z = habitat.waterCenter[1] + wdz * scale;
    }
  }

  // 2. Push outside any internal obstacle circles
  for (const obs of habitat.obstacles) {
    const odx = x - obs.position[0];
    const odz = z - obs.position[1];
    const oDist = Math.hypot(odx, odz);
    const minObsR = obs.radius + HABITAT_OBSTACLE_CLEARANCE;
    if (oDist < minObsR) {
      if (oDist > 1e-5) {
        const push = (minObsR - oDist) / oDist;
        x += odx * push;
        z += odz * push;
      } else {
        x += minObsR;
      }
    }
  }

  // 3. Hard clamp inside outer habitat boundary circle
  const hdx = x - habitat.center[0];
  const hdz = z - habitat.center[2];
  const hDist = Math.hypot(hdx, hdz);
  const maxHabitatR = Math.max(1.0, habitat.radius - HABITAT_BOUNDARY_MARGIN);
  if (hDist > maxHabitatR && hDist > 1e-5) {
    const scale = maxHabitatR / hDist;
    x = habitat.center[0] + hdx * scale;
    z = habitat.center[2] + hdz * scale;
  }

  // 4. Re-check obstacle clearance in case outer clamp pushed into a border obstacle
  for (const obs of habitat.obstacles) {
    const odx = x - obs.position[0];
    const odz = z - obs.position[1];
    const oDist = Math.hypot(odx, odz);
    const minObsR = obs.radius + HABITAT_OBSTACLE_CLEARANCE;
    if (oDist < minObsR) {
      // Nudge toward habitat center
      const toCenterDx = habitat.center[0] - x;
      const toCenterDz = habitat.center[2] - z;
      const toCenterLen = Math.hypot(toCenterDx, toCenterDz) || 1;
      const needed = minObsR - oDist + 0.05;
      x += (toCenterDx / toCenterLen) * needed;
      z += (toCenterDz / toCenterLen) * needed;
    }
  }

  return [x, y, z];
}

export function createInitialAnimalStates(now = Date.now()): AnimalInstanceState[] {
  return INITIAL_ZOO_ANIMALS.map((desc, idx) => {
    const habitat = getHabitatZone(desc.habitatId);
    const clampedPos = clampPositionToHabitat(
      [...desc.initialPosition],
      habitat,
      desc.initialBehavior
    );
    const durationOffset = (idx % 3) * 750;
    return {
      animalId: desc.animalId,
      speciesId: desc.speciesId,
      displayName: desc.displayName,
      habitatId: desc.habitatId,
      behaviorState: desc.initialBehavior,
      activityVariant: desc.initialVariant,
      position: clampedPos,
      targetPosition: [...clampedPos],
      rotationY: desc.initialRotationY,
      speed: desc.initialBehavior === 'Walking' || desc.initialBehavior === 'Swimming' ? 1.25 : 0.4,
      stateStartedAt: now,
      stateEndsAt: now + 3800 + durationOffset,
      ...(desc.isGroupLeader !== undefined ? { isGroupLeader: desc.isGroupLeader } : {}),
      ...(desc.groupLeaderId !== undefined ? { groupLeaderId: desc.groupLeaderId } : {})
    };
  });
}

export function createInitialHabitatFeedingStates(): Record<HabitatId, HabitatFeedingState> {
  return {
    'habitat-panda-grove': {
      habitatId: 'habitat-panda-grove',
      speciesId: 'panda',
      isActive: false,
      startedAt: null,
      endsAt: null,
      cooldownUntil: null,
      triggeredBySessionId: null,
      lastTriggerKind: 'none'
    },
    'habitat-penguin-cove': {
      habitatId: 'habitat-penguin-cove',
      speciesId: 'penguin',
      isActive: false,
      startedAt: null,
      endsAt: null,
      cooldownUntil: null,
      triggeredBySessionId: null,
      lastTriggerKind: 'none'
    },
    'habitat-otter-stream': {
      habitatId: 'habitat-otter-stream',
      speciesId: 'otter',
      isActive: false,
      startedAt: null,
      endsAt: null,
      cooldownUntil: null,
      triggeredBySessionId: null,
      lastTriggerKind: 'none'
    }
  };
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Authoritative & deterministic Animal Simulation System (FR-001 through FR-017).
 * Manages autonomous species-specific state transitions, Penguin group movement,
 * habitat boundary clamping, and cooldown-governed feeding sessions.
 */
export class AnimalSimulationSystem {
  private animals: AnimalInstanceState[];
  private habitatFeedings: Record<HabitatId, HabitatFeedingState>;
  private stepCounter = 0;
  private lastScheduledFeedingAt: number;

  constructor(now = Date.now()) {
    this.animals = createInitialAnimalStates(now);
    this.habitatFeedings = createInitialHabitatFeedingStates();
    this.lastScheduledFeedingAt = now;
  }

  public getAnimals(): AnimalInstanceState[] {
    return this.animals.map((a) => ({
      ...a,
      position: [...a.position],
      targetPosition: [...a.targetPosition]
    }));
  }

  public getHabitatFeedings(): Record<HabitatId, HabitatFeedingState> {
    return {
      'habitat-panda-grove': { ...this.habitatFeedings['habitat-panda-grove'] },
      'habitat-penguin-cove': { ...this.habitatFeedings['habitat-penguin-cove'] },
      'habitat-otter-stream': { ...this.habitatFeedings['habitat-otter-stream'] }
    };
  }

  public applyAuthoritativeSnapshot(
    animals: AnimalInstanceState[],
    habitatFeedings: Record<HabitatId, HabitatFeedingState>
  ): void {
    this.animals = animals.map((a) => ({
      ...a,
      position: [...a.position],
      targetPosition: [...a.targetPosition]
    }));
    this.habitatFeedings = {
      'habitat-panda-grove': {
        ...(habitatFeedings['habitat-panda-grove'] ?? this.habitatFeedings['habitat-panda-grove'])
      },
      'habitat-penguin-cove': {
        ...(habitatFeedings['habitat-penguin-cove'] ?? this.habitatFeedings['habitat-penguin-cove'])
      },
      'habitat-otter-stream': {
        ...(habitatFeedings['habitat-otter-stream'] ?? this.habitatFeedings['habitat-otter-stream'])
      }
    };
  }

  /**
   * Triggers a species-appropriate feeding session at a habitat station (FR-013..FR-015, SC-006).
   */
  public triggerHabitatFeeding(
    habitatId: HabitatId,
    now = Date.now(),
    triggeredBySessionId: string | null = null,
    triggerKind: 'player' | 'scheduled' = 'player'
  ): TriggerFeedingResult {
    const habitat = ZOO_HABITAT_ZONES[habitatId];
    const currentFeeding = this.habitatFeedings[habitatId];
    if (!habitat || !currentFeeding) {
      return { accepted: false, reason: 'invalid_habitat' };
    }

    // Check active state
    if (currentFeeding.isActive && currentFeeding.endsAt !== null && now < currentFeeding.endsAt) {
      return { accepted: false, reason: 'already_active' };
    }

    // Check post-feeding cooldown
    if (currentFeeding.cooldownUntil !== null && now < currentFeeding.cooldownUntil) {
      return { accepted: false, reason: 'on_cooldown' };
    }

    const updatedFeeding: HabitatFeedingState = {
      habitatId,
      speciesId: habitat.speciesId,
      isActive: true,
      startedAt: now,
      endsAt: now + FEEDING_ACTIVE_DURATION_MS,
      cooldownUntil: now + FEEDING_COOLDOWN_MS,
      triggeredBySessionId,
      lastTriggerKind: triggerKind
    };
    this.habitatFeedings[habitatId] = updatedFeeding;

    const eatingVariant: AnimalActivityVariant =
      habitat.speciesId === 'panda'
        ? 'bamboo-munch'
        : habitat.speciesId === 'penguin'
          ? 'fish-feast'
          : 'clam-forage';

    // Direct all animals in this habitat toward the feeding station and enter Eating
    let slotIndex = 0;
    for (const animal of this.animals) {
      if (animal.habitatId !== habitatId) continue;
      const angle = (slotIndex / 3) * Math.PI * 1.4 - 0.5;
      const rawTarget: [number, number, number] = [
        habitat.feedingStationPosition[0] + Math.cos(angle) * 0.9,
        0,
        habitat.feedingStationPosition[2] + Math.sin(angle) * 0.9
      ];
      const clampedTarget = clampPositionToHabitat(rawTarget, habitat, 'Eating');
      animal.behaviorState = 'Eating';
      animal.activityVariant = eatingVariant;
      animal.targetPosition = clampedTarget;
      animal.speed = 1.45;
      animal.stateStartedAt = now;
      animal.stateEndsAt = now + FEEDING_ACTIVE_DURATION_MS;
      const dx = clampedTarget[0] - animal.position[0];
      const dz = clampedTarget[2] - animal.position[2];
      if (Math.hypot(dx, dz) > 0.05) {
        animal.rotationY = Math.atan2(dx, dz);
      }
      slotIndex += 1;
    }

    return {
      accepted: true,
      feedingState: { ...updatedFeeding },
      animals: this.getAnimals()
    };
  }

  /**
   * Advances all animals by `dtSeconds` at timestamp `now`.
   */
  public step(dtSeconds: number, now = Date.now()): void {
    const dt = Math.min(0.25, Math.max(0, dtSeconds));
    this.stepCounter += 1;

    // 1. Update feeding session expirations & periodic scheduled feedings
    for (const habitatId of Object.keys(this.habitatFeedings) as HabitatId[]) {
      const f = this.habitatFeedings[habitatId];
      if (f.isActive && f.endsAt !== null && now >= f.endsAt) {
        f.isActive = false;
      }
      if (f.cooldownUntil !== null && now >= f.cooldownUntil && !f.isActive) {
        f.cooldownUntil = null;
      }
    }

    if (now - this.lastScheduledFeedingAt >= SCHEDULED_FEEDING_INTERVAL_MS) {
      this.lastScheduledFeedingAt = now;
      const habitats: HabitatId[] = [
        'habitat-panda-grove',
        'habitat-penguin-cove',
        'habitat-otter-stream'
      ];
      const scheduledHabitat = habitats[this.stepCounter % habitats.length];
      if (scheduledHabitat) {
        this.triggerHabitatFeeding(scheduledHabitat, now, null, 'scheduled');
      }
    }

    // 2. Step each animal's state machine and spatial steering
    for (let i = 0; i < this.animals.length; i++) {
      const animal = this.animals[i];
      if (!animal) continue;
      const habitat = getHabitatZone(animal.habitatId);
      const feeding = this.habitatFeedings[animal.habitatId];

      // Transition to next behavior state when timer expires (and not locked in active feeding)
      if (now >= animal.stateEndsAt && !feeding.isActive) {
        this.transitionAnimalState(animal, i, habitat, now);
      }

      // If follower penguin in group-waddle, track behind leader penguin
      if (
        animal.speciesId === 'penguin' &&
        animal.activityVariant === 'group-waddle' &&
        animal.groupLeaderId
      ) {
        const leader = this.animals.find((a) => a.animalId === animal.groupLeaderId);
        if (leader) {
          const offsetAngle = leader.rotationY + Math.PI + (i % 2 === 0 ? 0.45 : -0.45);
          const followTarget: [number, number, number] = [
            leader.position[0] + Math.sin(offsetAngle) * 1.15,
            0,
            leader.position[2] + Math.cos(offsetAngle) * 1.15
          ];
          animal.targetPosition = clampPositionToHabitat(
            followTarget,
            habitat,
            animal.behaviorState
          );
        }
      }

      // Move smoothly toward targetPosition
      const dx = animal.targetPosition[0] - animal.position[0];
      const dz = animal.targetPosition[2] - animal.position[2];
      const dist = Math.hypot(dx, dz);

      if (dist > 0.08 && animal.speed > 0) {
        const moveStep = Math.min(dist, animal.speed * dt);
        const nx = animal.position[0] + (dx / dist) * moveStep;
        const nz = animal.position[2] + (dz / dist) * moveStep;
        animal.position = clampPositionToHabitat([nx, 0, nz], habitat, animal.behaviorState);
        animal.rotationY = Math.atan2(dx, dz);
      } else {
        animal.position = clampPositionToHabitat(animal.position, habitat, animal.behaviorState);
      }
    }
  }

  private transitionAnimalState(
    animal: AnimalInstanceState,
    animalIndex: number,
    habitat: HabitatZoneDescriptor,
    now: number
  ): void {
    const pool = SPECIES_BEHAVIOR_POOL[animal.speciesId];
    const allowedSet = new Set(ANIMAL_SPECIES_CATALOG[animal.speciesId].allowedBehaviors);

    // Filter pool to states distinct from current (or different variant) and strictly allowed for species
    const candidates = pool.filter(
      (c) =>
        allowedSet.has(c.behaviorState) &&
        (c.behaviorState !== animal.behaviorState || c.activityVariant !== animal.activityVariant)
    );

    const seed = hashString(`${animal.animalId}:${this.stepCounter}:${Math.floor(now / 500)}`);
    const chosen =
      candidates[seed % candidates.length] ??
      pool[0] ?? {
        behaviorState: 'Idle',
        activityVariant: 'calm-observe',
        durationMs: 3500,
        speed: 0
      };

    animal.behaviorState = chosen.behaviorState;
    animal.activityVariant = chosen.activityVariant;
    animal.speed = chosen.speed;
    animal.stateStartedAt = now;
    // Add per-animal variation (+0ms to +1400ms) so animals never loop identically (FR-005)
    const durationJitter = ((seed >> 3) % 1400) + animalIndex * 180;
    animal.stateEndsAt = now + chosen.durationMs + durationJitter;

    // Pick a valid waypoint inside the habitat matching the chosen behavior state
    animal.targetPosition = this.pickHabitatWaypoint(
      animal,
      habitat,
      chosen.behaviorState,
      seed
    );
  }

  private pickHabitatWaypoint(
    animal: AnimalInstanceState,
    habitat: HabitatZoneDescriptor,
    behaviorState: AnimalBehaviorState,
    seed: number
  ): [number, number, number] {
    if (behaviorState === 'Idle' || behaviorState === 'Sleeping' || behaviorState === 'Resting') {
      if (habitat.hasWaterZone && habitat.waterCenter && habitat.waterRadius) {
        // Pick a land bank spot near the outer annulus of the habitat
        const angle = ((seed % 360) * Math.PI) / 180;
        const bankRadius = Math.min(
          habitat.radius - HABITAT_BOUNDARY_MARGIN - 0.2,
          habitat.waterRadius + 0.75
        );
        return clampPositionToHabitat(
          [
            habitat.center[0] + Math.cos(angle) * bankRadius,
            0,
            habitat.center[2] + Math.sin(angle) * bankRadius
          ],
          habitat,
          behaviorState
        );
      }
      return clampPositionToHabitat(animal.position, habitat, behaviorState);
    }

    if (behaviorState === 'Eating') {
      const angle = ((seed % 360) * Math.PI) / 180;
      return clampPositionToHabitat(
        [
          habitat.feedingStationPosition[0] + Math.cos(angle) * 0.85,
          0,
          habitat.feedingStationPosition[2] + Math.sin(angle) * 0.85
        ],
        habitat,
        behaviorState
      );
    }

    if (
      behaviorState === 'Swimming' &&
      habitat.hasWaterZone &&
      habitat.waterCenter &&
      habitat.waterRadius
    ) {
      const angle = ((seed % 360) * Math.PI) / 180;
      const radialFactor = 0.25 + ((seed >> 4) % 65) / 100;
      const r = (habitat.waterRadius - 0.4) * radialFactor;
      return clampPositionToHabitat(
        [
          habitat.waterCenter[0] + Math.cos(angle) * r,
          0,
          habitat.waterCenter[1] + Math.sin(angle) * r
        ],
        habitat,
        'Swimming'
      );
    }

    // General Walking / Playing waypoint inside habitat
    const angle = ((seed % 360) * Math.PI) / 180;
    const radialFactor = 0.25 + ((seed >> 5) % 65) / 100;
    const maxR = Math.max(1.0, habitat.radius - HABITAT_BOUNDARY_MARGIN - 0.25);
    const r = maxR * radialFactor;
    return clampPositionToHabitat(
      [
        habitat.center[0] + Math.cos(angle) * r,
        0,
        habitat.center[2] + Math.sin(angle) * r
      ],
      habitat,
      behaviorState
    );
  }
}

