# Research & Architecture Decisions: Events & Activities (`008-events-and-activities`)

## Decision 1: Deterministic Default Schedule with Live Admin Reconfiguration

- **Context**: Players must immediately see both `active` and `upcoming` events upon entering a zoo instance (`US1`, `FR-001`), while administrators or automated schedules must be able to update event windows, capacities, or statuses (`upcoming`, `active`, `finished`) and seasonal themes without rebuilding the client (`FR-010`, `SC-004`).
- **Decision**:
  - Initialize each zoo room with all 5 catalog events:
    - 2 initially `active` (`event-panda-feeding-gala`, `event-guided-sanctuary-tour`) so visitors can immediately join and participate upon entry.
    - 2 initially `upcoming` (`event-penguin-dive-show`, `event-plaza-group-photo`) with clear countdown windows.
    - 1 seasonal activity (`event-lantern-trivia-game`) active whenever a seasonal theme (`spring-blossom`, `summer-lantern`, `autumn-harvest`) is enabled.
  - Provide `sanitizeEventAdministrationConfig(raw, now)` which validates start/end times (`endTimeMs > startTimeMs`), clamps `maxParticipants` (`1..64`), and safely rejects malformed overrides without throwing or disrupting active sessions.

## Decision 2: Shared Multi-Player Participation & Disconnect Resilience

- **Context**: Activities must support multiple participants, enforce `maxParticipants`, handle late joins and early leaves, and clean up when a participant disconnects (`FR-004`–`FR-006`, `SC-002`).
- **Decision**:
  - Store `participantSessionIds: string[]`, `participantPlayerIds: string[]`, and `sharedProgressCount: number` on each room's `LiveZooEventState`.
  - When a player disconnects or leaves the room (`disconnectPlayer` / `pruneStaleSessions` / `switchPlayerInstance`), automatically remove their `sessionId` from any joined event and broadcast `zoo_events_snapshot` so remaining participants see accurate counts.
  - Late joiners immediately see the current `sharedProgressCount` and can perform `perform_event_action` to become eligible for the event reward.

## Decision 3: Cross-Feature Reward Integration (Zoo Coins + Zoo Passport Stamp + Activity Achievement)

- **Context**: Completing an eligible activity should grant Zoo Coins, stamp the event's Zoo Passport zone, and count toward activity achievements (`FR-007`, `FR-008`, `SC-003`), while preventing duplicate claims.
- **Decision**:
  - Each event maps to one of the 5 `PassportZoneId` values (`zone-panda-sanctuary`, `zone-penguin-cove`, `zone-welcome-plaza`, `zone-wind-chime-lookout`, `zone-lotus-stream`) and specifies `rewardCoins`.
  - Server-side `claimEventReward` verifies that the player has participated/contributed (`contributedPlayerIds.includes(playerId)`), checks `(playerId, eventInstanceId)` claim history and `requestId` idempotency cache, credits `wallet.currencyBalance += event.rewardCoins`, records the zone stamp and activity completion on the player's `PlayerPassportState`, and returns `event_reward_result`.

