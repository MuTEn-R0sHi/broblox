/**
 * Tests for createInventoryService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createInventoryService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockRegistry = {
      register: vi.fn(),
      count: vi.fn(() => 4),
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
    vi.doMock("./item-registry", () => ({
      ItemRegistry: function () {
        return mockRegistry;
      },
    }));
    vi.doMock("./inventory-store", () => ({
      InventoryStore: function () {
        return mockStore;
      },
    }));
  });

  async function createService(
    overrides?: Partial<{ defaultMaxSlots: number; maxTotalItems: number }>
  ) {
    const mod = await import("./create-inventory-service");
    return mod.createInventoryService({
      items: [{ id: "sword" }, { id: "shield" }] as never[],
      datastoreName: "TestInventory",
      ...overrides,
    });
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("InventoryService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers items on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockRegistry.register).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("4 items"));
  });

  it("initPlayer creates store with default slot limits", async () => {
    const handle = await createService();
    handle.initPlayer(42);

    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
  });

  it("initPlayer applies custom slot limits", async () => {
    const handle = await createService({ defaultMaxSlots: 50, maxTotalItems: 200 });
    handle.initPlayer(1);

    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
  });

  it("getInventoryStore returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getInventoryStore(999)).toBeUndefined();
  });

  it("getInventoryStore returns store after init", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    expect(handle.getInventoryStore(1)).toBe(mockStore);
  });

  it("cleanupPlayer saves dirty store and removes it", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).toHaveBeenCalled();
    expect(handle.getInventoryStore(1)).toBeUndefined();
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

  it("exposes getItemRegistry", async () => {
    const handle = await createService();
    expect(handle.getItemRegistry()).toBe(mockRegistry);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-inventory-service");
    const h1 = mod.createInventoryService({ items: [], datastoreName: "A" });
    const h2 = mod.createInventoryService({ items: [], datastoreName: "B" });
    expect(h1.Service).not.toBe(h2.Service);
  });

  describe("onStart lifecycle", () => {
    it("logs and wires onPlayerAdded callback to initPlayer", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const mod = await import("./create-inventory-service");
      const handle = mod.createInventoryService({
        items: [] as never[],
        datastoreName: "TestInventory",
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
      const mod = await import("./create-inventory-service");
      const handle = mod.createInventoryService({
        items: [] as never[],
        datastoreName: "TestInventory",
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      } as never);

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockStore.isDirty.mockReturnValue(true);

      capturedCb!({ UserId: 42 });

      expect(mockStore.save).toHaveBeenCalled();
      expect(handle.getInventoryStore(42)).toBeUndefined();
    });

    it("skips save for clean store on player removing", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const mod = await import("./create-inventory-service");
      const handle = mod.createInventoryService({
        items: [] as never[],
        datastoreName: "TestInventory",
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      } as never);

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockStore.isDirty.mockReturnValue(false);

      capturedCb!({ UserId: 42 });

      expect(mockStore.save).not.toHaveBeenCalled();
      expect(handle.getInventoryStore(42)).toBeUndefined();
    });
  });
});
