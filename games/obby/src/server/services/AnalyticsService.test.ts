/**
 * AnalyticsService Tests (Obby)
 *
 * Tests that the game-level AnalyticsService wires event definitions,
 * funnel definitions, player lifecycle hooks, and exports correctly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("AnalyticsService (obby)", () => {
  let capturedConfig: Record<string, unknown> | undefined;

  let mockHandle: Record<string, ReturnType<typeof vi.fn>>;
  let mockOnPlayerAdded: ReturnType<typeof vi.fn>;
  let mockOnPlayerRemoving: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    capturedConfig = undefined;

    mockOnPlayerAdded = vi.fn();
    mockOnPlayerRemoving = vi.fn();

    mockHandle = {
      Service: { name: "AnalyticsService", onInit: vi.fn(), onStart: vi.fn() },
      getEventTracker: vi.fn(() => ({ track: vi.fn(), registerEvents: vi.fn() })),
      getFunnelTracker: vi.fn(() => ({ advanceStep: vi.fn() })),
      getSessionTracker: vi.fn(() => ({ startSession: vi.fn(), endSession: vi.fn() })),
      getRetentionTracker: vi.fn(() => ({ init: vi.fn(), recordVisit: vi.fn() })),
      initPlayer: vi.fn(),
      cleanupPlayer: vi.fn(),
    };

    vi.doMock("@rbx/analytics", () => ({
      createAnalyticsService: vi.fn((config: Record<string, unknown>) => {
        capturedConfig = config;
        if (typeof config["onPlayerAdded"] === "function") {
          (config["onPlayerAdded"] as (cb: unknown) => void)(vi.fn());
        }
        if (typeof config["onPlayerRemoving"] === "function") {
          (config["onPlayerRemoving"] as (cb: unknown) => void)(vi.fn());
        }
        return mockHandle;
      }),
    }));

    vi.doMock("./PlayerLifecycleService", () => ({
      PlayerLifecycleService: {
        onPlayerAdded: mockOnPlayerAdded,
        onPlayerRemoving: mockOnPlayerRemoving,
      },
    }));
  });

  async function loadModule() {
    return import("./AnalyticsService");
  }

  it("exports AnalyticsService", async () => {
    const mod = await loadModule();
    expect(mod.AnalyticsService).toBe(mockHandle.Service);
  });

  it("exports getEventTracker, getFunnelTracker, getSessionTracker, getRetentionTracker", async () => {
    const mod = await loadModule();
    expect(typeof mod.getEventTracker).toBe("function");
    expect(typeof mod.getFunnelTracker).toBe("function");
    expect(typeof mod.getSessionTracker).toBe("function");
    expect(typeof mod.getRetentionTracker).toBe("function");
  });

  describe("analyticsConfig", () => {
    it("passes ObbyAnalytics as datastoreName", async () => {
      await loadModule();
      const analyticsConfig = capturedConfig!["analyticsConfig"] as Record<string, unknown>;
      expect(analyticsConfig["datastoreName"]).toBe("ObbyAnalytics");
    });
  });

  describe("eventDefinitions", () => {
    const expectedEvents = [
      "player.joined",
      "player.left",
      "stage.completed",
      "stage.failed",
      "checkpoint.reached",
      "economy.purchase",
    ];

    for (const eventName of expectedEvents) {
      it(`includes the ${eventName} event definition`, async () => {
        await loadModule();
        const defs = capturedConfig!["eventDefinitions"] as Array<{ name: string }>;
        expect(defs.some((d) => d["name"] === eventName)).toBe(true);
      });
    }
  });

  describe("funnelDefinitions", () => {
    it("includes the progression funnel", async () => {
      await loadModule();
      const funnels = capturedConfig!["funnelDefinitions"] as Array<{ name: string }>;
      expect(funnels.some((f) => f["name"] === "progression")).toBe(true);
    });
  });

  describe("player lifecycle wiring", () => {
    it("wires onPlayerAdded to PlayerLifecycleService", async () => {
      await loadModule();
      expect(mockOnPlayerAdded).toHaveBeenCalled();
    });

    it("wires onPlayerRemoving to PlayerLifecycleService", async () => {
      await loadModule();
      expect(mockOnPlayerRemoving).toHaveBeenCalled();
    });
  });
});
