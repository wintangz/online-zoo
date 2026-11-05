# Quickstart: Asset Pipeline (`asset-pipeline`)

## Generate Content-Hashed GLB Assets & Verify Manifest v2

```bash
pnpm --filter @online-zoo/game-assets test
```

## Run Full Verification Suite

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @online-zoo/web exec playwright test e2e/playable-zoo-world.spec.ts e2e/multiplayer-sync.spec.ts
```

