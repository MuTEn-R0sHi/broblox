# Modules: Moderation

Server-side ban/mute management with DataStore persistence and cross-server sync via MessagingService (`@broblox/moderation`). **Status: Implemented** (86 tests).

## Purpose

- Temporary and permanent ban system with DataStore persistence.
- Mute system (chat / voice / all) with timed expiry.
- Cross-server synchronisation via `MessagingService` for instant enforcement.
- Chat filtering service using `TextChatService` to suppress muted players.
- Full moderator audit trail (who banned, when, why, who revoked).

## Core rules

- Bans and mutes are stored server-side in DataStore and cached with 60-second TTL.
- Cross-server sync ensures bans take effect across all servers immediately.
- All ban/mute creation validates `playerId > 0`, non-empty reason, and positive duration.
- Ban enforcement kicks players on join and on cross-server ban events.

## Data model

- `BanRecord` — `id`, `playerId`, `type` (TEMPORARY/PERMANENT), `status` (ACTIVE/EXPIRED/REVOKED/APPEALED), `reason`, `internalNote?`, `durationHours?`, `expiresAt?`, `moderatorId`, `createdAt`, `revokedAt?`, `revokedById?`, `revokeReason?`.
- `MuteRecord` — `id`, `playerId`, `type` (chat/voice/all), `isActive`, `reason`, `durationMinutes`, `expiresAt`, `moderatorId`.
- `ModerationSyncMessage` — `action`, `playerId`, `data?`, `timestamp`.

## Public API

### BanStore

| Method                                            | Description                                     |
| ------------------------------------------------- | ----------------------------------------------- |
| `checkBan(playerId)`                              | Check for active ban; returns formatted message |
| `createBan(input)`                                | Create a ban record                             |
| `revokeBan(playerId, banId, revokedById, reason)` | Revoke an active ban                            |
| `getBans(playerId)`                               | Get all bans for a player                       |

### MuteStore

| Method                                    | Description                        |
| ----------------------------------------- | ---------------------------------- |
| `checkMute(playerId)`                     | Check for active, non-expired mute |
| `createMute(input)`                       | Create a mute record               |
| `removeMute(playerId, muteId, removedBy)` | Deactivate a mute                  |

### ModerationService (singleton)

| Method             | Description                      |
| ------------------ | -------------------------------- |
| `ban(input)`       | Create ban + sync to all servers |
| `revokeBan(...)`   | Revoke + sync                    |
| `mute(input)`      | Create mute + sync               |
| `unmute(...)`      | Remove mute + sync               |
| `onBan(callback)`  | Subscribe to ban events          |
| `onMute(callback)` | Subscribe to mute events         |

### Enforcement services

- `createModerationEnforcementService(config)` — kicks banned players on join, sets muted-player attributes.
- `createChatModerationService()` — hooks `TextChatService.OnIncomingMessage` to blank messages from muted players.

## Security

- **DataStore-backed** — bans/mutes survive server restarts.
- **Cross-server sync** — `MessagingService` on topics `ModBanSync` / `ModMuteSync`.
- **Input validation** — `playerId > 0`, non-empty reason, positive duration.
- **Audit trail** — every record stores `moderatorId`; revocations store `revokedById` and reason.
- **Cache TTL** — 60-second cache prevents DataStore spam.

## Config

| Key              | Default              | Description                   |
| ---------------- | -------------------- | ----------------------------- |
| `datastoreName`  | `"PlayerModeration"` | DataStore prefix              |
| `syncInterval`   | `60`                 | Sync check interval (seconds) |
| `messagingTopic` | `"moderation"`       | MessagingService topic prefix |

## Observability

- `moderation_sync_received_total` / `moderation_sync_published_total` — sync message counters
- `moderation_sync_decode_errors_total` — JSON decode failures
- `moderation_sync_cache_invalidations_total` — cache busts from sync
- `moderation_sync_message_age_ms` — message latency histogram
