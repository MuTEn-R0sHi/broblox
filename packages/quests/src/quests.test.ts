/**
 * @rbx/quests — Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { QuestDefinition } from "./types";

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

function makeKillQuest(overrides?: Partial<QuestDefinition>): QuestDefinition {
  return {
    id: "quest_kill_10",
    name: "Eliminate 10 Enemies",
    description: "Defeat 10 enemies in any area.",
    schedule: "daily",
    tier: "common",
    objectives: [{ id: "obj_kill", description: "Kill enemies", type: "kill", target: 10 }],
    xpReward: 500,
    currencyReward: 100,
    ...overrides,
  };
}

function makeMultiObjQuest(): QuestDefinition {
  return {
    id: "quest_multi",
    name: "Adventure Time",
    description: "Complete multiple objectives.",
    schedule: "weekly",
    tier: "rare",
    objectives: [
      { id: "obj_kill", description: "Kill 5 enemies", type: "kill", target: 5 },
      { id: "obj_collect", description: "Collect 3 gems", type: "collect", target: 3 },
    ],
    xpReward: 1000,
    currencyReward: 250,
    itemRewards: ["sword_01"],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("QuestRegistry", () => {
  let QuestRegistry: typeof import("./quest-registry").QuestRegistry;

  beforeEach(async () => {
    vi.resetModules();
    setupGlobals();
    const mod = await import("./quest-registry");
    QuestRegistry = mod.QuestRegistry;
  });

  afterEach(() => teardownGlobals());

  it("registers and retrieves quests", () => {
    const reg = new QuestRegistry();
    const q = makeKillQuest();
    reg.register(q);
    expect(reg.get(q.id)).toEqual(q);
    expect(reg.has(q.id)).toBe(true);
    expect(reg.count()).toBe(1);
  });

  it("unregisters quests", () => {
    const reg = new QuestRegistry();
    reg.register(makeKillQuest());
    expect(reg.unregister("quest_kill_10")).toBe(true);
    expect(reg.has("quest_kill_10")).toBe(false);
    expect(reg.count()).toBe(0);
  });

  it("returns all quests", () => {
    const reg = new QuestRegistry();
    reg.register(makeKillQuest());
    reg.register(makeMultiObjQuest());
    expect(reg.getAll()).toHaveLength(2);
  });

  it("filters by schedule", () => {
    const reg = new QuestRegistry();
    reg.register(makeKillQuest({ schedule: "daily" }));
    reg.register(makeKillQuest({ id: "q2", schedule: "weekly" }));
    expect(reg.getBySchedule("daily")).toHaveLength(1);
  });

  it("filters by tier", () => {
    const reg = new QuestRegistry();
    reg.register(makeKillQuest({ tier: "common" }));
    reg.register(makeMultiObjQuest()); // rare
    expect(reg.getByTier("rare")).toHaveLength(1);
  });

  it("filters by tag", () => {
    const reg = new QuestRegistry();
    reg.register(makeKillQuest({ tags: ["combat", "daily"] }));
    reg.register(makeMultiObjQuest());
    expect(reg.getByTag("combat")).toHaveLength(1);
  });

  it("filters by level range", () => {
    const reg = new QuestRegistry();
    reg.register(makeKillQuest({ minLevel: 5, maxLevel: 15 }));
    reg.register(makeKillQuest({ id: "q2", minLevel: 20 }));
    expect(reg.getAvailableForLevel(10)).toHaveLength(1);
    expect(reg.getAvailableForLevel(25)).toHaveLength(1);
  });

  it("clears all quests", () => {
    const reg = new QuestRegistry();
    reg.register(makeKillQuest());
    reg.clear();
    expect(reg.count()).toBe(0);
  });
});

describe("QuestStore", () => {
  let QuestRegistry: typeof import("./quest-registry").QuestRegistry;
  let QuestStore: typeof import("./quest-store").QuestStore;

  beforeEach(async () => {
    vi.resetModules();
    setupGlobals();
    const regMod = await import("./quest-registry");
    const storeMod = await import("./quest-store");
    QuestRegistry = regMod.QuestRegistry;
    QuestStore = storeMod.QuestStore;
  });

  afterEach(() => teardownGlobals());

  function makeStore(quests?: QuestDefinition[]) {
    const reg = new QuestRegistry();
    for (const q of quests ?? [makeKillQuest(), makeMultiObjQuest()]) {
      reg.register(q);
    }
    const store = new QuestStore(1, reg, { enableLogging: false });
    store.init();
    return { store, registry: reg };
  }

  // --------------------------------------------------------------------------
  // Accepting Quests
  // --------------------------------------------------------------------------

  describe("accepting quests", () => {
    it("accepts a quest", () => {
      const { store } = makeStore();
      expect(store.acceptQuest("quest_kill_10")).toBe(true);
      expect(store.activeCount()).toBe(1);
    });

    it("rejects unknown quest", () => {
      const { store } = makeStore();
      expect(store.acceptQuest("nonexistent")).toBe(false);
    });

    it("rejects duplicate active quest", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      expect(store.acceptQuest("quest_kill_10")).toBe(false);
    });

    it("rejects when max active reached", () => {
      const quests: QuestDefinition[] = [];
      for (let i = 0; i < 5; i++) {
        quests.push(makeKillQuest({ id: `q_${i}` }));
      }
      const { store } = makeStore(quests);
      // Override maxActiveQuests to 3
      const s2 = new QuestStore(1, makeStore(quests).registry, { maxActiveQuests: 3 });
      s2.init();
      s2.acceptQuest("q_0");
      s2.acceptQuest("q_1");
      s2.acceptQuest("q_2");
      expect(s2.acceptQuest("q_3")).toBe(false);
    });

    it("fires accepted callback", () => {
      const { store } = makeStore();
      const events: unknown[] = [];
      store.onQuestAccepted((e) => events.push(e));
      store.acceptQuest("quest_kill_10");
      expect(events).toHaveLength(1);
      expect((events[0] as Record<string, unknown>).questId).toBe("quest_kill_10");
    });

    it("checks prerequisites", () => {
      const q1 = makeKillQuest({ id: "prereq_quest", schedule: "once" });
      const q2 = makeKillQuest({ id: "main_quest", prerequisites: ["prereq_quest"] });
      const { store } = makeStore([q1, q2]);

      // Cannot accept main without completing prereq
      expect(store.acceptQuest("main_quest")).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Objective Progress
  // --------------------------------------------------------------------------

  describe("objective progress", () => {
    it("increments objective progress", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      const updated = store.incrementObjective("kill", 3);
      expect(updated).toBe(1);

      const quest = store.getActiveQuest("quest_kill_10")!;
      expect(quest.objectives[0].current).toBe(3);
    });

    it("caps progress at target", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      store.incrementObjective("kill", 999);

      const quest = store.getActiveQuest("quest_kill_10")!;
      expect(quest.objectives[0].current).toBe(10);
      expect(quest.objectives[0].completed).toBe(true);
    });

    it("auto-completes quest when all objectives done", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");

      const completedEvents: unknown[] = [];
      store.onQuestCompleted((e) => completedEvents.push(e));

      store.incrementObjective("kill", 10);

      expect(completedEvents).toHaveLength(1);
      expect(store.isCompleted("quest_kill_10")).toBe(true);
    });

    it("updates multiple quests at once", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      store.acceptQuest("quest_multi"); // also has a kill objective

      const updated = store.incrementObjective("kill", 2);
      expect(updated).toBe(2);
    });

    it("fires progress callbacks", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");

      const events: unknown[] = [];
      store.onObjectiveProgress((e) => events.push(e));

      store.incrementObjective("kill", 1);
      expect(events).toHaveLength(1);
    });

    it("sets objective progress directly", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      store.setObjectiveProgress("quest_kill_10", "obj_kill", 7);

      const quest = store.getActiveQuest("quest_kill_10")!;
      expect(quest.objectives[0].current).toBe(7);
    });

    it("ignores wrong objective types", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      const updated = store.incrementObjective("collect", 5);
      expect(updated).toBe(0);
    });

    it("handles multi-objective quests", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_multi");

      store.incrementObjective("kill", 5);
      store.incrementObjective("collect", 3);

      expect(store.isCompleted("quest_multi")).toBe(true);
    });

    it("respects metadata matching", () => {
      const q = makeKillQuest({
        id: "q_meta",
        objectives: [
          {
            id: "obj1",
            description: "Kill zombies",
            type: "kill",
            target: 5,
            metadata: { enemy: "zombie" },
          },
        ],
      });
      const { store } = makeStore([q]);
      store.acceptQuest("q_meta");

      // Wrong metadata — should not match
      store.incrementObjective("kill", 3, { enemy: "skeleton" });
      expect(store.getActiveQuest("q_meta")!.objectives[0].current).toBe(0);

      // Correct metadata
      store.incrementObjective("kill", 3, { enemy: "zombie" });
      expect(store.getActiveQuest("q_meta")!.objectives[0].current).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // Quest Completion / Failure / Abandon
  // --------------------------------------------------------------------------

  describe("completion, failure, and abandon", () => {
    it("reports quest progress fraction", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_multi");
      store.incrementObjective("kill", 5); // 1 of 2 objectives
      expect(store.getQuestProgress("quest_multi")).toBe(0.5);
    });

    it("fails a quest", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      expect(store.failQuest("quest_kill_10")).toBe(true);

      const quest = store.getActiveQuest("quest_kill_10")!;
      expect(quest.status).toBe("failed");
    });

    it("abandons a quest", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      expect(store.abandonQuest("quest_kill_10")).toBe(true);
      expect(store.getActiveQuest("quest_kill_10")).toBeUndefined();
    });

    it("returns rewards on completion", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_multi");

      let reward: Record<string, unknown> = {};
      store.onQuestCompleted((e) => {
        reward = e as unknown as Record<string, unknown>;
      });

      store.incrementObjective("kill", 5);
      store.incrementObjective("collect", 3);

      expect(reward.xpReward).toBe(1000);
      expect(reward.currencyReward).toBe(250);
      expect(reward.itemRewards).toEqual(["sword_01"]);
    });

    it("prevents re-accepting once-only completed quest", () => {
      const q = makeKillQuest({ id: "q_once", schedule: "once" });
      const { store } = makeStore([q]);
      store.acceptQuest("q_once");
      store.incrementObjective("kill", 10);
      expect(store.isCompleted("q_once")).toBe(true);
      expect(store.acceptQuest("q_once")).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  describe("queries", () => {
    it("returns active quests only", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      store.acceptQuest("quest_multi");
      store.failQuest("quest_kill_10");

      const active = store.getActiveQuests();
      expect(active).toHaveLength(1);
      expect(active[0].questId).toBe("quest_multi");
    });

    it("returns completed quest IDs", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      store.incrementObjective("kill", 10);
      expect(store.getCompletedQuestIds()).toContain("quest_kill_10");
    });

    it("returns 0 progress for unknown quest", () => {
      const { store } = makeStore();
      expect(store.getQuestProgress("nonexistent")).toBe(0);
    });

    it("returns player ID", () => {
      const { store } = makeStore();
      expect(store.getPlayerId()).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  describe("save and load", () => {
    it("saves and loads quest data", () => {
      const reg = new QuestRegistry();
      reg.register(makeKillQuest());

      const s1 = new QuestStore(1, reg);
      s1.init();
      s1.acceptQuest("quest_kill_10");
      s1.incrementObjective("kill", 5);
      s1.save();

      const s2 = new QuestStore(1, reg);
      s2.init();
      s2.load();

      const quest = s2.getActiveQuest("quest_kill_10")!;
      expect(quest).toBeDefined();
      expect(quest.objectives[0].current).toBe(5);
    });

    it("tracks dirty state", () => {
      const { store } = makeStore();
      expect(store.isDirty()).toBe(false);
      store.acceptQuest("quest_kill_10");
      expect(store.isDirty()).toBe(true);
      store.save();
      expect(store.isDirty()).toBe(false);
    });

    it("returns default data on empty load", () => {
      const { store } = makeStore();
      store.load();
      expect(store.activeCount()).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Data Snapshot
  // --------------------------------------------------------------------------

  describe("data snapshot", () => {
    it("returns data with player ID", () => {
      const { store } = makeStore();
      store.acceptQuest("quest_kill_10");
      const data = store.getData();
      expect(data.playerId).toBe(1);
      expect(data.activeQuests).toHaveLength(1);
    });
  });
});
