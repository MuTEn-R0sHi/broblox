/**
 * Tests for createBattlePassService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createBattlePassService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockSeasonRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockSeasonRegistry = {
      register: vi.fn(),
      count: vi.fn(() => 1),
      getActive: vi.fn(() => ({ id: "season-1" })),
    };
    mockStore = {
      init: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
      isDirty: vi.fn(() => false),
      setSeason: vi.fn(),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./season-registry", () => ({
      SeasonRegistry: function () {
        return mockSeasonRegistry;
      },
    }));
    vi.doMock("./battle-pass-store", () => ({
      BattlePassStore: function () {
        return mockStore;
      },
    }));
  });

  function makeConfig() {
    return {
      seasons: [{ id: "season-1", name: "Season 1" }] as never[],
      datastoreName: "TestBattlePass",
    };
  }

  async function createService() {
    const mod = await import("./create-battle-pass-service");
    return mod.createBattlePassService(makeConfig());
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("BattlePassService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers seasons on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockSeasonRegistry.register).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("1 seasons"));
  });

  it("logs on start", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));
  });

  it("initPlayer creates, inits, loads, and sets active season", async () => {
    const handle = await createService();
    const store = handle.initPlayer(42);

    expect(store).toBe(mockStore);
    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
    expect(mockStore.setSeason).toHaveBeenCalledWith("season-1");
  });

  it("initPlayer skips setSeason when no active season", async () => {
    mockSeasonRegistry.getActive.mockReturnValue(undefined);
    const handle = await createService();
    handle.initPlayer(1);

    expect(mockStore.setSeason).not.toHaveBeenCalled();
  });

  it("getBattlePassStore returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getBattlePassStore(999)).toBeUndefined();
  });

  it("getBattlePassStore returns store after init", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    expect(handle.getBattlePassStore(1)).toBe(mockStore);
  });

  it("cleanupPlayer saves dirty store and removes it", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).toHaveBeenCalled();
    expect(handle.getBattlePassStore(1)).toBeUndefined();
  });

  it("cleanupPlayer skips save for clean store", async () => {
    mockStore.isDirty.mockReturnValue(false);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).not.toHaveBeenCalled();
  });

  it("onDestroy saves all dirty stores", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.Service.onDestroy!();

    expect(mockStore.save).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Saved battle pass"));
  });

  it("onDestroy skips clean stores", async () => {
    mockStore.isDirty.mockReturnValue(false);
    const handle = await createService();
    handle.initPlayer(1);
    handle.Service.onDestroy!();

    expect(mockStore.save).not.toHaveBeenCalled();
  });

  it("exposes getSeasonRegistry", async () => {
    const handle = await createService();
    expect(handle.getSeasonRegistry()).toBe(mockSeasonRegistry);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-battle-pass-service");
    const h1 = mod.createBattlePassService(makeConfig());
    const h2 = mod.createBattlePassService(makeConfig());
    expect(h1.Service).not.toBe(h2.Service);
  });
});
