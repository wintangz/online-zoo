# Implementation Plan: Pre-Game Main Menu (`main-menu`)

**Branch**: `fix/main-menu` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/main-menu/spec.md`

## Summary

Add a pre-game Main Menu in `apps/web` that renders before the 3D WebGL canvas mounts. The Main Menu includes:
1. **PROFILE block**: display name input with `validateDisplayName`, avatar preview chip with outfit/skin/hair/accessory summary, and button to open `AvatarCustomizerModal`, persisted via `identityPersistence`.
2. **SERVER/ZONE block**: live zone occupancy fetched from `apps/server`'s `/occupancy` endpoint (derived from `NEXT_PUBLIC_WS_URL`), displaying zone name and player count (`playerCount / maxPlayers`). `Zoo Lobby` is the default selection; first-time players start at the lobby only while returning players may pick any zone. Shared room links (`?room=...`) pre-select a room/zone while still passing through **PLAY**.
3. **PLAY button**: validates display name, checks server reachability and room capacity, joins the selected zone/room via `NEXT_PUBLIC_WS_URL`, and mounts `DynamicZooGameCanvas`.
4. **Settings & Failure States**: Settings (`SettingsMenuModal`) opens from the Main Menu or in-game sharing `gameStore.settings`. Designed failure banners render for `server unreachable`, `room full`, and `name rejected` without ever showing a blank screen.
5. **Cleanup**: Remove the old in-flow name prompt from `EntryLoadingScreen` so `EntryLoadingScreen` is purely a transition/asset loading overlay.

## Technical Context

- **Language/Version**: TypeScript 5.6 (Strict mode), React 18.3, Next.js 14.2
- **Primary Dependencies**: `@online-zoo/game-core`, `@online-zoo/ui`, `@online-zoo/game-client`
- **Testing**: Vitest (`pnpm test`), TypeScript (`pnpm typecheck`), Playwright E2E (`playable-zoo-world.spec.ts`, `multiplayer-sync.spec.ts`)
- **Constraints**: `apps/web` is client-only; `apps/server` is standalone Node WS + `/occupancy` server.

## Project Structure

```text
packages/game-core/
└── src/
    ├── multiplayer/
    │   └── occupancyClient.ts      # deriveOccupancyUrlFromWsUrl & fetchServerOccupancy
    └── state/
        └── gameStore.ts            # Main menu error state, selected zone/room, settings modal toggle

packages/ui/
└── src/
    ├── MainMenuScreen.tsx          # Pre-game Main Menu (PROFILE, SERVER/ZONE, PLAY, Settings, Failure states)
    ├── EntryLoadingScreen.tsx      # Cleaned up: loading/zone-transition overlay only (no name prompt)
    └── SettingsMenuModal.tsx       # Reachable from Main Menu and in-game

apps/web/
├── src/components/
│   └── ZooWorldExperience.tsx      # Renders MainMenuScreen before mounting DynamicZooGameCanvas
└── e2e/
    ├── playable-zoo-world.spec.ts  # Updated for Main Menu entry path
    └── multiplayer-sync.spec.ts    # Updated for Main Menu entry path + two browser windows seeing each other move
```

