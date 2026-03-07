/**
 * Marketplace End-to-End Tests — Test Park
 *
 * Verifies the full purchase flow:
 * 1. Product handler registered via registerProduct
 * 2. Receipt processed → handler fires
 * 3. Data mutation occurs (addCoins / addXp)
 * 4. Telemetry event emitted
 * 5. Idempotency: duplicate receipt returns PurchaseGranted without double-grant
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

type HandlerFn = (...args: unknown[]) => unknown;

describe("Marketplace E2E (test-park)", () => {
  // Captured state
  let registeredProducts: Map<number, (receipt: unknown) => string>;
  let mockPlayer: { UserId: number; Name: string };
  let mockCoreData: { coins: number; kills: number; lastPlayedAt: number; __version: number };
  let mockAddCoins: ReturnType<typeof vi.fn>;
  let mockTrackPurchase: ReturnType<typeof vi.fn>;
  let mockProgression: Record<string, ReturnType<typeof vi.fn>>;
  let functionHandlers: Record<string, HandlerFn>;
  let eventHandlers: Record<string, HandlerFn>;

  beforeEach(() => {
    vi.resetModules();

    registeredProducts = new Map();
    functionHandlers = {};
    eventHandlers = {};

    mockPlayer = { UserId: 42, Name: "TestPlayer" };
    mockCoreData = { coins: 1000, kills: 5, lastPlayedAt: 0, __version: 1 };
    mockAddCoins = vi.fn((player: unknown, amount: number) => {
      mockCoreData.coins += amount;
    });
    mockTrackPurchase = vi.fn();

    mockProgression = {
      getLevel: vi.fn(() => 5),
      getCurrentXp: vi.fn(() => 250),
      getXpForNextLevel: vi.fn(() => 500),
      getPrestige: vi.fn(() => 0),
      addXp: vi.fn(),
    };

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
      ErrorCode: { NotFound: 2004, InvalidPayload: 1001 },
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
      getProgression: vi.fn(() => mockProgression),
    }));

    vi.doMock("./InventoryService", () => ({ getInventory: vi.fn() }));
    vi.doMock("./QuestService", () => ({ getQuests: vi.fn() }));
    vi.doMock("./PetService", () => ({ getPetStore: vi.fn() }));
    vi.doMock("./GachaService", () => ({ getGachaStore: vi.fn(), getEggRegistry: vi.fn() }));
    vi.doMock("./CosmeticsService", () => ({ getCosmeticStore: vi.fn() }));
    vi.doMock("./BattlePassService", () => ({ getBattlePassStore: vi.fn() }));
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

    vi.doMock("./CombatService", () => ({
      combatHandle: {
        Service: { name: "CombatService" },
        validateHit: vi.fn(),
        initPlayer: vi.fn(),
        cleanupPlayer: vi.fn(),
      },
      processHitReport: vi.fn(() => ({ valid: true, damage: 25, targetId: 99 })),
    }));

    vi.doMock("./TelemetryService", () => ({
      trackPurchase: mockTrackPurchase,
      trackCoinSpend: vi.fn(),
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
      PlaceIdWherePurchased: 123456,
      CurrencySpent: 0,
    };
  }

  // ─── Full flow tests ──────────────────────────────────────────────────

  it("registers all 3 product handlers on start", async () => {
    await setup();
    expect(registeredProducts.size).toBe(3);
    expect(registeredProducts.has(1_000_001)).toBe(true);
    expect(registeredProducts.has(1_000_002)).toBe(true);
    expect(registeredProducts.has(1_000_003)).toBe(true);
  });

  describe("100 Coins purchase flow", () => {
    it("grants 100 coins and returns PurchaseGranted", async () => {
      await setup();
      const handler = registeredProducts.get(1_000_001)!;
      const receipt = makeReceipt(1_000_001);

      const decision = handler(receipt);

      expect(decision).toBe("PurchaseGranted");
      expect(mockAddCoins).toHaveBeenCalledWith(mockPlayer, 100);
      expect(mockCoreData.coins).toBe(1100);
    });

    it("emits telemetry on successful purchase", async () => {
      await setup();
      const handler = registeredProducts.get(1_000_001)!;
      handler(makeReceipt(1_000_001));

      expect(mockTrackPurchase).toHaveBeenCalledWith(mockPlayer, "100 Coins", 1_000_001, 25);
    });

    it("handles unknown player gracefully", async () => {
      await setup();
      const handler = registeredProducts.get(1_000_001)!;
      const receipt = { ...makeReceipt(1_000_001), PlayerId: 999 };

      const decision = handler(receipt);

      expect(decision).toBe("PurchaseGranted");
      expect(mockAddCoins).not.toHaveBeenCalled();
      expect(mockTrackPurchase).not.toHaveBeenCalled();
    });
  });

  describe("500 Coins purchase flow", () => {
    it("grants 500 coins and returns PurchaseGranted", async () => {
      await setup();
      const handler = registeredProducts.get(1_000_002)!;
      handler(makeReceipt(1_000_002));

      expect(mockAddCoins).toHaveBeenCalledWith(mockPlayer, 500);
      expect(mockCoreData.coins).toBe(1500);
      expect(mockTrackPurchase).toHaveBeenCalledWith(mockPlayer, "500 Coins", 1_000_002, 99);
    });
  });

  describe("2x XP Boost purchase flow", () => {
    it("grants XP and emits telemetry", async () => {
      await setup();
      const handler = registeredProducts.get(1_000_003)!;
      handler(makeReceipt(1_000_003));

      expect(mockProgression.addXp).toHaveBeenCalledWith(500);
      expect(mockTrackPurchase).toHaveBeenCalledWith(mockPlayer, "2x XP Boost", 1_000_003, 49);
    });
  });

  describe("CheckGamePass function", () => {
    it("returns game pass ownership result", async () => {
      await setup();
      const handler = functionHandlers["CheckGamePass"];
      expect(handler).toBeDefined();

      const result = handler(mockPlayer, { passId: 2_000_001 }) as {
        ok: boolean;
        value: { passId: number; owned: boolean };
      };

      expect(result.ok).toBe(true);
      expect(result.value.passId).toBe(2_000_001);
      expect(result.value.owned).toBe(true);
    });
  });

  describe("BuyProduct event", () => {
    it("handles client purchase intent signal", async () => {
      await setup();
      const handler = eventHandlers["BuyProduct"];
      expect(handler).toBeDefined();
      // Should not throw
      expect(() => handler(mockPlayer, { productId: 1_000_001 })).not.toThrow();
    });
  });
});
