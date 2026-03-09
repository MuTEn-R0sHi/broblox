/**
 * Hazard Service Tests — Obby Game Integration
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────

let capturedConfig: Record<string, unknown> | undefined;
const mockHandle = {
  Service: { name: "HazardService" },
  getHazardRegistry: vi.fn(() => "hazard-registry"),
  getHazardManager: vi.fn(() => "hazard-manager"),
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

beforeEach(() => {
  vi.resetModules();
  capturedConfig = undefined;
  vi.clearAllMocks();
});

async function loadService() {
  return import("./HazardService");
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("HazardService (obby)", () => {
  it("exports HazardService and getter functions", async () => {
    const mod = await loadService();
    expect(mod.HazardService).toBe(mockHandle.Service);
    expect(typeof mod.getHazardRegistry).toBe("function");
    expect(typeof mod.getHazardManager).toBe("function");
    expect(typeof mod.initPlayerHazards).toBe("function");
    expect(typeof mod.cleanupPlayerHazards).toBe("function");
  });

  it("configures 6 hazard definitions", async () => {
    await loadService();
    const definitions = capturedConfig!["definitions"] as Array<{ id: string }>;
    expect(definitions).toHaveLength(6);
    expect(definitions.map((d) => d.id)).toEqual([
      "lava_floor",
      "fire_jet",
      "poison_zone",
      "crumble_platform",
      "spike_trap",
      "hot_surface",
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
    expect(result).toBe("hazard-manager");
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

  it("provides onDamage callback", async () => {
    await loadService();
    const onDamage = capturedConfig!["onDamage"] as (
      playerId: number,
      damage: number,
      hazardId: string
    ) => boolean;
    expect(onDamage).toBeTypeOf("function");
    // Default impl returns false (no kill)
    expect(onDamage(1, 25, "fire_jet")).toBe(false);
  });

  it("provides onKill callback", async () => {
    await loadService();
    const onKill = capturedConfig!["onKill"] as (playerId: number, hazardId: string) => void;
    expect(onKill).toBeTypeOf("function");
    // Should not throw
    onKill(1, "lava_floor");
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
