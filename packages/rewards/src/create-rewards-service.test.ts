/**
 * Tests for createRewardsService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createRewardsService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockDailyStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockAchievementStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockDailyStore = {
      init: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
      isDirty: vi.fn(() => false),
    };
    mockAchievementStore = {
      registerAll: vi.fn(),
      init: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
      isDirty: vi.fn(() => false),
    };

    vi.doMock("@rbx/core", () => ({
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
});
