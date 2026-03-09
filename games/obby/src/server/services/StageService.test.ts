/**
 * StageService Tests
 *
 * Tests for stage configuration, completion logic, cooldowns, coin rewards,
 * timer management, and full-run completion handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { type Player, makePlayer, makeDefaultData } from "./__test-helpers";

describe("StageService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockDataService: Record<string, ReturnType<typeof vi.fn>>;
  let mockCheckpointService: Record<string, ReturnType<typeof vi.fn>>;
  let mockCollectionService: Record<string, ReturnType<typeof vi.fn>>;
  let mockWorkspace: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;
  let mockGetProgression: ReturnType<typeof vi.fn>;
  let mockGetQuests: ReturnType<typeof vi.fn>;
  let mockGetAchievements: ReturnType<typeof vi.fn>;
  let mockGetEventTracker: ReturnType<typeof vi.fn>;
  let mockGetBattlePassStore: ReturnType<typeof vi.fn>;
  let mockAddXp: ReturnType<typeof vi.fn>;
  let mockBpAddXp: ReturnType<typeof vi.fn>;
  let mockIncrementObjective: ReturnType<typeof vi.fn>;
  let mockIncrementProgress: ReturnType<typeof vi.fn>;
  let mockTrackEvent: ReturnType<typeof vi.fn>;
  let mockAdvanceStep: ReturnType<typeof vi.fn>;
  let mockGetActiveEvents: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    // Stub Roblox value types needed by world exit teleportation
    const g = globalThis as Record<string, unknown>;
    g.Vector3 = Object.assign(
      class MockVector3 {
        X: number;
        Y: number;
        Z: number;
        constructor(x = 0, y = 0, z = 0) {
          this.X = x;
          this.Y = y;
          this.Z = z;
        }
      },
      { zero: { X: 0, Y: 0, Z: 0 } }
    );
    g.CFrame = Object.assign(
      class MockCFrame {
        constructor(public pos?: unknown) {}
        mul() {
          return new (g.CFrame as new () => unknown)();
        }
      },
      { Angles: () => new (g.CFrame as new () => unknown)() }
    );

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockRegistry = {
      fireClient: vi.fn(),
      fireAllClients: vi.fn(),
      onEvent: vi.fn(),
    };

    mockDataService = {
      getData: vi.fn(() => makeDefaultData()),
      getWorldProgress: vi.fn((_player: unknown, worldId: string) => {
        const data = mockDataService.getData();
        return (data.worlds as Record<string, unknown>)[worldId];
      }),
      setWorldStage: vi.fn(),
      setWorldBestRunTime: vi.fn(),
      incrementWorldCompletions: vi.fn(),
      updateData: vi.fn(),
      addCoins: vi.fn(),
      incrementDeaths: vi.fn(),
      startStageTimer: vi.fn(),
      startRunTimer: vi.fn(),
      getStageElapsedSeconds: vi.fn(() => 5.0),
      getRunElapsedSeconds: vi.fn(() => 30.0),
      updateStageProgress: vi.fn(),
    };

    mockCheckpointService = {
      respawnPlayer: vi.fn(),
    };

    mockCollectionService = {
      GetTagged: vi.fn(() => []),
      AddTag: vi.fn(),
      HasTag: vi.fn(() => false),
    };

    mockWorkspace = {
      FindFirstChild: vi.fn(() => undefined),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
      Service: {},
      mapSize: (m: Map<unknown, unknown>) => m.size,
    }));

    vi.doMock("@rbxts/services", () => ({
      CollectionService: mockCollectionService,
      Workspace: mockWorkspace,
    }));

    vi.doMock("./DataService", () => ({
      DataService: mockDataService,
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./CheckpointService", () => ({
      CheckpointService: mockCheckpointService,
    }));

    mockPlayerLifecycle = {
      onPlayerAdded: vi.fn(),
      onPlayerRemoving: vi.fn(),
    };

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));

    mockAddXp = vi.fn();
    mockBpAddXp = vi.fn();
    mockIncrementObjective = vi.fn();
    mockIncrementProgress = vi.fn();
    mockTrackEvent = vi.fn();
    mockGetProgression = vi.fn(() => ({ addXp: mockAddXp }));
    mockGetQuests = vi.fn(() => ({
      incrementObjective: mockIncrementObjective,
      setObjectiveProgress: vi.fn(),
    }));
    mockGetAchievements = vi.fn(() => ({ incrementProgress: mockIncrementProgress }));
    mockGetEventTracker = vi.fn(() => ({ track: mockTrackEvent }));
    mockGetBattlePassStore = vi.fn(() => ({ addXp: mockBpAddXp }));
    mockAdvanceStep = vi.fn();
    mockGetActiveEvents = vi.fn(() => []);

    vi.doMock("./ProgressionService", () => ({ getProgression: mockGetProgression }));
    vi.doMock("./QuestService", () => ({ getQuests: mockGetQuests }));
    vi.doMock("./RewardsService", () => ({ getAchievements: mockGetAchievements }));
    vi.doMock("./AnalyticsService", () => ({
      getEventTracker: mockGetEventTracker,
      getFunnelTracker: vi.fn(() => ({ advanceStep: mockAdvanceStep })),
    }));
    vi.doMock("./EventService", () => ({ getActiveEvents: mockGetActiveEvents }));
    vi.doMock("./BattlePassService", () => ({ getBattlePassStore: mockGetBattlePassStore }));

    // By default, player is in the "grasslands" world
    vi.doMock("./PlayerWorldState", () => ({
      getPlayerWorldId: vi.fn(() => "grasslands"),
      setPlayerWorld: vi.fn(),
      deletePlayerWorld: vi.fn(),
      clearPlayerWorlds: vi.fn(),
    }));
  });

  async function loadStageService() {
    const mod = await import("./StageService");
    return mod.StageService;
  }

  /** Populate the internal `stages` map by mocking CollectionService and calling onInit */
  function makeStagePartMock(stageNumber: number, attrs: Record<string, unknown> = {}) {
    return {
      IsA: () => true,
      Name: `Stage${stageNumber}`,
      GetAttribute: vi.fn((attr: string) => {
        if (attr === "StageNumber") return stageNumber;
        if (attr === "DisplayName") return attrs.DisplayName ?? `Stage ${stageNumber}`;
        if (attr === "Difficulty") return attrs.Difficulty ?? "easy";
        if (attr === "CoinReward") return attrs.CoinReward ?? 10;
        if (attr === "HasSecret") return attrs.HasSecret ?? false;
        return undefined;
      }),
      Position: { X: 0, Y: 0, Z: 0 },
      Touched: { Connect: vi.fn() },
    };
  }

  // ─── getStage / getStageCount ────────────────────────────────────────

  describe("getStage / getStageCount", () => {
    it("returns undefined when no stages loaded", async () => {
      const svc = await loadStageService();

      expect(svc.getStage(1)).toBeUndefined();
      expect(svc.getStageCount()).toBe(0);
    });

    it("returns stage config after onInit loads stages", async () => {
      const stagePart = makeStagePartMock(1, { CoinReward: 20 });
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return [stagePart];
        return [];
      });

      const svc = await loadStageService();
      svc.onInit!();

      expect(svc.getStage(1)).toBeDefined();
      expect(svc.getStage(1)!.stageNumber).toBe(1);
      expect(svc.getStage(1)!.coinReward).toBe(20);
      expect(svc.getStageCount()).toBe(1);
    });
  });

  // ─── completeStage ───────────────────────────────────────────────────

  describe("completeStage", () => {
    function setupTwoStages() {
      const stage1 = makeStagePartMock(1, { CoinReward: 10, Difficulty: "easy" });
      const stage2 = makeStagePartMock(2, { CoinReward: 25, Difficulty: "medium" });
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return [stage1, stage2];
        return [];
      });
    }

    it("returns early when player has no data", async () => {
      mockDataService.getData.mockReturnValue(undefined);
      setupTwoStages();
      const svc = await loadStageService();
      svc.onInit!();
      const player = makePlayer();

      svc.completeStage(player, 1);

      expect(mockDataService.addCoins).not.toHaveBeenCalled();
    });

    it("returns early for invalid stage number", async () => {
      setupTwoStages();
      const svc = await loadStageService();
      svc.onInit!();
      const player = makePlayer();

      svc.completeStage(player, 99);

      expect(mockDataService.addCoins).not.toHaveBeenCalled();
    });

    it("returns early when player is on a different stage", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      setupTwoStages();
      const svc = await loadStageService();
      svc.onInit!();
      const player = makePlayer();

      svc.completeStage(player, 2); // player is on stage 1

      expect(mockDataService.addCoins).not.toHaveBeenCalled();
    });

    it("advances to next stage and awards coins", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      setupTwoStages();
      const svc = await loadStageService();
      svc.onInit!();
      const player = makePlayer();

      svc.completeStage(player, 1);

      // Awards coins
      expect(mockDataService.addCoins).toHaveBeenCalledWith(player, 10);

      // Updates stage progress
      expect(mockDataService.updateStageProgress).toHaveBeenCalledWith(player, "grasslands", 1, {
        completions: 1,
        bestTime: 5.0,
      });

      // Advances to next stage
      expect(mockDataService.setWorldStage).toHaveBeenCalledWith(player, "grasslands", 2, 0);

      // Resets stage timer
      expect(mockDataService.startStageTimer).toHaveBeenCalledWith(player);

      // Fires StageCompleted event
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "StageCompleted",
        player,
        expect.objectContaining({
          playerId: 42,
          stageNumber: 1,
          isNewBest: true,
          coinsEarned: 10,
        })
      );
    });

    it("handles isNewBest=false when prior time is better", async () => {
      mockDataService.getData.mockReturnValue(
        makeDefaultData({
          currentStage: 1,
          stageProgress: {
            "1": {
              stageNumber: 1,
              firstCompletedAt: 1000,
              completions: 1,
              deaths: 0,
              bestTime: 2.0,
            },
          },
        })
      );
      // getStageElapsedSeconds returns 5.0 which is worse than 2.0
      setupTwoStages();
      const svc = await loadStageService();
      svc.onInit!();
      const player = makePlayer();

      svc.completeStage(player, 1);

      // bestTime not passed since old time is better
      expect(mockDataService.updateStageProgress).toHaveBeenCalledWith(player, "grasslands", 1, {
        completions: 1,
        bestTime: undefined,
      });

      // Event still has isNewBest=false
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "StageCompleted",
        player,
        expect.objectContaining({ isNewBest: false })
      );
    });

    it("syncs PlayerDataSync after advancing", async () => {
      const updatedData = makeDefaultData({ currentStage: 2, coins: 10 });
      let getDataCallCount = 0;
      mockDataService.getData.mockImplementation(() => {
        getDataCallCount++;
        // First getData call: validation check — returns stage 1
        // Subsequent getData calls: after advancing — returns stage 2
        return getDataCallCount <= 1 ? makeDefaultData({ currentStage: 1 }) : updatedData;
      });
      // getWorldProgress is called during validation — should return stage 1
      mockDataService.getWorldProgress.mockReturnValue({
        currentStage: 1,
        currentCheckpoint: 0,
        completions: 0,
        bestFullRunTime: undefined,
        stageProgress: {},
      });
      setupTwoStages();
      const svc = await loadStageService();
      svc.onInit!();
      const player = makePlayer();

      svc.completeStage(player, 1);

      // Should sync PlayerDataSync with updated data
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "PlayerDataSync",
        player,
        expect.objectContaining({
          coins: 10,
          currentStage: 2,
        })
      );
    });

    it("handles full obby completion (last stage)", async () => {
      // Only one stage — completing it = completing the obby
      const stagePart = makeStagePartMock(1, { CoinReward: 50 });
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return [stagePart];
        return [];
      });
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, totalCompletions: 0 })
      );
      mockDataService.getRunElapsedSeconds.mockReturnValue(120.0);

      const svc = await loadStageService();
      svc.onInit!();
      const player = makePlayer();

      svc.completeStage(player, 1);

      // Awards coins
      expect(mockDataService.addCoins).toHaveBeenCalledWith(player, 50);

      // Resets to stage 1 with incremented completions
      expect(mockDataService.incrementWorldCompletions).toHaveBeenCalledWith(player, "grasslands");
      expect(mockDataService.updateData).toHaveBeenCalledWith(
        player,
        expect.objectContaining({
          totalCompletions: 1,
        })
      );
      expect(mockDataService.setWorldStage).toHaveBeenCalledWith(player, "grasslands", 1, 0);
      expect(mockDataService.setWorldBestRunTime).toHaveBeenCalledWith(player, "grasslands", 120.0);

      // Restarts both timers for new run
      expect(mockDataService.startRunTimer).toHaveBeenCalledWith(player);
      expect(mockDataService.startStageTimer).toHaveBeenCalledWith(player);
    });

    it("does not update bestFullRunTime when prior is better", async () => {
      const stagePart = makeStagePartMock(1);
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return [stagePart];
        return [];
      });
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, totalCompletions: 1, bestFullRunTime: 50.0 })
      );
      mockDataService.getRunElapsedSeconds.mockReturnValue(120.0); // worse

      const svc = await loadStageService();
      svc.onInit!();
      const player = makePlayer();

      svc.completeStage(player, 1);

      // Should NOT update best run time since 120 > 50
      expect(mockDataService.setWorldBestRunTime).not.toHaveBeenCalled();
    });

    it("task.delay exits world and fires WorldChanged after full obby completion", async () => {
      const stagePart = makeStagePartMock(1);
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return [stagePart];
        return [];
      });
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, totalCompletions: 0 })
      );

      // Capture task.delay callback
      const g = globalThis as unknown as { task: { delay: (dur: number, cb: () => void) => void } };
      const origDelay = g.task.delay;
      let delayCb: (() => void) | undefined;
      g.task.delay = (_dur: number, cb: () => void) => {
        delayCb = cb;
      };

      const svc = await loadStageService();
      svc.onInit!();
      svc.completeStage(makePlayer(), 1);

      expect(delayCb).toBeDefined();
      delayCb!();

      // Should fire WorldChanged with undefined worldId (back to hub)
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "WorldChanged",
        expect.anything(),
        expect.objectContaining({ worldId: undefined, worldName: undefined })
      );

      g.task.delay = origDelay;
    });

    it("applies anti-spam cooldown", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      setupTwoStages();
      const svc = await loadStageService();
      svc.onInit!();
      const player = makePlayer();

      // First completion
      svc.completeStage(player, 1);
      expect(mockDataService.addCoins).toHaveBeenCalledTimes(1);

      // Immediate second — cooldown blocks it
      // Reset data to stage 1 again (the first call advanced to 2)
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      svc.completeStage(player, 1);
      expect(mockDataService.addCoins).toHaveBeenCalledTimes(1); // still 1
    });
  });

  // ─── onInit ──────────────────────────────────────────────────────────

  describe("onInit", () => {
    it("loads stages from CollectionService tags", async () => {
      const stageParts = [makeStagePartMock(1), makeStagePartMock(2), makeStagePartMock(3)];
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return stageParts;
        return [];
      });

      const svc = await loadStageService();
      svc.onInit!();

      expect(svc.getStageCount()).toBe(3);
      expect(svc.getStage(1)).toBeDefined();
      expect(svc.getStage(2)).toBeDefined();
      expect(svc.getStage(3)).toBeDefined();
    });

    it("skips non-BasePart entries", async () => {
      const nonPart = { IsA: () => false, Name: "NotAPart" };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return [nonPart];
        return [];
      });

      const svc = await loadStageService();
      svc.onInit!();

      expect(svc.getStageCount()).toBe(0);
    });

    it("warns on parts missing StageNumber", async () => {
      const badPart = {
        IsA: () => true,
        Name: "BadStage",
        GetAttribute: vi.fn(() => undefined),
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return [badPart];
        return [];
      });

      const svc = await loadStageService();
      svc.onInit!();

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("missing StageNumber"));
    });

    it("loads stages from Workspace.Worlds.*.Stages folder", async () => {
      mockCollectionService.GetTagged.mockReturnValue([]);

      const stagePart = {
        IsA: () => true,
        Name: "StagePlatform",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          return undefined;
        }),
      };
      const stageModel = { GetDescendants: vi.fn(() => [stagePart]) };
      const stagesSubfolder = { GetChildren: vi.fn(() => [stageModel]) };
      const worldFolder = {
        FindFirstChild: vi.fn((name: string) => {
          if (name === "Stages") return stagesSubfolder;
          return undefined;
        }),
        GetChildren: vi.fn(() => [stageModel]),
      };
      const worldsFolder = { GetChildren: vi.fn(() => [worldFolder]) };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Worlds") return worldsFolder;
        return undefined;
      });

      const svc = await loadStageService();
      svc.onInit!();

      expect(svc.getStage(1)).toBeDefined();
    });

    it("sets up end zone touch detection", async () => {
      const endZone = {
        IsA: () => true,
        Name: "EndZone",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          return undefined;
        }),
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyEndZone") return [endZone];
        if (tag === "ObbyStage") return [makeStagePartMock(1)];
        return [];
      });

      const svc = await loadStageService();
      svc.onInit!();

      expect(endZone.Touched.Connect).toHaveBeenCalled();
    });

    it("end zone Touched callback triggers completeStage for valid player", async () => {
      const endZone = {
        IsA: () => true,
        Name: "EndZone",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          return undefined;
        }),
        Touched: { Connect: vi.fn() },
      };
      // Setup two stages so stage 1 completion advances (doesn't trigger full-run)
      const s1 = makeStagePartMock(1);
      const s2 = makeStagePartMock(2);
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyEndZone") return [endZone];
        if (tag === "ObbyStage") return [s1, s2];
        return [];
      });
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));

      // Mock game.GetService("Players")
      const player = makePlayer();
      const g = globalThis as unknown as {
        game: { GetService: (name: string) => { GetPlayerFromCharacter: () => Player } };
      };
      const origGame = g.game;
      g.game = {
        GetService: () => ({
          GetPlayerFromCharacter: () => player,
        }),
      };

      const svc = await loadStageService();
      svc.onInit!();

      // Capture and invoke the Touched callback
      const touchedCb = endZone.Touched.Connect.mock.calls[0]![0] as (hit: unknown) => void;
      const character = {
        FindFirstChildOfClass: vi.fn(() => ({ Health: 100 })),
      };
      touchedCb({ Parent: character });

      expect(mockDataService.addCoins).toHaveBeenCalled();

      g.game = origGame;
    });

    it("end zone Touched callback ignores hit with no character", async () => {
      const endZone = {
        IsA: () => true,
        Name: "EndZone",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          return undefined;
        }),
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyEndZone") return [endZone];
        if (tag === "ObbyStage") return [makeStagePartMock(1)];
        return [];
      });

      const svc = await loadStageService();
      svc.onInit!();

      const touchedCb = endZone.Touched.Connect.mock.calls[0]![0] as (hit: unknown) => void;
      // Hit with no Parent
      touchedCb({ Parent: undefined });
      expect(mockDataService.addCoins).not.toHaveBeenCalled();
    });

    it("end zone Touched callback ignores hit with no humanoid", async () => {
      const endZone = {
        IsA: () => true,
        Name: "EndZone",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          return undefined;
        }),
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyEndZone") return [endZone];
        if (tag === "ObbyStage") return [makeStagePartMock(1)];
        return [];
      });

      const svc = await loadStageService();
      svc.onInit!();

      const touchedCb = endZone.Touched.Connect.mock.calls[0]![0] as (hit: unknown) => void;
      // Character with no humanoid
      touchedCb({ Parent: { FindFirstChildOfClass: () => undefined } });
      expect(mockDataService.addCoins).not.toHaveBeenCalled();
    });

    it("onPlayerRemoving cleans up per-player cooldown entries", async () => {
      const stagePart = makeStagePartMock(1);
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return [stagePart];
        return [];
      });
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));

      const svc = await loadStageService();
      svc.onInit!();

      // Complete a stage to set a cooldown entry
      svc.completeStage(makePlayer({ UserId: 99 }), 1);

      // Capture and invoke the onPlayerRemoving callback
      const removingCb = mockPlayerLifecycle.onPlayerRemoving.mock.calls[0]![0] as (
        p: unknown
      ) => void;
      removingCb({ UserId: 99 });

      // The cooldown should be cleared — a new completion should work immediately
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      svc.completeStage(makePlayer({ UserId: 99 }), 1);
      expect(mockDataService.addCoins).toHaveBeenCalledTimes(2);
    });

    it("sets up end zones from Worlds folder by name pattern", async () => {
      mockCollectionService.GetTagged.mockReturnValue([]);

      const endPlatform = {
        IsA: () => true,
        Name: "EndPlatform",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          return undefined;
        }),
        Position: { X: 0, Y: 0, Z: 0 },
        Touched: { Connect: vi.fn() },
      };
      const stageModel = { GetDescendants: vi.fn(() => [endPlatform]) };
      const stagesSubfolder = { GetChildren: vi.fn(() => [stageModel]) };
      const worldFolder = {
        FindFirstChild: vi.fn((name: string) => {
          if (name === "Stages") return stagesSubfolder;
          return undefined;
        }),
        GetChildren: vi.fn(() => [stageModel]),
      };
      const worldsFolder = { GetChildren: vi.fn(() => [worldFolder]) };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Worlds") return worldsFolder;
        return undefined;
      });

      const svc = await loadStageService();
      svc.onInit!();

      expect(mockCollectionService.AddTag).toHaveBeenCalled();
      expect(endPlatform.Touched.Connect).toHaveBeenCalled();
    });

    it("skips end zone setup when part already has end zone tag", async () => {
      mockCollectionService.GetTagged.mockReturnValue([]);
      mockCollectionService.HasTag.mockReturnValue(true); // already tagged

      const endZone = {
        IsA: () => true,
        Name: "EndZone",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          return undefined;
        }),
        Position: { X: 0, Y: 0, Z: 0 },
        Touched: { Connect: vi.fn() },
      };
      const stageModel = { GetDescendants: vi.fn(() => [endZone]) };
      const stagesSubfolder = { GetChildren: vi.fn(() => [stageModel]) };
      const worldFolder = {
        FindFirstChild: vi.fn((name: string) => {
          if (name === "Stages") return stagesSubfolder;
          return undefined;
        }),
        GetChildren: vi.fn(() => [stageModel]),
      };
      const worldsFolder = { GetChildren: vi.fn(() => [worldFolder]) };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Worlds") return worldsFolder;
        return undefined;
      });

      const svc = await loadStageService();
      svc.onInit!();

      // Touch connect should NOT be called since part already has tag
      expect(endZone.Touched.Connect).not.toHaveBeenCalled();
    });
  });

  // ─── onDestroy ───────────────────────────────────────────────────────

  describe("onDestroy", () => {
    it("clears internal state", async () => {
      const stagePart = makeStagePartMock(1);
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyStage") return [stagePart];
        return [];
      });

      const svc = await loadStageService();
      svc.onInit!();
      expect(svc.getStageCount()).toBe(1);

      svc.onDestroy!();
      expect(svc.getStageCount()).toBe(0);
    });
  });

  // ─── stage completion side-effects ───────────────────────────────────

  describe("stage completion side-effects", () => {
    function setupWithTwoStages() {
      const s1 = makeStagePartMock(1, { CoinReward: 10 });
      const s2 = makeStagePartMock(2, { CoinReward: 20 });
      mockCollectionService.GetTagged.mockImplementation((tag: string) =>
        tag === "ObbyStage" ? [s1, s2] : []
      );
    }

    it("awards XP via progression on stage completion", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 1);

      expect(mockGetProgression).toHaveBeenCalledWith(42);
      expect(mockAddXp).toHaveBeenCalledWith(100);
    });

    it("skips XP when progression store is unavailable", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      mockGetProgression.mockReturnValue(undefined);
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      expect(() => svc.completeStage(makePlayer(), 1)).not.toThrow();
      expect(mockAddXp).not.toHaveBeenCalled();
    });

    it("increments stage_complete quest objective on stage completion", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 1);

      expect(mockGetQuests).toHaveBeenCalledWith(42);
      expect(mockIncrementObjective).toHaveBeenCalledWith("stage_complete", 1);
    });

    it("skips quest increment when quest store is unavailable", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      mockGetQuests.mockReturnValue(undefined);
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      expect(() => svc.completeStage(makePlayer(), 1)).not.toThrow();
      expect(mockIncrementObjective).not.toHaveBeenCalled();
    });

    it("tracks stage.completed analytics event", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      mockDataService.getStageElapsedSeconds.mockReturnValue(7.5);
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 1);

      expect(mockGetEventTracker).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith("stage.completed", 42, {
        stageId: "1",
        durationSec: 7.5,
      });
    });

    it("does not award XP when player data is missing", async () => {
      mockDataService.getData.mockReturnValue(undefined);
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 1);

      expect(mockAddXp).not.toHaveBeenCalled();
      expect(mockIncrementObjective).not.toHaveBeenCalled();
      expect(mockIncrementProgress).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it("increments all stage-count achievement IDs on stage completion", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 1);

      expect(mockGetAchievements).toHaveBeenCalledWith(42);
      expect(mockIncrementProgress).toHaveBeenCalledTimes(3);
      expect(mockIncrementProgress).toHaveBeenCalledWith("ach_first_stage", 1);
      expect(mockIncrementProgress).toHaveBeenCalledWith("ach_stages_25", 1);
      expect(mockIncrementProgress).toHaveBeenCalledWith("ach_stages_100", 1);
    });

    it("skips achievement increment when achievement store is unavailable", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      mockGetAchievements.mockReturnValue(undefined);
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      expect(() => svc.completeStage(makePlayer(), 1)).not.toThrow();
      expect(mockIncrementProgress).not.toHaveBeenCalled();
    });

    it("awards battle pass XP on stage completion", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 1);

      expect(mockGetBattlePassStore).toHaveBeenCalledWith(42);
      expect(mockBpAddXp).toHaveBeenCalledWith(25);
    });

    it("skips battle pass XP when battle pass store is unavailable", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      mockGetBattlePassStore.mockReturnValue(undefined);
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      expect(() => svc.completeStage(makePlayer(), 1)).not.toThrow();
      expect(mockBpAddXp).not.toHaveBeenCalled();
    });

    it("calls funnel advanceStep for stage 1 completion", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 1);

      expect(mockAdvanceStep).toHaveBeenCalledWith("progression", 42, "stage_1_complete");
    });

    it("does not call funnel advanceStep for non-milestone stages", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 2 }));
      // Use 3+ stages so stage 2 is not last and not a milestone
      const parts = [makeStagePartMock(1), makeStagePartMock(2), makeStagePartMock(3)];
      mockCollectionService.GetTagged.mockReturnValue(parts);
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 2);

      expect(mockAdvanceStep).not.toHaveBeenCalled();
    });

    it("applies event coin multiplier to stage rewards", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      mockGetActiveEvents.mockReturnValue([{ modifiers: { coinMultiplier: 2, xpMultiplier: 1 } }]);
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 1);

      // Stage 1 has CoinReward=10, with 2x multiplier → 20
      expect(mockDataService.addCoins).toHaveBeenCalledWith(expect.anything(), 20);
    });

    it("applies event xp multiplier to stage rewards", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      mockGetActiveEvents.mockReturnValue([{ modifiers: { coinMultiplier: 1, xpMultiplier: 3 } }]);
      setupWithTwoStages();
      const svc = await loadStageService();
      svc.onInit!();

      svc.completeStage(makePlayer(), 1);

      // Base XP is 100, with 3x multiplier → 300
      expect(mockAddXp).toHaveBeenCalledWith(300);
    });
  });
});
