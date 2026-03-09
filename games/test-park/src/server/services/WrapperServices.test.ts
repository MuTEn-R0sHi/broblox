/**
 * Wrapper Service Tests (Test Park) — Batch
 *
 * Tests for wrapper services that delegate to package factories.
 * Validates config values, exports, and lifecycle wiring.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── SecurityService ──────────────────────────────────────────────────────

describe("SecurityService (test-park)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockEnforcer: Record<string, unknown> & {
    handleViolation: ReturnType<typeof vi.fn>;
  };
  let mockModeration: Record<string, unknown> & {
    ban: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockEnforcer = { handleViolation: vi.fn() };
    mockModeration = { ban: vi.fn() };

    vi.doMock("@broblox/security", () => ({
      createSecurityService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return {
          Service: { name: "SecurityService" },
          getEnforcer: () => mockEnforcer,
        };
      }),
    }));
    vi.doMock("@broblox/moderation", () => ({
      getModeration: vi.fn(() => mockModeration),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports SecurityService and enforcer", async () => {
    const mod = await import("./SecurityService");
    expect(mod.SecurityService).toBeDefined();
    expect(mod.enforcer).toBe(mockEnforcer);
  });

  it("onBan bridges to TestParkModeration", async () => {
    await import("./SecurityService");
    const enfConfig = capturedConfig!["enforcementConfig"] as Record<string, unknown>;
    const onBan = enfConfig["onBan"] as (
      player: { UserId: number; Name: string },
      banType: string,
      reason: string,
      durationHours: number
    ) => void;
    onBan({ UserId: 42, Name: "TestPlayer" }, "temporary", "exploit", 24);
    expect(mockModeration.ban).toHaveBeenCalledWith(
      expect.objectContaining({ moderatorId: "system:security" })
    );
  });
});

// ─── RemoteService ────────────────────────────────────────────────────────

describe("RemoteService (test-park)", () => {
  let capturedOptions: Record<string, unknown> | undefined;
  let mockRegistry: Record<string, unknown> & {
    initialize: ReturnType<typeof vi.fn>;
  };
  let mockReportViolation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    capturedOptions = undefined;
    mockRegistry = { initialize: vi.fn() };
    mockReportViolation = vi.fn();

    vi.doMock("@broblox/net", () => ({
      createServerRegistry: vi.fn((_: unknown, opts: Record<string, unknown>) => {
        capturedOptions = opts;
        return mockRegistry;
      }),
    }));
    vi.doMock("@broblox/security", () => ({ reportViolation: mockReportViolation }));
    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() }),
    }));
    vi.doMock("shared/remotes", () => ({
      GameRemotes: {},
      GameRemotesType: {},
    }));
  });

  it("exports RemoteService with getRegistry", async () => {
    const mod = await import("./RemoteService");
    expect(mod.RemoteService).toBeDefined();
    expect(typeof mod.RemoteService.getRegistry).toBe("function");
  });

  it("initializes registry on onInit", async () => {
    const mod = await import("./RemoteService");
    mod.RemoteService.onInit!();
    expect(mockRegistry.initialize).toHaveBeenCalled();
  });

  it("reports security violation on rate limit", async () => {
    const mod = await import("./RemoteService");
    mod.RemoteService.onInit!();
    const onRateLimited = capturedOptions!["onRateLimited"] as (
      player: unknown,
      endpoint: string,
      retryAfterMs: number
    ) => void;
    const player = { Name: "TestPlayer", UserId: 42 };
    onRateLimited(player, "Handshake", 5000);
    expect(mockReportViolation).toHaveBeenCalled();
  });
});

// ─── AudioService ─────────────────────────────────────────────────────────

describe("AudioService (test-park)", () => {
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

  it("delegates getSoundRegistry", async () => {
    const mod = await import("./AudioService");
    const result = mod.getSoundRegistry();
    expect(mockHandle.getSoundRegistry).toHaveBeenCalled();
    expect(result).toBe("sound-registry");
  });

  it("delegates getAudioManager", async () => {
    const mod = await import("./AudioService");
    const result = mod.getAudioManager();
    expect(mockHandle.getAudioManager).toHaveBeenCalled();
    expect(result).toBe("audio-manager");
  });

  it("configures 9 sound entries and lobby_music startup", async () => {
    await import("./AudioService");
    const sounds = capturedConfig!["sounds"] as unknown[];
    expect(sounds).toHaveLength(9);
    expect(capturedConfig!["startupPlaylist"]).toBe("lobby_music");
  });
});

// ─── BattlePassService ────────────────────────────────────────────────────

describe("BattlePassService (test-park)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getSeasonRegistry: ReturnType<typeof vi.fn>;
    getBattlePassStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "BattlePassService" },
      getSeasonRegistry: vi.fn(),
      getBattlePassStore: vi.fn(),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };
    vi.doMock("@broblox/battle-pass", () => ({
      createBattlePassService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports BattlePassService and getters", async () => {
    const mod = await import("./BattlePassService");
    expect(mod.BattlePassService).toBe(mockHandle.Service);
    expect(typeof mod.getBattlePassStore).toBe("function");
  });

  it("delegates getSeasonRegistry", async () => {
    const mod = await import("./BattlePassService");
    mod.getSeasonRegistry();
    expect(mockHandle.getSeasonRegistry).toHaveBeenCalled();
  });

  it("delegates getBattlePassStore", async () => {
    const mod = await import("./BattlePassService");
    mod.getBattlePassStore(42);
    expect(mockHandle.getBattlePassStore).toHaveBeenCalledWith(42);
  });

  it("delegates initPlayerBattlePass", async () => {
    const mod = await import("./BattlePassService");
    mod.initPlayerBattlePass(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerBattlePass", async () => {
    const mod = await import("./BattlePassService");
    mod.cleanupPlayerBattlePass(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });

  it("configures season_1", async () => {
    await import("./BattlePassService");
    const seasons = capturedConfig!["seasons"] as Array<{ id: string }>;
    expect(seasons[0].id).toBe("season_1");
  });
});

// ─── GachaService ─────────────────────────────────────────────────────────

describe("GachaService (test-park)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getEggRegistry: ReturnType<typeof vi.fn>;
    getGachaStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "GachaService" },
      getEggRegistry: vi.fn(() => "egg-reg"),
      getGachaStore: vi.fn(() => "gacha-store"),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };
    vi.doMock("@broblox/gacha", () => ({
      createGachaService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports GachaService and delegates", async () => {
    const mod = await import("./GachaService");
    expect(mod.GachaService).toBe(mockHandle.Service);
    mod.getGachaStore(42);
    expect(mockHandle.getGachaStore).toHaveBeenCalledWith(42);
  });

  it("delegates getEggRegistry", async () => {
    const mod = await import("./GachaService");
    mod.getEggRegistry();
    expect(mockHandle.getEggRegistry).toHaveBeenCalled();
  });

  it("delegates initPlayerGacha", async () => {
    const mod = await import("./GachaService");
    mod.initPlayerGacha(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerGacha", async () => {
    const mod = await import("./GachaService");
    mod.cleanupPlayerGacha(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });

  it("configures basic_egg with coins currency", async () => {
    await import("./GachaService");
    const eggs = capturedConfig!["eggs"] as Array<{ id: string; currency: string }>;
    expect(eggs[0].id).toBe("basic_egg");
    expect(eggs[0].currency).toBe("coins");
  });
});

// ─── InventoryService ─────────────────────────────────────────────────────

describe("InventoryService (test-park)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getItemRegistry: ReturnType<typeof vi.fn>;
    getInventoryStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    mockHandle = {
      Service: { name: "InventoryService" },
      getItemRegistry: vi.fn(),
      getInventoryStore: vi.fn(),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };
    vi.doMock("@broblox/inventory", () => ({
      createInventoryService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports InventoryService and delegates", async () => {
    const mod = await import("./InventoryService");
    expect(mod.InventoryService).toBe(mockHandle.Service);
    mod.getInventory(42);
    expect(mockHandle.getInventoryStore).toHaveBeenCalledWith(42);
  });

  it("delegates getItemRegistry", async () => {
    const mod = await import("./InventoryService");
    mod.getItemRegistry();
    expect(mockHandle.getItemRegistry).toHaveBeenCalled();
  });

  it("delegates initPlayerInventory", async () => {
    const mod = await import("./InventoryService");
    mod.initPlayerInventory(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerInventory", async () => {
    const mod = await import("./InventoryService");
    mod.cleanupPlayerInventory(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });

  it("configures test-park items", async () => {
    await import("./InventoryService");
    const items = capturedConfig!["items"] as Array<{ id: string }>;
    expect(items.length).toBeGreaterThan(0);
  });
});

// ─── PetService ───────────────────────────────────────────────────────────

describe("PetService (test-park)", () => {
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getPetRegistry: ReturnType<typeof vi.fn>;
    getPetStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    mockHandle = {
      Service: { name: "PetService" },
      getPetRegistry: vi.fn(),
      getPetStore: vi.fn(),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };
    vi.doMock("@broblox/pets", () => ({
      createPetService: vi.fn(() => mockHandle),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports PetService and delegates", async () => {
    const mod = await import("./PetService");
    expect(mod.PetService).toBe(mockHandle.Service);
    mod.getPetStore(42);
    expect(mockHandle.getPetStore).toHaveBeenCalledWith(42);
  });

  it("delegates getPetRegistry", async () => {
    const mod = await import("./PetService");
    mod.getPetRegistry();
    expect(mockHandle.getPetRegistry).toHaveBeenCalled();
  });

  it("delegates initPlayerPets", async () => {
    const mod = await import("./PetService");
    mod.initPlayerPets(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerPets", async () => {
    const mod = await import("./PetService");
    mod.cleanupPlayerPets(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });
});

// ─── CosmeticsService ────────────────────────────────────────────────────

describe("CosmeticsService (test-park)", () => {
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getCosmeticRegistry: ReturnType<typeof vi.fn>;
    getCosmeticStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    mockHandle = {
      Service: { name: "CosmeticsService" },
      getCosmeticRegistry: vi.fn(),
      getCosmeticStore: vi.fn(),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };
    vi.doMock("@broblox/cosmetics", () => ({
      createCosmeticsService: vi.fn(() => mockHandle),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports CosmeticsService and delegates", async () => {
    const mod = await import("./CosmeticsService");
    expect(mod.CosmeticsService).toBe(mockHandle.Service);
    mod.getCosmeticStore(42);
    expect(mockHandle.getCosmeticStore).toHaveBeenCalledWith(42);
  });

  it("delegates getCosmeticRegistry", async () => {
    const mod = await import("./CosmeticsService");
    mod.getCosmeticRegistry();
    expect(mockHandle.getCosmeticRegistry).toHaveBeenCalled();
  });

  it("delegates initPlayerCosmetics", async () => {
    const mod = await import("./CosmeticsService");
    mod.initPlayerCosmetics(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerCosmetics", async () => {
    const mod = await import("./CosmeticsService");
    mod.cleanupPlayerCosmetics(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });
});

// ─── NotificationService ─────────────────────────────────────────────────

describe("NotificationService (test-park)", () => {
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
      getNotificationStore: vi.fn(),
      getAnnouncementManager: vi.fn(() => ({ addNews: vi.fn() })),
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

  it("exports NotificationService", async () => {
    const mod = await import("./NotificationService");
    expect(mod.NotificationService).toBe(mockHandle.Service);
  });

  it("delegates getNotificationStore", async () => {
    const mod = await import("./NotificationService");
    mod.getNotificationStore();
    expect(mockHandle.getNotificationStore).toHaveBeenCalled();
  });

  it("delegates getAnnouncementManager", async () => {
    const mod = await import("./NotificationService");
    mod.getAnnouncementManager();
    expect(mockHandle.getAnnouncementManager).toHaveBeenCalled();
  });

  it("configures welcome announcement", async () => {
    await import("./NotificationService");
    const announcements = capturedConfig!["announcements"] as Array<{ id: string }>;
    expect(announcements[0].id).toBe("welcome");
  });
});

// ─── CodeRedemptionService ───────────────────────────────────────────────

describe("CodeRedemptionService (test-park)", () => {
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
      getCodeStore: vi.fn(),
    };
    vi.doMock("@broblox/codes", () => ({
      createCodeRedemptionService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return mockHandle;
      }),
    }));
    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() }),
    }));
  });

  it("exports CodeRedemptionService", async () => {
    const mod = await import("./CodeRedemptionService");
    expect(mod.CodeRedemptionService).toBe(mockHandle.Service);
  });

  it("delegates getCodeStore", async () => {
    const mod = await import("./CodeRedemptionService");
    mod.getCodeStore();
    expect(mockHandle.getCodeStore).toHaveBeenCalled();
  });

  it("configures test-park promo codes", async () => {
    await import("./CodeRedemptionService");
    const codes = capturedConfig!["codes"] as Array<{ code: string }>;
    expect(codes.length).toBeGreaterThan(0);
  });
});

// ─── LeaderboardService ──────────────────────────────────────────────────

describe("LeaderboardService (test-park)", () => {
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getLeaderboardStore: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    mockHandle = {
      Service: { name: "LeaderboardService" },
      getLeaderboardStore: vi.fn(),
    };
    vi.doMock("@broblox/leaderboards", () => ({
      createLeaderboardService: vi.fn(() => mockHandle),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports LeaderboardService", async () => {
    const mod = await import("./LeaderboardService");
    expect(mod.LeaderboardService).toBeDefined();
  });

  it("delegates getLeaderboardStore", async () => {
    const mod = await import("./LeaderboardService");
    mod.getLeaderboardStore();
    expect(mockHandle.getLeaderboardStore).toHaveBeenCalled();
  });
});

// ─── LocalizationService ─────────────────────────────────────────────────

describe("LocalizationService (test-park)", () => {
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getI18n: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    mockHandle = {
      Service: { name: "LocalizationService" },
      getI18n: vi.fn(),
    };
    vi.doMock("@broblox/localization", () => ({
      createLocalizationService: vi.fn(() => mockHandle),
    }));
  });

  it("exports LocalizationService and getI18n", async () => {
    const mod = await import("./LocalizationService");
    expect(mod.LocalizationService).toBe(mockHandle.Service);
    expect(typeof mod.getI18n).toBe("function");
  });

  it("delegates getI18n", async () => {
    const mod = await import("./LocalizationService");
    mod.getI18n();
    expect(mockHandle.getI18n).toHaveBeenCalled();
  });
});

// ─── TutorialService ─────────────────────────────────────────────────────

describe("TutorialService (test-park)", () => {
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getSequenceRegistry: ReturnType<typeof vi.fn>;
    getTutorialManager: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    mockHandle = {
      Service: { name: "TutorialService" },
      getSequenceRegistry: vi.fn(),
      getTutorialManager: vi.fn(),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };
    vi.doMock("@broblox/tutorial", () => ({
      createTutorialService: vi.fn(() => mockHandle),
    }));
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() },
    }));
  });

  it("exports TutorialService and getters", async () => {
    const mod = await import("./TutorialService");
    expect(mod.TutorialService).toBe(mockHandle.Service);
    expect(typeof mod.getSequenceRegistry).toBe("function");
  });

  it("delegates getSequenceRegistry", async () => {
    const mod = await import("./TutorialService");
    mod.getSequenceRegistry();
    expect(mockHandle.getSequenceRegistry).toHaveBeenCalled();
  });

  it("delegates getTutorialManager", async () => {
    const mod = await import("./TutorialService");
    mod.getTutorialManager(42);
    expect(mockHandle.getTutorialManager).toHaveBeenCalledWith(42);
  });

  it("delegates initPlayerTutorial", async () => {
    const mod = await import("./TutorialService");
    mod.initPlayerTutorial(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerTutorial", async () => {
    const mod = await import("./TutorialService");
    mod.cleanupPlayerTutorial(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });
});

// ─── WorldService ─────────────────────────────────────────────────────────

describe("WorldService (test-park)", () => {
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getWorldManager: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    mockHandle = {
      Service: { name: "WorldService" },
      getWorldManager: vi.fn(),
    };
    vi.doMock("@broblox/world-systems", () => ({
      createWorldService: vi.fn(() => mockHandle),
    }));
  });

  it("exports WorldService and getWorldManager", async () => {
    const mod = await import("./WorldService");
    expect(mod.WorldService).toBe(mockHandle.Service);
    expect(typeof mod.getWorldManager).toBe("function");
  });

  it("delegates getWorldManager", async () => {
    const mod = await import("./WorldService");
    mod.getWorldManager();
    expect(mockHandle.getWorldManager).toHaveBeenCalled();
  });
});

// ─── Trivial wrappers ─────────────────────────────────────────────────────

describe("ChatModerationService (test-park)", () => {
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
  });
});

describe("ModerationEnforcementService (test-park)", () => {
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

  it("configures TestParkModeration datastore name", async () => {
    await import("./ModerationEnforcementService");
    expect(capturedConfig!["datastoreName"]).toBe("TestParkModeration");
  });
});

describe("FeatureFlagSyncService (test-park)", () => {
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

  it("configures TestParkFeatureFlags datastore name", async () => {
    await import("./FeatureFlagSyncService");
    expect(capturedConfig!["datastoreName"]).toBe("TestParkFeatureFlags");
  });
});

describe("MovementValidationService (test-park)", () => {
  let capturedConfig: Record<string, unknown> | undefined;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;
    vi.doMock("@broblox/movement", () => ({
      createMovementValidationService: vi.fn((c: Record<string, unknown>) => {
        capturedConfig = c;
        return {
          Service: { name: "MovementValidationService" },
          stateManager: { reset: vi.fn() },
        };
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
    expect(mod.MovementValidationService).toBeDefined();
    expect(mod.movementStateManager).toBeDefined();
  });

  it("wires isEnabled to feature flag", async () => {
    await import("./MovementValidationService");
    const isEnabled = capturedConfig!["isEnabled"] as () => boolean;
    expect(isEnabled()).toBe(true);
  });
});

describe("PlayerLifecycleService (test-park)", () => {
  it("exports a valid PlayerLifecycleService object", async () => {
    const mod = await import("./PlayerLifecycleService");
    expect(mod.PlayerLifecycleService).toBeDefined();
    expect(typeof mod.PlayerLifecycleService).toBe("object");
  });
});
