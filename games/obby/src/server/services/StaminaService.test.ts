/**
 * StaminaService Tests
 *
 * Tests drain/recharge mechanics, exhaustion cooldown, and client sync.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { type Player, makePlayer } from "./__test-helpers";

describe("StaminaService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockPlayerLifecycle: Record<string, ReturnType<typeof vi.fn>>;
  let playerAddedCallback: ((player: Player) => void) | undefined;
  let playerRemovingCallback: ((player: Player) => void) | undefined;
  let heartbeatCallback: ((dt: number) => void) | undefined;

  // Mock AttributeService effective stats
  let mockEffective: { speed: number; jump: number; stamina: number };
  let mockWalkSpeed: number;
  let mockRunSpeed: number;

  beforeEach(() => {
    vi.resetModules();
    playerAddedCallback = undefined;
    playerRemovingCallback = undefined;
    heartbeatCallback = undefined;

    // Clear mock Players registry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (game.GetService("Players") as any)._reset();

    mockEffective = { speed: 10, jump: 30, stamina: 5 };
    mockWalkSpeed = 14; // 6 + 10*0.8
    mockRunSpeed = 21; // 14 * 1.5

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockRegistry = {
      fireClient: vi.fn(),
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

    vi.doMock("@rbxts/services", () => ({
      RunService: {
        Heartbeat: {
          Connect: vi.fn((cb: (dt: number) => void) => {
            heartbeatCallback = cb;
            return { Disconnect: vi.fn() };
          }),
        },
      },
    }));

    vi.doMock("./AttributeService", () => ({
      AttributeService: {
        getEffective: vi.fn(() => mockEffective),
        getWalkSpeed: vi.fn(() => mockWalkSpeed),
        getRunSpeed: vi.fn(() => mockRunSpeed),
      },
    }));

    vi.doMock("./RemoteService", () => ({
      RemoteService: { getRegistry: () => mockRegistry },
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: mockPlayerLifecycle,
    }));
  });

  async function loadStaminaService() {
    const mod = await import("./StaminaService");
    return mod.StaminaService;
  }

  function makeSprintingPlayer(userId = 42): Player {
    // WalkSpeed >= runSpeed means sprinting
    const humanoid = {
      WalkSpeed: mockRunSpeed,
      MoveDirection: { Magnitude: 1 },
    };
    const player = {
      Name: "TestPlayer",
      UserId: userId,
      Character: {
        FindFirstChild: vi.fn(),
        FindFirstChildOfClass: vi.fn(() => humanoid),
      },
    } as unknown as Player;
    // Register with the global Players mock so Heartbeat can find them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (game.GetService("Players") as any)._addPlayer(player);
    return player;
  }

  function makeWalkingPlayer(userId = 42): Player {
    const humanoid = {
      WalkSpeed: mockWalkSpeed,
      MoveDirection: { Magnitude: 0.5 },
    };
    const player = {
      Name: "TestPlayer",
      UserId: userId,
      Character: {
        FindFirstChild: vi.fn(),
        FindFirstChildOfClass: vi.fn(() => humanoid),
      },
    } as unknown as Player;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (game.GetService("Players") as any)._addPlayer(player);
    return player;
  }

  function makeIdlePlayer(userId = 42): Player {
    const humanoid = {
      WalkSpeed: mockWalkSpeed,
      MoveDirection: { Magnitude: 0 },
    };
    const player = {
      Name: "TestPlayer",
      UserId: userId,
      Character: {
        FindFirstChild: vi.fn(),
        FindFirstChildOfClass: vi.fn(() => humanoid),
      },
    } as unknown as Player;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (game.GetService("Players") as any)._addPlayer(player);
    return player;
  }

  // ─── State management ────────────────────────────────────────────────

  describe("state management", () => {
    it("initializes stamina to max on player join", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();

      const player = makePlayer();
      playerAddedCallback!(player);

      const state = svc.getState(player);
      expect(state).toBeDefined();
      expect(state!.current).toBe(5); // DEFAULT_STAMINA
      expect(state!.exhausted).toBe(false);
    });

    it("removes state on player leave", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();

      const player = makePlayer();
      playerAddedCallback!(player);
      expect(svc.getState(player)).toBeDefined();

      playerRemovingCallback!(player);
      expect(svc.getState(player)).toBeUndefined();
    });

    it("returns undefined for unknown player", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();

      const player = makePlayer({ UserId: 999 });
      expect(svc.getState(player)).toBeUndefined();
    });
  });

  // ─── canSprint ───────────────────────────────────────────────────────

  describe("canSprint", () => {
    it("returns true when stamina > 0 and not exhausted", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();

      const player = makePlayer();
      playerAddedCallback!(player);

      expect(svc.canSprint(player)).toBe(true);
    });

    it("returns false when exhausted", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();

      const player = makePlayer();
      playerAddedCallback!(player);

      svc.setExhausted(player);
      expect(svc.canSprint(player)).toBe(false);
    });

    it("returns false for unknown player", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();

      const player = makePlayer({ UserId: 999 });
      expect(svc.canSprint(player)).toBe(false);
    });
  });

  // ─── setExhausted ───────────────────────────────────────────────────

  describe("setExhausted", () => {
    it("sets exhausted flag and cooldown timer", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();

      const player = makePlayer();
      playerAddedCallback!(player);

      svc.setExhausted(player);

      const state = svc.getState(player);
      expect(state!.exhausted).toBe(true);
      expect(state!.exhaustionTimer).toBe(2); // STAMINA_EXHAUSTION_COOLDOWN
    });

    it("forces walk speed on humanoid when exhausted", async () => {
      const humanoid = { WalkSpeed: mockRunSpeed };
      const character = { FindFirstChildOfClass: vi.fn(() => humanoid) };
      const player = {
        ...makePlayer(),
        Character: character,
      } as unknown as Player;

      const svc = await loadStaminaService();
      svc.onInit!();
      playerAddedCallback!(player);

      svc.setExhausted(player);
      expect(humanoid.WalkSpeed).toBe(mockWalkSpeed);
    });
  });

  // ─── Heartbeat drain/recharge ────────────────────────────────────────

  describe("heartbeat loop", () => {
    it("drains stamina while sprinting", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();
      svc.onStart!();

      const player = makeSprintingPlayer();
      playerAddedCallback!(player);

      const initialStamina = svc.getState(player)!.current;

      // Simulate 1 second of heartbeat ticks (drain rate = 1/sec)
      heartbeatCallback!(1.0);

      expect(svc.getState(player)!.current).toBe(initialStamina - 1);
    });

    it("triggers exhaustion when stamina reaches 0", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();
      svc.onStart!();

      const player = makeSprintingPlayer();
      playerAddedCallback!(player);

      // Drain all stamina (5 units at 1/sec = 5 seconds)
      heartbeatCallback!(5.0);

      const state = svc.getState(player)!;
      expect(state.current).toBe(0);
      expect(state.exhausted).toBe(true);
    });

    it("recharges stamina while walking (not sprinting)", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();
      svc.onStart!();

      const player = makeWalkingPlayer();
      playerAddedCallback!(player);

      // Drain some stamina first
      const state = svc.getState(player)!;
      state.current = 2;

      // Walk for 2 seconds: recharge rate = 0.5/sec → +1
      heartbeatCallback!(2.0);

      expect(state.current).toBe(3);
    });

    it("recharges faster while idle", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();
      svc.onStart!();

      const player = makeIdlePlayer();
      playerAddedCallback!(player);

      const state = svc.getState(player)!;
      state.current = 2;

      // Idle for 2 seconds: idle recharge = 1/sec → +2
      heartbeatCallback!(2.0);

      expect(state.current).toBe(4);
    });

    it("does not recharge above max stamina", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();
      svc.onStart!();

      const player = makeIdlePlayer();
      playerAddedCallback!(player);

      // Already at max (5), idle 10 seconds should stay at 5
      heartbeatCallback!(10.0);

      expect(svc.getState(player)!.current).toBe(5);
    });

    it("counts down exhaustion timer before allowing recharge", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();
      svc.onStart!();

      const player = makeIdlePlayer();
      playerAddedCallback!(player);

      svc.setExhausted(player);

      // 1 second — exhaustion timer should decrease (2→1) but still exhausted
      heartbeatCallback!(1.0);
      expect(svc.getState(player)!.exhausted).toBe(true);

      // Another 1.5 seconds — exhaustion clears (timer ≤ 0)
      heartbeatCallback!(1.5);
      expect(svc.getState(player)!.exhausted).toBe(false);
    });
  });

  // ─── syncToClient ───────────────────────────────────────────────────

  describe("syncToClient", () => {
    it("fires StaminaSync event with current, max, and exhausted state", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();

      const player = makePlayer();
      playerAddedCallback!(player);

      svc.syncToClient(player);

      expect(mockRegistry.fireClient).toHaveBeenCalledWith(
        "StaminaSync",
        player,
        expect.objectContaining({
          current: 5,
          max: 5,
          exhausted: false,
        })
      );
    });

    it("does not fire for unknown player", async () => {
      const svc = await loadStaminaService();
      svc.onInit!();

      const player = makePlayer({ UserId: 999 });
      svc.syncToClient(player);

      expect(mockRegistry.fireClient).not.toHaveBeenCalled();
    });
  });
});
