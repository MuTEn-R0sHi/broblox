/**
 * Tests for createGachaService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createGachaService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockRegistry = {
      register: vi.fn(),
      count: vi.fn(() => 3),
    };
    mockStore = {
      init: vi.fn(),
      load: vi.fn(),
      save: vi.fn(),
      isDirty: vi.fn(() => false),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./egg-registry", () => ({
      EggRegistry: function () {
        return mockRegistry;
      },
    }));
    vi.doMock("./gacha-store", () => ({
      GachaStore: function () {
        return mockStore;
      },
    }));
  });

  async function createService() {
    const mod = await import("./create-gacha-service");
    return mod.createGachaService({
      eggs: [{ id: "common" }, { id: "rare" }, { id: "legendary" }] as never[],
      datastoreName: "TestGacha",
    });
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("GachaService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers eggs on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockRegistry.register).toHaveBeenCalledTimes(3);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("3 eggs"));
  });

  it("initPlayer creates, inits, and loads store", async () => {
    const handle = await createService();
    const store = handle.initPlayer(42);

    expect(store).toBe(mockStore);
    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
  });

  it("getGachaStore returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getGachaStore(999)).toBeUndefined();
  });

  it("getGachaStore returns store after init", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    expect(handle.getGachaStore(1)).toBe(mockStore);
  });

  it("cleanupPlayer saves dirty store and removes it", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).toHaveBeenCalled();
    expect(handle.getGachaStore(1)).toBeUndefined();
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
  });

  it("exposes getEggRegistry", async () => {
    const handle = await createService();
    expect(handle.getEggRegistry()).toBe(mockRegistry);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-gacha-service");
    const h1 = mod.createGachaService({ eggs: [], datastoreName: "A" });
    const h2 = mod.createGachaService({ eggs: [], datastoreName: "B" });
    expect(h1.Service).not.toBe(h2.Service);
  });
});
