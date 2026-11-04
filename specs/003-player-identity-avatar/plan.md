# Implementation Plan: Player Identity & Avatar (Feature 003)

**Branch**: `003-player-identity-avatar` | **Date**: 2026-11-04 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-player-identity-avatar/spec.md`

## Summary

Feature 003 introduces persistent player identity (`playerId` + validated `displayName`) and 5-category stylized 3D avatar customization (**Body/Skin Color**, **Hairstyle**, **Hair Color**, **Outfit**, and **Accessories**) with live preview, confirm/cancel/reset workflows, durable browser persistence, server-authoritative moderation/validation, overhead world nameplates, and real-time multiplayer synchronization across connected sessions.

The technical architecture adds:
1. **Shared Identity, Moderation & Avatar Catalog Engine (`packages/game-core/src/identity/*`)**: Defines the 5-category `AVATAR_CUSTOMIZATION_CATALOG`, `DEFAULT_AVATAR_APPEARANCE`, deterministic `validateDisplayName` (length `3–16`, allowed characters, case-insensitive + leetspeak profanity/reserved-word filter), `sanitizeAvatarAppearance`, and `localStorage` persistence (`online-zoo:player-identity:v1`) with corruption recovery (`FR-001`–`FR-012`).
2. **State Store & Multiplayer Protocol Extensions (`packages/game-core/src/state/gameStore.ts`, `packages/game-core/src/multiplayer/*`, `apps/web/server.mjs`)**: Adds the `identity` slice (`profile` + `draft` preview state) to `gameStore`, extends `join_instance` and room snapshots with `playerId`, `displayName`, and `avatar`, adds the `update_identity` / `player_identity_updated` real-time messages, enforces server-side name/catalog validation in `ZooInstanceAuthority`, and disambiguates duplicate display names (`"Alex #2"`) within the same instance (`FR-015`–`FR-017`).
3. **Modular 3D Avatar Visual Rig & Overhead Nameplates (`packages/game-client/src/entities/*`)**: Creates a shared `AvatarVisualRig` component rendering customizable skin tones, 4 3D hairstyles (`explorer-bob`, `sun-spiky`, `bamboo-ponytail`, `park-bun`), 6 hair colors, 5 park outfits, and 5 accessories (`safari-hat`, `bamboo-visor`, `round-glasses`, `explorer-backpack`, `none`) with local `+Z` forward orientation (eyes, visor, glasses, chest pocket on `+Z`; ponytail, bun, backpack on `-Z` per `FR-018`) on both `PlayerAvatarEntity` (with centered overhead `local-avatar-nameplate`) and `RemotePlayerAvatar` (with centered overhead `remote-visitor-badge-{sessionId}`) while maintaining 60 FPS procedural limb animation (`FR-013`, `FR-014`, `SC-007`).
4. **Interactive Avatar Customizer Studio, SSR-Safe Hydration & Touch-Only Controls (`packages/ui/src/*`)**: Provides a responsive customization studio (`max-w-4xl`) with centered, non-overflowing option boxes (`FR-020`), deterministic SSR-safe initial store state with client-mount hydration (`FR-019`), and touch-platform detection (`isTouchCapablePlatform()` / `activeDevice === 'touch'`) in `TouchControlsOverlay` so virtual joysticks and touch buttons only appear on mobile/touchscreen-capable devices (`FR-021`).
5. **Drag-Only Camera Orbit, Upward Sky Pitch, Solid Prop/Gate Colliders & Stylized Sky (`packages/game-core/*`, `packages/game-client/*`)**: Removes keyboard `Q`/`R` camera orbit so camera rotation is strictly pointer/touch drag-driven (`FR-022`), adds solid colliders for the entrance gate arch pillars and all 5 interactive signs/props/benches (`FR-023`), and extends `CameraControllerCore` to support upward sky viewing (`minPitch: -0.65`) paired with a stylized 3D sky dome, sun, drifting clouds, and distant mountain peaks (`FR-024`).

## Technical Context

**Language/Version**: TypeScript `5.6.x` (Node.js `>=20.11`)

**Primary Dependencies**:
- Application Shell & WebSocket Host: `next` (`14.2.x`), `ws` (`^8.18.0`), `react` (`18.3.x`), `react-dom` (`18.3.x`)
- 3D Rendering & Physics: `three` (`0.169+`), `@react-three/fiber` (`8.x`), `@react-three/drei` (`9.x`), `@react-three/rapier` (`1.x`)
- State Management & Styling: `zustand` (`5.x`), `tailwindcss` (`3.4.x`)
- Monorepo & Build Tooling: `pnpm` (`9.x` workspaces), `turbo` (`2.x`)

**Storage**:
- Client `localStorage` (`online-zoo:player-identity:v1`) for persistent `PlayerIdentityProfile` (`playerId`, `displayName`, `avatar`, `isCustomized`, `updatedAt`, `schemaVersion`).
- Server volatile in-memory `ZooInstanceRoom` state holding active validated `playerId`, `baseDisplayName`, disambiguated `displayName`, and `avatar` for connected visitors.

**Testing**:
- `Vitest`: Unit and integration suites for `displayNameValidator` (formatting, length, leetspeak profanity & reserved-name moderation), `avatarCatalog` & `identityPersistence` (UUID provisioning, persistence, corrupted storage fallback), `gameStore` draft/confirm/cancel/reset lifecycle, and `ZooInstanceAuthority` + `MultiplayerClient` (`update_identity` broadcast, server rejection of invalid names/options, duplicate name `#2` disambiguation).
- `Playwright`: End-to-end browser verification (`apps/web/e2e/player-identity-avatar.spec.ts`) covering persistent identity across reloads, 5-category customization preview/cancel/confirm/reset, validation error feedback, and real-time 2-player name and avatar synchronization.

**Target Platform**: Desktop and mobile browsers supporting WebGL2, WebSockets, and `localStorage`.

**Project Type**: Browser-based 3D multiplayer social zoo in a Turborepo monorepo.

**Performance Goals**:
- Instant (`< 50ms`) preview updates when selecting appearance options (`SC-002`).
- Real-time (`<= 300ms`) propagation of confirmed identity/avatar changes to other players in the same instance (`SC-005`).
- 60 FPS desktop / 30–60 FPS mobile rendering with `0` React re-renders during 60 Hz movement ticks (`SC-007`).

**Constraints**:
- Strictly curated appearance catalog matching the stylized 3D art direction (`FR-007`).
- Both client and server must validate display names and appearance IDs (`FR-004`, `FR-005`, `FR-007`, `SC-006`).
- Preview edits must remain local until confirmed (`FR-009`).

**Scale/Scope**: `5` customization categories (`26` total curated items yielding `3,600` combinations), persistent `PlayerIdentityProfile`, and real-time sync across `16`-player instances.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Phase 0 Status | Post-Phase 1 Design Verification |
| :--- | :--- | :--- |
| **I. Gameplay-First Development** | **PASS** | Gives visitors recognizable persistent identities and expressive stylized avatars visible in the 3D zoo world while keeping default entry immediate and frictionless. |
| **II. Modular Architecture** | **PASS** | Places catalog, validation/moderation, and persistence in `@online-zoo/game-core`, 3D avatar attachment rendering in `@online-zoo/game-client`, the customizer modal in `@online-zoo/ui`, and WebSocket relay in `apps/web`. |
| **III. Multiplayer Correctness** | **PASS** | `ZooInstanceAuthority` validates all incoming `join_instance` and `update_identity` payloads against `validateDisplayName` and `isValidAvatarAppearance` before updating room state or broadcasting (`FR-004`, `FR-005`, `FR-007`, `FR-015`, `FR-016`). |
| **IV. Responsive by Design** | **PASS** | The Avatar Customizer studio is responsive across desktop and mobile viewports and suppresses keyboard movement shortcuts while open (`FR-010`). |
| **V. Performance and Asset Quality** | **PASS** | Uses lightweight procedural Three.js geometry attachments (`AvatarVisualRig`) and keeps 60 Hz locomotion updates inside `useFrame` without triggering React state updates (`SC-007`). |
| **VI. Security and Player Safety** | **PASS** | Enforces strict character whitelisting, length bounds (`3–16`), leetspeak-normalized profanity/slur moderation, reserved-name blocking, and catalog enum validation on both client and server (`SC-006`). |
| **VII. Testing and Verification** | **PASS** | Covers validation, persistence, preview/cancel/confirm state transitions, server rejection, and multi-client live appearance sync in Vitest and Playwright E2E suites. |
| **VIII. Specification-Driven Development** | **PASS** | Traces all `17` Functional Requirements (`FR-001`–`FR-017`), `7` Success Criteria (`SC-001`–`SC-007`), and `5` Clarifications across [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), and [contracts/identity-and-avatar.md](./contracts/identity-and-avatar.md). |
| **IX. Incremental Delivery** | **PASS** | Layers cleanly onto Feature 001's character rig and Feature 002's WebSocket multiplayer synchronization while preserving immediate default-avatar playability. |

## Project Structure

### Documentation (this feature)

```text
specs/003-player-identity-avatar/
├── plan.md                                      # This file (/speckit-plan output)
├── research.md                                  # Phase 0 research decisions
├── data-model.md                                # Phase 1 entity, catalog & validation data model
├── quickstart.md                                # Phase 1 verification & run guide
├── checklists/
│   └── requirements.md                          # Spec quality checklist (16/16 passing)
└── contracts/
    └── identity-and-avatar.md                   # Shared module, wire protocol & UI testid contracts
```

### Source Code (repository root)

```text
online-zoo/
├── apps/
│   └── web/
│       ├── server.mjs                           # Updated to validate/broadcast update_identity & avatar payloads
│       ├── src/
│       │   └── server/
│       │       └── multiplayerWsHub.ts          # Relays update_identity -> ZooInstanceAuthority -> player_identity_updated
│       └── e2e/
│           ├── playable-zoo-world.spec.ts       # Existing Feature 001 E2E suite
│           ├── multiplayer-sync.spec.ts         # Existing Feature 002 E2E suite
│           └── player-identity-avatar.spec.ts   # New Feature 003 E2E suite (identity persistence, 5-slot customizer, moderation, 2-player live sync)
├── packages/
│   ├── game-core/
│   │   ├── src/
│   │   │   ├── index.ts                         # Re-exports identity module
│   │   │   ├── types.ts                         # Adds SkinToneId, HairstyleId, HairColorId, OutfitId, AccessoryId, AvatarAppearance, PlayerIdentityProfile
│   │   │   ├── identity/
│   │   │   │   ├── index.ts                     # Barrel export for identity module
│   │   │   │   ├── avatarCatalog.ts             # 5-category curated stylized catalog, color lookups & validators
│   │   │   │   ├── displayNameValidator.ts      # 3-16 char validation + case/leetspeak profanity & reserved-name moderation
│   │   │   │   └── identityPersistence.ts       # Persistent UUID v4 + localStorage load/save/sanitize with corruption recovery
│   │   │   ├── state/
│   │   │   │   └── gameStore.ts                 # Adds identity slice (profile + draft preview/confirm/cancel/reset) & input lock
│   │   │   └── multiplayer/
│   │   │       ├── protocol.ts                  # Extends join_instance/welcome_snapshot/player_joined & adds update_identity/player_identity_updated
│   │   │       ├── zooInstanceAuthority.ts      # Validates display names & avatars, disambiguates duplicate names (#2), handles updatePlayerIdentity
│   │   │       └── multiplayerClient.ts         # Sends confirmed identity on join & sendIdentityUpdate(), updates remoteVisitors on player_identity_updated
│   │   └── __tests__/
│   │       └── playerIdentityAndAvatar.test.ts  # Unit & integration tests for moderation, catalog, persistence, draft/cancel/confirm, and authority sync
│   ├── game-client/
│   │   └── src/
│   │       ├── entities/
│   │       │   ├── AvatarVisualRig.tsx          # Shared stylized 3D mesh rig rendering skinTone, 4 hairstyles, hairColor, 5 outfits & 5 accessories
│   │       │   ├── PlayerAvatarEntity.tsx       # Uses AvatarVisualRig + renders overhead local-avatar-nameplate
│   │       │   └── RemotePlayerAvatar.tsx       # Uses AvatarVisualRig + renders overhead remote-visitor-badge-{sessionId}
│   │       └── runtime/
│   │           └── ZooGameCanvas.tsx            # Initializes persistent player identity on mount and syncs confirmed updates to MultiplayerClient
│   └── ui/
│       └── src/
│           ├── index.ts                         # Exports AvatarCustomizerModal
│           ├── AvatarCustomizerModal.tsx        # Interactive 5-category customization studio with live preview, moderation feedback & Confirm/Cancel/Reset
│           ├── GameHudOverlay.tsx               # Adds Customize Avatar button & displays confirmed displayName
│           └── WelcomeOverlay.tsx               # Allows opening Avatar Customizer or entering immediately with saved/default identity
```

**Structure Decision**: Extends the existing monorepo packages cleanly: domain catalog, validation, moderation, and persistence live in `@online-zoo/game-core/src/identity`, shared 3D character mesh attachments live in `@online-zoo/game-client/src/entities/AvatarVisualRig.tsx`, and the customization studio UI lives in `@online-zoo/ui/src/AvatarCustomizerModal.tsx`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| None (All 9 Constitution Principles Pass) | All identity, moderation, rendering, and networking modules align with existing package boundaries. | Client-only validation or unvalidated freeform strings/colors would violate Principles III, V, and VI. |
