# Feature Specification: Animal Simulation

**Feature Branch**: `005-animal-simulation`

**Created**: 2026-11-05

**Status**: Completed (Converged)

**Input**: User description: "Feature 005 — Animal Simulation: Introduce believable, lightweight animal behavior and interactive animal discovery for initial species (Panda, Penguin, Otter) with species-specific behaviors, habitat boundaries, animal information inspection, encyclopedia discovery, feeding activities, and multiplayer consistency."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Natural & Species-Specific Animal Behavior in Habitats (Priority: P1)

As a visitor exploring the zoo, I want to see animals (Pandas, Penguins, and Otters) moving naturally within their designated habitats and performing varied, species-appropriate activities so that the zoo feels alive and engaging to watch without requiring player control.

**Why this priority**: Living, believable animals are the centerpiece of a zoo experience. Replacing static figures with autonomous, species-distinct animal behaviors provides immediate intrinsic value to every visitor entering the world.

**Independent Test**: Can be independently tested by entering the zoo and observing the Panda, Penguin, and Otter habitats over a 2-minute period to verify that each animal autonomously transitions between valid species-specific states, stays strictly inside its habitat bounds, avoids obstacles, and displays varied animations/activities.

**Acceptance Scenarios**:

1. **Given** a visitor is observing the Giant Panda habitat, **When** time progresses without player intervention, **Then** the Pandas autonomously transition between Panda-appropriate states (`Idle`, `Walking`, `Eating` bamboo, `Sitting`/`Resting`, `Sleeping`, and `Playing`/rolling) while remaining inside the Panda enclosure boundaries.
2. **Given** a visitor is observing the Penguin cove/habitat, **When** time progresses, **Then** the Penguins autonomously perform Penguin-appropriate behaviors (`Walking`, coordinated group movement, `Swimming` in water zones, sliding/`Playing`, and `Resting` on rocks/ledges) without clipping through rocks or perimeter fences.
3. **Given** a visitor is observing the Otter stream/pond habitat, **When** time progresses, **Then** the Otters autonomously transition between `Swimming`, `Playing`, `Resting` on the bank, and moving between land and water habitat zones.
4. **Given** multiple animals of the same species share a habitat, **When** they execute behavior loops, **Then** individual timing and target waypoints vary so animals do not loop identical synchronized animations continuously (except during intentional Penguin group movement).

---

### User Story 2 - Multiplayer-Consistent Animal Observation (Priority: P1)

As a visitor exploring the zoo alongside other players, I want everyone observing the same animal to see consistent animal positions and behavior states so we can share reactions and talk about what an animal is doing right now.

**Why this priority**: In a social multiplayer zoo, visitors naturally comment on animal antics ("Look, the panda is rolling!" or "The penguins are swimming together!"). If two visitors standing side-by-side see completely different animal states or locations, the shared social illusion breaks.

**Independent Test**: Can be independently tested by connecting two player sessions to the same zoo instance, standing near the same habitat, and verifying that both sessions report the same active behavior state and compatible world positions for every animal, including after one session experiences a brief network interruption.

**Acceptance Scenarios**:

1. **Given** two visitors are connected to the same zoo instance and observing the same animal, **When** the animal transitions to a new behavior state (e.g., from `Walking` to `Eating` or `Sleeping`), **Then** both visitors see the same behavior state and target trajectory within 200 milliseconds.
2. **Given** a new visitor joins an active zoo instance, **When** their session initializes, **Then** they immediately receive the current authoritative state, position, and active feeding status of all zoo animals matching existing visitors.
3. **Given** a visitor experiences a temporary network interruption and reconnects, **When** synchronization resumes, **Then** animal positions and behavior states smoothly reconcile to the instance state without permanently freezing or breaking animations.

---

### User Story 3 - Animal Information Inspection (Priority: P2)

As a visitor curious about wildlife, I want to approach an animal (or its habitat observation area) and open a readable animal information panel on desktop or mobile to learn its common name, habitat, diet, and fun facts without taking control of the animal.

**Why this priority**: Educational discovery complements visual observation and gives visitors meaningful interaction when approaching enclosures across both desktop and mobile devices.

**Independent Test**: Can be independently tested by approaching each of the three species (Panda, Penguin, Otter) on both desktop and mobile viewports, triggering the inspection prompt or tapping/clicking the animal, and verifying that the species-specific information panel opens with complete details while the animal continues its natural behavior.

