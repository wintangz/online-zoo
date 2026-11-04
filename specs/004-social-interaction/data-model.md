# Phase 1 Data Model: Social Interaction (Feature 004)

**Feature**: `004-social-interaction` | **Date**: 2026-11-05

## 1. Proximity Text Chat & Speech Bubble Entities

### `ProximityChatMessage`
| Field | Type | Constraints & Validation Rules |
| :--- | :--- | :--- |
| `messageId` | `string` | Unique server-generated identifier (`msg_<counter>_<timestamp>`). |
| `roomId` | `string` | Active zoo instance identifier (`^[a-zA-Z0-9_-]{1,48}$`). |
| `senderSessionId` | `string` | Active session ID of the speaker. |
| `senderPlayerId` | `string` | Persistent `playerId` of the speaker. |
| `senderDisplayName` | `string` | Validated display name of the speaker (`3–16` chars, disambiguated if needed). |
| `senderAccentColor` | `string` | Hex color for speaker badge. |
| `text` | `string` | Trimmed length `1..140` chars (`MAX_CHAT_MESSAGE_LENGTH = 140`), passing `validateChatMessage`. |
| `position` | `[number, number, number]` | Authoritative world `[x, y, z]` of the speaker at send time. |
| `createdAt` | `number` | Epoch timestamp (ms) when accepted by authority. |
| `expiresAt` | `number` | Speech bubble expiration timestamp (`createdAt + 6000` ms). |

### `ChatValidationResult`
- `valid`: `boolean`
- `normalizedText`: `string`
- `errorCode?`: `'EMPTY_MESSAGE' | 'MESSAGE_TOO_LONG' | 'PROFANITY_BLOCKED' | 'RATE_LIMITED'`
- `errorMessage?`: `string`

---

## 2. Avatar Emote Entities

### `EmoteId`
Strictly enumerated union:
- `'wave'` (`Wave`, `👋`, `3500ms`)
- `'dance'` (`Dance`, `💃`, `4500ms`)
- `'clap'` (`Clap`, `👏`, `3500ms`)
- `'laugh'` (`Laugh`, `😄`, `3500ms`)
- `'sit'` (`Sit / Relax`, `🧘`, `6000ms`)

### `ActiveAvatarEmote`
| Field | Type | Description |
| :--- | :--- | :--- |
| `emoteId` | `EmoteId` | One of the 5 curated emote IDs. |
| `label` | `string` | Human-readable label (`Wave`, `Dance`, `Clap`, `Laugh`, `Sit / Relax`). |
| `icon` | `string` | Visual icon shown in the overhead emote badge. |
| `startedAt` | `number` | Epoch ms when triggered. |
| `expiresAt` | `number` | Epoch ms when the emote automatically finishes if not cancelled earlier by movement. |

---

## 3. World Seating & Multi-Seat Entities

### `WorldSeatSlotDescriptor`
| Field | Type | Description |
| :--- | :--- | :--- |
| `seatIndex` | `number` | `0`-based seat index (`0` = Left/Primary Seat, `1` = Right Seat). |
| `label` | `string` | Seat label (`'Left Seat'`, `'Right Seat'`, `'Center Seat'`). |
| `worldPosition` | `[number, number, number]` | World `[x, y, z]` position where the seated avatar is placed. |
| `facingYaw` | `number` | Outward-facing yaw in radians when seated. |

### `WorldSeatOccupancyState`
| Field | Type | Description |
| :--- | :--- | :--- |
| `objectId` | `string` | Bench/chair interactive object ID (`'prop-plaza-bench'`, `'prop-scenic-bench'`, `'prop-pond-chair'`). |
| `seatIndex` | `number` | Seat slot index (`0` or `1`). |
| `occupiedBySessionId` | `string \| null` | Active session ID of the seated visitor, or `null` if available. |
| `occupiedByPlayerId` | `string \| null` | Persistent `playerId` of the seated visitor, or `null`. |
| `occupiedByDisplayName` | `string \| null` | Display name of the seated visitor, or `null`. |
| `occupiedAt` | `number` | Timestamp (ms) when seated, or `0`. |

### `SeatedAttachmentState`
| Field | Type | Description |
| :--- | :--- | :--- |
| `objectId` | `string` | Bench or chair object ID. |
| `seatIndex` | `number` | Occupied seat index. |
| `seatPosition` | `[number, number, number]` | Authoritative world seat position. |
| `facingYaw` | `number` | Outward-facing yaw while seated. |

---

## 4. Friends, Online Status & Instance Joining Entities

### `FriendRequestRecord`
| Field | Type | Description |
| :--- | :--- | :--- |
| `requestId` | `string` | Unique identifier (`freq_<counter>_<timestamp>`). |
| `fromPlayerId` | `string` | Sender's persistent `playerId`. |
| `fromDisplayName` | `string` | Sender's validated display name. |
| `toPlayerId` | `string` | Recipient's persistent `playerId`. |
| `toDisplayName` | `string` | Recipient's display name. |
| `status` | `'pending' \| 'accepted' \| 'rejected'` | Current request status. |
| `createdAt` | `number` | Epoch ms when sent. |

### `FriendStatusEntry`
| Field | Type | Description |
| :--- | :--- | :--- |
| `playerId` | `string` | Friend's persistent `playerId`. |
| `displayName` | `string` | Friend's latest known display name. |
| `online` | `boolean` | `true` if currently connected to any active zoo instance. |
| `roomId` | `string \| null` | Active instance ID (e.g., `'panda-forest-1'`) when `online === true`. |
| `roomVisitorCount` | `number` | Current population of the friend's instance. |
| `roomMaxPlayers` | `number` | Max capacity of the friend's instance (`16`). |
| `canJoin` | `boolean` | `true` when `online && roomVisitorCount < roomMaxPlayers`. |

---

## 5. Safety & Moderation Entities

### `ReportReason`
- `'inappropriate-chat'` (`Inappropriate Chat`)
- `'harassment-spam'` (`Harassment or Spam`)
- `'offensive-name'` (`Offensive Display Name`)
- `'other'` (`Other Safety Concern`)

### `PlayerModerationReport`
| Field | Type | Constraints & Description |
| :--- | :--- | :--- |
| `reportId` | `string` | Unique server-generated report ID (`rep_<counter>_<timestamp>`). |
| `reporterPlayerId` | `string` | Persistent `playerId` of the reporting player. |
| `reporterSessionId` | `string` | Active session ID of the reporting player. |
| `reportedPlayerId` | `string` | Persistent `playerId` of the reported player. |
| `reportedSessionId` | `string \| null` | Session ID of the reported player if in the instance. |
| `reportedDisplayName` | `string` | Display name of the reported player at report time. |
| `roomId` | `string` | Zoo instance ID where the report occurred. |
| `reason` | `ReportReason` | Selected moderation category. |
| `details` | `string` | Optional user-provided description (`0..200` trimmed chars). |
| `recentChatSnapshot` | `Array<{ messageId: string; senderPlayerId: string; text: string; createdAt: number }>` | Up to `10` recent proximity messages involving the reported visitor. |
| `createdAt` | `string` | ISO 8601 timestamp when captured. |

### `PersistedSocialProfile` (`localStorage` key: `online-zoo:social-state:v1`)
| Field | Type | Description |
| :--- | :--- | :--- |
| `schemaVersion` | `1` | Schema version marker. |
| `friends` | `Record<string, { playerId: string; displayName: string; addedAt: number }>` | Confirmed friends keyed by `playerId`. |
| `mutedPlayerIds` | `string[]` | List of muted `playerId`s. |
| `blockedPlayerIds` | `string[]` | List of blocked `playerId`s. |

