/**
 * Tests for createPetService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createPetService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockRegistry = {
      register: vi.fn(),
      count: vi.fn(() => 2),
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
    vi.doMock("./pet-registry", () => ({
      PetRegistry: function () {
        return mockRegistry;
      },
    }));
    vi.doMock("./pet-store", () => ({
      PetStore: function () {
        return mockStore;
      },
    }));
  });

  async function createService(overrides?: Partial<{ maxEquipped: number }>) {
    const mod = await import("./create-pet-service");
    return mod.createPetService({
      pets: [{ id: "cat" }, { id: "dog" }] as never[],
      datastoreName: "TestPets",
      ...overrides,
    });
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("PetService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers pets on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockRegistry.register).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("2 species"));
  });

  it("initPlayer creates store with default maxEquipped", async () => {
    const handle = await createService();
    handle.initPlayer(42);

    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
  });

  it("initPlayer applies custom maxEquipped", async () => {
    const handle = await createService({ maxEquipped: 5 });
    handle.initPlayer(1);

    expect(mockStore.init).toHaveBeenCalled();
    expect(mockStore.load).toHaveBeenCalled();
  });

  it("getPetStore returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getPetStore(999)).toBeUndefined();
  });

  it("getPetStore returns store after init", async () => {
    const handle = await createService();
    handle.initPlayer(1);
    expect(handle.getPetStore(1)).toBe(mockStore);
  });

  it("cleanupPlayer saves dirty store and removes it", async () => {
    mockStore.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockStore.save).toHaveBeenCalled();
    expect(handle.getPetStore(1)).toBeUndefined();
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

  it("exposes getPetRegistry", async () => {
    const handle = await createService();
    expect(handle.getPetRegistry()).toBe(mockRegistry);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-pet-service");
    const h1 = mod.createPetService({ pets: [], datastoreName: "A" });
    const h2 = mod.createPetService({ pets: [], datastoreName: "B" });
    expect(h1.Service).not.toBe(h2.Service);
  });

  describe("onStart lifecycle", () => {
    it("logs and wires onPlayerAdded callback to initPlayer", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const mod = await import("./create-pet-service");
      const handle = mod.createPetService({
        pets: [] as never[],
        datastoreName: "TestPets",
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
      const mod = await import("./create-pet-service");
      const handle = mod.createPetService({
        pets: [] as never[],
        datastoreName: "TestPets",
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      } as never);

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockStore.isDirty.mockReturnValue(true);

      capturedCb!({ UserId: 42 });

      expect(mockStore.save).toHaveBeenCalled();
      expect(handle.getPetStore(42)).toBeUndefined();
    });

    it("skips save for clean store on player removing", async () => {
      let capturedCb: ((player: { UserId: number }) => void) | undefined;
      const mod = await import("./create-pet-service");
      const handle = mod.createPetService({
        pets: [] as never[],
        datastoreName: "TestPets",
        onPlayerRemoving: (cb: (player: { UserId: number }) => void) => {
          capturedCb = cb;
        },
      } as never);

      handle.Service.onInit!();
      handle.initPlayer(42);
      mockStore.isDirty.mockReturnValue(false);

      capturedCb!({ UserId: 42 });

      expect(mockStore.save).not.toHaveBeenCalled();
      expect(handle.getPetStore(42)).toBeUndefined();
    });
  });
});
