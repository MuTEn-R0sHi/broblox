/**
 * StageService Tests
 *
 * Tests for stage configuration, completion logic, cooldowns, coin rewards,
 * timer management, and full-run completion handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { makePlayer, makeDefaultData } from "./__test-helpers";

describe("StageService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockDataService: Record<string, ReturnType<typeof vi.fn>>;
  let mockCheckpointService: Record<string, ReturnType<typeof vi.fn>>;
  let mockCollectionService: Record<string, ReturnType<typeof vi.fn>>;
  let mockWorkspace: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockRegistry = {
      fireClient: vi.fn(),
      fireAllClients: vi.fn(),
      onEvent: vi.fn(),
    };

    mockDataService = {
      getData: vi.fn(() => makeDefaultData()),
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

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
      Service: {},
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
      expect(mockDataService.updateStageProgress).toHaveBeenCalledWith(player, 1, {
        completions: 1,
        bestTime: 5.0,
      });

      // Advances to next stage
      expect(mockDataService.updateData).toHaveBeenCalledWith(player, {
        currentStage: 2,
        currentCheckpoint: 0,
      });

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
      expect(mockDataService.updateStageProgress).toHaveBeenCalledWith(player, 1, {
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
      let callCount = 0;
      mockDataService.getData.mockImplementation(() => {
        callCount++;
        // First call (in completeStage validation): stage 1
        // Second call (after advancing): stage 2
        return callCount <= 1 ? makeDefaultData({ currentStage: 1 }) : updatedData;
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
      expect(mockDataService.updateData).toHaveBeenCalledWith(
        player,
        expect.objectContaining({
          totalCompletions: 1,
          currentStage: 1,
          currentCheckpoint: 0,
          bestFullRunTime: 120.0,
        })
      );

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

      // Should NOT include bestFullRunTime since 120 > 50
      expect(mockDataService.updateData).toHaveBeenCalledWith(
        player,
        expect.not.objectContaining({ bestFullRunTime: expect.anything() })
      );
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

    it("loads stages from Workspace.Stages folder", async () => {
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
      const stagesFolder = { GetChildren: vi.fn(() => [stageModel]) };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Stages") return stagesFolder;
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
});
