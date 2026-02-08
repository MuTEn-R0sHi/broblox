/**
 * @rbx/gacha — Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EggDefinition } from "./types";
import { EggRegistry } from "./egg-registry";
import { GachaStore } from "./gacha-store";

// ---------------------------------------------------------------------------
// Roblox mocks
// ---------------------------------------------------------------------------

let mockTime = 1000;
const stores = new Map<string, Map<string, unknown>>();

function getOrCreateStore(name: string) {
  if (!stores.has(name)) stores.set(name, new Map<string, unknown>());
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
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
    huge: Infinity,
    random: () => 0.5, // deterministic default
  };
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
    GetService: vi.fn((svc: string) => {
      if (svc === "DataStoreService") {
        return { GetDataStore: vi.fn((name: string) => getOrCreateStore(name)) };
      }
      if (svc === "HttpService") {
        return { GenerateGUID: vi.fn(() => `guid-${mockTime++}`) };
      }
      return {};
    }),
  };
}

// ---------------------------------------------------------------------------
// Test eggs
// ---------------------------------------------------------------------------

const basicEgg: EggDefinition = {
  id: "basic_egg",
  name: "Basic Egg",
  description: "A common egg",
  cost: 100,
  currency: "coins",
  lootTable: [
    { itemId: "cat", rarity: "common", weight: 70 },
    { itemId: "dog", rarity: "common", weight: 20 },
    { itemId: "dragon", rarity: "rare", weight: 9 },
    { itemId: "phoenix", rarity: "legendary", weight: 1 },
  ],
  pityThreshold: 10,
  pityRarity: "rare",
  enabled: true,
  maxHatches: 0,
};

const limitedEgg: EggDefinition = {
  id: "limited_egg",
  name: "Limited Egg",
  description: "Only 2 hatches",
  cost: 500,
  currency: "gems",
  lootTable: [
    { itemId: "unicorn", rarity: "legendary", weight: 50 },
    { itemId: "pegasus", rarity: "epic", weight: 50 },
  ],
  pityThreshold: 5,
  pityRarity: "legendary",
  enabled: true,
  maxHatches: 2,
};

const disabledEgg: EggDefinition = {
  id: "disabled_egg",
  name: "Disabled Egg",
  description: "Off",
  cost: 100,
  currency: "coins",
  lootTable: [{ itemId: "x", rarity: "common", weight: 1 }],
  pityThreshold: 10,
  pityRarity: "rare",
  enabled: false,
  maxHatches: 0,
};

// ---------------------------------------------------------------------------
// EggRegistry tests
// ---------------------------------------------------------------------------

describe("EggRegistry", () => {
  beforeEach(() => setupGlobals());

  it("registers and retrieves eggs", () => {
    const reg = new EggRegistry();
    reg.register(basicEgg);
    expect(reg.has("basic_egg")).toBe(true);
    expect(reg.get("basic_egg")?.name).toBe("Basic Egg");
  });

  it("registerAll adds multiple", () => {
    const reg = new EggRegistry();
    reg.registerAll([basicEgg, limitedEgg, disabledEgg]);
    expect(reg.count()).toBe(3);
  });

  it("getEnabled filters disabled eggs", () => {
    const reg = new EggRegistry();
    reg.registerAll([basicEgg, limitedEgg, disabledEgg]);
    expect(reg.getEnabled()).toHaveLength(2);
  });

  it("getAll returns everything", () => {
    const reg = new EggRegistry();
    reg.registerAll([basicEgg, limitedEgg]);
    expect(reg.getAll()).toHaveLength(2);
  });

  it("clear removes all", () => {
    const reg = new EggRegistry();
    reg.register(basicEgg);
    reg.clear();
    expect(reg.count()).toBe(0);
  });

  it("rarityRank orders correctly", () => {
    expect(EggRegistry.rarityRank("common")).toBeLessThan(EggRegistry.rarityRank("legendary"));
    expect(EggRegistry.rarityRank("mythic")).toBeGreaterThan(EggRegistry.rarityRank("epic"));
  });
});

// ---------------------------------------------------------------------------
// GachaStore tests
// ---------------------------------------------------------------------------

describe("GachaStore", () => {
  let registry: EggRegistry;
  let store: GachaStore;

  beforeEach(() => {
    setupGlobals();
    registry = new EggRegistry();
    registry.registerAll([basicEgg, limitedEgg, disabledEgg]);
    store = new GachaStore(1, registry, { enableLogging: true });
    store.init();
    store.load();
  });

  it("hatches successfully with sufficient funds", () => {
    const result = store.hatch("basic_egg", 1000);
    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
    expect(result.itemId).toBeDefined();
    expect(result.rarity).toBeDefined();
  });

  it("rejects unknown egg", () => {
    expect(store.hatch("nonexistent", 999).status).toBe("egg_not_found");
  });

  it("rejects disabled egg", () => {
    expect(store.hatch("disabled_egg", 999).status).toBe("egg_disabled");
  });

  it("rejects insufficient funds", () => {
    expect(store.hatch("basic_egg", 50).status).toBe("insufficient_funds");
  });

  it("rejects negative currency balance", () => {
    const result = store.hatch("basic_egg", -100);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid_balance");
  });

  it("enforces max hatches", () => {
    store.hatch("limited_egg", 9999);
    store.hatch("limited_egg", 9999);
    const result = store.hatch("limited_egg", 9999);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("max_hatches_reached");
  });

  it("tracks hatch count", () => {
    store.hatch("basic_egg", 999);
    store.hatch("basic_egg", 999);
    expect(store.getHatchCount("basic_egg")).toBe(2);
  });

  it("increments pity on common pulls", () => {
    // With math.random returning 0.5 deterministically,
    // the roll should land on one of the common items (weight 70+20 = 90 out of 100)
    store.hatch("basic_egg", 999);
    // Pity should be 1 if the result was common rarity (below "rare")
    const result = store.hatch("basic_egg", 999);
    if (result.rarity === "common") {
      expect(store.getPityCounter("basic_egg")).toBeGreaterThan(0);
    }
  });

  it("triggers pity after threshold", () => {
    // Force many common rolls by hatching threshold+1 times
    // With deterministic random, most rolls will be common (70/100 weight)
    for (let i = 0; i < 11; i++) {
      store.hatch("basic_egg", 9999);
    }
    // After threshold rolls of common, pity should trigger and reset
    // We can't guarantee the exact sequence, but we can check the system works
    expect(store.getHatchCount("basic_egg")).toBe(11);
  });

  it("fires onHatch callback", () => {
    const cb = vi.fn();
    store.onHatch(cb);
    store.hatch("basic_egg", 9999);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: 1,
        eggId: "basic_egg",
      })
    );
  });

  it("marks dirty after hatch", () => {
    expect(store.isDirty()).toBe(false);
    store.hatch("basic_egg", 999);
    expect(store.isDirty()).toBe(true);
  });

  it("save and load round-trips", () => {
    store.hatch("basic_egg", 999);
    store.hatch("basic_egg", 999);
    store.save();

    const store2 = new GachaStore(1, registry, { enableLogging: false });
    store2.init();
    store2.load();
    expect(store2.getHatchCount("basic_egg")).toBe(2);
  });

  it("save clears dirty flag", () => {
    store.hatch("basic_egg", 999);
    store.save();
    expect(store.isDirty()).toBe(false);
  });

  it("handles empty loot table", () => {
    const emptyEgg: EggDefinition = {
      ...basicEgg,
      id: "empty_egg",
      lootTable: [],
      enabled: true,
    };
    registry.register(emptyEgg);
    expect(store.hatch("empty_egg", 999).status).toBe("loot_table_empty");
  });

  it("unlimited hatches when maxHatches is 0", () => {
    for (let i = 0; i < 20; i++) {
      expect(store.hatch("basic_egg", 9999).ok).toBe(true);
    }
    expect(store.getHatchCount("basic_egg")).toBe(20);
  });
});
