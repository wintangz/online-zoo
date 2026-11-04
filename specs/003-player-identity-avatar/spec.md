# Feature Specification: Player Identity & Avatar

**Feature Branch**: `003-player-identity-avatar`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Create the specification for Feature 003: Player Identity & Avatar. Introduce persistent player identity and basic avatar customization so visitors can recognize themselves and other players."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Establish Persistent Identity, Display Name, and Default Avatar (Priority: P1)

A player enters the Online Zoo and immediately receives a persistent player identity with a unique internal identifier (`playerId`), a valid default display name (e.g., `"Explorer #NNN"` until customized), and a complete default 3D avatar so the game is immediately playable without a mandatory blocking signup wall. The player can open the Identity & Wardrobe panel at any time to set or update their chosen display name, which is validated against formatting and moderation rules, saved across browser visits, and displayed above their avatar in the 3D world.

**Why this priority**: Persistent player identity (`playerId` + validated display name) and a playable default avatar are the foundational prerequisites for personal recognition, customization persistence, and social visibility across sessions.

**Independent Test**: Launch the game in a fresh browser profile, verify the player immediately enters or can enter the Panda Forest with a persistent `playerId` and default Explorer avatar, set a valid custom display name (e.g., `"BambooRanger"`), reload the browser, and verify both the `playerId` and custom display name are restored and shown on the player's HUD and overhead 3D nameplate.

**Acceptance Scenarios**:

1. **Given** a first-time visitor opens Online Zoo without prior saved profile data, **When** the application initializes, **Then** the player is assigned a unique persistent internal identifier (`playerId`), a default display name, and the default stylized 3D Explorer avatar so they can play immediately.
2. **Given** a player opens the Identity & Avatar customization panel, **When** they enter a valid display name (`3–16` characters, allowed characters, passing moderation rules) and confirm their changes, **Then** their display name is updated on their overhead 3D nameplate, reflected in the HUD, and saved persistently across future visits.
3. **Given** a player has previously saved a display name and persistent identity, **When** they close and reopen the browser or return to the zoo later, **Then** their saved `playerId` and display name are automatically restored without requiring re-entry.

---

### User Story 2 - Customize, Preview, Confirm, Cancel, and Reset Avatar Appearance (Priority: P2)

A player opens the Identity & Avatar customization studio (accessible from both the title/entry screen and in-world HUD) and customizes their avatar across all five appearance categories: **Body / Skin Color**, **Hairstyle**, **Hair Color**, **Outfit**, and **Accessories**. As the player cycles through options, an interactive live preview immediately displays the draft appearance. The player can **Confirm & Save** to apply and persist the look, **Cancel** to discard unsaved draft changes and restore their previously confirmed look, or **Reset to Default** to return to the classic Explorer appearance.

**Why this priority**: Expressive visual customization with safe preview/cancel/reset controls delivers the core user value of self-expression and ensures players can experiment freely before committing changes.

**Independent Test**: Open the Avatar Customizer, change skin color, hairstyle, hair color, outfit, and accessory while observing the live preview; click **Cancel** and verify the in-world avatar retains its previous appearance; reopen the customizer, select new values across all five categories, click **Confirm & Save**, reload the page, and verify all five customized categories persist and render on the 3D avatar.

**Acceptance Scenarios**:

1. **Given** a player has opened the Avatar Customizer panel, **When** they select different options for Body/Skin Color, Hairstyle, Hair Color, Outfit, or Accessories, **Then** the avatar preview updates immediately to reflect the selected combination before saving.
2. **Given** a player has modified appearance options or their display name in the preview state, **When** they select **Cancel** (or close without confirming), **Then** all uncommitted draft edits are discarded and the player's active avatar and display name remain unchanged.
3. **Given** a player has selected valid customization options across one or more appearance categories, **When** they select **Confirm & Save**, **Then** the new appearance is applied to their 3D avatar, persisted across sessions, and remains intact when leaving and returning to the zoo.
4. **Given** a player wants to start over or change their look later, **When** they reopen the customizer and select **Reset to Default** followed by **Confirm & Save**, **Then** their avatar appearance resets to the canonical default Explorer look.

---

### User Story 3 - Real-Time Multiplayer Synchronization of Identity and Avatar Appearance (Priority: P3)

