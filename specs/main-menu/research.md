# Research: Pre-Game Main Menu (`main-menu`)

## Decision 1: Pre-Canvas Mounting Lifecycle in `ZooWorldExperience.tsx`
- **Decision**: Add `hasEnteredFromMainMenu: boolean` (or `phase === 'menu'` vs `phase === 'loading' | 'ready' | 'playing' | 'paused'`) so `DynamicZooGameCanvas` is NOT mounted while the player is on the Main Menu. When the player clicks **PLAY**, `ZooWorldExperience` mounts `DynamicZooGameCanvas` configured with the selected `roomId` (e.g. `'zoo-lobby-1'`, `'panda-forest-1'`, or a `?room=...` override) and `wsUrl = process.env.NEXT_PUBLIC_WS_URL`, and transitions directly into the active zone once the canvas reports `onReady`.
- **Rationale**: Satisfies FR-001 ("before the canvas mounts") and prevents wasted WebGL context creation or background WebSocket connections while the user is configuring their profile or viewing server occupancy on the Main Menu.

## Decision 2: Live Occupancy Polling & Designed Failure States
- **Decision**: Create `deriveOccupancyUrlFromWsUrl(wsUrl)` and `fetchServerOccupancy(wsUrl)` in `@online-zoo/game-core`. On Main Menu mount (and on manual Refresh or periodic 5s poll), fetch `/occupancy`.
  - If `/occupancy` fails (`fetch` error or non-200 HTTP status), display the designed **Server Unreachable** card (`data-testid="menu-error-server-unreachable"`) with a Retry button.
  - If the user clicks **PLAY** with an invalid display name (`!validateDisplayName(name).valid`), display the **Name Rejected** card (`data-testid="menu-error-name-rejected"`).
  - If the user clicks **PLAY** when the selected zone/room is reported full (`isFull === true`) or the server rejects join with `ROOM_FULL`, display the **Room Full** card (`data-testid="menu-error-room-full"`).
- **Rationale**: Server-unreachable is a normal condition when the web client is deployed separately from the game server.

