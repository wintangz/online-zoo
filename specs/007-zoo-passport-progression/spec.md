# Feature Specification: Zoo Passport & Progression

**Feature Branch**: `007-zoo-passport-progression`  
**Created**: 2026-11-05  
**Status**: Completed (Converged)  
**Input**: User description: "Feature 007 — Zoo Passport & Progression: Reward exploration and discovery without turning the game into a grind or requiring daily engagement. Introduce a personal Zoo Passport with zone stamps, an integrated Animal Encyclopedia, meaningful achievements across exploration/discovery/social/activity categories, one-time Zoo Coin and cosmetic badge rewards protected against duplicate claims, and non-intrusive overall progress visibility."

## Clarifications

### Session 2026-11-05

- **Q1: Which zoo zones grant stamps in the Zoo Passport, and how are zone visits detected?** → The Zoo Passport tracks 5 distinct zones across the Panda Forest sanctuary:
  1. `zone-welcome-plaza` ("Welcome Plaza & Refreshment Courtyard") — Center `[-5.2, 0, 12.6]`, radius `4.2 m` (the courtyard housing the Refreshment Kiosk and Umbrella Cafe Table).
  2. `zone-panda-sanctuary` ("Misty Bamboo Grove Sanctuary") — Center `[8.4, 0, 9.2]`, radius `6.0 m` (the eastern bamboo terrace and Giant Panda lookout).
  3. `zone-penguin-cove` ("Glacier Cove Coastal Pool") — Center `[-8.6, 0, 7.0]`, radius `6.0 m` (the western rocky ledges and Penguin Cove pool).
  4. `zone-lotus-stream` ("Highland Spring & Otter Stream") — Center `[-2.0, 0, -2.5]`, radius `6.0 m` (the central Lotus Pond shoreline and River Otter stream).
  5. `zone-wind-chime-lookout` ("Northern Wind-Chime Lookout") — Center `[2.5, 0, -9.5]`, radius `6.5 m` (the northern bamboo trail between the Wind-Chime Pavilion and Scenic Overlook).
  Each zone has a distinct stamp emblem, title, color theme, and exploration hint. All 5 stamps start unobtained (`0/5`) at the initial spawn gate (`[0, 0.1, 18]`) and unlock automatically as the visitor walks within the zone's discovery radius.
- **Q2: What achievements are available, and what rewards do they grant?** → Six achievements span four meaningful activity categories:
  1. `ach-first-stamp` ("First Footsteps", *Exploration*): Collect 1 Zoo Passport zone stamp → Grants `15 Zoo Coins` + `"Trailblazer"` passport badge.
  2. `ach-world-explorer` ("Master Cartographer", *Exploration*): Collect all 5 Zoo Passport zone stamps → Grants `50 Zoo Coins` + `"Park Ranger"` passport badge.
  3. `ach-first-animal` ("Curious Naturalist", *Animal Discovery*): Discover 1 animal species in the Animal Encyclopedia → Grants `15 Zoo Coins` + `"Field Spotter"` passport badge.
  4. `ach-zoologist` ("Sanctuary Zoologist", *Animal Discovery*): Discover all 3 animal species (`Panda`, `Penguin`, `Otter`) → Grants `40 Zoo Coins` + `"Master Zoologist"` passport badge.
  5. `ach-social-greeting` ("Friendly Visitor", *Social Interaction*): Send a proximity chat message, perform an emote, or sit with visitors → Grants `15 Zoo Coins` + `"Warm Welcomer"` passport badge.
  6. `ach-keeper-helper` ("Sanctuary Enthusiast", *Activities*): Participate in an animal habitat feeding session or enjoy a zoo food/drink item → Grants `20 Zoo Coins` + `"Sanctuary Gourmand"` passport badge.
