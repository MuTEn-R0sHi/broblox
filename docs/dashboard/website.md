# Website

Public-facing website at [broblox-games.com](https://broblox-games.com) — serves as the marketing and community hub.

## Tech stack

| Layer     | Technology              |
| --------- | ----------------------- |
| Framework | Next.js 16 (App Router) |
| React     | 19                      |
| Styling   | Tailwind CSS 4          |
| Icons     | lucide-react            |
| Hosting   | Vercel                  |
| Port      | 3001 (dev)              |

The website has **no database** — it consumes data from the Dashboard API and Roblox Open Cloud.

## Pages

| Route           | Description                                                     |
| --------------- | --------------------------------------------------------------- |
| `/`             | Landing page — Hero, Games, Features, Stats sections            |
| `/news`         | News listing — fetches published posts from Dashboard API       |
| `/rankings`     | Global leaderboards for all games (Starter World, BroBlox Obby) |
| `/games/[slug]` | Individual game detail pages (statically generated)             |

## Data flow

```
Dashboard (MySQL/Prisma)
│
├─ GET /api/news          →  Website: /news     (ISR, 5-min cache)
│     Only PUBLISHED posts
│
Dashboard (Open Cloud)
│
├─ GET /api/leaderboards  →  Website: /rankings  (ISR, 60s cache)
│     OrderedDataStore
│
Roblox (Open Cloud)
│
└─ Game stats              →  Website: /          (ISR, 60s cache)
      Universe API
```

## Environment variables

| Variable                    | Description                                                                     |
| --------------------------- | ------------------------------------------------------------------------------- |
| `DASHBOARD_URL`             | Base URL for the dashboard API (default: `https://dashboard.broblox-games.com`) |
| `ROBLOX_OPEN_CLOUD_API_KEY` | Open Cloud API key for game stats                                               |
| `ROBLOX_UNIVERSE_ID`        | Universe ID for the primary game                                                |

## Local development

```bash
cd apps/website
pnpm dev    # starts on port 3001
```

The website reads from the dashboard API. If the dashboard isn't running, sample/fallback data is shown.

## Key libraries

### `lib/news.ts`

- `fetchNewsPosts(page?, limit?, tag?)` — paginated news from dashboard API.
- `fetchNewsPostBySlug(slug)` — single post lookup.
- ISR with `next: { revalidate: 300 }`.
- Returns empty results on API failure (graceful fallback).

### `lib/leaderboards.ts`

- `fetchLeaderboard(boardId, prefix, period?)` — single leaderboard from dashboard API.
- `fetchGameLeaderboards(game)` — all boards for a game.
- `GAME_BOARDS` config maps games to their board definitions.
- ISR with `next: { revalidate: 60 }`.

## Fallback strategy

Both the news and rankings pages include hardcoded fallback entries. When the API is unreachable:

- **News** — shows 3 sample posts with a badge indicating sample data.
- **Rankings** — shows placeholder leaderboard entries with a "sample data" badge.

This ensures the website always renders, even if the dashboard is down.
