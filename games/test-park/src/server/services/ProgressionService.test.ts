/**
 * ProgressionService Tests (Test Park)
 *
 * Tests the level-up / prestige Notification remote firing and the
 * level-based achievement wiring of the game-level ProgressionService.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("ProgressionService (test-park)", () => {
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
  let mockTrack: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    capturedOnLevelUp = undefined;
    capturedOnPrestige = undefined;
    capturedOnPlayerRemoving = undefined;
    capturedOnPlayerAdded = undefined;
    mockPlayer = { UserId: 7, Name: "StarterPlayer" };
    mockRegistry = { fireClient: vi.fn() };
    mockSetProgress = vi.fn();
    mockGetAchievements = vi.fn(() => ({ setProgress: mockSetProgress }));
    mockTrack = vi.fn();

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

    vi.doMock("./AnalyticsService", () => ({
      getEventTracker: () => ({ track: mockTrack }),
    }));
  });

  async function loadService() {
    return import("./ProgressionService");
  }

  it("exports ProgressionService, getProgression, and cleanupPlayerProgression", async () => {
    const mod = await loadService();
    expect(mod.ProgressionService).toBe(mockHandle.Service);
    expect(typeof mod.getProgression).toBe("function");
    expect(typeof mod.cleanupPlayerProgression).toBe("function");
  });

  describe("onLevelUp callback", () => {
    it("fires level_up Notification to the player", async () => {
      await loadService();
      capturedOnLevelUp!(7, 10);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(7);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("Notification", mockPlayer, {
        type: "level_up",
        message: "You reached level 10!",
        data: { level: 10 },
      });
    });

    it("updates ach_level_10 and ach_level_50 achievements with current level", async () => {
      await loadService();
      capturedOnLevelUp!(7, 10);

      expect(mockGetAchievements).toHaveBeenCalledWith(7);
      expect(mockSetProgress).toHaveBeenCalledWith("ach_level_10", 10);
      expect(mockSetProgress).toHaveBeenCalledWith("ach_level_50", 10);
    });

    it("fires both remote and achievement updates on the same level-up", async () => {
      await loadService();
      capturedOnLevelUp!(7, 50);

      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "Notification",
        mockPlayer,
        expect.objectContaining({ message: "You reached level 50!" })
      );
      expect(mockSetProgress).toHaveBeenCalledWith("ach_level_50", 50);
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

      expect(() => capturedOnLevelUp!(7, 10)).not.toThrow();
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "Notification",
        mockPlayer,
        expect.objectContaining({ type: "level_up" })
      );
      expect(mockSetProgress).not.toHaveBeenCalled();
    });

    it("tracks player.level_up analytics event on level-up", async () => {
      await loadService();
      capturedOnLevelUp!(7, 15);
      expect(mockTrack).toHaveBeenCalledWith("player.level_up", 7, { level: 15 });
    });
  });

  describe("onPrestige callback", () => {
    it("fires prestige Notification to the player", async () => {
      await loadService();
      capturedOnPrestige!(7, 1);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(7);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("Notification", mockPlayer, {
        type: "prestige",
        message: "You achieved prestige 1!",
        data: { prestige: 1 },
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
