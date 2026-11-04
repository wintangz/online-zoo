# Phase 1 Quickstart & Verification Guide: Social Interaction (Feature 004)

**Feature**: `004-social-interaction` | **Date**: 2026-11-05

## Prerequisites

- Node.js `>=20.11`
- `pnpm` `9.x`

## 1. Run Unit & Multi-Client Integration Tests

```bash
pnpm test
```

Verifies `packages/game-core/__tests__/socialInteraction.test.ts` alongside existing suites:
- Proximity text chat validation (`1–140` chars), profanity/moderation filtering, rate limiting (`4` messages per `6s`, `1s` cooldown), and `24m` spatial range filtering in `ZooInstanceAuthority`.
- 5-emote catalog (`wave`, `dance`, `clap`, `laugh`, `sit`), real-time emote broadcast, and immediate cancellation on movement.
- Multi-seat bench occupancy (`2` seats per bench), simultaneous side-by-side seating for multiple visitors, `"Occupied"` rejection when all seats are full, and automatic seat release on stand/move/disconnect.
- Friend request send/accept/reject/remove workflows, cross-room online status updates, and joining a friend's instance (including `"ROOM_FULL"` guard when capacity is reached).
- Player safety controls: Mute (suppressing chat, speech bubbles, and emotes), Block (mute + removing/blocking friendships), and Report (capturing structured moderation context and recent chat history).

## 2. Run Static Verification & Production Build

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## 3. Run End-to-End Browser Verification (Playwright)

```bash
pnpm test:e2e
```

Executes `apps/web/e2e/social-interaction.spec.ts`:
1. **Proximity Chat & Speech Bubbles**: Two visitors in the same instance exchange proximity messages, verify overhead 3D speech bubbles (`local-speech-bubble` and `remote-speech-bubble-*`) and chat history entries, and verify rate-limit/moderation blocks.
2. **Emotes & Multi-Seat Benches**: Trigger emotes (`wave`, `dance`, etc.) visible across clients; sit two visitors side-by-side on `prop-plaza-bench`, verify seat occupancy (`1/2 seats free` -> `Occupied`), and stand back up.
3. **Friends, Online Status, Instance Join & Safety (Mute/Block/Report)**: Send and accept a friend request between two visitors, verify live `"Online"` status and room join capability, test Mute/Block suppression of incoming chat, and submit a moderation report with confirmation.

