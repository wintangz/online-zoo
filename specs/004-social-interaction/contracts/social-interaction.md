# Phase 1 Interface Contracts: Social Interaction (Feature 004)

**Feature**: `004-social-interaction` | **Date**: 2026-11-05

## 1. Shared Domain Module Contracts (`@online-zoo/game-core`)

```ts
// packages/game-core/src/social/chatModeration.ts
export const PROXIMITY_CHAT_RANGE_METERS = 24.0;
export const MAX_CHAT_MESSAGE_LENGTH = 140;
export const SPEECH_BUBBLE_DURATION_MS = 6000;
export const CHAT_RATE_WINDOW_MS = 6000;
export const CHAT_MAX_MESSAGES_PER_WINDOW = 4;
export const CHAT_MIN_INTERVAL_MS = 1000;

export function validateChatMessage(rawText: unknown): ChatValidationResult;
export class ChatRateLimiter {
  public checkAndRecord(sessionKey: string, now?: number): { allowed: boolean; retryAfterMs: number };
}

// packages/game-core/src/social/emoteCatalog.ts
export const EMOTE_CATALOG: readonly EmoteDescriptor[];
export function isValidEmoteId(value: unknown): value is EmoteId;
export function getEmoteDescriptor(emoteId: EmoteId): EmoteDescriptor;

// packages/game-core/src/social/socialPersistence.ts
export const SOCIAL_STATE_STORAGE_KEY = 'online-zoo:social-state:v1';
export function loadPersistedSocialState(playerId?: string): PersistedSocialProfile;
export function savePersistedSocialState(state: PersistedSocialProfile, playerId?: string): void;
```

## 2. Multiplayer Wire Protocol Extensions (`protocol.ts`)

### Client-to-Server Messages
- `send_chat_message`:
  ```json
  {
    "type": "send_chat_message",
    "text": "Hello everyone near the panda habitat!",
    "clientTimestamp": 1762300000000
  }
  ```
- `trigger_emote`:
  ```json
  {
    "type": "trigger_emote",
    "emoteId": "wave",
    "clientTimestamp": 1762300000000
  }
  ```
- `interact_seat`:
  ```json
  {
    "type": "interact_seat",
    "objectId": "prop-plaza-bench",
    "action": "sit",
    "preferredSeatIndex": 0,
    "clientTimestamp": 1762300000000
  }
  ```
- `send_friend_request`:
  ```json
  {
    "type": "send_friend_request",
    "targetPlayerId": "pid-visitor-2",
    "targetDisplayName": "BambooScout"
  }
  ```
- `respond_friend_request`:
  ```json
  {
    "type": "respond_friend_request",
    "requestId": "freq_1_1762300000000",
    "decision": "accept"
  }
  ```
- `remove_friend`:
  ```json
  {
    "type": "remove_friend",
    "targetPlayerId": "pid-visitor-2"
  }
  ```
- `join_friend_instance`:
  ```json
  {
    "type": "join_friend_instance",
    "friendPlayerId": "pid-visitor-2"
  }
  ```
- `set_player_block`:
  ```json
  {
    "type": "set_player_block",
    "targetPlayerId": "pid-visitor-3",
    "blocked": true
  }
  ```
- `submit_player_report`:
  ```json
  {
    "type": "submit_player_report",
    "reportedPlayerId": "pid-visitor-3",
    "reportedSessionId": "sess_0002_102",
    "reportedDisplayName": "Visitor102",
    "reason": "harassment-spam",
    "details": "Repeatedly spamming near the entrance."
  }
  ```

### Server-to-Client Messages
- `proximity_chat_message`: Delivered only to sessions within `24m` of the sender in the same room (and not blocked).
- `player_emote_triggered`: Broadcast when a visitor triggers or cancels an emote (`emoteId: EmoteId | null`).
- `seat_state_updated`: Broadcast when any bench/chair seat slot is occupied or vacated (`roomId`, `objectId`, `seats: WorldSeatOccupancyState[]`).
- `social_presence_update`: Sent to a player when their friends' online/room status or pending friend requests change (`friends`, `incomingRequests`, `outgoingRequests`).
- `report_submitted_ack`: Confirms moderation report capture with the full `PlayerModerationReport` payload.
- `error_notice`: Extended with codes `'CHAT_RATE_LIMITED' | 'CHAT_MODERATION_BLOCKED' | 'SEAT_OCCUPIED' | 'FRIEND_REQUEST_INVALID' | 'PLAYER_BLOCKED'`.

## 3. UI Component & Test ID Contracts (`@online-zoo/ui` & `@online-zoo/game-client`)

- **3D Overhead Speech Bubbles & Emotes**:
  - `data-testid="local-speech-bubble"`: Overhead speech bubble on `PlayerAvatarEntity`.
  - `data-testid="remote-speech-bubble-{sessionId}"`: Overhead speech bubble on `RemotePlayerAvatar`.
  - `data-testid="local-emote-badge"`: Overhead emote badge on `PlayerAvatarEntity`.
  - `data-testid="remote-emote-badge-{sessionId}"`: Overhead emote badge on `RemotePlayerAvatar`.
- **Proximity Chat & Emote Dock (`SocialInteractionOverlay.tsx`)**:
  - `data-testid="proximity-chat-panel"`: Scrollable chat log + message input form.
  - `data-testid="chat-message-list"`: Container of received proximity chat items (`data-testid="chat-message-item"`).
  - `data-testid="chat-message-input"`: Text input (`maxLength={140}`) that suppresses WASD locomotion while focused.
  - `data-testid="chat-send-btn"`: Submit button for proximity chat.
  - `data-testid="chat-feedback-banner"`: Displays rate-limit or moderation error feedback.
  - `data-testid="emote-picker-bar"`: Bar with buttons `data-testid="emote-btn-wave"`, `data-testid="emote-btn-dance"`, `data-testid="emote-btn-clap"`, `data-testid="emote-btn-laugh"`, `data-testid="emote-btn-sit"`.
- **Seating & World Interaction Controls**:
  - `data-testid="interaction-prompt-banner"`: Shows object action + seat availability (e.g., `"2/2 seats free"`, `"1/2 seats free"`, `"Occupied"`).
  - `data-testid="stand-up-btn"`: Displayed when the local player is seated on a bench or chair.
- **Friends & Safety Panel**:
  - `data-testid="toggle-social-drawer-btn"`: Opens/toggles the Friends, Nearby Visitors & Safety drawer.
  - `data-testid="social-drawer-panel"`: Container for Nearby Visitors, Friends List, and Requests.
  - `data-testid="send-friend-request-btn-{playerId}"`: Sends a friend request to a nearby visitor.
  - `data-testid="accept-friend-request-btn-{requestId}"` / `data-testid="reject-friend-request-btn-{requestId}"`: Accepts or rejects an incoming friend request.
  - `data-testid="friend-item-{playerId}"`: Displays friend's name, online status (`data-testid="friend-status-{playerId}"`), room ID, `data-testid="join-friend-btn-{playerId}"`, and `data-testid="remove-friend-btn-{playerId}"`.
  - `data-testid="mute-player-btn-{playerId}"`: Toggles mute state for a visitor.
  - `data-testid="block-player-btn-{playerId}"`: Toggles block state for a visitor.
  - `data-testid="open-report-modal-btn-{playerId}"`: Opens the report dialog for a visitor.
  - `data-testid="report-player-modal"`: Modal with `data-testid="report-reason-select"`, `data-testid="report-details-input"`, and `data-testid="submit-report-btn"`.
  - `data-testid="report-confirmation-banner"`: Displays confirmation when a moderation report is recorded.

