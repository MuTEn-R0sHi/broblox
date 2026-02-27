/**
 * Tests for createRewardsService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createRewardsService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockDailyStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockAchievementStore: Record<string, ReturnType<typeof vi.fn>>;
  let capturedAchievementCompletedHandler: ((e: unknown) => void) | undefined;
  let capturedDailyClaimedHandler: ((e: unknown) => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
    capturedAchievementCompletedHandler = undefined;
    capturedDailyClaimedHandler = undefined;

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockDailyStore = {
      init: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
      isDirty: vi.fn(() => false),
      onClaimed: vi.fn((cb: (e: unknown) => void) => {
        capturedDailyClaimedHandler = cb;
      }),
    };
    mockAchievementStore = {
      registerAll: vi.fn(),
      init: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
      isDirty: vi.fn(() => false),
      onAchievementCompleted: vi.fn((cb: (e: unknown) => void) => {
        capturedAchievementCompletedHandler = cb;
      }),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./daily-reward-store", () => ({
      DailyRewardStore: function () {
        return mockDailyStore;
      },
    }));
    vi.doMock("./achievement-store", () => ({
      AchievementStore: function () {
        return mockAchievementStore;
      },
    }));
  });

  function makeConfig() {
    return {
      rewardCycle: [{ day: 1, reward: "coins" }] as never[],
      achievements: [{ id: "a1" }, { id: "a2" }] as never[],
      dailyDatastoreName: "TestDaily",
      achievementDatastoreName: "TestAchievements",
    };
  }

  async function createService() {
    const mod = await import("./create-rewards-service");
    return mod.createRewardsService(makeConfig());
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("RewardsService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("logs config on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("day cycle"));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("achievements"));
  });

  it("initPlayer creates both daily and achievement stores", async () => {
    const handle = await createService();
    const { daily, achievements } = handle.initPlayer(42);

    expect(daily).toBe(mockDailyStore);
    expect(achievements).toBe(mockAchievementStore);
    expect(mockDailyStore.init).toHaveBeenCalled();
    expect(mockDailyStore.load).toHaveBeenCalled();
    expect(mockAchievementStore.registerAll).toHaveBeenCalled();
    expect(mockAchievementStore.init).toHaveBeenCalled();
    expect(mockAchievementStore.load).toHaveBeenCalled();
  });

  it("getDailyRewardStore returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getDailyRewardStore(999)).toBeUndefined();
  });

  it("getAchievementStore returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getAchievementStore(999)).toBeUndefined();
  });

  it("getDailyRewardStore returns store after init", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    expect(handle.getDailyRewardStore(1)).toBe(mockDailyStore);
  });

  it("getAchievementStore returns store after init", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    expect(handle.getAchievementStore(1)).toBe(mockAchievementStore);
  });

  it("cleanupPlayer saves dirty daily store", async () => {
    mockDailyStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockDailyStore.save).toHaveBeenCalled();
    expect(handle.getDailyRewardStore(1)).toBeUndefined();
  });

  it("cleanupPlayer saves dirty achievement store", async () => {
    mockAchievementStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockAchievementStore.save).toHaveBeenCalled();
    expect(handle.getAchievementStore(1)).toBeUndefined();
  });

  it("cleanupPlayer skips save for clean stores", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockDailyStore.save).not.toHaveBeenCalled();
    expect(mockAchievementStore.save).not.toHaveBeenCalled();
  });

  it("onDestroy saves all dirty stores", async () => {
    mockDailyStore.isDirty.mockReturnValue(true);
    mockAchievementStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.Service.onDestroy!();

    expect(mockDailyStore.save).toHaveBeenCalled();
    expect(mockAchievementStore.save).toHaveBeenCalled();
  });

  it("onDestroy skips clean stores", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    handle.Service.onDestroy!();

    expect(mockDailyStore.save).not.toHaveBeenCalled();
    expect(mockAchievementStore.save).not.toHaveBeenCalled();
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-rewards-service");
    const h1 = mod.createRewardsService(makeConfig());
    const h2 = mod.createRewardsService(makeConfig());
    expect(h1.Service).not.toBe(h2.Service);
  });

  describe("onAchievementCompleted config callback", () => {
    it("wires onAchievementCompleted to achievement store on initPlayer", async () => {
      const onAchievementCompleted = vi.fn();
      const mod = await import("./create-rewards-service");
      const handle = mod.createRewardsService({ ...makeConfig(), onAchievementCompleted });
      handle.initPlayer(5);

      expect(mockAchievementStore.onAchievementCompleted).toHaveBeenCalled();
    });

    it("invokes onAchievementCompleted with the full event when store fires", async () => {
      const onAchievementCompleted = vi.fn();
      const mod = await import("./create-rewards-service");
      const handle = mod.createRewardsService({ ...makeConfig(), onAchievementCompleted });
      handle.initPlayer(5);

      const fakeEvent = {
        playerId: 5,
        achievementId: "ach_first_stage",
        rewards: [{ type: "xp", amount: 50 }],
      };
      capturedAchievementCompletedHandler!(fakeEvent);

      expect(onAchievementCompleted).toHaveBeenCalledWith(fakeEvent);
    });

    it("does not subscribe when onAchievementCompleted is not provided", async () => {
      const mod = await import("./create-rewards-service");
      const handle = mod.createRewardsService(makeConfig());
      handle.initPlayer(1);

      expect(mockAchievementStore.onAchievementCompleted).not.toHaveBeenCalled();
    });
  });

  describe("onDailyRewardClaimed config callback", () => {
    it("wires onDailyRewardClaimed to daily store on initPlayer", async () => {
      const onDailyRewardClaimed = vi.fn();
      const mod = await import("./create-rewards-service");
      const handle = mod.createRewardsService({ ...makeConfig(), onDailyRewardClaimed });
      handle.initPlayer(9);

      expect(mockDailyStore.onClaimed).toHaveBeenCalled();
    });

    it("invokes onDailyRewardClaimed with the full event when daily store fires", async () => {
      const onDailyRewardClaimed = vi.fn();
      const mod = await import("./create-rewards-service");
      const handle = mod.createRewardsService({ ...makeConfig(), onDailyRewardClaimed });
      handle.initPlayer(9);

      const fakeEvent = {
        playerId: 9,
        day: 3,
        streak: 3,
        rewards: [{ type: "item", amount: 1, itemId: "checkpoint_token" }],
      };
      capturedDailyClaimedHandler!(fakeEvent);

      expect(onDailyRewardClaimed).toHaveBeenCalledWith(fakeEvent);
    });

    it("does not subscribe when onDailyRewardClaimed is not provided", async () => {
      const mod = await import("./create-rewards-service");
      const handle = mod.createRewardsService(makeConfig());
      handle.initPlayer(1);

      expect(mockDailyStore.onClaimed).not.toHaveBeenCalled();
    });
  });

  describe("onStart lifecycle", () => {
    it("logs and wires onPlayerAdded callback to initPlayer", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const mod = await import("./create-rewards-service");
      const handle = mod.createRewardsService({
        ...makeConfig(),
        onPlayerAdded: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      });

      handle.Service.onStart!();

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));
      expect(capturedCb).toBeDefined();

      capturedCb!({ UserId: 42 });
      expect(mockDailyStore.init).toHaveBeenCalled();
      expect(mockDailyStore.load).toHaveBeenCalled();
      expect(mockAchievementStore.init).toHaveBeenCalled();
      expect(mockAchievementStore.load).toHaveBeenCalled();
    });
  });

  describe("onInit player-removing callback", () => {
    it("saves dirty stores on player removing", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const mod = await import("./create-rewards-service");
      const handle = mod.createRewardsService({
        ...makeConfig(),
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      });

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockDailyStore.isDirty.mockReturnValue(true);
      mockAchievementStore.isDirty.mockReturnValue(true);

      capturedCb!({ UserId: 42 });

      expect(mockDailyStore.save).toHaveBeenCalled();
      expect(mockAchievementStore.save).toHaveBeenCalled();
      expect(handle.getDailyRewardStore(42)).toBeUndefined();
      expect(handle.getAchievementStore(42)).toBeUndefined();
    });

    it("skips save for clean stores on player removing", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const mod = await import("./create-rewards-service");
      const handle = mod.createRewardsService({
        ...makeConfig(),
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      });

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockDailyStore.isDirty.mockReturnValue(false);
      mockAchievementStore.isDirty.mockReturnValue(false);

      capturedCb!({ UserId: 42 });

      expect(mockDailyStore.save).not.toHaveBeenCalled();
      expect(mockAchievementStore.save).not.toHaveBeenCalled();
      expect(handle.getDailyRewardStore(42)).toBeUndefined();
      expect(handle.getAchievementStore(42)).toBeUndefined();
    });
  });
});
