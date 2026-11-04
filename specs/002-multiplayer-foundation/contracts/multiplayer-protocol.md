# Contract: Multiplayer Wire Protocol & Authoritative Instance Engine

**Feature Branch**: `002-multiplayer-foundation`  
**Package**: `@online-zoo/game-core` & `apps/web/src/server`  
**Endpoint**: `ws://<host>/ws/zoo?room=<roomId>` (default `room=panda-forest-1`)

---

## 1. Client-to-Server Messages (`ClientMultiplayerMessage`)

All messages are UTF-8 JSON objects discriminated by the `type` field. Malformed JSON, unknown message types, or payloads exceeding `4096 bytes` are rejected by the server without affecting other clients (`FR-012`, `FR-018`, `SC-005`).

### 1.1 `join_instance`
Sent immediately after transport connection opens to join a Panda Forest room or resume a session within the `30-second` grace window (`FR-002`, `FR-016`).

```ts
export interface JoinInstanceMessage {
  type: 'join_instance';
  roomId?: string;
  resumeToken?: string | null;
}
```

### 1.2 `player_move`
Sent at `20 Hz` (`50ms`) while moving/turning, `2 Hz` (`500ms`) while `Idle`, and immediately upon discrete `locomotionState` transitions (`FR-007`).

```ts
export interface PlayerMoveMessage {
  type: 'player_move';
  sequence: number;
  clientTimestamp: number;
  position: [number, number, number];
  velocity: [number, number, number];
  facingYaw: number;
  locomotionState: 'Idle' | 'Walking' | 'Running' | 'Jumping';
}
```

### 1.3 `interact_prop`
Sent when the local player triggers a shared world prop (`prop-stone-lantern`, `prop-wind-chime`, `prop-scenic-bench`) (`FR-010`).

```ts
export interface InteractPropMessage {
  type: 'interact_prop';
  objectId: string;
  clientTimestamp: number;
}
```

### 1.4 `ping`
Sent every `2500ms` to maintain session presence (`FR-005`, `SC-004`).

```ts
export interface PingMessage {
  type: 'ping';
  clientTimestamp: number;
}
```

### 1.5 `leave_instance`
Sent on clean disconnect / page unload (`FR-005`).

```ts
export interface LeaveInstanceMessage {
  type: 'leave_instance';
}
```

---

## 2. Server-to-Client Messages (`ServerMultiplayerMessage`)

### 2.1 `welcome_snapshot`
Sent to a joining or reconnecting client with its assigned (or resumed) identity and the full authoritative snapshot of all players and shared world props in the room (`FR-002`, `FR-003`, `FR-004`, `FR-016`).

```ts
export interface SerializedPlayerState {
  sessionId: string;
  displayName: string;
  accentColor: string;
  position: [number, number, number];
  velocity: [number, number, number];
  facingYaw: number;
  locomotionState: 'Idle' | 'Walking' | 'Running' | 'Jumping';
  sequence: number;
  serverTimestamp: number;
  reconciled?: boolean;
  discrepancyDistance?: number;
}

export interface WelcomeSnapshotMessage {
  type: 'welcome_snapshot';
  roomId: string;
  sessionId: string;
  resumeToken: string;
  displayName: string;
  accentColor: string;
  resumed: boolean;
  spawnPosition: [number, number, number];
  spawnYaw: number;
  serverTimestamp: number;
  players: SerializedPlayerState[];
  propStates: Record<string, { active: boolean; lastTriggeredAt: number }>;
}
```

### 2.2 `player_joined`
Broadcast immediately to all existing room members when a new or resumed visitor enters (`FR-004`, `SC-001`, `SC-004`).

```ts
export interface PlayerJoinedMessage {
  type: 'player_joined';
  roomId: string;
  player: SerializedPlayerState;
  visitorCount: number;
  serverTimestamp: number;
}
```

### 2.3 `player_left`
Broadcast immediately when a player leaves cleanly or within `<= 10 seconds` when a player times out (`FR-005`, `SC-004`).

```ts
export interface PlayerLeftMessage {
  type: 'player_left';
  roomId: string;
  sessionId: string;
  reason: 'left' | 'timeout' | 'disconnected';
  visitorCount: number;
  serverTimestamp: number;
}
```

### 2.4 `room_state_tick`
Broadcast at `20 Hz` (`50ms`) to all connected players in the room containing current validated transforms (`FR-007`, `FR-011`, `FR-012`, `SC-002`).

```ts
export interface RoomStateTickMessage {
  type: 'room_state_tick';
  roomId: string;
  tickSequence: number;
  serverTimestamp: number;
  visitorCount: number;
  players: SerializedPlayerState[];
}
```

### 2.5 `prop_state_updated`
Broadcast immediately when any player toggles or activates a shared world prop (`FR-010`).

```ts
export interface PropStateUpdatedMessage {
  type: 'prop_state_updated';
  roomId: string;
  objectId: string;
  active: boolean;
  triggeredBySessionId: string;
  lastTriggeredAt: number;
}
```

### 2.6 `pong` & `error_notice`
Response to `ping` heartbeats and non-fatal validation rejection notifications.

```ts
export interface PongMessage {
  type: 'pong';
  clientTimestamp: number;
  serverTimestamp: number;
}

export interface ErrorNoticeMessage {
  type: 'error_notice';
  code: 'INVALID_PAYLOAD' | 'STALE_SEQUENCE' | 'OUT_OF_BOUNDS_CLAMPED' | 'ROOM_FULL';
  message: string;
}
```

---

## 3. `ZooInstanceAuthority` Server Engine API (`@online-zoo/game-core`)

```ts
export class ZooInstanceAuthority {
  constructor(options?: {
    maxPlayersPerRoom?: number; // Default: 16
    heartbeatTimeoutMs?: number; // Default: 8_000 (< 10s per SC-004)
    resumeGraceWindowMs?: number; // Default: 30_000 (Clarification #1)
    layout?: PandaForestLayoutConfig;
  });

  joinOrResumePlayer(params: {
    requestedRoomId?: string;
    resumeToken?: string | null;
    now?: number;
  }): {
    welcome: WelcomeSnapshotMessage;
    joinedBroadcast: PlayerJoinedMessage;
  };

  processPlayerMove(
    sessionId: string,
    msg: PlayerMoveMessage,
    now?: number
  ): {
    accepted: boolean;
    state: SerializedPlayerState | null;
    errorCode?: ErrorNoticeMessage['code'];
  };

  processPropInteraction(
    sessionId: string,
    msg: InteractPropMessage,
    now?: number
  ): PropStateUpdatedMessage | null;

  recordHeartbeat(sessionId: string, now?: number): boolean;

  disconnectPlayer(
    sessionId: string,
    cleanLeave: boolean,
    now?: number
  ): PlayerLeftMessage | null;

  pruneStaleSessions(now?: number): PlayerLeftMessage[];

  buildRoomTickSnapshot(roomId: string, now?: number): RoomStateTickMessage | null;
}
```

