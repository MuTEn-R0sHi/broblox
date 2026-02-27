/**
 * RewardsService Tests (Obby)
 *
 * Tests the achievement-completed and daily-reward-claimed remote firing
 * performed by the game-level RewardsService config callbacks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("RewardsService (obby)", () => {
  // Captured config callbacks, set by the mocked createRewardsService
  let capturedOnAchievementCompleted:
    | ((event: { playerId: number; achievementId: string; rewards: unknown[] }) => void)
    | undefined;
  let capturedOnDailyRewardClaimed:
    | ((event: { playerId: number; day: number; streak: number; rewards: unknown[] }) => void)
    | undefined;
  let capturedOnPlayerRemoving: ((cb: unknown) => void) | undefined;
  let capturedOnPlayerAdded: ((cb: unknown) => void) | undefined;

  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayers: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayer: { UserId: number; Name: string };

  beforeEach(() => {
    vi.resetModules();

    capturedOnAchievementCompleted = undefined;
    capturedOnDailyRewardClaimed = undefined;
    capturedOnPlayerRemoving = undefined;
    capturedOnPlayerAdded = undefined;
    mockPlayer = { UserId: 42, Name: "TestPlayer" };
    mockRegistry = { fireClient: vi.fn() };

    mockHandle = {
      Service: { name: "RewardsService", onInit: vi.fn(), onStart: vi.fn(), onDestroy: vi.fn() },
      getDailyRewardStore: vi.fn(),
      getAchievementStore: vi.fn(),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    mockPlayers = {
      GetPlayerByUserId: vi.fn(() => mockPlayer),
    };

    vi.doMock("@broblox/rewards", () => ({
      createRewardsService: vi.fn((config: Record<string, unknown>) => {
        capturedOnAchievementCompleted = config[
          "onAchievementCompleted"
        ] as typeof capturedOnAchievementCompleted;
        capturedOnDailyRewardClaimed = config[
          "onDailyRewardClaimed"
        ] as typeof capturedOnDailyRewardClaimed;
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
  });

  async function loadService() {
    return import("./RewardsService");
  }

  it("exports RewardsService, getDailyRewards, getAchievements, cleanupPlayerRewards", async () => {
    const mod = await loadService();
    expect(mod.RewardsService).toBe(mockHandle.Service);
    expect(typeof mod.getDailyRewards).toBe("function");
    expect(typeof mod.getAchievements).toBe("function");
    expect(typeof mod.cleanupPlayerRewards).toBe("function");
  });

  describe("onAchievementCompleted callback", () => {
    const fakeEvent = {
      playerId: 42,
      achievementId: "ach_first_stage",
      rewards: [{ type: "xp", amount: 50 }],
    };

    it("fires AchievementCompleted remote with achievementId and rewards", async () => {
      await loadService();
      capturedOnAchievementCompleted!(fakeEvent);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(42);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("AchievementCompleted", mockPlayer, {
        achievementId: "ach_first_stage",
        rewards: fakeEvent.rewards,
      });
    });

    it("does nothing when player is not found", async () => {
      mockPlayers.GetPlayerByUserId.mockReturnValue(undefined);
      await loadService();
      capturedOnAchievementCompleted!(fakeEvent);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });
  });

  describe("onDailyRewardClaimed callback", () => {
    const fakeEvent = {
      playerId: 42,
      day: 3,
      streak: 3,
      rewards: [{ type: "item", amount: 1, itemId: "checkpoint_token" }],
    };

    it("fires DailyRewardClaimed remote with day, streak, and rewards", async () => {
      await loadService();
      capturedOnDailyRewardClaimed!(fakeEvent);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(42);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("DailyRewardClaimed", mockPlayer, {
        day: 3,
        streak: 3,
        rewards: fakeEvent.rewards,
      });
    });

    it("does nothing when player is not found", async () => {
      mockPlayers.GetPlayerByUserId.mockReturnValue(undefined);
      await loadService();
      capturedOnDailyRewardClaimed!(fakeEvent);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });

    it("fires correct remote for day-7 bonus reward", async () => {
      await loadService();
      const bonusEvent = {
        playerId: 42,
        day: 7,
        streak: 7,
        rewards: [
          { type: "currency", amount: 500 },
          { type: "item", amount: 1, itemId: "speed_coil" },
        ],
      };
      capturedOnDailyRewardClaimed!(bonusEvent);

      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "DailyRewardClaimed",
        mockPlayer,
        expect.objectContaining({ day: 7, streak: 7 })
      );
    });
  });

  describe("getter delegation", () => {
    it("getDailyRewards delegates to handle.getDailyRewardStore", async () => {
      const mod = await loadService();
      mod.getDailyRewards(42);
      expect(mockHandle.getDailyRewardStore).toHaveBeenCalledWith(42);
    });

    it("getAchievements delegates to handle.getAchievementStore", async () => {
      const mod = await loadService();
      mod.getAchievements(42);
      expect(mockHandle.getAchievementStore).toHaveBeenCalledWith(42);
    });

    it("cleanupPlayerRewards delegates to handle.cleanupPlayer", async () => {
      const mod = await loadService();
      mod.cleanupPlayerRewards(42);
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
