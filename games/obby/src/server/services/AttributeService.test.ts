/**
 * AttributeService Tests
 *
 * Tests effective stat computation, gear bonuses, humanoid application,
 * and client sync payloads.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { type Player, makePlayer, makeDefaultData } from "./__test-helpers";

describe("AttributeService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockDataGetData: ReturnType<typeof vi.fn>;
  let mockDataGetAttributes: ReturnType<typeof vi.fn>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;
  let _playerAddedCallback: ((player: Player) => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
    _playerAddedCallback = undefined;

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    const defaultData = makeDefaultData();
    mockDataGetData = vi.fn(() => defaultData);
    mockDataGetAttributes = vi.fn(() => defaultData.attributes);

    mockRegistry = {
      fireClient: vi.fn(),
    };

    mockPlayerLifecycle = {
      onPlayerAdded: vi.fn((cb: (p: Player) => void) => {
        _playerAddedCallback = cb;
      }),
      onPlayerRemoving: vi.fn(),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
      Service: {},
    }));

    vi.doMock("./DataService", () => ({
      DataService: {
        getData: mockDataGetData,
        getAttributes: mockDataGetAttributes,
      },
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));
  });

  async function loadAttributeService() {
    const mod = await import("./AttributeService");
    return mod.AttributeService;
  }

  // ─── getEffective ────────────────────────────────────────────────────

  describe("getEffective", () => {
    it("returns base attributes when no gear is equipped", async () => {
      const svc = await loadAttributeService();
      const player = makePlayer();

      const effective = svc.getEffective(player);

      expect(effective.speed).toBe(10);
      expect(effective.jump).toBe(30);
      expect(effective.stamina).toBe(5);
    });

    it("adds gear bonuses to base attributes", async () => {
      const data = makeDefaultData();
      data.equipped = { feet: "running_shoes", back: "feather_cape" };
      mockDataGetData.mockReturnValue(data);
      mockDataGetAttributes.mockReturnValue(data.attributes);

      const svc = await loadAttributeService();
      const player = makePlayer();

      const effective = svc.getEffective(player);

      // running_shoes: speed+2, feather_cape: jump+3 speed+1
      expect(effective.speed).toBe(10 + 2 + 1);
      expect(effective.jump).toBe(30 + 3);
      expect(effective.stamina).toBe(5);
    });

    it("returns defaults when no data exists", async () => {
      mockDataGetAttributes.mockReturnValue(undefined);
      const svc = await loadAttributeService();
      const player = makePlayer();

      const effective = svc.getEffective(player);

      expect(effective.speed).toBe(10);
      expect(effective.jump).toBe(30);
      expect(effective.stamina).toBe(5);
    });

    it("stacks multiple gear bonuses correctly", async () => {
      const data = makeDefaultData();
      // champion_armor: speed+3 jump+3 stamina+3
      // sprint_trainers: speed+4 stamina+2
      data.equipped = { body: "champion_armor", feet: "sprint_trainers" };
      mockDataGetData.mockReturnValue(data);
      mockDataGetAttributes.mockReturnValue(data.attributes);

      const svc = await loadAttributeService();
      const player = makePlayer();

      const effective = svc.getEffective(player);

      expect(effective.speed).toBe(10 + 3 + 4);
      expect(effective.jump).toBe(30 + 3);
      expect(effective.stamina).toBe(5 + 3 + 2);
    });

    it("ignores unknown gear items", async () => {
      const data = makeDefaultData();
      data.equipped = { feet: "nonexistent_item" };
      mockDataGetData.mockReturnValue(data);
      mockDataGetAttributes.mockReturnValue(data.attributes);

      const svc = await loadAttributeService();
      const player = makePlayer();

      const effective = svc.getEffective(player);

      expect(effective.speed).toBe(10);
      expect(effective.jump).toBe(30);
      expect(effective.stamina).toBe(5);
    });
  });

  // ─── getWalkSpeed / getRunSpeed ──────────────────────────────────────

  describe("speed calculations", () => {
    it("computes walk speed from effective attributes", async () => {
      const svc = await loadAttributeService();
      const player = makePlayer();

      // WalkSpeed = 6 + (10 × 0.8) = 14
      expect(svc.getWalkSpeed(player)).toBe(14);
    });

    it("computes run speed as walk speed × 1.5", async () => {
      const svc = await loadAttributeService();
      const player = makePlayer();

      // RunSpeed = 14 × 1.5 = 21
      expect(svc.getRunSpeed(player)).toBe(21);
    });

    it("reflects gear bonuses in speed calculations", async () => {
      const data = makeDefaultData();
      data.equipped = { feet: "sprint_trainers" }; // speed+4
      mockDataGetData.mockReturnValue(data);
      mockDataGetAttributes.mockReturnValue(data.attributes);

      const svc = await loadAttributeService();
      const player = makePlayer();

      // WalkSpeed = 6 + (14 × 0.8) = 17.2
      expect(svc.getWalkSpeed(player)).toBeCloseTo(17.2);
      // RunSpeed = 17.2 × 1.5 = 25.8
      expect(svc.getRunSpeed(player)).toBeCloseTo(25.8);
    });
  });

  // ─── applyToHumanoid ────────────────────────────────────────────────

  describe("applyToHumanoid", () => {
    it("sets WalkSpeed and JumpPower on the character humanoid", async () => {
      const humanoid = { WalkSpeed: 16, JumpPower: 50 };
      const character = {
        FindFirstChildOfClass: vi.fn(() => humanoid),
      };
      const player = { ...makePlayer(), Character: character } as unknown as Player;

      const svc = await loadAttributeService();
      svc.applyToHumanoid(player);

      // WalkSpeed = 6 + (10 × 0.8) = 14
      expect(humanoid.WalkSpeed).toBe(14);
      // JumpPower = effective jump = 30
      expect(humanoid.JumpPower).toBe(30);
    });

    it("does nothing when player has no character", async () => {
      const player = makePlayer({ Character: undefined });

      const svc = await loadAttributeService();
      // Should not throw
      svc.applyToHumanoid(player);
    });
  });

  // ─── syncToClient ───────────────────────────────────────────────────

  describe("syncToClient", () => {
    it("fires AttributeSync with base, effective, and trainingReps", async () => {
      const data = makeDefaultData();
      mockDataGetData.mockReturnValue(data);
      mockDataGetAttributes.mockReturnValue(data.attributes);

      const svc = await loadAttributeService();
      const player = makePlayer();

      svc.syncToClient(player);

      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "AttributeSync",
        player,
        expect.objectContaining({
          base: data.attributes,
          effective: { speed: 10, jump: 30, stamina: 5 },
          trainingReps: { speed: 0, jump: 0, stamina: 0 },
        })
      );
    });

    it("does not fire when no attributes", async () => {
      mockDataGetAttributes.mockReturnValue(undefined);

      const svc = await loadAttributeService();
      const player = makePlayer();

      svc.syncToClient(player);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });

    it("does not fire when no data", async () => {
      mockDataGetData.mockReturnValue(undefined);

      const svc = await loadAttributeService();
      const player = makePlayer();

      svc.syncToClient(player);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });
  });
});
