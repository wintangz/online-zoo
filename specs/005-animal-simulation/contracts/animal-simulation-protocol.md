# Contract: Animal Simulation & Multiplayer Synchronization Protocol (Feature 005)

## 1. Client-to-Server Messages

### `TriggerAnimalFeedingMessage`
Sent when a player activates a habitat feeding session (via the Animal Information Panel, Habitat Feeding Station interaction prompt, or HUD feeding button).

```json
{
  "type": "trigger_animal_feeding",
  "habitatId": "habitat-panda-grove"
}
```

**Server Validation Rules (`ZooInstanceAuthority`)**:
1. Sender `sessionId` must be an active member of the instance.
2. `habitatId` must be a valid habitat (`habitat-panda-grove`, `habitat-penguin-cove`, or `habitat-otter-stream`).
3. If the habitat is currently in an active feeding window (`isActive === true`), reject with `{ accepted: false, reason: "already_active" }`.
4. If the habitat is on cooldown (`now < cooldownUntil`), reject with `{ accepted: false, reason: "on_cooldown" }`.
5. When accepted:
   - Set `isActive = true`, `startedAt = now`, `endsAt = now + 12000`, `cooldownUntil = now + 30000`, `triggeredBySessionId = sessionId`, `lastTriggerKind = 'player'`.
   - Transition all animals in `habitatId` to `behaviorState = 'Eating'` with target positions arranged around `habitat.feedingStationPosition`.
   - Broadcast `AnimalFeedingEventMessage` to all connected clients in the instance.

---

## 2. Server-to-Client Messages

### Extended `WelcomeMessage` & `WorldSnapshotMessage`
Both `welcome` and `world_snapshot` include authoritative animal states and habitat feeding states:

```ts
export interface WelcomeMessage {
  // ... existing fields ...
  animals: AnimalInstanceState[];
  habitatFeedings: Record<HabitatId, HabitatFeedingState>;
}

export interface WorldSnapshotMessage {
  // ... existing fields ...
  animals: AnimalInstanceState[];
  habitatFeedings: Record<HabitatId, HabitatFeedingState>;
}
```

### `AnimalFeedingEventMessage`
Broadcast immediately when a player or scheduled timer starts a feeding activity at a habitat:

```json
{
  "type": "animal_feeding_event",
  "habitatId": "habitat-panda-grove",
  "feedingState": {
    "habitatId": "habitat-panda-grove",
    "speciesId": "panda",
    "isActive": true,
    "startedAt": 1762300000000,
    "endsAt": 1762300012000,
    "cooldownUntil": 1762300030000,
    "triggeredBySessionId": "sess-101",
    "lastTriggerKind": "player"
  },
  "animals": [
    {
      "animalId": "panda-bao",
      "speciesId": "panda",
      "displayName": "Bao",
      "habitatId": "habitat-panda-grove",
      "behaviorState": "Eating",
      "activityVariant": "bamboo-munch",
      "position": [9.5, 0, -3.2],
      "targetPosition": [7.2, 0, -2.2],
      "rotationY": -2.1,
      "speed": 1.35,
      "stateStartedAt": 1762300000000,
      "stateEndsAt": 1762300012000
    }
  ]
}
```

---

## 3. UI & Testing Contracts (`packages/ui/src/AnimalSimulationOverlay.tsx`)

- `data-testid="animal-encyclopedia-button"`: Top HUD button displaying `Encyclopedia (X/3)` discovery badge and opening the Animal Encyclopedia modal.
- `data-testid="animal-encyclopedia-modal"`: Modal listing all 3 species (`panda`, `penguin`, `otter`) with `data-testid="encyclopedia-entry-panda"`, `data-testid="encyclopedia-entry-penguin"`, `data-testid="encyclopedia-entry-otter"`.
- `data-testid="animal-info-panel"`: Readable desktop/mobile inspection drawer/panel displaying:
  - `data-testid="animal-info-common-name"`
  - `data-testid="animal-info-behavior-badge"`
  - `data-testid="animal-info-habitat"`
  - `data-testid="animal-info-diet"`
  - `data-testid="animal-info-facts"`
  - `data-testid="animal-trigger-feeding-button"`
  - `data-testid="animal-feeding-status"`
- `data-testid="animal-discovery-toast"`: Non-intrusive notification banner shown when a new species is discovered.
- `data-testid="animal-status-strip"`: Live habitat animal tracker strip on the HUD allowing players and automated E2E tests to see nearby/habitat animals, their live behavior states, and inspect them on desktop or mobile.

