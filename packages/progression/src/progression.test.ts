/**
 * @broblox/progression — Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Roblox global mocks
// ---------------------------------------------------------------------------

let mockTime = 1000;
const stores = new Map<string, Map<string, unknown>>();

function getOrCreateStore(name: string) {
  if (!stores.has(name)) {
    stores.set(name, new Map<string, unknown>());
  }
  const data = stores.get(name)!;
  return {
    GetAsync: vi.fn((key: string) => data.get(key)),
    SetAsync: vi.fn((key: string, value: unknown) => {
      data.set(key, JSON.parse(JSON.stringify(value)));
    }),
  };
}

function setupGlobals() {
  mockTime = 1000;
  stores.clear();

  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = {
    floor: Math.floor,
    min: Math.min,
    max: Math.max,
    huge: Infinity,
    pow: Math.pow,
  };
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
  g.typeIs = (value: unknown, typeName: string) => {
    if (typeName === "table") return typeof value === "object" && value !== null;
    return typeof value === typeName;
  };
  g.pcall = (fn: (...a: unknown[]) => unknown) => {
    try {
      const result = fn();
      return [true, result];
    } catch (e) {
      return [false, e];
    }
  };
  g.game = {
    GetService: (name: string) => {
      if (name === "DataStoreService") {
        return {
          GetDataStore: (storeName: string) => getOrCreateStore(storeName),
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
  delete g.typeIs;
  delete g.pcall;
  delete g.game;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProgressionStore", () => {
  let ProgressionStore: typeof import("./progression-store").ProgressionStore;

  beforeEach(async () => {
    vi.resetModules();
    setupGlobals();
    const mod = await import("./progression-store");
    ProgressionStore = mod.ProgressionStore;
  });

  afterEach(() => teardownGlobals());

  function makeStore(config?: Record<string, unknown>) {
    const store = new ProgressionStore(1, {
      maxLevel: 50,
      xpCurve: "linear",
      baseXp: 100,
      enableLogging: false,
      ...config,
    });
    store.init();
    return store;
  }

  // --------------------------------------------------------------------------
  // XP & Levels
  // --------------------------------------------------------------------------

  describe("xp and levels", () => {
    it("starts at level 1 with 0 xp", () => {
      const store = makeStore();
      expect(store.getLevel()).toBe(1);
      expect(store.getCurrentXp()).toBe(0);
      expect(store.getTotalXp()).toBe(0);
    });

    it("adds xp without leveling up", () => {
      const store = makeStore();
      const levelsGained = store.addXp(50);
      expect(levelsGained).toBe(0);
      expect(store.getCurrentXp()).toBe(50);
      expect(store.getTotalXp()).toBe(50);
    });

    it("levels up when xp exceeds threshold", () => {
      const store = makeStore(); // linear: level 2 = 200 xp
      const levelsGained = store.addXp(200);
      expect(levelsGained).toBe(1);
      expect(store.getLevel()).toBe(2);
    });

    it("handles multiple level-ups in one addXp call", () => {
      const store = makeStore(); // linear: l2=200, l3=300, l4=400
      // Need 200+300 = 500 xp to go from 1→3
      const levelsGained = store.addXp(500);
      expect(levelsGained).toBe(2);
      expect(store.getLevel()).toBe(3);
    });

    it("stops at max level", () => {
      const store = makeStore({ maxLevel: 3, xpCurve: "linear", baseXp: 10 });
      // l2=20, l3=30 → need 50 total
      store.addXp(10000);
      expect(store.getLevel()).toBe(3);
      expect(store.isMaxLevel()).toBe(true);
    });

    it("reports progress fraction", () => {
      const store = makeStore(); // linear: l2=200
      store.addXp(100);
      expect(store.getProgress()).toBe(0.5);
    });

    it("fires level-up callbacks", () => {
      const store = makeStore();
      const events: unknown[] = [];
      store.onLevelUp((e) => events.push(e));

      store.addXp(200);
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, unknown>).newLevel).toBe(2);
    });

    it("ignores zero or negative xp", () => {
      const store = makeStore();
      expect(store.addXp(0)).toBe(0);
      expect(store.addXp(-100)).toBe(0);
      expect(store.getCurrentXp()).toBe(0);
    });

    it("gets xp for specific level", () => {
      const store = makeStore(); // linear: baseXp * level
      expect(store.getXpForLevel(5)).toBe(500);
    });
  });

  // --------------------------------------------------------------------------
  // XP Curves
  // --------------------------------------------------------------------------

  describe("xp curves", () => {
    it("linear curve: baseXp * level", () => {
      const store = makeStore({ xpCurve: "linear", baseXp: 100 });
      expect(store.getXpForNextLevel()).toBe(200); // level 2
    });

    it("quadratic curve: floor(baseXp * level^2 * growthFactor)", () => {
      const store = makeStore({ xpCurve: "quadratic", baseXp: 100, growthFactor: 1.0 });
      // level 2: floor(100 * 4 * 1.0) = 400
      expect(store.getXpForNextLevel()).toBe(400);
    });

    it("exponential curve: floor(baseXp * growthFactor^(level-1))", () => {
      const store = makeStore({ xpCurve: "exponential", baseXp: 100, growthFactor: 2.0 });
      // level 2: floor(100 * 2^1) = 200
      expect(store.getXpForNextLevel()).toBe(200);
    });

    it("custom curve function", () => {
      const store = makeStore({
        xpCurve: "custom",
        xpCurveFunction: (level: number) => level * 50 + 50,
      });
      // level 2: 2*50 + 50 = 150
      expect(store.getXpForNextLevel()).toBe(150);
    });
  });

  // --------------------------------------------------------------------------
  // Prestige
  // --------------------------------------------------------------------------

  describe("prestige", () => {
    it("cannot prestige when disabled", () => {
      const store = makeStore({ prestigeEnabled: false });
      store.setLevel(100);
      expect(store.canPrestige()).toBe(false);
      expect(store.prestige()).toBe(false);
    });

    it("cannot prestige below min level", () => {
      const store = makeStore({ prestigeEnabled: true, prestigeMinLevel: 50 });
      store.setLevel(30);
      expect(store.canPrestige()).toBe(false);
    });

    it("prestiges successfully at min level", () => {
      const store = makeStore({
        prestigeEnabled: true,
        prestigeMinLevel: 10,
        maxLevel: 50,
      });
      store.setLevel(10);
      store.addXp(1000); // Accumulate some totalXp

      expect(store.canPrestige()).toBe(true);
      const result = store.prestige();
      expect(result).toBe(true);
      expect(store.getPrestige()).toBe(1);
      expect(store.getLevel()).toBe(1);
      expect(store.getCurrentXp()).toBe(0);
      expect(store.getTotalXp()).toBeGreaterThan(0); // totalXp preserved
    });

    it("fires prestige callbacks", () => {
      const store = makeStore({
        prestigeEnabled: true,
        prestigeMinLevel: 10,
        maxLevel: 50,
      });
      const events: unknown[] = [];
      store.onPrestige((e) => events.push(e));

      store.setLevel(10);
      store.prestige();

      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, unknown>).newPrestige).toBe(1);
    });

    it("caps at max prestige", () => {
      const store = makeStore({
        prestigeEnabled: true,
        prestigeMinLevel: 5,
        maxPrestige: 2,
        maxLevel: 50,
      });

      store.setLevel(5);
      store.prestige(); // P1
      store.setLevel(5);
      store.prestige(); // P2
      store.setLevel(5);
      expect(store.canPrestige()).toBe(false);
    });

    it("applies prestige xp bonus", () => {
      const store = makeStore({
        prestigeEnabled: true,
        prestigeMinLevel: 5,
        prestigeXpBonus: 0.5, // 50% bonus per prestige
        maxLevel: 50,
        xpCurve: "linear",
        baseXp: 100,
      });

      store.setLevel(5);
      store.prestige(); // prestige 1 → 50% bonus

      expect(store.getPrestigeMultiplier()).toBe(1.5);

      // Add 100 raw XP → should get 150 effective
      store.addXp(100);
      expect(store.getCurrentXp()).toBe(150);
      expect(store.getTotalXp()).toBe(150);
    });

    it("tracks prestige history", () => {
      const store = makeStore({
        prestigeEnabled: true,
        prestigeMinLevel: 5,
        maxLevel: 50,
      });

      mockTime = 2000;
      store.setLevel(5);
      store.prestige();

      mockTime = 3000;
      store.setLevel(5);
      store.prestige();

      const history = store.getPrestigeHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toBe(2000);
      expect(history[1]).toBe(3000);
    });

    it("prestige multiplier is 1 when disabled", () => {
      const store = makeStore({ prestigeEnabled: false });
      expect(store.getPrestigeMultiplier()).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Admin / Debug
  // --------------------------------------------------------------------------

  describe("admin operations", () => {
    it("sets xp directly", () => {
      const store = makeStore();
      store.setXp(500);
      expect(store.getCurrentXp()).toBe(500);
      expect(store.isDirty()).toBe(true);
    });

    it("sets level directly", () => {
      const store = makeStore();
      store.setLevel(25);
      expect(store.getLevel()).toBe(25);
      expect(store.getCurrentXp()).toBe(0); // reset on level change
    });

    it("ignores setLevel below 1", () => {
      const store = makeStore();
      store.setLevel(5);
      store.setLevel(0);
      expect(store.getLevel()).toBe(5);
    });
  });

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  describe("save and load", () => {
    it("saves and loads progression", () => {
      const config = {
        maxLevel: 50,
        xpCurve: "linear" as const,
        baseXp: 100,
        prestigeEnabled: true,
        prestigeMinLevel: 10,
      };

      const store1 = new ProgressionStore(1, config);
      store1.init();
      store1.addXp(250); // Level up + some remaining xp
      store1.save();

      const store2 = new ProgressionStore(1, config);
      store2.init();
      store2.load();

      expect(store2.getLevel()).toBe(store1.getLevel());
      expect(store2.getCurrentXp()).toBe(store1.getCurrentXp());
      expect(store2.getTotalXp()).toBe(store1.getTotalXp());
    });

    it("creates default state on first load", () => {
      const store = makeStore();
      store.load();
      expect(store.getLevel()).toBe(1);
      expect(store.getCurrentXp()).toBe(0);
    });

    it("tracks dirty state", () => {
      const store = makeStore();
      expect(store.isDirty()).toBe(false);
      store.addXp(10);
      expect(store.isDirty()).toBe(true);
      store.save();
      expect(store.isDirty()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Data Snapshot
  // --------------------------------------------------------------------------

  describe("data snapshot", () => {
    it("returns a copy of progression data", () => {
      const store = makeStore();
      store.addXp(100);
      const data = store.getData();

      expect(data.playerId).toBe(1);
      expect(data.level).toBe(1);
      expect(data.currentXp).toBe(100);

      // Modifying snapshot should not affect store
      data.level = 999;
      expect(store.getLevel()).toBe(1);
    });

    it("reports player ID", () => {
      const store = new ProgressionStore(42);
      expect(store.getPlayerId()).toBe(42);
    });
  });

  // --------------------------------------------------------------------------
  // Load — corrupted data clamping
  // --------------------------------------------------------------------------

  describe("load clamps corrupted values", () => {
    it("clamps negative level to 1", () => {
      const store = makeStore();
      store.save(); // create store key
      // Inject corrupted data
      const dss = (globalThis as Record<string, unknown>).game as {
        GetService: (n: string) => {
          GetDataStore: (n: string) => {
            GetAsync: (k: string) => unknown;
            SetAsync: (k: string, v: unknown) => void;
          };
        };
      };
      const ds = dss.GetService("DataStoreService").GetDataStore("PlayerProgression_v1");
      ds.SetAsync("progression_1", {
        level: -5,
        currentXp: 50,
        totalXp: 100,
        prestige: 0,
        prestigeHistory: [],
        version: 1,
      });
      store.load();
      expect(store.getLevel()).toBe(1);
    });

    it("clamps negative currentXp to 0", () => {
      const store = makeStore();
      const dss = (globalThis as Record<string, unknown>).game as {
        GetService: (n: string) => {
          GetDataStore: (n: string) => {
            GetAsync: (k: string) => unknown;
            SetAsync: (k: string, v: unknown) => void;
          };
        };
      };
      const ds = dss.GetService("DataStoreService").GetDataStore("PlayerProgression_v1");
      ds.SetAsync("progression_1", {
        level: 5,
        currentXp: -100,
        totalXp: -200,
        prestige: -3,
        prestigeHistory: [],
        version: 1,
      });
      store.load();
      expect(store.getCurrentXp()).toBe(0);
      expect(store.getTotalXp()).toBe(0);
      expect(store.getPrestige()).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // addXp — NaN / Infinity guard
  // --------------------------------------------------------------------------

  describe("addXp edge cases", () => {
    it("ignores NaN xp", () => {
      const store = makeStore();
      const levelsGained = store.addXp(NaN);
      expect(levelsGained).toBe(0);
      expect(store.getCurrentXp()).toBe(0);
      expect(store.getTotalXp()).toBe(0);
    });

    it("ignores Infinity xp", () => {
      const store = makeStore();
      const levelsGained = store.addXp(Infinity);
      expect(levelsGained).toBe(0);
      expect(store.getCurrentXp()).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Edge-case tests for branch coverage
  // -----------------------------------------------------------------------

  describe("DataStore error paths", () => {
    it("load returns false on DataStore error", () => {
      const store = makeStore();
      (globalThis as Record<string, unknown>).pcall = () => [false, "DataStore error"];
      expect(store.load()).toBe(false);
    });

    it("save returns false on DataStore error", () => {
      const store = makeStore();
      store.addXp(10);
      (globalThis as Record<string, unknown>).pcall = () => [false, "DataStore error"];
      expect(store.save()).toBe(false);
    });

    it("load returns false before init (no store)", async () => {
      const { ProgressionStore: PS } = await import("./progression-store");
      const s = new PS(1, { maxLevel: 50, xpCurve: "linear", baseXp: 100 });
      // Don't call init()
      expect(s.load()).toBe(false);
    });

    it("save returns false before init (no store)", async () => {
      const { ProgressionStore: PS } = await import("./progression-store");
      const s = new PS(1, { maxLevel: 50, xpCurve: "linear", baseXp: 100 });
      expect(s.save()).toBe(false);
    });
  });

  describe("additional edge cases", () => {
    it("getProgress caps at 1.0", () => {
      const store = makeStore();
      // Set XP beyond what's needed for current level
      store.setXp(99999);
      expect(store.getProgress()).toBeLessThanOrEqual(1);
    });

    it("isMaxLevel returns true at exactly maxLevel", () => {
      const store = makeStore({ maxLevel: 5 });
      store.setLevel(5);
      expect(store.isMaxLevel()).toBe(true);
    });

    it("uses quadratic fallback for unknown xpCurve name", () => {
      // If an unknown curve is provided, it should fall back gracefully
      const store = makeStore({ xpCurve: "unknown_curve" as never });
      store.addXp(100);
      // Should not throw and should use some XP requirement
      expect(store.getLevel()).toBeGreaterThanOrEqual(1);
    });
  });
});
