# Feature Specification: World Zones & Entrance Lobby (`world-zones`)

**Feature Branch**: `fix/world-zones`  
**Created**: 2026-11-05  
**Status**: Implemented  
**Input**: Turn the single map into a multi-zone world with a shared zone registry, a lightweight Zoo Lobby entrance scene (`ZooLobbyScene.tsx`), interactable zone gates (`Enter <zone>?`) with paired return spawns, room-scoped presence/chat/animals, friend zone display, and lobby-first spawning.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Zone Registry & Zoo Lobby Entrance Plaza (Priority: P1)

Every visitor entering Online Zoo starts in the **Zoo Lobby** (`zoo-lobby`), a lightweight entrance plaza featuring ticket booths, zone directory signage, benches, a central meeting point, and no animals.

**Why this priority**: Establishing a fast-loading social entrance lobby and a formal zone registry in `@online-zoo/game-core` decouples world scenes from a single monolithic map.

**Independent Test**: Load the web client or inspect the zone registry; verify `zoo-lobby` (`roomId: 'zoo-lobby-1'`) and `panda-forest` (`roomId: 'panda-forest-1'`) are registered with valid `zoneId`, `displayName`, `roomId`, `sceneId`, `spawnPoint`, and `gateLinks`, and that every player spawns in `zoo-lobby` with `0` animals.

**Acceptance Scenarios**:

1. **Given** a player enters Online Zoo (or reconnects/resumes), **When** the session initializes, **Then** the player spawns in `zoo-lobby` (`ZooLobbyScene`) at the lobby spawn point with no animal simulation active in the lobby room.
2. **Given** the player is in `zoo-lobby`, **When** they explore the plaza, **Then** they see the ticket booths, zone signage listing `Zoo Lobby` and `Panda Forest`, benches, central meeting point plaque, and the gate to `Panda Forest`.

---

### User Story 2 - Symmetric Interactable Zone Gates & Loading Transitions (Priority: P1)

Players can walk up to a zone gate, see the prompt `'Enter <zone>?'`, and confirm to switch rooms, display the loading screen with the destination zone name, mount the destination scene, and spawn at the paired return gate.

**Why this priority**: Gates connect the multi-zone world using the existing interaction framework (`InteractionSystem`) and multiplayer room switching (`switch_instance`).

**Independent Test**: Move the player into the `'gate-to-panda-forest'` trigger in `zoo-lobby`, verify the prompt reads `'Enter Panda Forest?'`, trigger interaction, and verify the client switches to `'panda-forest-1'`, shows the destination name on the loading screen, renders `PandaForestScene`, and places the player at the paired return gate (`'gate-to-zoo-lobby'`). Trigger the return gate to verify symmetric return to `zoo-lobby`.

**Acceptance Scenarios**:

1. **Given** a player in `zoo-lobby` approaches `'gate-to-panda-forest'`, **When** they enter its interaction radius, **Then** the interaction prompt displays `'Enter Panda Forest?'`.
2. **Given** the player confirms the gate interaction, **When** the transition executes, **Then** `EntryLoadingScreen` displays `Panda Forest`, the client switches to room `'panda-forest-1'`, loads `PandaForestScene`, and spawns the player at the paired return gate position facing into `Panda Forest`.
3. **Given** a player in `panda-forest` approaches the return gate `'gate-to-zoo-lobby'`, **When** they confirm `'Enter Zoo Lobby?'`, **Then** they switch back to `'zoo-lobby-1'` and spawn at the paired gate in `zoo-lobby` facing into the lobby plaza.

---

### User Story 3 - Room-Scoped Presence/Chat/Animals & Friend Zone Visibility (Priority: P2)

Presence, proximity chat, and animal simulation remain scoped per room, while the friends list shows which zone each online friend is currently visiting.

**Why this priority**: Players in different zones should not see each other's avatars or proximity chat until they are in the same zone/room, while still being able to see which zone their friends are in.

