/**
 * CheckpointService Tests
 *
 * Tests for checkpoint touch detection, player respawning,
 * and helper functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { type Player, makePlayer, makeDefaultData } from "./__test-helpers";

describe("CheckpointService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockDataService: Record<string, ReturnType<typeof vi.fn>>;
  let mockCollectionService: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayers: Record<string, ReturnType<typeof vi.fn> | unknown[] | unknown>;
  let mockWorkspace: Record<string, ReturnType<typeof vi.fn>>;

  // Track event handlers registered via onEvent
  let requestRespawnHandler: ((player: Player, payload: unknown) => void) | undefined;

  beforeEach(() => {
    vi.resetModules();

    requestRespawnHandler = undefined;

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockRegistry = {
      fireClient: vi.fn(),
      fireAllClients: vi.fn(),
      onEvent: vi.fn((name: string, handler: (...args: unknown[]) => void) => {
        if (name === "RequestRespawn") {
          requestRespawnHandler = handler as typeof requestRespawnHandler;
        }
      }),
    };

    mockDataService = {
      getData: vi.fn(() => makeDefaultData()),
      updateData: vi.fn(),
      addCoins: vi.fn(),
      incrementDeaths: vi.fn(),
      startStageTimer: vi.fn(),
      startRunTimer: vi.fn(),
      getStageElapsedSeconds: vi.fn(() => 5),
      getRunElapsedSeconds: vi.fn(() => 30),
    };

    mockCollectionService = {
      GetTagged: vi.fn(() => []),
      AddTag: vi.fn(),
      HasTag: vi.fn(() => false),
    };

    mockPlayers = {
      GetPlayers: vi.fn(() => []),
      GetPlayerFromCharacter: vi.fn(() => undefined),
      PlayerAdded: { Connect: vi.fn() },
      PlayerRemoving: { Connect: vi.fn() },
    };

    mockWorkspace = {
      FindFirstChild: vi.fn(() => undefined),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
      Service: {},
      mapSize: (m: Map<unknown, unknown>) => m.size,
      arraySize: (a: unknown[]) => a.length,
    }));

    vi.doMock("@rbxts/services", () => ({
      CollectionService: mockCollectionService,
      Players: mockPlayers,
      Workspace: mockWorkspace,
    }));

    vi.doMock("./DataService", () => ({
      DataService: mockDataService,
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./MovementValidationService", () => ({
      movementStateManager: {
        notifyTeleport: vi.fn(),
      },
    }));
  });

  async function loadCheckpointService() {
    const mod = await import("./CheckpointService");
    return mod.CheckpointService;
  }

  // ─── getCheckpoint ───────────────────────────────────────────────────

  describe("getCheckpoint", () => {
    it("returns undefined when no checkpoints loaded", async () => {
      const svc = await loadCheckpointService();

      expect(svc.getCheckpoint(1, 0)).toBeUndefined();
    });
  });

  // ─── touchCheckpoint ─────────────────────────────────────────────────

  describe("touchCheckpoint", () => {
    it("returns early when player has no data", async () => {
      mockDataService.getData.mockReturnValue(undefined);
      const svc = await loadCheckpointService();
      const player = makePlayer();

      svc.touchCheckpoint(player, 1, 0);

      expect(mockDataService.updateData).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("No player data"));
    });

    it("returns early when touching checkpoint for wrong stage", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData({ currentStage: 1 }));
      const svc = await loadCheckpointService();
      const player = makePlayer();

      svc.touchCheckpoint(player, 2, 0);

      expect(mockDataService.updateData).not.toHaveBeenCalled();
    });

    it("returns early when checkpoint already passed", async () => {
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 3 })
      );
      const svc = await loadCheckpointService();
      const player = makePlayer();

      svc.touchCheckpoint(player, 1, 2); // cp 2 < current 3

      expect(mockDataService.updateData).not.toHaveBeenCalled();
    });

    it("updates data when touching valid checkpoint (same as current)", async () => {
      // Load and init to populate checkpoints map
      const checkpointPart = {
        IsA: () => true,
        Name: "CP-1-0",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          if (attr === "CheckpointIndex") return 0;
          return undefined;
        }),
        Position: { X: 0, Y: 10, Z: 0 },
        Orientation: { Y: 0 },
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCheckpoint") return [checkpointPart];
        return [];
      });

      const svc = await loadCheckpointService();
      svc.onInit!();

      // Verify checkpoint was actually loaded
      const loaded = svc.getCheckpoint(1, 0);
      expect(loaded).toBeDefined();

      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 0 })
      );
      const player = makePlayer();

      svc.touchCheckpoint(player, 1, 0);

      // Same checkpoint, not new, but still updates data
      expect(mockDataService.updateData).toHaveBeenCalledWith(player, { currentCheckpoint: 0 });
    });

    it("fires client event when touching a new checkpoint", async () => {
      const checkpointPart = {
        IsA: () => true,
        Name: "CP-1-1",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          if (attr === "CheckpointIndex") return 1;
          return undefined;
        }),
        Position: { X: 10, Y: 10, Z: 10 },
        Orientation: { Y: 90 },
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCheckpoint") return [checkpointPart];
        return [];
      });

      const svc = await loadCheckpointService();
      svc.onInit!();

      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 0 })
      );
      const player = makePlayer();

      svc.touchCheckpoint(player, 1, 1);

      expect(mockDataService.updateData).toHaveBeenCalledWith(player, { currentCheckpoint: 1 });
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "CheckpointReached",
        player,
        expect.objectContaining({
          playerId: 42,
          checkpointId: 1,
          stageNumber: 1,
          isNew: true,
        })
      );
    });

    it("does not fire client event when re-touching same checkpoint", async () => {
      const checkpointPart = {
        IsA: () => true,
        Name: "CP-1-2",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          if (attr === "CheckpointIndex") return 2;
          return undefined;
        }),
        Position: { X: 0, Y: 0, Z: 0 },
        Orientation: { Y: 0 },
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCheckpoint") return [checkpointPart];
        return [];
      });

      const svc = await loadCheckpointService();
      svc.onInit!();

      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 2 })
      );
      const player = makePlayer();

      svc.touchCheckpoint(player, 1, 2); // same as current

      // Still updates data
      expect(mockDataService.updateData).toHaveBeenCalled();
      // But no client event since not new
      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });

    it("applies anti-spam cooldown", async () => {
      const checkpointPart = {
        IsA: () => true,
        Name: "CP-1-0",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          if (attr === "CheckpointIndex") return 0;
          return undefined;
        }),
        Position: { X: 0, Y: 0, Z: 0 },
        Orientation: { Y: 0 },
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCheckpoint") return [checkpointPart];
        return [];
      });

      const svc = await loadCheckpointService();
      svc.onInit!();

      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 0 })
      );
      const player = makePlayer();

      // First touch succeeds
      svc.touchCheckpoint(player, 1, 0);
      expect(mockDataService.updateData).toHaveBeenCalledTimes(1);

      // Immediate second touch silently ignored (cooldown)
      svc.touchCheckpoint(player, 1, 0);
      expect(mockDataService.updateData).toHaveBeenCalledTimes(1);
    });
  });

  // ─── respawnPlayer ───────────────────────────────────────────────────

  describe("respawnPlayer", () => {
    it("returns early when player has no data", async () => {
      mockDataService.getData.mockReturnValue(undefined);
      const svc = await loadCheckpointService();
      const player = makePlayer();

      svc.respawnPlayer(player);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("No data"));
    });

    it("returns early when player has no character", async () => {
      mockDataService.getData.mockReturnValue(makeDefaultData());
      const svc = await loadCheckpointService();
      const player = makePlayer({ Character: undefined });

      svc.respawnPlayer(player);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("No character"));
    });

    it("returns early when character has no HumanoidRootPart", async () => {
      const character = {
        FindFirstChild: vi.fn(() => undefined),
      };
      mockDataService.getData.mockReturnValue(makeDefaultData());
      const svc = await loadCheckpointService();
      const player = makePlayer({ Character: character });

      svc.respawnPlayer(player);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("No HumanoidRootPart"));
    });

    it("restarts stage timer when checkpoint is 0", async () => {
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 2, currentCheckpoint: 0 })
      );
      const svc = await loadCheckpointService();
      const player = makePlayer();

      svc.respawnPlayer(player);

      expect(mockDataService.startStageTimer).toHaveBeenCalledWith(player);
    });

    it("restarts both timers when stage=1 checkpoint=0", async () => {
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 0 })
      );
      const svc = await loadCheckpointService();
      const player = makePlayer();

      svc.respawnPlayer(player);

      expect(mockDataService.startStageTimer).toHaveBeenCalledWith(player);
      expect(mockDataService.startRunTimer).toHaveBeenCalledWith(player);
    });

    it("does not restart timers when checkpoint > 0", async () => {
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 2 })
      );
      const svc = await loadCheckpointService();
      const player = makePlayer();

      svc.respawnPlayer(player);

      expect(mockDataService.startStageTimer).not.toHaveBeenCalled();
      expect(mockDataService.startRunTimer).not.toHaveBeenCalled();
    });
  });

  // ─── onInit & event handling ─────────────────────────────────────────

  describe("onInit", () => {
    it("loads checkpoints from CollectionService", async () => {
      const cpPart = {
        IsA: () => true,
        Name: "CP-1-0",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          if (attr === "CheckpointIndex") return 0;
          return undefined;
        }),
        Position: { X: 0, Y: 5, Z: 0 },
        Orientation: { Y: 0 },
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCheckpoint") return [cpPart];
        return [];
      });

      const svc = await loadCheckpointService();
      svc.onInit!();

      // Checkpoint should now be loaded
      expect(svc.getCheckpoint(1, 0)).toBeDefined();
      expect(svc.getCheckpoint(1, 0)!.stageNumber).toBe(1);
      expect(svc.getCheckpoint(1, 0)!.checkpointIndex).toBe(0);
    });

    it("skips parts that are not BasePart", async () => {
      const nonPart = {
        IsA: () => false,
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCheckpoint") return [nonPart];
        return [];
      });

      const svc = await loadCheckpointService();
      svc.onInit!();

      expect(svc.getCheckpoint(1, 0)).toBeUndefined();
    });

    it("warns on parts with missing attributes", async () => {
      const badPart = {
        IsA: () => true,
        Name: "BadCheckpoint",
        GetAttribute: vi.fn(() => undefined),
        Position: { X: 0, Y: 0, Z: 0 },
        Orientation: { Y: 0 },
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCheckpoint") return [badPart];
        return [];
      });

      const svc = await loadCheckpointService();
      svc.onInit!();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("missing required attributes")
      );
    });

    it("loads checkpoints from Workspace.Checkpoints folder", async () => {
      mockCollectionService.GetTagged.mockReturnValue([]);

      const folderPart = {
        IsA: () => true,
        Name: "CP-1-0",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return 1;
          if (attr === "CheckpointIndex") return 0;
          return undefined;
        }),
        Position: { X: 0, Y: 5, Z: 0 },
        Orientation: { Y: 0 },
        Touched: { Connect: vi.fn() },
      };
      const checkpointsFolder = {
        GetChildren: vi.fn(() => [folderPart]),
      };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Checkpoints") return checkpointsFolder;
        return undefined;
      });

      const svc = await loadCheckpointService();
      svc.onInit!();

      expect(svc.getCheckpoint(1, 0)).toBeDefined();
      expect(mockCollectionService.AddTag).toHaveBeenCalled();
    });

    it("registers RequestRespawn event handler", async () => {
      const svc = await loadCheckpointService();
      svc.onInit!();

      expect(mockRegistry.onEvent).toHaveBeenCalledWith("RequestRespawn", expect.any(Function));
      expect(requestRespawnHandler).toBeDefined();
    });

    it("connects PlayerAdded and PlayerRemoving", async () => {
      const svc = await loadCheckpointService();
      svc.onInit!();

      expect(
        (mockPlayers.PlayerAdded as unknown as { Connect: ReturnType<typeof vi.fn> }).Connect
      ).toHaveBeenCalled();
      expect(
        (mockPlayers.PlayerRemoving as unknown as { Connect: ReturnType<typeof vi.fn> }).Connect
      ).toHaveBeenCalled();
    });
  });

  // ─── setupCoins ──────────────────────────────────────────────────────

  describe("setupCoins", () => {
    it("scans tagged coins from CollectionService", async () => {
      const coinPart = {
        IsA: () => true,
        Name: "Coin1",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "CoinValue") return 5;
          return undefined;
        }),
        Position: { X: 10, Y: 10, Z: 10 },
        CanTouch: false,
        Touched: { Connect: vi.fn() },
      };
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCoin") return [coinPart];
        return [];
      });

      const svc = await loadCheckpointService();
      svc.setupCoins();

      expect(coinPart.CanTouch).toBe(true);
      expect(coinPart.Touched.Connect).toHaveBeenCalled();
    });

    it("scans Stages folder for coins with CoinValue attribute", async () => {
      mockCollectionService.GetTagged.mockReturnValue([]);

      const coinPart = {
        IsA: () => true,
        Name: "HiddenCoin",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "CoinValue") return 3;
          return undefined;
        }),
        Position: { X: 5, Y: 5, Z: 5 },
        CanTouch: false,
        Touched: { Connect: vi.fn() },
      };
      const stageModel = {
        GetDescendants: vi.fn(() => [coinPart]),
      };
      const stagesFolder = {
        GetChildren: vi.fn(() => [stageModel]),
      };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Stages") return stagesFolder;
        return undefined;
      });

      const svc = await loadCheckpointService();
      svc.setupCoins();

      expect(mockCollectionService.AddTag).toHaveBeenCalled();
      expect(coinPart.Touched.Connect).toHaveBeenCalled();
    });

    it("warns when Stages folder not found", async () => {
      mockCollectionService.GetTagged.mockReturnValue([]);
      mockWorkspace.FindFirstChild.mockReturnValue(undefined);

      const svc = await loadCheckpointService();
      svc.setupCoins();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Stages folder not found")
      );
    });
  });

  // ─── onDestroy ───────────────────────────────────────────────────────

  describe("onDestroy", () => {
    it("clears internal state", async () => {
      const svc = await loadCheckpointService();
      svc.onDestroy!();

      // Should not throw — internal Maps are cleared
      expect(svc.getCheckpoint(1, 0)).toBeUndefined();
    });
  });
});
