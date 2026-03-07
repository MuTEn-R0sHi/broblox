# @broblox/moderation

Server-side moderation system for Roblox games.

## Features

- **Ban System** – Temporary and permanent bans with expiry tracking
- **Mute System** – Chat, voice, and combined mutes with duration
- **Cross-Server Sync** – Ban/mute updates propagate via MessagingService
- **Observability** – Counters and histograms for sync message metrics
- **Dashboard Sync** – Integrates with the dashboard for moderator actions

## Usage

### Get the Moderation Service

`ModerationService` is a singleton. Pass a DataStore prefix to isolate
data per game:

```typescript
import { getModeration } from "@broblox/moderation";

const moderation = getModeration("TestParkModeration");
```

### Check Bans on Player Join

```typescript
import { getModeration } from "@broblox/moderation";

const moderation = getModeration("TestParkModeration");

Players.PlayerAdded.Connect((player) => {
  const result = moderation.checkBan(player.UserId);
  if (result.isBanned) {
    player.Kick(result.message);
    return;
  }
});
```

### Check Mutes

```typescript
const result = moderation.checkMute(player.UserId);
if (result.isMuted) {
  // result.mute contains the MuteRecord
  // result.expiresIn is seconds until expiry
}
```

### Issue a Ban

```typescript
moderation.ban({
  playerId: targetUserId,
  type: "TEMPORARY", // or "PERMANENT"
  durationHours: 24, // omit for permanent
  reason: "Exploiting — speed hack detected",
  moderatorId: "system",
});
```

### Revoke a Ban

```typescript
moderation.revokeBan(playerId, banId, revokedById, "Appeal approved");
```

### Issue a Mute

```typescript
moderation.mute({
  playerId: targetUserId,
  type: "chat", // "chat" | "voice" | "all"
  durationMinutes: 30,
  reason: "Spam",
  moderatorId: "system",
});
```

### Remove a Mute

```typescript
moderation.unmute(playerId, muteId, removedByUserId);
```

### React to Cross-Server Events

```typescript
moderation.onBan((record) => {
  const player = Players.GetPlayerByUserId(record.playerId);
  if (player) player.Kick("You have been banned.");
});

moderation.onMute((record) => {
  const player = Players.GetPlayerByUserId(record.playerId);
  if (player) {
    player.SetAttribute("rbx.moderation.muted", true);
  }
});
```

## Architecture

```
@broblox/moderation
├── types.ts          – Type definitions + default config
├── ban-store.ts      – DataStore CRUD + caching for ban records
├── mute-store.ts     – DataStore CRUD + caching for mute records
├── service.ts        – ModerationService singleton (stores + MessagingService sync + observability)
└── index.ts          – Re-exports
```

## Game Integration

Both the **Test Park** and **Obby** games integrate moderation via two
services:

| Service                        | Role                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------ |
| `ModerationEnforcementService` | Checks bans on join (kicks), applies mute player attributes, reacts to cross-server events |
| `ChatModerationService`        | Blanks chat messages from muted players using `TextChatService.OnIncomingMessage`          |

## Data Model

### BanRecord

| Field           | Type                                               | Description                |
| --------------- | -------------------------------------------------- | -------------------------- |
| `id`            | `string`                                           | Unique ban ID (GUID)       |
| `playerId`      | `number`                                           | Roblox UserId              |
| `playerName`    | `string?`                                          | Cached display name        |
| `type`          | `"TEMPORARY" \| "PERMANENT"`                       | Ban type                   |
| `status`        | `"ACTIVE" \| "EXPIRED" \| "REVOKED" \| "APPEALED"` | Current status             |
| `reason`        | `string`                                           | Shown to the player        |
| `internalNote`  | `string?`                                          | Moderator-only note        |
| `durationHours` | `number?`                                          | Duration (nil = permanent) |
| `expiresAt`     | `number?`                                          | Unix timestamp             |
| `moderatorId`   | `string`                                           | Who issued the ban         |
| `createdAt`     | `number`                                           | Unix timestamp             |
| `revokedAt`     | `number?`                                          | When revoked               |
| `revokedById`   | `string?`                                          | Who revoked                |
| `revokeReason`  | `string?`                                          | Reason for revocation      |

### MuteRecord

| Field             | Type                         | Description              |
| ----------------- | ---------------------------- | ------------------------ |
| `id`              | `string`                     | Unique mute ID (GUID)    |
| `playerId`        | `number`                     | Roblox UserId            |
| `type`            | `"chat" \| "voice" \| "all"` | Mute scope               |
| `isActive`        | `boolean`                    | Whether currently active |
| `reason`          | `string`                     | Reason                   |
| `durationMinutes` | `number`                     | Duration                 |
| `expiresAt`       | `number`                     | Unix timestamp           |
| `moderatorId`     | `string`                     | Who issued               |
| `createdAt`       | `number`                     | Unix timestamp           |

## Cross-Server Sync

When a ban or mute is created, the service publishes the record to
`ModBanSync` / `ModMuteSync` MessagingService topics. Subscribing servers
invalidate their local cache and fire registered callbacks so enforcement
services can react immediately.

## Metrics

| Metric                                      | Type      | Labels  |
| ------------------------------------------- | --------- | ------- |
| `moderation_sync_received_total`            | Counter   | `topic` |
| `moderation_sync_published_total`           | Counter   | `topic` |
| `moderation_sync_cache_invalidations_total` | Counter   | `topic` |
| `moderation_sync_decode_errors_total`       | Counter   | `topic` |
| `moderation_sync_message_age_ms`            | Histogram | `topic` |

## Testing

```bash
pnpm --filter @broblox/moderation test
```

Tests cover:

- **BanStore** – creation (permanent/temporary), expiry semantics, revocation,
  sync from external source, cache TTL + invalidation
- **MuteStore** – creation (chat/voice/all), expiry, removal, cache behaviour
- **ModerationService** – cross-server sync payload handling (string vs table),
  JSON decode errors, callback dispatch
