/**
 * ProgressionService Tests (Obby)
 *
 * Tests the level-up and prestige remote firing and achievement wiring
 * performed by the game-level ProgressionService config callbacks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("ProgressionService (obby)", () => {
  // Captured config callbacks, set by the mocked createProgressionService
  let capturedOnLevelUp: ((playerId: number, level: number) => void) | undefined;
  let capturedOnPrestige: ((playerId: number, prestige: number) => void) | undefined;
  let capturedOnPlayerRemoving: ((cb: unknown) => void) | undefined;
  let capturedOnPlayerAdded: ((cb: unknown) => void) | undefined;

  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayers: Record<string, ReturnType<typeof vi.fn>>;
  let mockGetAchievements: ReturnType<typeof vi.fn>;
  let mockSetProgress: ReturnType<typeof vi.fn>;
  let mockPlayer: { UserId: number; Name: string };

  beforeEach(() => {
    vi.resetModules();

    capturedOnLevelUp = undefined;
    capturedOnPrestige = undefined;
    capturedOnPlayerRemoving = undefined;
    capturedOnPlayerAdded = undefined;

    mockPlayer = { UserId: 42, Name: "TestPlayer" };
    mockRegistry = { fireClient: vi.fn() };
    mockSetProgress = vi.fn();
    mockGetAchievements = vi.fn(() => ({ setProgress: mockSetProgress }));

    mockHandle = {
      Service: {
        name: "ProgressionService",
        onInit: vi.fn(),
        onStart: vi.fn(),
        onDestroy: vi.fn(),
      },
      getProgressionStore: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    mockPlayers = {
      GetPlayerByUserId: vi.fn(() => mockPlayer),
    };

    vi.doMock("@broblox/progression", () => ({
      createProgressionService: vi.fn((config: Record<string, unknown>) => {
        capturedOnLevelUp = config["onLevelUp"] as typeof capturedOnLevelUp;
        capturedOnPrestige = config["onPrestige"] as typeof capturedOnPrestige;
        capturedOnPlayerRemoving = config["onPlayerRemoving"] as typeof capturedOnPlayerRemoving;
        capturedOnPlayerAdded = config["onPlayerAdded"] as typeof capturedOnPlayerAdded;
        return mockHandle;
      }),
    }));

    vi.doMock("@rbxts/services", () => ({ Players: mockPlayers }));

    mockPlayerLifecycle = { onPlayerAdded: vi.fn(), onPlayerRemoving: vi.fn() };
    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./RewardsService", () => ({
      getAchievements: mockGetAchievements,
    }));
  });

  async function loadService() {
    return import("./ProgressionService");
  }

  it("creates the progression service via factory", async () => {
    const { default: progression } = await import("@broblox/progression").then(() => loadService());
    void progression;
    const progressionPkg = await vi.importMock<{
      createProgressionService: ReturnType<typeof vi.fn>;
    }>("@broblox/progression");
    expect(progressionPkg.createProgressionService).toHaveBeenCalledOnce();
  });

  it("exports ProgressionService, getProgression, and cleanupPlayerProgression", async () => {
    const mod = await loadService();
    expect(mod.ProgressionService).toBe(mockHandle.Service);
    expect(typeof mod.getProgression).toBe("function");
    expect(typeof mod.cleanupPlayerProgression).toBe("function");
  });

  describe("onLevelUp callback", () => {
    it("fires LevelUp remote with newLevel", async () => {
      await loadService();
      capturedOnLevelUp!(42, 10);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(42);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("LevelUp", mockPlayer, { newLevel: 10 });
    });

    it("updates ach_level_25 achievement with the new level value", async () => {
      await loadService();
      capturedOnLevelUp!(42, 25);

      expect(mockGetAchievements).toHaveBeenCalledWith(42);
      expect(mockSetProgress).toHaveBeenCalledWith("ach_level_25", 25);
    });

    it("fires both remote and achievement update on the same level-up", async () => {
      await loadService();
      capturedOnLevelUp!(42, 15);

      expect(mockRegistry.fireClient).toHaveBeenCalledWith("LevelUp", mockPlayer, { newLevel: 15 });
      expect(mockSetProgress).toHaveBeenCalledWith("ach_level_25", 15);
    });

    it("does nothing when player is not found", async () => {
      mockPlayers.GetPlayerByUserId.mockReturnValue(undefined);
      await loadService();
      capturedOnLevelUp!(99, 5);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
      expect(mockSetProgress).not.toHaveBeenCalled();
    });

    it("skips achievement update gracefully when achievement store is unavailable", async () => {
      mockGetAchievements.mockReturnValue(undefined);
      await loadService();

      expect(() => capturedOnLevelUp!(42, 10)).not.toThrow();
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("LevelUp", mockPlayer, { newLevel: 10 });
      expect(mockSetProgress).not.toHaveBeenCalled();
    });
  });

  describe("onPrestige callback", () => {
    it("fires PrestigeUnlocked remote with newPrestige", async () => {
      await loadService();
      capturedOnPrestige!(42, 1);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(42);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("PrestigeUnlocked", mockPlayer, {
        newPrestige: 1,
      });
    });

    it("does nothing when player is not found", async () => {
      mockPlayers.GetPlayerByUserId.mockReturnValue(undefined);
      await loadService();
      capturedOnPrestige!(99, 2);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });
  });

  describe("getter delegation", () => {
    it("getProgression delegates to handle.getProgressionStore", async () => {
      const mod = await loadService();
      mod.getProgression(42);
      expect(mockHandle.getProgressionStore).toHaveBeenCalledWith(42);
    });

    it("cleanupPlayerProgression delegates to handle.cleanupPlayer", async () => {
      const mod = await loadService();
      mod.cleanupPlayerProgression(42);
      expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
    });
  });

  describe("lifecycle config callbacks", () => {
    it("onPlayerRemoving delegates to PlayerLifecycleService", async () => {
      await loadService();
      const dummyCb = vi.fn();
      capturedOnPlayerRemoving!(dummyCb);
      expect(mockPlayerLifecycle.onPlayerRemoving).toHaveBeenCalledWith(dummyCb);
    });

    it("onPlayerAdded delegates to PlayerLifecycleService", async () => {
      await loadService();
      const dummyCb = vi.fn();
      capturedOnPlayerAdded!(dummyCb);
      expect(mockPlayerLifecycle.onPlayerAdded).toHaveBeenCalledWith(dummyCb);
    });
  });
});
