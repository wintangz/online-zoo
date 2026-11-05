# Research & Decisions: World Zones & Entrance Lobby (`world-zones`)

## Decision 1: Zone Registry & Room Mapping (`@online-zoo/game-core`)
- **Decision**: Define `WorldZoneId = 'zoo-lobby' | 'panda-forest'` and `WorldZoneDescriptor` in `packages/game-core/src/world/zoneRegistry.ts`.
  - `'zoo-lobby'`: `roomId: 'zoo-lobby-1'`, `sceneId: 'zoo-lobby'`, `spawnPoint: [0, 0.1, 18]`, `spawnYaw: Math.PI`, `hasAnimals: false`, `gateLinks`: `[{ gateId: 'gate-to-panda-forest', targetZoneId: 'panda-forest', targetRoomId: 'panda-forest-1', pairedGateId: 'gate-to-zoo-lobby', promptText: 'Enter Panda Forest?', position: [0, 0, -14.0], triggerRadius: 3.2, arrivalPosition: [0, 0.1, 14.2], arrivalYaw: Math.PI }]`.
  - `'panda-forest'`: `roomId: 'panda-forest-1'`, `sceneId: 'panda-forest'`, `spawnPoint: [0, 0.1, 18]`, `spawnYaw: Math.PI`, `hasAnimals: true`, `gateLinks`: `[{ gateId: 'gate-to-zoo-lobby', targetZoneId: 'zoo-lobby', targetRoomId: 'zoo-lobby-1', pairedGateId: 'gate-to-panda-forest', promptText: 'Enter Zoo Lobby?', position: [0, 0, 16.4], triggerRadius: 3.0, arrivalPosition: [0, 0.1, -11.2], arrivalYaw: 0 }]`.
- **Rationale**: Keeps `'panda-forest-1'` as the primary `roomId` for `panda-forest` while adding `'zoo-lobby-1'` for `zoo-lobby` on top of the existing room/instance system.

## Decision 2: Gate Interaction via Existing `InteractionSystem`
- **Decision**: Add `'enter_zone_gate'` to `WorldPropReaction` and attach `targetZoneId` / `gateId` metadata to gate `InteractiveObjectMetadata` entries in both `ZOO_LOBBY_LAYOUT` and `PANDA_FOREST_LAYOUT`.
- **Rationale**: Reuses the existing proximity trigger, `InteractionPromptBanner` (`'Enter Panda Forest?'` / `'Enter Zoo Lobby?'`), keyboard `[E]` binding, and mobile tap button without inventing a separate trigger system.

## Decision 3: Paired Return Gate Arrival Spawn
- **Decision**: When a player confirms a gate transition (`triggerZoneGateTransition(gateLink)`), the client stores `pendingGateArrival` (`{ zoneId, position, yaw }`) and `transitionTargetZone` in `gameStore`, switches to `gateLink.targetRoomId` via `multiplayerClient.switchInstance(gateLink.targetRoomId)`, and applies `arrivalPosition` + `arrivalYaw` to `characterController` and `mutableRuntimeState.avatar` when the room transition completes (and sends a `player_move` update so the server authority records the paired gate position).
- **Rationale**: Ensures the player spawns directly at the paired return gate facing into the destination zone while keeping server authority synchronized.

