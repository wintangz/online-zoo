# Phase 0 Research: Player Identity & Avatar (Feature 003)

**Feature Branch**: `003-player-identity-avatar`  
**Date**: 2026-11-04  
**Spec**: [spec.md](./spec.md)

## Research Decisions

### 1. Persistent Player Identity Without Mandatory Account Registration

- **Decision**: Provision a persistent `playerId` (`UUID v4` format `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`) on first launch and store the complete `PlayerIdentityProfile` (`playerId`, `displayName`, `avatar`, `isCustomized`, `updatedAt`, `schemaVersion: 1`) in `localStorage` under `online-zoo:player-identity:v1`. When joining or updating inside a multiplayer room, transmit `playerId`, `displayName`, and `avatar` to `ZooInstanceAuthority`, which validates and sanitizes the profile before recording or broadcasting it.
- **Rationale**: Satisfies `FR-001`, `FR-002`, `FR-011`, and `FR-012` while keeping full account authentication out of scope per `spec.md`. Using `localStorage` guarantees identity and customization survive tab closes and browser restarts, while server-side validation in `ZooInstanceAuthority` satisfies Constitution Principle III (`Multiplayer Correctness`).
- **Alternatives Considered**:
  - *Session-only `sessionStorage`*: Rejected because closing the browser tab would erase the player's identity and saved avatar customization (`FR-011`).
  - *External OAuth / SQL database*: Rejected as out of scope for Feature 003 and unnecessary for browser-persisted visitor profiles.

### 2. Shared Display Name Validation & Moderation Engine

- **Decision**: Implement a pure, deterministic validation and moderation module (`packages/game-core/src/identity/displayNameValidator.ts`) shared identically by `@online-zoo/ui` (for instant form feedback), `@online-zoo/game-core` persistence, and `ZooInstanceAuthority` (`apps/web` server).
  - **Formatting Rules**: Trim leading/trailing whitespace, collapse multiple spaces, verify length `3..16` characters, and match `^[A-Za-z0-9](?:[A-Za-z0-9 _-]{1,14}[A-Za-z0-9])?$` with no consecutive spaces (`  `), hyphens (`--`), or underscores (`__`).
  - **Moderation Filter**: Normalize candidate strings (lowercase + leetspeak substitution `0->o, 1->i, 3->e, 4->a, 5->s, 7->t, @->a, $->s` + strip separators) and check against a curated blocklist of profanity, slurs, and reserved staff/impersonation identifiers (`admin`, `moderator`, `system`, `staff`, `official`, `dev`, `owner`).
- **Rationale**: Satisfies `FR-004`, `FR-005`, and Constitution Principle VI (`Security and Player Safety`) with zero external API latency and 100% client-server parity.
- **Alternatives Considered**:
  - *Client-only regex check*: Rejected because malicious clients could bypass UI checks and send raw WebSocket packets (`FR-004`, `FR-005`, `SC-006`).

### 3. Curated 5-Category Stylized Avatar Catalog & 3D Rig Attachments

- **Decision**: Define a single-source-of-truth catalog (`AVATAR_CUSTOMIZATION_CATALOG` in `packages/game-core/src/identity/avatarCatalog.ts`) with strictly typed IDs and visual metadata for all 5 required categories:
  1. `skinTone` (`6` options): `warm-ivory` (`#f6d7c3`), `golden-sand` (`#eab68c`), `amber-tan` (`#cf9265`), `rich-sienna` (`#9f633d`), `deep-umber` (`#633b24`), `bamboo-sage` (`#9ccf9f`)
  2. `hairstyle` (`4` options): `explorer-bob`, `sun-spiky`, `bamboo-ponytail`, `park-bun`
  3. `hairColor` (`6` options): `espresso-black` (`#241c18`), `chestnut-brown` (`#5c3824`), `golden-blonde` (`#e2b857`), `copper-auburn` (`#a84628`), `silver-mist` (`#d4dce3`), `forest-teal` (`#1e7a6d`)
  4. `outfit` (`5` options): `ranger-emerald` (primary `#2f6f4e`, accent `#10b981`), `safari-khaki` (primary `#b89d6f`, accent `#f59e0b`), `botanist-cobalt` (primary `#28559a`, accent `#3b82f6`), `sunset-coral` (primary `#b84a39`, accent `#ec4899`), `panda-monochrome` (primary `#2d3138`, accent `#f3f4f6`)
  5. `accessory` (`5` options): `safari-hat`, `bamboo-visor`, `round-glasses`, `explorer-backpack`, `none`
- **Rationale**: Provides `6 × 4 × 6 × 5 × 5 = 3,600` distinct stylized combinations, satisfies `FR-006` and `FR-007`, and renders via lightweight procedural Three.js sub-meshes (`AvatarVisualRig`) shared between `PlayerAvatarEntity` (local player) and `RemotePlayerAvatar` (remote visitors) with zero external network asset fetches and 60 FPS performance (`SC-007`).
- **Alternatives Considered**:
  - *Separate GLB file per combination*: Rejected because 3,600 static meshes would bloat bundle size and complicate runtime switching.
  - *Freeform RGB color pickers*: Rejected because uncurated neon/clashing colors violate the stylized park art direction (`FR-007` and Constitution Principle V).

### 4. Local Preview vs. Confirmed Multiplayer Broadcast (`update_identity`)

- **Decision**: Maintain a dedicated `identity` slice in `gameStore` containing both `confirmedProfile: PlayerIdentityProfile` and `draft: AvatarDraftState`. While the Avatar Customizer is open (`draft.isOpen === true`), the local player's customizer preview and 3D avatar can display `draft` changes locally, while `MultiplayerClient` only sends `update_identity` (`{ type: 'update_identity', playerId, displayName, avatar }`) when the user clicks **Confirm & Save**. Clicking **Cancel** resets `draft` to `confirmedProfile`.
- **Rationale**: Satisfies `FR-008`, `FR-009`, `FR-015`, `FR-016`, and `Clarification #4` so other visitors never see half-typed names or rapid draft cycling until the player confirms.
- **Alternatives Considered**:
  - *Streaming every draft click over WebSocket*: Rejected because it violates `FR-009` / `US3/AC3` and wastes bandwidth.

### 5. Overhead Nameplate Rendering for Local & Remote Players & Duplicate Name Disambiguation

- **Decision**:
  - Render overhead display name badges (`"displayName"`) above both the local player (`data-testid="local-avatar-nameplate"`) and every remote player (`data-testid="remote-visitor-badge-{sessionId}"`) in the 3D world (`FR-013`).
  - In `ZooInstanceAuthority`, if a joining or updating player's chosen `displayName` matches (case-insensitively) another active player's base name in the same room (with a different `playerId`), compute the visible room `displayName` with a deterministic suffix (`"Alex #2"`, `"Alex #3"`) while keeping their base name intact (`FR-017`).
- **Rationale**: Satisfies `FR-013` ("Display names must be visible above player avatars in the world") and `FR-017` (`Clarification #5`).

