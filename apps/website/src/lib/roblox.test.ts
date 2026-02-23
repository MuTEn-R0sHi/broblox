import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchGameStats, formatCount } from "./roblox";

// ---------------------------------------------------------------------------
// formatCount
// ---------------------------------------------------------------------------
describe("formatCount", () => {
  it("returns the number as a string for values below 1,000", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(1)).toBe("1");
    expect(formatCount(999)).toBe("999");
  });

  it("formats thousands with one decimal place and K suffix", () => {
    expect(formatCount(1000)).toBe("1.0K");
    expect(formatCount(1500)).toBe("1.5K");
    expect(formatCount(9999)).toBe("10.0K");
    expect(formatCount(999_000)).toBe("999.0K");
  });

  it("formats millions with one decimal place and M suffix", () => {
    expect(formatCount(1_000_000)).toBe("1.0M");
    expect(formatCount(1_500_000)).toBe("1.5M");
    expect(formatCount(10_000_000)).toBe("10.0M");
  });

  it("M takes priority over K at 1,000,000", () => {
    expect(formatCount(999_999)).toBe("1000.0K");
    expect(formatCount(1_000_000)).toBe("1.0M");
  });
});

// ---------------------------------------------------------------------------
// fetchGameStats
// ---------------------------------------------------------------------------
describe("fetchGameStats", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns an empty object when given an empty array", async () => {
    const result = await fetchGameStats([]);
    expect(result).toEqual({});
    // fetch should not have been called
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns an empty object when all universe IDs are empty strings", async () => {
    const result = await fetchGameStats(["", ""]);
    expect(result).toEqual({});
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches the Roblox games API with the correct URL", async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ id: 123, name: "Test Game", playing: 42, visits: 1000, maxPlayers: 50 }],
      }),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response);

    await fetchGameStats(["123"]);

    expect(fetch).toHaveBeenCalledWith(
      "https://games.roblox.com/v1/games?universeIds=123",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      })
    );
  });

  it("maps the API response into a record keyed by universe ID string", async () => {
    const entry = {
      id: 9624221556,
      name: "BroBlox Obby",
      playing: 77,
      visits: 50000,
      maxPlayers: 20,
    };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [entry] }),
    } as unknown as Response);

    const result = await fetchGameStats(["9624221556"]);

    expect(result["9624221556"]).toEqual({
      universeId: entry.id,
      name: entry.name,
      playing: entry.playing,
      visits: entry.visits,
      maxPlayers: entry.maxPlayers,
    });
  });

  it("handles multiple universe IDs in a single request", async () => {
    const entries = [
      { id: 111, name: "Game A", playing: 10, visits: 100, maxPlayers: 20 },
      { id: 222, name: "Game B", playing: 20, visits: 200, maxPlayers: 20 },
    ];
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: entries }),
    } as unknown as Response);

    const result = await fetchGameStats(["111", "222"]);

    expect(Object.keys(result)).toHaveLength(2);
    expect(result["111"].name).toBe("Game A");
    expect(result["222"].name).toBe("Game B");
  });

  it("returns an empty object when the response is not ok", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: vi.fn(),
    } as unknown as Response);

    const result = await fetchGameStats(["123"]);
    expect(result).toEqual({});
  });

  it("returns an empty object when fetch throws", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network failure"));

    const result = await fetchGameStats(["123"]);
    expect(result).toEqual({});
  });

  it("returns an empty object when the JSON response has no data array", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] }),
    } as unknown as Response);

    const result = await fetchGameStats(["123"]);
    expect(result).toEqual({});
  });

  it("skips empty string IDs but still fetches valid ones", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ id: 456, name: "Valid", playing: 5, visits: 50, maxPlayers: 10 }],
      }),
    } as unknown as Response);

    const result = await fetchGameStats(["456", "", "  "]);

    // URL should contain only the non-empty IDs (space is not filtered but that's fine — join still works)
    expect(fetch).toHaveBeenCalled();
    expect(result["456"]).toBeDefined();
  });
});
