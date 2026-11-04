# Phase 0 Research: Animal Simulation (Feature 005)

## 1. Authoritative Multiplayer Animal Simulation & Offline Fallback

- **Decision**: Run `AnimalSimulationSystem` inside `ZooInstanceAuthority` during each 20 Hz server tick (`stepServerTick`), broadcasting animal states (`animals` and `habitatFeedings`) in `welcome`, `world_snapshot`, and `animal_feeding_event` messages. On the client, `GameLoopController` smoothly steps local visual movement toward the authoritative target/position at 60 FPS and also steps the local `AnimalSimulationSystem` directly if disconnected/offline so temporary network drops never freeze animals (`FR-016`, `FR-017`).
- **Rationale**: Keeps all connected visitors in the same zoo instance 100% synchronized on what every animal is doing (`Idle`, `Walking`, `Eating`, `Sleeping`, `Playing`, `Swimming`, `Resting`) and whether a feeding session is active, while ensuring smooth 60 FPS movement and graceful offline continuity.
- **Alternatives Considered**:
  - Purely client-local random simulation: Rejected because two visitors standing next to each other would see different animal behaviors and positions, violating `FR-016` and `SC-003`.
  - Sending high-frequency individual animal physics frames separate from `world_snapshot`: Rejected because piggypacking compact animal state descriptors onto the existing 20 Hz `world_snapshot` and immediate `animal_feeding_event` messages keeps network overhead minimal.

## 2. Species-Specific Behavior Repertoires & Group Movement

- **Decision**: Model each species with an explicit weighted transition table and activity variants:
  - **Giant Panda (`panda`)**: Land-only habitat (`habitat-panda-grove`). Transitions between `Walking`, `Eating` (`bamboo-munch`), `Resting` (`sit-scratch`), `Sleeping` (`curled-nap`), and `Playing` (`bamboo-roll`). Never enters `Swimming`.
  - **Humboldt Penguin (`penguin`)**: Hybrid land-ledge and water-pool habitat (`habitat-penguin-cove`). Transitions between `Walking` (`waddle`), coordinated group movement (`Walking` with `activityVariant: 'group-waddle'` where follower penguins steer toward formation offsets behind lead penguin `penguin-piko`), `Swimming` (`pool-swim`, constrained to the pool water sub-zone), `Playing` (`belly-slide`), and `Resting` (`ledge-huddle`).
  - **River Otter (`otter`)**: Hybrid stream/pond and bank habitat (`habitat-otter-stream`). Transitions between `Swimming` (`pond-dive` / `stream-swim`), `Playing` (`back-float` / `water-tumble`), `Resting` (`sun-bask` on mossy bank), and `Walking` (`bank-scurry` moving between land bank and water zones).
- **Rationale**: Directly fulfills all species-specific requirements in `FR-002` and `FR-003` while ensuring visual variety (`FR-005`) through per-animal seeded phase offsets and activity variants.
- **Alternatives Considered**:
  - Generic identical wandering state for all species: Rejected because the specification explicitly requires species-appropriate activities (Panda bamboo eating/rolling, Penguin group movement/sliding/swimming, Otter swimming/playing/land-water transitions).

## 3. Habitat Boundary & Obstacle Avoidance

- **Decision**: Define each habitat as a `HabitatZoneDescriptor` with a center `[x, y, z]`, outer enclosure radius, optional inner water zone circle (`waterCenter`, `waterRadius`), feeding station coordinates, and local obstacle circles. Both waypoint generation and per-tick position integration clamp positions inside `habitat.radius - margin` and push animals smoothly around obstacle circles, while constraining `Swimming` waypoints to `waterZone` and land states (`Sleeping`, `Resting`, Panda `Walking`) to valid land coordinates.
- **Rationale**: Mathematically guarantees 100% compliance with `FR-004` and `SC-002` (animals never leave habitat boundaries or walk through obstacles).
- **Alternatives Considered**:
  - Relying solely on dynamic Rapier rigid-body collisions for animals: Rejected because authoritative simulation runs in headless `game-core` (`ZooInstanceAuthority`) where deterministic 2D circle/annulus spatial clamping is faster, simpler, and 100% reproducible in unit tests.

## 4. Natural Discovery, Encyclopedia Persistence & Feeding Sessions

- **Decision**:
  - **Discovery**: Each frame in `GameLoopController`, evaluate horizontal distance from the local player avatar to all animals. When the player comes within `8.0m` of an animal (or opens its Animal Information Panel / triggers feeding), automatically unlock that `speciesId` in `gameStore` and persist to `localStorage` (`online-zoo:animal-encyclopedia:v1`), triggering a non-intrusive discovery notification toast (`FR-009`–`FR-012`).
  - **Feeding Sessions**: Each habitat has an active feeding duration of `12,000 ms` and a total cooldown of `30,000 ms` from trigger start (plus automatic scheduled feedings every `90,000 ms` if idle). When triggered, all animals in that habitat steer to radial slots around the habitat's feeding station and enter `Eating` (`FR-013`–`FR-015`).
- **Rationale**: Rewards natural exploration around the zoo map and creates shared social moments at habitat feeding stations without allowing players to spam or directly control animals.
- **Alternatives Considered**:
  - Requiring manual photo-capture mini-games to discover animals: Rejected to keep discovery lightweight and natural through exploration and observation.