- **Q3: How are achievement rewards granted and protected against duplicate claims?** → When an achievement's condition is met, it is marked `unlocked` (`unlockedAt` timestamp) and triggers a celebratory toast notification. Players can claim the reward for any unlocked achievement. The authoritative server (`ZooInstanceAuthority` and `apps/web/server.mjs`) validates that the achievement is unlocked and has not yet been claimed by that player, deduplicates `claim_achievement_reward` requests by `requestId` and `achievementId`, credits the exact `rewardCoins` to the player's authoritative Zoo Coins balance once and only once, records the cosmetic badge in `earnedBadges`, and returns `achievement_reward_result` so both the dining wallet (`online-zoo:dining-wallet:v1`) and passport state (`online-zoo:passport-progression:v1`) persist across sessions.
- **Q4: How is overall exploration progress calculated and displayed without feeling like a mandatory quest?** → Overall exploration progress is computed as the percentage of completed collection milestones across the 5 Zone Stamps, 3 Animal Encyclopedia Species, and 6 Achievements (`14` total milestones, `0%`–`100%`). A compact, optional **Passport** button on the HUD displays the current progress summary, while full details (Stamps, Encyclopedia, and Achievements) live inside the toggleable **Zoo Passport Modal** (`P` shortcut or HUD button) with zero mandatory prompts, timers, or movement locks.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Collect Zoo Zone Stamps in a Personal Passport (Priority: P1)

As a player exploring the zoo, I want a personal Zoo Passport that displays the zoo's regions and automatically stamps each region with a recognizable emblem when I visit it, saving my stamps across sessions.

**Why this priority**: Zone stamps turn freeform walking around the 3D zoo into a rewarding sense of place and discovery.

**Independent Test**: Can be fully tested by opening the Zoo Passport after entering the world (`0/5` stamps obtained), walking into `Welcome Plaza` or `Misty Bamboo Grove Sanctuary`, verifying the stamp toast and obtained stamp emblem appear in the Passport, reloading the browser, and confirming the obtained stamp persists.

**Acceptance Scenarios**:

1. **Given** a new player enters the zoo at the spawn gate, **When** they open the Zoo Passport, **Then** all 5 zoo zones are displayed with clear unobtained stamp placeholders and exploration hints.
2. **Given** a player walks into an unvisited zoo zone (such as `Welcome Plaza` or `Misty Bamboo Grove Sanctuary`), **When** they cross into the zone's boundary, **Then** the corresponding zone stamp is immediately recorded with its recognizable emblem and timestamp, and a non-intrusive toast notifies the player.
3. **Given** a player has collected one or more zone stamps, **When** they reload the page and re-enter the zoo, **Then** all previously obtained zone stamps remain saved and clearly distinguished from unobtained stamps.

---

### User Story 2 - Review Discovered Species in the Animal Encyclopedia (Priority: P1)

As a player, I want to record animals I have discovered through natural exploration and review their common name, habitat, diet, and facts at any time in the Animal Encyclopedia, with undiscovered species shown as unknown entries.

**Why this priority**: Connects living animal habitats directly to long-term player progression and educational discovery.

**Independent Test**: Can be tested by viewing the Animal Encyclopedia (via the HUD Encyclopedia button or the Encyclopedia tab inside the Zoo Passport), verifying undiscovered species appear as unknown entries with discovery hints, approaching or inspecting an animal to record its discovery, and verifying its full educational entry is unlocked and persisted.

**Acceptance Scenarios**:

1. **Given** a player opens the Animal Encyclopedia before discovering all animals, **When** they view the species list, **Then** discovered species show full educational details (common name, scientific name, habitat, diet, and facts) while undiscovered species are clearly marked as `Undiscovered` / unknown entries with a habitat hint.
2. **Given** a player approaches or inspects an animal in the world, **When** the species is discovered, **Then** both the Animal Encyclopedia and the Zoo Passport progression summary immediately reflect the discovery and persist it across sessions.

---

### User Story 3 - Unlock Achievements & Claim One-Time Rewards Safely (Priority: P1)

As a player, I want to earn achievements for meaningful exploration, animal discovery, social interaction, and zoo activities, and claim one-time Zoo Coin and cosmetic badge rewards without duplicate-claim exploits or pay-to-win mechanics.

