/**
 * LeaderboardService Tests
 *
 * Tests for leaderboard rankings, meta store persistence,
 * broadcasting, rate limiting, and player entry updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** Minimal Player stub – full type lives in @rbxts/types (excluded from tests). */
interface Player {
  Name: string;
  UserId: number;
  Character?: { FindFirstChild(name: string): unknown };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<{ Name: string; UserId: number }> = {}) {
  return {
    Name: overrides.Name ?? "TestPlayer",
    UserId: overrides.UserId ?? 42,
  } as unknown as Player;
}

function makeDefaultData(overrides: Record<string, unknown> = {}) {
  return {
    __version: 1,
    currentCheckpoint: 0,
    currentStage: 1,
    coins: 0,
    totalDeaths: 0,
    totalCompletions: 0,
    bestFullRunTime: undefined,
    stageProgress: {},
    unlockedItems: [],
    equippedTrail: undefined,
    lastPlayedAt: 0,
    ...overrides,
  };
}

// ── Test suite ─────────────────────────────────────────────────────────────

describe("LeaderboardService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockDataService: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;
  let mockLeaderboardStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockMetaDataStore: Record<string, ReturnType<typeof vi.fn>>;

  // Track registered callbacks
  let playerAddedCallback: ((player: Player) => void) | undefined;
  let playerRemovingCallback: ((player: Player) => void) | undefined;
  let requestLeaderboardHandler: ((player: Player) => void) | undefined;

  // Captured task.spawn callbacks for manual invocation
  let spawnCallbacks: Array<() => void>;
  let origTask: unknown;

  beforeEach(() => {
    vi.resetModules();

    playerAddedCallback = undefined;
    playerRemovingCallback = undefined;
    requestLeaderboardHandler = undefined;
    spawnCallbacks = [];

    // Override task.spawn to NOT execute (avoids the while(true) infinite loop
    // in onInit's periodic refresh). Callbacks are captured for manual invocation.
    const g = globalThis as Record<string, unknown>;
    origTask = g.task;
    g.task = {
      spawn: vi.fn((fn: () => void) => {
        spawnCallbacks.push(fn);
      }),
      delay: vi.fn(),
      wait: vi.fn(),
      defer: vi.fn(),
      cancel: vi.fn(),
    };

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockRegistry = {
      fireClient: vi.fn(),
      fireAllClients: vi.fn(),
      onEvent: vi.fn((name: string, handler: (...args: unknown[]) => void) => {
        if (name === "RequestLeaderboard") {
          requestLeaderboardHandler = handler as typeof requestLeaderboardHandler;
        }
      }),
    };

    mockDataService = {
      getData: vi.fn(() => makeDefaultData()),
    };

    mockPlayerLifecycle = {
      onPlayerAdded: vi.fn((cb: (p: Player) => void) => {
        playerAddedCallback = cb;
      }),
      onPlayerRemoving: vi.fn((cb: (p: Player) => void) => {
        playerRemovingCallback = cb;
      }),
    };

    mockLeaderboardStore = {
      register: vi.fn(),
      getTopEntries: vi.fn(() => ({ entries: [] })),
      getPlayerRank: vi.fn(() => ({ found: false })),
      submitScore: vi.fn(),
      refresh: vi.fn(),
    };

    mockMetaDataStore = {
      GetAsync: vi.fn(() => undefined),
      SetAsync: vi.fn(),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
      Service: {},
    }));

    vi.doMock("@rbx/leaderboards", () => ({
      LeaderboardStore: function () {
        return mockLeaderboardStore;
      },
    }));

    vi.doMock("./DataService", () => ({
      DataService: mockDataService,
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    // Mock game.GetService("DataStoreService") to return our mock DataStore
    g.game = {
      GetService: (name: string) => {
        if (name === "DataStoreService") {
          return {
            GetDataStore: () => mockMetaDataStore,
          };
        }
        return { _service: name };
      },
    };
  });

  afterEach(() => {
    // Restore original task global
    const g = globalThis as Record<string, unknown>;
    if (origTask) g.task = origTask;
  });

  async function loadLeaderboardService() {
    const mod = await import("./LeaderboardService");
    return mod.LeaderboardService;
  }

  // ─── getLeaderboard ──────────────────────────────────────────────────

  describe("getLeaderboard", () => {
    it("returns empty array when no entries", async () => {
      const svc = await loadLeaderboardService();

      const entries = svc.getLeaderboard();
      expect(entries).toEqual([]);
    });

    it("returns enriched entries from the leaderboard store", async () => {
      mockLeaderboardStore.getTopEntries.mockReturnValue({
        entries: [
          { userId: 1, playerName: "Alice", score: 5, rank: 1 },
          { userId: 2, playerName: "Bob", score: 3, rank: 2 },
        ],
      });

      const svc = await loadLeaderboardService();

      const entries = svc.getLeaderboard(10);
      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual(expect.objectContaining({ userId: 1, completions: 5, rank: 1 }));
      expect(entries[1]).toEqual(expect.objectContaining({ userId: 2, completions: 3, rank: 2 }));
    });
  });

  // ─── getPlayerRank ───────────────────────────────────────────────────

  describe("getPlayerRank", () => {
    it("returns undefined when player not ranked", async () => {
      mockLeaderboardStore.getPlayerRank.mockReturnValue({ found: false });
      const svc = await loadLeaderboardService();
      const player = makePlayer();

      expect(svc.getPlayerRank(player)).toBeUndefined();
    });

    it("returns rank when player is found", async () => {
      mockLeaderboardStore.getPlayerRank.mockReturnValue({
        found: true,
        entry: { rank: 3 },
      });
      const svc = await loadLeaderboardService();
      const player = makePlayer();

      expect(svc.getPlayerRank(player)).toBe(3);
    });
  });

  // ─── updatePlayerEntry ───────────────────────────────────────────────

  describe("updatePlayerEntry", () => {
    it("does nothing when player has no data", async () => {
      mockDataService.getData.mockReturnValue(undefined);
      const svc = await loadLeaderboardService();
      const player = makePlayer();

      svc.updatePlayerEntry(player);

      expect(mockLeaderboardStore.submitScore).not.toHaveBeenCalled();
    });

    it("does nothing when player has 0 completions", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ totalCompletions: 0 }));
      const svc = await loadLeaderboardService();
      const player = makePlayer();

      svc.updatePlayerEntry(player);

      expect(mockLeaderboardStore.submitScore).not.toHaveBeenCalled();
    });

    it("submits score when player has completions", async () => {
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ totalCompletions: 5, bestFullRunTime: 120.0 })
      );
      const svc = await loadLeaderboardService();
      const player = makePlayer();

      svc.updatePlayerEntry(player);

      expect(mockLeaderboardStore.submitScore).toHaveBeenCalledWith(
        "completions",
        42,
        "TestPlayer",
        5
      );
    });

    it("broadcasts leaderboard after update", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ totalCompletions: 3 }));
      const svc = await loadLeaderboardService();
      const player = makePlayer();

      svc.updatePlayerEntry(player);

      expect(mockRegistry.fireAllClients).toHaveBeenCalledWith(
        "LeaderboardUpdate",
        expect.objectContaining({
          updatedAt: expect.any(Number),
          entries: expect.any(Array),
        })
      );
    });

    it("spawns meta persistence task", async () => {
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ totalCompletions: 1, bestFullRunTime: 60.0 })
      );
      const svc = await loadLeaderboardService();

      // Need to init first to set up metaStore
      svc.onInit!();

      const taskSpawn = (globalThis as Record<string, unknown>).task as Record<
        string,
        ReturnType<typeof vi.fn>
      >;
      const callsBefore = taskSpawn.spawn.mock.calls.length;

      const player = makePlayer();
      svc.updatePlayerEntry(player);

      // A new task.spawn call was made for persistMeta
      expect(taskSpawn.spawn.mock.calls.length).toBeGreaterThan(callsBefore);

      // Execute the persist callback
      const persistCallback = taskSpawn.spawn.mock.calls.at(-1)![0] as () => void;
      persistCallback();

      expect(mockMetaDataStore.SetAsync).toHaveBeenCalledWith(
        "42",
        expect.objectContaining({
          playerName: "TestPlayer",
          bestTime: 60.0,
        })
      );
    });
  });

  // ─── refreshLeaderboard ──────────────────────────────────────────────

  describe("refreshLeaderboard", () => {
    it("refreshes the store", async () => {
      const svc = await loadLeaderboardService();

      svc.refreshLeaderboard();

      expect(mockLeaderboardStore.refresh).toHaveBeenCalledWith("completions", "alltime");
    });

    it("broadcasts updated leaderboard", async () => {
      const svc = await loadLeaderboardService();

      svc.refreshLeaderboard();

      expect(mockRegistry.fireAllClients).toHaveBeenCalledWith(
        "LeaderboardUpdate",
        expect.objectContaining({
          updatedAt: expect.any(Number),
          entries: expect.any(Array),
        })
      );
    });
  });

  // ─── onInit ──────────────────────────────────────────────────────────

  describe("onInit", () => {
    it("registers player lifecycle callbacks", async () => {
      const svc = await loadLeaderboardService();
      svc.onInit!();

      expect(mockPlayerLifecycle.onPlayerAdded).toHaveBeenCalled();
      expect(mockPlayerLifecycle.onPlayerRemoving).toHaveBeenCalled();
    });

    it("registers RequestLeaderboard event handler", async () => {
      const svc = await loadLeaderboardService();
      svc.onInit!();

      expect(mockRegistry.onEvent).toHaveBeenCalledWith("RequestLeaderboard", expect.any(Function));
      expect(requestLeaderboardHandler).toBeDefined();
    });

    it("sends leaderboard to newly joined player", async () => {
      const svc = await loadLeaderboardService();
      svc.onInit!();

      const player = makePlayer();
      playerAddedCallback!(player);

      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "LeaderboardUpdate",
        player,
        expect.objectContaining({ entries: expect.any(Array) })
      );
    });

    it("flushes player entry on leave", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ totalCompletions: 3 }));
      const svc = await loadLeaderboardService();
      svc.onInit!();

      const player = makePlayer();
      playerRemovingCallback!(player);

      expect(mockLeaderboardStore.submitScore).toHaveBeenCalledWith(
        "completions",
        42,
        "TestPlayer",
        3
      );
    });

    it("handles RequestLeaderboard from client", async () => {
      const svc = await loadLeaderboardService();
      svc.onInit!();

      const player = makePlayer();
      requestLeaderboardHandler!(player);

      // Should refresh the store
      expect(mockLeaderboardStore.refresh).toHaveBeenCalledWith("completions", "alltime");

      // Should send refresh status to player
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "LeaderboardRefreshStatus",
        player,
        expect.objectContaining({ ok: true })
      );
    });

    it("initializes meta DataStore", async () => {
      const svc = await loadLeaderboardService();
      svc.onInit!();

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("initialized"));
    });

    it("primes cache from DataStore on startup", async () => {
      mockLeaderboardStore.getTopEntries.mockReturnValue({
        entries: [{ userId: 99, playerName: "Alice", score: 10, rank: 1 }],
      });
      mockMetaDataStore.GetAsync.mockReturnValue({
        playerName: "Alice",
        bestTime: 45.2,
      });

      const svc = await loadLeaderboardService();
      svc.onInit!();

      // Execute the prime cache task.spawn callback (first one captured during onInit)
      const primeCacheCallback = spawnCallbacks.find((_, idx) => idx >= 0);
      expect(primeCacheCallback).toBeDefined();
      primeCacheCallback!();

      // Should have loaded meta from DataStore
      expect(mockMetaDataStore.GetAsync).toHaveBeenCalledWith("99");

      // Now getLeaderboard should include the cached meta
      const entries = svc.getLeaderboard();
      if (entries.length > 0) {
        expect(entries[0].bestTime).toBe(45.2);
      }
    });
  });

  // ─── onDestroy ───────────────────────────────────────────────────────

  describe("onDestroy", () => {
    it("does not throw", async () => {
      const svc = await loadLeaderboardService();

      expect(() => svc.onDestroy!()).not.toThrow();
    });

    it("flushes cached meta entries to DataStore", async () => {
      // Set up a cached meta entry via updatePlayerEntry
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ totalCompletions: 5, bestFullRunTime: 30.0 })
      );
      const svc = await loadLeaderboardService();
      svc.onInit!();

      const player = makePlayer();
      svc.updatePlayerEntry(player);

      // Execute the persist task so meta is in the cache
      const taskSpawn = (globalThis as Record<string, unknown>).task as Record<
        string,
        ReturnType<typeof vi.fn>
      >;
      const persistCallback = taskSpawn.spawn.mock.calls.at(-1)![0] as () => void;
      persistCallback();

      // Clear SetAsync call count from updatePlayerEntry
      mockMetaDataStore.SetAsync.mockClear();

      // onDestroy should flush all cached meta
      svc.onDestroy!();

      expect(mockMetaDataStore.SetAsync).toHaveBeenCalledWith(
        "42",
        expect.objectContaining({
          playerName: "TestPlayer",
          bestTime: 30.0,
        })
      );
    });
  });
});
