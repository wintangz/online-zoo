# Feature Specification: Events & Activities

**Feature Branch**: `008-events-and-activities`  
**Created**: 2026-11-05  
**Status**: Completed (Converged)  
**Input**: User description: "Feature 008 — Events & Activities: Provide enjoyable group activities and limited-time experiences without making participation mandatory. Introduce scheduled and spontaneous zoo events (feeding sessions, guided tours, group photo events, seasonal decorations & mini-games), shared multi-player participation with capacity limits, one-time Zoo Coin and Passport Stamp rewards, seasonal themes, and safe runtime event configuration."

## Clarifications

### Session 2026-11-05

- **Q1: Which initial activities are included, and where do they take place?** → Five recognizable zoo activities span the Panda Forest sanctuary:
  1. `event-panda-feeding-gala` ("Giant Panda Bamboo Feast", *Animal Feeding*): Hosted at `Misty Bamboo Grove Sanctuary` (`[8.4, 0, 9.2]`), capacity `8` visitors, grants `20 Zoo Coins` + `zone-panda-sanctuary` passport stamp.
  2. `event-penguin-dive-show` ("Glacier Cove Penguin Splash", *Animal Observation*): Hosted at `Glacier Cove Coastal Pool` (`[-8.6, 0, 7.0]`), capacity `8` visitors, grants `20 Zoo Coins` + `zone-penguin-cove` passport stamp.
  3. `event-guided-sanctuary-tour` ("Ranger's Guided Sanctuary Tour", *Guided Tour*): Hosted at `Welcome Plaza & Courtyard` (`[-5.2, 0, 12.6]`), capacity `12` visitors, grants `25 Zoo Coins` + `zone-welcome-plaza` passport stamp.
  4. `event-plaza-group-photo` ("Golden Hour Group Photo", *Community Gathering*): Hosted at `Northern Wind-Chime Lookout` (`[2.5, 0, -9.5]`), capacity `10` visitors, grants `20 Zoo Coins` + `zone-wind-chime-lookout` passport stamp.
  5. `event-lantern-trivia-game` ("Spring Blossom Trivia & Mini-Game", *Seasonal Mini-Game*): Hosted at `Highland Spring & Otter Stream` (`[-2.0, 0, -2.5]`), capacity `8` visitors, grants `25 Zoo Coins` + `zone-lotus-stream` passport stamp.
- **Q2: How are event states, schedules, and administrative updates managed?** → Every event exposes a deterministic lifecycle state (`upcoming`, `active`, or `finished`) with valid start/end timestamps (`startTimeMs < endTimeMs`). At any moment in a zoo instance, active and upcoming events are visible in the **Events & Activities Drawer** and on the HUD banner, and players receive a non-intrusive toast notification when an event is about to begin or becomes active. Event schedules and seasonal themes (`spring-blossom`, `summer-lantern`, `autumn-harvest`, `none`) are driven by a runtime configuration (`ZooEventScheduleConfig`) that can be updated without a new client build (`configure_zoo_events`). Invalid or overlapping event definitions (e.g., `endTimeMs <= startTimeMs` or `maxParticipants <= 0`) are automatically sanitized or rejected safely without disrupting gameplay.
- **Q3: How do shared participation, capacity limits, late joins, and early departures work?** → Visitors can join any `active` event that has available capacity (`participantCount < maxParticipants`). When an event reaches `maxParticipants`, it displays `Event Full` and rejects additional join requests with `EVENT_FULL`. Joining an event never locks player movement; participants see clear activity instructions, live participant counts, and shared group progress (`sharedProgressCount / targetProgress`). Players can join mid-event, contribute an interactive activity step (`perform_event_action`), or leave early (`leave_zoo_event`); disconnecting or leaving immediately frees their participant slot for other visitors.
- **Q4: How are event rewards granted and protected against duplicate claims?** → Participating in and completing an eligible activity step grants the event's `rewardCoins` (`Zoo Coins`), stamps the corresponding `PassportZoneId` in the player's Zoo Passport, and increments `activitiesCompletedCount` (unlocking `ach-keeper-helper`). The authoritative server tracks reward claims per `(playerId, eventInstanceId)` and deduplicates `claim_event_reward` requests by `requestId` so repeated clicks or duplicate network packets never grant extra currency.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Upcoming and Active Zoo Events (Priority: P1)

As a player, I want to see upcoming and active zoo activities—including their title, description, location, status (`Upcoming`, `Active`, `Finished`), and schedule—and receive a non-intrusive notification when an event is starting.