**Acceptance Scenarios**:

1. **Given** a player approaches within observation range of a Panda, Penguin, or Otter (or taps/clicks on the animal), **When** the player activates the "Inspect Animal" prompt, **Then** a readable Animal Information Panel opens displaying the species' common name, habitat description, diet, current live behavior state, and educational facts.
2. **Given** the Animal Information Panel is open on either a desktop screen or a mobile touchscreen, **When** the player views the panel, **Then** all text fits cleanly within its container without clipping or horizontal overflow, and the animal continues its autonomous simulation in the background.

---

### User Story 4 - Animal Discovery & Encyclopedia Collection (Priority: P2)

As an explorer in the zoo, I want to discover animal species naturally by observing them in person and have my discoveries recorded in a personal Animal Encyclopedia that clearly distinguishes discovered and undiscovered species.

**Why this priority**: An encyclopedia collection rewards exploration across all habitats in the zoo and gives players a persistent sense of accomplishment across visits.

**Independent Test**: Can be independently tested by opening the Animal Encyclopedia as a fresh visitor (seeing 0/3 discovered species with undiscovered silhouettes/placeholders), approaching or inspecting a Panda, Penguin, and Otter one by one, and verifying that each discovery is recorded, celebrated with a non-intrusive notification, and persisted across browser reloads.

**Acceptance Scenarios**:

1. **Given** a player has not yet observed the Otter species, **When** they open their Animal Encyclopedia, **Then** the Otter entry is shown as "Undiscovered" with a mystery indicator and habitat hint rather than full unlocked details.
2. **Given** a player approaches within discovery range of an undiscovered animal species (or inspects it for the first time), **When** observation occurs, **Then** the species is marked as "Discovered" in the player's Animal Encyclopedia, a discovery toast/badge notifies the player, and the unlocked entry displays full species information and observation status.
3. **Given** a player has discovered one or more animal species, **When** they leave the zoo and return in a later session, **Then** their previously discovered species remain unlocked in the Animal Encyclopedia.

---

### User Story 5 - Interactive & Scheduled Animal Feeding Sessions (Priority: P3)

As a visitor, I want to watch or trigger scheduled/cooldown-governed animal feeding activities at habitat feeding stations so I can see animals gather and enjoy species-appropriate meals together with other visitors.

**Why this priority**: Feeding sessions create shared social moments where visitors gather around an enclosure to watch animals react and eat together, while cooldown rules ensure players cannot spam or directly puppet the animals.

**Independent Test**: Can be independently tested by approaching a habitat feeding station (Panda Bamboo Feeder, Penguin Fish Bucket, or Otter Shellfish Stream), triggering or observing a feeding session, verifying that animals of that species move toward the feeding zone and enter the `Eating` behavior state for all connected visitors, and confirming that repeat feeding triggers are rate-limited during an active session or cooldown window.

**Acceptance Scenarios**:

1. **Given** a habitat feeding station is ready (not on cooldown), **When** a visitor activates the feeding interaction (or a scheduled feeding window begins), **Then** species-appropriate food appears at the feeding spot and animals in that habitat transition toward the feeding area and enter the `Eating` state.
2. **Given** a feeding session is currently active or in its post-feeding cooldown period, **When** a visitor attempts to trigger another feeding at the same habitat, **Then** the system prevents spamming, displays the remaining cooldown or active feeding status, and does not allow unrestricted control over the animals.
3. **Given** multiple visitors are watching a habitat when a feeding session starts, **When** the feeding event is active, **Then** all connected visitors in the instance see the active feeding event and the animals eating together.

---

### Edge Cases