**Independent Test**: Connect two players—one in `zoo-lobby-1` and one in `panda-forest-1`—who are friends; verify proximity chat and room ticks stay isolated per room, `zoo-lobby-1` has 0 animals while `panda-forest-1` simulates animals, and each player's `FriendStatusEntry` reports the friend's `zoneId` and `zoneDisplayName`.

**Acceptance Scenarios**:

1. **Given** Player A is in `zoo-lobby-1` and Player B is in `panda-forest-1`, **When** Player A sends proximity chat, **Then** Player B does not receive it, and `zoo-lobby-1` room ticks contain `0` animals.
2. **Given** Player A and Player B are friends in different zones, **When** social presence updates are built, **Then** `FriendStatusEntry` includes `zoneId` (`'panda-forest'`) and `zoneDisplayName` (`'Panda Forest'`) and renders the zone name in the Social & Friends drawer.

### Edge Cases

- **Overflow instances for a zone**: `resolveZoneForRoomId('panda-forest-2')` and `resolveZoneForRoomId('zoo-lobby-2')` resolve to `'panda-forest'` and `'zoo-lobby'` respectively so instance overflow works seamlessly across all zones.
- **Reconnect / Resume**: Reconnecting or resuming from the web client spawns the player in `zoo-lobby` as required by the foundation brief.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `@online-zoo/game-core` MUST export a zone registry (`WORLD_ZONES_BY_ID`, `WORLD_ZONES_LIST`, `getZoneById`, `resolveZoneForRoomId`) where each zone entry defines `zoneId`, `displayName`, `roomId`, `sceneId`, `spawnPoint`, `spawnYaw`, and `gateLinks`.
- **FR-002**: The zone registry MUST define `'zoo-lobby'` (`roomId: 'zoo-lobby-1'`, `sceneId: 'zoo-lobby'`) and `'panda-forest'` (`roomId: 'panda-forest-1'`, `sceneId: 'panda-forest'`).
- **FR-003**: `@online-zoo/game-client` MUST provide `ZooLobbyScene.tsx` built according to the art style guide (`specs/world-zones/art-style-guide.md`): entrance plaza with ticket booths/gates, signage listing the zones, benches, meeting point, and NO animals.
- **FR-004**: Zone gates MUST use the existing interaction framework (`InteractionSystem`) with prompt `'Enter <zone>?'`; confirming switches the client to the target zone's room, shows `EntryLoadingScreen` with the destination zone name, mounts the target scene, and spawns the player at the paired return gate.
- **FR-005**: Return gates MUST work symmetrically between `'zoo-lobby'` and `'panda-forest'`.
- **FR-006**: Presence, proximity chat, and animal simulation MUST remain scoped per room on `apps/server`, with `'zoo-lobby'` rooms having `0` animals.
- **FR-007**: `FriendStatusEntry` MUST include `zoneId` and `zoneDisplayName` and display each online friend's current zone in the friends list UI.
- **FR-008**: `@online-zoo/game-assets` manifest MUST declare the zone-to-asset mapping (`zones: WorldZoneId[]`) for each asset entry.
- **FR-009**: Every player entering via the web client MUST spawn in `'zoo-lobby'` always, including on reconnect/resume.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of web client sessions spawn in `'zoo-lobby'` (`ZooLobbyScene`) with 0 animals rendered in the lobby.
- **SC-002**: Gate interactions in both `'zoo-lobby'` (`'Enter Panda Forest?'`) and `'panda-forest'` (`'Enter Zoo Lobby?'`) transition rooms, display the destination zone name on `EntryLoadingScreen`, and place the avatar at the paired return gate coordinates.
- **SC-003**: `FriendStatusEntry` accurately reports `zoneId` and `zoneDisplayName` for online friends across zones.
- **SC-004**: All unit, integration, and Playwright E2E tests pass with zero TypeScript or lint errors.

