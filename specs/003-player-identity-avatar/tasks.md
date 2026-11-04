---
description: "Task list for Feature 003: Player Identity & Avatar"
---

# Tasks: Player Identity & Avatar

**Input**: Design documents from `/specs/003-player-identity-avatar/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/identity-and-avatar.md](./contracts/identity-and-avatar.md), [quickstart.md](./quickstart.md)

**Tests**: Automated unit, integration, and multi-session browser E2E tests are included per Constitution Principle VII (`Testing and Verification`) and `plan.md`.

**Organization**: Tasks are grouped by user story (`US1`–`US4`) to enable independent implementation and verification of each vertical increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact repository-relative file paths are included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the shared `identity` module barrel exports and wire exports into `@online-zoo/game-core`.

- [X] T001 Create identity module barrel file in `packages/game-core/src/identity/index.ts` and re-export it from `packages/game-core/src/index.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core identity types, the 5-category stylized avatar catalog, display name validation/moderation rules, and persistent storage helpers that all user stories depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T002 Define identity and avatar domain types (`SkinToneId`, `HairstyleId`, `HairColorId`, `OutfitId`, `AccessoryId`, `AvatarAppearance`, `PlayerIdentityProfile`, `DisplayNameErrorCode`, `DisplayNameValidationResult`, `AvatarDraftState`, `PlayerIdentityStoreSlice`) and extend `RemoteVisitorSummary` and `PlayerSessionRecord` with `playerId`, `baseDisplayName`, and `avatar: AvatarAppearance` in `packages/game-core/src/types.ts`
- [X] T003 [P] Implement `AVATAR_CUSTOMIZATION_CATALOG`, `DEFAULT_AVATAR_APPEARANCE` (`skinTone: 'golden-sand'`, `hairstyle: 'explorer-bob'`, `hairColor: 'chestnut-brown'`, `outfit: 'ranger-emerald'`, `accessory: 'safari-hat'`), catalog option lookup helpers (`getSkinToneHex`, `getHairColorHex`, `getOutfitColors`), `isValidAvatarAppearance`, and `sanitizeAvatarAppearance` across all 5 categories (`6` skin tones, `4` hairstyles, `6` hair colors, `5` outfits, `5` accessories per `VR-ID-003`) in `packages/game-core/src/identity/avatarCatalog.ts`
- [X] T004 [P] Implement `validateDisplayName` enforcing trimmed length `3..16` characters (`TOO_SHORT` / `TOO_LONG`), allowed character pattern `^[A-Za-z0-9](?:[A-Za-z0-9 _-]{1,14}[A-Za-z0-9])?$` without consecutive spaces/hyphens/underscores (`INVALID_CHARS`), reserved staff/system name blocking (`RESERVED_NAME`), and case-insensitive + leetspeak-normalized profanity/slur filtering (`PROFANITY_BLOCKED` per `VR-ID-002`) in `packages/game-core/src/identity/displayNameValidator.ts`
- [X] T005 Implement persistent player identity storage (`PLAYER_IDENTITY_STORAGE_KEY = 'online-zoo:player-identity:v1'`, `generatePersistentPlayerId` matching `^[a-zA-Z0-9_-]{8,64}$` per `VR-ID-001`, `loadOrCreatePlayerIdentity`, `savePlayerIdentity`, and corrupted/partial profile sanitization per `FR-012`) in `packages/game-core/src/identity/identityPersistence.ts`

**Checkpoint**: Shared catalog, display name validator/moderator, and persistence engine are ready — User Story phases can now proceed.

---

## Phase 3: User Story 1 - Establish Persistent Identity, Display Name, and Default Avatar (Priority: P1) 🎯 MVP

**Goal**: Assign every visitor a persistent `playerId`, a default `"Explorer #NNN"` display name, and the canonical default 3D Explorer avatar on first launch, restore saved identity across visits, and render the player's confirmed display name on both the HUD and an overhead 3D world nameplate.

**Independent Test**: Launch the game in a fresh browser context, verify `online-zoo:player-identity:v1` is created with a persistent `playerId` and default Explorer avatar, verify the local avatar renders with an overhead nameplate (`data-testid="local-avatar-nameplate"`), and verify reloading the browser preserves the exact same `playerId` and display name.