- **Habitat Boundary & Obstacle Avoidance**: What happens if an animal's wandering target lands near a fence, rock, or water/land transition boundary? Animals are constrained strictly to valid habitat zones (land-only for Pandas, land-and-water zones for Penguins and Otters) and steer away from obstacles and enclosure perimeters so they never walk through fences or escape into visitor walkways.
- **Player-Animal Physical Separation**: What happens when a player attempts to walk into an animal or block its path? Habitat enclosures and collider volumes prevent players from pushing animals out of bounds or trapping them in corners.
- **Rapid Feeding Trigger Attempts**: What happens if multiple players simultaneously attempt to start a feeding session at the same habitat? The authoritative instance accepts only the first valid trigger, transitions the habitat into the active feeding window, and places subsequent triggers on cooldown for all visitors.
- **Inspecting While Moving Away**: What happens if an animal walks further inside its habitat while a player is reading its Animal Information Panel? The open information panel remains readable until closed by the player, updating the animal's live behavior status badge without abruptly closing mid-read.
- **Local Storage Unavailable for Encyclopedia**: What happens if browser storage is restricted when recording a species discovery? Discoveries remain active in memory for the current session and fail gracefully without interrupting gameplay.

## Requirements *(mandatory)*

### Functional Requirements

#### Animal Behavior & Habitat Simulation
- **FR-001**: System MUST include three initial animal species in the zoo world: **Giant Panda**, **Humboldt/Subantarctic Penguin**, and **Asian Small-Clawed River Otter**, with at least 2 individual animals per species (6+ animals total) so group and individual behaviors are observable.
- **FR-002**: Animals MUST support general high-level behavior states including `Idle`, `Walking`, `Eating`, `Sleeping`, `Playing`, `Swimming` (for aquatic/semi-aquatic species), and `Resting`/`Sitting`.
- **FR-003**: Each species MUST exhibit species-appropriate behavior repertoires and transitions:
  - **Panda**: `Walking`, `Eating` bamboo, `Sitting`/`Resting`, `Sleeping`, and `Playing` (rolling/tumbling). Pandas MUST NOT enter `Swimming`.
  - **Penguin**: `Walking` (waddling), coordinated `GroupMovement` (flocking/following a lead penguin), `Swimming`, `Playing` (belly-sliding), and `Resting`.
  - **Otter**: `Swimming`, `Playing` (water/bank play), `Resting`, and `Walking` (moving between land bank and water habitat zones).
- **FR-004**: Animals MUST remain strictly within their designated habitat boundaries and valid surface zones (land vs. water) and MUST NOT walk through habitat walls, rocks, or visitor walkways.
- **FR-005**: Animals MUST operate autonomously on continuous behavior cycles with randomized state durations and waypoint variation so they remain active without player intervention and do not repeat identical synchronized loops.

#### Animal Information & Inspection
- **FR-006**: Players MUST be able to approach any animal habitat or animal within observation range (`<= 7.0` meters) or click/tap an animal to open its Animal Information Panel.
- **FR-007**: Each animal species MUST provide distinct educational content in the Animal Information Panel, including:
  - Common Name and Species/Scientific Name
  - Individual Animal Name & Current Live Behavior State badge
  - Natural Habitat & Zoo Enclosure zone description
  - Diet description
  - At least 3 educational facts per species
- **FR-008**: Animal Information Panels MUST render legibly without text truncation or box overflow on both desktop (`>= 1024px`) and mobile (`<= 768px`) viewports, and inspecting an animal MUST NOT interrupt or control the animal's behavior.

#### Animal Discovery & Encyclopedia
- **FR-009**: System MUST automatically record a species as **Discovered** when a player approaches within discovery range (`<= 8.0` meters) of an animal of that species while playing or inspects the animal for the first time.
- **FR-010**: Players MUST have access to an **Animal Encyclopedia** interface from the HUD showing overall discovery progress (e.g., `X / 3 Species Discovered`) and listing all zoo species.
- **FR-011**: The Animal Encyclopedia MUST visually distinguish **Discovered** species (showing full profile, facts, diet, habitat, and first-discovered timestamp) from **Undiscovered** species (showing a locked/silhouette state and a habitat location hint).
- **FR-012**: Player encyclopedia discoveries MUST persist across browser sessions per player identity.

#### Feeding Activities
- **FR-013**: Each species habitat MUST provide a species-appropriate **Feeding Activity** (Panda Bamboo Feast, Penguin Fish Toss, Otter Clam & Forage Feeding) that can occur both on a periodic schedule and via visitor interaction at the habitat feeding station when available.
- **FR-014**: When a feeding activity starts for a species, animals in that habitat MUST transition toward the feeding spot and enter the `Eating` behavior state for a bounded feeding duration (e.g., 12 seconds), followed by a cooldown window (e.g., 30 seconds) before manual feeding can be triggered again.
- **FR-015**: Player participation in feeding activities MUST be validated by the instance authority so players cannot bypass cooldowns or directly control animal movement.

