/**
 * Tests for createProgressionService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createProgressionService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockStore = {
      init: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
      isDirty: vi.fn(() => false),
      onLevelUp: vi.fn(),
      onPrestige: vi.fn(),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./progression-store", () => ({
      ProgressionStore: function () {
        return mockStore;
      },
    }));
  });

  function makeConfig(overrides?: Record<string, unknown>) {
    return {
      datastoreName: "TestProgression",
      maxLevel: 50,
      xpCurve: "quadratic" as const,
      baseXp: 100,
      growthFactor: 1.5,
      ...overrides,
    };
  }

  async function createService(overrides?: Record<string, unknown>) {
    const mod = await import("./create-progression-service");
    return mod.createProgressionService(makeConfig(overrides) as never);
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("ProgressionService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("logs config on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("maxLevel=50"));
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("quadratic"));
  });

  it("initPlayer creates store with config values", async () => {
    const handle = await createService();
    handle.initPlayer(42);

    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
  });

  it("initPlayer applies prestige defaults", async () => {
    const handle = await createService();
    handle.initPlayer(1);

    expect(mockStore.init).toHaveBeenCalled();
  });

  it("initPlayer registers onLevelUp callback when provided", async () => {
    const onLevelUp = vi.fn();
    const handle = await createService({ onLevelUp });
    handle.initPlayer(1);

    expect(mockStore.onLevelUp).toHaveBeenCalledWith(expect.any(Function));
  });

  it("initPlayer registers onPrestige callback when provided", async () => {
    const onPrestige = vi.fn();
    const handle = await createService({ onPrestige });
    handle.initPlayer(1);

    expect(mockStore.onPrestige).toHaveBeenCalledWith(expect.any(Function));
  });

  it("initPlayer skips callbacks when not provided", async () => {
    const handle = await createService();
    handle.initPlayer(1);

    expect(mockStore.onLevelUp).not.toHaveBeenCalled();
    expect(mockStore.onPrestige).not.toHaveBeenCalled();
  });

  it("onLevelUp callback forwards playerId and level", async () => {
    const onLevelUp = vi.fn();
    const handle = await createService({ onLevelUp });
    handle.initPlayer(42);

    const registeredCb = mockStore.onLevelUp.mock.calls[0][0];
    registeredCb({ newLevel: 10 });
    expect(onLevelUp).toHaveBeenCalledWith(42, 10);
  });

  it("onPrestige callback forwards playerId and prestige", async () => {
    const onPrestige = vi.fn();
    const handle = await createService({ onPrestige });
    handle.initPlayer(42);

    const registeredCb = mockStore.onPrestige.mock.calls[0][0];
    registeredCb({ newPrestige: 3 });
    expect(onPrestige).toHaveBeenCalledWith(42, 3);
  });

  it("getProgressionStore returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getProgressionStore(999)).toBeUndefined();
  });

  it("getProgressionStore returns store after init", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    expect(handle.getProgressionStore(1)).toBe(mockStore);
  });

  it("cleanupPlayer saves dirty store and removes it", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).toHaveBeenCalled();
    expect(handle.getProgressionStore(1)).toBeUndefined();
  });

  it("cleanupPlayer skips save for clean store", async () => {
    mockStore.isDirty.mockReturnValue(false);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).not.toHaveBeenCalled();
  });

  it("onDestroy saves dirty stores", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.Service.onDestroy!();

    expect(mockStore.save).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Saved progression"));
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-progression-service");
    const h1 = mod.createProgressionService(makeConfig() as never);
    const h2 = mod.createProgressionService(makeConfig() as never);
    expect(h1.Service).not.toBe(h2.Service);
  });

  describe("onStart lifecycle", () => {
    it("logs and wires onPlayerAdded callback to initPlayer", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const handle = await createService({
        onPlayerAdded: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      });

      handle.Service.onStart!();

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));
      expect(capturedCb).toBeDefined();

      capturedCb!({ UserId: 42 });
      expect(mockStore.init).toHaveBeenCalled();
      expect(mockStore.load).toHaveBeenCalled();
    });
  });

  describe("onInit player-removing callback", () => {
    it("saves dirty store on player removing", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const handle = await createService({
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      });

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockStore.isDirty.mockReturnValue(true);

      capturedCb!({ UserId: 42 });

      expect(mockStore.save).toHaveBeenCalled();
      expect(handle.getProgressionStore(42)).toBeUndefined();
    });

    it("skips save for clean store on player removing", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const handle = await createService({
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      });

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockStore.isDirty.mockReturnValue(false);

      capturedCb!({ UserId: 42 });

      expect(mockStore.save).not.toHaveBeenCalled();
      expect(handle.getProgressionStore(42)).toBeUndefined();
    });
  });
});