**Why this priority**: Visitors need clear visibility into what is happening around the zoo so they can optionally gather with other players.

**Independent Test**: Open the Events & Activities overlay on desktop or mobile, verify that active and upcoming events display their title, description, location, participant count, and status badge, and verify that starting an event triggers an event notification banner.

**Acceptance Scenarios**:

1. **Given** a player in the zoo, **When** they open the Events & Activities panel, **Then** they see the list of scheduled and active activities with titles, descriptions, locations, schedules, and `Upcoming` / `Active` / `Finished` badges.
2. **Given** an upcoming event transitioning to active (or about to begin), **When** the schedule threshold is reached, **Then** a non-intrusive event notification banner informs visitors where the activity is taking place.

---

### User Story 2 - Join, Participate in, and Leave Shared Multiplayer Activities (Priority: P1)

As a player, I want to join an eligible activity, see clear instructions and shared progress with other visitors, freely move or leave at any time, and receive clear feedback if an activity is full.

**Why this priority**: Shared participation is the core social loop of Feature 008, turning individual exploration into a lively community experience.

**Independent Test**: Connect two players to the same zoo instance, have both join an active event, verify both see the updated participant count and shared activity progress when performing the activity action, verify a full event blocks additional joins with `Event Full`, and verify leaving or disconnecting decrements the participant count cleanly.

**Acceptance Scenarios**:

1. **Given** an active event with open slots, **When** Player A and Player B click `Join Activity`, **Then** both players are added to the participant roster, see clear activity instructions, and see each other's contributions increment the shared activity progress bar.
2. **Given** an active event at maximum capacity (`participantCount === maxParticipants`), **When** another visitor attempts to join, **Then** the UI displays `Event Full` and the server rejects the request with `EVENT_FULL`.
3. **Given** a player participating in an active event, **When** they walk to another area, click `Leave Activity`, or disconnect, **Then** their movement is never blocked and their participant slot is released immediately for other visitors.

---

### User Story 3 - Earn One-Time Event Rewards & Zoo Passport Stamps (Priority: P1)

As a player, I want to receive Zoo Coins and a Zoo Passport zone stamp when I complete an eligible activity, with server-side protection against duplicate reward claims.

**Why this priority**: Connecting events to Feature 006 (Zoo Coins) and Feature 007 (Zoo Passport & Achievements) makes participating feel rewarding while preserving economy integrity.

**Independent Test**: Join an active event, complete the activity interaction, claim the event reward, verify Zoo Coins and the corresponding Zoo Passport zone stamp are awarded once, and verify duplicate reward requests with the same or new `requestId` are rejected without granting extra coins.

**Acceptance Scenarios**:

1. **Given** a participant who has contributed to an active event, **When** they claim the event reward, **Then** the server credits the event's `rewardCoins` to their wallet, stamps the event's zone in their Zoo Passport, and marks the reward as `Claimed`.
2. **Given** a participant who has already claimed the reward for an event instance, **When** duplicate or repeated `claim_event_reward` messages are sent, **Then** the server rejects duplicate payouts (`ALREADY_CLAIMED` / idempotent `requestId` cache) and the player's coin balance remains unchanged.

---

### User Story 4 - Experience Seasonal Decorations & Safe Event Administration (Priority: P2)

As a player, I want to see seasonal decorations and limited-time activities when a seasonal theme is active, and continue enjoying the zoo normally when seasonal content expires or no event is active.

**Why this priority**: Seasonal variety keeps the zoo feeling fresh over time without requiring a world redesign or client rebuild.

**Independent Test**: Switch the active seasonal theme (e.g., `spring-blossom` → `summer-lantern` → `none`) and submit an administrative schedule update containing both valid and invalid event entries; verify seasonal decorations and banners update live and invalid entries are safely ignored without errors.

**Acceptance Scenarios**:

1. **Given** an active seasonal theme (`spring-blossom` or `summer-lantern`), **When** a visitor explores the zoo, **Then** seasonal decorations and a seasonal indicator badge are visible in the world and HUD.
2. **Given** a seasonal theme deactivated (`none`) or an invalid event configuration submitted (`endTimeMs <= startTimeMs`), **When** the server processes the configuration, **Then** invalid entries are safely rejected/sanitized and normal zoo exploration continues uninterrupted.

---

### Edge Cases