#### Multiplayer Consistency
- **FR-016**: Animal behavior states, positions, headings, and active habitat feeding states MUST be deterministic or synchronized across the instance authority so all visitors in the same zoo instance observe consistent animal behavior.
- **FR-017**: Temporary network interruptions or reconnections MUST cleanly resynchronize the visitor's view of animal states and feeding activities without permanently freezing animals or desynchronizing behavior.

### Key Entities *(include if feature involves data)*

- **AnimalInstance**: Represents an individual animal living in the zoo, including `animalId`, `speciesId` (`panda`, `penguin`, `otter`), `displayName` (e.g., `"Bao"`, `"Mei"`, `"Piko"`, `"Skipper"`, `"Lumi"`, `"Pip"`), `habitatId`, `behaviorState` (`Idle`, `Walking`, `Eating`, `Sleeping`, `Playing`, `Swimming`, `Resting`), `position`, `targetPosition`, `rotationY`, `stateStartedAt`, and `stateDurationMs`.
- **AnimalSpeciesCatalogEntry**: Static educational and behavioral metadata for each species (`speciesId`, `commonName`, `scientificName`, `habitatName`, `diet`, `conservationStatus`, `facts`, `allowedBehaviors`, `feedingActivityName`, `discoveryHint`).
- **HabitatZone**: Defines the spatial enclosure boundaries (`center`, `radius` or `bounds`, `waterZoneBounds`, `feedingStationPosition`, `obstacleCircles`) constraining animal movement.
- **HabitatFeedingState**: Tracks active feeding sessions and cooldowns per habitat (`habitatId`, `speciesId`, `isActive`, `startedAt`, `endsAt`, `cooldownUntil`, `triggeredBySessionId`).
- **PlayerEncyclopediaState**: Persistent player discovery record mapping `speciesId` to discovery metadata (`discoveredAt`, `observationCount`, `fedCount`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 3 initial species (**Panda**, **Penguin**, **Otter**) are present in dedicated habitat zones and exhibit at least 4 distinct species-appropriate behavior states each during autonomous observation.
- **SC-002**: 100% of simulated animal positions remain strictly inside their designated habitat boundaries and outside obstacle volumes across continuous simulation ticks.
- **SC-003**: Two concurrent visitors connected to the same zoo instance observe matching high-level behavior states and synchronized feeding sessions for all animals within 200 milliseconds.
- **SC-004**: Visitors can open the Animal Information Panel for any of the 3 species on desktop and mobile viewports in under 2 seconds when within observation range, with all common name, habitat, diet, and fact fields clearly visible.
- **SC-005**: Approaching or inspecting each of the 3 species records the discovery in the player's Animal Encyclopedia (`3 / 3 Discovered`), and 100% of unlocked discoveries persist across page reloads.
- **SC-006**: Triggering a habitat feeding session transitions the habitat's animals into the `Eating` state at the feeding station and enforces a cooldown that blocks duplicate triggers until the cooldown expires.
- **SC-007**: Animal simulation maintains smooth gameplay performance and responsiveness alongside existing multiplayer and social features on desktop and mobile browsers.

## Out of Scope

- Animal breeding or life-cycle aging.
- Animal ownership or personal pets.
- Animal combat, predation, or injury.
- Animal trading or marketplace systems.
- Player-controlled animals (mounting, direct WASD control of animals).
- Zoo tycoon/management mechanics (building enclosures, hiring staff, ticket pricing).
- Animal hunger or health decay requiring player maintenance to prevent animal harm.
- Complex multi-species ecological food webs.

## Assumptions

- The existing Panda Forest Sanctuary world is expanded with clearly delineated habitat areas for the Giant Pandas (Bamboo Grove Sanctuary), Penguins (Glacier Cove Pool), and Otters (Lotus & River Stone Stream) so visitors can seamlessly walk between all three habitats in the same shared zoo map.
- Animal simulation runs deterministically/authoritatively at the zoo instance level so all visitors in an instance share the exact same animal state timeline and active feeding sessions.
- Encyclopedia discoveries are stored locally per player identity (matching the persistence pattern used for player profiles and social safety lists) so progress is immediately retained across visits.

