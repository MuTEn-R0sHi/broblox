/**
 * Low-Coverage Service Tests — Obby Game
 *
 * Deep tests for the 4 wrapper services with thin existing coverage:
 * - TutorialService (ftue_obby sequence, 4 steps, no prerequisites)
 * - NotificationService (maxQueue, durations, welcome announcement)
 * - CosmeticsService (3 cosmetics, categories, rarities, tradeable/limited)
 * - PetService (3 pets, maxEquipped=1, elements, levelCaps)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// TutorialService (obby)
// ============================================================================

describe("TutorialService (obby) — deep config", () => {
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

  it("configures exactly 1 sequence (ftue_obby)", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    expect(sequences).toHaveLength(1);
    expect(sequences[0].id).toBe("ftue_obby");
    expect(sequences[0].name).toBe("Obby Basics");
  });

  it("ftue_obby has exactly 4 steps in correct order", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    const steps = sequences[0].steps as Array<Record<string, unknown>>;
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.id)).toEqual(["welcome", "move", "checkpoint", "done"]);
  });

  it("step types alternate dialog → action → action → dialog", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    const steps = sequences[0].steps as Array<Record<string, unknown>>;
    expect(steps.map((s) => s.stepType)).toEqual(["dialog", "action", "action", "dialog"]);
  });

  it("movement step listens for first_move action", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    const steps = sequences[0].steps as Array<Record<string, unknown>>;
    const moveStep = steps[1];
    const condition = moveStep.condition as Record<string, string>;
    expect(condition.type).toBe("action");
    expect(condition.actionId).toBe("first_move");
  });

  it("checkpoint step listens for first_checkpoint action", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    const steps = sequences[0].steps as Array<Record<string, unknown>>;
    const checkpointStep = steps[2];
    const condition = checkpointStep.condition as Record<string, string>;
    expect(condition.type).toBe("action");
    expect(condition.actionId).toBe("first_checkpoint");
  });

  it("ftue_obby has no prerequisites", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    expect(sequences[0].prerequisites).toEqual([]);
  });

  it("all steps are skippable", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    const steps = sequences[0].steps as Array<Record<string, unknown>>;
    for (const step of steps) {
      expect(step.skippable).toBe(true);
    }
  });

  it("sequence is persistent (survives session)", async () => {
    await import("./TutorialService");
    const sequences = capturedConfig!["sequences"] as Array<Record<string, unknown>>;
    expect(sequences[0].persistent).toBe(true);
  });

  it("uses correct datastore name", async () => {
    await import("./TutorialService");
    expect(capturedConfig!["datastoreName"]).toBe("ObbyTutorial");
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

  it("delegates cleanupPlayerTutorial to handle.cleanupPlayer", async () => {
    const mod = await import("./TutorialService");
    mod.cleanupPlayerTutorial(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });
});

// ============================================================================
// NotificationService (obby)
// ============================================================================

describe("NotificationService (obby) — deep config", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockHandle = {
      Service: { name: "NotificationService" },
      getNotificationStore: vi.fn(() => ({})),
      getAnnouncementManager: vi.fn(() => ({})),
    };

    vi.doMock("@broblox/notifications", () => ({
      createNotificationService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn() },
    }));
  });

  it("sets maxQueueSize to 10", async () => {
    await import("./NotificationService");
    const nc = capturedConfig!["notificationsConfig"] as Record<string, unknown>;
    expect(nc.maxQueueSize).toBe(10);
  });

  it("configures 4 duration tiers", async () => {
    await import("./NotificationService");
    const nc = capturedConfig!["notificationsConfig"] as Record<string, unknown>;
    const durations = nc.durations as Record<string, number>;
    expect(durations).toEqual({ short: 3, medium: 5, long: 10, persistent: 0 });
  });

  it("enables logging", async () => {
    await import("./NotificationService");
    const nc = capturedConfig!["notificationsConfig"] as Record<string, unknown>;
    expect(nc.enableLogging).toBe(true);
  });

  it("configures exactly 1 welcome announcement", async () => {
    await import("./NotificationService");
    const announcements = capturedConfig!["announcements"] as Array<Record<string, unknown>>;
    expect(announcements).toHaveLength(1);
    expect(announcements[0].id).toBe("welcome");
    expect(announcements[0].title).toBe("Welcome to the Obby!");
  });

  it("welcome announcement is normal priority with long duration", async () => {
    await import("./NotificationService");
    const announcements = capturedConfig!["announcements"] as Array<Record<string, unknown>>;
    expect(announcements[0].priority).toBe("normal");
    expect(announcements[0].duration).toBe("long");
  });

  it("welcome announcement does not repeat (repeatInterval=0)", async () => {
    await import("./NotificationService");
    const announcements = capturedConfig!["announcements"] as Array<Record<string, unknown>>;
    expect(announcements[0].repeatInterval).toBe(0);
  });

  it("only wires onPlayerRemoving (no onPlayerAdded)", async () => {
    await import("./NotificationService");
    expect(capturedConfig!["onPlayerRemoving"]).toBeDefined();
    expect(capturedConfig!["onPlayerAdded"]).toBeUndefined();
  });

  it("delegates getNotificationStore to handle", async () => {
    const mod = await import("./NotificationService");
    mod.getNotificationStore();
    expect(mockHandle.getNotificationStore).toHaveBeenCalled();
  });

  it("delegates getAnnouncementManager to handle", async () => {
    const mod = await import("./NotificationService");
    mod.getAnnouncementManager();
    expect(mockHandle.getAnnouncementManager).toHaveBeenCalled();
  });
});

// ============================================================================
// CosmeticsService (obby)
// ============================================================================

describe("CosmeticsService (obby) — deep config", () => {
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

  it("configures exactly 3 cosmetics", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    expect(cosmetics).toHaveLength(3);
    expect(cosmetics.map((c) => c.id)).toEqual(["rainbow_trail", "crown_hat", "sparkle_effect"]);
  });

  it("covers 3 categories: trail, hat, effect", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    const categories = cosmetics.map((c) => c.category);
    expect(categories).toContain("trail");
    expect(categories).toContain("hat");
    expect(categories).toContain("effect");
  });

  it("rainbow_trail is rare and tradeable", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    const trail = cosmetics.find((c) => c.id === "rainbow_trail");
    expect(trail!.rarity).toBe("rare");
    expect(trail!.tradeable).toBe(true);
    expect(trail!.limited).toBe(false);
  });

  it("crown_hat is legendary, limited, and NOT tradeable", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    const crown = cosmetics.find((c) => c.id === "crown_hat");
    expect(crown!.rarity).toBe("legendary");
    expect(crown!.limited).toBe(true);
    expect(crown!.tradeable).toBe(false);
  });

  it("sparkle_effect is uncommon and not limited", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<Record<string, unknown>>;
    const sparkle = cosmetics.find((c) => c.id === "sparkle_effect");
    expect(sparkle!.rarity).toBe("uncommon");
    expect(sparkle!.limited).toBe(false);
    expect(sparkle!.tradeable).toBe(true);
  });

  it("uses correct datastore name", async () => {
    await import("./CosmeticsService");
    expect(capturedConfig!["datastoreName"]).toBe("ObbyCosmetics");
  });

  it("wires both lifecycle hooks", async () => {
    await import("./CosmeticsService");
    expect(capturedConfig!["onPlayerRemoving"]).toBeDefined();
    expect(capturedConfig!["onPlayerAdded"]).toBeDefined();
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

  it("delegates cleanupPlayerCosmetics to handle.cleanupPlayer", async () => {
    const mod = await import("./CosmeticsService");
    mod.cleanupPlayerCosmetics(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });
});

// ============================================================================
// PetService (obby)
// ============================================================================

describe("PetService (obby) — deep config", () => {
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

  it("configures exactly 3 pets in correct order", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    expect(pets).toHaveLength(3);
    expect(pets.map((p) => p.id)).toEqual(["cloud_bunny", "spring_frog", "star_phoenix"]);
  });

  it("cloud_bunny is common air element with speed-focused stats", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    const bunny = pets.find((p) => p.id === "cloud_bunny");
    expect(bunny!.rarity).toBe("common");
    expect(bunny!.element).toBe("air");
    const stats = bunny!.baseStats as Record<string, number>;
    expect(stats.speed).toBe(15);
    expect(stats.power).toBe(5);
  });

  it("spring_frog is uncommon earth element with high stamina", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    const frog = pets.find((p) => p.id === "spring_frog");
    expect(frog!.rarity).toBe("uncommon");
    expect(frog!.element).toBe("earth");
    const stats = frog!.baseStats as Record<string, number>;
    expect(stats.stamina).toBe(14);
  });

  it("star_phoenix is legendary fire with highest stats", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    const phoenix = pets.find((p) => p.id === "star_phoenix");
    expect(phoenix!.rarity).toBe("legendary");
    expect(phoenix!.element).toBe("fire");
    const stats = phoenix!.baseStats as Record<string, number>;
    expect(stats.power).toBe(20);
    expect(stats.speed).toBe(25);
    expect(stats.stamina).toBe(30);
    expect(stats.luck).toBe(15);
  });

  it("star_phoenix has max level 20 (double common cap)", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    const phoenix = pets.find((p) => p.id === "star_phoenix");
    expect(phoenix!.maxLevel).toBe(20);
    const bunny = pets.find((p) => p.id === "cloud_bunny");
    expect(bunny!.maxLevel).toBe(10);
  });

  it("no obby pets have evolution (unlike test-park)", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    for (const pet of pets) {
      expect(pet.evolvesInto).toBeUndefined();
      expect(pet.evolveLevel).toBeUndefined();
    }
  });

  it("sets maxEquipped to 1 (obby limit vs test-park's 3)", async () => {
    await import("./PetService");
    expect(capturedConfig!["maxEquipped"]).toBe(1);
  });

  it("uses correct datastore name", async () => {
    await import("./PetService");
    expect(capturedConfig!["datastoreName"]).toBe("ObbyPets");
  });

  it("each pet has all 4 stat fields", async () => {
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

  it("growth rates increase with rarity", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<Record<string, unknown>>;
    const bunny = pets.find((p) => p.id === "cloud_bunny");
    const frog = pets.find((p) => p.id === "spring_frog");
    const phoenix = pets.find((p) => p.id === "star_phoenix");
    expect((bunny!.growthRate as number) < (frog!.growthRate as number)).toBe(true);
    expect((frog!.growthRate as number) < (phoenix!.growthRate as number)).toBe(true);
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

  it("delegates cleanupPlayerPets to handle.cleanupPlayer", async () => {
    const mod = await import("./PetService");
    mod.cleanupPlayerPets(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });
});
