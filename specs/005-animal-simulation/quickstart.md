# Quickstart & Validation Guide: Animal Simulation (Feature 005)

## Prerequisites

- Node.js `>= 20`
- `pnpm` `>= 9`

## 1. Run Unit & Multi-Client Integration Tests

Verify species behavior state machines, habitat boundary clamping, obstacle avoidance, encyclopedia discovery persistence, feeding session cooldowns, and multiplayer animal synchronization:

```powershell
pnpm --filter @online-zoo/game-core test
```

**Expected Outcome**:
- `packages/game-core/__tests__/animalSimulation.test.ts` passes all unit and multi-session synchronization assertions (`SC-001` through `SC-006`).

## 2. Run Full Monorepo Typecheck & Lint

```powershell
pnpm typecheck
pnpm lint
```

**Expected Outcome**:
- Zero TypeScript or strict `noUncheckedIndexedAccess` errors across all 6 workspace packages.

## 3. Run Multi-Session Browser E2E Verification

```powershell
pnpm --filter @online-zoo/web exec playwright test e2e/animal-simulation.spec.ts
```

**Expected Outcome**:
- Two browser sessions join the zoo instance, observe consistent animal behavior states for Giant Pandas, Penguins, and Otters, inspect animal information panels on desktop/mobile without overflow, discover all 3 species in the persistent Animal Encyclopedia (`3/3`), and trigger a synchronized habitat feeding session with enforced cooldowns.

