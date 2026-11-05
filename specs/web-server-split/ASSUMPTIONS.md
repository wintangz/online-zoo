# Assumptions Log: `web-server-split`

1. **Default Standalone Server Port (`4000`)**: `apps/web` uses Next.js default port `3000`. `apps/server` defaults `PORT` to `4000` when `process.env.PORT` is not set, and the client's local-dev fallback when `NEXT_PUBLIC_WS_URL` is unset is `ws://localhost:4000/ws/zoo`.
2. **Occupancy HTTP Endpoint Paths (`/occupancy` & `/api/occupancy`)**: `apps/server` exposes `GET /occupancy` (and aliases `/api/occupancy` and `/health`) returning `{ status: 'ok', serverTimestamp, totalPlayers, zones, rooms }` so both `web-server-split` verification and the upcoming `main-menu` feature can query zone and room occupancy directly.
3. **`ALLOWED_ORIGINS` Parsing**: `ALLOWED_ORIGINS` is parsed as a comma-separated list of allowed origins. When unset or set to `*`, any origin is allowed for local development convenience; when configured with specific origins, CORS headers and WebSocket `upgrade` requests enforce the allowlist.
4. **Single Hub Implementation in `apps/server`**: `apps/web/server.mjs` and `apps/web/src/server/multiplayerWsHub.ts` are removed from `apps/web`, and `ZooInstanceAuthority` + `InMemoryMultiplayerHub` are moved from `packages/game-core` into `apps/server` and unified with the WebSocket hub so that `apps/server` holds the single multiplayer hub and authority implementation in the repository.

