# @rbx/leaderboards

Cross-game leaderboard system for Roblox games built on `roblox-ts`.

## Features

- **Named leaderboards** — define multiple boards (kills, coins, fastest_time, etc.)
- **Period support** — all-time, daily, weekly, seasonal with automatic key rotation
- **OrderedDataStore-backed** — uses Roblox's native sorted data structure
- **In-memory caching** — configurable refresh interval, automatic cache invalidation
- **Top-N queries** — efficient sorted retrieval with rank assignment
- **Player rank lookup** — find any player's position on any board
- **Sort direction** — descending (highest first) or ascending (lowest first)
- **Observability** — counters for submissions, queries, and lookups

## Installation

Already included as a workspace package:

```jsonc
// package.json
"dependencies": {
  "@rbx/leaderboards": "workspace:*"
}
```

## Quick Start

```ts
import { LeaderboardStore } from "@rbx/leaderboards";

const leaderboards = new LeaderboardStore({
  datastorePrefix: "lb", // default
  refreshInterval: 60, // seconds between DataStore reloads
  onScoreSubmit: (board, userId, score) => {
    // Optional callback
  },
});

// Register leaderboard definitions
leaderboards.registerAll([
  {
    name: "kills",
    label: "Total Kills",
    sortDirection: "desc", // highest first
    periods: ["alltime", "daily", "weekly"],
    maxEntries: 100,
  },
  {
    name: "fastest_time",
    label: "Fastest Completion",
    sortDirection: "asc", // lowest first
    periods: ["alltime"],
    maxEntries: 50,
  },
]);

// Submit a score (persists to all configured periods)
const result = leaderboards.submitScore("kills", player.UserId, player.Name, 42);
// result.success, result.status, result.newRank

// Query top 10
const top = leaderboards.getTopEntries("kills", "alltime", 10);
// top.entries: [{ userId, playerName, score, rank, updatedAt }, ...]

// Look up a player's rank
const rank = leaderboards.getPlayerRank("kills", "daily", player.UserId);
// rank.found, rank.entry?.rank, rank.entry?.score

// Force refresh from DataStore
leaderboards.refresh("kills", "alltime");
leaderboards.refreshAll(); // all boards + all periods
```

## API

### `LeaderboardStore`

| Method                                    | Description                              |
| ----------------------------------------- | ---------------------------------------- |
| `register(def)`                           | Register a single leaderboard definition |
| `registerAll(defs)`                       | Register multiple definitions            |
| `getDefinition(name)`                     | Get a registered definition              |
| `getAllDefinitions()`                     | Get all registered definitions           |
| `submitScore(board, userId, name, score)` | Submit/update a player's score           |
| `getTopEntries(board, period, limit?)`    | Get ranked entries                       |
| `getPlayerRank(board, period, userId)`    | Look up a player's rank                  |
| `refresh(board, period)`                  | Force DataStore reload                   |
| `refreshAll()`                            | Refresh all boards and periods           |
| `clearCache(board?)`                      | Clear cached entries                     |

### Key Types

```ts
type LeaderboardPeriod = "alltime" | "daily" | "weekly" | "seasonal";
type SortDirection = "asc" | "desc";

interface LeaderboardEntry {
  userId: number;
  playerName: string;
  score: number;
  rank: number; // 1-based
  updatedAt: number;
}

interface SubmitResult {
  success: boolean;
  status: "UPDATED" | "NO_CHANGE" | "ERROR";
  newRank?: number;
}
```

## DataStore Layout

Each leaderboard + period combination gets its own `OrderedDataStore`:

| Store Name                           | Example                   |
| ------------------------------------ | ------------------------- |
| `{prefix}_{name}_alltime`            | `lb_kills_alltime`        |
| `{prefix}_{name}_daily_{YYYYMMDD}`   | `lb_kills_daily_20260206` |
| `{prefix}_{name}_weekly_{YYYY}W{WW}` | `lb_kills_weekly_2026W06` |
| `{prefix}_{name}_seasonal`           | `lb_kills_seasonal`       |

## Metrics

| Counter                          | Description              |
| -------------------------------- | ------------------------ |
| `leaderboards_score_submissions` | Total score submit calls |
| `leaderboards_score_updates`     | Scores actually written  |
| `leaderboards_top_n_queries`     | Top-N query calls        |
| `leaderboards_rank_lookups`      | Player rank lookup calls |
