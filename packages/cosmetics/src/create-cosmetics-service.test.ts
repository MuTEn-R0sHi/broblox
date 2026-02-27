/**
 * Tests for createCosmeticsService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createCosmeticsService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockRegistry = {
      register: vi.fn(),
      count: vi.fn(() => 5),
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
    vi.doMock("./cosmetic-registry", () => ({
      CosmeticRegistry: function () {
        return mockRegistry;
      },
    }));
    vi.doMock("./cosmetic-store", () => ({
      CosmeticStore: function () {
        return mockStore;
      },
    }));
  });

  async function createService() {
    const mod = await import("./create-cosmetics-service");
    return mod.createCosmeticsService({
      cosmetics: [{ id: "hat1" }, { id: "hat2" }] as never[],
      datastoreName: "TestCosmetics",
    });
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("CosmeticsService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers cosmetics on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockRegistry.register).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("5 items"));
  });

  it("initPlayer creates, inits, and loads store", async () => {
    const handle = await createService();
    const store = handle.initPlayer(42);

    expect(store).toBe(mockStore);
    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
  });

  it("getCosmeticStore returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getCosmeticStore(999)).toBeUndefined();
  });

  it("getCosmeticStore returns store after init", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    expect(handle.getCosmeticStore(1)).toBe(mockStore);
  });

  it("cleanupPlayer saves dirty store and removes it", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).toHaveBeenCalled();
    expect(handle.getCosmeticStore(1)).toBeUndefined();
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

  it("onDestroy skips clean stores", async () => {
    mockStore.isDirty.mockReturnValue(false);
    const handle = await createService();
    handle.initPlayer(1);
    handle.Service.onDestroy!();

    expect(mockStore.save).not.toHaveBeenCalled();
  });

  it("exposes getCosmeticRegistry", async () => {
    const handle = await createService();
    expect(handle.getCosmeticRegistry()).toBe(mockRegistry);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-cosmetics-service");
    const h1 = mod.createCosmeticsService({ cosmetics: [], datastoreName: "A" });
    const h2 = mod.createCosmeticsService({ cosmetics: [], datastoreName: "B" });
    expect(h1.Service).not.toBe(h2.Service);
  });

  describe("onStart lifecycle", () => {
    it("logs and wires onPlayerAdded callback to initPlayer", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const mod = await import("./create-cosmetics-service");
      const handle = mod.createCosmeticsService({
        cosmetics: [] as never[],
        datastoreName: "TestCosmetics",
        onPlayerAdded: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      } as never);

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
      const mod = await import("./create-cosmetics-service");
      const handle = mod.createCosmeticsService({
        cosmetics: [] as never[],
        datastoreName: "TestCosmetics",
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      } as never);

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockStore.isDirty.mockReturnValue(true);

      capturedCb!({ UserId: 42 });

      expect(mockStore.save).toHaveBeenCalled();
      expect(handle.getCosmeticStore(42)).toBeUndefined();
    });

    it("skips save for clean store on player removing", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const mod = await import("./create-cosmetics-service");
      const handle = mod.createCosmeticsService({
        cosmetics: [] as never[],
        datastoreName: "TestCosmetics",
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      } as never);

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockStore.isDirty.mockReturnValue(false);

      capturedCb!({ UserId: 42 });

      expect(mockStore.save).not.toHaveBeenCalled();
      expect(handle.getCosmeticStore(42)).toBeUndefined();
    });
  });
});
