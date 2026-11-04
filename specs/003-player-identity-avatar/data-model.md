# Phase 1 Data Model: Player Identity & Avatar (Feature 003)

**Feature Branch**: `003-player-identity-avatar`  
**Date**: 2026-11-04  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

## 1. Enumerated Appearance Catalog Types

All appearance IDs are strictly validated against the shared catalog in `packages/game-core/src/identity/avatarCatalog.ts`:

```ts
export type SkinToneId =
  | 'warm-ivory'
  | 'golden-sand'
  | 'amber-tan'
  | 'rich-sienna'
  | 'deep-umber'
  | 'bamboo-sage';

export type HairstyleId =
  | 'explorer-bob'
  | 'sun-spiky'
  | 'bamboo-ponytail'
  | 'park-bun';

export type HairColorId =
  | 'espresso-black'
  | 'chestnut-brown'
  | 'golden-blonde'
  | 'copper-auburn'
  | 'silver-mist'
  | 'forest-teal';

export type OutfitId =
  | 'ranger-emerald'
  | 'safari-khaki'
  | 'botanist-cobalt'
  | 'sunset-coral'
  | 'panda-monochrome';

export type AccessoryId =
  | 'safari-hat'
  | 'bamboo-visor'
  | 'round-glasses'
  | 'explorer-backpack'
  | 'none';

export interface AvatarAppearance {
  skinTone: SkinToneId;
  hairstyle: HairstyleId;
  hairColor: HairColorId;
  outfit: OutfitId;
  accessory: AccessoryId;
}
```

### Default Avatar Appearance (`DEFAULT_AVATAR_APPEARANCE`)

```ts
export const DEFAULT_AVATAR_APPEARANCE: AvatarAppearance = {
  skinTone: 'golden-sand',
  hairstyle: 'explorer-bob',
  hairColor: 'chestnut-brown',
  outfit: 'ranger-emerald',
  accessory: 'safari-hat',
};
```

---

## 2. Persistent Player Identity Profile (`PlayerIdentityProfile`)

Stored in `localStorage` under key `online-zoo:player-identity:v1`:

| Field | Type | Constraints / Validation Rules |
| :--- | :--- | :--- |
| `schemaVersion` | `1` | Must equal `1`; older or unrecognized versions trigger field-by-field sanitization (`VR-ID-004`). |
| `playerId` | `string` | Required non-empty persistent identifier (`^[a-zA-Z0-9_-]{8,64}$`, default generated `UUID v4`). Preserved across visits (`FR-001`). |
| `displayName` | `string` | Required validated display name (`3..16` chars, `^[A-Za-z0-9](?:[A-Za-z0-9 _-]{1,14}[A-Za-z0-9])?$`, passing moderation filter `VR-ID-002`). Default before custom name is `"Explorer #NNN"` derived deterministically from `playerId`. |
| `avatar` | `AvatarAppearance` | Required 5-slot appearance object where every slot is a member of `AVATAR_CUSTOMIZATION_CATALOG` (`VR-ID-003`). |
| `isCustomized` | `boolean` | `false` on initial default provisioning; `true` once the player confirms changes in the customizer. |
| `updatedAt` | `string` | ISO-8601 timestamp of last confirmed save. |

---

## 3. Display Name Validation Result (`DisplayNameValidationResult`)

Returned by `validateDisplayName(candidate: string)`:

```ts
export type DisplayNameErrorCode =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_CHARS'
  | 'PROFANITY_BLOCKED'
  | 'RESERVED_NAME';

export interface DisplayNameValidationResult {
  valid: boolean;
  normalizedName: string;
  errorCode?: DisplayNameErrorCode;
  errorMessage?: string;
}
```

---

## 4. Client UI & Draft State (`PlayerIdentityStoreSlice`)

Added to `GameUIStoreState` in `packages/game-core/src/state/gameStore.ts`:

```ts
export interface AvatarDraftState {
  isOpen: boolean;
  displayName: string;
  avatar: AvatarAppearance;
  isDirty: boolean;
  validation: DisplayNameValidationResult;
}

export interface PlayerIdentityStoreSlice {
  profile: PlayerIdentityProfile;
  draft: AvatarDraftState;
}
```

### State Transitions

