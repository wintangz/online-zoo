# Protocol & Operational Contracts: Public Beta & Production Readiness (`010-public-beta-readiness`)

## 1. Client-to-Server WebSocket Messages

### `submit_beta_feedback`
Submits an in-game beta feedback item or bug report with automatic diagnostic context.
```json
{
  "type": "submit_beta_feedback",
  "category": "bug",
  "severity": "medium",
  "message": "Panda habitat camera clips slightly near the north bamboo arch.",
  "diagnostics": {
    "playerId": "player-7f8a9b1c",
    "roomId": "panda-forest-1",
    "fps": 59,
    "avgFrameTimeMs": 16.9,
    "qualityPreset": "high",
    "viewport": "1280x800",
    "inputMode": "desktop",
    "visitorCount": 3,
    "userAgentSummary": "Desktop Browser"
  }
}
```

### `resolve_player_report`
Updates the moderation triage status of a submitted player safety report (`resolved` or `dismissed`).
```json
{
  "type": "resolve_player_report",
  "reportId": "rep_1_1762340000000",
  "resolution": "resolved"
}
```

### `set_maintenance_notice`
Activates or clears a non-disruptive operator maintenance/update banner across all instances.
```json
{
  "type": "set_maintenance_notice",
  "active": true,
  "message": "Scheduled Beta Patch v0.10.1 arriving in 10 minutes — your progress is auto-saved.",
  "severity": "info"
}
```

### `request_ops_snapshot`
Requests the latest `ops_snapshot` containing service health, moderation reports, beta feedback, error logs, and maintenance state.
```json
{
  "type": "request_ops_snapshot"
}
```

---

## 2. Server-to-Client WebSocket Messages

### `beta_feedback_ack`
Confirms receipt of a player's beta feedback submission.
```json
{
  "type": "beta_feedback_ack",
  "feedback": {
    "feedbackId": "fb_1_1762340000000",
    "playerId": "player-7f8a9b1c",
    "displayName": "Explorer #1",
    "roomId": "panda-forest-1",
    "category": "bug",
    "severity": "medium",
    "message": "Panda habitat camera clips slightly near the north bamboo arch.",
    "diagnostics": { ... },
    "createdAt": 1762340000000
  },
  "confirmationMessage": "Thank you! Beta feedback #fb_1_1762340000000 has been recorded with device diagnostics."
}
```

### `ops_snapshot`
Delivers aggregated operational health, moderation reports, beta feedback, recent errors, and active maintenance notice.
```json
{
  "type": "ops_snapshot",
  "snapshot": {
    "version": "0.10.0-beta",
    "status": "ok",
    "uptimeMs": 48200,
    "totalVisitors": 2,
    "healthyInstances": 3,
    "unhealthyInstances": 0,
    "openReportsCount": 1,
    "totalReportsCount": 1,
    "feedbackCount": 1,
    "recentErrorsCount": 0,
    "reports": [ ... ],
    "feedbackItems": [ ... ],
    "recentErrors": [ ... ],
    "maintenanceNotice": null,
    "serverTimestamp": 1762340000000
  }
}
```

---

## 3. HTTP Health Check Endpoint (`GET /api/health`)

Returns `200 OK` with JSON payload matching `OpsHealthSnapshot` summary fields:
```json
{
  "status": "ok",
  "version": "0.10.0-beta",
  "uptimeMs": 48200,
  "totalVisitors": 2,
  "healthyInstances": 3,
  "unhealthyInstances": 0,
  "openReportsCount": 0,
  "feedbackCount": 1,
  "recentErrorsCount": 0,
  "maintenanceNotice": null,
  "serverTimestamp": 1762340000000
}
```

