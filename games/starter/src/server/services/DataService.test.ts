/**
 * DataService Tests (Starter)
 *
 * Tests the game-level data service that wraps createDataService
 * and adds game-specific mutations (addCoins, incrementKills).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

type Player = { UserId: number; Name: string };

describe("DataService (starter)", () => {
  let mockSession: { data: Record<string, unknown>; markDirty: ReturnType<typeof vi.fn> };
  let mockSessionManager: { getSession: ReturnType<typeof vi.fn>; [k: string]: unknown };
  let mockStore: Record<string, unknown> & { markDirty: ReturnType<typeof vi.fn> };
  let mockDataHandle: Record<string, unknown> & {
    Service: {
      onInit: ReturnType<typeof vi.fn>;
      onStart: ReturnType<typeof vi.fn>;
      onDestroy: ReturnType<typeof vi.fn>;
    };
    getSessionManager: ReturnType<typeof vi.fn>;
    getStore: ReturnType<typeof vi.fn>;
    initPlayer: ReturnType<typeof vi.fn>;
    cleanupPlayer: ReturnType<typeof vi.fn>;
  };
  let mockPlayerLifecycle: Record<string, unknown> & {
    onPlayerAdded: ReturnType<typeof vi.fn>;
    onPlayerRemoving: ReturnType<typeof vi.fn>;
  };
  let mockRemoteRegistry: Record<string, unknown> & { fireClient: ReturnType<typeof vi.fn> };
  let mockPlayer: Player;

  beforeEach(() => {
    vi.resetModules();

    mockPlayer = { UserId: 42, Name: "TestPlayer" };

    mockSession = {
      data: { __version: 1, coins: 100, kills: 5, lastPlayedAt: 0 },
      markDirty: vi.fn(),
    };

    mockSessionManager = {
      getSession: vi.fn(() => mockSession),
    };

    mockStore = {
      markDirty: vi.fn(),
    };

    mockDataHandle = {
      Service: { onInit: vi.fn(), onStart: vi.fn(), onDestroy: vi.fn() },
      getSessionManager: vi.fn(() => mockSessionManager),
      getStore: vi.fn(() => mockStore),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    mockPlayerLifecycle = {
      onPlayerAdded: vi.fn(),
      onPlayerRemoving: vi.fn(),
    };

    mockRemoteRegistry = { fireClient: vi.fn() };

    vi.doMock("@broblox/data", () => ({
      createDataService: vi.fn(() => mockDataHandle),
    }));

    vi.doMock("@broblox/core", () => ({
      Service: {},
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRemoteRegistry },
    }));

    vi.doMock("shared/types", () => ({
      StarterPlayerData: {},
    }));
  });

  async function loadService() {
    return import("./DataService");
  }

  it("exports DataService with getData, updateData, addCoins, incrementKills", async () => {
    const mod = await loadService();
    expect(typeof mod.DataService.getData).toBe("function");
    expect(typeof mod.DataService.updateData).toBe("function");
    expect(typeof mod.DataService.addCoins).toBe("function");
    expect(typeof mod.DataService.incrementKills).toBe("function");
  });

  describe("getData", () => {
    it("returns session data for existing player", async () => {
      const { DataService } = await loadService();
      const data = DataService.getData(mockPlayer);
      expect(data).toBe(mockSession.data);
    });

    it("returns undefined when no session", async () => {
      mockSessionManager.getSession.mockReturnValue(undefined);
      const { DataService } = await loadService();
      expect(DataService.getData(mockPlayer)).toBeUndefined();
    });
  });

  describe("addCoins", () => {
    it("adds coins and marks dirty", async () => {
      const { DataService } = await loadService();
      DataService.addCoins(mockPlayer, 50);
      expect(mockSession.data["coins"]).toBe(150);
      expect(mockSession.markDirty).toHaveBeenCalled();
      expect(mockStore.markDirty).toHaveBeenCalledWith(mockPlayer);
    });

    it("does nothing when no session", async () => {
      mockSessionManager.getSession.mockReturnValue(undefined);
      const { DataService } = await loadService();
      DataService.addCoins(mockPlayer, 50);
    });
  });

  describe("incrementKills", () => {
    it("increments kills by 1 and marks dirty", async () => {
      const { DataService } = await loadService();
      DataService.incrementKills(mockPlayer);
      expect(mockSession.data["kills"]).toBe(6);
      expect(mockSession.markDirty).toHaveBeenCalled();
    });

    it("does nothing when no session", async () => {
      mockSessionManager.getSession.mockReturnValue(undefined);
      const { DataService } = await loadService();
      DataService.incrementKills(mockPlayer);
    });
  });

  describe("updateData", () => {
    it("updates specific fields and marks dirty", async () => {
      const { DataService } = await loadService();
      DataService.updateData(mockPlayer, { coins: 999 });
      expect(mockSession.data["coins"]).toBe(999);
      expect(mockSession.markDirty).toHaveBeenCalled();
    });

    it("does nothing when no session", async () => {
      mockSessionManager.getSession.mockReturnValue(undefined);
      const { DataService } = await loadService();
      DataService.updateData(mockPlayer, { coins: 999 });
    });
  });

  describe("lifecycle wiring", () => {
    it("registers onPlayerAdded and onPlayerRemoving on onInit", async () => {
      const { DataService } = await loadService();
      DataService.onInit!();
      expect(mockPlayerLifecycle.onPlayerAdded).toHaveBeenCalled();
      expect(mockPlayerLifecycle.onPlayerRemoving).toHaveBeenCalled();
    });

    it("delegates onStart to dataHandle.Service", async () => {
      const { DataService } = await loadService();
      DataService.onStart!();
      expect(mockDataHandle.Service.onStart).toHaveBeenCalled();
    });
  });
});
