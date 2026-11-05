# Quickstart: Streamlined HUD & Entrance Gate Arrival (`011-hud-gate-ergonomics`)

## Verification Commands

```powershell
# 1. Run TypeScript typecheck, ESLint, and Vitest unit tests
pnpm typecheck; pnpm lint; pnpm test

# 2. Run Feature 011 Playwright E2E suite
pnpm --filter @online-zoo/web exec playwright test e2e/hud-gate-ergonomics.spec.ts
```

