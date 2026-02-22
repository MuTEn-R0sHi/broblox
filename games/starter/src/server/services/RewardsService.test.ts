/**
 * RewardsService Tests (Starter)
 *
 * Tests that the achievement-completed and daily-reward-claimed Notification
 * remotes are fired correctly via the game-level RewardsService config callbacks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("RewardsService (starter)", () => {
  let capturedOnAchievementCompleted:
    | ((event: { playerId: number; achievementId: string; rewards: unknown[] }) => void)
    | undefined;
  let capturedOnDailyRewardClaimed:
    | ((event: { playerId: number; day: number; streak: number; rewards: unknown[] }) => void)
    | undefined;

  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayers: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayer: { UserId: number; Name: string };

  beforeEach(() => {
    vi.resetModules();

    capturedOnAchievementCompleted = undefined;
    capturedOnDailyRewardClaimed = undefined;
    mockPlayer = { UserId: 7, Name: "StarterPlayer" };
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

    vi.doMock("@rbx/rewards", () => ({
      createRewardsService: vi.fn((config: Record<string, unknown>) => {
        capturedOnAchievementCompleted = config[
          "onAchievementCompleted"
        ] as typeof capturedOnAchievementCompleted;
        capturedOnDailyRewardClaimed = config[
          "onDailyRewardClaimed"
        ] as typeof capturedOnDailyRewardClaimed;
        return mockHandle;
      }),
    }));

    vi.doMock("@rbxts/services", () => ({ Players: mockPlayers }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: { onPlayerAdded: vi.fn(), onPlayerRemoving: vi.fn() },
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
      playerId: 7,
      achievementId: "ach_first_kill",
      rewards: [{ type: "xp", amount: 100 }],
    };

    it("fires Notification remote with type achievement_completed", async () => {
      await loadService();
      capturedOnAchievementCompleted!(fakeEvent);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(7);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("Notification", mockPlayer, {
        type: "achievement_completed",
        message: "Achievement unlocked!",
        data: { achievementId: "ach_first_kill", rewards: fakeEvent.rewards },
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
      playerId: 7,
      day: 1,
      streak: 1,
      rewards: [{ type: "currency", amount: 100 }],
    };

    it("fires Notification remote with type daily_reward", async () => {
      await loadService();
      capturedOnDailyRewardClaimed!(fakeEvent);

      expect(mockPlayers.GetPlayerByUserId).toHaveBeenCalledWith(7);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith("Notification", mockPlayer, {
        type: "daily_reward",
        message: "Day 1 login reward claimed!",
        data: { day: 1, streak: 1, rewards: fakeEvent.rewards },
      });
    });

    it("includes the streak count in the notification message", async () => {
      await loadService();
      capturedOnDailyRewardClaimed!({ ...fakeEvent, day: 7, streak: 7 });

      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "Notification",
        mockPlayer,
        expect.objectContaining({ message: "Day 7 login reward claimed!" })
      );
    });

    it("does nothing when player is not found", async () => {
      mockPlayers.GetPlayerByUserId.mockReturnValue(undefined);
      await loadService();
      capturedOnDailyRewardClaimed!(fakeEvent);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });
  });
});
