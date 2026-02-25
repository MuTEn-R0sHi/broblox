/**
 * Tests for createTutorialService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createTutorialService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockManager: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockRegistry = {
      register: vi.fn(),
      count: vi.fn(() => 2),
    };
    mockManager = {
      isDirty: vi.fn(() => false),
      markClean: vi.fn(),
      init: vi.fn(),
      load: vi.fn(() => true),
      save: vi.fn(() => true),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./sequence-registry", () => ({
      SequenceRegistry: function () {
        return mockRegistry;
      },
    }));
    vi.doMock("./tutorial-manager", () => ({
      TutorialManager: function () {
        return mockManager;
      },
    }));
  });

  async function createService() {
    const mod = await import("./create-tutorial-service");
    return mod.createTutorialService({
      sequences: [{ id: "intro" }, { id: "combat" }] as never[],
      datastoreName: "TestTutorial",
    });
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("TutorialService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers sequences on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockRegistry.register).toHaveBeenCalledTimes(2);
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("2"));
  });

  it("logs on start", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));
  });

  it("initPlayer creates and stores a TutorialManager", async () => {
    const handle = await createService();
    const mgr = handle.initPlayer(42);

    expect(mgr).toBe(mockManager);
    expect(handle.getTutorialManager(42)).toBe(mockManager);
  });

  it("getTutorialManager returns undefined for unknown player", async () => {
    const handle = await createService();
    expect(handle.getTutorialManager(999)).toBeUndefined();
  });

  it("initPlayer calls init() and load() on the manager", async () => {
    const handle = await createService();
    handle.initPlayer(42);

    expect(mockManager.init).toHaveBeenCalled();
    expect(mockManager.load).toHaveBeenCalled();
  });

  it("cleanupPlayer calls save on dirty manager", async () => {
    mockManager.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockManager.save).toHaveBeenCalled();
    expect(handle.getTutorialManager(1)).toBeUndefined();
  });

  it("cleanupPlayer skips save for clean manager", async () => {
    mockManager.isDirty.mockReturnValue(false);
    const handle = await createService();
    handle.initPlayer(1);
    handle.cleanupPlayer(1);

    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it("onDestroy saves dirty managers", async () => {
    mockManager.isDirty.mockReturnValue(true);
    const handle = await createService();
    handle.initPlayer(1);
    handle.initPlayer(2);
    handle.Service.onDestroy!();

    expect(mockManager.save).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Saved"));
  });

  it("onDestroy skips save for clean managers", async () => {
    mockManager.isDirty.mockReturnValue(false);
    const handle = await createService();
    handle.initPlayer(1);
    handle.Service.onDestroy!();

    // save should not be called (but stopped message still logged)
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it("exposes getSequenceRegistry", async () => {
    const handle = await createService();
    expect(handle.getSequenceRegistry()).toBe(mockRegistry);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-tutorial-service");
    const h1 = mod.createTutorialService({ sequences: [], datastoreName: "A" });
    const h2 = mod.createTutorialService({ sequences: [], datastoreName: "B" });
    expect(h1.Service).not.toBe(h2.Service);
  });
});
