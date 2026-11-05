# Data Model: Web & Server Split (`web-server-split`)

## 1. `ServerRuntimeConfig` (`apps/server`)

| Field | Type | Constraints / Defaults | Description |
|-------|------|------------------------|-------------|
| `port` | `number` | Integer `0`–`65535`, default `4000` (`process.env.PORT`) | TCP port for HTTP occupancy + WebSocket server |
| `allowedOrigins` | `string[]` | Parsed from comma-separated `process.env.ALLOWED_ORIGINS`, default `['*']` | Allowed `Origin` values for HTTP CORS and WebSocket upgrades |
| `wsPath` | `string` | Default `'/ws/zoo'` | WebSocket upgrade path |
| `tickRateHz` | `number` | Default `20` (`50ms` interval) | Authoritative room tick frequency |

## 2. `ZoneOccupancyEntry` & `OccupancyResponse` (Shared Protocol + `apps/server` HTTP)

| Field | Type | Description |
|-------|------|-------------|
| `status` | `'ok'` | Server health indicator |
| `serverTimestamp` | `number` | Epoch ms when occupancy snapshot was generated |
| `totalPlayers` | `number` | Total active connected players across all rooms |
| `zones` | `ZoneOccupancySummary[]` | Aggregated occupancy per zone (`zoneId`, `displayName`, `roomId`, `playerCount`, `maxPlayers`, `isFull`, `status`) |
| `rooms` | `ZooInstanceSummary[]` | Per-room instance occupancy summaries from `ZooInstanceAuthority.getAvailableInstances()` |

## 3. `MultiplayerServerHub` (`apps/server`)

- Owns `authority: ZooInstanceAuthority`.
- Maintains active client bindings (`sessionId`, `playerId`, `roomId`, `send`, `close`).
- Dispatches all `ClientMultiplayerMessage` types to `ZooInstanceAuthority` and broadcasts resulting `ServerMultiplayerMessage` payloads to room or session recipients.
- Provides both `attachToHttpServer(httpServer, config)` (for `ws` WebSocket upgrades) and `createTransportFactory()` (for deterministic in-memory multi-client testing).

