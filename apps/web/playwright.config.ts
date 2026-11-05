import { defineConfig, devices } from '@playwright/test';

const e2ePort = Number(process.env.PLAYWRIGHT_PORT || 3100);
const wsPort = Number(process.env.PLAYWRIGHT_WS_PORT || 4100);
const baseURL = `http://localhost:${e2ePort}`;
const wsURL = `ws://localhost:${wsPort}/ws/zoo`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }
    }
  ],
  webServer: [
    {
      command: 'pnpm --filter @online-zoo/server dev',
      url: `http://localhost:${wsPort}/occupancy`,
      env: {
        PORT: String(wsPort),
        ALLOWED_ORIGINS: baseURL
      },
      reuseExistingServer: false,
      timeout: 60000
    },
    {
      command: `npx next dev -p ${e2ePort}`,
      url: baseURL,
      env: {
        PORT: String(e2ePort),
        NEXT_PUBLIC_WS_URL: wsURL
      },
      reuseExistingServer: false,
      timeout: 60000
    }
  ]
});

