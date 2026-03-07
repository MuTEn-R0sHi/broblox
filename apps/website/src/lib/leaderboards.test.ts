import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Import after fetch is available
import {
  GAME_BOARDS,
  fetchLeaderboard,
  fetchGameLeaderboards,
  type LeaderboardResponse,
} from "./leaderboards";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function okJson(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function sampleLeaderboard(boardId = "kills", count = 3): LeaderboardResponse {
  return {
    boardId,
    period: "alltime",
    storeName: `lb_${boardId}`,
    entries: Array.from({ length: count }, (_, i) => ({
      playerId: `${1000 + i}`,
      displayName: `Player${i}`,
      score: 100 - i * 10,
      rank: i + 1,
    })),
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

// ---------------------------------------------------------------------------
// GAME_BOARDS structure
// ---------------------------------------------------------------------------

describe("GAME_BOARDS", () => {
  it("defines boards for test-park game", () => {
    const boards = GAME_BOARDS["test-park"];
    expect(boards).toBeDefined();
    expect(boards.map((b) => b.id)).toEqual(["kills", "wins", "playtime"]);
  });

  it("defines boards for obby game", () => {
    const boards = GAME_BOARDS["obby"];
    expect(boards).toBeDefined();
    expect(boards.map((b) => b.id)).toEqual(["completions"]);
  });

  it("formatValue renders playtime as human-readable", () => {
    const playtime = GAME_BOARDS["test-park"].find((b) => b.id === "playtime");
    expect(playtime?.formatValue?.(3661)).toBe("1h 1m"); // 1 h 1 m 1 s → "1h 1m"
    expect(playtime?.formatValue?.(120)).toBe("2m");
    expect(playtime?.formatValue?.(0)).toBe("0m");
  });

  it("formatValue renders counts with commas", () => {
    const kills = GAME_BOARDS["test-park"].find((b) => b.id === "kills");
    expect(kills?.formatValue?.(1234567)).toBe("1,234,567");
    expect(kills?.formatValue?.(42)).toBe("42");
  });
});

// ---------------------------------------------------------------------------
// fetchLeaderboard
// ---------------------------------------------------------------------------

describe("fetchLeaderboard", () => {
  it("returns entries on success", async () => {
    const payload = sampleLeaderboard("kills");
    mockFetch.mockResolvedValue(okJson(payload));

    const result = await fetchLeaderboard("kills");

    expect(result.boardId).toBe("kills");
    expect(result.entries).toHaveLength(3);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Verify ISR revalidate option is set
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1]).toEqual(expect.objectContaining({ next: { revalidate: 60 } }));
  });

  it("passes query parameters correctly", async () => {
    mockFetch.mockResolvedValue(okJson(sampleLeaderboard()));

    await fetchLeaderboard("wins", { period: "daily", limit: 10, prefix: "custom" });

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("period")).toBe("daily");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("prefix")).toBe("custom");
  });

  it("uses defaults when options are omitted", async () => {
    mockFetch.mockResolvedValue(okJson(sampleLeaderboard()));

    await fetchLeaderboard("playtime");

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("period")).toBe("alltime");
    expect(url.searchParams.get("limit")).toBe("25");
    expect(url.searchParams.get("prefix")).toBe("lb");
  });

  it("returns empty entries on HTTP error", async () => {
    mockFetch.mockResolvedValue(new Response("", { status: 500 }));

    const result = await fetchLeaderboard("kills");

    expect(result.entries).toEqual([]);
    expect(result.boardId).toBe("kills");
  });

  it("returns empty entries on network error", async () => {
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    const result = await fetchLeaderboard("kills");

    expect(result.entries).toEqual([]);
    expect(result.boardId).toBe("kills");
  });
});

// ---------------------------------------------------------------------------
// fetchGameLeaderboards
// ---------------------------------------------------------------------------

describe("fetchGameLeaderboards", () => {
  it("fetches all boards for a game in parallel", async () => {
    // test-park has 3 boards: kills, wins, playtime
    mockFetch.mockImplementation(async (url: string) => {
      const parsed = new URL(url);
      const boardId = parsed.pathname.split("/").pop() ?? "";
      return okJson(sampleLeaderboard(boardId));
    });

    const result = await fetchGameLeaderboards("test-park");

    expect(result.size).toBe(3);
    expect(result.has("kills")).toBe(true);
    expect(result.has("wins")).toBe(true);
    expect(result.has("playtime")).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("returns empty Map for unknown game", async () => {
    const result = await fetchGameLeaderboards("nonexistent-game");

    expect(result.size).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns empty entries for failed fetches within a game", async () => {
    mockFetch.mockResolvedValue(new Response("", { status: 503 }));

    const result = await fetchGameLeaderboards("obby");

    expect(result.size).toBe(1);
    expect(result.get("completions")?.entries).toEqual([]);
  });
});
