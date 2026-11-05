# WebSocket Protocol Contract: Multiplayer Expansion & Zoo Instances (`009-multiplayer-expansion-and-instances`)

## 1. Client-to-Server Messages

### `join_instance` (Extended)
```json
{
  "type": "join_instance",
  "roomId": "panda-forest-1",
  "preferFriendPlacement": true,
  "allowFriendJoin": true,
  "playerId": "pid_visitor_01",
  "displayName": "BambooExplorer",
  "friendPlayerIds": ["pid_friend_01"]
}
```

### `set_social_privacy` (New)
Updates whether online friends are permitted to directly join the player's current zoo instance (`FR-009`, `FR-010`).
```json
{
  "type": "set_social_privacy",
  "allowFriendJoin": false
}
```

### `configure_instance` (New)
Runtime administration/testing message to update an instance's `maxPlayers` capacity or `status` (`'healthy' | 'unhealthy'`). When an instance is marked `'unhealthy'`, all active sessions in that instance are automatically evacuated to a healthy available instance (`FR-004`, `FR-007`, `FR-008`).
```json
{
  "type": "configure_instance",
  "roomId": "panda-forest-1",
  "maxPlayers": 4,
  "status": "unhealthy"
}
```

---

## 2. Server-to-Client Messages

### `welcome_snapshot` (Extended)
Includes optional `placementReason` (`'requested' | 'friend_priority' | 'overflow_redirect' | 'failover_recovery'`), `placementNotice`, and `allowFriendJoin`:
```json
{
  "type": "welcome_snapshot",
  "roomId": "panda-forest-2",
  "placementReason": "friend_priority",
  "placementNotice": "Placed in Panda Forest #2 (Emerald Canopy) with 1 online friend!",
  "allowFriendJoin": true
}
```

### `instance_directory_update` (New)
Broadcasts updated `availableInstances` directory whenever an instance's capacity, health status, or population changes:
```json
{
  "type": "instance_directory_update",
  "availableInstances": [
    {
      "roomId": "panda-forest-1",
      "label": "Panda Forest #1 (Main Sanctuary)",
      "visitorCount": 2,
      "maxPlayers": 16,
      "isFull": false,
      "status": "healthy"
    }
  ],
  "notice": "Updated Panda Forest #1 capacity to 16 visitors.",
  "serverTimestamp": 1762320000000
}
```

### `error_notice` (Extended Error Codes)
Added `INSTANCE_UNAVAILABLE` and `FRIEND_JOIN_DISABLED` alongside `ROOM_FULL` and `PLAYER_BLOCKED`.

