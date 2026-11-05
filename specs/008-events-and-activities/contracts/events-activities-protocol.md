# Protocol & UI Contracts: Events & Activities (`008-events-and-activities`)

## 1. WebSocket Client-to-Server Messages

### `join_zoo_event`
```json
{
  "type": "join_zoo_event",
  "eventId": "event-panda-feeding-gala"
}
```

### `leave_zoo_event`
```json
{
  "type": "leave_zoo_event",
  "eventId": "event-panda-feeding-gala"
}
```

### `perform_event_action`
```json
{
  "type": "perform_event_action",
  "eventId": "event-panda-feeding-gala"
}
```

### `claim_event_reward`
```json
{
  "type": "claim_event_reward",
  "eventId": "event-panda-feeding-gala",
  "requestId": "evclaim_event-panda-feeding-gala_1730000000_1"
}
```

### `configure_zoo_events`
```json
{
  "type": "configure_zoo_events",
  "seasonalTheme": "summer-lantern",
  "eventPatches": [
    {
      "eventId": "event-penguin-dive-show",
      "status": "active",
      "startTimeMs": 1730000000000,
      "endTimeMs": 1730000900000,
      "maxParticipants": 8
    }
  ]
}
```

## 2. WebSocket Server-to-Client Messages

### `zoo_events_snapshot`
Broadcast whenever room events, participants, shared progress, or seasonal themes change (and included in `welcome_snapshot`):
```json
{
  "type": "zoo_events_snapshot",
  "roomId": "panda-forest-1",
  "seasonalTheme": "spring-blossom",
  "events": [],
  "notice": "🎉 Glacier Cove Penguin Splash is now active!",
  "serverTimestamp": 1730000000000
}
```

### `event_reward_result`
```json
{
  "type": "event_reward_result",
  "requestId": "evclaim_event-panda-feeding-gala_1730000000_1",
  "success": true,
  "eventId": "event-panda-feeding-gala",
  "eventInstanceId": "evinst_event-panda-feeding-gala_1",
  "rewardCoinsGranted": 20,
  "stampedZoneId": "zone-panda-sanctuary",
  "currencyBalance": 120,
  "passportState": {},
  "message": "Claimed +20 Zoo Coins & Panda Sanctuary Stamp!",
  "serverTimestamp": 1730000000000
}
```

## 3. UI Test IDs (`data-testid`)

- `hud-events-btn` — HUD button (`🎪 Events (X Active)`)
- `hud-seasonal-badge` — HUD seasonal theme indicator pill (`🌸 Spring Blossom Festival`)
- `event-toast-banner` — Non-intrusive event starting/active notification banner
- `active-event-tracker-banner` — Compact HUD tracker when the local player has joined an event, showing instructions, shared progress (`sharedProgressCount / targetProgress`), `perform-event-action-btn`, `claim-active-event-reward-btn`, and `leave-active-event-btn`
- `zoo-events-modal` — Main Events & Activities modal
- `seasonal-theme-select` — Seasonal decoration & ambiance selector (`spring-blossom`, `summer-lantern`, `autumn-harvest`, `none`)
- `event-card-<eventId>` — Card for each zoo activity
- `event-status-<eventId>` — Status badge (`Active`, `Upcoming`, `Finished`)
- `event-participants-<eventId>` — Participant count badge (`X / Y Participants` or `Event Full`)
- `event-progress-<eventId>` — Shared group progress (`X / Y`)
- `join-event-btn-<eventId>` — Join button (or `Leave Activity` if joined, or disabled `Event Full`)
- `event-action-btn-<eventId>` — Interactive activity contribution button
- `claim-event-reward-btn-<eventId>` — One-time reward claim button
- `event-feedback-banner` — Feedback banner for reward claims, capacity errors (`EVENT_FULL`), or schedule updates

