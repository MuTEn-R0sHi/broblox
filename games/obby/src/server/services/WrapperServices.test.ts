/**
 * Wrapper Service Tests (Obby) — Batch
 *
 * Tests for simple wrapper services that follow the same pattern:
 * createXxxService(config) → { Service, getters, initPlayer, cleanupPlayer }
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── InventoryService ──────────────────────────────────────────────────────

describe("InventoryService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getItemRegistry: ReturnType<typeof vi.fn>;
    getInventoryStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };
  let mockPlayerLifecycle: Record<string, unknown> & {
    onPlayerRemoving: ReturnType<typeof vi.fn>;
    onPlayerAdded: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "InventoryService" },
      getItemRegistry: vi.fn(() => "item-registry"),
      getInventoryStore: vi.fn(() => "inv-store"),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };
    mockPlayerLifecycle = { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() };

    vi.doMock("@broblox/inventory", () => ({
      createInventoryService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));
  });

  it("exports InventoryService and getters", async () => {
    const mod = await import("./InventoryService");
    expect(mod.InventoryService).toBe(mockHandle.Service);
    expect(typeof mod.getItemRegistry).toBe("function");
    expect(typeof mod.getInventory).toBe("function");
    expect(typeof mod.initPlayerInventory).toBe("function");
    expect(typeof mod.cleanupPlayerInventory).toBe("function");
  });

  it("configures 5 obby items", async () => {
    await import("./InventoryService");
    const items = capturedConfig!["items"] as Array<{ id: string }>;
    expect(items).toHaveLength(5);
    expect(items.map((i) => i.id)).toContain("skip_stage");
    expect(items.map((i) => i.id)).toContain("speed_coil");
  });

  it("delegates getInventory to handle.getInventoryStore", async () => {
    const mod = await import("./InventoryService");
    mod.getInventory(42);
    expect(mockHandle.getInventoryStore).toHaveBeenCalledWith(42);
  });

  it("wires lifecycle callbacks", async () => {
    await import("./InventoryService");
    const cb = vi.fn();
    (capturedConfig!["onPlayerRemoving"] as (cb: unknown) => void)(cb);
    expect(mockPlayerLifecycle.onPlayerRemoving).toHaveBeenCalledWith(cb);
  });
});

// ─── PetService ────────────────────────────────────────────────────────────

describe("PetService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getPetRegistry: ReturnType<typeof vi.fn>;
    getPetStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };
  let mockPlayerLifecycle: Record<string, unknown> & {
    onPlayerRemoving: ReturnType<typeof vi.fn>;
    onPlayerAdded: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "PetService" },
      getPetRegistry: vi.fn(() => "pet-registry"),
      getPetStore: vi.fn(() => "pet-store"),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };
    mockPlayerLifecycle = { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() };

    vi.doMock("@broblox/pets", () => ({
      createPetService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));
  });

  it("exports PetService and getters", async () => {
    const mod = await import("./PetService");
    expect(mod.PetService).toBe(mockHandle.Service);
    expect(typeof mod.getPetRegistry).toBe("function");
    expect(typeof mod.getPetStore).toBe("function");
  });

  it("configures 3 obby pets", async () => {
    await import("./PetService");
    const pets = capturedConfig!["pets"] as Array<{ id: string }>;
    expect(pets).toHaveLength(3);
    expect(pets.map((p) => p.id)).toEqual(["cloud_bunny", "spring_frog", "star_phoenix"]);
  });

  it("delegates getPetStore", async () => {
    const mod = await import("./PetService");
    mod.getPetStore(42);
    expect(mockHandle.getPetStore).toHaveBeenCalledWith(42);
  });
});

// ─── CosmeticsService ─────────────────────────────────────────────────────

describe("CosmeticsService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getCosmeticRegistry: ReturnType<typeof vi.fn>;
    getCosmeticStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "CosmeticsService" },
      getCosmeticRegistry: vi.fn(() => "cosmetic-registry"),
      getCosmeticStore: vi.fn(() => "cosmetic-store"),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    vi.doMock("@broblox/cosmetics", () => ({
      createCosmeticsService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports CosmeticsService and getters", async () => {
    const mod = await import("./CosmeticsService");
    expect(mod.CosmeticsService).toBe(mockHandle.Service);
    expect(typeof mod.getCosmeticRegistry).toBe("function");
    expect(typeof mod.getCosmeticStore).toBe("function");
  });

  it("configures 3 obby cosmetics", async () => {
    await import("./CosmeticsService");
    const cosmetics = capturedConfig!["cosmetics"] as Array<{ id: string }>;
    expect(cosmetics).toHaveLength(3);
    expect(cosmetics.map((c) => c.id)).toContain("rainbow_trail");
    expect(cosmetics.map((c) => c.id)).toContain("crown_hat");
  });

  it("delegates getCosmeticStore", async () => {
    const mod = await import("./CosmeticsService");
    mod.getCosmeticStore(42);
    expect(mockHandle.getCosmeticStore).toHaveBeenCalledWith(42);
  });
});

// ─── NotificationService ──────────────────────────────────────────────────

describe("NotificationService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getNotificationStore: ReturnType<typeof vi.fn>;
    getAnnouncementManager: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "NotificationService" },
      getNotificationStore: vi.fn(() => "notif-store"),
      getAnnouncementManager: vi.fn(() => "announce-mgr"),
    };

    vi.doMock("@broblox/notifications", () => ({
      createNotificationService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn() },
    }));
  });

  it("exports NotificationService and getters", async () => {
    const mod = await import("./NotificationService");
    expect(mod.NotificationService).toBe(mockHandle.Service);
    expect(typeof mod.getNotificationStore).toBe("function");
    expect(typeof mod.getAnnouncementManager).toBe("function");
  });

  it("configures welcome announcement", async () => {
    await import("./NotificationService");
    const announcements = capturedConfig!["announcements"] as Array<{ id: string; title: string }>;
    expect(announcements).toHaveLength(1);
    expect(announcements[0].id).toBe("welcome");
  });
});

// ─── CodeRedemptionService ────────────────────────────────────────────────

describe("CodeRedemptionService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getCodeStore: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "CodeRedemptionService" },
      getCodeStore: vi.fn(() => "code-store"),
    };

    vi.doMock("@broblox/codes", () => ({
      createCodeRedemptionService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));
  });

  it("exports CodeRedemptionService and getCodeStore", async () => {
    const mod = await import("./CodeRedemptionService");
    expect(mod.CodeRedemptionService).toBe(mockHandle.Service);
    expect(typeof mod.getCodeStore).toBe("function");
  });

  it("configures 2 promo codes", async () => {
    await import("./CodeRedemptionService");
    const codes = capturedConfig!["codes"] as Array<{ code: string }>;
    expect(codes).toHaveLength(2);
    expect(codes.map((c) => c.code)).toEqual(["OBBY2025", "SPEEDRUN"]);
  });

  it("onRedeem callback is a function", async () => {
    await import("./CodeRedemptionService");
    expect(typeof capturedConfig!["onRedeem"]).toBe("function");
  });
});

// ─── AudioService ─────────────────────────────────────────────────────────

describe("AudioService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getSoundRegistry: ReturnType<typeof vi.fn>;
    getAudioManager: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "AudioService" },
      getSoundRegistry: vi.fn(() => "sound-registry"),
      getAudioManager: vi.fn(() => "audio-manager"),
    };

    vi.doMock("@broblox/audio", () => ({
      createAudioService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
  });

  it("exports AudioService and getters", async () => {
    const mod = await import("./AudioService");
    expect(mod.AudioService).toBe(mockHandle.Service);
    expect(typeof mod.getSoundRegistry).toBe("function");
    expect(typeof mod.getAudioManager).toBe("function");
  });

  it("configures 7 sound entries", async () => {
    await import("./AudioService");
    const sounds = capturedConfig!["sounds"] as unknown[];
    expect(sounds).toHaveLength(7);
  });

  it("configures obby_music playlist as startup", async () => {
    await import("./AudioService");
    expect(capturedConfig!["startupPlaylist"]).toBe("obby_music");
  });
});

// ─── TutorialService ──────────────────────────────────────────────────────

describe("TutorialService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getSequenceRegistry: ReturnType<typeof vi.fn>;
    getTutorialManager: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "TutorialService" },
      getSequenceRegistry: vi.fn(() => "seq-registry"),
      getTutorialManager: vi.fn(() => "tut-manager"),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    vi.doMock("@broblox/tutorial", () => ({
      createTutorialService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports TutorialService and getters", async () => {
    const mod = await import("./TutorialService");
    expect(mod.TutorialService).toBe(mockHandle.Service);
    expect(typeof mod.getSequenceRegistry).toBe("function");
    expect(typeof mod.getTutorialManager).toBe("function");
  });

  it("configures ftue_obby sequence with 4 steps", async () => {
    await import("./TutorialService");
    const seqs = capturedConfig!["sequences"] as Array<{
      id: string;
      steps: unknown[];
    }>;
    expect(seqs).toHaveLength(1);
    expect(seqs[0].id).toBe("ftue_obby");
    expect(seqs[0].steps).toHaveLength(4);
  });
});

// ─── WorldService ─────────────────────────────────────────────────────────

describe("WorldService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { onInit?: () => void; onStart?: () => void; onDestroy?: () => void };
    getWorldManager: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { onInit: vi.fn(), onStart: vi.fn(), onDestroy: vi.fn() },
      getWorldManager: vi.fn(() => "world-manager"),
    };

    vi.doMock("@broblox/world-systems", () => ({
      createWorldService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
      Service: {},
    }));
    vi.doMock("@rbxts/services", () => ({
      CollectionService: { GetTagged: vi.fn(() => []) },
      Players: { GetPlayers: vi.fn(() => []) },
      Workspace: { FindFirstChild: vi.fn(() => undefined) },
    }));
    vi.doMock("shared/worldConfigs", () => ({
      getWorldConfig: vi.fn(() => undefined),
    }));
    vi.doMock("./DataService", () => ({ DataService: {} }));
    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => ({ onEvent: vi.fn(), fireClient: vi.fn() }) },
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn() },
    }));
    vi.doMock("./MovementValidationService", () => ({
      MovementValidationService: { name: "MovementValidationService" },
      movementStateManager: { notifyTeleport: vi.fn() },
    }));
    vi.doMock("./PlayerWorldState", () => ({
      getPlayerWorldId: vi.fn(),
      setPlayerWorld: vi.fn(),
      deletePlayerWorld: vi.fn(),
      clearPlayerWorlds: vi.fn(),
    }));
  });

  it("exports WorldService and getWorldManager", async () => {
    const mod = await import("./WorldService");
    expect(mod.WorldService).toBeDefined();
    expect(typeof mod.WorldService.onInit).toBe("function");
    expect(typeof mod.getWorldManager).toBe("function");
  });

  it("configures 900s cycle duration", async () => {
    await import("./WorldService");
    expect(capturedConfig!["cycleDurationSeconds"]).toBe(900);
    expect(capturedConfig!["startClockTime"]).toBe(10);
  });
});

// ─── LocalizationService ──────────────────────────────────────────────────

describe("LocalizationService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getI18n: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "LocalizationService" },
      getI18n: vi.fn(() => "i18n"),
    };

    vi.doMock("@broblox/localization", () => ({
      createLocalizationService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
  });

  it("exports LocalizationService and getI18n", async () => {
    const mod = await import("./LocalizationService");
    expect(mod.LocalizationService).toBe(mockHandle.Service);
    expect(typeof mod.getI18n).toBe("function");
  });

  it("configures 3 locale/namespace blocks", async () => {
    await import("./LocalizationService");
    const strings = capturedConfig!["strings"] as Array<{
      locale: string;
      namespace: string;
    }>;
    expect(strings).toHaveLength(3);
    expect(strings[0]).toEqual(expect.objectContaining({ locale: "en", namespace: "ui" }));
    expect(strings[1]).toEqual(expect.objectContaining({ locale: "en", namespace: "gameplay" }));
    expect(strings[2]).toEqual(expect.objectContaining({ locale: "es", namespace: "ui" }));
  });
});

// ─── MovementValidationService ────────────────────────────────────────────

describe("MovementValidationService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    stateManager: { reset: ReturnType<typeof vi.fn> };
  };

  beforeEach(() => {
    vi.resetModules();
    // Clear any leftover vi.doMock for this module from other describe blocks
    vi.doUnmock("./MovementValidationService");
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "MovementValidationService" },
      stateManager: { reset: vi.fn() },
    };

    vi.doMock("@broblox/movement", () => ({
      createMovementValidationService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("@broblox/config-featureflags", () => ({
      isFlagEnabled: vi.fn(() => true),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn() },
    }));
  });

  it("exports MovementValidationService and stateManager", async () => {
    const mod = await import("./MovementValidationService");
    expect(mod.MovementValidationService).toBe(mockHandle.Service);
    expect(mod.movementStateManager).toBe(mockHandle.stateManager);
  });

  it("sets teleportDistanceMin to 75 for obby vertical drops", async () => {
    await import("./MovementValidationService");
    const thresholds = capturedConfig!["thresholds"] as Record<string, number>;
    expect(thresholds.teleportDistanceMin).toBe(75);
  });

  it("wires isEnabled to feature flag check", async () => {
    await import("./MovementValidationService");
    const isEnabled = capturedConfig!["isEnabled"] as () => boolean;
    expect(typeof isEnabled).toBe("function");
    expect(isEnabled()).toBe(true);
  });
});

// ─── Trivial wrappers ─────────────────────────────────────────────────────

describe("ChatModerationService (obby)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@broblox/moderation", () => ({
      createChatModerationService: vi.fn(() => ({
        Service: { name: "ChatModerationService" },
      })),
    }));
  });

  it("exports ChatModerationService", async () => {
    const mod = await import("./ChatModerationService");
    expect(mod.ChatModerationService).toBeDefined();
    expect(mod.ChatModerationService.name).toBe("ChatModerationService");
  });
});

describe("ModerationEnforcementService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    vi.doMock("@broblox/moderation", () => ({
      createModerationEnforcementService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return { Service: { name: "ModerationEnforcementService" } };
      }),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerAdded: vi.fn() },
    }));
  });

  it("exports ModerationEnforcementService", async () => {
    const mod = await import("./ModerationEnforcementService");
    expect(mod.ModerationEnforcementService).toBeDefined();
  });

  it("configures ObbyModeration datastore name", async () => {
    await import("./ModerationEnforcementService");
    expect(capturedConfig!["datastoreName"]).toBe("ObbyModeration");
  });
});

describe("FeatureFlagSyncService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    vi.doMock("@broblox/config-featureflags", () => ({
      createFeatureFlagSyncService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return { Service: { name: "FeatureFlagSyncService" } };
      }),
    }));
    vi.doMock("@broblox/constants", () => ({
      BUILD_ENVIRONMENT: "test",
    }));
  });

  it("exports FeatureFlagSyncService", async () => {
    const mod = await import("./FeatureFlagSyncService");
    expect(mod.FeatureFlagSyncService).toBeDefined();
  });

  it("configures ObbyFeatureFlags datastore name", async () => {
    await import("./FeatureFlagSyncService");
    expect(capturedConfig!["datastoreName"]).toBe("ObbyFeatureFlags");
  });
});

describe("PlayerLifecycleService (obby)", () => {
  it("exports a valid PlayerLifecycleService object", async () => {
    const mod = await import("./PlayerLifecycleService");
    expect(mod.PlayerLifecycleService).toBeDefined();
    // Just verify the export is truthy — it's a trivial 9-line wrapper
    // around createPlayerLifecycleService from @broblox/core, which is
    // thoroughly tested at the package level.
    expect(typeof mod.PlayerLifecycleService).toBe("object");
  });
});
