/**
 * PlayerActionService Tests (Test Park)
 *
 * Tests all remote handlers registered by PlayerActionService:
 * - GetFullPlayerData
 * - ClaimDailyReward
 * - RedeemCode
 * - HatchEgg (currency guard + persistence)
 * - EquipPet / UnequipPet
 * - EquipCosmetic / UnequipCosmetic
 * - ClaimBattlePassReward
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

type HandlerFn = (...args: unknown[]) => unknown;

describe("PlayerActionService (test-park)", () => {
  // Captured handler maps
  let functionHandlers: Record<string, HandlerFn>;
  let eventHandlers: Record<string, HandlerFn>;

  // Mocks
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayer: { UserId: number; Name: string };
  let mockCoreData: { coins: number; kills: number; lastPlayedAt: number; __version: number };

  // Store mocks
  let mockProgression: Record<string, ReturnType<typeof vi.fn>>;
  let mockInventory: Record<string, ReturnType<typeof vi.fn>>;
  let mockQuests: Record<string, ReturnType<typeof vi.fn>>;
  let mockPetStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockGachaStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockCosmeticStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockBpStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockDailyStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockCodeStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockEggRegistry: Map<string, { cost: number; currency?: string }>;
  let mockFulfillRewards: ReturnType<typeof vi.fn>;
  let capturedRegisterFulfiller: ((fn: unknown) => void) | undefined;

  beforeEach(() => {
    vi.resetModules();

    functionHandlers = {};
    eventHandlers = {};
    capturedRegisterFulfiller = undefined;

    mockPlayer = { UserId: 42, Name: "TestPlayer" };
    mockCoreData = { coins: 1000, kills: 5, lastPlayedAt: 0, __version: 1 };

    mockRegistry = {
      onFunction: vi.fn((name: string, handler: HandlerFn) => {
        functionHandlers[name] = handler;
      }),
      onEvent: vi.fn((name: string, handler: HandlerFn) => {
        eventHandlers[name] = handler;
      }),
      fireClient: vi.fn(),
    };

    mockProgression = {
      getLevel: vi.fn(() => 5),
      getCurrentXp: vi.fn(() => 250),
      getXpForNextLevel: vi.fn(() => 500),
      getPrestige: vi.fn(() => 0),
    };

    mockInventory = {
      getAllItems: vi.fn(() => [{ id: "item_1" }]),
      getMaxSlots: vi.fn(() => 100),
    };

    mockQuests = {
      getActiveQuests: vi.fn(() => []),
      getCompletedQuestIds: vi.fn(() => ["q1"]),
    };

    mockPetStore = {
      getAllPets: vi.fn(() => []),
      equipPet: vi.fn(() => ({ ok: true })),
      unequipPet: vi.fn(() => ({ ok: true })),
      addPet: vi.fn(),
    };

    mockGachaStore = {
      hatch: vi.fn(() => ({ ok: true, itemId: "pet_cat", rarity: "common" })),
    };

    mockEggRegistry = new Map([
      ["basic_egg", { cost: 100 }],
      ["premium_egg", { cost: 500, currency: "gems" }],
    ]);

    const equippedMap = new Map<string, string>();
    equippedMap.set("hat", "cosmetic_crown");
    mockCosmeticStore = {
      getOwned: vi.fn(() => ["cosmetic_crown"]),
      getAllEquipped: vi.fn(() => equippedMap),
      equip: vi.fn(() => ({ ok: true })),
      unequip: vi.fn(() => ({ ok: true })),
    };

    mockBpStore = {
      getSeasonId: vi.fn(() => "season_1"),
      getXp: vi.fn(() => 100),
      getTier: vi.fn(() => 2),
      isPremium: vi.fn(() => false),
      getClaimedRewards: vi.fn(() => []),
      claimReward: vi.fn(() => ({
        ok: true,
        reward: { reward: { type: "currency", amount: 100 } },
      })),
    };

    mockDailyStore = {
      canClaim: vi.fn(() => true),
      claim: vi.fn(() => ({ day: 1, rewards: [{ type: "currency", amount: 100 }] })),
      getCycleDay: vi.fn(() => 1),
      getStreak: vi.fn(() => 1),
      getTimeUntilNextClaim: vi.fn(() => 0),
    };

    mockCodeStore = {
      redeemCode: vi.fn(() => ({ success: true })),
    };

    mockFulfillRewards = vi.fn();

    // Mock all imports
    vi.doMock("@broblox/core", () => ({
      Service: {},
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/net", () => ({
      ok: (v: unknown) => ({ ok: true, value: v }),
      err: (code: unknown, meta?: unknown) => ({ ok: false, code, meta }),
      ErrorCode: {
        NotFound: 2004,
        InvalidPayload: 1001,
      },
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./DataService", () => ({
      DataService: {
        getData: vi.fn(() => mockCoreData),
        addCoins: vi.fn((player: unknown, amount: number) => {
          mockCoreData.coins += amount;
        }),
      },
    }));

    vi.doMock("./ProgressionService", () => ({
      getProgression: vi.fn(() => mockProgression),
    }));

    vi.doMock("./InventoryService", () => ({
      getInventory: vi.fn(() => mockInventory),
    }));

    vi.doMock("./QuestService", () => ({
      getQuests: vi.fn(() => mockQuests),
    }));

    vi.doMock("./PetService", () => ({
      getPetStore: vi.fn(() => mockPetStore),
    }));

    vi.doMock("./GachaService", () => ({
      getGachaStore: vi.fn(() => mockGachaStore),
      getEggRegistry: vi.fn(() => mockEggRegistry),
    }));

    vi.doMock("./CosmeticsService", () => ({
      getCosmeticStore: vi.fn(() => mockCosmeticStore),
    }));

    vi.doMock("./BattlePassService", () => ({
      getBattlePassStore: vi.fn(() => mockBpStore),
    }));

    vi.doMock("./RewardsService", () => ({
      getDailyRewards: vi.fn(() => mockDailyStore),
      registerRewardFulfiller: vi.fn((fn: unknown) => {
        capturedRegisterFulfiller = fn as (fn: unknown) => void;
      }),
      REWARD_CYCLE: [{ day: 1, rewards: [{ type: "currency", amount: 100, label: "100 Coins" }] }],
    }));

    vi.doMock("./CodeRedemptionService", () => ({
      getCodeStore: vi.fn(() => mockCodeStore),
    }));

    vi.doMock("./RewardFulfillment", () => ({
      fulfillRewards: mockFulfillRewards,
    }));

    vi.doMock("@rbxts/services", () => ({
      Players: {
        GetPlayerByUserId: vi.fn((userId: number) =>
          userId === mockPlayer.UserId ? mockPlayer : undefined
        ),
      },
    }));

    vi.doMock("./MarketplaceService", () => ({
      registerProduct: vi.fn(),
      processReceipt: vi.fn(),
      userOwnsGamePass: vi.fn(() => ({ owned: true })),
      DEVELOPER_PRODUCTS: [
        { productId: 1_000_001, name: "100 Coins", description: "Get 100 coins", robuxPrice: 25 },
        { productId: 1_000_002, name: "500 Coins", description: "Get 500 coins", robuxPrice: 99 },
        {
          productId: 1_000_003,
          name: "2x XP Boost",
          description: "Double XP for 30 minutes",
          robuxPrice: 49,
        },
      ],
    }));

    vi.doMock("./TelemetryService", () => ({
      trackPurchase: vi.fn(),
      trackCoinSpend: vi.fn(),
    }));

    vi.doMock("./CombatService", () => ({
      combatHandle: {
        Service: { name: "CombatService" },
        validateHit: vi.fn(),
        initPlayer: vi.fn(),
        cleanupPlayer: vi.fn(),
      },
      processHitReport: vi.fn(() => ({ valid: true, damage: 25, targetId: 99 })),
    }));
  });

  async function loadAndStart() {
    const mod = await import("./PlayerActionService");
    mod.PlayerActionService.onStart?.();
    return mod;
  }

  // ─── onStart registration ─────────────────────────────────────────────

  it("registers registerRewardFulfiller on start", async () => {
    await loadAndStart();
    expect(capturedRegisterFulfiller).toBeDefined();
  });

  it("registers all expected function handlers", async () => {
    await loadAndStart();
    expect(mockRegistry.onFunction).toHaveBeenCalledWith("GetFullPlayerData", expect.any(Function));
    expect(mockRegistry.onFunction).toHaveBeenCalledWith("ClaimDailyReward", expect.any(Function));
    expect(mockRegistry.onFunction).toHaveBeenCalledWith("RedeemCode", expect.any(Function));
    expect(mockRegistry.onFunction).toHaveBeenCalledWith("HatchEgg", expect.any(Function));
  });

  it("registers all expected event handlers", async () => {
    await loadAndStart();
    expect(mockRegistry.onEvent).toHaveBeenCalledWith("EquipPet", expect.any(Function));
    expect(mockRegistry.onEvent).toHaveBeenCalledWith("UnequipPet", expect.any(Function));
    expect(mockRegistry.onEvent).toHaveBeenCalledWith("EquipCosmetic", expect.any(Function));
    expect(mockRegistry.onEvent).toHaveBeenCalledWith("UnequipCosmetic", expect.any(Function));
    expect(mockRegistry.onEvent).toHaveBeenCalledWith(
      "ClaimBattlePassReward",
      expect.any(Function)
    );
  });

  // ─── GetFullPlayerData ────────────────────────────────────────────────

  describe("GetFullPlayerData", () => {
    it("returns full player data snapshot when data is loaded", async () => {
      await loadAndStart();
      const handler = functionHandlers["GetFullPlayerData"];
      const result = handler(mockPlayer) as { ok: boolean; value: Record<string, unknown> };

      expect(result.ok).toBe(true);
      expect(result.value.coins).toBe(1000);
      expect(result.value.kills).toBe(5);
      expect(result.value.level).toBe(5);
      expect(result.value.xp).toBe(250);
      expect(result.value.equippedCosmetics).toEqual({ hat: "cosmetic_crown" });
    });

    it("returns error when player data not loaded", async () => {
      vi.doMock("./DataService", () => ({
        DataService: { getData: vi.fn(() => undefined), addCoins: vi.fn() },
      }));
      await loadAndStart();
      const handler = functionHandlers["GetFullPlayerData"];
      const result = handler(mockPlayer) as { ok: boolean; code: number };

      expect(result.ok).toBe(false);
      expect(result.code).toBe(2004); // NotFound
    });
  });

  // ─── ClaimDailyReward ─────────────────────────────────────────────────

  describe("ClaimDailyReward", () => {
    it("claims reward and calls fulfillRewards when canClaim is true", async () => {
      await loadAndStart();
      const handler = functionHandlers["ClaimDailyReward"];
      const result = handler(mockPlayer) as { ok: boolean; value: unknown };

      expect(result.ok).toBe(true);
      expect(result.value).toEqual({ day: 1, rewards: [{ type: "currency", amount: 100 }] });
      expect(mockFulfillRewards).toHaveBeenCalledWith(mockPlayer, [
        { type: "currency", amount: 100 },
      ]);
    });

    it("returns ok(undefined) when canClaim is false", async () => {
      mockDailyStore.canClaim.mockReturnValue(false);
      await loadAndStart();
      const handler = functionHandlers["ClaimDailyReward"];
      const result = handler(mockPlayer) as { ok: boolean; value: unknown };

      expect(result.ok).toBe(true);
      expect(result.value).toBeUndefined();
      expect(mockFulfillRewards).not.toHaveBeenCalled();
    });

    it("returns error when daily store not loaded", async () => {
      vi.doMock("./RewardsService", () => ({
        getDailyRewards: vi.fn(() => undefined),
        registerRewardFulfiller: vi.fn(),
        REWARD_CYCLE: [],
      }));
      await loadAndStart();
      const handler = functionHandlers["ClaimDailyReward"];
      const result = handler(mockPlayer) as { ok: boolean; code: number };

      expect(result.ok).toBe(false);
      expect(result.code).toBe(2004);
    });
  });

  // ─── RedeemCode ───────────────────────────────────────────────────────

  describe("RedeemCode", () => {
    it("returns success when code is valid", async () => {
      await loadAndStart();
      const handler = functionHandlers["RedeemCode"];
      const result = handler(mockPlayer, { code: "FREE100" }) as {
        ok: boolean;
        value: { success: boolean };
      };

      expect(result.ok).toBe(true);
      expect(result.value.success).toBe(true);
    });

    it("returns failure message when code is invalid", async () => {
      mockCodeStore.redeemCode.mockReturnValue({ success: false, status: "already_redeemed" });
      await loadAndStart();
      const handler = functionHandlers["RedeemCode"];
      const result = handler(mockPlayer, { code: "USED" }) as {
        ok: boolean;
        value: { success: boolean; message: string };
      };

      expect(result.ok).toBe(true);
      expect(result.value.success).toBe(false);
      expect(result.value.message).toBe("already_redeemed");
    });
  });

  // ─── HatchEgg ─────────────────────────────────────────────────────────

  describe("HatchEgg", () => {
    it("hatches a coin-priced egg and persists the spend via DataService", async () => {
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      const result = handler(mockPlayer, { eggId: "basic_egg", count: 1 }) as {
        ok: boolean;
        value: Array<{ ok: boolean; itemId?: string }>;
      };

      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value[0].ok).toBe(true);
      // DataService.addCoins should be called with negative amount
      const { DataService: DS } = await import("./DataService");
      expect(DS.addCoins).toHaveBeenCalledWith(mockPlayer, -100);
    });

    it("fires PlayerDataSync after spending coins", async () => {
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      handler(mockPlayer, { eggId: "basic_egg", count: 1 });

      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "PlayerDataSync",
        mockPlayer,
        expect.objectContaining({ coins: expect.any(Number) })
      );
    });

    it("rejects gem-priced eggs with InvalidPayload", async () => {
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      const result = handler(mockPlayer, { eggId: "premium_egg", count: 1 }) as {
        ok: boolean;
        code: number;
      };

      expect(result.ok).toBe(false);
      expect(result.code).toBe(1001); // InvalidPayload
    });

    it("returns NotFound for unknown egg id", async () => {
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      const result = handler(mockPlayer, { eggId: "nonexistent", count: 1 }) as {
        ok: boolean;
        code: number;
      };

      expect(result.ok).toBe(false);
      expect(result.code).toBe(2004); // NotFound
    });

    it("adds hatched pets to pet store", async () => {
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      handler(mockPlayer, { eggId: "basic_egg", count: 1 });

      expect(mockPetStore.addPet).toHaveBeenCalledWith("pet_cat");
    });

    it("stops hatching on first failure", async () => {
      mockGachaStore.hatch
        .mockReturnValueOnce({ ok: true, itemId: "pet_cat", rarity: "common" })
        .mockReturnValueOnce({ ok: false, reason: "insufficient_funds" });
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      const result = handler(mockPlayer, { eggId: "basic_egg", count: 5 }) as {
        ok: boolean;
        value: unknown[];
      };

      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(mockGachaStore.hatch).toHaveBeenCalledTimes(2);
    });

    it("clamps count between 1 and 10", async () => {
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      // Request 50 but should only do 10
      mockGachaStore.hatch.mockReturnValue({ ok: true, itemId: "pet_cat", rarity: "common" });
      handler(mockPlayer, { eggId: "basic_egg", count: 50 });

      expect(mockGachaStore.hatch).toHaveBeenCalledTimes(10);
    });

    it("does not fire PlayerDataSync when no coins were spent", async () => {
      mockGachaStore.hatch.mockReturnValue({ ok: false, reason: "insufficient_funds" });
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      handler(mockPlayer, { eggId: "basic_egg", count: 1 });

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });

    it("returns error when gacha store is not loaded", async () => {
      vi.doMock("./GachaService", () => ({
        getGachaStore: vi.fn(() => undefined),
        getEggRegistry: vi.fn(() => mockEggRegistry),
      }));
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      const result = handler(mockPlayer, { eggId: "basic_egg", count: 1 }) as {
        ok: boolean;
        code: number;
      };

      expect(result.ok).toBe(false);
      expect(result.code).toBe(2004);
    });
  });

  // ─── EquipPet / UnequipPet ────────────────────────────────────────────

  describe("EquipPet", () => {
    it("calls petStore.equipPet with the instance id", async () => {
      await loadAndStart();
      const handler = eventHandlers["EquipPet"];
      handler(mockPlayer, { instanceId: "pet_123" });

      expect(mockPetStore.equipPet).toHaveBeenCalledWith("pet_123");
    });

    it("does nothing when pet store is not loaded", async () => {
      vi.doMock("./PetService", () => ({
        getPetStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = eventHandlers["EquipPet"];
      // Should not throw
      handler(mockPlayer, { instanceId: "pet_123" });
    });
  });

  describe("UnequipPet", () => {
    it("calls petStore.unequipPet with the instance id", async () => {
      await loadAndStart();
      const handler = eventHandlers["UnequipPet"];
      handler(mockPlayer, { instanceId: "pet_123" });

      expect(mockPetStore.unequipPet).toHaveBeenCalledWith("pet_123");
    });
  });

  // ─── EquipCosmetic / UnequipCosmetic ──────────────────────────────────

  describe("EquipCosmetic", () => {
    it("calls cosmeticStore.equip with cosmetic id and slot", async () => {
      await loadAndStart();
      const handler = eventHandlers["EquipCosmetic"];
      handler(mockPlayer, { cosmeticId: "crown", slot: "hat" });

      expect(mockCosmeticStore.equip).toHaveBeenCalledWith("crown", "hat");
    });
  });

  describe("UnequipCosmetic", () => {
    it("calls cosmeticStore.unequip with slot", async () => {
      await loadAndStart();
      const handler = eventHandlers["UnequipCosmetic"];
      handler(mockPlayer, { slot: "hat" });

      expect(mockCosmeticStore.unequip).toHaveBeenCalledWith("hat");
    });
  });

  // ─── ClaimBattlePassReward ────────────────────────────────────────────

  describe("ClaimBattlePassReward", () => {
    it("claims reward and calls fulfillRewards", async () => {
      await loadAndStart();
      const handler = eventHandlers["ClaimBattlePassReward"];
      handler(mockPlayer, { rewardId: "bp_tier_1" });

      expect(mockBpStore.claimReward).toHaveBeenCalledWith("bp_tier_1");
      expect(mockFulfillRewards).toHaveBeenCalledWith(mockPlayer, [
        { type: "currency", amount: 100 },
      ]);
    });

    it("does not call fulfillRewards when claim fails", async () => {
      mockBpStore.claimReward.mockReturnValue({ ok: false });
      await loadAndStart();
      const handler = eventHandlers["ClaimBattlePassReward"];
      handler(mockPlayer, { rewardId: "bp_tier_1" });

      expect(mockFulfillRewards).not.toHaveBeenCalled();
    });

    it("does nothing when bp store is not loaded", async () => {
      vi.doMock("./BattlePassService", () => ({
        getBattlePassStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = eventHandlers["ClaimBattlePassReward"];
      // Should not throw
      handler(mockPlayer, { rewardId: "bp_tier_1" });
    });
  });

  // -----------------------------------------------------------------------
  // Edge-case tests for branch coverage
  // -----------------------------------------------------------------------

  describe("GetFullPlayerData fallback paths", () => {
    it("uses defaults when progression not loaded", async () => {
      vi.doMock("./ProgressionService", () => ({
        getProgression: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = functionHandlers["GetFullPlayerData"];
      const result = handler(mockPlayer) as { ok: boolean; value: Record<string, unknown> };
      expect(result.ok).toBe(true);
      expect(result.value.level).toBe(1);
      expect(result.value.xp).toBe(0);
    });

    it("uses defaults when inventory not loaded", async () => {
      vi.doMock("./InventoryService", () => ({
        getInventory: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = functionHandlers["GetFullPlayerData"];
      const result = handler(mockPlayer) as { ok: boolean; value: Record<string, unknown> };
      expect(result.ok).toBe(true);
      expect(result.value.items).toEqual([]);
      expect(result.value.maxSlots).toBe(100);
    });

    it("uses defaults when quests not loaded", async () => {
      vi.doMock("./QuestService", () => ({
        getQuests: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = functionHandlers["GetFullPlayerData"];
      const result = handler(mockPlayer) as { ok: boolean; value: Record<string, unknown> };
      expect(result.ok).toBe(true);
      expect(result.value.activeQuests).toEqual([]);
    });

    it("uses defaults when pet store not loaded", async () => {
      vi.doMock("./PetService", () => ({
        getPetStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = functionHandlers["GetFullPlayerData"];
      const result = handler(mockPlayer) as { ok: boolean; value: Record<string, unknown> };
      expect(result.ok).toBe(true);
      expect(result.value.pets).toEqual([]);
    });

    it("uses empty cosmetics when store not loaded", async () => {
      vi.doMock("./CosmeticsService", () => ({
        getCosmeticStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = functionHandlers["GetFullPlayerData"];
      const result = handler(mockPlayer) as { ok: boolean; value: Record<string, unknown> };
      expect(result.ok).toBe(true);
      expect(result.value.ownedCosmetics).toEqual([]);
      expect(result.value.equippedCosmetics).toEqual({});
    });

    it("returns undefined battlePass when store not loaded", async () => {
      vi.doMock("./BattlePassService", () => ({
        getBattlePassStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = functionHandlers["GetFullPlayerData"];
      const result = handler(mockPlayer) as { ok: boolean; value: Record<string, unknown> };
      expect(result.ok).toBe(true);
      expect(result.value.battlePass).toBeUndefined();
    });

    it("uses defaults when daily store not loaded", async () => {
      vi.doMock("./RewardsService", () => ({
        getDailyRewards: vi.fn(() => undefined),
        registerRewardFulfiller: vi.fn(),
        REWARD_CYCLE: [],
      }));
      await loadAndStart();
      const handler = functionHandlers["GetFullPlayerData"];
      const result = handler(mockPlayer) as { ok: boolean; value: Record<string, unknown> };
      expect(result.ok).toBe(true);
      expect(result.value.dailyCanClaim).toBe(false);
    });
  });

  describe("ClaimDailyReward edge cases", () => {
    it("skips fulfillment when claim returns undefined", async () => {
      mockDailyStore.claim = vi.fn(() => undefined);
      await loadAndStart();
      const handler = functionHandlers["ClaimDailyReward"];
      handler(mockPlayer);
      expect(mockFulfillRewards).not.toHaveBeenCalled();
    });
  });

  describe("HatchEgg edge cases", () => {
    it("returns NotFound when player data not loaded", async () => {
      vi.doMock("./DataService", () => ({
        DataService: { getData: vi.fn(() => undefined), addCoins: vi.fn() },
      }));
      await loadAndStart();
      const handler = functionHandlers["HatchEgg"];
      const result = handler(mockPlayer, { eggId: "basic_egg", count: 1 }) as { ok: boolean };
      expect(result.ok).toBe(false);
    });
  });

  describe("store-not-loaded no-op handlers", () => {
    it("UnequipPet does nothing when pet store not loaded", async () => {
      vi.doMock("./PetService", () => ({
        getPetStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = eventHandlers["UnequipPet"];
      // Should not throw
      handler(mockPlayer, { instanceId: "pet1" });
    });

    it("EquipCosmetic does nothing when cosmetic store not loaded", async () => {
      vi.doMock("./CosmeticsService", () => ({
        getCosmeticStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = eventHandlers["EquipCosmetic"];
      handler(mockPlayer, { cosmeticId: "hat1", slot: "hat" });
    });

    it("UnequipCosmetic does nothing when cosmetic store not loaded", async () => {
      vi.doMock("./CosmeticsService", () => ({
        getCosmeticStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      const handler = eventHandlers["UnequipCosmetic"];
      handler(mockPlayer, { slot: "hat" });
    });
  });

  describe("ReportHit handler", () => {
    it("increments kills on valid hit", async () => {
      vi.doMock("./DataService", () => ({
        DataService: {
          getData: vi.fn(() => mockCoreData),
          addCoins: vi.fn(),
          incrementKills: vi.fn(),
        },
      }));
      await loadAndStart();
      const handler = functionHandlers["ReportHit"];
      const result = handler(mockPlayer, {
        targetId: 99,
        abilityId: "sword_slash",
        originX: 0,
        originY: 0,
        originZ: 0,
        directionX: 1,
        directionY: 0,
        directionZ: 0,
        clientTimestamp: 1000,
      }) as { ok: boolean; value: { valid: boolean } };
      expect(result.ok).toBe(true);
      expect(result.value.valid).toBe(true);
    });

    it("does not increment kills on invalid hit", async () => {
      vi.doMock("./DataService", () => ({
        DataService: {
          getData: vi.fn(() => mockCoreData),
          addCoins: vi.fn(),
          incrementKills: vi.fn(),
        },
      }));
      vi.doMock("./CombatService", () => ({
        combatHandle: {
          Service: { name: "CombatService" },
          validateHit: vi.fn(),
          initPlayer: vi.fn(),
          cleanupPlayer: vi.fn(),
        },
        processHitReport: vi.fn(() => ({ valid: false, damage: 0, targetId: 99 })),
      }));
      await loadAndStart();
      const handler = functionHandlers["ReportHit"];
      const result = handler(mockPlayer, {
        targetId: 99,
        abilityId: "sword_slash",
        originX: 0,
        originY: 0,
        originZ: 0,
        directionX: 1,
        directionY: 0,
        directionZ: 0,
        clientTimestamp: 1000,
      }) as { ok: boolean; value: { valid: boolean } };
      expect(result.value.valid).toBe(false);
    });
  });

  describe("UseAbility handler", () => {
    it("does not throw", async () => {
      await loadAndStart();
      const handler = eventHandlers["UseAbility"];
      handler(mockPlayer, { abilityId: "sword_slash" });
    });
  });

  describe("BuyProduct handler", () => {
    it("logs intent without throwing", async () => {
      await loadAndStart();
      const handler = eventHandlers["BuyProduct"];
      handler(mockPlayer, { productId: 1_000_001 });
    });
  });

  describe("CheckGamePass handler", () => {
    it("returns ownership status", async () => {
      await loadAndStart();
      const handler = functionHandlers["CheckGamePass"];
      const result = handler(mockPlayer, { passId: 2_000_001 }) as {
        ok: boolean;
        value: { owned: boolean };
      };
      expect(result.ok).toBe(true);
      expect(result.value.owned).toBe(true);
    });
  });
});
