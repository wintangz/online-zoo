# Interface Contracts: Player Identity, Avatar Catalog & Multiplayer Sync (Feature 003)

**Feature Branch**: `003-player-identity-avatar`  
**Date**: 2026-11-04

## 1. Shared Identity & Avatar Module (`@online-zoo/game-core`)

Exported from `packages/game-core/src/identity/index.ts` and re-exported from `@online-zoo/game-core`:

```ts
export const PLAYER_IDENTITY_STORAGE_KEY = 'online-zoo:player-identity:v1';

export function validateDisplayName(candidate: unknown): DisplayNameValidationResult;
export function isValidAvatarAppearance(candidate: unknown): candidate is AvatarAppearance;
export function sanitizeAvatarAppearance(candidate: unknown): AvatarAppearance;
export function getOutfitColors(outfitId: OutfitId): { primary: string; secondary: string; accent: string };
export function getSkinToneHex(skinToneId: SkinToneId): string;
export function getHairColorHex(hairColorId: HairColorId): string;

export function loadOrCreatePlayerIdentity(storage?: Storage): PlayerIdentityProfile;
export function savePlayerIdentity(profile: PlayerIdentityProfile, storage?: Storage): PlayerIdentityProfile;
```

---

## 2. Extended Wire Protocol Messages (`packages/game-core/src/multiplayer/protocol.ts`)

### Client → Server Messages

1. **`join_instance` (Extended)**:
   ```json
   {
     "type": "join_instance",
     "roomId": "panda-forest-1",
     "resumeToken": "optional-token",
     "playerId": "player-uuid-1234",
     "displayName": "BambooRanger",
     "avatar": {
       "skinTone": "golden-sand",
       "hairstyle": "bamboo-ponytail",
       "hairColor": "espresso-black",
       "outfit": "ranger-emerald",
       "accessory": "safari-hat"
     }
   }
   ```

2. **`update_identity` (New)**:
   Sent when a connected player clicks **Confirm & Save** in the Avatar Customizer (`FR-016`):
   ```json
   {
     "type": "update_identity",
     "playerId": "player-uuid-1234",
     "displayName": "PandaScout",
     "avatar": {
       "skinTone": "amber-tan",
       "hairstyle": "sun-spiky",
       "hairColor": "forest-teal",
       "outfit": "botanist-cobalt",
       "accessory": "round-glasses"
     }
   }
   ```

### Server → Client Messages

1. **`welcome_snapshot` & `player_joined` (Extended)**:
   Every `RemoteVisitorSummary` in `players` and `player` includes `playerId`, `displayName`, `accentColor`, and `avatar: AvatarAppearance`.
2. **`player_identity_updated` (New)**:
   Broadcast to all sessions in the room when a player's `update_identity` request passes server-side validation (`FR-016`):
   ```json
   {
     "type": "player_identity_updated",
     "sessionId": "visitor-101",
     "playerId": "player-uuid-1234",
     "displayName": "PandaScout",
     "accentColor": "#3b82f6",
     "avatar": {
       "skinTone": "amber-tan",
       "hairstyle": "sun-spiky",
       "hairColor": "forest-teal",
       "outfit": "botanist-cobalt",
       "accessory": "round-glasses"
     },
     "serverTimestamp": 1762260000100
   }
   ```
3. **`error_notice` (Used for rejected `update_identity`)**:
   If a client sends an invalid `displayName` or invalid `avatar` in `update_identity`, the server rejects the mutation and responds with `{ type: "error_notice", code: "INVALID_IDENTITY_UPDATE", message: "..." }` (`FR-004`, `FR-005`, `FR-007`, `SC-006`).

---

## 3. UI & 3D Component Contracts (`@online-zoo/ui` & `@online-zoo/game-client`)

### Required `data-testid` Selectors for Automated E2E & Integration Verification

- **HUD & Entry Controls**:
  - `data-testid="open-avatar-customizer-btn"`: Button in the HUD (and Welcome overlay) to open the Identity & Avatar Customizer.
  - `data-testid="local-visitor-badge"`: Displays the local player's active confirmed `displayName` in the HUD.
  - `data-testid="local-avatar-nameplate"`: Overhead 3D world nameplate above the local player's avatar showing their confirmed `displayName`.
  - `data-testid="remote-visitor-badge-{sessionId}"`: Overhead 3D world nameplate above each remote player's avatar showing their confirmed (and room-disambiguated) `displayName`.
- **Avatar Customizer Modal / Studio (`packages/ui/src/AvatarCustomizerModal.tsx`)**:
  - `data-testid="avatar-customizer-modal"`: Root container when the customizer is open.
  - `data-testid="display-name-input"`: Text input for editing the player's display name.
  - `data-testid="display-name-error"`: Validation/moderation error message banner when the draft display name is invalid.
  - `data-testid="avatar-preview-card"`: Live visual preview card showing the draft display name and all 5 draft appearance attributes (`data-preview-skin`, `data-preview-hairstyle`, `data-preview-haircolor`, `data-preview-outfit`, `data-preview-accessory`).
  - Category option buttons:
    - `data-testid="skin-option-{id}"` (e.g., `skin-option-amber-tan`)
    - `data-testid="hairstyle-option-{id}"` (e.g., `hairstyle-option-bamboo-ponytail`)
    - `data-testid="haircolor-option-{id}"` (e.g., `haircolor-option-forest-teal`)
    - `data-testid="outfit-option-{id}"` (e.g., `outfit-option-botanist-cobalt`)
    - `data-testid="accessory-option-{id}"` (e.g., `accessory-option-round-glasses`)
  - Action buttons:
    - `data-testid="confirm-avatar-btn"`: Confirms, validates, saves to `localStorage`, and broadcasts to multiplayer.
    - `data-testid="cancel-avatar-btn"`: Cancels draft changes and restores the previously confirmed profile.
    - `data-testid="reset-avatar-btn"`: Resets draft appearance slots to `DEFAULT_AVATAR_APPEARANCE`.

