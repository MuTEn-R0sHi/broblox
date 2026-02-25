/**
 * Tests for createMarketplaceService factory
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createMarketplaceService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockPassCache: Record<string, ReturnType<typeof vi.fn>>;
  let mockValidator: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockRegistry = {
      register: vi.fn(),
      unregister: vi.fn(),
      count: vi.fn(() => 1),
      getAllProducts: vi.fn(() => []),
      handleReceipt: vi.fn(() => "PurchaseGranted"),
    };
    mockPassCache = {
      setFetcher: vi.fn(),
      registerPass: vi.fn(),
      unregisterPass: vi.fn(),
      getPass: vi.fn(() => undefined),
      getAllPasses: vi.fn(() => [{ passId: 200, name: "VIP" }]),
      userOwnsGamePass: vi.fn(() => ({ owned: true, fromCache: false })),
      setOwned: vi.fn(),
      invalidatePlayer: vi.fn(),
      clearAll: vi.fn(),
    };
    mockValidator = {
      process: vi.fn(() => "PurchaseGranted"),
      isGranted: vi.fn(() => false),
      grantedCount: vi.fn(() => 0),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
      arraySize: (arr: unknown[]) => arr.length,
    }));
    vi.doMock("./developer-products", () => ({
      DeveloperProductRegistry: function () {
        return mockRegistry;
      },
    }));
    vi.doMock("./game-passes", () => ({
      GamePassCache: function () {
        return mockPassCache;
      },
    }));
    vi.doMock("./purchase-validator", () => ({
      PurchaseValidator: function () {
        return mockValidator;
      },
    }));
  });

  async function makeService(overrides = {}) {
    const mod = await import("./create-marketplace-service");
    return mod.createMarketplaceService({
      products: [{ productId: 100, name: "100 Coins" }],
      passes: [{ passId: 200, name: "VIP" }],
      ...overrides,
    });
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await makeService();
    expect(handle.Service.name).toBe("MarketplaceService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers products and passes on init", async () => {
    const handle = await makeService();
    handle.Service.onInit!();
    expect(mockRegistry.register).toHaveBeenCalled();
    expect(mockPassCache.registerPass).toHaveBeenCalled();
  });

  it("calls onSetupReceipt on start", async () => {
    const onSetupReceipt = vi.fn();
    const handle = await makeService({ onSetupReceipt });
    handle.Service.onStart!();
    expect(onSetupReceipt).toHaveBeenCalledOnce();
  });

  it("clears pass cache on destroy", async () => {
    const handle = await makeService();
    handle.Service.onDestroy!();
    expect(mockPassCache.clearAll).toHaveBeenCalled();
  });

  it("processReceipt delegates to validator", async () => {
    const handle = await makeService();
    const receipt = {
      PlayerId: 1,
      ProductId: 100,
      PurchaseId: "p-001",
      PlaceIdWherePurchased: 0,
      CurrencySpent: 99,
    };
    const decision = handle.processReceipt(receipt);
    expect(mockValidator.process).toHaveBeenCalledWith(receipt);
    expect(decision).toBe("PurchaseGranted");
  });

  it("userOwnsGamePass delegates to cache", async () => {
    const handle = await makeService();
    const result = handle.userOwnsGamePass(1, 200);
    expect(mockPassCache.userOwnsGamePass).toHaveBeenCalledWith(1, 200);
    expect(result.owned).toBe(true);
  });

  it("setPassOwned delegates to cache", async () => {
    const handle = await makeService();
    handle.setPassOwned(1, 200, true);
    expect(mockPassCache.setOwned).toHaveBeenCalledWith(1, 200, true);
  });

  it("invalidates player pass cache on player removing", async () => {
    const callbacks: ((player: { UserId: number }) => void)[] = [];
    const handle = await makeService({
      onPlayerRemoving: (cb: (player: { UserId: number }) => void) => callbacks.push(cb),
    });
    handle.Service.onInit!();
    callbacks[0]?.({ UserId: 42 });
    expect(mockPassCache.invalidatePlayer).toHaveBeenCalledWith(42);
  });

  it("wires passOwnershipFetcher to cache", async () => {
    const fetcher = vi.fn(() => true);
    await makeService({ passOwnershipFetcher: fetcher });
    expect(mockPassCache.setFetcher).toHaveBeenCalledWith(fetcher);
  });

  it("exposes getProductRegistry and getGamePassCache", async () => {
    const handle = await makeService();
    expect(handle.getProductRegistry()).toBe(mockRegistry);
    expect(handle.getGamePassCache()).toBe(mockPassCache);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-marketplace-service");
    const h1 = mod.createMarketplaceService({});
    const h2 = mod.createMarketplaceService({});
    expect(h1.Service).not.toBe(h2.Service);
  });
});
