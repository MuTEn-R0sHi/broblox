# Modules: Leaderboards

Cross-game leaderboard system with period rotation and OrderedDataStore persistence (`@broblox/leaderboards`). **Status: Implemented** (41 tests).

## Purpose

- Register named leaderboards with configurable sort direction and period rotation.
- Submit scores to all periods simultaneously (alltime, daily, weekly, seasonal).
- In-memory cache with configurable TTL to reduce DataStore reads.
- Automatic date-key generation for daily/weekly period isolation.

## Core rules

- Score validation rejects `NaN`, `Infinity`, `-Infinity`, and negative values.
- OrderedDataStore keys follow the format `{prefix}_{name}_{period}[_{dateKey}]`.
- Daily keys include `YYYYMMDD`, weekly keys include `YYYYWww`.
- Cache is updated in-place on score submit — re-sorts, re-ranks, trims to `maxEntries`.

## Data model

- `LeaderboardDefinition` — `name`, `label`, `sortDirection` (asc/desc), `periods[]`, `maxEntries?` (default 100).
- `LeaderboardEntry` — `userId`, `playerName`, `score`, `rank` (1-based), `updatedAt`.
- `LeaderboardPeriod` — `"alltime" | "daily" | "weekly" | "seasonal"`.
- `SortDirection` — `"asc"` (lowest = rank 1, e.g. speedruns) | `"desc"` (highest = rank 1).
- `SubmitResult` — `success`, `status`, `newRank?`, `previousScore?`.

## Public API

| Method                                         | Description                        |
| ---------------------------------------------- | ---------------------------------- |
| `register(def)`                                | Register a leaderboard definition  |
| `registerAll(defs[])`                          | Bulk register                      |
| `submitScore(name, userId, playerName, score)` | Submit to all configured periods   |
| `getTopEntries(name, period, limit?)`          | Top-N query (cache-aware)          |
| `getPlayerRank(name, period, userId)`          | Rank lookup                        |
| `refresh(name, period)`                        | Force cache refresh from DataStore |
| `refreshAll()`                                 | Refresh all leaderboards × periods |
| `clearCache(name?)`                            | Clear cache                        |

### Factory

```ts
const lb = createLeaderboardService({
  datastorePrefix: "lb",
  refreshInterval: 60,
});

lb.getLeaderboardStore().register({
  name: "kills",
  label: "Most Kills",
  sortDirection: "desc",
  periods: ["alltime", "daily", "weekly"],
});
```

## Key format

| Period   | Example Key               |
| -------- | ------------------------- |
| alltime  | `lb_kills_alltime`        |
| daily    | `lb_kills_daily_20260225` |
| weekly   | `lb_kills_weekly_2026W09` |
| seasonal | `lb_kills_seasonal`       |

## Security

- **Score validation** — rejects NaN, Infinity, and negative values.
- **OrderedDataStore** — server-only Roblox API; no client access.
- **Period isolation** — daily/weekly keys auto-expire by date suffix.
- **No client-side submission** — all writes through server-side store.

## Config

| Key               | Default | Description                 |
| ----------------- | ------- | --------------------------- |
| `datastorePrefix` | `"lb"`  | DataStore key prefix        |
| `refreshInterval` | `60`    | Cache TTL in seconds        |
| `maxEntries`      | `100`   | Max entries per leaderboard |

## Observability

- `leaderboards_score_submissions` — scores submitted
- `leaderboards_score_updates` — scores updated (new record)
- `leaderboards_top_n_queries` — top-N queries served
- `leaderboards_rank_lookups` — rank queries served
