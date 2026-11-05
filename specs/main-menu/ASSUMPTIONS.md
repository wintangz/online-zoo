# Assumptions Log: `main-menu`

1. **Deriving the HTTP `/occupancy` Endpoint from `NEXT_PUBLIC_WS_URL`**:
   - The client reads the game server address from `NEXT_PUBLIC_WS_URL` (e.g., `ws://localhost:4000/ws/zoo` or `wss://server.example.com/ws/zoo`).
   - To fetch live occupancy without requiring a separate environment variable, the client derives the HTTP occupancy URL by converting `ws://` → `http://` and `wss://` → `https://` and replacing the pathname with `/occupancy` (`deriveOccupancyUrlFromWsUrl(wsUrl)`).
2. **First-Time vs. Returning Visitor Detection**:
   - A player is considered a returning visitor if `loadSavedIdentityProfile()` finds a previously persisted profile in `localStorage` OR `betaReadiness.hasCompletedOnboarding` is `true` OR the user has entered the world at least once in the session.
   - First-time visitors have `Zoo Lobby` (`'zoo-lobby'`) selected and locked in the Zone selector (`Panda Forest` shows a `"Complete first lobby visit to unlock direct entry"` badge); once they click **PLAY** and enter `Zoo Lobby`, their identity is persisted to `localStorage`, unlocking all zones on subsequent visits.
   - If a shared room link (`?room=...`) is present in the URL, it pre-selects that target room/zone for returning visitors or custom room links, while still requiring the player to click **PLAY** on the Main Menu before mounting the canvas.
3. **Play Button Test ID Compatibility**:
   - The Main Menu **PLAY** button exposes `data-testid="enter-world-btn"` (and `data-aria-play="true"`) so existing and updated Playwright E2E selectors cleanly target the Play button while verifying the pre-canvas menu flow.

