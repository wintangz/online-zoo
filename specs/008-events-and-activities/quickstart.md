# Quickstart: Events & Activities (`008-events-and-activities`)

## Running Locally

```bash
pnpm dev
```

1. Open `http://localhost:3000` and click **Enter Panda Forest**.
2. Click **🎪 Events** in the top HUD bar (or press `V`) to open the **Events & Activities** modal.
3. Browse **Active** and **Upcoming** zoo events, click **Join Activity** on an active event, click the interactive activity button to contribute to the group goal, and click **Claim Reward** to earn Zoo Coins and a Zoo Passport zone stamp.
4. Use the **Seasonal Theme** selector inside the Events modal to preview **Spring Blossom**, **Summer Lantern**, **Autumn Harvest**, or **Standard Sanctuary** decorations live in the 3D world.

## Running Tests

```bash
# Unit & multi-client authority tests
pnpm test

# Playwright E2E test for Feature 008
pnpm --filter @online-zoo/web exec playwright test e2e/events-and-activities.spec.ts
```

