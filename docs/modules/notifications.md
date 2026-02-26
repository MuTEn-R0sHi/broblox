# Modules: Notifications

In-game notification system with queues, announcements, and news (`@broblox/notifications`). **Status: Implemented** (44 tests).

## Purpose

- Targeted and broadcast notification delivery with priority queuing.
- Scheduled announcement system with repeat intervals.
- In-game news feed with category filtering.
- Convenience methods for toast, reward, and system messages.

## Core rules

- Queue overflow drops oldest non-urgent notifications first, then oldest urgent.
- All callbacks (`onShow`, `onDismiss`, `onAction`) are `pcall`-wrapped to prevent crashes.
- Player cleanup on leave prevents memory leaks.
- Entirely in-memory — no DataStore dependency.

## Data model

- `Notification` — `id`, `type`, `title`, `body?`, `icon?`, `priority`, `duration`, `targetPlayerIds[]`, `createdAt`, `expiresAt`, `action?`, `dismissed`.
- `NotificationType` — `"toast" | "announcement" | "news" | "reward" | "system"`.
- `NotificationPriority` — `"low" | "normal" | "high" | "urgent"`.
- `AnnouncementDefinition` — `id`, `title`, `body`, `repeatInterval`, `priority`, `duration`.
- `NewsItem` — `id`, `title`, `body`, `category`, `publishedAt`, `imageAsset?`, `action?`.

## Public API

### NotificationStore

| Method                                  | Description                                 |
| --------------------------------------- | ------------------------------------------- |
| `notify(options)`                       | Send a notification (targeted or broadcast) |
| `toast(title, playerIds?, priority?)`   | Quick toast                                 |
| `announce(title, body?, priority?)`     | Server-wide announcement                    |
| `reward(playerId, title, body?, icon?)` | Reward notification                         |
| `system(title, body?)`                  | Urgent persistent system message            |
| `dismiss(notificationId)`               | Mark dismissed                              |
| `getPlayerNotifications(playerId)`      | Active notifications for player             |
| `getPendingCount(playerId)`             | Count of non-dismissed                      |
| `cleanup()`                             | Prune expired + dismissed                   |

### AnnouncementManager

| Method                                | Description                                    |
| ------------------------------------- | ---------------------------------------------- |
| `registerAnnouncement(def)`           | Schedule an announcement                       |
| `tick()`                              | Fire due announcements (call from server loop) |
| `fireNow(id)`                         | Fire immediately                               |
| `addNews(item)`                       | Add a news item                                |
| `getNews(limit?)`                     | Get news sorted newest-first                   |
| `getNewsByCategory(category, limit?)` | Filter by category                             |

### Factory

```ts
const notif = createNotificationService({
  maxQueueSize: 20,
  onShow: (n) => renderToast(n),
});
```

## Security

- **Queue overflow protection** — enforces `maxQueueSize` per player.
- **Callback `pcall` wrapping** — prevents crashes from handler errors.
- **Player cleanup** — `onPlayerRemoving` wiring prevents memory leaks.
- **No DataStore** — no persistence attack surface.

## Config

| Key                    | Default | Description                  |
| ---------------------- | ------- | ---------------------------- |
| `maxQueueSize`         | `20`    | Max notifications per player |
| `durations.short`      | `3`     | Seconds                      |
| `durations.medium`     | `5`     | Seconds                      |
| `durations.long`       | `10`    | Seconds                      |
| `durations.persistent` | `0`     | Never auto-dismiss           |

## Observability

- `notifications_created` / `notifications_dismissed` / `notifications_expired`
- `notifications_broadcast` — server-wide messages
- `notifications_announcements_fired` — scheduled announcements