### Implementation & Verification for User Story 1

- [X] T006 [US1] Extend `gameStore` (`GameUIStoreState`) with the `identity: PlayerIdentityStoreSlice` state slice and actions (`initializePlayerIdentity`, `openAvatarCustomizer`, `cancelAvatarCustomizer`, `setDraftDisplayName`, `setDraftAvatarOption`, `resetDraftToDefault`, `confirmAvatarCustomization`) plus movement-input suppression when `identity.draft.isOpen` is true (`FR-010`) in `packages/game-core/src/state/gameStore.ts`
- [X] T007 [US1] Update `PlayerAvatarEntity` to render an overhead 3D world nameplate (`data-testid="local-avatar-nameplate"`) displaying the local player's confirmed `displayName` above the avatar (`FR-013`) in `packages/game-client/src/entities/PlayerAvatarEntity.tsx`
- [X] T008 [US1] Initialize persistent player identity on mount (`initializePlayerIdentity`) and suppress keyboard locomotion shortcuts while `identity.draft.isOpen` is active in `packages/game-client/src/runtime/ZooGameCanvas.tsx`

**Checkpoint**: User Story 1 is complete — players receive a persistent `playerId`, default avatar, and overhead nameplate immediately on entry and across reloads.

---

## Phase 4: User Story 2 - Customize, Preview, Confirm, Cancel, and Reset Avatar Appearance (Priority: P2)

**Goal**: Allow players to open the Avatar Customizer from the Welcome overlay or HUD, customize all 5 appearance categories (`skinTone`, `hairstyle`, `hairColor`, `outfit`, `accessory`) and their `displayName` with an instant live preview, and **Confirm & Save**, **Cancel**, or **Reset to Default**, rendering the customized 3D meshes and colors on the Explorer avatar rig.

**Independent Test**: Open `data-testid="avatar-customizer-modal"`, select options across all 5 categories, verify `data-testid="avatar-preview-card"` updates immediately, click **Cancel** and verify the saved profile is unchanged, then reopen, customize all 5 categories + display name, click **Confirm & Save**, reload the page, and verify all 5 categories and the custom display name persist.

### Implementation & Verification for User Story 2

- [X] T009 [P] [US2] Create `AvatarVisualRig` 3D component rendering customizable `skinTone` materials, all `4` 3D hairstyles (`explorer-bob`, `sun-spiky`, `bamboo-ponytail`, `park-bun`) tinted with `hairColor`, all `5` park outfits (`ranger-emerald`, `safari-khaki`, `botanist-cobalt`, `sunset-coral`, `panda-monochrome`), and all `5` accessories (`safari-hat`, `bamboo-visor`, `round-glasses`, `explorer-backpack`, `none`) with procedural limb animation refs in `packages/game-client/src/entities/AvatarVisualRig.tsx`
- [X] T010 [US2] Integrate `AvatarVisualRig` into `PlayerAvatarEntity` so the local 3D avatar renders the active appearance (`draft.avatar` while previewing in customizer or `profile.avatar` in world) at 60 FPS in `packages/game-client/src/entities/PlayerAvatarEntity.tsx`
- [X] T011 [P] [US2] Implement `AvatarCustomizerModal` UI component with live preview card (`data-testid="avatar-preview-card"`), display name input (`data-testid="display-name-input"`), validation error banner (`data-testid="display-name-error"`), 5 category selector grids (`skin-option-*`, `hairstyle-option-*`, `haircolor-option-*`, `outfit-option-*`, `accessory-option-*`), and **Confirm & Save** (`confirm-avatar-btn`), **Cancel** (`cancel-avatar-btn`), and **Reset to Default** (`reset-avatar-btn`) actions in `packages/ui/src/AvatarCustomizerModal.tsx` and export it from `packages/ui/src/index.ts`
- [X] T012 [US2] Add the **Customize Avatar** trigger button (`data-testid="open-avatar-customizer-btn"`), display the confirmed `identity.profile.displayName` in `GameHudOverlay` (`packages/ui/src/GameHudOverlay.tsx`) and `WelcomeOverlay` (`packages/ui/src/WelcomeOverlay.tsx`), and mount `AvatarCustomizerModal` in `apps/web/src/app/page.tsx`

