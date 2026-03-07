/**
 * PlayerActionService Tests (Obby)
 *
 * Tests all client-initiated remote handlers:
 * GetFullPlayerData, ClaimDailyReward, RedeemCode, HatchEgg,
 * EquipPet, UnequipPet, EquipCosmetic, UnequipCosmetic,
 * ClaimBattlePassReward
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("PlayerActionService (obby)", () => {
  // ── captured handler references ────────────────────────────────────
  const handlers: Record<string, (...args: unknown[]) => unknown> = {};

  // ── mock factories ─────────────────────────────────────────────────
  let mockPlayer: { UserId: number; Name: string };
  let mockCoreData: Record<string, unknown>;
  let mockProgressionStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockInventoryStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockQuestStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockPetStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockGachaStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockCosmeticStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockBpStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockDailyStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockCodeStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockFulfillRewards: ReturnType<typeof vi.fn>;
  let mockRegisterFulfiller: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockPlayer = { UserId: 42, Name: "TestPlayer" };

    mockCoreData = {
      coins: 500,
      currentStage: 3,
      currentCheckpoint: 2,
    };

    mockProgressionStore = {
      getLevel: vi.fn(() => 5),
      getCurrentXp: vi.fn(() => 200),
      getXpForNextLevel: vi.fn(() => 300),
      getPrestige: vi.fn(() => 0),
    };

    mockInventoryStore = {
      getAllItems: vi.fn(() => [{ id: "skip_stage", amount: 2 }]),
      getMaxSlots: vi.fn(() => 50),
    };

    mockQuestStore = {
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
      hatch: vi.fn(() => ({ ok: true, itemId: "cloud_bunny" })),
    };

    mockCosmeticStore = {
      getOwned: vi.fn(() => []),
      getAllEquipped: vi.fn(() => ({
        forEach: vi.fn(),
      })),
      equip: vi.fn(() => ({ ok: true })),
      unequip: vi.fn(() => ({ ok: true })),
    };

    mockBpStore = {
      getSeasonId: vi.fn(() => "obby_s1"),
      getXp: vi.fn(() => 100),
      getTier: vi.fn(() => 2),
      isPremium: vi.fn(() => false),
      getClaimedRewards: vi.fn(() => []),
      claimReward: vi.fn(() => ({
        ok: true,
        reward: { reward: { type: "currency", amount: 50 } },
      })),
    };

    mockDailyStore = {
      canClaim: vi.fn(() => true),
      claim: vi.fn(() => ({ day: 1, rewards: [{ type: "currency", amount: 50 }] })),
      getCycleDay: vi.fn(() => 1),
      getStreak: vi.fn(() => 1),
      getTimeUntilNextClaim: vi.fn(() => 86000),
    };

    mockCodeStore = {
      redeemCode: vi.fn(() => ({ success: true })),
    };

    mockFulfillRewards = vi.fn();
    mockRegisterFulfiller = vi.fn();

    // ── Mock all dependencies ─────────────────────────────────────────

    const mockRegistry = {
      onFunction: vi.fn((name: string, handler: (...args: unknown[]) => unknown) => {
        handlers[name] = handler;
      }),
      onEvent: vi.fn((name: string, handler: (...args: unknown[]) => unknown) => {
        handlers[name] = handler;
      }),
    };

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./DataService", () => ({
      DataService: {
        getData: vi.fn(() => mockCoreData),
        addCoins: vi.fn(),
      },
    }));

    vi.doMock("./ProgressionService", () => ({
      getProgression: vi.fn(() => mockProgressionStore),
    }));

    vi.doMock("./InventoryService", () => ({
      getInventory: vi.fn(() => mockInventoryStore),
    }));

    vi.doMock("./QuestService", () => ({
      getQuests: vi.fn(() => mockQuestStore),
    }));

    vi.doMock("./PetService", () => ({
      getPetStore: vi.fn(() => mockPetStore),
    }));

    vi.doMock("./GachaService", () => ({
      getGachaStore: vi.fn(() => mockGachaStore),
      getEggRegistry: vi.fn(() => ({
        get: vi.fn(() => ({ cost: 50, currency: "coins" })),
      })),
    }));

    vi.doMock("./CosmeticsService", () => ({
      getCosmeticStore: vi.fn(() => mockCosmeticStore),
    }));

    vi.doMock("./BattlePassService", () => ({
      getBattlePassStore: vi.fn(() => mockBpStore),
      getSeasonRegistry: vi.fn(() => ({ getAll: vi.fn(() => []) })),
    }));

    vi.doMock("./RewardsService", () => ({
      getDailyRewards: vi.fn(() => mockDailyStore),
      REWARD_CYCLE: [{ day: 1, rewards: [{ type: "currency", amount: 50 }] }],
      registerRewardFulfiller: mockRegisterFulfiller,
    }));

    vi.doMock("./CodeRedemptionService", () => ({
      getCodeStore: vi.fn(() => mockCodeStore),
    }));

    vi.doMock("./RewardFulfillment", () => ({
      fulfillRewards: mockFulfillRewards,
    }));

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/net", () => ({
      ok: (val: unknown) => ({ ok: true, value: val }),
      err: (code: string, meta: unknown) => ({ ok: false, code, meta }),
      ErrorCode: {
        NotFound: "NOT_FOUND",
        InvalidPayload: "INVALID_PAYLOAD",
      },
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
        { productId: 3_000_001, name: "100 Coins", description: "Get 100 coins", robuxPrice: 25 },
        { productId: 3_000_002, name: "500 Coins", description: "Get 500 coins", robuxPrice: 99 },
        {
          productId: 3_000_003,
          name: "Skip Stage",
          description: "Skip the current stage",
          robuxPrice: 49,
        },
      ],
    }));

    vi.doMock("./TelemetryService", () => ({
      trackPurchase: vi.fn(),
      trackStageComplete: vi.fn(),
      trackPlayerDeath: vi.fn(),
    }));
  });

  async function loadAndStart() {
    const mod = await import("./PlayerActionService");
    mod.PlayerActionService.onStart!();
    return mod;
  }

  // ── Export & lifecycle ──────────────────────────────────────────────

  it("exports PlayerActionService with onStart", async () => {
    const mod = await import("./PlayerActionService");
    expect(mod.PlayerActionService).toBeDefined();
    expect(typeof mod.PlayerActionService.onStart).toBe("function");
  });

  it("registers reward fulfiller on start", async () => {
    await loadAndStart();
    expect(mockRegisterFulfiller).toHaveBeenCalledWith(mockFulfillRewards);
  });

  // ── GetFullPlayerData ──────────────────────────────────────────────

  describe("GetFullPlayerData", () => {
    it("returns full player data snapshot when data exists", async () => {
      await loadAndStart();
      const result = handlers["GetFullPlayerData"](mockPlayer) as { ok: boolean; value: unknown };
      expect(result.ok).toBe(true);
      expect(result.value).toEqual(
        expect.objectContaining({
          coins: 500,
          currentStage: 3,
          level: 5,
          xp: 200,
        })
      );
    });

    it("returns error when player data is not loaded", async () => {
      vi.doMock("./DataService", () => ({
        DataService: {
          getData: vi.fn(() => undefined),
          addCoins: vi.fn(),
        },
      }));
      await loadAndStart();
      const result = handlers["GetFullPlayerData"](mockPlayer) as { ok: boolean; code: string };
      expect(result.ok).toBe(false);
      expect(result.code).toBe("NOT_FOUND");
    });
  });

  // ── ClaimDailyReward ───────────────────────────────────────────────

  describe("ClaimDailyReward", () => {
    it("claims and returns reward when claimable", async () => {
      await loadAndStart();
      const result = handlers["ClaimDailyReward"](mockPlayer) as { ok: boolean; value: unknown };
      expect(result.ok).toBe(true);
      expect(result.value).toEqual(expect.objectContaining({ day: 1 }));
      expect(mockFulfillRewards).toHaveBeenCalled();
    });

    it("returns ok(undefined) when not claimable", async () => {
      mockDailyStore.canClaim.mockReturnValue(false);
      await loadAndStart();
      const result = handlers["ClaimDailyReward"](mockPlayer) as { ok: boolean; value: unknown };
      expect(result.ok).toBe(true);
      expect(result.value).toBeUndefined();
    });

    it("returns error when daily store not loaded", async () => {
      vi.doMock("./RewardsService", () => ({
        getDailyRewards: vi.fn(() => undefined),
        REWARD_CYCLE: [],
        registerRewardFulfiller: mockRegisterFulfiller,
      }));
      await loadAndStart();
      const result = handlers["ClaimDailyReward"](mockPlayer) as { ok: boolean };
      expect(result.ok).toBe(false);
    });
  });

  // ── RedeemCode ─────────────────────────────────────────────────────

  describe("RedeemCode", () => {
    it("returns success for valid code", async () => {
      await loadAndStart();
      const result = handlers["RedeemCode"](mockPlayer, {
        code: "OBBY2025",
      }) as { ok: boolean; value: { success: boolean } };
      expect(result.ok).toBe(true);
      expect(result.value.success).toBe(true);
    });

    it("returns failure message for invalid code", async () => {
      mockCodeStore.redeemCode.mockReturnValue({ success: false, status: "already_redeemed" });
      await loadAndStart();
      const result = handlers["RedeemCode"](mockPlayer, {
        code: "OBBY2025",
      }) as { ok: boolean; value: { success: boolean; message: string } };
      expect(result.ok).toBe(true);
      expect(result.value.success).toBe(false);
      expect(result.value.message).toBe("already_redeemed");
    });
  });

  // ── HatchEgg ───────────────────────────────────────────────────────

  describe("HatchEgg", () => {
    it("hatches egg and adds pet on success", async () => {
      await loadAndStart();
      const result = handlers["HatchEgg"](mockPlayer, {
        eggId: "sky_egg",
        count: 1,
      }) as { ok: boolean; value: unknown[] };
      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value[0]).toEqual(expect.objectContaining({ ok: true, itemId: "cloud_bunny" }));
    });

    it("stops on first failure and returns partial results", async () => {
      mockGachaStore.hatch
        .mockReturnValueOnce({ ok: true, itemId: "cloud_bunny" })
        .mockReturnValueOnce({ ok: false, reason: "insufficient_funds" });
      await loadAndStart();
      const result = handlers["HatchEgg"](mockPlayer, {
        eggId: "sky_egg",
        count: 3,
      }) as { ok: boolean; value: unknown[] };
      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(2);
    });

    it("returns error for unknown egg", async () => {
      vi.doMock("./GachaService", () => ({
        getGachaStore: vi.fn(() => mockGachaStore),
        getEggRegistry: vi.fn(() => ({ get: vi.fn(() => undefined) })),
      }));
      await loadAndStart();
      const result = handlers["HatchEgg"](mockPlayer, {
        eggId: "bad_egg",
        count: 1,
      }) as { ok: boolean };
      expect(result.ok).toBe(false);
    });

    it("returns error for unsupported currency", async () => {
      vi.doMock("./GachaService", () => ({
        getGachaStore: vi.fn(() => mockGachaStore),
        getEggRegistry: vi.fn(() => ({
          get: vi.fn(() => ({ cost: 50, currency: "gems" })),
        })),
      }));
      await loadAndStart();
      const result = handlers["HatchEgg"](mockPlayer, {
        eggId: "sky_egg",
        count: 1,
      }) as { ok: boolean };
      expect(result.ok).toBe(false);
    });

    it("returns error when gacha store not loaded", async () => {
      vi.doMock("./GachaService", () => ({
        getGachaStore: vi.fn(() => undefined),
        getEggRegistry: vi.fn(() => ({ get: vi.fn() })),
      }));
      await loadAndStart();
      const result = handlers["HatchEgg"](mockPlayer, {
        eggId: "sky_egg",
        count: 1,
      }) as { ok: boolean };
      expect(result.ok).toBe(false);
    });

    it("clamps hatch count to 1–10 range", async () => {
      await loadAndStart();
      const result = handlers["HatchEgg"](mockPlayer, {
        eggId: "sky_egg",
        count: 50,
      }) as { ok: boolean; value: unknown[] };
      expect(result.ok).toBe(true);
      expect(mockGachaStore.hatch).toHaveBeenCalledTimes(10);
    });
  });

  // ── EquipPet / UnequipPet ──────────────────────────────────────────

  describe("EquipPet", () => {
    it("calls petStore.equipPet with instanceId", async () => {
      await loadAndStart();
      handlers["EquipPet"](mockPlayer, { instanceId: "pet_1" });
      expect(mockPetStore.equipPet).toHaveBeenCalledWith("pet_1");
    });

    it("does nothing when pet store not loaded", async () => {
      vi.doMock("./PetService", () => ({
        getPetStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      // Should not throw
      handlers["EquipPet"](mockPlayer, { instanceId: "pet_1" });
    });
  });

  describe("UnequipPet", () => {
    it("calls petStore.unequipPet with instanceId", async () => {
      await loadAndStart();
      handlers["UnequipPet"](mockPlayer, { instanceId: "pet_1" });
      expect(mockPetStore.unequipPet).toHaveBeenCalledWith("pet_1");
    });
  });

  // ── EquipCosmetic / UnequipCosmetic ────────────────────────────────

  describe("EquipCosmetic", () => {
    it("calls cosmeticStore.equip with id and slot", async () => {
      await loadAndStart();
      handlers["EquipCosmetic"](mockPlayer, {
        cosmeticId: "rainbow_trail",
        slot: "trail",
      });
      expect(mockCosmeticStore.equip).toHaveBeenCalledWith("rainbow_trail", "trail");
    });

    it("does nothing when cosmetic store not loaded", async () => {
      vi.doMock("./CosmeticsService", () => ({
        getCosmeticStore: vi.fn(() => undefined),
      }));
      await loadAndStart();
      handlers["EquipCosmetic"](mockPlayer, { cosmeticId: "x", slot: "trail" });
    });
  });

  describe("UnequipCosmetic", () => {
    it("calls cosmeticStore.unequip with slot", async () => {
      await loadAndStart();
      handlers["UnequipCosmetic"](mockPlayer, { slot: "trail" });
      expect(mockCosmeticStore.unequip).toHaveBeenCalledWith("trail");
    });
  });

  // ── ClaimBattlePassReward ──────────────────────────────────────────

  describe("ClaimBattlePassReward", () => {
    it("claims reward and fulfills", async () => {
      await loadAndStart();
      handlers["ClaimBattlePassReward"](mockPlayer, { rewardId: "os1_t1_free" });
      expect(mockBpStore.claimReward).toHaveBeenCalledWith("os1_t1_free");
      expect(mockFulfillRewards).toHaveBeenCalledWith(mockPlayer, [
        { type: "currency", amount: 50 },
      ]);
    });

    it("does nothing when bp store not loaded", async () => {
      vi.doMock("./BattlePassService", () => ({
        getBattlePassStore: vi.fn(() => undefined),
        getSeasonRegistry: vi.fn(() => ({ getAll: vi.fn(() => []) })),
      }));
      await loadAndStart();
      handlers["ClaimBattlePassReward"](mockPlayer, { rewardId: "os1_t1_free" });
      expect(mockFulfillRewards).not.toHaveBeenCalled();
    });

    it("does nothing when claim returns no reward", async () => {
      mockBpStore.claimReward.mockReturnValue({ ok: false });
      await loadAndStart();
      handlers["ClaimBattlePassReward"](mockPlayer, { rewardId: "os1_t1_free" });
      expect(mockFulfillRewards).not.toHaveBeenCalled();
    });
  });
});
