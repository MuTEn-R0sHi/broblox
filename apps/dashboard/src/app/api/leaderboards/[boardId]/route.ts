import { NextRequest, NextResponse } from "next/server";
import { getOrderedDataStoreEntries, summarizeOpenCloudError } from "@/lib/roblox-open-cloud";

/**
 * GET /api/leaderboards/:boardId
 *
 * Public endpoint — reads leaderboard data from Roblox OrderedDataStore
 * via the Open Cloud API and returns ranked entries.
 *
 * Query parameters:
 *  - `period`    "alltime" | "daily" | "weekly" | "seasonal" (default: "alltime")
 *  - `limit`     1-100 (default: 25)
 *  - `prefix`    DataStore name prefix (default: "lb")
 *
 * Board IDs correspond to the leaderboard `name` registered in-game:
 *   kills, wins, playtime, completions, etc.
 *
 * OrderedDataStore key format (set by @rbx/leaderboards):
 *   {prefix}_{boardId}_{period}           (alltime / seasonal)
 *   {prefix}_{boardId}_daily_{YYYYMMDD}   (daily)
 *   {prefix}_{boardId}_weekly_{YYYY}W{WW} (weekly)
 */

// ── Config ──────────────────────────────────────────────────────────────────

/** Cache leaderboard responses for 5 minutes (300 s). */
const CACHE_TTL_SECONDS = 300;

type Period = "alltime" | "daily" | "weekly" | "seasonal";
const VALID_PERIODS = new Set<Period>(["alltime", "daily", "weekly", "seasonal"]);

// Simple in-memory cache so we don't hit Open Cloud on every request.
const responseCache = new Map<string, { data: unknown; expiresAt: number }>();

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildStoreName(prefix: string, boardId: string, period: Period): string {
  const base = `${prefix}_${boardId}`;

  switch (period) {
    case "alltime":
    case "seasonal":
      return `${base}_${period}`;
    case "daily": {
      const now = new Date();
      const y = now.getUTCFullYear();
      const m = String(now.getUTCMonth() + 1).padStart(2, "0");
      const d = String(now.getUTCDate()).padStart(2, "0");
      return `${base}_daily_${y}${m}${d}`;
    }
    case "weekly": {
      const now = new Date();
      const year = now.getUTCFullYear();
      // Match @rbx/leaderboards getWeeklyKey: weekNum = floor((yday - 1) / 7) + 1
      const startOfYear = Date.UTC(year, 0, 1);
      const daysSinceStartOfYear = Math.floor(
        (now.getTime() - startOfYear) / (24 * 60 * 60 * 1000)
      );
      const yday = daysSinceStartOfYear + 1; // 1-based day of year
      const weekNum = Math.floor((yday - 1) / 7) + 1;
      return `${base}_weekly_${year}W${String(weekNum).padStart(2, "0")}`;
    }
  }
}

// ── Route ───────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ boardId: string }> }
) {
  const { boardId } = await params;

  // Validate boardId (alphanumeric + hyphens/underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(boardId)) {
    return NextResponse.json({ error: "Invalid board ID" }, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const period = (searchParams.get("period") ?? "alltime") as Period;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "25", 10) || 25));
  const prefix = searchParams.get("prefix") ?? "lb";

  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json(
      { error: `Invalid period. Must be one of: ${[...VALID_PERIODS].join(", ")}` },
      { status: 400 }
    );
  }

  const storeName = buildStoreName(prefix, boardId, period);
  const cacheKey = `${storeName}:${limit}`;

  // Check cache
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 2}`,
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const result = await getOrderedDataStoreEntries({
      datastoreName: storeName,
      maxPageSize: limit,
      orderBy: "desc",
    });

    const entries = result.entries.map((entry, index) => ({
      playerId: entry.id,
      displayName: entry.id, // userId — website can resolve display names
      score: entry.value,
      rank: index + 1,
    }));

    const payload = {
      boardId,
      period,
      storeName,
      entries,
      updatedAt: new Date().toISOString(),
    };

    // Populate cache
    responseCache.set(cacheKey, {
      data: payload,
      expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
    });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=${CACHE_TTL_SECONDS * 2}`,
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error(`[api/leaderboards/${boardId}] ${summarizeOpenCloudError(error)}`);

    // Return empty entries rather than an error when Open Cloud fails
    return NextResponse.json(
      {
        boardId,
        period,
        storeName,
        entries: [],
        updatedAt: new Date().toISOString(),
        error: "Unable to fetch leaderboard data at this time",
      },
      { status: 200 }
    );
  }
}
