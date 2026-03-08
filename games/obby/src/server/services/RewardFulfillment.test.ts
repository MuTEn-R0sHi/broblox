/**
 * RewardFulfillment Tests
 *
 * Verifies that fulfillRewards dispatches each RewardEntry type to the
 * correct service and warns when stores are missing or reward types are
 * unknown/unimplemented.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { type Player, makePlayer } from "./__test-helpers";

describe("fulfillRewards", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockDataService: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockAddXp: ReturnType<typeof vi.fn>;
  let mockAddItem: ReturnType<typeof vi.fn>;
  let mockGrant: ReturnType<typeof vi.fn>;
  let mockGetProgression: ReturnType<typeof vi.fn>;
  let mockGetInventory: ReturnType<typeof vi.fn>;
  let mockGetCosmeticStore: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockDataService = {
      addCoins: vi.fn(),
      getData: vi.fn(() => ({
        coins: 100,
        worlds: {
          grasslands: { currentStage: 1, currentCheckpoint: 0 },
        },
      })),
      getWorldProgress: vi.fn((_player: unknown, _worldId: string) => ({
        currentStage: 1,
        currentCheckpoint: 0,
      })),
    };

    mockRegistry = { fireClient: vi.fn() };

    mockAddXp = vi.fn();
    mockAddItem = vi.fn();
    mockGrant = vi.fn();
    mockGetProgression = vi.fn(() => ({ addXp: mockAddXp }));
    mockGetInventory = vi.fn(() => ({ addItem: mockAddItem }));
    mockGetCosmeticStore = vi.fn(() => ({ grant: mockGrant }));

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));

    vi.doMock("./DataService", () => ({ DataService: mockDataService }));
    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));
    vi.doMock("./ProgressionService", () => ({ getProgression: mockGetProgression }));
    vi.doMock("./InventoryService", () => ({ getInventory: mockGetInventory }));
    vi.doMock("./CosmeticsService", () => ({ getCosmeticStore: mockGetCosmeticStore }));
    vi.doMock("./GachaService", () => ({
      getGachaStore: vi.fn(() => ({
        hatch: vi.fn(() => ({ ok: true, itemId: "pet_1", rarity: "common" })),
      })),
    }));
    vi.doMock("./PetService", () => ({
      getPetStore: vi.fn(() => ({ addPet: vi.fn() })),
    }));
  });

  async function loadFulfillRewards() {
    const mod = await import("./RewardFulfillment");
    return mod.fulfillRewards;
  }

  // ── Currency ─────────────────────────────────────────────────────────

  it("grants currency via DataService.addCoins", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "currency", amount: 50 }]);

    expect(mockDataService.addCoins).toHaveBeenCalledWith(player, 50);
  });

  it("fires PlayerDataSync after granting currency", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "currency", amount: 50 }]);

    expect(mockRegistry.fireClient).toHaveBeenCalledWith(
      "PlayerDataSync",
      player,
      expect.objectContaining({ coins: 100 })
    );
  });

  it("does not fire PlayerDataSync when no currency is granted", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "xp", amount: 100 }]);

    expect(mockRegistry.fireClient).not.toHaveBeenCalled();
  });

  // ── XP ───────────────────────────────────────────────────────────────

  it("grants XP via progression store", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "xp", amount: 200 }]);

    expect(mockGetProgression).toHaveBeenCalledWith(42);
    expect(mockAddXp).toHaveBeenCalledWith(200);
  });

  it("warns when progression store is unavailable", async () => {
    mockGetProgression.mockReturnValue(undefined);
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "xp", amount: 200 }]);

    expect(mockAddXp).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("progression store not loaded")
    );
  });

  // ── Item ─────────────────────────────────────────────────────────────

  it("grants items via inventory store", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "item", amount: 2, itemId: "skip_stage" }]);

    expect(mockGetInventory).toHaveBeenCalledWith(42);
    expect(mockAddItem).toHaveBeenCalledWith("skip_stage", 2);
  });

  it("warns when item reward has no itemId", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "item", amount: 1 }]);

    expect(mockAddItem).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("has no itemId"));
  });

  it("warns when inventory store is unavailable", async () => {
    mockGetInventory.mockReturnValue(undefined);
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "item", amount: 1, itemId: "skip_stage" }]);

    expect(mockAddItem).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("inventory not loaded"));
  });

  // ── Cosmetic ─────────────────────────────────────────────────────────

  it("grants cosmetics via cosmetic store", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "cosmetic", amount: 1, itemId: "rainbow_trail" }]);

    expect(mockGetCosmeticStore).toHaveBeenCalledWith(42);
    expect(mockGrant).toHaveBeenCalledWith("rainbow_trail");
  });

  it("warns when cosmetic reward has no itemId", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "cosmetic", amount: 1 }]);

    expect(mockGrant).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("has no itemId"));
  });

  it("warns when cosmetic store is unavailable", async () => {
    mockGetCosmeticStore.mockReturnValue(undefined);
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "cosmetic", amount: 1, itemId: "rainbow_trail" }]);

    expect(mockGrant).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("cosmetic store not loaded")
    );
  });

  // ── Boost / Custom ──────────────────────────────────────────────────

  it("grants XP for boost reward type", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "boost", amount: 2 }]);

    expect(mockAddXp).toHaveBeenCalledWith(200);
  });

  it("warns for unhandled custom reward type", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "custom", amount: 1 }]);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Unhandled custom reward")
    );
  });

  it("hatches eggs equal to reward.amount for custom egg rewards", async () => {
    const mockHatch = vi.fn(() => ({ ok: true, itemId: "pet_sky", rarity: "rare" }));
    const mockAddPet = vi.fn();
    vi.doMock("./GachaService", () => ({
      getGachaStore: vi.fn(() => ({ hatch: mockHatch })),
    }));
    vi.doMock("./PetService", () => ({
      getPetStore: vi.fn(() => ({ addPet: mockAddPet })),
    }));

    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [
      { type: "custom", amount: 3, itemId: "sky_egg", label: "egg" },
    ]);

    expect(mockHatch).toHaveBeenCalledTimes(3);
    expect(mockAddPet).toHaveBeenCalledTimes(3);
  });

  it("stops hatching on first failure for custom egg rewards", async () => {
    const mockHatch = vi
      .fn()
      .mockReturnValueOnce({ ok: true, itemId: "pet_sky", rarity: "rare" })
      .mockReturnValueOnce({ ok: false });
    const mockAddPet = vi.fn();
    vi.doMock("./GachaService", () => ({
      getGachaStore: vi.fn(() => ({ hatch: mockHatch })),
    }));
    vi.doMock("./PetService", () => ({
      getPetStore: vi.fn(() => ({ addPet: mockAddPet })),
    }));

    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [
      { type: "custom", amount: 3, itemId: "sky_egg", label: "egg" },
    ]);

    expect(mockHatch).toHaveBeenCalledTimes(2);
    expect(mockAddPet).toHaveBeenCalledTimes(1);
  });

  // ── Unknown type ────────────────────────────────────────────────────

  it("warns for unknown reward type", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [{ type: "banana" as never, amount: 1 }]);

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Unknown reward type"));
  });

  // ── Multiple rewards ────────────────────────────────────────────────

  it("fulfills multiple rewards in a single call", async () => {
    const fn = await loadFulfillRewards();
    const player = makePlayer();

    fn(player as unknown as Player, [
      { type: "currency", amount: 100 },
      { type: "xp", amount: 50 },
      { type: "item", amount: 1, itemId: "speed_coil" },
    ]);

    expect(mockDataService.addCoins).toHaveBeenCalledWith(player, 100);
    expect(mockAddXp).toHaveBeenCalledWith(50);
    expect(mockAddItem).toHaveBeenCalledWith("speed_coil", 1);
  });
});