**Checkpoint**: User Stories 1 and 2 are complete — players can preview, confirm, cancel, reset, and persist their display name and 5-category avatar appearance.

---

## Phase 5: User Story 3 - Real-Time Multiplayer Synchronization of Identity and Avatar Appearance (Priority: P3)

**Goal**: Synchronize each player's confirmed `playerId`, `displayName`, and 5-category `AvatarAppearance` to all connected sessions in the same zoo instance upon joining and dynamically in real time (`update_identity` → `player_identity_updated`) when confirmed in-game, rendering remote visitors with `AvatarVisualRig` and disambiguating duplicate display names (`"Alex #2"`).

**Independent Test**: Connect two browser sessions to the same Panda Forest instance, customize Player A's display name (`"PandaScout"`), hairstyle, hair color, outfit, and accessory, click **Confirm & Save**, and verify Session B immediately updates Player A's overhead nameplate and 3D avatar appearance without reloading.

### Implementation & Verification for User Story 3

- [X] T013 [US3] Extend wire protocol message types (`ClientJoinInstanceMessage`, `ClientUpdateIdentityMessage`, `ServerPlayerIdentityUpdatedMessage`) and `parseClientMultiplayerMessage` validation in `packages/game-core/src/multiplayer/protocol.ts`
- [X] T014 [US3] Update `ZooInstanceAuthority` (`joinOrResumePlayer` and new `updatePlayerIdentity` method) to accept and validate `playerId`, `displayName`, and `avatar`, compute outfit-derived `accentColor`, disambiguate duplicate case-insensitive display names in the same room (`"Alex #2"` per `FR-017` / `VR-ID-004`), and return broadcast updates in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts`
- [X] T015 [US3] Update `multiplayerWsHub.ts` (`apps/web/src/server/multiplayerWsHub.ts`) and unified server `server.mjs` (`apps/web/server.mjs`) to handle `update_identity` messages, broadcast `player_identity_updated` to all connected room clients, and include `playerId` and `avatar` in `welcome_snapshot` and `player_joined` payloads
- [X] T016 [US3] Update `MultiplayerClient` (`packages/game-core/src/multiplayer/multiplayerClient.ts`) to send the local player's confirmed `playerId`, `displayName`, and `avatar` in `join_instance`, expose `sendIdentityUpdate(profile)`, and handle incoming `player_identity_updated` messages by updating `gameStore.multiplayer.remoteVisitors` and `localDisplayName`
- [X] T017 [US3] Update `RemotePlayerAvatar` (`packages/game-client/src/entities/RemotePlayerAvatar.tsx`) and `RemotePlayersLayer` (`packages/game-client/src/entities/RemotePlayersLayer.tsx`) to render each remote visitor's 5-category `avatar: AvatarAppearance` via `AvatarVisualRig` and display their confirmed/disambiguated overhead `displayName` (`data-testid="remote-visitor-badge-{sessionId}"`)

**Checkpoint**: User Stories 1, 2, and 3 are complete — customized names and 5-slot avatars synchronize in real time across all connected players.

---

## Phase 6: User Story 4 - Authoritative Validation and Moderation of Names and Appearance Values (Priority: P4)

**Goal**: Enforce strict client and server validation/moderation so invalid or inappropriate display names and out-of-catalog appearance values are 100% rejected before saving or broadcasting, and verify all requirements with comprehensive unit and integration tests.

**Independent Test**: Attempt to submit invalid display names (`"a"`, `"ThisNameIsWayTooLong123"`, `"bad<script>"`, `"admin"`, profanity/leetspeak profanity) or invalid appearance IDs to `validateDisplayName`, `confirmAvatarCustomization`, and `ZooInstanceAuthority.updatePlayerIdentity`, and verify 100% are rejected with `error_notice` / validation errors while keeping existing valid state intact.

### Implementation & Verification for User Story 4

- [X] T018 [US4] Enforce server-side rejection of invalid `update_identity` payloads in `ZooInstanceAuthority` and `apps/web/server.mjs` (returning `error_notice` with code `'INVALID_IDENTITY_UPDATE'` when `validateDisplayName` or `isValidAvatarAppearance` fails, without mutating or broadcasting the invalid state per `SC-006`) in `packages/game-core/src/multiplayer/zooInstanceAuthority.ts` and `apps/web/server.mjs`
- [X] T019 [P] [US4] Create comprehensive unit and integration test suite covering `validateDisplayName` (length, characters, reserved names, case/leetspeak profanity moderation), `avatarCatalog` validation & sanitization, `identityPersistence` (`UUID` generation, reload persistence, corrupted storage recovery), `gameStore` preview/cancel/confirm/reset transitions, duplicate name `#2` disambiguation, and two-client `update_identity` live sync in `packages/game-core/__tests__/playerIdentityAndAvatar.test.ts`

