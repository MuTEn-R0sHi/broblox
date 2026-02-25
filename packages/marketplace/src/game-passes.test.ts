/**
 * Tests for GamePassCache
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Globals — GamePassCache uses os.time()
// ---------------------------------------------------------------------------

let mockTime = 1000;

function setupGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  g.os = { time: () => mockTime, clock: () => mockTime };
  g.pcall = <T>(fn: (...a: unknown[]) => T, ...args: unknown[]): [true, T] | [false, string] => {
    try {
      return [true, fn(...args)];
    } catch (e) {
      return [false, String(e)];
    }
  };
  g.tostring = (v: unknown) => String(v);
}

function teardownGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.os;
  delete g.pcall;
  delete g.tostring;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GamePassCache", () => {
  let GamePassCache: typeof import("./game-passes").GamePassCache;

  beforeEach(async () => {
    vi.resetModules();
    mockTime = 1000;
    setupGlobals();
    const mod = await import("./game-passes");
    GamePassCache = mod.GamePassCache;
  });

  afterEach(() => teardownGlobals());

  const TTL = 60;

  function makeCache() {
    return new GamePassCache(TTL);
  }

  // --------------------------------------------------------------------------
  // Pass registration
  // --------------------------------------------------------------------------

  it("registers and retrieves a pass", () => {
    const cache = makeCache();
    cache.registerPass({ passId: 1, name: "VIP" });
    expect(cache.getPass(1)?.name).toBe("VIP");
  });

  it("unregisters a pass", () => {
    const cache = makeCache();
    cache.registerPass({ passId: 1, name: "VIP" });
    cache.unregisterPass(1);
    expect(cache.getPass(1)).toBeUndefined();
  });

  it("getAllPasses returns all registered passes", () => {
    const cache = makeCache();
    cache.registerPass({ passId: 1, name: "VIP" });
    cache.registerPass({ passId: 2, name: "Ultra" });
    expect(cache.getAllPasses()).toHaveLength(2);
  });

  // --------------------------------------------------------------------------
  // Ownership: cache hit / miss
  // --------------------------------------------------------------------------

  it("returns false with fromCache=false when no fetcher and not cached", () => {
    const cache = makeCache();
    const result = cache.userOwnsGamePass(1, 100);
    expect(result.owned).toBe(false);
    expect(result.fromCache).toBe(false);
  });

  it("calls fetcher and caches result", () => {
    const cache = makeCache();
    const fetcher = vi.fn(() => true);
    cache.setFetcher(fetcher);

    const result = cache.userOwnsGamePass(1, 100);
    expect(result.owned).toBe(true);
    expect(result.fromCache).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();

    // Second call should be from cache
    const cached = cache.userOwnsGamePass(1, 100);
    expect(cached.owned).toBe(true);
    expect(cached.fromCache).toBe(true);
    expect(fetcher).toHaveBeenCalledOnce(); // no second call
  });

  it("re-fetches after TTL expires", () => {
    const cache = makeCache();
    const fetcher = vi.fn(() => true);
    cache.setFetcher(fetcher);

    cache.userOwnsGamePass(1, 100);
    expect(fetcher).toHaveBeenCalledOnce();

    // Advance time past TTL
    mockTime += TTL + 1;

    cache.userOwnsGamePass(1, 100);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("setOwned populates the cache", () => {
    const cache = makeCache();
    cache.setOwned(1, 100, true);
    const result = cache.userOwnsGamePass(1, 100, false);
    expect(result.owned).toBe(true);
    expect(result.fromCache).toBe(true);
  });

  it("skips fetch when fetchIfMissing is false", () => {
    const cache = makeCache();
    const fetcher = vi.fn(() => true);
    cache.setFetcher(fetcher);

    const result = cache.userOwnsGamePass(1, 100, false);
    expect(result.owned).toBe(false);
    expect(result.fromCache).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("caches false when fetcher returns false", () => {
    const cache = makeCache();
    cache.setFetcher(() => false);
    const result = cache.userOwnsGamePass(1, 100);
    expect(result.owned).toBe(false);
    const cached = cache.userOwnsGamePass(1, 100);
    expect(cached.fromCache).toBe(true);
    expect(cached.owned).toBe(false);
  });

  it("caches false when fetcher throws", () => {
    const cache = makeCache();
    cache.setFetcher(() => {
      throw new Error("API error");
    });
    const result = cache.userOwnsGamePass(1, 100);
    expect(result.owned).toBe(false);
  });

  // --------------------------------------------------------------------------
  // invalidatePlayer
  // --------------------------------------------------------------------------

  it("invalidatePlayer removes entries for that player", () => {
    const cache = makeCache();
    cache.setOwned(1, 100, true);
    cache.setOwned(1, 200, true);
    cache.setOwned(2, 100, true);

    expect(cache.cacheSize()).toBe(3);
    cache.invalidatePlayer(1);
    expect(cache.cacheSize()).toBe(1);

    // Player 2 entry is still there
    const result = cache.userOwnsGamePass(2, 100, false);
    expect(result.owned).toBe(true);
  });

  // --------------------------------------------------------------------------
  // clearAll
  // --------------------------------------------------------------------------

  it("clearAll empties the cache", () => {
    const cache = makeCache();
    cache.setOwned(1, 100, true);
    cache.setOwned(2, 200, false);
    cache.clearAll();
    expect(cache.cacheSize()).toBe(0);
  });
});
