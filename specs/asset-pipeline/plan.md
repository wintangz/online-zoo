# Implementation Plan: Asset Pipeline (`asset-pipeline`)

**Branch**: `fix/asset-pipeline` | **Date**: 2026-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/asset-pipeline/spec.md`

## Summary

Upgrade `@online-zoo/game-assets`, `@online-zoo/game-client`, and `apps/web` to implement **Manifest v2** (with `zoneId`, `zones`, `sizeBytes`, `contentHash`, and content-hashed `.glb` filenames), per-zone asset preloading (lobby-only at Main Menu time; target zone loaded when its gate is used behind the loading screen; visited zones cached in memory for the session), long-lived immutable HTTP caching for `/assets/*` in `apps/web/next.config.mjs`, real first-visit transfer budget measurement (`≤ ~5 MB`), and `ASSETS.md` at the repository root.

## Technical Context

**Language/Version**: TypeScript 5.6, Node.js >= 20  
**Primary Dependencies**: `@online-zoo/game-assets`, `@online-zoo/game-client`, `apps/web` (Next.js 14)  
**Storage**: Static binary `.glb` files in `apps/web/public/assets/models/<id>.<contentHash>.glb`  
**Testing**: Vitest (`packages/game-assets/__tests__/manifest.test.ts`), Playwright E2E (`playable-zoo-world.spec.ts`, `multiplayer-sync.spec.ts`)  
**Target Platform**: Desktop & Mobile Browsers (Vercel-deployable `apps/web`)  
**Project Type**: Turborepo Monorepo (`packages/game-assets`, `packages/game-client`, `apps/web`)  
**Performance Goals**: First-visit transfer (Main Menu + Zoo Lobby playable) `≤ ~5 MB`; returning player re-downloads `0 bytes` for unchanged assets  
**Constraints**: `apps/server` ships no assets and has no dependency on `@online-zoo/game-assets`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Architecture Law**: `apps/server` is completely untouched and ships no assets.
- **No Feature Numbering**: Referenced strictly as `asset-pipeline`.

## Project Structure

### Documentation (this feature)

```text
specs/asset-pipeline/
├── spec.md
├── ASSUMPTIONS.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
ASSETS.md
apps/web/
├── next.config.mjs
├── public/assets/models/
│   └── <id>.<contentHash>.glb
└── src/components/
    └── ZooWorldExperience.tsx
packages/game-assets/
├── scripts/
│   └── generate-glb-assets.mjs
├── src/
│   ├── manifest.ts
│   └── loaders.ts
└── __tests__/
    └── manifest.test.ts
packages/game-client/
└── src/runtime/
    └── ZooGameCanvas.tsx
```

**Structure Decision**: Keep all asset generation, Manifest v2 metadata, and zone loader/cache logic in `@online-zoo/game-assets`, wire per-zone preloading in `@online-zoo/game-client` and `apps/web`, and configure HTTP caching in `apps/web/next.config.mjs`.

