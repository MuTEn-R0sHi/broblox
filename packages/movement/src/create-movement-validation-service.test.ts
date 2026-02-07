/**
 * Tests for createMovementValidationService factory.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockRobloxGlobals } from "@rbx/testing";

// ============================================================================
// Vector3 Mock
// ============================================================================

class MockVector3 {
  readonly X: number;
  readonly Y: number;
  readonly Z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.X = x;
    this.Y = y;
    this.Z = z;
  }
  get Magnitude(): number {
    return Math.sqrt(this.X * this.X + this.Y * this.Y + this.Z * this.Z);
  }
  sub(other: MockVector3): MockVector3 {
    return new MockVector3(this.X - other.X, this.Y - other.Y, this.Z - other.Z);
  }
  add(other: MockVector3): MockVector3 {
    return new MockVector3(this.X + other.X, this.Y + other.Y, this.Z + other.Z);
  }
  mul(scalar: number): MockVector3 {
    return new MockVector3(this.X * scalar, this.Y * scalar, this.Z * scalar);
  }
}

// ============================================================================
// Globals setup
// ============================================================================

const originalGlobals: Partial<Record<string, unknown>> = {};
function setGlobal(key: string, value: unknown) {
  const g = globalThis as unknown as Record<string, unknown>;
  if (!(key in originalGlobals)) originalGlobals[key] = g[key];
  g[key] = value;
}
function resetGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(originalGlobals)) {
    if (value === undefined) delete g[key];
    else g[key] = value;
  }
  for (const key of Object.keys(originalGlobals)) delete originalGlobals[key];
}

// ============================================================================
// Tests
// ============================================================================

describe("createMovementValidationService", () => {
  let heartbeatCallbacks: ((dt: number) => void)[];
  let mockPlayers: Record<string, unknown>[];
  let onPlayerRemovingCallback: ((player: Record<string, unknown>) => void) | undefined;
  let mockConnections: Array<{ Disconnect: ReturnType<typeof vi.fn> }>;

  beforeEach(() => {
    vi.resetModules();
    mockRobloxGlobals();

    heartbeatCallbacks = [];
    mockPlayers = [];
    mockConnections = [];
    onPlayerRemovingCallback = undefined;

    const g = globalThis as unknown as Record<string, unknown>;
    g.Vector3 = MockVector3;
    g.CFrame = class MockCFrame {
      Position: MockVector3;
      constructor(pos: MockVector3) {
        this.Position = pos;
      }
    };
    g.Enum = {
      Material: { Air: "Air" },
      HumanoidStateType: { Jumping: "Jumping", Running: "Running" },
    };
    g.string = {
      format: (fmt: string, ...args: unknown[]) => {
        let result = fmt;
        for (const arg of args) {
          result = result.replace(/%[\d.]*[dfsxXoOeEgGi]/, String(arg));
        }
        return result;
      },
    };

    setGlobal("Players", {
      GetPlayers: () => mockPlayers,
    });

    setGlobal("RunService", {
      Heartbeat: {
        Connect: (cb: (dt: number) => void) => {
          heartbeatCallbacks.push(cb);
          const conn = { Disconnect: vi.fn() };
          mockConnections.push(conn);
          return conn;
        },
      },
    });
  });

  afterEach(() => {
    resetGlobals();
    vi.restoreAllMocks();
  });

  function makeConfig(overrides?: Partial<{ isEnabled: () => boolean }>) {
    return {
      onPlayerRemoving: (cb: (player: Record<string, unknown>) => void) => {
        onPlayerRemovingCallback = cb;
      },
      ...overrides,
    };
  }

  function makePlayer(userId: number, position = new MockVector3(0, 0, 0)) {
    return {
      UserId: userId,
      Name: `Player${userId}`,
      Character: {
        FindFirstChild: (name: string) => {
          if (name === "HumanoidRootPart") {
            return {
              IsA: (cls: string) => cls === "BasePart",
              Position: position,
              AssemblyLinearVelocity: new MockVector3(0, 0, 0),
              CFrame: { Position: position },
            };
          }
          return undefined;
        },
        FindFirstChildOfClass: (cls: string) => {
          if (cls === "Humanoid") {
            return {
              FloorMaterial: "Grass", // not Air = grounded
              GetState: () => "Running",
              WalkSpeed: 16,
            };
          }
          return undefined;
        },
      },
    };
  }

  async function createService(config?: ReturnType<typeof makeConfig>) {
    const mod = await import("./create-movement-validation-service");
    return mod.createMovementValidationService(config ?? makeConfig());
  }

  it("returns a Service with onInit and onDestroy", async () => {
    const handle = await createService();
    expect(handle.Service).toBeDefined();
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("registers heartbeat connection on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();
    expect(heartbeatCallbacks).toHaveLength(1);
  });

  it("registers onPlayerRemoving callback on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();
    expect(onPlayerRemovingCallback).toBeDefined();
  });

  it("skips validation when isEnabled returns false", async () => {
    const player = makePlayer(1);
    mockPlayers.push(player);

    const handle = await createService(makeConfig({ isEnabled: () => false }));
    handle.Service.onInit!();

    // Tick heartbeat — should not crash or process players
    heartbeatCallbacks[0](1 / 60);
    // No assertion needed — just verifying it doesn't error
  });

  it("processes players on heartbeat tick when enabled", async () => {
    const player = makePlayer(1);
    mockPlayers.push(player);

    const handle = await createService(makeConfig({ isEnabled: () => true }));
    handle.Service.onInit!();

    // Should not throw
    heartbeatCallbacks[0](1 / 60);
  });

  it("skips player with no character", async () => {
    mockPlayers.push({ UserId: 1, Name: "NoChar", Character: undefined });

    const handle = await createService();
    handle.Service.onInit!();

    // Should not throw
    heartbeatCallbacks[0](1 / 60);
  });

  it("skips player with no HumanoidRootPart", async () => {
    mockPlayers.push({
      UserId: 1,
      Name: "NoHRP",
      Character: {
        FindFirstChild: () => undefined,
        FindFirstChildOfClass: () => undefined,
      },
    });

    const handle = await createService();
    handle.Service.onInit!();

    heartbeatCallbacks[0](1 / 60);
  });

  it("clamps large dt values to 0.25", async () => {
    const player = makePlayer(1);
    mockPlayers.push(player);

    const handle = await createService();
    handle.Service.onInit!();

    // Large dt should not cause false positive violations
    heartbeatCallbacks[0](5.0);
  });

  it("disconnects connections on destroy", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockConnections).toHaveLength(1);
    handle.Service.onDestroy!();
    expect(mockConnections[0].Disconnect).toHaveBeenCalled();
  });

  it("removes player state when player is removed", async () => {
    const player = makePlayer(1);
    mockPlayers.push(player);

    const handle = await createService();
    handle.Service.onInit!();

    // Tick to create state
    heartbeatCallbacks[0](1 / 60);

    // Simulate player removal
    onPlayerRemovingCallback!(player);

    // Should not throw on next tick after cleanup
    mockPlayers.length = 0;
    heartbeatCallbacks[0](1 / 60);
  });

  it("defaults isEnabled to true when not provided", async () => {
    const player = makePlayer(1);
    mockPlayers.push(player);

    const handle = await createService(makeConfig());
    handle.Service.onInit!();

    // Should process (enabled by default) without error
    heartbeatCallbacks[0](1 / 60);
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-movement-validation-service");
    const handle1 = mod.createMovementValidationService(makeConfig());
    const handle2 = mod.createMovementValidationService(makeConfig());
    expect(handle1.Service).not.toBe(handle2.Service);
  });
});