When multiple players share the same Panda Forest zoo instance, each visitor sees every other player's customized 3D avatar appearance (skin color, hairstyle, hair color, outfit, and accessory) and chosen display name above their avatar in the world—both upon initially joining an already populated instance and dynamically in real time whenever a connected visitor confirms an updated appearance or display name in-game.

**Why this priority**: In a multiplayer social zoo, personal identity and avatar customization only fulfill their social purpose when other visitors accurately see your name and customized appearance in real time.

**Independent Test**: Open two browser sessions in the same Panda Forest instance; customize Player A's display name (`"PandaScout"`), hairstyle, hair color, outfit, and accessory and click **Confirm & Save**; verify that Session B immediately renders Player A's overhead nameplate as `"PandaScout"` and updates Player A's 3D avatar meshes/colors to match all five appearance attributes.

**Acceptance Scenarios**:

1. **Given** Player A with a saved custom display name and customized avatar is exploring a zoo instance, **When** Player B joins the same instance, **Then** Player B's initial world snapshot renders Player A's exact customized avatar appearance and overhead display name.
2. **Given** Player A and Player B are both connected to the same zoo instance, **When** Player A opens the customizer, changes their display name or avatar appearance, and clicks **Confirm & Save**, **Then** Player B sees Player A's overhead nameplate and 3D avatar update in near real time without either player needing to reload or rejoin.
3. **Given** Player A ismerely previewing unconfirmed draft changes inside the customizer, **When** Player A has not yet clicked **Confirm & Save**, **Then** Player B continues to see Player A's last confirmed appearance until confirmation occurs.

---

### User Story 4 - Authoritative Validation and Moderation of Names and Appearance Values (Priority: P4)

To keep the social zoo welcoming, safe, and visually consistent, both client UI and the multiplayer instance authority validate all display names and avatar customization payloads. Display names that violate length, character, or profanity/moderation rules are rejected with clear user-facing feedback, and unsupported or tampered appearance option IDs are rejected or sanitized to valid catalog defaults so no client can inject broken visuals or offensive names into a shared instance.

**Why this priority**: Constitution Principles III (Multiplayer Correctness) and VI (Security and Player Safety) require server-side validation of all player-submitted identity and appearance data.

**Independent Test**: Attempt to save an empty name, a 1-character name, a 25-character name, a name with prohibited special characters (`"<script>"`), or a blocked profanity term in the UI and verify the save is blocked with a clear validation message; then submit a malformed or out-of-catalog appearance payload over the multiplayer protocol and verify the instance authority rejects or sanitizes it before broadcasting to other players.

**Acceptance Scenarios**:

1. **Given** a player is editing their display name in the customization UI, **When** they enter a name that is too short (`< 3` chars), too long (`> 16` chars), contains disallowed characters, or matches the moderation blocklist, **Then** the UI prevents confirmation and displays a specific, understandable validation message.
2. **Given** a client connects to a multiplayer instance or sends an identity/avatar update over the network, **When** the payload contains an invalid/unmoderated display name or unsupported appearance option IDs outside the curated catalog, **Then** the instance authority rejects the invalid update (or falls back to safe validated defaults on initial join) and never broadcasts unvalidated names or appearance values to other visitors.

---

### Edge Cases

- **Corrupted or Outdated Saved Profile Data**: If a returning player's locally stored identity or avatar configuration contains missing fields or unrecognized option IDs (e.g., from an older schema version or manual storage tampering), the system preserves valid fields (such as `playerId`) and cleanly falls back to default catalog values for any invalid attributes without crashing.
- **Unconfirmed Draft Changes During Network Reconnection**: If a temporary network drop and automatic reconnection occur while the player has the Avatar Customizer open with unsaved draft changes, the reconnection handshake transmits the player's last **confirmed** identity and appearance while preserving the player's local preview draft uninterrupted in the UI.
- **Duplicate Display Names in the Same Instance**: Because display names are chosen freely without requiring global account registration, if two concurrent visitors in the same zoo instance have chosen the exact same display name (e.g., `"Alex"`), the instance keeps their unique `playerId`s distinct and appends a non-intrusive session discriminator (e.g., `"Alex #2"`) to the colliding visitor's in-world overhead badge while preserving their saved base display name.
- **Movement Lock While Typing Display Name**: When the player focuses the display name text input inside the customization panel, keyboard movement shortcuts (`W`, `A`, `S`, `D`, `Q`, `R`, `E`, `Space`, `Shift`) are suppressed from driving the 3D avatar in the background so typing letters like `"W"` or `"Space"` does not walk or jump the character across the zoo.
- **First-Time Play Without Opening Customizer**: A player who enters the zoo and never opens or interacts with the customization UI has a complete, visually cohesive default Explorer avatar and valid visitor display name across both single-player and multiplayer modes.

