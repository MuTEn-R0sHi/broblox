/**
 * @rbx/inventory — Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Roblox global mocks
// ---------------------------------------------------------------------------

let mockTime = 1000;
let idCounter = 0;
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
    UpdateAsync: vi.fn((key: string, callback: (old: unknown) => unknown) => {
      const old = data.get(key);
      const updated = callback(old);
      data.set(key, JSON.parse(JSON.stringify(updated)));
      return updated;
    }),
  };
}

function setupGlobals() {
  mockTime = 1000;
  idCounter = 0;
  stores.clear();

  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = {
    floor: Math.floor,
    min: Math.min,
    max: Math.max,
    huge: Infinity,
    random: () => {
      idCounter++;
      return idCounter / 100000;
    },
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
      if (name === "HttpService") {
        return {
          GenerateGUID: (wrap?: boolean) => {
            idCounter++;
            const id = `test-uuid-${idCounter}`;
            return wrap ? `{${id}}` : id;
          },
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

describe("ItemRegistry", () => {
  beforeEach(() => {
    vi.resetModules();
    setupGlobals();
  });

  afterEach(() => teardownGlobals());

  it("registers and retrieves item definitions", async () => {
    const { ItemRegistry } = await import("./item-registry");
    const registry = new ItemRegistry();

    registry.register({
      id: "iron_sword",
      name: "Iron Sword",
      category: "weapon",
      rarity: "common",
      maxStack: 1,
    });

    expect(registry.has("iron_sword")).toBe(true);
    expect(registry.get("iron_sword")?.name).toBe("Iron Sword");
    expect(registry.count()).toBe(1);
  });

  it("registers multiple items", async () => {
    const { ItemRegistry } = await import("./item-registry");
    const registry = new ItemRegistry();

    registry.registerAll([
      { id: "wood", name: "Wood", category: "material", rarity: "common", maxStack: 64 },
      { id: "stone", name: "Stone", category: "material", rarity: "common", maxStack: 64 },
      { id: "diamond", name: "Diamond", category: "material", rarity: "legendary", maxStack: 16 },
    ]);

    expect(registry.count()).toBe(3);
  });

  it("filters by category", async () => {
    const { ItemRegistry } = await import("./item-registry");
    const registry = new ItemRegistry();

    registry.registerAll([
      { id: "sword", name: "Sword", category: "weapon", rarity: "common", maxStack: 1 },
      { id: "wood", name: "Wood", category: "material", rarity: "common", maxStack: 64 },
      { id: "shield", name: "Shield", category: "armor", rarity: "rare", maxStack: 1 },
    ]);

    const weapons = registry.getByCategory("weapon");
    expect(weapons).toHaveLength(1);
    expect(weapons[0].id).toBe("sword");
  });

  it("filters by rarity", async () => {
    const { ItemRegistry } = await import("./item-registry");
    const registry = new ItemRegistry();

    registry.registerAll([
      { id: "wood", name: "Wood", category: "material", rarity: "common", maxStack: 64 },
      { id: "diamond", name: "Diamond", category: "material", rarity: "legendary", maxStack: 16 },
      { id: "ruby", name: "Ruby", category: "material", rarity: "legendary", maxStack: 16 },
    ]);

    const legendaries = registry.getByRarity("legendary");
    expect(legendaries).toHaveLength(2);
  });

  it("filters by tag", async () => {
    const { ItemRegistry } = await import("./item-registry");
    const registry = new ItemRegistry();

    registry.registerAll([
      {
        id: "sword",
        name: "Sword",
        category: "weapon",
        rarity: "common",
        maxStack: 1,
        tags: ["melee", "starter"],
      },
      { id: "bow", name: "Bow", category: "weapon", rarity: "rare", maxStack: 1, tags: ["ranged"] },
      {
        id: "dagger",
        name: "Dagger",
        category: "weapon",
        rarity: "uncommon",
        maxStack: 1,
        tags: ["melee"],
      },
    ]);

    const melee = registry.getByTag("melee");
    expect(melee).toHaveLength(2);
  });

  it("unregisters items", async () => {
    const { ItemRegistry } = await import("./item-registry");
    const registry = new ItemRegistry();

    registry.register({
      id: "test",
      name: "Test",
      category: "misc",
      rarity: "common",
      maxStack: 1,
    });
    expect(registry.has("test")).toBe(true);

    const removed = registry.unregister("test");
    expect(removed).toBe(true);
    expect(registry.has("test")).toBe(false);
  });

  it("clamps maxStack to at least 1", async () => {
    const { ItemRegistry } = await import("./item-registry");
    const registry = new ItemRegistry();

    registry.register({ id: "bad", name: "Bad", category: "misc", rarity: "common", maxStack: 0 });
    expect(registry.get("bad")?.maxStack).toBe(1);
  });

  it("clears all definitions", async () => {
    const { ItemRegistry } = await import("./item-registry");
    const registry = new ItemRegistry();

    registry.registerAll([
      { id: "a", name: "A", category: "misc", rarity: "common", maxStack: 1 },
      { id: "b", name: "B", category: "misc", rarity: "common", maxStack: 1 },
    ]);
    expect(registry.count()).toBe(2);

    registry.clear();
    expect(registry.count()).toBe(0);
  });
});

describe("InventoryStore", () => {
  let ItemRegistry: typeof import("./item-registry").ItemRegistry;
  let InventoryStore: typeof import("./inventory-store").InventoryStore;

  beforeEach(async () => {
    vi.resetModules();
    setupGlobals();
    const regMod = await import("./item-registry");
    const storeMod = await import("./inventory-store");
    ItemRegistry = regMod.ItemRegistry;
    InventoryStore = storeMod.InventoryStore;
  });

  afterEach(() => teardownGlobals());

  function makeRegistry() {
    const registry = new ItemRegistry();
    registry.registerAll([
      { id: "wood", name: "Wood", category: "material", rarity: "common", maxStack: 64 },
      { id: "stone", name: "Stone", category: "material", rarity: "common", maxStack: 64 },
      { id: "iron_sword", name: "Iron Sword", category: "weapon", rarity: "uncommon", maxStack: 1 },
      { id: "diamond", name: "Diamond", category: "material", rarity: "legendary", maxStack: 16 },
      {
        id: "potion",
        name: "Health Potion",
        category: "consumable",
        rarity: "common",
        maxStack: 10,
      },
      {
        id: "quest_key",
        name: "Quest Key",
        category: "quest",
        rarity: "rare",
        maxStack: 1,
        tradeable: false,
      },
      {
        id: "junk",
        name: "Junk",
        category: "misc",
        rarity: "common",
        maxStack: 1,
        droppable: true,
      },
    ]);
    return registry;
  }

  function makeStore(playerId = 1, config?: Record<string, unknown>) {
    const registry = makeRegistry();
    const store = new InventoryStore(playerId, registry, {
      defaultMaxSlots: 10,
      enableLogging: false,
      ...config,
    });
    store.init();
    return { store, registry };
  }

  // --------------------------------------------------------------------------
  // Add / Remove
  // --------------------------------------------------------------------------

  describe("add and remove items", () => {
    it("adds a non-stackable item", () => {
      const { store } = makeStore();
      const result = store.addItem("iron_sword");
      expect(result.ok).toBe(true);
      expect(result.item?.itemId).toBe("iron_sword");
      expect(result.item?.quantity).toBe(1);
      expect(store.getUsedSlots()).toBe(1);
    });

    it("adds a stackable item", () => {
      const { store } = makeStore();
      const result = store.addItem("wood", 10);
      expect(result.ok).toBe(true);
      expect(result.item?.quantity).toBe(10);
      expect(store.getUsedSlots()).toBe(1);
      expect(store.getItemCount("wood")).toBe(10);
    });

    it("stacks into existing slots", () => {
      const { store } = makeStore();
      store.addItem("wood", 30);
      store.addItem("wood", 20);

      expect(store.getItemCount("wood")).toBe(50);
      expect(store.getUsedSlots()).toBe(1); // 50 < 64 maxStack
    });

    it("creates new stack when existing is full", () => {
      const { store } = makeStore();
      store.addItem("wood", 64);
      store.addItem("wood", 10);

      expect(store.getItemCount("wood")).toBe(74);
      expect(store.getUsedSlots()).toBe(2); // 64 + 10
    });

    it("rejects unknown items", () => {
      const { store } = makeStore();
      const result = store.addItem("nonexistent");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("invalid_item");
    });

    it("rejects zero quantity", () => {
      const { store } = makeStore();
      const result = store.addItem("wood", 0);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("invalid_item");
    });

    it("rejects when inventory is full", () => {
      const { store } = makeStore(1, { defaultMaxSlots: 2 });
      store.addItem("iron_sword");
      store.addItem("iron_sword");
      const result = store.addItem("iron_sword");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("inventory_full");
    });

    it("removes items by item ID", () => {
      const { store } = makeStore();
      store.addItem("wood", 50);
      const result = store.removeItem("wood", 20);
      expect(result.ok).toBe(true);
      expect(store.getItemCount("wood")).toBe(30);
    });

    it("removes entire stacks when quantity matches", () => {
      const { store } = makeStore();
      store.addItem("iron_sword");
      store.removeItem("iron_sword");
      expect(store.getUsedSlots()).toBe(0);
    });

    it("rejects removing more than available", () => {
      const { store } = makeStore();
      store.addItem("wood", 5);
      const result = store.removeItem("wood", 10);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("insufficient_quantity");
    });

    it("removes by instance ID", () => {
      const { store } = makeStore();
      const addResult = store.addItem("iron_sword");
      const instanceId = addResult.item!.instanceId;

      const removeResult = store.removeInstance(instanceId);
      expect(removeResult.ok).toBe(true);
      expect(store.getUsedSlots()).toBe(0);
    });

    it("returns not_found for unknown instance ID", () => {
      const { store } = makeStore();
      const result = store.removeInstance("nonexistent");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("item_not_found");
    });
  });

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  describe("queries", () => {
    it("checks hasItem correctly", () => {
      const { store } = makeStore();
      store.addItem("wood", 5);
      expect(store.hasItem("wood", 5)).toBe(true);
      expect(store.hasItem("wood", 6)).toBe(false);
      expect(store.hasItem("stone")).toBe(false);
    });

    it("gets all items", () => {
      const { store } = makeStore();
      store.addItem("wood", 10);
      store.addItem("iron_sword");
      const all = store.getAllItems();
      expect(all).toHaveLength(2);
    });

    it("gets items by category", () => {
      const { store } = makeStore();
      store.addItem("wood", 10);
      store.addItem("stone", 5);
      store.addItem("iron_sword");

      const materials = store.getItemsByCategory("material");
      expect(materials).toHaveLength(2);

      const weapons = store.getItemsByCategory("weapon");
      expect(weapons).toHaveLength(1);
    });

    it("gets item instances by item ID", () => {
      const { store } = makeStore();
      store.addItem("iron_sword");
      store.addItem("iron_sword");
      const instances = store.getItemInstances("iron_sword");
      expect(instances).toHaveLength(2);
    });

    it("reports total item count", () => {
      const { store } = makeStore();
      store.addItem("wood", 30);
      store.addItem("iron_sword");
      expect(store.getTotalItemCount()).toBe(31);
    });
  });

  // --------------------------------------------------------------------------
  // Slot Management
  // --------------------------------------------------------------------------

  describe("slots", () => {
    it("reports available slots", () => {
      const { store } = makeStore(1, { defaultMaxSlots: 5 });
      store.addItem("iron_sword");
      expect(store.getAvailableSlots()).toBe(4);
      expect(store.getMaxSlots()).toBe(5);
    });

    it("expands slots", () => {
      const { store } = makeStore(1, { defaultMaxSlots: 5 });
      store.expandSlots(10);
      expect(store.getMaxSlots()).toBe(15);
    });

    it("sets max slots directly", () => {
      const { store } = makeStore();
      store.setMaxSlots(100);
      expect(store.getMaxSlots()).toBe(100);
    });
  });

  // --------------------------------------------------------------------------
  // Transfer
  // --------------------------------------------------------------------------

  describe("transfer", () => {
    it("transfers items between inventories", () => {
      const registry = makeRegistry();
      const source = new InventoryStore(1, registry, { defaultMaxSlots: 10 });
      const target = new InventoryStore(2, registry, { defaultMaxSlots: 10 });
      source.init();
      target.init();

      source.addItem("wood", 20);
      const result = source.transferTo(target, "wood", 10);

      expect(result.ok).toBe(true);
      expect(source.getItemCount("wood")).toBe(10);
      expect(target.getItemCount("wood")).toBe(10);
    });

    it("rejects transfer of non-tradeable items", () => {
      const registry = makeRegistry();
      const source = new InventoryStore(1, registry, { defaultMaxSlots: 10 });
      const target = new InventoryStore(2, registry, { defaultMaxSlots: 10 });
      source.init();
      target.init();

      source.addItem("quest_key");
      const result = source.transferTo(target, "quest_key");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("not_tradeable");
      // Item should still be in source
      expect(source.hasItem("quest_key")).toBe(true);
    });

    it("rolls back on target full", () => {
      const registry = makeRegistry();
      const source = new InventoryStore(1, registry, { defaultMaxSlots: 10 });
      const target = new InventoryStore(2, registry, { defaultMaxSlots: 1 });
      source.init();
      target.init();

      source.addItem("iron_sword");
      source.addItem("iron_sword");
      target.addItem("iron_sword"); // Fill target

      const result = source.transferTo(target, "iron_sword");
      expect(result.ok).toBe(false);
      expect(result.status).toBe("inventory_full");
      // Source should still have the item (rolled back)
      expect(source.getItemCount("iron_sword")).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // Metadata
  // --------------------------------------------------------------------------

  describe("metadata", () => {
    it("sets instance metadata", () => {
      const { store } = makeStore();
      const addResult = store.addItem("iron_sword");
      const instanceId = addResult.item!.instanceId;

      const result = store.setInstanceMetadata(instanceId, { enchant: "fire", level: 3 });
      expect(result.ok).toBe(true);
      expect(result.item?.metadata).toEqual({ enchant: "fire", level: 3 });
    });

    it("updates instance metadata (merge)", () => {
      const { store } = makeStore();
      const addResult = store.addItem("iron_sword");
      const instanceId = addResult.item!.instanceId;

      store.setInstanceMetadata(instanceId, { enchant: "fire", level: 1 });
      store.updateInstanceMetadata(instanceId, { level: 2, durability: 100 });

      const instance = store.getInstance(instanceId);
      expect(instance?.metadata).toEqual({ enchant: "fire", level: 2, durability: 100 });
    });

    it("returns not_found for unknown instance", () => {
      const { store } = makeStore();
      const result = store.setInstanceMetadata("nope", { x: 1 });
      expect(result.ok).toBe(false);
      expect(result.status).toBe("item_not_found");
    });

    it("adds items with initial metadata", () => {
      const { store } = makeStore();
      const result = store.addItem("iron_sword", 1, { durability: 100 });
      expect(result.ok).toBe(true);
      expect(result.item?.metadata).toEqual({ durability: 100 });
    });
  });

  // --------------------------------------------------------------------------
  // Persistence
  // --------------------------------------------------------------------------

  describe("save and load", () => {
    it("saves and loads inventory", () => {
      const registry = makeRegistry();

      // Create and populate
      const store1 = new InventoryStore(1, registry, { defaultMaxSlots: 10 });
      store1.init();
      store1.addItem("wood", 30);
      store1.addItem("iron_sword");
      store1.expandSlots(5);

      const saveResult = store1.save();
      expect(saveResult.ok).toBe(true);

      // Load into fresh store
      const store2 = new InventoryStore(1, registry, { defaultMaxSlots: 10 });
      store2.init();
      const loadResult = store2.load();
      expect(loadResult.ok).toBe(true);

      expect(store2.getItemCount("wood")).toBe(30);
      expect(store2.hasItem("iron_sword")).toBe(true);
      expect(store2.getMaxSlots()).toBe(15);
    });

    it("creates empty inventory on first load", () => {
      const registry = makeRegistry();
      const store = new InventoryStore(99, registry, { defaultMaxSlots: 20 });
      store.init();
      const result = store.load();
      expect(result.ok).toBe(true);
      expect(store.getUsedSlots()).toBe(0);
      expect(store.getMaxSlots()).toBe(20);
    });

    it("tracks dirty state", () => {
      const { store } = makeStore();
      expect(store.isDirty()).toBe(false);

      store.addItem("wood");
      expect(store.isDirty()).toBe(true);

      store.save();
      expect(store.isDirty()).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Sorting
  // --------------------------------------------------------------------------

  describe("sorting", () => {
    it("sorts by category then rarity then item ID", () => {
      const { store } = makeStore();
      store.addItem("iron_sword");
      store.addItem("wood", 10);
      store.addItem("diamond", 5);
      store.addItem("potion", 3);

      store.sort();
      const items = store.getAllItems();

      // consumable < material < weapon (alphabetical category)
      expect(items[0].itemId).toBe("potion");
      // materials: diamond (legendary) before wood (common) — higher rarity first
      expect(items[1].itemId).toBe("diamond");
      expect(items[2].itemId).toBe("wood");
      // weapon last
      expect(items[3].itemId).toBe("iron_sword");
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe("edge cases", () => {
    it("respects total item limit", () => {
      const { store } = makeStore(1, { maxTotalItems: 10 });
      store.addItem("wood", 8);
      const result = store.addItem("wood", 5);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("inventory_full");
      expect(store.getItemCount("wood")).toBe(8);
    });

    it("clears all items", () => {
      const { store } = makeStore();
      store.addItem("wood", 30);
      store.addItem("iron_sword");
      store.clearAll();
      expect(store.getUsedSlots()).toBe(0);
      expect(store.getTotalItemCount()).toBe(0);
    });

    it("reports player ID", () => {
      const { store } = makeStore(42);
      expect(store.getPlayerId()).toBe(42);
    });

    it("partial add when inventory fills mid-operation", () => {
      const { store } = makeStore(1, { defaultMaxSlots: 2 });
      // Fill 1 slot with full stack of potions (max 10)
      store.addItem("potion", 10);
      // Add more — second slot fills, third would overflow
      store.addItem("potion", 10);
      // Now 2 slots used (10 + 10)
      expect(store.getUsedSlots()).toBe(2);
      // Trying to add more should fail
      const result = store.addItem("potion", 5);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("inventory_full");
    });
  });
});

// Need afterEach with teardown
import { afterEach } from "vitest";
