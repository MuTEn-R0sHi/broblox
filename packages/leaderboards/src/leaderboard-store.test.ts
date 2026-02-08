/**
 * LeaderboardStore Tests
 *
 * Comprehensive tests for registration, score submission,
 * top-N queries, rank lookups, caching, and period support.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LeaderboardDefinition, LeaderboardsConfig } from "./types";

// ---------------------------------------------------------------------------
// Roblox globals stub
// ---------------------------------------------------------------------------

interface MockOrderedDataStore {
  data: Map<string, number>;
  GetSortedAsync: ReturnType<typeof vi.fn>;
  SetAsync: ReturnType<typeof vi.fn>;
}

function createMockOrderedDataStore(): MockOrderedDataStore {
  const data = new Map<string, number>();
  return {
    data,
    GetSortedAsync: vi.fn((ascending: boolean, pageSize: number) => {
      // Build sorted page from data
      const items: Array<{ key: string; value: number }> = [];
      data.forEach((value, key) => items.push({ key, value }));

      items.sort((a, b) => {
        if (ascending) return a.value - b.value;
        return b.value - a.value;
      });

      const page = items.slice(0, pageSize);
      return {
        GetCurrentPage: () => page,
      };
    }),
    SetAsync: vi.fn((key: string, value: number) => {
      data.set(key, value);
    }),
  };
}

// Polyfill roblox-ts array/string methods for Node/vitest
const arrayProto = Array.prototype as unknown as Record<string, unknown>;
if (!arrayProto.size) {
  arrayProto.size = function (this: unknown[]) {
    return this.length;
  };
}

const stringProto = String.prototype as unknown as Record<string, unknown>;
// Always override — JS has a built-in deprecated .sub() that wraps in <sub> tags
stringProto.sub = function (this: string, start: number, end?: number) {
  // Lua's string.sub is 1-based inclusive on both ends
  return this.substring(start - 1, end);
};
if (!stringProto.size) {
  stringProto.size = function (this: string) {
    return this.length;
  };
}

let mockTime = 1000;
const stores = new Map<string, MockOrderedDataStore>();

function getOrCreateStore(name: string): MockOrderedDataStore {
  let store = stores.get(name);
  if (!store) {
    store = createMockOrderedDataStore();
    stores.set(name, store);
  }
  return store;
}

function setupGlobals() {
  mockTime = 1000;
  stores.clear();

  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = {
    time: vi.fn(() => mockTime),
    date: vi.fn((_fmt: string) => ({
      year: 2026,
      month: 2,
      day: 6,
      yday: 37,
      hour: 12,
      min: 0,
      sec: 0,
    })),
    clock: vi.fn(() => mockTime / 1000),
  };
  g.math = { floor: Math.floor, min: Math.min, max: Math.max, huge: Infinity };
  g.string = {
    upper: (s: string) => s.toUpperCase(),
    format: (fmt: string, ...args: unknown[]) => {
      let result = fmt;
      for (const arg of args) {
        result = result.replace(/%[^%]/, String(arg));
      }
      return result;
    },
  };
  g.tonumber = (s: unknown) => {
    const n = Number(s);
    return isNaN(n) ? undefined : n;
  };
  g.tostring = (v: unknown) => String(v);
  g.pcall = (fn: () => void) => {
    try {
      fn();
      return [true];
    } catch (e) {
      return [false, e];
    }
  };
  g.game = {
    GetService: (name: string) => {
      if (name === "DataStoreService") {
        return {
          GetOrderedDataStore: (storeName: string) => getOrCreateStore(storeName),
        };
      }
      throw new Error(`Unexpected service: ${name}`);
    },
  };
}

function teardownGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.print;
  delete g.os;
  delete g.math;
  delete g.string;
  delete g.tonumber;
  delete g.tostring;
  delete g.pcall;
  delete g.game;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDef(overrides?: Partial<LeaderboardDefinition>): LeaderboardDefinition {
  return {
    name: "kills",
    label: "Total Kills",
    sortDirection: "desc",
    periods: ["alltime"],
    maxEntries: 100,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LeaderboardStore", () => {
  beforeEach(() => {
    vi.resetModules();
    setupGlobals();
  });

  afterEach(() => {
    teardownGlobals();
    vi.restoreAllMocks();
  });

  async function getStore(cfg?: LeaderboardsConfig) {
    const mod = await import("./leaderboard-store");
    return new mod.LeaderboardStore(cfg);
  }

  // ====================================================================
  // Registration
  // ====================================================================

  describe("registration", () => {
    it("registers a leaderboard definition", async () => {
      const ls = await getStore();
      ls.register(makeDef());
      expect(ls.getDefinition("kills")).toBeDefined();
      expect(ls.getDefinition("kills")?.label).toBe("Total Kills");
    });

    it("registers multiple definitions", async () => {
      const ls = await getStore();
      ls.registerAll([
        makeDef({ name: "kills" }),
        makeDef({ name: "coins", label: "Coins Collected" }),
      ]);
      expect(ls.getAllDefinitions()).toHaveLength(2);
    });

    it("returns undefined for unregistered leaderboard", async () => {
      const ls = await getStore();
      expect(ls.getDefinition("nope")).toBeUndefined();
    });
  });

  // ====================================================================
  // Score Submission
  // ====================================================================

  describe("submitScore", () => {
    it("submits a score and persists to DataStore", async () => {
      const ls = await getStore();
      ls.register(makeDef());
      const result = ls.submitScore("kills", 100, "Player100", 42);

      expect(result.success).toBe(true);
      expect(result.status).toBe("UPDATED");

      // Check the ordered data store received the value
      const store = stores.get("lb_kills_alltime")!;
      expect(store.SetAsync).toHaveBeenCalledWith("100", 42);
    });

    it("returns error for unregistered leaderboard", async () => {
      const ls = await getStore();
      const result = ls.submitScore("unknown", 100, "Player100", 42);
      expect(result.success).toBe(false);
      expect(result.status).toBe("ERROR");
    });

    it("submits to multiple periods", async () => {
      const ls = await getStore();
      ls.register(makeDef({ periods: ["alltime", "daily", "weekly"] }));
      ls.submitScore("kills", 100, "Player100", 50);

      // Should have created stores for all 3 periods
      expect(stores.has("lb_kills_alltime")).toBe(true);
      expect(stores.has("lb_kills_daily_20260206")).toBe(true);
      expect(stores.has("lb_kills_weekly_2026W06")).toBe(true);
    });

    it("fires onScoreSubmit callback", async () => {
      const onScoreSubmit = vi.fn();
      const ls = await getStore({ onScoreSubmit });
      ls.register(makeDef());
      ls.submitScore("kills", 42, "TestPlayer", 100);

      expect(onScoreSubmit).toHaveBeenCalledWith("kills", 42, 100);
    });
  });

  // ====================================================================
  // Top-N Queries
  // ====================================================================

  describe("getTopEntries", () => {
    it("loads entries from DataStore", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      // Seed the data store
      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);
      store.data.set("200", 75);
      store.data.set("300", 25);

      const result = ls.getTopEntries("kills", "alltime");
      expect(result.entries).toHaveLength(3);
      // Desc sort: 75, 50, 25
      expect(result.entries[0].score).toBe(75);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[1].score).toBe(50);
      expect(result.entries[1].rank).toBe(2);
      expect(result.entries[2].score).toBe(25);
      expect(result.entries[2].rank).toBe(3);
    });

    it("respects limit parameter", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);
      store.data.set("200", 75);
      store.data.set("300", 25);

      const result = ls.getTopEntries("kills", "alltime", 2);
      expect(result.entries).toHaveLength(2);
    });

    it("returns cached data on subsequent calls within refresh interval", async () => {
      const ls = await getStore({ refreshInterval: 60 });
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);

      // First call — loads from DataStore
      ls.getTopEntries("kills", "alltime");
      expect(store.GetSortedAsync).toHaveBeenCalledTimes(1);

      // Second call — uses cache
      ls.getTopEntries("kills", "alltime");
      expect(store.GetSortedAsync).toHaveBeenCalledTimes(1);
    });

    it("reloads from DataStore when cache is stale", async () => {
      const ls = await getStore({ refreshInterval: 30 });
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);

      ls.getTopEntries("kills", "alltime");
      expect(store.GetSortedAsync).toHaveBeenCalledTimes(1);

      // Advance time
      mockTime = 1031;

      ls.getTopEntries("kills", "alltime");
      expect(store.GetSortedAsync).toHaveBeenCalledTimes(2);
    });

    it("sorts ascending for asc leaderboards", async () => {
      const ls = await getStore();
      ls.register(makeDef({ name: "fastest", sortDirection: "asc" }));

      const store = getOrCreateStore("lb_fastest_alltime");
      store.data.set("100", 120);
      store.data.set("200", 90);
      store.data.set("300", 150);

      const result = ls.getTopEntries("fastest", "alltime");
      // Asc sort: 90, 120, 150
      expect(result.entries[0].score).toBe(90);
      expect(result.entries[0].rank).toBe(1);
      expect(result.entries[2].score).toBe(150);
    });
  });

  // ====================================================================
  // Player Rank Lookup
  // ====================================================================

  describe("getPlayerRank", () => {
    it("finds a player on the leaderboard", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);
      store.data.set("200", 75);

      // Prime cache
      ls.getTopEntries("kills", "alltime");

      const result = ls.getPlayerRank("kills", "alltime", 200);
      expect(result.found).toBe(true);
      expect(result.entry?.rank).toBe(1); // highest score
      expect(result.entry?.score).toBe(75);
    });

    it("returns found=false for missing player", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);
      ls.getTopEntries("kills", "alltime");

      const result = ls.getPlayerRank("kills", "alltime", 999);
      expect(result.found).toBe(false);
    });

    it("auto-loads cache if not primed", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);

      // Don't prime cache — getPlayerRank should auto-load
      const result = ls.getPlayerRank("kills", "alltime", 100);
      expect(result.found).toBe(true);
      expect(store.GetSortedAsync).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================================
  // Cache Management
  // ====================================================================

  describe("cache management", () => {
    it("clearCache removes all cached data", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);
      ls.getTopEntries("kills", "alltime");

      ls.clearCache();

      // Next call should reload
      ls.getTopEntries("kills", "alltime");
      expect(store.GetSortedAsync).toHaveBeenCalledTimes(2);
    });

    it("clearCache with name only clears that leaderboard", async () => {
      const ls = await getStore();
      ls.register(makeDef({ name: "kills" }));
      ls.register(makeDef({ name: "coins", label: "Coins" }));

      const killsStore = getOrCreateStore("lb_kills_alltime");
      killsStore.data.set("100", 50);
      const coinsStore = getOrCreateStore("lb_coins_alltime");
      coinsStore.data.set("100", 200);

      ls.getTopEntries("kills", "alltime");
      ls.getTopEntries("coins", "alltime");

      ls.clearCache("kills");

      // kills should reload, coins should still be cached
      ls.getTopEntries("kills", "alltime");
      expect(killsStore.GetSortedAsync).toHaveBeenCalledTimes(2);

      ls.getTopEntries("coins", "alltime");
      expect(coinsStore.GetSortedAsync).toHaveBeenCalledTimes(1);
    });

    it("refresh forces a reload", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);
      ls.getTopEntries("kills", "alltime");

      // Force refresh without changing time
      ls.refresh("kills", "alltime");
      expect(store.GetSortedAsync).toHaveBeenCalledTimes(2);
    });

    it("refreshAll refreshes all registered leaderboards", async () => {
      const ls = await getStore();
      ls.register(makeDef({ name: "kills", periods: ["alltime", "daily"] }));
      ls.register(makeDef({ name: "coins", label: "Coins", periods: ["alltime"] }));

      ls.refreshAll();

      expect(stores.get("lb_kills_alltime")?.GetSortedAsync).toHaveBeenCalledTimes(1);
      expect(stores.get("lb_kills_daily_20260206")?.GetSortedAsync).toHaveBeenCalledTimes(1);
      expect(stores.get("lb_coins_alltime")?.GetSortedAsync).toHaveBeenCalledTimes(1);
    });
  });

  // ====================================================================
  // In-memory cache updates on submit
  // ====================================================================

  describe("cache updates on submitScore", () => {
    it("updates cache in-memory after score submission", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);
      store.data.set("200", 75);

      // Prime cache
      ls.getTopEntries("kills", "alltime");

      // Submit score that should change ranking
      ls.submitScore("kills", 100, "Player100", 80);

      // Cache should be updated without DataStore reload
      const result = ls.getTopEntries("kills", "alltime");
      expect(result.entries[0].score).toBe(80);
      expect(result.entries[0].userId).toBe(100);
      expect(result.entries[0].playerName).toBe("Player100");
    });

    it("adds new player to cached leaderboard", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 50);

      // Prime cache
      ls.getTopEntries("kills", "alltime");
      expect(ls.getTopEntries("kills", "alltime").entries).toHaveLength(1);

      // Submit new player
      ls.submitScore("kills", 200, "Player200", 30);

      const result = ls.getTopEntries("kills", "alltime");
      expect(result.entries).toHaveLength(2);
    });
  });

  // ====================================================================
  // Period DataStore naming
  // ====================================================================

  describe("period store naming", () => {
    it("uses correct store name for alltime", async () => {
      const ls = await getStore();
      ls.register(makeDef({ periods: ["alltime"] }));
      ls.submitScore("kills", 100, "P", 1);

      expect(stores.has("lb_kills_alltime")).toBe(true);
    });

    it("uses daily key with date suffix", async () => {
      const ls = await getStore();
      ls.register(makeDef({ periods: ["daily"] }));
      ls.submitScore("kills", 100, "P", 1);

      expect(stores.has("lb_kills_daily_20260206")).toBe(true);
    });

    it("uses weekly key with week suffix", async () => {
      const ls = await getStore();
      ls.register(makeDef({ periods: ["weekly"] }));
      ls.submitScore("kills", 100, "P", 1);

      expect(stores.has("lb_kills_weekly_2026W06")).toBe(true);
    });

    it("uses base name for seasonal", async () => {
      const ls = await getStore();
      ls.register(makeDef({ periods: ["seasonal"] }));
      ls.submitScore("kills", 100, "P", 1);

      expect(stores.has("lb_kills_seasonal")).toBe(true);
    });
  });

  // ====================================================================
  // Config
  // ====================================================================

  describe("config", () => {
    it("uses custom datastore prefix", async () => {
      const ls = await getStore({ datastorePrefix: "custom" });
      ls.register(makeDef());
      ls.submitScore("kills", 100, "P", 1);

      expect(stores.has("custom_kills_alltime")).toBe(true);
    });

    it("disables logging", async () => {
      const printFn = vi.fn();
      (globalThis as unknown as Record<string, unknown>).print = printFn;

      const ls = await getStore({ enableLogging: false });
      ls.register(makeDef());
      ls.submitScore("kills", 100, "P", 1);

      expect(printFn).not.toHaveBeenCalled();
    });
  });

  // ====================================================================
  // Edge cases
  // ====================================================================

  describe("edge cases", () => {
    it("handles empty leaderboard gracefully", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const result = ls.getTopEntries("kills", "alltime");
      expect(result.entries).toHaveLength(0);
    });

    it("handles non-numeric DataStore keys", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("not_a_number", 50);
      store.data.set("100", 75);

      const result = ls.getTopEntries("kills", "alltime");
      // Should skip invalid key
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].userId).toBe(100);
    });

    it("multiple submissions update rank correctly", async () => {
      const ls = await getStore();
      ls.register(makeDef());

      const store = getOrCreateStore("lb_kills_alltime");
      store.data.set("100", 10);
      store.data.set("200", 20);
      store.data.set("300", 30);
      ls.getTopEntries("kills", "alltime");

      // Player 100 overtakes everyone
      ls.submitScore("kills", 100, "Player100", 50);

      const rank = ls.getPlayerRank("kills", "alltime", 100);
      expect(rank.found).toBe(true);
      expect(rank.entry?.rank).toBe(1);
    });

    it("rejects NaN score", async () => {
      const ls = await getStore();
      ls.register(makeDef());
      const result = ls.submitScore("kills", 100, "Player100", NaN);
      expect(result.success).toBe(false);
      expect(result.status).toBe("ERROR");
    });

    it("rejects negative score", async () => {
      const ls = await getStore();
      ls.register(makeDef());
      const result = ls.submitScore("kills", 100, "Player100", -10);
      expect(result.success).toBe(false);
      expect(result.status).toBe("ERROR");
    });

    it("rejects Infinity score", async () => {
      const ls = await getStore();
      ls.register(makeDef());
      const result = ls.submitScore("kills", 100, "Player100", Infinity);
      expect(result.success).toBe(false);
      expect(result.status).toBe("ERROR");
    });

    it("rejects -Infinity score", async () => {
      const ls = await getStore();
      ls.register(makeDef());
      const result = ls.submitScore("kills", 100, "Player100", -Infinity);
      expect(result.success).toBe(false);
      expect(result.status).toBe("ERROR");
    });

    it("accepts zero score", async () => {
      const ls = await getStore();
      ls.register(makeDef());
      const result = ls.submitScore("kills", 100, "Player100", 0);
      expect(result.success).toBe(true);
    });
  });
});
