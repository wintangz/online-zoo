# Server Endpoints Contract (`web-server-split`)

## 1. WebSocket Endpoint: `GET /ws/zoo?room=<roomId>`

- **Protocol**: WebSocket (`ws://` or `wss://`)
- **Origin Enforcement**: When `ALLOWED_ORIGINS` is configured with specific origins (not `*`), upgrade requests whose `Origin` header does not match an allowed origin are rejected with `HTTP/1.1 403 Forbidden`.
- **Message Contract**: Uses the shared `ClientMultiplayerMessage` and `ServerMultiplayerMessage` discriminated unions from `@online-zoo/game-core`.

## 2. HTTP Occupancy Endpoint: `GET /occupancy` (aliases: `GET /api/occupancy`, `GET /health`)

- **Method**: `GET`, `OPTIONS`
- **CORS Headers**:
  - `Access-Control-Allow-Origin`: `<matching origin or *>`
  - `Access-Control-Allow-Methods`: `GET, OPTIONS`
  - `Access-Control-Allow-Headers`: `Content-Type`
- **Response (`200 OK`, `application/json`)**:
  ```json
  {
    "status": "ok",
    "serverTimestamp": 1730000000000,
    "totalPlayers": 2,
    "zones": [
      {
        "zoneId": "panda-forest",
        "displayName": "Panda Forest Sanctuary",
        "roomId": "panda-forest-1",
        "playerCount": 2,
        "maxPlayers": 16,
        "isFull": false,
        "status": "healthy"
      }
    ],
    "rooms": [
      {
        "roomId": "panda-forest-1",
        "label": "Panda Forest #1 (Main Plaza)",
        "visitorCount": 2,
        "maxPlayers": 16,
        "isFull": false,
        "status": "healthy",
        "friendCount": 0,
        "isOverflow": false
      }
    ]
  }
  ```

## 3. Non-Existent HTTP Routes

- Any request to a path other than `/occupancy`, `/api/occupancy`, or `/health` returns `404 Not Found` with `{"error":"Not Found"}`. `apps/server` serves no HTML pages and no static assets.

