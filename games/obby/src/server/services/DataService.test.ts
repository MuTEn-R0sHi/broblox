/**
 * DataService Tests
 *
 * Tests the obby game DataService which handles player data persistence,
 * session management, and runtime timing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { type Player, makePlayer, makeDefaultData } from "./__test-helpers";

describe("DataService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockSession: {
    data: Record<string, unknown>;
    markDirty: ReturnType<typeof vi.fn>;
  };
  let mockStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockSessionManager: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;

  // Capture callbacks registered via onPlayerAdded/onPlayerRemoving
  let playerAddedCallback: ((player: Player) => void) | undefined;
  let playerRemovingCallback: ((player: Player) => void) | undefined;

  beforeEach(() => {
    vi.resetModules();

    playerAddedCallback = undefined;
    playerRemovingCallback = undefined;

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockSession = {
      data: makeDefaultData(),
      markDirty: vi.fn(),
    };

    mockStore = {
      markDirty: vi.fn(),
    };

    mockSessionManager = {
      startSession: vi.fn(() => mockSession),
      endSession: vi.fn(),
      getSession: vi.fn(() => mockSession),
      startAutoSave: vi.fn(),
      closeAll: vi.fn(),
    };

    mockRegistry = {
      fireClient: vi.fn(),
      fireAllClients: vi.fn(),
      onEvent: vi.fn(),
    };

    mockPlayerLifecycle = {
      onPlayerAdded: vi.fn((cb: (p: Player) => void) => {
        playerAddedCallback = cb;
      }),
      onPlayerRemoving: vi.fn((cb: (p: Player) => void) => {
        playerRemovingCallback = cb;
      }),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
      Service: {},
    }));

    vi.doMock("@broblox/data", () => ({
      createDataService: () => ({
        Service: {
          name: "DataService",
          onInit: vi.fn(),
          onStart: vi.fn(() => mockSessionManager.startAutoSave()),
          onDestroy: vi.fn(() => mockSessionManager.closeAll()),
        },
        getStore: () => mockStore,
        getSessionManager: () => mockSessionManager,
        initPlayer: vi.fn((player: unknown) => {
          const session = mockSessionManager.startSession(player);
          // Mirror factory behaviour: if startSession fails, getSession returns undefined.
          if (session === undefined) mockSessionManager.getSession.mockReturnValue(undefined);
        }),
        cleanupPlayer: vi.fn((player: unknown) => {
          mockSessionManager.endSession(player);
        }),
      }),
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));
  });

  async function loadDataService() {
    const mod = await import("./DataService");
    return mod.DataService;
  }

  // ─── getData ─────────────────────────────────────────────────────────

  describe("getData", () => {
    it("returns session data when session exists", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      const result = svc.getData(player);
      expect(result).toEqual(mockSession.data);
      expect(mockSessionManager.getSession).toHaveBeenCalledWith(player);
    });

    it("returns undefined when no session exists", async () => {
      mockSessionManager.getSession.mockReturnValue(undefined);
      const svc = await loadDataService();
      const player = makePlayer();

      expect(svc.getData(player)).toBeUndefined();
    });
  });

  // ─── Timer methods ───────────────────────────────────────────────────

  describe("timer methods", () => {
    it("startStageTimer marks the current clock", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      svc.startStageTimer(player);

      // getStageElapsedSeconds should return a value >= 0
      const elapsed = svc.getStageElapsedSeconds(player);
      expect(elapsed).toBeDefined();
      expect(elapsed!).toBeGreaterThanOrEqual(0);
    });

    it("getStageElapsedSeconds returns undefined when no timer set", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      expect(svc.getStageElapsedSeconds(player)).toBeUndefined();
    });

    it("startRunTimer marks the current clock", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      svc.startRunTimer(player);

      const elapsed = svc.getRunElapsedSeconds(player);
      expect(elapsed).toBeDefined();
      expect(elapsed!).toBeGreaterThanOrEqual(0);
    });

    it("getRunElapsedSeconds returns undefined when no timer set", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      expect(svc.getRunElapsedSeconds(player)).toBeUndefined();
    });
  });

  // ─── updateData ──────────────────────────────────────────────────────

  describe("updateData", () => {
    it("updates currentCheckpoint", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      svc.updateData(player, { currentCheckpoint: 3 });

      expect(mockSession.data.currentCheckpoint).toBe(3);
      expect(mockSession.markDirty).toHaveBeenCalled();
      expect(mockStore.markDirty).toHaveBeenCalledWith(player);
    });

    it("updates currentStage", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      svc.updateData(player, { currentStage: 5 });

      expect(mockSession.data.currentStage).toBe(5);
    });

    it("updates coins", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      svc.updateData(player, { coins: 100 });

      expect(mockSession.data.coins).toBe(100);
    });

    it("updates totalDeaths", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      svc.updateData(player, { totalDeaths: 7 });

      expect(mockSession.data.totalDeaths).toBe(7);
    });

    it("updates totalCompletions", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      svc.updateData(player, { totalCompletions: 2 });

      expect(mockSession.data.totalCompletions).toBe(2);
    });

    it("updates bestFullRunTime", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      svc.updateData(player, { bestFullRunTime: 120.5 });

      expect(mockSession.data.bestFullRunTime).toBe(120.5);
    });

    it("logs warning and returns when no session", async () => {
      mockSessionManager.getSession.mockReturnValue(undefined);
      const svc = await loadDataService();
      const player = makePlayer();

      svc.updateData(player, { coins: 100 });

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("No session"));
    });
  });

  // ─── updateStageProgress ─────────────────────────────────────────────

  describe("updateStageProgress", () => {
    it("creates new stage progress entry when none exists", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      svc.updateStageProgress(player, 1, { completions: 1, bestTime: 30 });

      const progress = mockSession.data.stageProgress as Record<string, Record<string, unknown>>;
      expect(progress["1"]).toBeDefined();
      expect(progress["1"].stageNumber).toBe(1);
      expect(progress["1"].completions).toBe(1);
      expect(progress["1"].bestTime).toBe(30);
      expect(mockSession.markDirty).toHaveBeenCalled();
    });

    it("increments completions for existing stage", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      // Pre-seed existing progress
      (mockSession.data.stageProgress as Record<string, unknown>)["1"] = {
        stageNumber: 1,
        firstCompletedAt: 1000,
        completions: 2,
        deaths: 1,
        bestTime: 40,
      };

      svc.updateStageProgress(player, 1, { completions: 1 });

      const progress = mockSession.data.stageProgress as Record<string, Record<string, number>>;
      expect(progress["1"].completions).toBe(3);
    });

    it("updates bestTime only when better", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      (mockSession.data.stageProgress as Record<string, unknown>)["1"] = {
        stageNumber: 1,
        firstCompletedAt: 1000,
        completions: 1,
        deaths: 0,
        bestTime: 30,
      };

      // Worse time — should NOT update
      svc.updateStageProgress(player, 1, { bestTime: 50 });
      const progress = mockSession.data.stageProgress as Record<string, Record<string, number>>;
      expect(progress["1"].bestTime).toBe(30);

      // Better time — should update
      svc.updateStageProgress(player, 1, { bestTime: 20 });
      expect(progress["1"].bestTime).toBe(20);
    });

    it("does nothing when no session", async () => {
      mockSessionManager.getSession.mockReturnValue(undefined);
      const svc = await loadDataService();
      const player = makePlayer();

      svc.updateStageProgress(player, 1, { completions: 1 });

      expect(mockSession.markDirty).not.toHaveBeenCalled();
    });
  });

  // ─── addCoins ────────────────────────────────────────────────────────

  describe("addCoins", () => {
    it("adds coins to player data", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      mockSession.data.coins = 10;
      svc.addCoins(player, 5);

      expect(mockSession.data.coins).toBe(15);
      expect(mockSession.markDirty).toHaveBeenCalled();
    });

    it("does nothing when no session", async () => {
      mockSessionManager.getSession.mockReturnValue(undefined);
      const svc = await loadDataService();
      const player = makePlayer();

      svc.addCoins(player, 5);

      expect(mockSession.markDirty).not.toHaveBeenCalled();
    });
  });

  // ─── incrementDeaths ─────────────────────────────────────────────────

  describe("incrementDeaths", () => {
    it("increments totalDeaths by 1", async () => {
      const svc = await loadDataService();
      const player = makePlayer();

      mockSession.data.totalDeaths = 3;
      svc.incrementDeaths(player);

      expect(mockSession.data.totalDeaths).toBe(4);
      expect(mockSession.markDirty).toHaveBeenCalled();
    });

    it("does nothing when no session", async () => {
      mockSessionManager.getSession.mockReturnValue(undefined);
      const svc = await loadDataService();
      const player = makePlayer();

      svc.incrementDeaths(player);

      expect(mockSession.markDirty).not.toHaveBeenCalled();
    });
  });

  // ─── Lifecycle ───────────────────────────────────────────────────────

  describe("onInit", () => {
    it("registers onPlayerAdded and onPlayerRemoving", async () => {
      const svc = await loadDataService();
      svc.onInit!();

      expect(mockPlayerLifecycle.onPlayerAdded).toHaveBeenCalled();
      expect(mockPlayerLifecycle.onPlayerRemoving).toHaveBeenCalled();
    });

    it("onPlayerAdded starts a session and syncs data", async () => {
      const svc = await loadDataService();
      svc.onInit!();

      const player = makePlayer();
      playerAddedCallback!(player);

      expect(mockSessionManager.startSession).toHaveBeenCalledWith(player);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "PlayerDataSync",
        player,
        expect.objectContaining({
          coins: expect.any(Number),
          currentStage: expect.any(Number),
          currentCheckpoint: expect.any(Number),
        })
      );
    });

    it("onPlayerAdded logs warning when session fails", async () => {
      mockSessionManager.startSession.mockReturnValue(undefined);
      const svc = await loadDataService();
      svc.onInit!();

      const player = makePlayer();
      playerAddedCallback!(player);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Failed to start session")
      );
    });

    it("onPlayerRemoving ends the session", async () => {
      const svc = await loadDataService();
      svc.onInit!();

      const player = makePlayer();
      playerRemovingCallback!(player);

      expect(mockSessionManager.endSession).toHaveBeenCalledWith(player);
    });
  });

  describe("onStart", () => {
    it("starts auto-save", async () => {
      const svc = await loadDataService();
      svc.onStart!();

      expect(mockSessionManager.startAutoSave).toHaveBeenCalled();
    });
  });

  describe("onDestroy", () => {
    it("closes all sessions", async () => {
      const svc = await loadDataService();
      svc.onDestroy!();

      expect(mockSessionManager.closeAll).toHaveBeenCalled();
    });
  });
});
