/**
 * RewardFulfillment Tests (Test Park)
 *
 * Tests the fulfillRewards dispatch function that routes reward descriptors
 * to the correct domain services.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

type Player = { UserId: number; Name: string };

describe("RewardFulfillment (test-park)", () => {
  let mockDataService: Record<string, unknown> & {
    getData: ReturnType<typeof vi.fn>;
    addCoins: ReturnType<typeof vi.fn>;
  };
  let mockRemoteRegistry: Record<string, unknown> & {
    fireClient: ReturnType<typeof vi.fn>;
  };
  let mockProgression: Record<string, unknown> & {
    addXp: ReturnType<typeof vi.fn>;
  };
  let mockInventory: Record<string, unknown> & {
    addItem: ReturnType<typeof vi.fn>;
  };
  let mockCosmeticStore: Record<string, unknown> & {
    grant: ReturnType<typeof vi.fn>;
  };
  let mockPlayer: Player;

  beforeEach(() => {
    vi.resetModules();
    mockPlayer = { UserId: 42, Name: "TestPlayer" };

    mockDataService = {
      getData: vi.fn(() => ({ coins: 100, kills: 5 })),
      addCoins: vi.fn(),
    };

    mockRemoteRegistry = {
      fireClient: vi.fn(),
    };

    mockProgression = {
      addXp: vi.fn(),
    };

    mockInventory = {
      addItem: vi.fn(),
    };

    mockCosmeticStore = {
      grant: vi.fn(),
    };

    vi.doMock("./DataService", () => ({
      DataService: mockDataService,
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRemoteRegistry },
    }));

    vi.doMock("./ProgressionService", () => ({
      getProgression: vi.fn(() => mockProgression),
    }));

    vi.doMock("./InventoryService", () => ({
      getInventory: vi.fn(() => mockInventory),
    }));

    vi.doMock("./CosmeticsService", () => ({
      getCosmeticStore: vi.fn(() => mockCosmeticStore),
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

  async function loadFulfill() {
    const mod = await import("./RewardFulfillment");
    return mod.fulfillRewards;
  }

  it("grants currency reward and fires PlayerDataSync", async () => {
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [{ type: "currency", amount: 100 }]);
    expect(mockDataService.addCoins).toHaveBeenCalledWith(mockPlayer, 100);
    expect(mockRemoteRegistry.fireClient).toHaveBeenCalledWith(
      "PlayerDataSync",
      mockPlayer,
      expect.objectContaining({ coins: 100 })
    );
  });

  it("grants XP reward", async () => {
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [{ type: "xp", amount: 200 }]);
    expect(mockProgression.addXp).toHaveBeenCalledWith(200);
  });

  it("grants item reward", async () => {
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [{ type: "item", amount: 3, itemId: "speed_coil" }]);
    expect(mockInventory.addItem).toHaveBeenCalledWith("speed_coil", 3);
  });

  it("grants cosmetic reward", async () => {
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [{ type: "cosmetic", amount: 1, itemId: "crown_hat" }]);
    expect(mockCosmeticStore.grant).toHaveBeenCalledWith("crown_hat");
  });

  it("skips item reward without itemId", async () => {
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [{ type: "item", amount: 1 }]);
    expect(mockInventory.addItem).not.toHaveBeenCalled();
  });

  it("skips cosmetic reward without itemId", async () => {
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [{ type: "cosmetic", amount: 1 }]);
    expect(mockCosmeticStore.grant).not.toHaveBeenCalled();
  });

  it("handles boost and custom types gracefully (warns, no crash)", async () => {
    const fulfill = await loadFulfill();
    // Should not throw
    fulfill(mockPlayer, [
      { type: "boost", amount: 5 },
      { type: "custom", amount: 1, itemId: "sky_egg", label: "egg" },
    ]);
  });

  it("handles unknown reward type gracefully", async () => {
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [{ type: "unknown_type" as unknown as "currency", amount: 1 }]);
    // Should not throw
  });

  it("does not fire PlayerDataSync if no currency granted", async () => {
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [{ type: "xp", amount: 100 }]);
    expect(mockRemoteRegistry.fireClient).not.toHaveBeenCalled();
  });

  it("handles multiple rewards in one call", async () => {
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [
      { type: "currency", amount: 50 },
      { type: "xp", amount: 100 },
      { type: "item", amount: 1, itemId: "skip_stage" },
    ]);
    expect(mockDataService.addCoins).toHaveBeenCalledWith(mockPlayer, 50);
    expect(mockProgression.addXp).toHaveBeenCalledWith(100);
    expect(mockInventory.addItem).toHaveBeenCalledWith("skip_stage", 1);
    expect(mockRemoteRegistry.fireClient).toHaveBeenCalled();
  });

  it("skips XP when progression store not loaded", async () => {
    vi.doMock("./ProgressionService", () => ({
      getProgression: vi.fn(() => undefined),
    }));
    const fulfill = await loadFulfill();
    // Should not throw
    fulfill(mockPlayer, [{ type: "xp", amount: 100 }]);
  });

  it("skips item when inventory not loaded", async () => {
    vi.doMock("./InventoryService", () => ({
      getInventory: vi.fn(() => undefined),
    }));
    const fulfill = await loadFulfill();
    fulfill(mockPlayer, [{ type: "item", amount: 1, itemId: "speed_coil" }]);
  });
});
