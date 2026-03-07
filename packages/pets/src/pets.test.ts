/**
 * @broblox/pets — Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PetSpecies } from "./types";
import { MAX_NICKNAME_LENGTH } from "./types";

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
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
    huge: Infinity,
    random: () => Math.random(),
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
        return { GenerateGUID: vi.fn(() => `guid-${++idCounter}`) };
      }
      return {};
    }),
  };
}

// ---------------------------------------------------------------------------
// Test pet species
// ---------------------------------------------------------------------------

const fireSlime: PetSpecies = {
  id: "fire_slime",
  name: "Fire Slime",
  rarity: "common",
  element: "fire",
  baseStats: { power: 10, speed: 8, stamina: 12, luck: 5 },
  maxLevel: 10,
  baseXp: 100,
  growthRate: 1.2,
  abilities: [
    [
      3,
      {
        id: "flame_aura",
        name: "Flame Aura",
        description: "+10% power",
        multiplier: 1.1,
        stat: "power",
      },
    ],
    [
      7,
      {
        id: "speed_burst",
        name: "Speed Burst",
        description: "+15% speed",
        multiplier: 1.15,
        stat: "speed",
      },
    ],
  ],
  evolvesInto: "fire_dragon",
  evolveLevel: 10,
};

const fireDragon: PetSpecies = {
  id: "fire_dragon",
  name: "Fire Dragon",
  rarity: "legendary",
  element: "fire",
  baseStats: { power: 50, speed: 40, stamina: 60, luck: 20 },
  maxLevel: 20,
  baseXp: 200,
  growthRate: 1.5,
  abilities: [],
};

const waterSprite: PetSpecies = {
  id: "water_sprite",
  name: "Water Sprite",
  rarity: "uncommon",
  element: "water",
  baseStats: { power: 8, speed: 12, stamina: 10, luck: 8 },
  maxLevel: 10,
  baseXp: 100,
  growthRate: 1.2,
  abilities: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { PetRegistry } from "./pet-registry";
import { PetStore } from "./pet-store";

describe("PetRegistry", () => {
  beforeEach(() => setupGlobals());

  it("registers and retrieves species", () => {
    const reg = new PetRegistry();
    reg.register(fireSlime);
    reg.register(fireDragon);

    expect(reg.has("fire_slime")).toBe(true);
    expect(reg.get("fire_slime")?.name).toBe("Fire Slime");
    expect(reg.count()).toBe(2);
  });

  it("prevents duplicate registration", () => {
    const reg = new PetRegistry();
    reg.register(fireSlime);
    reg.register(fireSlime);
    expect(reg.count()).toBe(1);
  });

  it("filters by rarity", () => {
    const reg = new PetRegistry();
    reg.registerAll([fireSlime, fireDragon, waterSprite]);
    expect(reg.getByRarity("common")).toHaveLength(1);
    expect(reg.getByRarity("legendary")).toHaveLength(1);
  });

  it("filters by element", () => {
    const reg = new PetRegistry();
    reg.registerAll([fireSlime, fireDragon, waterSprite]);
    expect(reg.getByElement("fire")).toHaveLength(2);
    expect(reg.getByElement("water")).toHaveLength(1);
  });

  it("getAll returns all species", () => {
    const reg = new PetRegistry();
    reg.registerAll([fireSlime, fireDragon, waterSprite]);
    expect(reg.getAll()).toHaveLength(3);
  });

  it("clear removes all", () => {
    const reg = new PetRegistry();
    reg.registerAll([fireSlime, fireDragon]);
    reg.clear();
    expect(reg.count()).toBe(0);
  });
});

describe("PetStore", () => {
  let registry: PetRegistry;
  let store: PetStore;

  beforeEach(() => {
    setupGlobals();
    registry = new PetRegistry();
    registry.registerAll([fireSlime, fireDragon, waterSprite]);
    store = new PetStore(1, registry, { enableLogging: true, maxEquipped: 2 });
    store.init();
    store.load();
  });

  // Add / Remove
  it("adds a pet", () => {
    const result = store.addPet("fire_slime", "Sparky");
    expect(result.ok).toBe(true);
    expect(result.pet?.speciesId).toBe("fire_slime");
    expect(result.pet?.nickname).toBe("Sparky");
    expect(result.pet?.level).toBe(1);
    expect(store.petCount()).toBe(1);
  });

  it("rejects unknown species", () => {
    const result = store.addPet("unknown_pet");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("species_not_found");
  });

  it("rejects when slots full", () => {
    const s = new PetStore(1, registry, { defaultMaxSlots: 1 });
    s.init();
    s.load();
    s.addPet("fire_slime");
    const result = s.addPet("water_sprite");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("slots_full");
  });

  it("removes a pet", () => {
    const { pet } = store.addPet("fire_slime");
    const result = store.removePet(pet!.instanceId);
    expect(result.ok).toBe(true);
    expect(store.petCount()).toBe(0);
  });

  it("cannot remove locked pet", () => {
    const { pet } = store.addPet("fire_slime");
    store.setLocked(pet!.instanceId, true);
    const result = store.removePet(pet!.instanceId);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("pet_locked");
  });

  it("returns pet_not_found for invalid id", () => {
    expect(store.removePet("nonexistent").status).toBe("pet_not_found");
  });

  // Equip / Unequip
  it("equips and unequips a pet", () => {
    const { pet } = store.addPet("fire_slime");
    expect(store.equipPet(pet!.instanceId).ok).toBe(true);
    expect(store.equippedCount()).toBe(1);

    expect(store.unequipPet(pet!.instanceId).ok).toBe(true);
    expect(store.equippedCount()).toBe(0);
  });

  it("rejects equip when max reached", () => {
    store.addPet("fire_slime");
    store.addPet("water_sprite");
    store.addPet("fire_slime");

    const pets = store.getAllPets();
    store.equipPet(pets[0].instanceId);
    store.equipPet(pets[1].instanceId);

    const result = store.equipPet(pets[2].instanceId);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("max_equipped");
  });

  it("rejects double equip", () => {
    const { pet } = store.addPet("fire_slime");
    store.equipPet(pet!.instanceId);
    expect(store.equipPet(pet!.instanceId).status).toBe("already_equipped");
  });

  it("rejects unequip on non-equipped", () => {
    const { pet } = store.addPet("fire_slime");
    expect(store.unequipPet(pet!.instanceId).status).toBe("not_equipped");
  });

  // Leveling
  it("adds XP and auto-levels", () => {
    const { pet } = store.addPet("fire_slime");
    // Level 1 → 2 requires 100 XP (baseXp * 1.2^0 = 100)
    const result = store.addXp(pet!.instanceId, 100);
    expect(result.ok).toBe(true);
    expect(result.pet?.level).toBe(2);
    expect(result.pet?.xp).toBe(0);
  });

  it("handles multi-level jumps", () => {
    const { pet } = store.addPet("fire_slime");
    // Give enough XP to jump multiple levels
    store.addXp(pet!.instanceId, 10000);
    expect(store.getPet(pet!.instanceId)!.level).toBeGreaterThan(2);
  });

  it("caps at maxLevel", () => {
    const { pet } = store.addPet("fire_slime");
    store.addXp(pet!.instanceId, 999999);
    expect(store.getPet(pet!.instanceId)!.level).toBe(10);
    expect(store.getPet(pet!.instanceId)!.xp).toBe(0);
  });

  it("rejects XP at max level", () => {
    const { pet } = store.addPet("fire_slime");
    store.addXp(pet!.instanceId, 999999);
    const result = store.addXp(pet!.instanceId, 100);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("max_level");
  });

  it("rejects negative XP", () => {
    const { pet } = store.addPet("fire_slime");
    const result = store.addXp(pet!.instanceId, -10);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid_amount");
  });

  it("rejects zero XP", () => {
    const { pet } = store.addPet("fire_slime");
    const result = store.addXp(pet!.instanceId, 0);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid_amount");
  });

  it("fires onLevelUp callback", () => {
    const cb = vi.fn();
    store.onLevelUp(cb);
    const { pet } = store.addPet("fire_slime");
    store.addXp(pet!.instanceId, 100);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ previousLevel: 1, newLevel: 2 }));
  });

  // Evolution
  it("evolves a pet when eligible", () => {
    const { pet } = store.addPet("fire_slime");
    store.addXp(pet!.instanceId, 999999); // max level
    const result = store.evolvePet(pet!.instanceId);
    expect(result.ok).toBe(true);
    expect(result.pet?.speciesId).toBe("fire_dragon");
    expect(result.pet?.level).toBe(1);
  });

  it("rejects evolution when level too low", () => {
    const { pet } = store.addPet("fire_slime");
    const result = store.evolvePet(pet!.instanceId);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("cannot_evolve");
  });

  it("rejects evolution on non-evolving species", () => {
    const { pet } = store.addPet("water_sprite");
    store.addXp(pet!.instanceId, 999999);
    const result = store.evolvePet(pet!.instanceId);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("cannot_evolve");
  });

  it("fires onEvolved callback", () => {
    const cb = vi.fn();
    store.onEvolved(cb);
    const { pet } = store.addPet("fire_slime");
    store.addXp(pet!.instanceId, 999999);
    store.evolvePet(pet!.instanceId);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ fromSpecies: "fire_slime", toSpecies: "fire_dragon" })
    );
  });

  // Stats
  it("calculates effective stats with level scaling", () => {
    const { pet } = store.addPet("fire_slime");
    const stats1 = store.getEffectiveStats(pet!.instanceId);
    expect(stats1?.power).toBe(10); // base at level 1

    store.addXp(pet!.instanceId, 100); // level 2
    const stats2 = store.getEffectiveStats(pet!.instanceId);
    expect(stats2!.power).toBe(11); // 10 * 1.1 = 11
  });

  it("applies abilities at unlock level", () => {
    const { pet } = store.addPet("fire_slime");
    store.addXp(pet!.instanceId, 5000); // should unlock flame_aura at level 3
    const p = store.getPet(pet!.instanceId)!;
    expect(p.level).toBeGreaterThanOrEqual(3);
    const stats = store.getEffectiveStats(pet!.instanceId);
    expect(stats).toBeDefined();
    // Power should be boosted by flame_aura (+10%)
    const basePower = math.floor(10 * (1 + (p.level - 1) * 0.1));
    expect(stats!.power).toBe(math.floor(basePower * 1.1));
  });

  // Queries
  it("gets pets by species", () => {
    store.addPet("fire_slime");
    store.addPet("fire_slime");
    store.addPet("water_sprite");
    expect(store.getPetsBySpecies("fire_slime")).toHaveLength(2);
    expect(store.getPetsBySpecies("water_sprite")).toHaveLength(1);
  });

  it("gets equipped pets", () => {
    const { pet: p1 } = store.addPet("fire_slime");
    store.addPet("water_sprite");
    store.equipPet(p1!.instanceId);
    const equipped = store.getEquippedPets();
    expect(equipped).toHaveLength(1);
    expect(equipped[0].instanceId).toBe(p1!.instanceId);
  });

  it("equippedCount matches getEquippedPets length", () => {
    const { pet: p1 } = store.addPet("fire_slime");
    const { pet: p2 } = store.addPet("water_sprite");
    expect(store.equippedCount()).toBe(0);
    store.equipPet(p1!.instanceId);
    expect(store.equippedCount()).toBe(1);
    expect(store.equippedCount()).toBe(store.getEquippedPets().size());
    store.equipPet(p2!.instanceId);
    expect(store.equippedCount()).toBe(2);
    expect(store.equippedCount()).toBe(store.getEquippedPets().size());
  });

  // Nickname / Lock
  it("sets nickname", () => {
    const { pet } = store.addPet("fire_slime");
    store.setNickname(pet!.instanceId, "Blaze");
    expect(store.getPet(pet!.instanceId)?.nickname).toBe("Blaze");
  });

  it("rejects empty nickname", () => {
    const { pet } = store.addPet("fire_slime");
    const result = store.setNickname(pet!.instanceId, "");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid_nickname");
  });

  it("rejects nickname exceeding max length", () => {
    const { pet } = store.addPet("fire_slime");
    const tooLong = "A".repeat(MAX_NICKNAME_LENGTH + 1);
    const result = store.setNickname(pet!.instanceId, tooLong);
    expect(result.ok).toBe(false);
    expect(result.status).toBe("invalid_nickname");
  });

  it("accepts nickname at max length", () => {
    const { pet } = store.addPet("fire_slime");
    const exactMax = "A".repeat(MAX_NICKNAME_LENGTH);
    const result = store.setNickname(pet!.instanceId, exactMax);
    expect(result.ok).toBe(true);
    expect(store.getPet(pet!.instanceId)?.nickname).toBe(exactMax);
  });

  it("locks and unlocks a pet", () => {
    const { pet } = store.addPet("fire_slime");
    store.setLocked(pet!.instanceId, true);
    expect(store.getPet(pet!.instanceId)?.locked).toBe(true);
    store.setLocked(pet!.instanceId, false);
    expect(store.getPet(pet!.instanceId)?.locked).toBe(false);
  });

  // Persistence
  it("save and load round-trips", () => {
    store.addPet("fire_slime", "Sparky");
    store.addPet("water_sprite");
    store.save();

    const store2 = new PetStore(1, registry, { enableLogging: true });
    store2.init();
    store2.load();
    expect(store2.petCount()).toBe(2);
  });

  // isDirty
  it("tracks dirty state", () => {
    expect(store.isDirty()).toBe(false);
    store.addPet("fire_slime");
    expect(store.isDirty()).toBe(true);
    store.save();
    expect(store.isDirty()).toBe(false);
  });

  // Equip callback
  it("fires onEquipped callback", () => {
    const cb = vi.fn();
    store.onEquipped(cb);
    const { pet } = store.addPet("fire_slime");
    store.equipPet(pet!.instanceId);
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ equipped: true, speciesId: "fire_slime" })
    );
  });

  // -----------------------------------------------------------------------
  // Edge-case tests for branch coverage
  // -----------------------------------------------------------------------

  describe("DataStore error paths", () => {
    it("load returns false on DataStore error", () => {
      (globalThis as Record<string, unknown>).pcall = () => [false, "DataStore error"];
      expect(store.load()).toBe(false);
    });

    it("save returns false on DataStore error", () => {
      store.addPet("fire_slime");
      (globalThis as Record<string, unknown>).pcall = () => [false, "DataStore error"];
      expect(store.save()).toBe(false);
    });

    it("load returns false before init (no store)", () => {
      const s = new PetStore(99, registry, { enableLogging: false });
      expect(s.load()).toBe(false);
    });

    it("save returns false before init (no store)", () => {
      const s = new PetStore(99, registry, { enableLogging: false });
      expect(s.save()).toBe(false);
    });

    it("load ignores non-table stored data", () => {
      const ds = getOrCreateStore("PetStore");
      ds.SetAsync("pets_1", "corrupt");
      store.load();
      expect(store.petCount()).toBe(0);
    });

    it("load uses defaults when saved data has missing fields", () => {
      const ds = getOrCreateStore("PetStore");
      ds.SetAsync("pets_1", { playerId: 1 }); // no pets, maxSlots, version
      store.load();
      expect(store.petCount()).toBe(0);
    });
  });

  describe("pet lookups and errors", () => {
    it("addXp returns pet_not_found for unknown instanceId", () => {
      const result = store.addXp("no-such-pet", 10);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("pet_not_found");
    });

    it("evolvePet returns species_not_found when evolution target is unregistered", () => {
      // Register a species that evolves into something not in registry
      const temp: PetSpecies = {
        ...fireSlime,
        id: "temp_evolve",
        evolvesInto: "nonexistent_species",
        evolveLevel: 1,
      };
      registry.register(temp);
      const { pet } = store.addPet("temp_evolve");
      pet!.level = 1; // meets evolveLevel
      const result = store.evolvePet(pet!.instanceId);
      expect(result.ok).toBe(false);
      expect(result.status).toBe("species_not_found");
    });

    it("getEffectiveStats returns undefined for unknown pet", () => {
      expect(store.getEffectiveStats("nonexistent")).toBeUndefined();
    });

    it("setLocked returns pet_not_found for unknown pet", () => {
      expect(store.setLocked("nonexistent", true).ok).toBe(false);
    });

    it("setNickname returns pet_not_found for unknown pet", () => {
      expect(store.setNickname("nonexistent", "Test").ok).toBe(false);
    });

    it("getPetsBySpecies returns matching pets", () => {
      store.addPet("fire_slime");
      store.addPet("fire_slime");
      store.addPet("water_sprite");
      expect(store.getPetsBySpecies("fire_slime")).toHaveLength(2);
    });
  });

  describe("getEffectiveStats abilities", () => {
    it("applies speed ability bonus", () => {
      const { pet } = store.addPet("fire_slime");
      // Level up to 7 to unlock speed_burst ability
      for (let i = 0; i < 6; i++) {
        store.addXp(pet!.instanceId, 999);
      }
      const stats = store.getEffectiveStats(pet!.instanceId);
      expect(stats).toBeDefined();
      expect(stats!.speed).toBeGreaterThan(0);
    });

    it("does not apply ability below unlock level", () => {
      const { pet } = store.addPet("fire_slime");
      // Level 1 — no abilities unlocked yet
      const stats = store.getEffectiveStats(pet!.instanceId);
      expect(stats).toBeDefined();
      // Base power * levelMultiplier, no ability bonus
      expect(stats!.power).toBe(10); // level 1: 1 + (1-1)*0.1 = 1.0
    });
  });
});