**Why this priority**: Achievements celebrate milestones across all core systems (exploring, observing animals, socializing, dining/feeding) and reward players with Zoo Coins they can spend at food stalls.

**Independent Test**: Can be tested by completing an achievement condition (e.g., collecting a zone stamp, discovering a species, sending a chat/emote, or feeding/dining), verifying the achievement unlocks with a notification toast, clicking `Claim Reward` to receive the exact Zoo Coins and badge, and verifying that duplicate claim requests never grant coins a second time.

**Acceptance Scenarios**:

1. **Given** a player views the Achievements section of the Zoo Passport, **When** they inspect each achievement, **Then** its title, category (`Exploration`, `Animal Discovery`, `Social Interaction`, `Activities`), completion condition, progress counter, and reward (`Zoo Coins` and cosmetic badge) are clearly displayed.
2. **Given** a player satisfies the condition for an achievement, **When** the milestone is reached, **Then** the achievement transitions to `Unlocked`, a toast notification appears, and its reward becomes claimable.
3. **Given** a player claims an unlocked achievement reward, **When** the server processes the claim, **Then** the player's Zoo Coins balance increases by the exact reward amount, the cosmetic badge is added to their passport, and the achievement is marked `Claimed`.
4. **Given** an achievement reward has already been claimed (or duplicate claim packets with the same `requestId` / `achievementId` are sent), **When** the server evaluates the request, **Then** it rejects or deduplicates the request so currency is never granted more than once.

---

### User Story 4 - View Optional Exploration Progress Without Mandatory Objectives (Priority: P2)

As a player, I want to view my overall exploration progress across zone stamps, animal discoveries, and achievements in a clean interface while remaining completely free to explore the zoo without mandatory quests or interruptions.

**Why this priority**: Ensures progression enhances the relaxing social atmosphere rather than cluttering the screen or forcing linear tasks.

**Independent Test**: Can be tested by checking the HUD Passport indicator and the Passport overview header as stamps, species discoveries, and achievements are earned, confirming the overall progress percentage updates accurately while player movement and world interactions remain unrestricted at all times.

**Acceptance Scenarios**:

1. **Given** a player is exploring the zoo, **When** they glance at the HUD or open the Zoo Passport, **Then** they can see their overall exploration progress percentage and milestone counts (`Stamps`, `Species`, `Achievements`) without any intrusive quest arrows, timers, or locked areas.
2. **Given** a player ignores the Zoo Passport completely, **When** they walk, chat, sit, observe animals, and dine with friends, **Then** all gameplay systems work normally without any forced progression gates.

---

### Edge Cases