1. **Initialization (`loadOrCreatePlayerIdentity`)**:
   - Reads `online-zoo:player-identity:v1` from `localStorage`.
   - If missing, generates a persistent `playerId`, derives default `"Explorer #NNN"`, sets `avatar = DEFAULT_AVATAR_APPEARANCE`, persists immediately, and populates `identity.profile` and `identity.draft`.
   - If present but partially invalid/corrupted, preserves valid fields (`playerId`, valid `avatar` slots, valid `displayName`) and repairs invalid fields with defaults (`FR-012`).
2. **Open Customizer (`openAvatarCustomizer`)**:
   - Copies `identity.profile.displayName` and `identity.profile.avatar` into `identity.draft`, sets `draft.isOpen = true`, `draft.isDirty = false`, and resets `inputState` movement keys so the avatar stops moving (`FR-010`).
3. **Edit Draft (`setDraftDisplayName`, `setDraftAvatarOption`, `resetDraftToDefault`)**:
   - Mutates `identity.draft` only; runs `validateDisplayName` immediately for instant UI feedback and updates the live preview (`FR-008`). Does **not** persist or broadcast to multiplayer (`FR-009`).
4. **Cancel Customizer (`cancelAvatarCustomizer`)**:
   - Discards uncommitted `identity.draft` edits, restores `draft` from `identity.profile`, and sets `draft.isOpen = false` (`FR-009`, `SC-004`).
5. **Confirm & Save (`confirmAvatarCustomization`)**:
   - Validates `draft.displayName` and `draft.avatar`.
   - If invalid, keeps `draft.isOpen = true` and exposes `draft.validation.errorMessage`.
   - If valid, updates `identity.profile`, writes to `localStorage` (`online-zoo:player-identity:v1`), sets `draft.isOpen = false`, and triggers `multiplayerClient.sendIdentityUpdate(profile)` (`FR-009`, `FR-011`, `FR-016`).

---

## 5. Multiplayer Session Extensions (`RemoteVisitorSummary` & `PlayerSessionRecord`)

Extended in `packages/game-core/src/types.ts` and `packages/game-core/src/multiplayer/protocol.ts`:

- `RemoteVisitorSummary` and `PlayerSessionRecord` now include:
  - `playerId: string`
  - `baseDisplayName: string`
  - `displayName: string` (disambiguated in-instance label, e.g. `"Alex"` or `"Alex #2"` per `FR-017`)
  - `avatar: AvatarAppearance`
  - `accentColor: string` (derived from `outfit` accent color or deterministic fallback)

---

## 6. Validation Rules Summary

- **VR-ID-001 (Persistent Player ID)**: `playerId` MUST be a non-empty string matching `^[a-zA-Z0-9_-]{8,64}$`. If missing or malformed on load or network handshake, a valid UUID v4 is generated/assigned.
- **VR-ID-002 (Display Name Rules & Moderation)**:
  - Trimmed string with internal whitespace collapsed to single spaces.
  - Length `>= 3` (`TOO_SHORT`) and `<= 16` (`TOO_LONG`).
  - Regex `^[A-Za-z0-9](?:[A-Za-z0-9 _-]{1,14}[A-Za-z0-9])?$` and no consecutive `  `, `--`, or `__` (`INVALID_CHARS`).
  - Normalized alphanumeric check against reserved staff terms (`RESERVED_NAME`) and profanity/slur blocklist (`PROFANITY_BLOCKED`).
- **VR-ID-003 (Catalog Membership)**: Every field of `AvatarAppearance` (`skinTone`, `hairstyle`, `hairColor`, `outfit`, `accessory`) MUST exist in `AVATAR_CUSTOMIZATION_CATALOG`. `isValidAvatarAppearance(value)` returns `false` for any unknown option ID, and `sanitizeAvatarAppearance(value)` replaces only invalid slots with `DEFAULT_AVATAR_APPEARANCE`.
- **VR-ID-004 (Duplicate Name Disambiguation)**: Within a `ZooInstanceRoom`, if two active sessions with distinct `playerId`s have the same case-insensitive `baseDisplayName`, the later session's visible `displayName` is suffixed with ` #2` (or ` #N`) while preserving `baseDisplayName`.

