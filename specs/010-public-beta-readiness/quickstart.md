# Public Beta Release Readiness & Operations Runbook (`010-public-beta-readiness`)

## 1. Supported Browsers & Minimum Device Matrix

| Platform | Supported Browsers | Minimum Hardware Expectations | Target Frame Rate |
| :--- | :--- | :--- | :--- |
| **Desktop (Windows / macOS / Linux)** | Chrome 115+, Edge 115+, Firefox 115+, Safari 16.4+ | Dual-core CPU, 4 GB RAM, WebGL 2.0 integrated or discrete GPU | `60 FPS` (`High` / `Medium` quality) |
| **Mobile & Tablet (iOS / iPadOS / Android)** | iOS Safari 16.4+, Android Chrome 115+ | 3 GB RAM, WebGL 2.0 GPU, touchscreen (`>= 360x640` viewport) | `30–60 FPS` (Auto-adapts to `Medium` / `Low` below `28 FPS`) |

---

## 2. Known Public Beta Limitations (`v0.10.0-beta`)

1. **Single-Region Authority**: All zoo instances currently run within a single regional WebSocket authority process; cross-region latency may be higher for distant visitors.
2. **Browser-Scoped Local Persistence**: Player identity, Zoo Coins, food inventory, and Zoo Passport stamps persist in browser `localStorage` and are synchronized into the active server authority upon connection; clearing browser site data resets local profile state unless Player ID is backed up.
3. **Initial Species & Habitat Set**: Public Beta features the **Panda Forest** sanctuary with Giant Pandas, Emperor Penguins, and River Otters; additional biomes are scheduled for future updates.
4. **Text & Emote Socialization Only**: Proximity text chat, 5 expressive emotes, and shared bench/table seating are supported; voice chat is intentionally excluded for player safety.

---

## 3. Deployment, Zero-Disruption Update & Rollback Procedure

### Controlled Update / Maintenance Procedure
1. Open the in-game **Help & Beta (`?`) → Operations & Telemetry** tab (or send `set_maintenance_notice`) and broadcast a maintenance banner:
   - *"Scheduled Beta update arriving in 5 minutes. Your Zoo Passport and Coins are automatically saved."*
2. If draining a specific instance before maintenance, toggle that instance to **Unavailable (`unhealthy`)** in the **Social & Instances** drawer so `ZooInstanceAuthority` automatically evacuates connected visitors to a healthy instance (`placementReason: 'failover_recovery'`).
3. Deploy the new release build (`pnpm build` → restart web/ws server). Connected clients automatically enter the `Reconnecting` state and resume their session within the `30s` grace window while re-syncing `diningWallet` and `passportState`.

### Rollback Procedure
1. If `/api/health` reports `status: "degraded"` or post-deploy E2E smoke checks fail:
   - Revert to the previous tagged commit (`git checkout <prev-tag>`).
   - Rebuild and restart the server (`pnpm build && pnpm start`).
2. Because all client persistence schemas (`schemaVersion: 1`) use forward-compatible sanitization (`sanitizePersistedDiningState`, `sanitizePassportState`, `sanitizePersistedSocialState`, `sanitizeBetaReadinessState`), rolling back the server binary never corrupts client `localStorage` data.

---

## 4. State Backup & Recovery Verification

- **Player Data Recovery**: Players can copy their unique `playerId` from the HUD badge (`hud-player-id-badge`) or Social Drawer at any time. All wallet, inventory, and passport mutations are dual-written to `localStorage` and the in-memory server authority map.
- **Verification Commands**:
  ```powershell
  pnpm typecheck
  pnpm lint
  pnpm test
  pnpm --filter @online-zoo/web exec playwright test e2e/public-beta-readiness.spec.ts
  ```

