# Quickstart: World Zones & Entrance Lobby (`world-zones`)

## 1. Entering the Zoo Lobby
1. Start the standalone server (`pnpm --filter @online-zoo/server dev`) and web client (`pnpm --filter @online-zoo/web dev`).
2. Open `http://localhost:3000`.
3. Click **Enter Sanctuary** — you spawn in **Zoo Lobby** (`zoo-lobby-1`) at the arrival plaza with ticket booths, zone directory signage, benches, meeting point, and the North Gate to **Panda Forest**.

## 2. Travelling Through Zone Gates
1. Walk north (`W`) to the Panda Forest Gate (`[0, 0, -14.0]`) until the prompt **`Enter Panda Forest?`** appears.
2. Press `E` (or click the prompt button) to transition into **Panda Forest** (`panda-forest-1`), spawning at the paired south gate (`[0, 0.1, 14.2]`).
3. Turn around to the south gate (`[0, 0, 16.4]`) until **`Enter Zoo Lobby?`** appears, and press `E` to return to **Zoo Lobby** at `[0, 0.1, -11.2]`.