## Clarifications

### Session 2026-11-04

- Q: How should persistent player identity be established and stored without full account authentication (which is out of scope)? → A: Automatically generate a persistent unique `playerId` (`UUID v4`) on first visit and persist the confirmed `PlayerIdentityProfile` (including `playerId`, `displayName`, `customized` flag, and `AvatarAppearance`) in durable browser storage (`localStorage` key `online-zoo:player-identity:v1`), synchronized and validated by the multiplayer instance authority on join and on profile update.
- Q: What exact validation and moderation rules must display names satisfy? → A: Trimmed length between `3` and `16` characters (`^[A-Za-z0-9][A-Za-z0-9 _-]{1,14}[A-Za-z0-9]$` with no consecutive spaces), plus a deterministic case-insensitive and leetspeak-normalized moderation filter blocking profanity, slurs, and impersonation/reserved system terms (`admin`, `moderator`, `system`, `staff`).
- Q: What specific appearance categories and curated options should be included in the stylized 3D catalog? → A: Five strictly enumerated categories shared between client and server: `skinTone` (`6` options: `warm-ivory`, `golden-sand`, `amber-tan`, `rich-sienna`, `deep-umber`, `bamboo-sage`), `hairstyle` (`4` 3D styles: `explorer-bob`, `sun-spiky`, `bamboo-ponytail`, `park-bun`), `hairColor` (`6` options: `espresso-black`, `chestnut-brown`, `golden-blonde`, `copper-auburn`, `silver-mist`, `forest-teal`), `outfit` (`5` stylized park outfits: `ranger-emerald`, `safari-khaki`, `botanist-cobalt`, `sunset-coral`, `panda-monochrome`), and `accessory` (`5` options: `safari-hat`, `bamboo-visor`, `round-glasses`, `explorer-backpack`, `none`).
- Q: When a player is previewing appearance changes in the customizer, should other players see the preview live or only after confirmation? → A: Preview changes remain strictly local until the player clicks **Confirm & Save**; only confirmed changes are persisted and broadcast to other players in the zoo instance.
- Q: How should the system handle two players choosing the same display name in the same zoo instance? → A: Allow non-unique chosen display names (since `playerId` is the unique internal identifier) and automatically append a disambiguating suffix (e.g., `"Alex #2"`) to the in-world display label only when a name collision occurs within the same active instance.

## Requirements *(mandatory)*

### Functional Requirements

#### Persistent Player Identity & Display Name Validation
- **FR-001**: The system MUST assign every player a unique, persistent internal identifier (`playerId`) on first visit and preserve that `playerId` across browser sessions.
- **FR-002**: The system MUST provide every player with a valid default display name and complete default 3D Explorer avatar prior to customization so the game is immediately playable.
- **FR-003**: Players MUST be able to set and update their chosen display name through an accessible Identity & Avatar customization interface.
- **FR-004**: The system MUST validate display names on both client and server: trimmed length MUST be between `3` and `16` characters inclusive, allowed characters MUST be limited to alphanumeric characters, single internal spaces, hyphens (`-`), and underscores (`_`), and names MUST NOT start or end with spaces or punctuation.
- **FR-005**: The system MUST enforce display name moderation rules on both client and server, rejecting inappropriate, profane, slur-containing, or reserved system/staff impersonation names with a clear, actionable validation message.

#### Avatar Appearance Customization & Preview Lifecycle
- **FR-006**: Players MUST be able to customize their avatar across five stylized 3D appearance categories:
  1. **Body / Skin Color** (`skinTone` — 6 curated tones)
  2. **Hairstyle** (`hairstyle` — 4 distinct 3D hairstyles)
  3. **Hair Color** (`hairColor` — 6 curated hair colors)
  4. **Outfit** (`outfit` — 5 stylized park outfits)
  5. **Accessories** (`accessory` — 5 curated accessories including `none`)
