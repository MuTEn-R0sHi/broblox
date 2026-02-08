/**
 * @rbx/rewards — Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DailyRewardDay, AchievementDefinition } from "./types";

// ---------------------------------------------------------------------------
// Roblox global mocks
// ---------------------------------------------------------------------------

let mockTime = 100_000;
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
  mockTime = 100_000;
  stores.clear();

  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = {
    floor: Math.floor,
    min: Math.min,
    max: Math.max,
    huge: Infinity,
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
// Fixtures
// ---------------------------------------------------------------------------

function makeRewardCycle(): DailyRewardDay[] {
  return [
    { day: 1, rewards: [{ type: "currency", amount: 100 }] },
    { day: 2, rewards: [{ type: "currency", amount: 150 }] },
    { day: 3, rewards: [{ type: "currency", amount: 200 }] },
    { day: 4, rewards: [{ type: "xp", amount: 500 }] },
    { day: 5, rewards: [{ type: "currency", amount: 300 }] },
    { day: 6, rewards: [{ type: "item", amount: 1, itemId: "crate_01" }] },
    { day: 7, rewards: [{ type: "currency", amount: 1000 }], isBonus: true },
  ];
}

function makeAchievementDef(overrides?: Partial<AchievementDefinition>): AchievementDefinition {
  return {
    id: "ach_kills",
    name: "Slayer",
    description: "Kill 100 enemies",
    target: 100,
    rewards: [{ type: "currency", amount: 5000 }],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Daily Reward Store Tests
// ---------------------------------------------------------------------------

describe("DailyRewardStore", () => {
  let DailyRewardStore: typeof import("./daily-reward-store").DailyRewardStore;

  beforeEach(async () => {
    vi.resetModules();
    setupGlobals();
    const mod = await import("./daily-reward-store");
    DailyRewardStore = mod.DailyRewardStore;
  });

  afterEach(() => teardownGlobals());

  function makeStore(config?: Record<string, unknown>) {
    const store = new DailyRewardStore(1, makeRewardCycle(), {
      dayDuration: 86400,
      streakGracePeriod: 86400,
      cycleLength: 7,
      enableLogging: false,
      ...config,
    });
    store.init();
    return store;
  }

  describe("claiming", () => {
    it("can claim on first login", () => {
      const store = makeStore();
      expect(store.canClaim()).toBe(true);
    });

    it("throws when constructed with empty reward cycle", async () => {
      expect(() => new DailyRewardStore(1, [])).toThrow();
    });

    it("claims day 1 reward", () => {
      const store = makeStore();
      const day = store.claim();
      expect(day).toBeDefined();
      expect(day!.day).toBe(1);
      expect(day!.rewards[0].amount).toBe(100);
    });

    it("cannot claim twice in one day", () => {
      const store = makeStore();
      store.claim();
      expect(store.canClaim()).toBe(false);
      expect(store.claim()).toBeUndefined();
    });

    it("can claim again after day passes", () => {
      const store = makeStore();
      store.claim(); // Day 1

      mockTime += 86400; // Advance 24h
      expect(store.canClaim()).toBe(true);

      const day2 = store.claim();
      expect(day2).toBeDefined();
      expect(day2!.day).toBe(2);
    });

    it("increments streak on consecutive claims", () => {
      const store = makeStore();
      store.claim(); // Day 1 → streak 1

      mockTime += 86400;
      store.claim(); // Day 2 → streak 2

      mockTime += 86400;
      store.claim(); // Day 3 → streak 3

      expect(store.getStreak()).toBe(3);
      expect(store.getTotalDaysClaimed()).toBe(3);
    });

    it("resets streak after grace period expires", () => {
      const store = makeStore();
      store.claim(); // streak 1

      // Skip 2 full days (past grace period)
      mockTime += 86400 * 3;
      store.claim();

      expect(store.getStreak()).toBe(1); // Reset
      expect(store.getCycleDay()).toBe(2); // Cycle restarted at 1, then advanced
    });

    it("cycles through reward days", () => {
      const store = makeStore();

      for (let i = 0; i < 7; i++) {
        store.claim();
        mockTime += 86400;
      }

      // Cycle should wrap — cycleDay should be back to 1
      expect(store.getCycleDay()).toBe(1);
    });

    it("fires claimed callback", () => {
      const store = makeStore();
      const events: unknown[] = [];
      store.onClaimed((e) => events.push(e));

      store.claim();
      expect(events).toHaveLength(1);
      const e = events[0] as Record<string, unknown>;
      expect(e.day).toBe(1);
      expect(e.streak).toBe(1);
    });

    it("tracks total days claimed", () => {
      const store = makeStore();
      store.claim();
      mockTime += 86400;
      store.claim();
      expect(store.getTotalDaysClaimed()).toBe(2);
    });
  });

  describe("time queries", () => {
    it("returns 0 time until next claim on first login", () => {
      const store = makeStore();
      expect(store.getTimeUntilNextClaim()).toBe(0);
    });

    it("returns remaining time after claiming", () => {
      const store = makeStore();
      store.claim();
      expect(store.getTimeUntilNextClaim()).toBe(86400);

      mockTime += 3600; // 1 hour later
      expect(store.getTimeUntilNextClaim()).toBe(86400 - 3600);
    });
  });

  describe("save and load", () => {
    it("saves and loads daily data", () => {
      const cycle = makeRewardCycle();
      const s1 = new DailyRewardStore(1, cycle);
      s1.init();
      s1.claim();
      s1.save();

      const s2 = new DailyRewardStore(1, cycle);
      s2.init();
      s2.load();

      expect(s2.getStreak()).toBe(1);
      expect(s2.getTotalDaysClaimed()).toBe(1);
    });

    it("tracks dirty state", () => {
      const store = makeStore();
      expect(store.isDirty()).toBe(false);
      store.claim();
      expect(store.isDirty()).toBe(true);
      store.save();
      expect(store.isDirty()).toBe(false);
    });
  });

  describe("data snapshot", () => {
    it("returns data copy", () => {
      const store = makeStore();
      store.claim();
      const data = store.getData();
      expect(data.playerId).toBe(1);
      expect(data.streak).toBe(1);
    });

    it("reports player ID", () => {
      const store = makeStore();
      expect(store.getPlayerId()).toBe(1);
    });
  });

  describe("corrupt data sanitisation", () => {
    it("clamps cycleDay=0 from corrupted save to 1", () => {
      const cycle = makeRewardCycle();
      const store = new DailyRewardStore(1, cycle);
      store.init();

      // Simulate corrupted data with cycleDay=0 being loaded from DataStore
      const dsStore = (globalThis as unknown as Record<string, unknown>).game as {
        GetService: (name: string) => {
          GetDataStore: (name: string) => {
            GetAsync: (key: string) => unknown;
            SetAsync: (key: string, value: unknown) => void;
          };
        };
      };
      const ds = dsStore.GetService("DataStoreService").GetDataStore("DailyRewards_v1");
      ds.SetAsync("daily_1", {
        streak: 0,
        cycleDay: 0, // corrupted — should be >= 1
        lastClaimTime: 0,
        totalDaysClaimed: 0,
        version: 1,
      });

      store.load();
      expect(store.getCycleDay()).toBe(1); // sanitised to 1
    });

    it("clamps negative streak from corrupted save to 0", () => {
      const cycle = makeRewardCycle();
      const store = new DailyRewardStore(1, cycle);
      store.init();

      const dsStore = (globalThis as unknown as Record<string, unknown>).game as {
        GetService: (name: string) => {
          GetDataStore: (name: string) => {
            GetAsync: (key: string) => unknown;
            SetAsync: (key: string, value: unknown) => void;
          };
        };
      };
      const ds = dsStore.GetService("DataStoreService").GetDataStore("DailyRewards_v1");
      ds.SetAsync("daily_1", {
        streak: -5, // corrupted
        cycleDay: 3,
        lastClaimTime: 0,
        totalDaysClaimed: -2, // corrupted
        version: 1,
      });

      store.load();
      expect(store.getStreak()).toBe(0); // sanitised
      expect(store.getCycleDay()).toBe(3); // valid — unchanged
      expect(store.getTotalDaysClaimed()).toBe(0); // sanitised
    });
  });
});

// ---------------------------------------------------------------------------
// Achievement Store Tests
// ---------------------------------------------------------------------------

describe("AchievementStore", () => {
  let AchievementStore: typeof import("./achievement-store").AchievementStore;

  beforeEach(async () => {
    vi.resetModules();
    setupGlobals();
    const mod = await import("./achievement-store");
    AchievementStore = mod.AchievementStore;
  });

  afterEach(() => teardownGlobals());

  function makeStore(defs?: AchievementDefinition[]) {
    const store = new AchievementStore(1, { enableLogging: false });
    store.init();
    for (const d of defs ?? [makeAchievementDef()]) {
      store.registerAchievement(d);
    }
    return store;
  }

  describe("registration", () => {
    it("registers and retrieves definitions", () => {
      const store = makeStore();
      expect(store.getDefinition("ach_kills")).toBeDefined();
      expect(store.definitionCount()).toBe(1);
    });

    it("registers multiple definitions", () => {
      const store = new AchievementStore(1);
      store.init();
      store.registerAll([makeAchievementDef({ id: "a1" }), makeAchievementDef({ id: "a2" })]);
      expect(store.definitionCount()).toBe(2);
    });
  });

  describe("progress", () => {
    it("increments achievement progress", () => {
      const store = makeStore();
      store.incrementProgress("ach_kills", 10);
      const prog = store.getProgress("ach_kills");
      expect(prog).toBeDefined();
      expect(prog!.current).toBe(10);
      expect(prog!.completed).toBe(false);
    });

    it("completes achievement at target", () => {
      const store = makeStore();
      const completed = store.incrementProgress("ach_kills", 100);
      expect(completed).toBe(true);
      expect(store.isCompleted("ach_kills")).toBe(true);
    });

    it("caps progress at target", () => {
      const store = makeStore();
      store.incrementProgress("ach_kills", 999);
      expect(store.getProgress("ach_kills")!.current).toBe(100);
    });

    it("ignores further increments after completion", () => {
      const store = makeStore();
      store.incrementProgress("ach_kills", 100);
      const result = store.incrementProgress("ach_kills", 50);
      expect(result).toBe(false);
    });

    it("sets progress directly", () => {
      const store = makeStore();
      store.setProgress("ach_kills", 75);
      expect(store.getProgress("ach_kills")!.current).toBe(75);
    });

    it("completes via setProgress", () => {
      const store = makeStore();
      const completed = store.setProgress("ach_kills", 100);
      expect(completed).toBe(true);
      expect(store.isCompleted("ach_kills")).toBe(true);
    });

    it("fires completed callback", () => {
      const store = makeStore();
      const events: unknown[] = [];
      store.onAchievementCompleted((e) => events.push(e));

      store.incrementProgress("ach_kills", 100);
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, unknown>).achievementId).toBe("ach_kills");
    });

    it("returns false for unknown achievement", () => {
      const store = makeStore();
      expect(store.incrementProgress("nonexistent", 10)).toBe(false);
    });

    it("rejects negative amount in incrementProgress", () => {
      const store = makeStore();
      expect(store.incrementProgress("ach_kills", -5)).toBe(false);
      expect(store.getProgress("ach_kills")).toBeUndefined();
    });

    it("rejects zero amount in incrementProgress", () => {
      const store = makeStore();
      expect(store.incrementProgress("ach_kills", 0)).toBe(false);
    });

    it("rejects negative value in setProgress", () => {
      const store = makeStore();
      expect(store.setProgress("ach_kills", -10)).toBe(false);
      expect(store.getProgress("ach_kills")).toBeUndefined();
    });
  });

  describe("queries", () => {
    it("returns completed IDs", () => {
      const store = makeStore([
        makeAchievementDef({ id: "a1", target: 10 }),
        makeAchievementDef({ id: "a2", target: 10 }),
      ]);
      store.incrementProgress("a1", 10);
      expect(store.getCompletedIds()).toContain("a1");
      expect(store.getCompletedIds()).not.toContain("a2");
    });

    it("returns completion fraction", () => {
      const store = makeStore();
      store.incrementProgress("ach_kills", 50);
      expect(store.getCompletionFraction("ach_kills")).toBe(0.5);
    });

    it("returns 0 fraction for unknown", () => {
      const store = makeStore();
      expect(store.getCompletionFraction("nonexistent")).toBe(0);
    });

    it("returns 1 fraction for completed achievement", () => {
      const store = makeStore();
      store.incrementProgress("ach_kills", 100);
      expect(store.getCompletionFraction("ach_kills")).toBe(1);
    });

    it("counts completed achievements", () => {
      const store = makeStore([
        makeAchievementDef({ id: "a1", target: 1 }),
        makeAchievementDef({ id: "a2", target: 1 }),
      ]);
      store.incrementProgress("a1", 1);
      expect(store.completedCount()).toBe(1);
    });

    it("returns all progress entries", () => {
      const store = makeStore([
        makeAchievementDef({ id: "a1", target: 10 }),
        makeAchievementDef({ id: "a2", target: 10 }),
      ]);
      store.incrementProgress("a1", 5);
      store.incrementProgress("a2", 3);
      expect(store.getAllProgress()).toHaveLength(2);
    });

    it("reports player ID", () => {
      const store = makeStore();
      expect(store.getPlayerId()).toBe(1);
    });
  });

  describe("save and load", () => {
    it("saves and loads achievements", () => {
      const s1 = new AchievementStore(1);
      s1.init();
      s1.registerAchievement(makeAchievementDef());
      s1.incrementProgress("ach_kills", 42);
      s1.save();

      const s2 = new AchievementStore(1);
      s2.init();
      s2.registerAchievement(makeAchievementDef());
      s2.load();

      expect(s2.getProgress("ach_kills")!.current).toBe(42);
    });

    it("tracks dirty state", () => {
      const store = makeStore();
      expect(store.isDirty()).toBe(false);
      store.incrementProgress("ach_kills", 1);
      expect(store.isDirty()).toBe(true);
      store.save();
      expect(store.isDirty()).toBe(false);
    });
  });

  describe("data snapshot", () => {
    it("returns data copy", () => {
      const store = makeStore();
      store.incrementProgress("ach_kills", 20);
      const data = store.getData();
      expect(data.playerId).toBe(1);
      expect(data.achievements).toHaveLength(1);
      expect(data.achievements[0].current).toBe(20);
    });
  });
});
