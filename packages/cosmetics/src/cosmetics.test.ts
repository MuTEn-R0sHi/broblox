/**
 * @broblox/cosmetics — Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CosmeticDefinition } from "./types";
import { CosmeticRegistry } from "./cosmetic-registry";
import { CosmeticStore } from "./cosmetic-store";

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
      return {};
    }),
  };
}

// ---------------------------------------------------------------------------
// Test cosmetics
// ---------------------------------------------------------------------------

const redHat: CosmeticDefinition = {
  id: "red_hat",
  name: "Red Hat",
  description: "A stylish red hat",
  category: "hat",
  rarity: "common",
  tradeable: true,
  limited: false,
};

const goldSkin: CosmeticDefinition = {
  id: "gold_skin",
  name: "Gold Skin",
  description: "Shiny gold skin",
  category: "skin",
  rarity: "legendary",
  tradeable: false,
  limited: true,
};

const fireTrail: CosmeticDefinition = {
  id: "fire_trail",
  name: "Fire Trail",
  description: "Leaves fire behind you",
  category: "trail",
  rarity: "epic",
  tradeable: true,
  limited: false,
};

const waveEmote: CosmeticDefinition = {
  id: "wave_emote",
  name: "Wave",
  description: "Wave at other players",
  category: "emote",
  rarity: "common",
  tradeable: false,
  limited: false,
};

const proTitle: CosmeticDefinition = {
  id: "pro_title",
  name: "Pro",
  description: "Show off your skills",
  category: "title",
  rarity: "rare",
  tradeable: false,
  limited: false,
};

// ---------------------------------------------------------------------------
// Registry tests
// ---------------------------------------------------------------------------

describe("CosmeticRegistry", () => {
  beforeEach(() => setupGlobals());

  it("registers and retrieves cosmetics", () => {
    const reg = new CosmeticRegistry();
    reg.register(redHat);
    expect(reg.has("red_hat")).toBe(true);
    expect(reg.get("red_hat")?.name).toBe("Red Hat");
  });

  it("registerAll adds multiple", () => {
    const reg = new CosmeticRegistry();
    reg.registerAll([redHat, goldSkin, fireTrail]);
    expect(reg.count()).toBe(3);
  });

  it("filters by category", () => {
    const reg = new CosmeticRegistry();
    reg.registerAll([redHat, goldSkin, fireTrail, waveEmote]);
    expect(reg.getByCategory("hat")).toHaveLength(1);
    expect(reg.getByCategory("emote")).toHaveLength(1);
  });

  it("filters by rarity", () => {
    const reg = new CosmeticRegistry();
    reg.registerAll([redHat, goldSkin, fireTrail]);
    expect(reg.getByRarity("legendary")).toHaveLength(1);
    expect(reg.getByRarity("common")).toHaveLength(1);
  });

  it("getAll returns everything", () => {
    const reg = new CosmeticRegistry();
    reg.registerAll([redHat, goldSkin]);
    expect(reg.getAll()).toHaveLength(2);
  });

  it("clear removes all", () => {
    const reg = new CosmeticRegistry();
    reg.register(redHat);
    reg.clear();
    expect(reg.count()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Store tests
// ---------------------------------------------------------------------------

describe("CosmeticStore", () => {
  let registry: CosmeticRegistry;
  let store: CosmeticStore;

  beforeEach(() => {
    setupGlobals();
    registry = new CosmeticRegistry();
    registry.registerAll([redHat, goldSkin, fireTrail, waveEmote, proTitle]);
    store = new CosmeticStore(1, registry, { enableLogging: true });
    store.init();
    store.load();
  });

  // Ownership
  it("grants a cosmetic", () => {
    expect(store.grant("red_hat").ok).toBe(true);
    expect(store.owns("red_hat")).toBe(true);
    expect(store.ownedCount()).toBe(1);
  });

  it("rejects duplicate grant", () => {
    store.grant("red_hat");
    expect(store.grant("red_hat").status).toBe("already_owned");
  });

  it("rejects unknown cosmetic", () => {
    expect(store.grant("nonexistent").status).toBe("cosmetic_not_found");
  });

  it("revokes a cosmetic", () => {
    store.grant("red_hat");
    expect(store.revoke("red_hat").ok).toBe(true);
    expect(store.owns("red_hat")).toBe(false);
    expect(store.ownedCount()).toBe(0);
  });

  it("revoke auto-unequips", () => {
    store.grant("red_hat");
    store.equip("red_hat", "head");
    store.revoke("red_hat");
    expect(store.getEquipped("head")).toBeUndefined();
  });

  it("getOwned returns all owned ids", () => {
    store.grant("red_hat");
    store.grant("gold_skin");
    const owned = store.getOwned();
    expect(owned).toHaveLength(2);
  });

  // Equip / Unequip
  it("equips to valid slot", () => {
    store.grant("red_hat");
    expect(store.equip("red_hat", "head").ok).toBe(true);
    expect(store.getEquipped("head")).toBe("red_hat");
    expect(store.equippedCount()).toBe(1);
  });

  it("rejects equip for unowned cosmetic", () => {
    expect(store.equip("red_hat", "head").status).toBe("not_owned");
  });

  it("rejects equip for wrong slot", () => {
    store.grant("red_hat");
    expect(store.equip("red_hat", "trail").status).toBe("slot_category_mismatch");
  });

  it("rejects double equip same slot", () => {
    store.grant("red_hat");
    store.equip("red_hat", "head");
    expect(store.equip("red_hat", "head").status).toBe("already_equipped");
  });

  it("unequips a slot", () => {
    store.grant("red_hat");
    store.equip("red_hat", "head");
    expect(store.unequip("head").ok).toBe(true);
    expect(store.getEquipped("head")).toBeUndefined();
  });

  it("rejects unequip on empty slot", () => {
    expect(store.unequip("head").status).toBe("not_equipped");
  });

  it("equips trail to trail slot", () => {
    store.grant("fire_trail");
    expect(store.equip("fire_trail", "trail").ok).toBe(true);
  });

  it("equips emote to emote_2 slot", () => {
    store.grant("wave_emote");
    expect(store.equip("wave_emote", "emote_1").ok).toBe(true);
    // Also can equip to emote_2
    store.unequip("emote_1");
    expect(store.equip("wave_emote", "emote_2").ok).toBe(true);
  });

  it("equips title to title slot", () => {
    store.grant("pro_title");
    expect(store.equip("pro_title", "title").ok).toBe(true);
  });

  it("getAllEquipped returns map", () => {
    store.grant("red_hat");
    store.grant("fire_trail");
    store.equip("red_hat", "head");
    store.equip("fire_trail", "trail");
    const equipped = store.getAllEquipped();
    expect(equipped.size).toBe(2);
  });

  // Events
  it("fires onEquip callback on equip", () => {
    const cb = vi.fn();
    store.onEquip(cb);
    store.grant("red_hat");
    store.equip("red_hat", "head");
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({
        cosmeticId: "red_hat",
        slot: "head",
        equipped: true,
      })
    );
  });

  it("fires onEquip callback on unequip", () => {
    const cb = vi.fn();
    store.onEquip(cb);
    store.grant("red_hat");
    store.equip("red_hat", "head");
    store.unequip("head");
    expect(cb).toHaveBeenCalledTimes(2);
  });

  // Dirty / Persistence
  it("tracks dirty state", () => {
    expect(store.isDirty()).toBe(false);
    store.grant("red_hat");
    expect(store.isDirty()).toBe(true);
    store.save();
    expect(store.isDirty()).toBe(false);
  });

  it("save and load round-trips", () => {
    store.grant("red_hat");
    store.grant("gold_skin");
    store.equip("red_hat", "head");
    store.save();

    const store2 = new CosmeticStore(1, registry, {});
    store2.init();
    store2.load();
    expect(store2.ownedCount()).toBe(2);
  });

  // Equip replaces — fires unequip for displaced cosmetic
  it("fires unequip callback when replacing equipped cosmetic in same slot", () => {
    const cb = vi.fn();
    store.onEquip(cb);
    store.grant("red_hat");
    store.grant("gold_skin");
    // gold_skin is skin category but let's use hat slot for red_hat first
    store.equip("red_hat", "head");
    expect(cb).toHaveBeenCalledTimes(1);

    // Register another hat to replace
    const blueHat: CosmeticDefinition = {
      id: "blue_hat",
      name: "Blue Hat",
      description: "A blue hat",
      category: "hat",
      rarity: "common",
      tradeable: true,
      limited: false,
    };
    registry.register(blueHat);
    store.grant("blue_hat");

    store.equip("blue_hat", "head");
    // Should have fired: equip red_hat (1), unequip red_hat (2), equip blue_hat (3)
    expect(cb).toHaveBeenCalledTimes(3);
    // Second call should be unequip of the old cosmetic
    expect(cb).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cosmeticId: "red_hat",
        slot: "head",
        equipped: false,
      })
    );
    // Third call should be equip of the new cosmetic
    expect(cb).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        cosmeticId: "blue_hat",
        slot: "head",
        equipped: true,
      })
    );
  });
});
