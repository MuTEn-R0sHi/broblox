/**
 * Tests for createLeaderboardService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createLeaderboardService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockStore = {
      register: vi.fn(),
      submitScore: vi.fn(),
      getTopEntries: vi.fn(() => []),
      getPlayerRank: vi.fn(),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./leaderboard-store", () => ({
      LeaderboardStore: function () {
        return mockStore;
      },
    }));
  });

  function makeConfig() {
    return {
      definitions: [
        { name: "kills", sortDirection: "descending", periods: ["alltime"] },
        { name: "coins", sortDirection: "descending", periods: ["daily", "alltime"] },
      ] as never[],
    };
  }

  async function createService(
    cfg?: Parameters<typeof import("./create-leaderboard-service").createLeaderboardService>[0]
  ) {
    const mod = await import("./create-leaderboard-service");
    return mod.createLeaderboardService(cfg ?? makeConfig());
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("LeaderboardService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers all definitions on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockStore.register).toHaveBeenCalledTimes(2);
    expect(mockStore.register).toHaveBeenCalledWith(expect.objectContaining({ name: "kills" }));
    expect(mockStore.register).toHaveBeenCalledWith(expect.objectContaining({ name: "coins" }));
  });

  it("logs registered count on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("2 leaderboards"));
  });

  it("logs on start and destroy", async () => {
    const handle = await createService();
    handle.Service.onStart!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));

    handle.Service.onDestroy!();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("stopped"));
  });

  it("exposes the leaderboard store", async () => {
    const handle = await createService();
    expect(handle.getLeaderboardStore()).toBe(mockStore);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-leaderboard-service");
    const h1 = mod.createLeaderboardService(makeConfig());
    const h2 = mod.createLeaderboardService(makeConfig());
    expect(h1.Service).not.toBe(h2.Service);
  });
});
