# Quickstart & Verification Guide: Player Identity & Avatar (Feature 003)

**Feature Branch**: `003-player-identity-avatar`  
**Date**: 2026-11-04

## Prerequisites

- Node.js `>= 20.11`
- `pnpm` (`>= 9.x`)

## 1. Start the Unified Multiplayer Zoo Server

```bash
pnpm dev
```

Open `http://localhost:3000` in two browser windows side by side.

## 2. Manual Verification Scenarios

1. **Default Identity & Immediate Playability (`US1`, `FR-001`, `FR-002`)**:
   - Click **Enter Panda Forest** immediately without opening the customizer.
   - Verify the local avatar spawns with the default Explorer look and an overhead nameplate (`"Explorer #..."`), and verify `localStorage.getItem('online-zoo:player-identity:v1')` contains a persistent `playerId`.
2. **Customize, Preview, Cancel, Confirm & Persist (`US2`, `FR-006`–`FR-011`)**:
   - Click **Customize Avatar** (`data-testid="open-avatar-customizer-btn"`).
   - Change **Body/Skin Color**, **Hairstyle**, **Hair Color**, **Outfit**, and **Accessories**, and type a new display name in the live preview.
   - Click **Cancel** and verify the avatar in the world keeps its previous name and appearance.
   - Reopen **Customize Avatar**, select new options across all 5 categories, enter `"BambooRanger"`, and click **Confirm & Save**.
   - Reload the browser page (`F5`) and verify `"BambooRanger"` and all 5 appearance options are restored automatically.
3. **Multiplayer Real-Time Appearance & Name Sync (`US3`, `FR-013`–`FR-017`)**:
   - With two browser sessions connected to the Panda Forest, customize Player A's name and outfit and click **Confirm & Save**.
   - Verify Player B immediately sees Player A's overhead nameplate and 3D avatar appearance update in real time.
4. **Display Name Validation & Moderation (`US4`, `FR-004`, `FR-005`, `SC-006`)**:
   - Enter `"ab"` (too short), `"<script>"` (invalid characters), `"admin"` (reserved), or a blocked profanity word in the display name input.
   - Verify `data-testid="display-name-error"` explains the validation rule and **Confirm & Save** does not overwrite the saved profile.

## 3. Automated Verification Commands

```bash
# Run unit & integration tests (identity persistence, display name moderation, catalog validation, multiplayer sync)
pnpm test

# Run workspace typecheck and linter
pnpm typecheck
pnpm lint

# Run production build
pnpm build

# Run Playwright multi-session E2E tests (including apps/web/e2e/player-identity-avatar.spec.ts)
pnpm test:e2e
```

