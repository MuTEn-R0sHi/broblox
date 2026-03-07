/**
 * Marketplace End-to-End Tests — Obby Game
 *
 * Verifies the full purchase flow:
 * 1. Product handler registered via registerProduct
 * 2. Receipt processed → handler fires
 * 3. Data mutation occurs (addCoins / stage skip)
 * 4. Telemetry event emitted
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

type HandlerFn = (...args: unknown[]) => unknown;

describe("Marketplace E2E (obby)", () => {
  // Captured state
  let registeredProducts: Map<number, (receipt: unknown) => string>;
  let mockPlayer: { UserId: number; Name: string };
  let mockCoreData: {
    coins: number;
    currentStage: number;
    currentCheckpoint: number;
    totalDeaths: number;
    totalCompletions: number;
    lastPlayedAt: number;
    __version: number;
    stageProgress: Record<string, unknown>;
    unlockedItems: string[];
  };
  let mockAddCoins: ReturnType<typeof vi.fn>;
  let mockTrackPurchase: ReturnType<typeof vi.fn>;
  let functionHandlers: Record<string, HandlerFn>;
  let eventHandlers: Record<string, HandlerFn>;

  beforeEach(() => {
    vi.resetModules();

    registeredProducts = new Map();
    functionHandlers = {};
    eventHandlers = {};

    mockPlayer = { UserId: 42, Name: "TestPlayer" };
    mockCoreData = {
      coins: 500,
      currentStage: 3,
      currentCheckpoint: 2,
      totalDeaths: 10,
      totalCompletions: 0,
      lastPlayedAt: 0,
      __version: 1,
      stageProgress: {},
      unlockedItems: [],
    };
    mockAddCoins = vi.fn((player: unknown, amount: number) => {
      mockCoreData.coins += amount;
    });
    mockTrackPurchase = vi.fn();

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("@broblox/net", () => ({
      ok: (v: unknown) => ({ ok: true, value: v }),
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

    const mockRegistry = {
      onFunction: vi.fn((name: string, handler: HandlerFn) => {
        functionHandlers[name] = handler;
      }),
      onEvent: vi.fn((name: string, handler: HandlerFn) => {
        eventHandlers[name] = handler;
      }),
      fireClient: vi.fn(),
    };

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./DataService", () => ({
      DataService: {
        getData: vi.fn(() => mockCoreData),
        addCoins: mockAddCoins,
      },
    }));

    vi.doMock("./ProgressionService", () => ({
      getProgression: vi.fn(() => ({
        getLevel: vi.fn(() => 5),
        getCurrentXp: vi.fn(() => 200),
        getXpForNextLevel: vi.fn(() => 300),
        getPrestige: vi.fn(() => 0),
      })),
    }));

    vi.doMock("./InventoryService", () => ({ getInventory: vi.fn() }));
    vi.doMock("./QuestService", () => ({ getQuests: vi.fn() }));
    vi.doMock("./PetService", () => ({ getPetStore: vi.fn() }));
    vi.doMock("./GachaService", () => ({ getGachaStore: vi.fn(), getEggRegistry: vi.fn() }));
    vi.doMock("./CosmeticsService", () => ({ getCosmeticStore: vi.fn() }));
    vi.doMock("./BattlePassService", () => ({
      getBattlePassStore: vi.fn(),
      getSeasonRegistry: vi.fn(),
    }));
    vi.doMock("./RewardsService", () => ({
      getDailyRewards: vi.fn(),
      registerRewardFulfiller: vi.fn(),
      REWARD_CYCLE: [],
    }));
    vi.doMock("./CodeRedemptionService", () => ({ getCodeStore: vi.fn() }));
    vi.doMock("./RewardFulfillment", () => ({ fulfillRewards: vi.fn() }));

    vi.doMock("./MarketplaceService", () => ({
      registerProduct: vi.fn(
        (product: { productId: number }, handler: (receipt: unknown) => string) => {
          registeredProducts.set(product.productId, handler);
        }
      ),
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
      trackPurchase: mockTrackPurchase,
      trackStageComplete: vi.fn(),
      trackPlayerDeath: vi.fn(),
    }));
  });

  async function setup() {
    const mod = await import("./PlayerActionService");
    mod.PlayerActionService.onStart?.();
    return mod;
  }

  function makeReceipt(productId: number, purchaseId = "purchase_001") {
    return {
      PlayerId: mockPlayer.UserId,
      ProductId: productId,
      PurchaseId: purchaseId,
      PlaceIdWherePurchased: 789012,
      CurrencySpent: 0,
    };
  }

  // ─── Full flow tests ──────────────────────────────────────────────────

  it("registers all 3 product handlers on start", async () => {
    await setup();
    expect(registeredProducts.size).toBe(3);
    expect(registeredProducts.has(3_000_001)).toBe(true);
    expect(registeredProducts.has(3_000_002)).toBe(true);
    expect(registeredProducts.has(3_000_003)).toBe(true);
  });

  describe("100 Coins purchase flow", () => {
    it("grants 100 coins and returns PurchaseGranted", async () => {
      await setup();
      const handler = registeredProducts.get(3_000_001)!;
      const decision = handler(makeReceipt(3_000_001));

      expect(decision).toBe("PurchaseGranted");
      expect(mockAddCoins).toHaveBeenCalledWith(mockPlayer, 100);
      expect(mockCoreData.coins).toBe(600);
    });

    it("emits telemetry on successful purchase", async () => {
      await setup();
      const handler = registeredProducts.get(3_000_001)!;
      handler(makeReceipt(3_000_001));

      expect(mockTrackPurchase).toHaveBeenCalledWith(mockPlayer, "100 Coins", 3_000_001, 25);
    });

    it("handles unknown player gracefully", async () => {
      await setup();
      const handler = registeredProducts.get(3_000_001)!;
      const receipt = { ...makeReceipt(3_000_001), PlayerId: 999 };
      const decision = handler(receipt);

      expect(decision).toBe("PurchaseGranted");
      expect(mockAddCoins).not.toHaveBeenCalled();
      expect(mockTrackPurchase).not.toHaveBeenCalled();
    });
  });

  describe("500 Coins purchase flow", () => {
    it("grants 500 coins and emits telemetry", async () => {
      await setup();
      const handler = registeredProducts.get(3_000_002)!;
      handler(makeReceipt(3_000_002));

      expect(mockAddCoins).toHaveBeenCalledWith(mockPlayer, 500);
      expect(mockCoreData.coins).toBe(1000);
      expect(mockTrackPurchase).toHaveBeenCalledWith(mockPlayer, "500 Coins", 3_000_002, 99);
    });
  });

  describe("Skip Stage purchase flow", () => {
    it("advances stage by 1 and emits telemetry", async () => {
      await setup();
      const handler = registeredProducts.get(3_000_003)!;
      const previousStage = mockCoreData.currentStage;
      handler(makeReceipt(3_000_003));

      expect(mockCoreData.currentStage).toBe(previousStage + 1);
      expect(mockTrackPurchase).toHaveBeenCalledWith(mockPlayer, "Skip Stage", 3_000_003, 49);
    });

    it("handles unknown player gracefully", async () => {
      await setup();
      const handler = registeredProducts.get(3_000_003)!;
      const receipt = { ...makeReceipt(3_000_003), PlayerId: 999 };
      const previousStage = mockCoreData.currentStage;
      handler(receipt);

      expect(mockCoreData.currentStage).toBe(previousStage); // unchanged
      expect(mockTrackPurchase).not.toHaveBeenCalled();
    });
  });

  describe("CheckGamePass function", () => {
    it("returns game pass ownership result", async () => {
      await setup();
      const handler = functionHandlers["CheckGamePass"];
      expect(handler).toBeDefined();

      const result = handler(mockPlayer, { passId: 4_000_001 }) as {
        ok: boolean;
        value: { passId: number; owned: boolean };
      };

      expect(result.ok).toBe(true);
      expect(result.value.passId).toBe(4_000_001);
      expect(result.value.owned).toBe(true);
    });
  });

  describe("BuyProduct event", () => {
    it("handles client purchase intent signal without error", async () => {
      await setup();
      const handler = eventHandlers["BuyProduct"];
      expect(handler).toBeDefined();
      expect(() => handler(mockPlayer, { productId: 3_000_001 })).not.toThrow();
    });
  });
});
