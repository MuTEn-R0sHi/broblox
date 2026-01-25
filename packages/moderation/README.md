# @rbx/moderation

Server-side moderation system for Roblox games.

## Features

- **Ban System** - Temporary and permanent bans with expiry tracking
- **Mute System** - Chat and voice mutes with duration
- **Cross-Server Sync** - Ban/mute updates propagate via MessagingService
- **Trust Integration** - Hooks into `@rbx/security` trust scores
- **Dashboard Sync** - Integrates with dashboard for moderator actions

## Installation

```bash
pnpm add @rbx/moderation
```

## Usage

### Initialize Moderation

```typescript
import { ModerationService } from "@rbx/moderation";

// Server-side initialization
ModerationService.init({
  datastoreName: "PlayerModeration",
  syncInterval: 30, // seconds between dashboard sync
  onBanCheck: (player, ban) => {
    // Optional: Custom ban handling
    if (ban.type === "PERMANENT") {
      player.Kick(`Permanently banned: ${ban.reason}`);
    } else {
      player.Kick(`Banned until ${ban.expiresAt}: ${ban.reason}`);
    }
  },
});
```

### Check Bans on Join

```typescript
import { ModerationService } from "@rbx/moderation";

Players.PlayerAdded.Connect((player) => {
  const banStatus = ModerationService.checkBan(player.UserId);

  if (banStatus.isBanned) {
    player.Kick(banStatus.message);
    return;
  }

  // Continue with normal join flow
});
```

### Check Mutes

```typescript
import { ModerationService } from "@rbx/moderation";

// Before sending chat message
const muteStatus = ModerationService.checkMute(player.UserId, "chat");
if (muteStatus.isMuted) {
  // Silently block message or show mute notification
  return;
}
```

### Issue Moderation Actions (Server Only)

```typescript
import { ModerationService } from "@rbx/moderation";

// Issue a ban
await ModerationService.ban({
  playerId: targetUserId,
  type: "TEMPORARY",
  durationHours: 24,
  reason: "Exploiting - speed hack detected",
  moderatorId: "system", // or moderator's userId
});

// Issue a mute
await ModerationService.mute({
  playerId: targetUserId,
  type: "chat",
  durationMinutes: 30,
  reason: "Spam",
});

// Revoke a ban
await ModerationService.revokeBan(banId, "Appeal approved");
```

## Architecture

```
@rbx/moderation
├── ban-store.ts      - DataStore wrapper for ban records
├── mute-store.ts     - DataStore wrapper for mute records
├── sync.ts           - Cross-server sync via MessagingService
├── service.ts        - Main ModerationService API
└── types.ts          - Type definitions
```

## Integration with @rbx/security

The moderation system integrates with trust scores:

```typescript
import { Enforcer } from "@rbx/security";
import { ModerationService } from "@rbx/moderation";

// Configure enforcer to use moderation for bans
Enforcer.configure({
  onBan: async (player, reason) => {
    await ModerationService.ban({
      playerId: player.UserId,
      type: "TEMPORARY",
      durationHours: 24,
      reason,
      moderatorId: "system",
    });
  },
});
```

## Dashboard Sync

Bans and mutes sync with the dashboard database:

- Dashboard moderators can issue/revoke bans via web UI
- Changes propagate to all servers within sync interval
- Audit logs are created for all moderation actions

## Configuration

| Option           | Type     | Default              | Description                    |
| ---------------- | -------- | -------------------- | ------------------------------ |
| `datastoreName`  | string   | `"PlayerModeration"` | DataStore name for records     |
| `syncInterval`   | number   | `60`                 | Seconds between dashboard sync |
| `messagingTopic` | string   | `"moderation"`       | MessagingService topic         |
| `onBanCheck`     | function | default kick         | Custom ban handling            |
| `onMuteCheck`    | function | undefined            | Custom mute notification       |
