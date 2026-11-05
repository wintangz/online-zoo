# Tasks: World Zones & Entrance Lobby (`world-zones`)

**Input**: Design documents from `/specs/world-zones/`
**Prerequisites**: [art-style-guide.md](./art-style-guide.md), [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md)

## Phase 1: Art Style Guide & Asset Manifest Zone Mapping

- [X] T001 Write the flat-shaded low-poly art style guide in `specs/world-zones/art-style-guide.md`
- [X] T002 Declare the zone-to-asset mapping (`zones: ('zoo-lobby' | 'panda-forest')[]` and `getAssetsForZone`) in `packages/game-assets/src/manifest.ts` and export `ZOO_PALETTE` colors

---

## Phase 2: Shared Zone Registry & Layouts (`@online-zoo/game-core`)

- [X] T003 Create `packages/game-core/src/world/zoneRegistry.ts` defining `WORLD_ZONES_BY_ID` (`'zoo-lobby'` and `'panda-forest'`), `ZOO_LOBBY_LAYOUT`, `gateLinks`, `getZoneById`, `resolveZoneForRoomId`, and `getLayoutForRoomId`
- [X] T004 Update `packages/game-core/src/world/pandaForestLayout.ts`, `packages/game-core/src/types.ts`, and `packages/game-core/src/multiplayer/protocol.ts` to add the return gate `'gate-to-zoo-lobby'` (`'Enter Zoo Lobby?'`), `enter_zone_gate` reaction, `zoneId`/`zoneDisplayName` on `FriendStatusEntry`, and `'zoo-lobby-1'` in `DEFAULT_PUBLIC_INSTANCES`
- [X] T005 Update `packages/game-core/src/state/gameStore.ts` and `packages/game-core/src/multiplayer/multiplayerClient.ts` to track `currentZoneId`, `transitionTargetZone`, `pendingGateArrival`, `triggerZoneGateTransition`, and lobby-first spawning

---

## Phase 3: Server Zone Support (`@online-zoo/server`)

- [X] T006 Update `apps/server/src/zooInstanceAuthority.ts` to use zone-specific layouts per room, return `0` animals for `'zoo-lobby'` rooms, populate `zoneId` and `zoneDisplayName` on `FriendStatusEntry`, and report both `'zoo-lobby'` and `'panda-forest'` in `buildOccupancySnapshot()`

---

## Phase 4: Zoo Lobby Scene, Gate Transitions & UI (`@online-zoo/game-client`, `@online-zoo/ui`, `@online-zoo/web`)

- [X] T007 Build `packages/game-client/src/environment/ZooLobbyScene.tsx` (flat-shaded low-poly entrance plaza with ticket booths, zone signage, benches, meeting point, gate archway to Panda Forest, and NO animals)
- [X] T008 Update `packages/game-client/src/environment/InteractiveProps.tsx`, `packages/game-client/src/runtime/GameLoopController.tsx`, and `packages/game-client/src/runtime/ZooGameCanvas.tsx` to render `ZooLobbyScene` vs `PandaForestScene` by active zone, use active zone layout collisions/interactions, and execute gate transitions
- [X] T009 Update `packages/ui/src/EntryLoadingScreen.tsx`, `packages/ui/src/GameHudOverlay.tsx`, `packages/ui/src/SocialInteractionOverlay.tsx`, and `apps/web/src/components/ZooWorldExperience.tsx` to show destination zone loading screen, current zone name, friend zone name, and default lobby spawn

---

## Phase 5: Unit, Integration & E2E Verification

- [X] T010 Add unit and server integration tests in `apps/server/__tests__/worldZones.test.ts` and `packages/game-assets/__tests__/manifest.test.ts` covering the zone registry, gate transitions, room-scoped presence/chat/0-animals in lobby, friend zone status, and lobby-first spawn
- [X] T011 Verify `pnpm typecheck`, `pnpm lint`, `pnpm test`, and Playwright E2E tests pass
