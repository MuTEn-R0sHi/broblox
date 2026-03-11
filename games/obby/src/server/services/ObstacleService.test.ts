/**
 * Obstacle Service Tests — Obby Game Integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────

let capturedConfig: Record<string, unknown> | undefined;
const mockManager = {
  addInstance: vi.fn(() => true),
  removeInstance: vi.fn(() => true),
  update: vi.fn(),
  instanceCount: vi.fn(() => 0),
  getInstanceState: vi.fn(),
};
const mockRegistry = {
  count: vi.fn(() => 8),
};
const mockHandle = {
  Service: {
    name: "ObstacleService",
    onInit: undefined as (() => void) | undefined,
    onStart: undefined as (() => void) | undefined,
    onDestroy: undefined as (() => void) | undefined,
  },
  getObstacleRegistry: vi.fn(() => mockRegistry),
  getObstacleManager: vi.fn(() => mockManager),
};

vi.mock("@broblox/obstacles", () => ({
  createObstacleService: vi.fn((config: Record<string, unknown>) => {
    capturedConfig = config;
    return mockHandle;
  }),
}));

const mockFireClient = vi.fn();
vi.mock("./RemoteService", () => ({
  RemoteService: {
    getRegistry: () => ({ fireClient: mockFireClient }),
  },
}));

const mockPlayer = {
  UserId: 1,
  Name: "TestPlayer",
};

vi.mock("@rbxts/services", () => ({
  Players: {
    GetPlayers: vi.fn(() => [mockPlayer]),
  },
  RunService: {
    Heartbeat: {
      Connect: vi.fn(() => ({ Disconnect: vi.fn() })),
    },
  },
  CollectionService: {
    GetTagged: vi.fn(() => []),
  },
}));

beforeEach(() => {
  vi.resetModules();
  capturedConfig = undefined;
  mockHandle.Service.onInit = undefined;
  mockHandle.Service.onStart = undefined;
  mockHandle.Service.onDestroy = undefined;
  mockFireClient.mockClear();
  vi.clearAllMocks();
});

async function loadService() {
  return import("./ObstacleService");
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("ObstacleService (obby)", () => {
  it("exports ObstacleService and getter functions", async () => {
    const mod = await loadService();
    expect(mod.ObstacleService.name).toBe("ObstacleService");
    expect(typeof mod.ObstacleService.onInit).toBe("function");
    expect(typeof mod.ObstacleService.onStart).toBe("function");
    expect(typeof mod.ObstacleService.onDestroy).toBe("function");
    expect(typeof mod.getObstacleRegistry).toBe("function");
    expect(typeof mod.getObstacleManager).toBe("function");
  });

  it("configures 8 obstacle definitions", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{ id: string }>;
    expect(definitions).toHaveLength(8);
    expect(definitions.map((d) => d.id)).toEqual([
      "slow_platform",
      "fast_platform",
      "slow_spinner",
      "fast_spinner",
      "blink_platform",
      "blink_platform_phased",
      "conveyor_slow",
      "conveyor_fast",
    ]);
  });

  it("configures slow_platform as moving_platform with correct tuning", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{
      id: string;
      behaviour: string;
      speed?: number;
      distance?: number;
    }>;
    const plat = definitions.find((d) => d.id === "slow_platform")!;
    expect(plat.behaviour).toBe("moving_platform");
    expect(plat.speed).toBe(8);
    expect(plat.distance).toBe(20);
  });

  it("configures blink_platform_phased with phaseOffset", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{
      id: string;
      behaviour: string;
      phaseOffset?: number;
    }>;
    const phased = definitions.find((d) => d.id === "blink_platform_phased")!;
    expect(phased.behaviour).toBe("timed_sequence");
    expect(phased.phaseOffset).toBe(0.5);
  });

  it("configures conveyor with speed only", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{
      id: string;
      behaviour: string;
      speed?: number;
    }>;
    const conv = definitions.find((d) => d.id === "conveyor_fast")!;
    expect(conv.behaviour).toBe("conveyor");
    expect(conv.speed).toBe(25);
  });

  it("delegates getObstacleRegistry", async () => {
    const mod = await loadService();
    const result = mod.getObstacleRegistry();
    expect(mockHandle.getObstacleRegistry).toHaveBeenCalled();
    expect(result).toBe(mockRegistry);
  });

  it("delegates getObstacleManager", async () => {
    const mod = await loadService();
    const result = mod.getObstacleManager();
    expect(mockHandle.getObstacleManager).toHaveBeenCalled();
    expect(result).toBe(mockManager);
  });

  it("provides onUpdate callback that fires ObstacleUpdate remote", async () => {
    await loadService();
    const onUpdate = capturedConfig!["onUpdate"] as (
      key: string,
      progress: number,
      active: boolean
    ) => void;
    expect(onUpdate).toBeTypeOf("function");
    onUpdate("slow_platform::test", 0.5, true);
    expect(mockFireClient).toHaveBeenCalledWith("ObstacleUpdate", mockPlayer, {
      instanceKey: "slow_platform::test",
      progress: 0.5,
      active: true,
    });
  });

  it("provides onToggle callback that fires ObstacleToggle remote", async () => {
    await loadService();
    const onToggle = capturedConfig!["onToggle"] as (key: string, active: boolean) => void;
    expect(onToggle).toBeTypeOf("function");
    onToggle("blink_platform::b1", false);
    expect(mockFireClient).toHaveBeenCalledWith("ObstacleToggle", mockPlayer, {
      instanceKey: "blink_platform::b1",
      active: false,
    });
  });
});