- **FR-007**: All appearance options MUST belong to a shared, strictly enumerated catalog matching the game's stylized 3D art direction; arbitrary hex codes, raw URLs, or unsupported option IDs MUST be rejected.
- **FR-008**: The customization interface MUST provide a real-time visual preview of the player's draft display name and selected appearance options before changes are confirmed.
- **FR-009**: Players MUST be able to **Confirm & Save** their customization changes, **Cancel** uncommitted draft edits (reverting to their last confirmed identity and appearance), or **Reset to Default** to restore the canonical Explorer appearance.
- **FR-010**: While the player is typing in the display name input or interacting with the customization modal, 3D locomotion keyboard shortcuts MUST be suppressed so text entry does not inadvertently move the avatar in the world.

#### Persistence & Restoration
- **FR-011**: Confirmed player identity (`playerId`, `displayName`) and all five confirmed avatar appearance categories MUST persist across browser reloads and return visits.
- **FR-012**: If stored identity or appearance data is missing, partially corrupted, or from an older schema version on load, the system MUST gracefully sanitize and repair invalid fields using the default avatar catalog without losing valid fields or blocking game startup.

#### World Visibility & Multiplayer Synchronization
- **FR-013**: Display names MUST be visibly rendered on non-intrusive overhead badges above both the local player (or in HUD/preview) and all remote player avatars in the 3D world.
- **FR-014**: The local player's 3D avatar and all remote players' 3D avatars MUST accurately render their respective confirmed `skinTone`, `hairstyle`, `hairColor`, `outfit`, and `accessory` in the 3D scene while preserving smooth `Idle`, `Walking`, `Running`, and `Jumping` animations.
- **FR-015**: When a player joins a multiplayer instance, their confirmed `playerId`, `displayName`, and `AvatarAppearance` MUST be transmitted in the join handshake, validated by the instance authority, and included in room snapshots for all connected visitors.
- **FR-016**: When an already connected player confirms a display name or avatar appearance update during an active multiplayer session, the updated profile MUST be sent to the instance authority, validated, and broadcast in real time (`player_identity_updated`) to all other players in the same instance without requiring a session reconnect.
- **FR-017**: If two or more players in the same active zoo instance share an identical case-insensitive display name, the instance authority MUST disambiguate their visible overhead world labels (e.g., `"Alex"` and `"Alex #2"`) while preserving each player's unique `playerId` and saved base display name.

#### 3D Orientation, SSR Hydration Determinism, Text Layout & Touch Platform Detection
- **FR-018**: The 3D Explorer avatar rig (`AvatarVisualRig`) MUST orient facial and front-body features (eyes, chest pocket, visor brim, round glasses, front hair spikes) along the local forward movement axis (`+Z`) and rear features (ponytail, bun, explorer backpack) along the local back axis (`-Z`) so the character's face always points in the direction of movement (`Math.atan2(dirX, dirZ)`).
- **FR-019**: Initial store state (`gameStore`) and UI overlays (`EntryLoadingScreen`, `GameHudOverlay`) MUST initialize with a deterministic SSR-safe default identity and hydrate persisted `localStorage` identity/settings inside client-mount effects (`useEffect`) so Next.js Server-Side Rendering and Client-Side Hydration produce zero hydration mismatch errors.
- **FR-020**: All text inside UI option boxes, category buttons, HUD badges, interaction prompts, and overhead 3D nameplates MUST be horizontally and vertically centered and sized/wrapped to fit cleanly inside their bounding containers without overflowing or clipping.
- **FR-021**: On-screen virtual joysticks and touch action buttons (`TouchControlsOverlay`: `virtual-joystick-pad`, `touch-run-btn`, `touch-jump-btn`, `touch-interact-btn`) MUST only be rendered on mobile or touchscreen-capable platforms (or when `activeDevice === 'touch'`) and MUST remain hidden on non-touch desktop platforms.
- **FR-022**: Horizontal and vertical camera orbit MUST be controlled exclusively by pointer/mouse dragging on desktop and touch dragging on mobile; keyboard `Q` and `R` keys MUST NOT orbit the camera.
- **FR-023**: All 3D structures and world props in the Panda Forest—including the South Entrance Gate Arch pillars (`[-2.6, 0, 22.5]` and `[2.6, 0, 22.5]`), Giant Panda Habitat Plaque, Lotus Pond Ecology Sign, Stone Garden Lantern, Bamboo Wind Chime Pavilion, and Scenic Overlook Bench—MUST have solid physical colliders enforced in both client and server collision resolution so avatars cannot walk through them.
- **FR-024**: The follow camera MUST support negative pitch angles (`minPitch = -0.65 rad`) with ground-clearance clamping and upward look-at pitch offset so players can look up toward the sky and treetops, and the 3D environment MUST render a stylized sky dome with a glowing sun, drifting 3D cloud clusters, and distant mountain silhouettes.

