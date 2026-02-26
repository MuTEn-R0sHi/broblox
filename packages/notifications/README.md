# @broblox/notifications

In-game notification system for Roblox games — toasts, announcements, news feed, and scheduled messages.

## Features

| Feature                 | Description                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| **NotificationStore**   | Per-player notification queues with broadcasts, dismissals, actions, expiry, and queue limits |
| **AnnouncementManager** | Scheduled one-shot and repeating announcements + news feed management                         |

## Quick Start

```ts
import { NotificationStore, AnnouncementManager } from "@broblox/notifications";

const config = {
  maxQueueSize: 20,
  durations: { short: 3, medium: 5, long: 10, persistent: 0 },
  enableLogging: true,
};

const store = new NotificationStore(config);
const announcements = new AnnouncementManager(store, config);

// Send a toast to specific players
store.toast("Headshot!", [player.UserId]);

// Broadcast to everyone
store.announce("Server restarting in 5 minutes", "Save your progress!");

// Reward notification
store.reward(player.UserId, "Level Up!", "+500 XP", "xp_icon");

// System alert (urgent, persistent)
store.system("Maintenance", "Server will restart shortly");

// Custom notification with action
store.notify({
  type: "toast",
  title: "New item available!",
  body: "Check the shop",
  action: "open_shop",
  targetPlayerIds: [player.UserId],
  priority: "high",
  duration: "medium",
});
```

## Notification Types

| Type           | Use Case                                   |
| -------------- | ------------------------------------------ |
| `toast`        | Brief messages (kills, achievements, tips) |
| `announcement` | Server-wide broadcasts                     |
| `news`         | Patch notes, events, updates               |
| `reward`       | Loot, XP, currency grants                  |
| `system`       | Maintenance, errors, urgent alerts         |

## Priority Levels

| Priority | Behaviour                                |
| -------- | ---------------------------------------- |
| `low`    | Quiet, may be suppressed by queue limits |
| `normal` | Standard display                         |
| `high`   | Prominent display                        |
| `urgent` | Cannot be auto-removed by queue limits   |

## Scheduled Announcements

```ts
announcements.registerAnnouncement({
  id: "reminder",
  title: "Vote for the server!",
  body: "Support us by voting",
  repeatInterval: 300, // every 5 minutes (0 = one-shot)
  priority: "normal",
  duration: "medium",
});

// Call tick() periodically from your server loop
announcements.tick();

// Fire manually
announcements.fireNow("reminder");
```

## News Feed

```ts
announcements.addNews({
  id: "patch-1.2",
  title: "Patch 1.2 Released",
  body: "New weapons, bug fixes, and more!",
  category: "patch",
  publishedAt: os.time(),
});

const allNews = announcements.getNews(10); // latest 10
const patches = announcements.getNewsByCategory("patch");
```

## Cleanup

```ts
// Remove expired and dismissed notifications
store.cleanup(); // call periodically

// Player leaving
store.clearPlayer(player.UserId);
```

## Metrics

| Metric                              | Description                   |
| ----------------------------------- | ----------------------------- |
| `notifications_created`             | Total notifications created   |
| `notifications_dismissed`           | Total dismissed               |
| `notifications_expired`             | Total expired by cleanup      |
| `notifications_broadcast`           | Total broadcasts              |
| `notifications_announcements_fired` | Scheduled announcements fired |

## Tests

```bash
pnpm --filter @broblox/notifications test
```
