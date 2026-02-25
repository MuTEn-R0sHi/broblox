/**
 * Client for the BroBlox Dashboard leaderboard API.
 *
 * Fetches leaderboard entries from Roblox OrderedDataStores via the
 * dashboard proxy, using ISR (60-second revalidation) on the website.
 */

const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "https://dashboard.broblox-games.com";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LeaderboardPeriod = "alltime" | "daily" | "weekly" | "seasonal";

export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  score: number;
  rank: number;
}

export interface LeaderboardResponse {
  boardId: string;
  period: LeaderboardPeriod;
  storeName: string;
  entries: LeaderboardEntry[];
  updatedAt: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Board definitions — mirrors what the game servers register
// ---------------------------------------------------------------------------

export interface BoardDef {
  id: string;
  label: string;
  /** DataStore prefix (default "lb" for starter, "obby_lb" for obby). */
  prefix: string;
  period: LeaderboardPeriod;
  /** Format a raw score for display (e.g. seconds → "4m 12s"). */
  formatValue?: (score: number) => string;
}

function formatPlaytime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Known leaderboards per game.
 * The `id` matches the board name registered via `@rbx/leaderboards`.
 */
export const GAME_BOARDS: Record<string, BoardDef[]> = {
  starter: [
    { id: "kills", label: "Top Kills", prefix: "lb", period: "alltime", formatValue: formatCount },
    { id: "wins", label: "Most Wins", prefix: "lb", period: "alltime", formatValue: formatCount },
    {
      id: "playtime",
      label: "Play Time",
      prefix: "lb",
      period: "alltime",
      formatValue: formatPlaytime,
    },
  ],
  obby: [
    {
      id: "completions",
      label: "Obby Completions",
      prefix: "obby_lb",
      period: "alltime",
      formatValue: formatCount,
    },
  ],
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetch a single leaderboard from the dashboard API.
 * Returns empty entries on failure so the page always renders.
 */
export async function fetchLeaderboard(
  boardId: string,
  opts: { period?: LeaderboardPeriod; limit?: number; prefix?: string } = {}
): Promise<LeaderboardResponse> {
  const period = opts.period ?? "alltime";
  const limit = opts.limit ?? 25;
  const prefix = opts.prefix ?? "lb";

  const url = new URL(`${DASHBOARD_URL}/api/leaderboards/${encodeURIComponent(boardId)}`);
  url.searchParams.set("period", period);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("prefix", prefix);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn(`[leaderboards] ${boardId}: HTTP ${res.status}`);
      return emptyResponse(boardId, period);
    }

    return (await res.json()) as LeaderboardResponse;
  } catch (error) {
    console.warn(`[leaderboards] ${boardId}: fetch failed`, error);
    return emptyResponse(boardId, period);
  }
}

/**
 * Fetch all boards for a game in parallel.
 */
export async function fetchGameLeaderboards(
  gameSlug: string
): Promise<Map<string, LeaderboardResponse>> {
  const boards = GAME_BOARDS[gameSlug] ?? [];
  const results = await Promise.all(
    boards.map(async (b) => {
      const data = await fetchLeaderboard(b.id, {
        period: b.period,
        prefix: b.prefix,
      });
      return [b.id, data] as const;
    })
  );
  return new Map(results);
}

function emptyResponse(boardId: string, period: LeaderboardPeriod): LeaderboardResponse {
  return {
    boardId,
    period,
    storeName: "",
    entries: [],
    updatedAt: new Date().toISOString(),
  };
}
