/**
 * TrainingService Tests
 *
 * Tests proximity validation, cooldown/overlap behaviour, attribute cap
 * enforcement, and rep counter updates.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { type Player, makeDefaultData } from "./__test-helpers";

describe("TrainingService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let requestTrainingHandler: ((player: Player, payload: unknown) => void) | undefined;
  let mockDataGetAttributes: ReturnType<typeof vi.fn>;
  let mockDataSetAttributes: ReturnType<typeof vi.fn>;
  let mockDataGetData: ReturnType<typeof vi.fn>;
  let mockAttributeApply: ReturnType<typeof vi.fn>;
  let mockAttributeSync: ReturnType<typeof vi.fn>;
  let mockGetTagged: ReturnType<typeof vi.fn>;
  let delayedCallbacks: Array<{ delay: number; fn: () => void }>;

  let mockProximity: number;
  let mockClock: number;

  beforeEach(() => {
    vi.resetModules();
    requestTrainingHandler = undefined;
    delayedCallbacks = [];
    mockProximity = 5; // default: near station
    mockClock = 100;

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockRegistry = {
      onEvent: vi.fn((name: string, handler: (player: Player, payload: unknown) => void) => {
        if (name === "RequestTraining") {
          requestTrainingHandler = handler;
        }
      }),
      fireClient: vi.fn(),
    };

    const defaultData = makeDefaultData();
    mockDataGetAttributes = vi.fn(() => ({ ...defaultData.attributes }));
    mockDataSetAttributes = vi.fn();
    mockDataGetData = vi.fn(() => ({ ...defaultData }));

    mockAttributeApply = vi.fn();
    mockAttributeSync = vi.fn();

    // Default: one station part — proximity controlled by mockProximity
    mockGetTagged = vi.fn(() => {
      const station = {
        IsA: (cls: string) => cls === "BasePart",
        GetAttribute: () => "speed" as string | undefined,
        Position: { X: 0, Y: 0, Z: 0 },
      };
      return [station];
    });

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
      Service: {},
    }));

    vi.doMock("@rbxts/services", () => ({
      CollectionService: {
        GetTagged: mockGetTagged,
      },
    }));

    vi.doMock("./DataService", () => ({
      DataService: {
        getAttributes: mockDataGetAttributes,
        setAttributes: mockDataSetAttributes,
        getData: mockDataGetData,
      },
    }));

    vi.doMock("./AttributeService", () => ({
      AttributeService: {
        applyToHumanoid: mockAttributeApply,
        syncToClient: mockAttributeSync,
      },
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    // Mock task.delay to capture callbacks for synchronous testing
    vi.stubGlobal("task", {
      delay: vi.fn((seconds: number, fn: () => void) => {
        delayedCallbacks.push({ delay: seconds, fn });
      }),
    });

    // Mock os.clock for cooldown checks — controllable via mockClock
    vi.stubGlobal("os", {
      clock: vi.fn(() => mockClock),
      time: vi.fn(() => 1000),
    });
  });

  async function loadTrainingService() {
    const mod = await import("./TrainingService");
    return mod.TrainingService;
  }

  function makeNearPlayer(userId = 42): Player {
    return {
      Name: "TestPlayer",
      UserId: userId,
      Parent: { Name: "Players" }, // in game
      Character: {
        FindFirstChild: vi.fn((name: string) =>
          name === "HumanoidRootPart"
            ? { Position: { sub: () => ({ Magnitude: mockProximity }) } }
            : undefined
        ),
      },
    } as unknown as Player;
  }

  function runDelayedCallbacks() {
    for (const cb of delayedCallbacks) {
      cb.fn();
    }
    delayedCallbacks = [];
  }

  // ─── Validation ──────────────────────────────────────────────────────

  describe("validation", () => {
    it("rejects invalid training type", async () => {
      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "invalid" });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid training type")
      );
      expect(delayedCallbacks).toHaveLength(0);
    });

    it("rejects player not near a station", async () => {
      mockProximity = 25; // far away (>20 studs)

      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });

      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("not near a speed training station")
      );
      expect(delayedCallbacks).toHaveLength(0);
    });

    it("rejects when attribute is already at cap", async () => {
      mockDataGetAttributes.mockReturnValue({ speed: 30, jump: 30, stamina: 5 });

      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("already at cap"));
      expect(delayedCallbacks).toHaveLength(0);
    });

    it("rejects when no attributes exist for player", async () => {
      mockDataGetAttributes.mockReturnValue(undefined);

      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });

      expect(delayedCallbacks).toHaveLength(0);
    });
  });

  // ─── Overlap prevention ──────────────────────────────────────────────

  describe("overlap prevention", () => {
    it("blocks overlapping training reps", async () => {
      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();

      // First request: should start training
      requestTrainingHandler!(player, { stationType: "speed" });
      expect(delayedCallbacks).toHaveLength(1);

      // Second request while first is in-progress: should be blocked
      requestTrainingHandler!(player, { stationType: "speed" });
      expect(delayedCallbacks).toHaveLength(1); // still 1

      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("already training"));
    });

    it("allows new rep after previous completes", async () => {
      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();

      // First request → completes
      requestTrainingHandler!(player, { stationType: "speed" });
      runDelayedCallbacks();

      // Advance clock past cooldown (2s)
      mockClock += 3;

      // Second request after completion → should work
      requestTrainingHandler!(player, { stationType: "speed" });
      expect(delayedCallbacks).toHaveLength(1);
    });
  });

  // ─── Successful training ─────────────────────────────────────────────

  describe("successful training", () => {
    it("schedules a 3s delayed training rep", async () => {
      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });

      expect(delayedCallbacks).toHaveLength(1);
      expect(delayedCallbacks[0].delay).toBe(3);
    });

    it("increments attribute and fires TrainingComplete on completion", async () => {
      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });

      // Complete the training
      runDelayedCallbacks();

      // Should have called setAttributes
      expect(mockDataSetAttributes).toHaveBeenCalledWith(
        player,
        expect.objectContaining({ speed: expect.any(Number) })
      );

      // Should fire TrainingComplete
      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "TrainingComplete",
        player,
        expect.objectContaining({
          attribute: "speed",
          newValue: expect.any(Number),
          gain: expect.any(Number),
        })
      );

      // Should apply to humanoid and sync
      expect(mockAttributeApply).toHaveBeenCalledWith(player);
      expect(mockAttributeSync).toHaveBeenCalledWith(player);
    });

    it("applies standard gain below diminishing threshold", async () => {
      mockDataGetAttributes.mockReturnValue({ speed: 10, jump: 30, stamina: 5 });

      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });
      runDelayedCallbacks();

      // Standard gain = 0.1
      expect(mockDataSetAttributes).toHaveBeenCalledWith(
        player,
        expect.objectContaining({ speed: 10.1 })
      );
    });

    it("applies diminished gain above threshold", async () => {
      mockDataGetAttributes.mockReturnValue({ speed: 21, jump: 30, stamina: 5 });

      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });
      runDelayedCallbacks();

      // Diminished gain = 0.05
      expect(mockDataSetAttributes).toHaveBeenCalledWith(
        player,
        expect.objectContaining({ speed: 21.05 })
      );
    });

    it("increments training rep counter", async () => {
      const data = makeDefaultData();
      mockDataGetData.mockReturnValue(data);

      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });
      runDelayedCallbacks();

      expect(data.trainingReps.speed).toBe(1);
    });

    it("aborts if player leaves game during delay", async () => {
      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });

      // Player leaves (Parent becomes undefined)
      (player as unknown as { Parent: undefined }).Parent = undefined;

      runDelayedCallbacks();

      // Nothing should have been updated
      expect(mockDataSetAttributes).not.toHaveBeenCalled();
      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });

    it("aborts if player moved away during delay", async () => {
      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });

      // Player moves away from station
      mockProximity = 25;

      runDelayedCallbacks();

      expect(mockDataSetAttributes).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("moved away"));
    });

    it("does not exceed attribute cap", async () => {
      mockDataGetAttributes.mockReturnValue({ speed: 29.98, jump: 30, stamina: 5 });

      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "speed" });
      runDelayedCallbacks();

      // Should clamp to 30 (MAX_SPEED), not 30.08
      const call = mockDataSetAttributes.mock.calls[0];
      expect(call[1].speed).toBeLessThanOrEqual(30);
    });
  });

  // ─── Multi-attribute training ─────────────────────────────────────────

  describe("multi-attribute training", () => {
    it("trains jump attribute at jump station", async () => {
      mockGetTagged.mockReturnValue([
        {
          IsA: (cls: string) => cls === "BasePart",
          GetAttribute: () => "jump",
          Position: { X: 0, Y: 0, Z: 0 },
        },
      ]);

      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "jump" });
      runDelayedCallbacks();

      // Jump=30 is above diminishing threshold 20, so gain is 0.05
      expect(mockDataSetAttributes).toHaveBeenCalledWith(
        player,
        expect.objectContaining({ jump: 30.05 })
      );
    });

    it("trains stamina attribute at stamina station", async () => {
      mockGetTagged.mockReturnValue([
        {
          IsA: (cls: string) => cls === "BasePart",
          GetAttribute: () => "stamina",
          Position: { X: 0, Y: 0, Z: 0 },
        },
      ]);

      const svc = await loadTrainingService();
      svc.onStart!();

      const player = makeNearPlayer();
      requestTrainingHandler!(player, { stationType: "stamina" });
      runDelayedCallbacks();

      expect(mockDataSetAttributes).toHaveBeenCalledWith(
        player,
        expect.objectContaining({ stamina: 5.1 })
      );
    });
  });
});
