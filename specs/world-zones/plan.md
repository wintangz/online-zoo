# Implementation Plan: World Zones & Entrance Lobby (`world-zones`)

**Branch**: `fix/world-zones` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/world-zones/spec.md` and art style guide from `/specs/world-zones/art-style-guide.md`

## Summary

Turn the single-map world into a multi-zone world (`'zoo-lobby'` and `'panda-forest'`) backed by rooms on `@online-zoo/server` and scene components in `@online-zoo/game-client`. Add a shared zone registry in `@online-zoo/game-core`, declare zone-to-asset mappings in `@online-zoo/game-assets`, build the flat-shaded low-poly `ZooLobbyScene.tsx` entrance plaza (ticket booths, zone directory signage, benches, meeting point, gate to Panda Forest, zero animals), implement symmetric interactable zone gates (`'Enter <zone>?'`) with paired arrival spawns and loading screen destination display, annotate `FriendStatusEntry` with each friend's current zone, and spawn every web client player in `zoo-lobby`.

## Technical Context

**Language/Version**: TypeScript 5.6 (Strict mode)  
**Primary Dependencies**: `@online-zoo/game-core`, `@online-zoo/game-assets`, `@online-zoo/game-client` (React Three Fiber, Three.js, Rapier), `@online-zoo/ui`, `@online-zoo/server`, `@online-zoo/web`  
**Testing**: Vitest (`pnpm test`), TypeScript (`pnpm typecheck`), Playwright E2E  
**Target Platform**: Browser (`apps/web`) + Node.js (`apps/server`)

## Constitution Check

- **Architecture Law**: Zones are rooms on `apps/server`; 3D scenes (`ZooLobbyScene`, `PandaForestScene`) live exclusively in `@online-zoo/game-client`; shared zone registry and protocol types live in `@online-zoo/game-core`.
- **Versioning Law**: Referenced only by slug `world-zones` on branch `fix/world-zones`.

## Project Structure

```text
specs/world-zones/
├── art-style-guide.md
├── spec.md
├── ASSUMPTIONS.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── tasks.md

packages/game-assets/src/
└── manifest.ts                   # Zone-to-asset mapping (zones: WorldZoneId[])

packages/game-core/src/
├── world/
│   ├── zoneRegistry.ts           # WORLD_ZONES_BY_ID, ZOO_LOBBY_LAYOUT, gateLinks, helpers
│   ├── pandaForestLayout.ts      # Adds return gate 'gate-to-zoo-lobby'
│   └── index.ts
├── state/gameStore.ts            # Tracks currentZoneId, pendingGateSpawn, zoneTransitionTarget
└── multiplayer/
    ├── protocol.ts               # DEFAULT_PUBLIC_INSTANCES includes zoo-lobby-1
    └── multiplayerClient.ts      # switchZoneViaGate & lobby-first spawn support

packages/game-client/src/
├── environment/
│   ├── ZooLobbyScene.tsx         # Flat-shaded low-poly entrance plaza (no animals)
│   └── InteractiveProps.tsx      # Renders gate triggers & handles enter_zone_gate
└── runtime/
    ├── GameLoopController.tsx    # Uses active zone layout for collisions & interactions
    └── ZooGameCanvas.tsx         # Switches between ZooLobbyScene and PandaForestScene

packages/ui/src/
├── EntryLoadingScreen.tsx        # Displays destination zone name during gate transitions
├── GameHudOverlay.tsx            # Displays current zone name & icon
└── SocialInteractionOverlay.tsx  # Displays friend's current zone name

apps/server/src/
└── zooInstanceAuthority.ts       # Zone-aware room layouts, 0 animals in zoo-lobby, friend zone info, occupancy zones
```