- **Event Full Capacity**: When an event reaches `maxParticipants`, the join button is disabled with `Event Full` and server-side validation returns `EVENT_FULL`.
- **Late Joiners & Early Departures**: Players joining mid-activity immediately receive the current `sharedProgressCount` and participant count; players leaving or disconnecting mid-activity do not reset shared group progress.
- **Duplicate Reward Requests**: Re-sending `claim_event_reward` with the same `requestId` returns the cached idempotent response; sending a new `requestId` for the same `(playerId, eventInstanceId)` returns `ALREADY_CLAIMED` with `0` coins granted.
- **Invalid / Overlapping Admin Configs**: Event configurations with `endTimeMs <= startTimeMs`, empty titles, or `maxParticipants < 1` are filtered out by the schedule validator so the server and client never crash.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST provide an Events & Activities catalog and UI displaying upcoming, active, and finished zoo events with title, description, location, schedule, participant count, and reward details.
- **FR-002**: The game MUST display a non-intrusive notification banner when an event is about to begin or transitions to active.
- **FR-003**: The Events & Activities interface MUST be responsive and usable on both desktop and mobile viewports.
- **FR-004**: Players MUST be able to join and leave eligible active events without restricting their normal 3D movement or exploration.
- **FR-005**: Events MUST enforce configurable participation limits (`maxParticipants`) and clearly communicate when an event is full (`EVENT_FULL`).
- **FR-006**: Active events MUST provide clear participant instructions and synchronize shared multi-player activity state (`participantCount`, `sharedProgressCount`, `targetProgress`) across all connected visitors in the instance, handling late joins, early leaves, and disconnects gracefully.
- **FR-007**: Participating in and claiming an eligible event MUST grant the configured one-time reward (`rewardCoins` Zoo Coins, the location's Zoo Passport stamp, and activity achievement progress).
- **FR-008**: The authoritative server MUST validate event reward eligibility and prevent duplicate payouts per `(playerId, eventInstanceId)` and `requestId`.
- **FR-009**: The zoo MUST support toggleable seasonal themes (`spring-blossom`, `summer-lantern`, `autumn-harvest`, `none`) with lightweight 3D seasonal decorations and seasonal activities that can be activated or deactivated safely without breaking normal gameplay.
- **FR-010**: Event schedules, active states, and seasonal themes MUST be runtime-configurable (`configure_zoo_events`) with strict validation of start/end times and capacity limits so schedule updates do not require a new client build.

### Key Entities

- **ZooEventDescriptor**: Static metadata for an activity (`eventId`, `title`, `category`, `description`, `instructions`, `actionLabel`, `locationLabel`, `zoneId`, `position`, `maxParticipants`, `targetProgress`, `rewardCoins`, `icon`, `seasonalTheme`).
- **LiveZooEventState**: Authoritative runtime state for a scheduled/active event instance (`eventId`, `eventInstanceId`, `status`: `'upcoming' | 'active' | 'finished'`, `startTimeMs`, `endTimeMs`, `participantSessionIds`, `participantCount`, `maxParticipants`, `sharedProgressCount`, `targetProgress`).
- **SeasonalThemeId**: Active seasonal ambiance and decoration mode (`'spring-blossom' | 'summer-lantern' | 'autumn-harvest' | 'none'`).
- **PlayerEventParticipationState**: Per-player event state (`joinedEventId`, `contributedEventInstanceIds`, `claimedEventInstanceIds`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001 (Event Discovery & Schedule Clarity)**: 100% of initial events (`5/5`) display their title, description, location, schedule window, and live status (`Upcoming`, `Active`, or `Finished`) on desktop and mobile.
- **SC-002 (Multi-Player Shared Participation & Capacity)**: Multiple connected visitors can join the same active event, see synchronized participant counts and shared activity progress within `200 ms`, leave at any time, and receive an `EVENT_FULL` rejection when capacity is reached.
- **SC-003 (One-Time Event Rewards & Passport Integration)**: Completing an event and claiming its reward credits the exact `rewardCoins` once, stamps the event's Zoo Passport zone, and rejects 100% of duplicate claim requests (`0` extra coins granted).
- **SC-004 (Seasonal Content & Safe Runtime Administration)**: Seasonal themes (`spring-blossom`, `summer-lantern`, `autumn-harvest`, `none`) and runtime event schedule updates apply cleanly without a client rebuild, and 100% of invalid schedule entries (`endTimeMs <= startTimeMs`) are safely rejected without breaking gameplay.
- **SC-005 (Optional Non-Blocking Experience)**: Visitors can freely explore the zoo, observe animals, and socialize whether `0` or multiple events are active, with zero movement locks.

