/**
 * Tests for createDataService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createDataService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockSessionManager: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockStore = {
      load: vi.fn(),
      save: vi.fn(),
    };

    mockSessionManager = {
      startSession: vi.fn(),
      endSession: vi.fn(),
      startAutoSave: vi.fn(),
      stopAutoSave: vi.fn(),
      saveAllDirty: vi.fn(() => 0),
      closeAll: vi.fn(),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./player-data-store", () => ({
      PlayerDataStore: function () {
        return mockStore;
      },
    }));
    vi.doMock("./session", () => ({
      SessionManager: function () {
        return mockSessionManager;
      },
    }));
  });

  function makeConfig() {
    return {
      storeConfig: {
        name: "TestData",
        version: 1,
        defaultData: { version: 1, coins: 0 },
      },
    };
  }

  async function createService() {
    const mod = await import("./create-data-service");
    return mod.createDataService(makeConfig());
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("DataService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("logs on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("TestData"));
  });

  it("starts auto-save on start", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    expect(mockSessionManager.startAutoSave).toHaveBeenCalled();
  });

  it("stops auto-save and saves on destroy", async () => {
    const handle = await createService();
    handle.Service.onDestroy!();

    expect(mockSessionManager.closeAll).toHaveBeenCalled();
  });

  it("initPlayer starts a session", async () => {
    const player = { Name: "TestPlayer", UserId: 42 } as never;
    const handle = await createService();
    handle.initPlayer(player);

    expect(mockSessionManager.startSession).toHaveBeenCalledWith(player);
  });

  it("cleanupPlayer ends a session", async () => {
    const player = { Name: "TestPlayer", UserId: 42 } as never;
    const handle = await createService();
    handle.cleanupPlayer(player);

    expect(mockSessionManager.endSession).toHaveBeenCalledWith(player);
  });

  it("exposes store and sessionManager", async () => {
    const handle = await createService();
    expect(handle.getStore()).toBe(mockStore);
    expect(handle.getSessionManager()).toBe(mockSessionManager);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-data-service");
    const h1 = mod.createDataService(makeConfig());
    const h2 = mod.createDataService(makeConfig());
    expect(h1.Service).not.toBe(h2.Service);
  });
});
