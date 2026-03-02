/**
 * BattlePassService Tests (Obby)
 *
 * Tests the createBattlePassService wrapper config and export delegation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("BattlePassService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;
  let mockHandle: Record<string, unknown> & {
    Service: { name: string };
    getSeasonRegistry: ReturnType<typeof vi.fn>;
    getBattlePassStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };
  let mockPlayerLifecycle: Record<string, unknown> & {
    onPlayerRemoving: ReturnType<typeof vi.fn>;
    onPlayerAdded: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockHandle = {
      Service: { name: "BattlePassService" },
      getSeasonRegistry: vi.fn(() => "season-registry"),
      getBattlePassStore: vi.fn(() => "bp-store"),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    mockPlayerLifecycle = { onPlayerRemoving: vi.fn(), onPlayerAdded: vi.fn() };

    vi.doMock("@broblox/battle-pass", () => ({
      createBattlePassService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));
  });

  async function loadService() {
    return import("./BattlePassService");
  }

  it("exports BattlePassService and getter functions", async () => {
    const mod = await loadService();
    expect(mod.BattlePassService).toBe(mockHandle.Service);
    expect(typeof mod.getSeasonRegistry).toBe("function");
    expect(typeof mod.getBattlePassStore).toBe("function");
    expect(typeof mod.initPlayerBattlePass).toBe("function");
    expect(typeof mod.cleanupPlayerBattlePass).toBe("function");
  });

  it("configures obby_s1 season with 10 tiers", async () => {
    await loadService();
    const seasons = capturedConfig!["seasons"] as Array<{
      id: string;
      tiers: unknown[];
    }>;
    expect(seasons).toHaveLength(1);
    expect(seasons[0].id).toBe("obby_s1");
    expect(seasons[0].tiers).toHaveLength(10);
  });

  it("delegates getBattlePassStore to handle", async () => {
    const mod = await loadService();
    mod.getBattlePassStore(42);
    expect(mockHandle.getBattlePassStore).toHaveBeenCalledWith(42);
  });

  it("delegates initPlayerBattlePass to handle.initPlayer", async () => {
    const mod = await loadService();
    mod.initPlayerBattlePass(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerBattlePass to handle.cleanupPlayer", async () => {
    const mod = await loadService();
    mod.cleanupPlayerBattlePass(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });

  it("wires lifecycle callbacks to PlayerLifecycleService", async () => {
    await loadService();
    const cb = vi.fn();
    (capturedConfig!["onPlayerRemoving"] as (cb: unknown) => void)(cb);
    expect(mockPlayerLifecycle.onPlayerRemoving).toHaveBeenCalledWith(cb);
  });
});
