# Quickstart & Validation Guide: Multiplayer Foundation (Feature 002)

**Feature Branch**: `002-multiplayer-foundation`  
**Related Spec**: [spec.md](./spec.md) | **Contracts**: [multiplayer-protocol.md](./contracts/multiplayer-protocol.md), [client-interpolation-and-ui.md](./contracts/client-interpolation-and-ui.md)

## 1. Prerequisites & Setup

- **Node.js**: `>= 20.11`
- **pnpm**: `>= 9.x`
- **Browser**: Evergreen desktop browser (Chrome, Edge, Firefox, Safari) or mobile browser supporting WebGL2 and WebSockets.

Install dependencies from the repository root:

```bash
pnpm install
```

## 2. Running the Multiplayer Zoo Locally

Start the unified Next.js + Authoritative WebSocket server (`http://localhost:3000` and `ws://localhost:3000/ws/zoo`):

```bash
pnpm dev
```

## 3. Manual Multi-Session Verification Scenarios

### Scenario A: Shared Instance Presence, Join & Leave (`US1`, `SC-001`, `SC-004`)
1. Open **Browser Window A** at `http://localhost:3000` and click **"Enter Panda Forest"**.
2. Verify the HUD displays `Connected`, local badge `Explorer #101`, and `Visitors: 1`.
3. Open **Browser Window B** (or a mobile viewport tab) at `http://localhost:3000` and click **"Enter Panda Forest"**.
4. Verify:
   - Both windows update to `Visitors: 2` within `1.0 second`.
   - Window A and Window B spawn on distinct collision-free positions on the entry plaza (`radius <= 2.2m` around `[0, 0.1, 18]`) without stacking identically.
   - Each window renders the other player's 3D Explorer avatar with a distinct overhead badge (`Explorer #101` / `Explorer #102`) and outfit/hat accent color.
5. Close **Browser Window B** and verify that **Window A** removes `Explorer #102` and updates to `Visitors: 1` within `1.0 second`.

### Scenario B: Real-Time Synchronized Movement, Animations & Shared Props (`US2`, `SC-002`, `SC-003`)
1. With **Window A** and **Window B** side by side in the same instance:
   - Walk (`WASD` / Virtual Joystick), Run (`Shift` / `Run` button), and Jump (`Space` / `Jump` button) in **Window A**.
   - Observe **Window B** and verify that `Explorer #101`'s avatar smoothly interpolates position and facing angle (`<= 200ms` latency) and plays matching `Idle`, `Walking`, `Running`, and `Jumping` animations.
   - Walk through the remote player's avatar and confirm pass-through avatar-to-avatar movement (`Clarification #2`) while solid rocks, bamboo, the pond shoreline, and perimeter fences still block movement.
2. Walk up to the **Stone Garden Lantern** (`[4.2, 0, 1.5]`) in **Window A** and press `E` (or click the lantern). Verify the lantern light state toggles simultaneously in **Window B**.

### Scenario C: Authoritative Movement Validation & Reconciliation (`US3`, `SC-006`)
1. In the browser console of **Window A**, inspect `__ONLINE_ZOO_RUNTIME__.multiplayerClient` and attempt to send an out-of-bounds position (`[999, 0.1, 999]`), a position inside the blocked pond (`[-8, 0.1, -4]`), or an impossible speed spike.
2. Verify the server authority clamps the position to a legal walkable coordinate outside the pond/within the `36m` perimeter, reconciles **Window A**, and never broadcasts invalid coordinates to **Window B**.

### Scenario D: Network Interruption & In-App Reconnection (`US4`, `SC-007`, `SC-008`)
1. Trigger a simulated temporary network drop via `__ONLINE_ZOO_RUNTIME__.multiplayerClient.simulateNetworkDrop(2000)` (or toggle DevTools Offline briefly):
   - Verify the HUD displays `Reconnecting...` while local 3D exploration remains responsive.
   - Verify the client automatically reconnects within `5 seconds`, resumes its previous `Explorer #NNN` identity and position (`<= 30s` grace window), and resynchronizes remote players without reloading the page.
2. Trigger an extended disconnect that exhausts automatic retries:
   - Verify the HUD displays `Disconnected` and reveals the `"Reconnect to Zoo"` button (`data-testid="reconnect-multiplayer-btn"`).
   - Click `"Reconnect to Zoo"` and verify the session reconnects in-place without a browser refresh.

## 4. Automated Test & Build Verification Commands

```bash
# Run all unit and integration tests (including ZooInstanceAuthority, RemotePlayerInterpolator & MultiplayerClient)
pnpm test

# Run TypeScript typechecking and linting across all packages
pnpm typecheck
pnpm lint

# Build production bundles across all workspace packages
pnpm build

# Run multi-client Playwright E2E verification in Chrome
pnpm test:e2e
```