**Checkpoint**: All 4 User Stories are complete and verified by unit and integration tests.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end multi-session Playwright browser verification and full workspace build/lint/typecheck gates.

- [X] T020 Create Playwright E2E test suite verifying persistent identity across page reloads, 5-category avatar customization preview/cancel/confirm/reset, display name moderation error feedback, and real-time 2-player display name and avatar appearance synchronization in `apps/web/e2e/player-identity-avatar.spec.ts`
- [X] T021 Execute full workspace verification (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e`) per `specs/003-player-identity-avatar/quickstart.md`

---

## Phase 8: Convergence

**Purpose**: Address post-review convergence refinements (`FR-018`–`FR-021`): 3D avatar forward face orientation (`+Z`), Next.js SSR/CSR hydration determinism, centered/fitted text across all UI/3D boxes, and mobile/touchscreen-only visibility for virtual joysticks and touch action buttons.

- [X] T022 [P] [US2] Fix 3D avatar forward/back local Z-axis orientation in `packages/game-client/src/entities/AvatarVisualRig.tsx` so facial/front features (eyes, chest pocket, visor brim, round glasses, front hair spikes) sit on `+Z` (matching `CharacterControllerCore` movement yaw `Math.atan2(dirX, dirZ)`) and rear features (ponytail, bun, explorer backpack) sit on `-Z` (`FR-018`)
- [X] T023 [P] [US1] Eliminate Next.js SSR/CSR hydration mismatch by initializing `gameStore` (`packages/game-core/src/state/gameStore.ts`) with a deterministic SSR-safe default identity/settings state and hydrating persisted `localStorage` identity and settings on client mount in `packages/game-client/src/runtime/ZooGameCanvas.tsx` and `packages/ui/src/EntryLoadingScreen.tsx` (`FR-019`)
- [X] T024 [P] [US2] Center and fit all text inside option buttons, badges, prompts, and overhead 3D nameplates across `packages/ui/src/AvatarCustomizerModal.tsx`, `packages/ui/src/EntryLoadingScreen.tsx`, `packages/ui/src/GameHudOverlay.tsx`, `packages/ui/src/InteractionPromptBanner.tsx`, `packages/game-client/src/entities/PlayerAvatarEntity.tsx`, and `packages/game-client/src/entities/RemotePlayerAvatar.tsx` (`FR-020`)
- [X] T025 [P] [US4] Restrict virtual joystick and touch action buttons (`virtual-joystick-pad`, `touch-run-btn`, `touch-jump-btn`, `touch-interact-btn`) in `packages/ui/src/TouchControlsOverlay.tsx` so they only render on mobile or touchscreen-capable platforms (`isTouchCapablePlatform()` or `activeDevice === 'touch'`) and remain hidden on non-touch desktop platforms (`FR-021`)
- [X] T026 Update unit and Playwright E2E tests (`apps/web/e2e/playable-zoo-world.spec.ts` and `apps/web/e2e/player-identity-avatar.spec.ts`) to assert zero Next.js hydration errors, proper `+Z` avatar face orientation, centered/fitted text, and desktop-hidden / touch-visible joysticks, then re-verify `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test:e2e`
- [X] T027 [P] Remove keyboard `Q`/`R` camera orbit from `packages/game-core/src/input/inputController.ts` and HUD control hints in `packages/ui/src/GameHudOverlay.tsx` so camera orbit is controlled strictly by dragging (`FR-022`)
- [X] T028 [P] Add solid physical colliders for the South Entrance Gate Arch pillars (`[-2.6, 0, 22.5]`, `[2.6, 0, 22.5]`) and all 5 interactive props (Giant Panda Habitat Plaque, Lotus Pond Ecology Sign, Stone Garden Lantern, Bamboo Wind Chime Pavilion, Scenic Overlook Bench) in `packages/game-core/src/world/pandaForestLayout.ts`, `apps/web/server.mjs`, `packages/game-client/src/environment/PerimeterEnclosure.tsx`, and `packages/game-client/src/environment/InteractiveProps.tsx` (`FR-023`)
- [X] T029 [P] Enable upward camera pitch (`minPitch: -0.65` with ground-safe camera height and upward look-at target elevation) in `packages/game-core/src/camera/cameraController.ts` and render a stylized 3D sky dome, sun & halo, drifting fluffy 3D cloud clusters, and distant mountain silhouettes in `packages/game-client/src/environment/PandaForestScene.tsx` (`FR-024`)
- [X] T030 Update unit tests (`packages/game-core/__tests__/cameraController.test.ts`, `packages/game-core/__tests__/desktopInputAndCollision.test.ts`) and E2E tests (`apps/web/e2e/playable-zoo-world.spec.ts`) to verify drag-only orbit (no `Q`/`R`), upward sky pitch, and solid gate/sign/bench collision blocking, then run full verification (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test:e2e`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS** all user stories (`US1`–`US4`).
- **Phase 3 (US1 - Persistent Identity & Default Avatar, P1)**: Depends on Phase 2. Delivers MVP persistent identity and overhead nameplates.
- **Phase 4 (US2 - 5-Category Customizer & Preview/Confirm/Cancel/Reset, P2)**: Depends on Phase 2 and extends US1's `gameStore` identity slice and `PlayerAvatarEntity`.
- **Phase 5 (US3 - Real-Time Multiplayer Identity & Avatar Sync, P3)**: Depends on Phase 2 and integrates US2's `AvatarVisualRig` with `ZooInstanceAuthority`, `MultiplayerClient`, and `RemotePlayerAvatar`.
- **Phase 6 (US4 - Authoritative Moderation & Validation Verification, P4)**: Depends on Phases 2–5.
- **Phase 7 (Polish & E2E Verification)**: Depends on Phases 3–6 completion.

### Parallel Opportunities

- **Foundational**: `T003` (`avatarCatalog.ts`) and `T004` (`displayNameValidator.ts`) can run in parallel.
- **User Story 2**: `T009` (`AvatarVisualRig.tsx`) and `T011` (`AvatarCustomizerModal.tsx`) operate on separate packages (`@online-zoo/game-client` vs `@online-zoo/ui`) and can be built in parallel.

---

## Parallel Example: Foundational & User Story 2

```bash
# Parallel batch during Phase 2 (Foundational):
Task: "T003 [P] Implement AVATAR_CUSTOMIZATION_CATALOG in packages/game-core/src/identity/avatarCatalog.ts"
Task: "T004 [P] Implement validateDisplayName in packages/game-core/src/identity/displayNameValidator.ts"

# Parallel batch during Phase 4 (User Story 2):
Task: "T009 [P] [US2] Create AvatarVisualRig 3D component in packages/game-client/src/entities/AvatarVisualRig.tsx"
Task: "T011 [P] [US2] Implement AvatarCustomizerModal UI component in packages/ui/src/AvatarCustomizerModal.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1: Setup** (`T001`)
2. Complete **Phase 2: Foundational** (`T002`–`T005`)
3. Complete **Phase 3: User Story 1** (`T006`–`T008`)
4. **STOP and VALIDATE**: Verify first-visit persistent `playerId`, default Explorer avatar, and overhead nameplate restoration across page reloads.

### Incremental Delivery

1. **Setup + Foundational** → Shared catalog, display name moderator, and `localStorage` persistence ready.
2. **Add US1 (P1)** → Persistent identity, default avatar, and local overhead nameplate working.
3. **Add US2 (P2)** → Interactive 5-category Avatar Customizer studio, live preview, Confirm/Cancel/Reset, and `AvatarVisualRig` 3D meshes working.
4. **Add US3 (P3)** → Real-time multiplayer synchronization of confirmed display names and 5-category avatars across connected visitors working.
5. **Add US4 (P4) + Polish (Phase 7)** → Server rejection of invalid updates, unit/integration suite, and multi-session Playwright E2E verification green.

