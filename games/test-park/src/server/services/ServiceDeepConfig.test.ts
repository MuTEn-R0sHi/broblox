/**
 * Low-Coverage Service Tests — Test Park
 *
 * Deep tests for the 6 wrapper services with thin existing coverage:
 * - BattlePassService (season config, tiers, rewards)
 * - TutorialService (sequences, steps, prerequisites)
 * - CosmeticsService (cosmetic config, categories, rarities)
 * - GachaService (egg config, loot tables, pity)
 * - InventoryService (item config, slot limits)
 * - PetService (pet config, evolution, stats)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// BattlePassService
// ============================================================================

describe("BattlePassService (test-park) — deep config", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockHandle = {
      Service: { name: "BattlePassService" },
      getSeasonRegistry: vi.fn(() => ({ getSeason: vi.fn() })),
      getBattlePassStore: vi.fn(() => ({})),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    vi.doMock("@broblox/battle-pass", () => ({
      createBattlePassService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("configures exactly 1 season (season_1)", async () => {
    await import("./BattlePassService");
    const seasons = capturedConfig!["seasons"] as Array<Record<string, unknown>>;
    expect(seasons).toHaveLength(1);
    expect(seasons[0].id).toBe("season_1");
    expect(seasons[0].name).toBe("Season 1: Uprising");
    expect(seasons[0].active).toBe(true);
  });

  it("season_1 has exactly 5 tiers with correct XP requirements", async () => {
    await import("./BattlePassService");
    const seasons = capturedConfig!["seasons"] as Array<Record<string, unknown>>;
    const tiers = seasons[0].tiers as Array<Record<string, unknown>>;
    expect(tiers).toHaveLength(5);
    expect(tiers.map((t) => t.xpRequired)).toEqual([100, 200, 300, 500, 750]);
  });

  it("tier 1 has free and premium reward tracks", async () => {
    await import("./BattlePassService");
    const seasons = capturedConfig!["seasons"] as Array<Record<string, unknown>>;
    const t1Rewards = (seasons[0].tiers as Array<Record<string, unknown>>)[0].rewards as Array<
      Record<string, unknown>
    >;
    const tracks = t1Rewards.map((r) => r.track);
    expect(tracks).toContain("free");
    expect(tracks).toContain("premium");
  });

  it("tier 5 only has free track (Champion Title)", async () => {
    await import("./BattlePassService");
    const seasons = capturedConfig!["seasons"] as Array<Record<string, unknown>>;
    const t5Rewards = (seasons[0].tiers as Array<Record<string, unknown>>)[4].rewards as Array<
      Record<string, unknown>
    >;
    expect(t5Rewards).toHaveLength(1);
    expect(t5Rewards[0].track).toBe("free");
    expect(t5Rewards[0].name).toBe("Champion Title");
  });

  it("uses correct datastore name", async () => {
    await import("./BattlePassService");
    expect(capturedConfig!["datastoreName"]).toBe("TestParkBattlePass");
  });

  it("wires onPlayerRemoving and onPlayerAdded lifecycle hooks", async () => {
    await import("./BattlePassService");
    expect(capturedConfig!["onPlayerRemoving"]).toBeDefined();
    expect(capturedConfig!["onPlayerAdded"]).toBeDefined();
  });

  it("delegates initPlayerBattlePass to handle.initPlayer", async () => {
    const mod = await import("./BattlePassService");
    mod.initPlayerBattlePass(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerBattlePass to handle.cleanupPlayer", async () => {
    const mod = await import("./BattlePassService");
    mod.cleanupPlayerBattlePass(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates getBattlePassStore to handle", async () => {
    const mod = await import("./BattlePassService");
    mod.getBattlePassStore(42);
    expect(mockHandle.getBattlePassStore).toHaveBeenCalledWith(42);
  });
});

// ============================================================================
// TutorialService
// ============================================================================

describe("TutorialService (test-park) — deep config", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockHandle = {
      Service: { name: "TutorialService" },
      getSequenceRegistry: vi.fn(() => ({ getSequence: vi.fn() })),
      getTutorialManager: vi.fn(() => ({})),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    vi.doMock("@broblox/tutorial", () => ({
      createTutorialService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("configures 2 sequences (ftue_basics and ftue_shop)", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    expect(sequences).toHaveLength(2);
    expect(sequences.map((s) => s.id)).toEqual(["ftue_basics", "ftue_shop"]);
  });

  it("ftue_basics has 4 steps with correct types", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    const basics = sequences[0];
    const steps = basics.steps as Array<Record<string, unknown>>;
    expect(steps).toHaveLength(4);
    expect(steps[0].stepType).toBe("dialog");
    expect(steps[1].stepType).toBe("action");
    expect(steps[2].stepType).toBe("action");
    expect(steps[3].stepType).toBe("dialog");
  });

  it("ftue_shop requires ftue_basics as prerequisite", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    const shop = sequences[1];
    expect(shop.prerequisites).toEqual(["ftue_basics"]);
  });

  it("ftue_shop has highlight step type (open_shop)", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    const shopSteps = sequences[1].steps as Array<Record<string, unknown>>;
    expect(shopSteps[0].stepType).toBe("highlight");
    expect(shopSteps[0].id).toBe("open_shop");
  });

  it("all steps are skippable", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    for (const seq of sequences) {
      const steps = seq.steps as Array<Record<string, unknown>>;
      for (const step of steps) {
        expect(step.skippable).toBe(true);
      }
    }
  });

  it("uses correct datastore name", async () => {
    await import("./TutorialService");
    expect(capturedConfig!["datastoreName"]).toBe("TestParkTutorial");
  });

  it("delegates getTutorialManager to handle", async () => {
    const mod = await import("./TutorialService");
    mod.getTutorialManager(42);
    expect(mockHandle.getTutorialManager).toHaveBeenCalledWith(42);
  });

  it("delegates initPlayerTutorial to handle.initPlayer", async () => {
    const mod = await import("./TutorialService");
    mod.initPlayerTutorial(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });
});

// ============================================================================
// CosmeticsService
// ============================================================================

describe("CosmeticsService (test-park) — deep config", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockHandle = {
      Service: { name: "CosmeticsService" },
      getCosmeticRegistry: vi.fn(() => ({ getCosmetic: vi.fn() })),
      getCosmeticStore: vi.fn(() => ({})),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    vi.doMock("@broblox/cosmetics", () => ({
      createCosmeticsService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("configures exactly 4 cosmetics", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    expect(cosmetics).toHaveLength(4);
  });

  it("covers all 4 categories: skin, trail, hat, emote", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    const categories = cosmetics.map((c) => c.category);
    expect(categories).toContain("skin");
    expect(categories).toContain("trail");
    expect(categories).toContain("hat");
    expect(categories).toContain("emote");
  });

  it("gold_hat is limited (not repeatable)", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    const goldHat = cosmetics.find((c) => c.id === "gold_hat");
    expect(goldHat).toBeDefined();
    expect(goldHat!.limited).toBe(true);
    expect(goldHat!.rarity).toBe("legendary");
  });

  it("flame_trail is tradeable", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    const flameTrail = cosmetics.find((c) => c.id === "flame_trail");
    expect(flameTrail!.tradeable).toBe(true);
  });

  it("default_skin is not tradeable", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    const def = cosmetics.find((c) => c.id === "default_skin");
    expect(def!.tradeable).toBe(false);
  });

  it("uses correct datastore name", async () => {
    await import("./CosmeticsService");
    expect(capturedConfig!["datastoreName"]).toBe("TestParkCosmetics");
  });

  it("delegates getCosmeticStore to handle", async () => {
    const mod = await import("./CosmeticsService");
    mod.getCosmeticStore(42);
    expect(mockHandle.getCosmeticStore).toHaveBeenCalledWith(42);
  });

  it("delegates initPlayerCosmetics to handle.initPlayer", async () => {
    const mod = await import("./CosmeticsService");
    mod.initPlayerCosmetics(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });
});

// ============================================================================
// GachaService
// ============================================================================

describe("GachaService (test-park) — deep config", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockHandle = {
      Service: { name: "GachaService" },
      getEggRegistry: vi.fn(() => ({ getEgg: vi.fn() })),
      getGachaStore: vi.fn(() => ({})),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    vi.doMock("@broblox/gacha", () => ({
      createGachaService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("configures 2 eggs (basic_egg and premium_egg)", async () => {
    await import("./GachaService");
    const eggs = capturedConfig!["eggs"] as Array<Record<string, unknown>>;
    expect(eggs).toHaveLength(2);
    expect(eggs.map((e) => e.id)).toEqual(["basic_egg", "premium_egg"]);
  });

  it("basic_egg costs 100 coins", async () => {
    await import("./GachaService");
    const eggs = capturedConfig!["eggs"] as Array<Record<string, unknown>>;
    const basic = eggs[0];
    expect(basic.cost).toBe(100);
    expect(basic.currency).toBe("coins");
  });

  it("premium_egg costs 500 gems", async () => {
    await import("./GachaService");
    const eggs = capturedConfig!["eggs"] as Array<Record<string, unknown>>;
    const premium = eggs[1];
    expect(premium.cost).toBe(500);
    expect(premium.currency).toBe("gems");
  });

  it("basic_egg loot table has 4 entries summing to 100 weight", async () => {
    await import("./GachaService");
    const eggs = capturedConfig!["eggs"] as Array<Record<string, unknown>>;
    const loot = eggs[0].lootTable as Array<Record<string, unknown>>;
    expect(loot).toHaveLength(4);
    const totalWeight = loot.reduce((sum, item) => sum + (item.weight as number), 0);
    expect(totalWeight).toBe(100);
  });

  it("basic_egg has pity at 50 for rare", async () => {
    await import("./GachaService");
    const eggs = capturedConfig!["eggs"] as Array<Record<string, unknown>>;
    expect(eggs[0].pityThreshold).toBe(50);
    expect(eggs[0].pityRarity).toBe("rare");
  });

  it("premium_egg has pity at 20 for legendary", async () => {
    await import("./GachaService");
    const eggs = capturedConfig!["eggs"] as Array<Record<string, unknown>>;
    expect(eggs[1].pityThreshold).toBe(20);
    expect(eggs[1].pityRarity).toBe("legendary");
  });

  it("both eggs are enabled with unlimited hatches", async () => {
    await import("./GachaService");
    const eggs = capturedConfig!["eggs"] as Array<Record<string, unknown>>;
    for (const egg of eggs) {
      expect(egg.enabled).toBe(true);
      expect(egg.maxHatches).toBe(0);
    }
  });

  it("uses correct datastore name", async () => {
    await import("./GachaService");
    expect(capturedConfig!["datastoreName"]).toBe("TestParkGacha");
  });

  it("delegates getGachaStore to handle", async () => {
    const mod = await import("./GachaService");
    mod.getGachaStore(42);
    expect(mockHandle.getGachaStore).toHaveBeenCalledWith(42);
  });
});

// ============================================================================
// InventoryService
// ============================================================================

describe("InventoryService (test-park) — deep config", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockHandle = {
      Service: { name: "InventoryService" },
      getItemRegistry: vi.fn(() => ({ getItem: vi.fn() })),
      getInventoryStore: vi.fn(() => ({})),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    vi.doMock("@broblox/inventory", () => ({
      createInventoryService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("configures 4 items", async () => {
    await import("./InventoryService");
    const items = capturedConfig!["items"] as Array<Record<string, unknown>>;
    expect(items).toHaveLength(4);
  });

  it("coins_pouch has maxStack 9999 and is not tradeable", async () => {
    await import("./InventoryService");
    const items = capturedConfig!["items"] as Array<Record<string, unknown>>;
    const pouch = items.find((i) => i.id === "coins_pouch");
    expect(pouch!.maxStack).toBe(9999);
    expect(pouch!.tradeable).toBe(false);
    expect(pouch!.category).toBe("currency");
  });

  it("health_potion is tradeable and droppable", async () => {
    await import("./InventoryService");
    const items = capturedConfig!["items"] as Array<Record<string, unknown>>;
    const potion = items.find((i) => i.id === "health_potion");
    expect(potion!.tradeable).toBe(true);
    expect(potion!.droppable).toBe(true);
    expect(potion!.maxStack).toBe(50);
  });

  it("iron_sword maxStack is 1 (unique)", async () => {
    await import("./InventoryService");
    const items = capturedConfig!["items"] as Array<Record<string, unknown>>;
    const sword = items.find((i) => i.id === "iron_sword");
    expect(sword!.maxStack).toBe(1);
    expect(sword!.rarity).toBe("uncommon");
  });

  it("sets defaultMaxSlots to 100 and maxTotalItems to 500", async () => {
    await import("./InventoryService");
    expect(capturedConfig!["defaultMaxSlots"]).toBe(100);
    expect(capturedConfig!["maxTotalItems"]).toBe(500);
  });

  it("uses correct datastore name", async () => {
    await import("./InventoryService");
    expect(capturedConfig!["datastoreName"]).toBe("TestParkInventory");
  });

  it("delegates getInventory to handle.getInventoryStore", async () => {
    const mod = await import("./InventoryService");
    mod.getInventory(42);
    expect(mockHandle.getInventoryStore).toHaveBeenCalledWith(42);
  });

  it("delegates initPlayerInventory to handle.initPlayer", async () => {
    const mod = await import("./InventoryService");
    mod.initPlayerInventory(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerInventory to handle.cleanupPlayer", async () => {
    const mod = await import("./InventoryService");
    mod.cleanupPlayerInventory(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });
});

// ============================================================================
// PetService
// ============================================================================

describe("PetService (test-park) — deep config", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockHandle = {
      Service: { name: "PetService" },
      getPetRegistry: vi.fn(() => ({ getPet: vi.fn() })),
      getPetStore: vi.fn(() => ({})),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    vi.doMock("@broblox/pets", () => ({
      createPetService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("configures 4 pets", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    expect(pets).toHaveLength(4);
    expect(pets.map((p) => p.id)).toEqual([
      "fire_slime",
      "fire_dragon",
      "water_sprite",
      "shadow_cat",
    ]);
  });

  it("fire_slime evolves into fire_dragon at level 10", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    const slime = pets.find((p) => p.id === "fire_slime");
    expect(slime!.evolvesInto).toBe("fire_dragon");
    expect(slime!.evolveLevel).toBe(10);
  });

  it("fire_dragon is legendary with high base stats", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    const dragon = pets.find((p) => p.id === "fire_dragon");
    expect(dragon!.rarity).toBe("legendary");
    const stats = dragon!.baseStats as Record<string, number>;
    expect(stats.power).toBe(50);
    expect(stats.speed).toBe(40);
  });

  it("each pet has all required stat fields", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    for (const pet of pets) {
      const stats = pet.baseStats as Record<string, number>;
      expect(stats).toHaveProperty("power");
      expect(stats).toHaveProperty("speed");
      expect(stats).toHaveProperty("stamina");
      expect(stats).toHaveProperty("luck");
    }
  });

  it("sets maxEquipped to 3", async () => {
    await import("./PetService");
    expect(capturedConfig!["maxEquipped"]).toBe(3);
  });

  it("uses correct datastore name", async () => {
    await import("./PetService");
    expect(capturedConfig!["datastoreName"]).toBe("TestParkPets");
  });

  it("covers multiple elements: fire, water, dark", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    const elements = new Set(pets.map((p) => p.element));
    expect(elements.has("fire")).toBe(true);
    expect(elements.has("water")).toBe(true);
    expect(elements.has("dark")).toBe(true);
  });

  it("delegates getPetStore to handle", async () => {
    const mod = await import("./PetService");
    mod.getPetStore(42);
    expect(mockHandle.getPetStore).toHaveBeenCalledWith(42);
  });

  it("delegates initPlayerPets to handle.initPlayer", async () => {
    const mod = await import("./PetService");
    mod.initPlayerPets(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });
});