- **Duplicate / Rapid Reward Claim Requests**: If a player rapidly clicks the `Claim Reward` button or resends a `claim_achievement_reward` packet for an already-claimed achievement, the server MUST reject or deduplicate the request (`ALREADY_CLAIMED` or cached `requestId` result) and NEVER increment Zoo Coins more than once per achievement.
- **Claiming a Locked Achievement**: If a client attempts to claim a reward for an achievement whose completion condition has not been met (`ACHIEVEMENT_LOCKED`), the server MUST reject the claim and grant `0` Zoo Coins.
- **Re-Entering an Already-Stamped Zone**: Walking in and out of a zone that has already been stamped MUST NOT trigger duplicate stamp toasts or reset the original `stampedAt` timestamp.
- **Corrupted or Out-of-Bounds Local Storage**: If `online-zoo:passport-progression:v1` contains malformed JSON or unknown zone/achievement IDs, the persistence loader MUST sanitize the state and preserve valid entries or fall back cleanly without crashing.
- **Cross-Feature Synchronization**: Discovering an animal via Feature 005 (`inspectAnimal` or proximity discovery) MUST automatically update the `ach-first-animal` and `ach-zoologist` achievements and overall Passport progress without requiring a page reload.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Each player MUST have a personal Zoo Passport accessible from the HUD (`hud-passport-btn`) or keyboard shortcut (`P`) on desktop and mobile.
- **FR-002**: The Zoo Passport MUST display all 5 zoo zones (`zone-welcome-plaza`, `zone-panda-sanctuary`, `zone-penguin-cove`, `zone-lotus-stream`, `zone-wind-chime-lookout`) with recognizable stamp emblems, titles, descriptions, and discovery hints.
- **FR-003**: Visiting an eligible zone MUST automatically grant that zone's stamp, record its `stampedAt` timestamp, and display a non-intrusive discovery notification.
- **FR-004**: Obtained zone stamps MUST clearly differ visually from unobtained stamps and MUST persist across browser sessions (`localStorage` key `online-zoo:passport-progression:v1` and server session state).
- **FR-005**: The game MUST provide an Animal Encyclopedia (accessible both directly from the HUD and as a tab inside the Zoo Passport) that records discovered species (`panda`, `penguin`, `otter`), displays their common name, scientific name, habitat, diet, and facts, and displays undiscovered species as unknown entries with discovery hints.
- **FR-006**: The system MUST support achievements across 4 categories (`exploration`, `animal_discovery`, `social`, `activity`) with clear completion conditions and progress tracking (`ach-first-stamp`, `ach-world-explorer`, `ach-first-animal`, `ach-zoologist`, `ach-social-greeting`, `ach-keeper-helper`).
- **FR-007**: When an achievement's completion condition is met, the achievement MUST unlock immediately, remain recorded across sessions, and display understandable feedback to the player.
- **FR-008**: Unlocked achievements MUST allow the player to claim their designated reward (`rewardCoins` Zoo Coins and `rewardBadge` commemorative passport badge).
- **FR-009**: Achievement rewards MUST be validated server-side and granted at most once per achievement; duplicate claim requests MUST be rejected or deduplicated without granting additional currency.
- **FR-010**: Rewards and progression MUST be purely exploratory/cosmetic + standard Zoo Coins (for zoo refreshments) with zero pay-to-win advantages, daily login timers, or mandatory grind.
- **FR-011**: The Zoo Passport and HUD MUST display the player's overall exploration progress (milestone counts and completion percentage across stamps, species, and achievements) without blocking or interrupting normal exploration.

### Key Entities

- **PassportZoneDescriptor**: Static definition of a zoo zone (`zoneId`, `name`, `subtitle`, `description`, `hint`, `stampLabel`, `stampIcon`, `accentColor`, `center`, `radius`).
- **ZoneStampRecord**: Player's progress for a specific zone (`zoneId`, `obtained`, `stampedAt`).
- **AchievementDescriptor**: Static definition of an achievement (`achievementId`, `title`, `category`, `description`, `targetCount`, `rewardCoins`, `rewardBadge`, `icon`).
- **AchievementProgressRecord**: Player's state for an achievement (`achievementId`, `progressCount`, `unlocked`, `unlockedAt`, `claimed`, `claimedAt`).
- **PlayerPassportState**: Persisted player progression model (`schemaVersion: 1`, `stamps`, `achievements`, `earnedBadges`, `activeBadge`, `updatedAt`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of players have a persistent Zoo Passport displaying all 5 zoo zones, and entering any zone within its discovery radius grants the corresponding stamp within `500 ms`.
- **SC-002**: 100% of obtained zone stamps, discovered animal species, unlocked achievements, claimed status, and earned badges persist across browser reloads.
- **SC-003**: 100% of discovered species display their full educational details in the Animal Encyclopedia while undiscovered species display as unknown entries.
- **SC-004**: 100% of the 6 achievements unlock automatically as soon as their completion condition is satisfied and display a clear unlock notification.
- **SC-005**: 100% of valid achievement reward claims credit the exact `rewardCoins` to the player's Zoo Coins balance once and only once, while 100% of duplicate or unauthorized claim requests grant `0` additional coins.
- **SC-006**: Overall exploration progress (`0%`–`100%`) is visible in the Zoo Passport and HUD while keeping all movement, social, animal, and dining interactions 100% optional and unobstructed.

