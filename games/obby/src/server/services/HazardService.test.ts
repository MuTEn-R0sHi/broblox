/**
 * Hazard Service Tests — Obby Game Integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────

let capturedConfig: Record<string, unknown> | undefined;
const mockManager = {
  addInstance: vi.fn(() => true),
  processTouch: vi.fn(),
  update: vi.fn(),
};
const mockHandle = {
  Service: {
    name: "HazardService",
    onStart: undefined as (() => void) | undefined,
    onDestroy: undefined as (() => void) | undefined,
  },
  getHazardRegistry: vi.fn(() => "hazard-registry"),
  getHazardManager: vi.fn(() => mockManager),
  initPlayer: vi.fn(),
  cleanupPlayer: vi.fn(),
};

vi.mock("@broblox/hazards", () => ({
  createHazardService: vi.fn((config: Record<string, unknown>) => {
    capturedConfig = config;
    return mockHandle;
  }),
}));

vi.mock("./PlayerLifecycleService", () => ({
  PlayerLifecycleService: {
    onPlayerRemoving: vi.fn(),
    onPlayerAdded: vi.fn(),
  },
}));

const mockFireClient = vi.fn();
vi.mock("./RemoteService", () => ({
  RemoteService: {
    getRegistry: () => ({ fireClient: mockFireClient }),
  },
}));

vi.mock("./DataService", () => ({
  DataService: {
    incrementDeaths: vi.fn(),
  },
}));

const mockHumanoid = {
  TakeDamage: vi.fn(),
  Health: 100,
  MaxHealth: 100,
};
const mockCharacter = {
  FindFirstChildOfClass: vi.fn((cls: string) => (cls === "Humanoid" ? mockHumanoid : undefined)),
  Parent: undefined,
};
const mockPlayer = {
  UserId: 1,
  Character: mockCharacter,
  Name: "TestPlayer",
};

vi.mock("@rbxts/services", () => ({
  Players: {
    GetPlayerByUserId: vi.fn((id: number) => (id === 1 ? mockPlayer : undefined)),
    GetPlayerFromCharacter: vi.fn(() => mockPlayer),
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
  mockHandle.Service.onStart = undefined;
  mockHandle.Service.onDestroy = undefined;
  mockHumanoid.Health = 100;
  mockHumanoid.TakeDamage.mockClear();
  mockFireClient.mockClear();
  vi.clearAllMocks();
});

async function loadService() {
  return import("./HazardService");
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("HazardService (obby)", () => {
  it("exports HazardService and getter functions", async () => {
    const mod = await loadService();
    expect(mod.HazardService.name).toBe("HazardService");
    expect(typeof mod.HazardService.onInit).toBe("function");
    expect(typeof mod.HazardService.onStart).toBe("function");
    expect(typeof mod.HazardService.onDestroy).toBe("function");
    expect(typeof mod.getHazardRegistry).toBe("function");
    expect(typeof mod.getHazardManager).toBe("function");
    expect(typeof mod.initPlayerHazards).toBe("function");
    expect(typeof mod.cleanupPlayerHazards).toBe("function");
  });

  it("configures 9 hazard definitions", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{ id: string }>;
    expect(definitions).toHaveLength(9);
    expect(definitions.map((d) => d.id)).toEqual([
      "lava_floor",
      "fire_jet",
      "poison_zone",
      "crumble_platform",
      "spike_trap",
      "hot_surface",
      "wind_blast",
      "cloud_dissolve",
      "lightning_strike",
    ]);
  });

  it("configures lava_floor as instant_kill", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{
      id: string;
      behaviour: string;
    }>;
    const lava = definitions.find((d) => d.id === "lava_floor")!;
    expect(lava.behaviour).toBe("instant_kill");
  });

  it("configures fire_jet as timed_burst with 2s/3s timing", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{
      id: string;
      behaviour: string;
      activeDuration?: number;
      cooldownDuration?: number;
    }>;
    const jet = definitions.find((d) => d.id === "fire_jet")!;
    expect(jet.behaviour).toBe("timed_burst");
    expect(jet.activeDuration).toBe(2);
    expect(jet.cooldownDuration).toBe(3);
  });

  it("configures crumble_platform with 1.5s break / 5s respawn", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{
      id: string;
      behaviour: string;
      activeDuration?: number;
      cooldownDuration?: number;
    }>;
    const plat = definitions.find((d) => d.id === "crumble_platform")!;
    expect(plat.behaviour).toBe("crumbling");
    expect(plat.activeDuration).toBe(1.5);
    expect(plat.cooldownDuration).toBe(5);
  });

  it("delegates getHazardRegistry", async () => {
    const mod = await loadService();
    const result = mod.getHazardRegistry();
    expect(mockHandle.getHazardRegistry).toHaveBeenCalled();
    expect(result).toBe("hazard-registry");
  });

  it("delegates getHazardManager", async () => {
    const mod = await loadService();
    const result = mod.getHazardManager();
    expect(mockHandle.getHazardManager).toHaveBeenCalled();
    expect(result).toBe(mockManager);
  });

  it("delegates initPlayerHazards", async () => {
    const mod = await loadService();
    mod.initPlayerHazards(42);
    expect(mockHandle.initPlayer).toHaveBeenCalledWith(42);
  });

  it("delegates cleanupPlayerHazards", async () => {
    const mod = await loadService();
    mod.cleanupPlayerHazards(42);
    expect(mockHandle.cleanupPlayer).toHaveBeenCalledWith(42);
  });

  it("wires onPlayerRemoving from PlayerLifecycleService", async () => {
    await loadService();
    expect(capturedConfig!["onPlayerRemoving"]).toBeTypeOf("function");
  });

  it("onDamage applies humanoid damage and fires remote", async () => {
    await loadService();
    const onDamage = capturedConfig!["onDamage"] as (
      playerId: number,
      damage: number,
      hazardId: string
    ) => boolean;

    const result = onDamage(1, 25, "fire_jet");
    expect(mockHumanoid.TakeDamage).toHaveBeenCalledWith(25);
    expect(mockFireClient).toHaveBeenCalledWith("HazardDamage", mockPlayer, {
      hazardId: "fire_jet",
      damage: 25,
    });
    expect(result).toBe(false); // Health 100, not dead
  });

  it("onDamage returns true when player dies", async () => {
    await loadService();
    mockHumanoid.Health = 0;
    const onDamage = capturedConfig!["onDamage"] as (
      playerId: number,
      damage: number,
      hazardId: string
    ) => boolean;

    const result = onDamage(1, 100, "lava_floor");
    expect(result).toBe(true);
  });

  it("onDamage returns false for unknown player", async () => {
    await loadService();
    const onDamage = capturedConfig!["onDamage"] as (
      playerId: number,
      damage: number,
      hazardId: string
    ) => boolean;

    const result = onDamage(999, 25, "fire_jet");
    expect(result).toBe(false);
    expect(mockHumanoid.TakeDamage).not.toHaveBeenCalled();
  });

  it("onKill increments deaths via DataService", async () => {
    const { DataService } = await import("./DataService");
    await loadService();
    const onKill = capturedConfig!["onKill"] as (playerId: number, hazardId: string) => void;

    onKill(1, "lava_floor");
    expect(DataService.incrementDeaths).toHaveBeenCalledWith(mockPlayer);
  });

  it("onToggle fires HazardToggle remote to all players", async () => {
    await loadService();
    const onToggle = capturedConfig!["onToggle"] as (instanceKey: string, active: boolean) => void;

    onToggle("fire_jet::jet_1", false);
    expect(mockFireClient).toHaveBeenCalledWith("HazardToggle", mockPlayer, {
      instanceKey: "fire_jet::jet_1",
      active: false,
    });
  });

  it("all hazard definitions have unique tags", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{
      id: string;
      tag: string;
    }>;
    const tags = new Set(definitions.map((d) => d.tag));
    expect(tags.size).toBe(definitions.length);
  });
});
