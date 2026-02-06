# @rbx/analytics

Player behavior analytics for Roblox games — structured events, funnels, sessions, and retention tracking.

## Features

| Feature              | Description                                                                  |
| -------------------- | ---------------------------------------------------------------------------- |
| **EventTracker**     | Structured events with schema validation, batching, and telemetry forwarding |
| **FunnelTracker**    | Multi-step conversion funnels with timeout and per-player progression        |
| **SessionTracker**   | Session lifecycle, heartbeats, and playtime accumulation                     |
| **RetentionTracker** | D1/D7/D14/D30 retention via DataStore persistence                            |

## Quick Start

```ts
import { EventTracker, FunnelTracker, SessionTracker, RetentionTracker } from "@rbx/analytics";

const config = {
  datastoreName: "GameRetention",
  heartbeatInterval: 60,
  enableLogging: true,
  forwardToTelemetry: true,
};

// Event tracking
const events = new EventTracker(config);
events.registerEvent({
  name: "player.level_up",
  category: "player",
  description: "Player leveled up",
  expectedFields: ["level", "xpEarned"],
});
events.track("player.level_up", player.UserId, { level: 5, xpEarned: 1200 });

// Funnel tracking
const funnels = new FunnelTracker(config);
funnels.registerFunnel({
  name: "tutorial",
  label: "New Player Tutorial",
  steps: ["spawn", "move", "jump", "complete"],
  timeoutSec: 300,
});
funnels.enterFunnel("tutorial", player.UserId);
funnels.advanceStep("tutorial", player.UserId, "move");

// Session tracking
const sessions = new SessionTracker(config);
sessions.startSession(player.UserId);
sessions.heartbeat(player.UserId); // call periodically
const final = sessions.endSession(player.UserId);

// Retention tracking
const retention = new RetentionTracker(config);
retention.init();
retention.recordVisit(player.UserId, final?.playtimeSec);
const flags = retention.getRetentionFlags(record);
// { 1: true, 7: false, 14: false, 30: false }
```

## Event Taxonomy

Events follow the naming scheme from `docs/architecture/telemetry-taxonomy.md`:

| Category      | Example Events                                          |
| ------------- | ------------------------------------------------------- |
| `player`      | `player.joined`, `player.left`, `player.level_up`       |
| `match`       | `match.started`, `match.ended`                          |
| `economy`     | `economy.purchase`, `economy.grant_applied`             |
| `combat`      | `combat.kill`, `combat.death`                           |
| `social`      | `social.friend_added`, `social.chat_sent`               |
| `ui`          | `ui.menu_opened`, `ui.button_clicked`                   |
| `progression` | `progression.quest_complete`, `progression.achievement` |
| `custom`      | Any unregistered events default to this                 |

## Funnel Stats

```ts
const stats = funnels.getStats("tutorial");
// {
//   funnel: "tutorial",
//   entered: 100,
//   stepCounts: [100, 85, 72, 60],
//   completed: 60,
//   conversionRate: 0.6,
// }
```

## Retention Windows

| Window | Description                               |
| ------ | ----------------------------------------- |
| D1     | Player returned 1 day after first visit   |
| D7     | Player returned 7 days after first visit  |
| D14    | Player returned 14 days after first visit |
| D30    | Player returned 30 days after first visit |

## Metrics

All trackers emit counters via `@rbx/observability`:

| Metric                            | Description                          |
| --------------------------------- | ------------------------------------ |
| `analytics_events_tracked`        | Total events tracked                 |
| `analytics_events_dropped`        | Events where onEvent callback failed |
| `analytics_funnel_enters`         | Players entering funnels             |
| `analytics_funnel_completions`    | Players completing funnels           |
| `analytics_funnel_timeouts`       | Players timing out of funnels        |
| `analytics_sessions_started`      | Sessions started                     |
| `analytics_sessions_ended`        | Sessions ended                       |
| `analytics_retention_checks`      | Retention DataStore lookups          |
| `analytics_retention_new_players` | First-time players recorded          |

## Tests

```bash
pnpm --filter @rbx/analytics test
```
