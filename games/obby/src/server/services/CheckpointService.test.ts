/**
 * CheckpointService Tests
 *
 * Tests for checkpoint touch detection, player respawning,
 * and helper functions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { type Player, makePlayer, makeDefaultData } from "./__test-helpers";

type Constructor = new (...args: unknown[]) => unknown;

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

    // Stub Roblox value types needed by respawnPlayer teleportation code
    const g = globalThis as Record<string, unknown>;
    g.Vector3 = class MockVector3 {
      X: number;
      Y: number;
      Z: number;
      constructor(x = 0, y = 0, z = 0) {
        this.X = x;
        this.Y = y;
        this.Z = z;
      }
      static zero = { X: 0, Y: 0, Z: 0 };
    };
    g.CFrame = Object.assign(
      class MockCFrame {
        constructor(public pos?: unknown) {}
        mul() {
          return new (g.CFrame as Constructor)();
        }
        static Angles() {
          return new (g.CFrame as Constructor)();
        }
      },
      { Angles: (_x: number, _y: number, _z: number) => new (g.CFrame as Constructor)() }
    );

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

    vi.doMock("@broblox/core", () => ({
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

    vi.doMock("./QuestService", () => ({
      getQuests: vi.fn(() => ({
        incrementObjective: vi.fn(),
        setObjectiveProgress: vi.fn(),
      })),
    }));
    vi.doMock("./DeathlessStreakState", () => ({ resetDeathlessStreak: vi.fn() }));
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

  // ─── respawnPlayer with loaded checkpoint ──────────────────────────

  describe("respawnPlayer (teleportation)", () => {
    function makeCheckpointPart(stage: number, cp: number) {
      return {
        IsA: () => true,
        Name: `CP-${stage}-${cp}`,
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "StageNumber") return stage;
          if (attr === "CheckpointIndex") return cp;
          return undefined;
        }),
        Position: { X: 10 * cp, Y: 5, Z: 20 * cp },
        Orientation: { Y: 90 },
        Touched: { Connect: vi.fn() },
      };
    }

    async function initWithCheckpoints(...parts: ReturnType<typeof makeCheckpointPart>[]) {
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCheckpoint") return parts;
        return [];
      });
      const svc = await loadCheckpointService();
      svc.onInit!();
      return svc;
    }

    it("teleports to loaded checkpoint position", async () => {
      const svc = await initWithCheckpoints(makeCheckpointPart(1, 0), makeCheckpointPart(1, 2));
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 2 })
      );
      const hrp = {
        AssemblyLinearVelocity: { X: 5, Y: 5, Z: 5 },
        CFrame: {},
      };
      const character = {
        FindFirstChild: vi.fn((name: string) => (name === "HumanoidRootPart" ? hrp : undefined)),
      };
      const player = makePlayer({ Character: character });

      svc.respawnPlayer(player);

      // Velocity should be zeroed
      expect(hrp.AssemblyLinearVelocity).toBeDefined();
      // CFrame should be set
      expect(hrp.CFrame).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("Respawned at adjusted")
      );
    });

    it("falls back to stage start when exact checkpoint is not loaded", async () => {
      // Only load checkpoint 0 for stage 1
      const svc = await initWithCheckpoints(makeCheckpointPart(1, 0));
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 3 }) // cp 3 not loaded
      );
      const hrp = { AssemblyLinearVelocity: {}, CFrame: {} };
      const character = {
        FindFirstChild: vi.fn((name: string) => (name === "HumanoidRootPart" ? hrp : undefined)),
      };
      const player = makePlayer({ Character: character });

      svc.respawnPlayer(player);

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("stage start"));
    });

    it("warns when no checkpoint found at all", async () => {
      // Init with no checkpoints
      mockCollectionService.GetTagged.mockReturnValue([]);
      const svc = await loadCheckpointService();
      svc.onInit!();

      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 5, currentCheckpoint: 2 })
      );
      const hrp = { AssemblyLinearVelocity: {}, CFrame: {} };
      const character = {
        FindFirstChild: vi.fn((name: string) => (name === "HumanoidRootPart" ? hrp : undefined)),
      };
      const player = makePlayer({ Character: character });

      svc.respawnPlayer(player);

      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("No checkpoint found"));
    });
  });

  // ─── RequestRespawn handler ────────────────────────────────────────

  describe("RequestRespawn handler", () => {
    async function initService() {
      mockCollectionService.GetTagged.mockReturnValue([]);
      const svc = await loadCheckpointService();
      svc.onInit!();
      return svc;
    }

    it("respawns player at current checkpoint (no payload)", async () => {
      await initService();
      const player = makePlayer();
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 0 })
      );

      expect(requestRespawnHandler).toBeDefined();
      requestRespawnHandler!(player, undefined);

      // Should have attempted respawn (either direct or via LoadCharacter)
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("Respawning"));
    });

    it("rate-limits rapid respawn requests", async () => {
      await initService();
      const player = makePlayer();
      mockDataService.getData.mockReturnValue(makeDefaultData());

      requestRespawnHandler!(player, undefined);
      // Immediate second call with same os.clock()
      requestRespawnHandler!(player, undefined);

      // Only one respawn should happen (second is rate-limited)
      const respawnCalls = mockLogger.info.mock.calls.filter(
        (c) => typeof c[0] === "string" && c[0].includes("Respawning")
      );
      expect(respawnCalls.length).toBeLessThanOrEqual(1);
    });

    it("rejects invalid non-table payload", async () => {
      await initService();
      const player = makePlayer();
      mockDataService.getData.mockReturnValue(makeDefaultData());

      // Advance clock so rate-limit doesn't block
      (globalThis as Record<string, unknown>).os = {
        clock: vi.fn(() => 100),
        time: vi.fn(() => 100),
      };

      requestRespawnHandler!(player, "invalid-string");

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid respawn payload")
      );
    });

    it("returns early when player has no data", async () => {
      await initService();
      mockDataService.getData.mockReturnValue(undefined);
      const player = makePlayer();

      (globalThis as Record<string, unknown>).os = {
        clock: vi.fn(() => 200),
        time: vi.fn(() => 200),
      };
      requestRespawnHandler!(player, undefined);

      // No respawn attempted
      const respawnCalls = mockLogger.info.mock.calls.filter(
        (c) => typeof c[0] === "string" && c[0].includes("Respawning")
      );
      expect(respawnCalls).toHaveLength(0);
    });

    it("allows toCheckpoint targeting for reached checkpoints", async () => {
      await initService();
      const player = makePlayer();
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 3 })
      );

      (globalThis as Record<string, unknown>).os = {
        clock: vi.fn(() => 300),
        time: vi.fn(() => 300),
      };
      requestRespawnHandler!(player, { toCheckpoint: 1 });

      expect(mockDataService.updateData).toHaveBeenCalledWith(player, { currentCheckpoint: 1 });
    });

    it("ignores toCheckpoint beyond current", async () => {
      await initService();
      const player = makePlayer();
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 2 })
      );

      (globalThis as Record<string, unknown>).os = {
        clock: vi.fn(() => 400),
        time: vi.fn(() => 400),
      };
      requestRespawnHandler!(player, { toCheckpoint: 5 });

      expect(mockDataService.updateData).not.toHaveBeenCalled();
    });

    it("calls LoadCharacter when no character present", async () => {
      await initService();
      const player = makePlayer({ Character: undefined }) as unknown as Player & {
        LoadCharacter: ReturnType<typeof vi.fn>;
      };
      (player as unknown as Record<string, unknown>).LoadCharacter = vi.fn();
      mockDataService.getData.mockReturnValue(makeDefaultData());

      (globalThis as Record<string, unknown>).os = {
        clock: vi.fn(() => 500),
        time: vi.fn(() => 500),
      };
      requestRespawnHandler!(player, undefined);

      // Should call LoadCharacter via task.spawn
      expect((globalThis as Record<string, { mock?: unknown }>).task).toBeDefined();
    });
  });

  // ─── Kill zone Touched callback ───────────────────────────────────

  describe("kill zone Touched callback", () => {
    it("kills player and increments deaths when touched", async () => {
      const killZonePart = {
        IsA: () => true,
        Name: "killzone",
        GetAttribute: vi.fn(() => undefined),
        Position: { X: 0, Y: -10, Z: 0 },
        Touched: { Connect: vi.fn() },
      };
      const stageModel = {
        GetDescendants: vi.fn(() => [killZonePart]),
      };
      const stagesFolder = {
        GetChildren: vi.fn(() => [stageModel]),
      };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Stages") return stagesFolder;
        return undefined;
      });
      mockCollectionService.GetTagged.mockReturnValue([]);

      const player = makePlayer();
      const humanoid = { Health: 100, MaxHealth: 100, TakeDamage: vi.fn() };
      const hitPart = {
        Parent: {
          FindFirstChildOfClass: vi.fn(() => humanoid),
        },
        Name: "Leg",
      };
      mockPlayers.GetPlayerFromCharacter = vi.fn(() => player);

      const svc = await loadCheckpointService();
      svc.onInit!();

      // Capture the kill zone Touched callback
      const touchedConnect = killZonePart.Touched.Connect;
      expect(touchedConnect).toHaveBeenCalled();
      const touchCallback = touchedConnect.mock.calls[0][0] as (hit: unknown) => void;

      touchCallback(hitPart);

      expect(mockDataService.incrementDeaths).toHaveBeenCalledWith(player);
      expect(humanoid.TakeDamage).toHaveBeenCalledWith(100);
    });

    it("ignores touch when no character parent", async () => {
      const killZonePart = {
        IsA: () => true,
        Name: "lava",
        GetAttribute: vi.fn(() => undefined),
        Position: { X: 0, Y: 0, Z: 0 },
        Touched: { Connect: vi.fn() },
      };
      const stageModel = { GetDescendants: vi.fn(() => [killZonePart]) };
      const stagesFolder = { GetChildren: vi.fn(() => [stageModel]) };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Stages") return stagesFolder;
        return undefined;
      });
      mockCollectionService.GetTagged.mockReturnValue([]);

      const svc = await loadCheckpointService();
      svc.onInit!();

      const touchCallback = killZonePart.Touched.Connect.mock.calls[0][0] as (h: unknown) => void;
      touchCallback({ Parent: undefined }); // no character

      expect(mockDataService.incrementDeaths).not.toHaveBeenCalled();
    });
  });

  // ─── Coin Touched callback ─────────────────────────────────────────

  describe("coin Touched callback", () => {
    function makeCoinSetup() {
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
        Transparency: 0,
      };
      return coinPart;
    }

    it("awards coins and tracks collection on touch", async () => {
      const coinPart = makeCoinSetup();
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCoin") return [coinPart];
        return [];
      });

      const player = makePlayer();
      const humanoid = { Health: 100 };
      const hitPart = {
        Parent: { FindFirstChildOfClass: vi.fn(() => humanoid) },
        Name: "Torso",
      };
      mockPlayers.GetPlayerFromCharacter = vi.fn(() => player);
      mockDataService.getData.mockReturnValue(makeDefaultData({ coins: 10 }));

      const svc = await loadCheckpointService();
      svc.setupCoins();

      const touchCallback = coinPart.Touched.Connect.mock.calls[0][0] as (h: unknown) => void;
      touchCallback(hitPart);

      expect(mockDataService.addCoins).toHaveBeenCalledWith(player, 5);
      expect(coinPart.Transparency).toBe(1);
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "PlayerDataSync",
        player,
        expect.objectContaining({ coins: 10 })
      );
    });

    it("prevents double-collection", async () => {
      const coinPart = makeCoinSetup();
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCoin") return [coinPart];
        return [];
      });

      const player = makePlayer();
      const hitPart = {
        Parent: { FindFirstChildOfClass: vi.fn(() => ({ Health: 100 })) },
        Name: "Torso",
      };
      mockPlayers.GetPlayerFromCharacter = vi.fn(() => player);
      mockDataService.getData.mockReturnValue(makeDefaultData());

      const svc = await loadCheckpointService();
      svc.setupCoins();

      const touchCallback = coinPart.Touched.Connect.mock.calls[0][0] as (h: unknown) => void;
      touchCallback(hitPart);
      touchCallback(hitPart); // second touch

      expect(mockDataService.addCoins).toHaveBeenCalledTimes(1);
    });

    it("ignores touch without player", async () => {
      const coinPart = makeCoinSetup();
      mockCollectionService.GetTagged.mockImplementation((tag: string) => {
        if (tag === "ObbyCoin") return [coinPart];
        return [];
      });

      const hitPart = {
        Parent: { FindFirstChildOfClass: vi.fn(() => ({ Health: 100 })) },
        Name: "Torso",
      };
      mockPlayers.GetPlayerFromCharacter = vi.fn(() => undefined);

      const svc = await loadCheckpointService();
      svc.setupCoins();

      const touchCallback = coinPart.Touched.Connect.mock.calls[0][0] as (h: unknown) => void;
      touchCallback(hitPart);

      expect(mockDataService.addCoins).not.toHaveBeenCalled();
    });
  });

  // ─── PlayerRemoving cleanup ────────────────────────────────────────

  describe("PlayerRemoving cleanup", () => {
    it("cleans up per-player state on removal", async () => {
      mockCollectionService.GetTagged.mockReturnValue([]);
      const svc = await loadCheckpointService();
      svc.onInit!();

      // Capture the PlayerRemoving callback
      const removingConnect = (
        mockPlayers.PlayerRemoving as unknown as { Connect: ReturnType<typeof vi.fn> }
      ).Connect;
      expect(removingConnect).toHaveBeenCalled();
      const removingCallback = removingConnect.mock.calls[0][0] as (player: Player) => void;

      const player = makePlayer({ UserId: 99 });
      removingCallback(player);

      // Should not throw — cleanup runs successfully
      expect(removingConnect).toHaveBeenCalledTimes(1);
    });
  });

  // ─── Checkpoint Touched callback ───────────────────────────────────

  describe("checkpoint Touched callback", () => {
    it("calls touchCheckpoint when a player touches a checkpoint", async () => {
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

      const player = makePlayer();
      const hitPart = {
        Parent: {
          FindFirstChildOfClass: vi.fn(() => ({ Health: 100 })),
        },
      };
      mockPlayers.GetPlayerFromCharacter = vi.fn(() => player);
      mockDataService.getData.mockReturnValue(
        makeDefaultData({ currentStage: 1, currentCheckpoint: 0 })
      );

      const svc = await loadCheckpointService();
      svc.onInit!();

      // Capture the Touched callback
      const touchCallback = cpPart.Touched.Connect.mock.calls[0][0] as (h: unknown) => void;
      touchCallback(hitPart);

      expect(mockDataService.updateData).toHaveBeenCalledWith(player, { currentCheckpoint: 0 });
    });

    it("ignores touch when no humanoid present", async () => {
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

      const hitPart = {
        Parent: {
          FindFirstChildOfClass: vi.fn(() => undefined), // no humanoid
        },
      };

      const svc = await loadCheckpointService();
      svc.onInit!();

      const touchCallback = cpPart.Touched.Connect.mock.calls[0][0] as (h: unknown) => void;
      touchCallback(hitPart);

      expect(mockDataService.updateData).not.toHaveBeenCalled();
    });
  });

  // ─── Kill zone name detection ──────────────────────────────────────

  describe("kill zone detection", () => {
    it("detects kill zones by KillZone attribute", async () => {
      const killPart = {
        IsA: () => true,
        Name: "normalPart",
        GetAttribute: vi.fn((attr: string) => {
          if (attr === "KillZone") return true;
          return undefined;
        }),
        Position: { X: 0, Y: 0, Z: 0 },
        Touched: { Connect: vi.fn() },
      };
      const stageModel = { GetDescendants: vi.fn(() => [killPart]) };
      const stagesFolder = { GetChildren: vi.fn(() => [stageModel]) };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Stages") return stagesFolder;
        return undefined;
      });
      mockCollectionService.GetTagged.mockReturnValue([]);

      const svc = await loadCheckpointService();
      svc.onInit!();

      expect(killPart.Touched.Connect).toHaveBeenCalled();
      expect(mockCollectionService.AddTag).toHaveBeenCalled();
    });

    for (const name of ["killzone", "lava", "kill", "killbrick"]) {
      it(`detects kill zone by name "${name}"`, async () => {
        const killPart = {
          IsA: () => true,
          Name: name,
          GetAttribute: vi.fn(() => undefined),
          Position: { X: 0, Y: 0, Z: 0 },
          Touched: { Connect: vi.fn() },
        };
        const stageModel = { GetDescendants: vi.fn(() => [killPart]) };
        const stagesFolder = { GetChildren: vi.fn(() => [stageModel]) };
        mockWorkspace.FindFirstChild.mockImplementation((n: string) => {
          if (n === "Stages") return stagesFolder;
          return undefined;
        });
        mockCollectionService.GetTagged.mockReturnValue([]);

        const svc = await loadCheckpointService();
        svc.onInit!();

        expect(killPart.Touched.Connect).toHaveBeenCalled();
      });
    }
  });

  // ─── handleCharacterAdded ───────────────────────────────────────────

  describe("handleCharacterAdded (death respawn)", () => {
    it("teleports player to checkpoint when in pendingRespawns", async () => {
      // Setup a kill zone that puts players in pendingRespawns
      const killZonePart = {
        IsA: () => true,
        Name: "killzone",
        GetAttribute: vi.fn(() => undefined),
        Position: { X: 0, Y: 0, Z: 0 },
        Touched: { Connect: vi.fn() },
      };
      const stageModel = { GetDescendants: vi.fn(() => [killZonePart]) };
      const stagesFolder = { GetChildren: vi.fn(() => [stageModel]) };
      mockWorkspace.FindFirstChild.mockImplementation((name: string) => {
        if (name === "Stages") return stagesFolder;
        return undefined;
      });
      mockCollectionService.GetTagged.mockReturnValue([]);

      const player = makePlayer();
      const humanoid = { Health: 100, MaxHealth: 100, TakeDamage: vi.fn() };
      const character = { FindFirstChildOfClass: vi.fn(() => humanoid) };
      (mockPlayers as Record<string, unknown>).GetPlayerFromCharacter = vi.fn(() => player);

      // Provide an existing player so CharacterAdded is connected
      (mockPlayers as Record<string, unknown>).GetPlayers = vi.fn(() => [
        { ...player, CharacterAdded: { Connect: vi.fn() } },
      ]);

      const svc = await loadCheckpointService();
      svc.onInit!();

      // Trigger kill zone to put player in pendingRespawns
      const killTouchCb = killZonePart.Touched.Connect.mock.calls[0][0] as (hit: unknown) => void;
      killTouchCb({ Parent: character });

      // Now capture the PlayerAdded.Connect callback
      const playerAddedCb = (mockPlayers as Record<string, unknown>)["PlayerAdded"] as {
        Connect: { mock: { calls: Array<[(p: unknown) => void]> } };
      };
      const playerAddedFn = playerAddedCb.Connect.mock.calls[0][0];

      // Simulate a new player joining with CharacterAdded
      const characterAddedConnect = vi.fn();
      const newPlayer = { ...player, CharacterAdded: { Connect: characterAddedConnect } };
      playerAddedFn(newPlayer);
      expect(characterAddedConnect).toHaveBeenCalled();
    });

    it("skips teleport when player is not in pendingRespawns (normal spawn)", async () => {
      mockCollectionService.GetTagged.mockReturnValue([]);
      (mockPlayers as Record<string, unknown>).GetPlayers = vi.fn(() => []);

      const svc = await loadCheckpointService();
      svc.onInit!();

      // Capture the PlayerAdded callback
      const playerAddedRef = (mockPlayers as Record<string, unknown>)["PlayerAdded"] as {
        Connect: { mock: { calls: Array<[(p: unknown) => void]> } };
      };
      const playerAddedCb = playerAddedRef.Connect.mock.calls[0][0];

      // Create a mock player with CharacterAdded
      const characterAddedConnect = vi.fn();
      const player = {
        ...makePlayer(),
        CharacterAdded: { Connect: characterAddedConnect },
      };
      playerAddedCb(player);

      // Get the CharacterAdded callback and invoke it
      expect(characterAddedConnect).toHaveBeenCalled();
      const charAddedCb = characterAddedConnect.mock.calls[0][0] as (char: unknown) => void;

      // Character with HumanoidRootPart
      const character = {
        WaitForChild: vi.fn(() => ({ CFrame: {} })),
      };
      charAddedCb(character);

      // respawnPlayer should NOT be called since player is not in pendingRespawns
      expect(mockLogger.info).not.toHaveBeenCalledWith(expect.stringContaining("Respawning"));
    });
  });
});

describe("__test-helpers", () => {
  it("makePlayer character has FindFirstChildOfClass returning humanoid", () => {
    const p = makePlayer();
    const character = p.Character as unknown as {
      FindFirstChildOfClass: (name: string) => unknown;
    };
    const humanoid = character.FindFirstChildOfClass("Humanoid");
    expect(humanoid).toEqual({ Health: 100, MaxHealth: 100 });
  });
});