### Key Entities

- **PlayerIdentityProfile**: The persistent record representing a visitor's identity and confirmed look (`playerId`, `displayName`, `avatar: AvatarAppearance`, `isCustomized`, `updatedAt`, `schemaVersion`).
- **AvatarAppearance**: The validated 5-slot visual configuration of a player's 3D avatar (`skinTone: SkinToneId`, `hairstyle: HairstyleId`, `hairColor: HairColorId`, `outfit: OutfitId`, `accessory: AccessoryId`).
- **AvatarCustomizationCatalog**: The shared single-source-of-truth definition of all valid option IDs, human-readable labels, swatch colors, and 3D geometry/material descriptors across the five customization categories.
- **DisplayNameValidationResult**: The structured outcome of validating and moderating a candidate display name (`valid: boolean`, `normalizedName: string`, `errorCode?: 'TOO_SHORT' | 'TOO_LONG' | 'INVALID_CHARS' | 'PROFANITY_BLOCKED' | 'RESERVED_NAME'`, `errorMessage?: string`).
- **AvatarDraftState**: Transient UI state holding uncommitted edits (`draftDisplayName`, `draftAvatar`, `validationResult`, `isOpen`, `isDirty`) while the player previews changes prior to confirming or canceling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `100%` of first-time and returning players are assigned or restored a persistent `playerId` and can enter the playable zoo world immediately with either their saved look or the default Explorer avatar.
- **SC-002**: Players can customize all `5` appearance categories (Body/Skin Color, Hairstyle, Hair Color, Outfit, Accessories) and set a valid display name, with live preview updates reflecting every selection in under `50ms` (instant visual feedback).
- **SC-003**: `100%` of confirmed display name and avatar appearance changes persist across browser page reloads and subsequent visits in automated end-to-end tests.
- **SC-004**: Selecting **Cancel** after making draft edits leaves the player's active and persisted display name and avatar appearance `100%` unchanged.
- **SC-005**: In a multi-player zoo instance, confirming a display name or avatar customization change updates the player's overhead nameplate and 3D avatar appearance across all other connected browser sessions within `300ms` without requiring a page reload or room rejoin.
- **SC-006**: `100%` of invalid display names (under `3` chars, over `16` chars, disallowed symbols, reserved staff names, or moderated profanity/slurs) and `100%` of unsupported appearance option IDs are rejected by both client validation and the server instance authority before being saved or broadcast.
- **SC-007**: Rendering customized 3D avatars (including distinct hairstyles, outfits, and accessories) maintains 60 FPS desktop / 30–60 FPS mobile frame pacing with `0` React re-renders during 60 Hz locomotion interpolation.

## Out of Scope

- Complex character sculpting (bone sliders, facial morph targets, height/weight scaling).
- Player housing or personal habitats.
- User-created clothing, custom texture uploads, or uploaded 3D models.
- Trading or gifting cosmetics between players.
- Paid cosmetic purchases, virtual currency, or shop checkout flows.
- Advanced social profiles (bios, status feeds, activity logs, friend lists).
- Guilds, clans, or teams.
- Full email/password or third-party OAuth account registration flows.

## Assumptions

- **Browser-Persisted Identity with Server Authority Validation**: Because account registration and external auth providers are out of scope for Feature 003, persistent player identity uses a client-persisted `UUID v4` (`playerId`) and profile stored in durable browser storage (`localStorage`), which is validated and sanitized by `ZooInstanceAuthority` whenever the player joins or updates their profile in a multiplayer instance.
- **Procedural / Modular Stylized 3D Avatar Attachments**: To maintain fast load times, deterministic rendering, and compatibility with existing procedural locomotion animations (`Idle`, `Walking`, `Running`, `Jumping`), hairstyles, outfits, and accessories are rendered as lightweight stylized 3D mesh groups and material palettes attached to the Explorer avatar rig.
- **Accessible Entry Points**: Players can open the Identity & Avatar Customizer both from the initial Welcome/Title overlay before entering the zoo and at any time while exploring via a dedicated **"Customize Avatar"** button in the HUD.

