# Quickstart & Validation Guide: Web & Server Split (`web-server-split`)

## 1. Environment Configuration

Copy the `.env.example` templates if customizing ports or origins:
- `apps/server/.env.example` -> `PORT=4000`, `ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`
- `apps/web/.env.example` -> `NEXT_PUBLIC_WS_URL=ws://localhost:4000/ws/zoo`

## 2. Starting Processes Together or Alone

- **Start both web and server from repo root**:
  ```bash
  pnpm dev
  ```
- **Start standalone game server alone**:
  ```bash
  pnpm --filter @online-zoo/server dev
  ```
- **Start web client alone**:
  ```bash
  pnpm --filter @online-zoo/web dev
  ```

## 3. Verification Commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @online-zoo/web exec playwright test e2e/multiplayer-sync.spec.ts
```

