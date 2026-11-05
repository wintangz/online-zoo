# Quickstart: Multiplayer Expansion & Zoo Instances (`009-multiplayer-expansion-and-instances`)

## 1. Run Unit & Multi-Instance Authority Tests
```bash
pnpm --filter @online-zoo/game-core test __tests__/multiplayerInstancesExpansion.test.ts
```

## 2. Run TypeScript & Workspace Verification
```bash
pnpm typecheck
pnpm lint
pnpm test
```

## 3. Run Multi-Session Playwright E2E Test
```bash
pnpm --filter @online-zoo/web exec playwright test e2e/multiplayer-instances-expansion.spec.ts
```

