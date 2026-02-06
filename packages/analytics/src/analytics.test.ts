/**
 * Analytics Tests
 *
 * Comprehensive tests for EventTracker, FunnelTracker,
 * SessionTracker, and RetentionTracker.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AnalyticsConfig, EventDefinition, FunnelDefinition, RetentionRecord } from "./types";

// LuaTuple is a roblox-ts compiler global not available under vitest's tsconfig
declare type LuaTuple<T extends unknown[]> = T & { readonly LUA_TUPLE: never };

// ---------------------------------------------------------------------------
// Roblox globals polyfills
// ---------------------------------------------------------------------------

const arrayProto = Array.prototype as unknown as Record<string, unknown>;
if (!arrayProto.size) {
  arrayProto.size = function (this: unknown[]) {
    return this.length;
  };
}

let mockTime = 1000;
let mockDataStore: {
  data: Map<string, unknown>;
  GetAsync: ReturnType<typeof vi.fn>;
  SetAsync: ReturnType<typeof vi.fn>;
  UpdateAsync: ReturnType<typeof vi.fn>;
};

function createMockDataStore() {
  const data = new Map<string, unknown>();
  return {
    data,
    GetAsync: vi.fn((key: string) => data.get(key)),
    SetAsync: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    }),
    UpdateAsync: vi.fn((key: string, callback: (old: unknown) => unknown) => {
      const old = data.get(key);
      const result = callback(old);
      data.set(key, result);
      return result;
    }),
  };
}

function setupGlobals() {
  mockTime = 1000;
  mockDataStore = createMockDataStore();

  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = { floor: Math.floor, min: Math.min, max: Math.max, huge: Infinity };
  g.pcall = (fn: (...a: unknown[]) => unknown, ...args: unknown[]) => {
    try {
      const result = fn(...args);
      return [true, result];
    } catch (e) {
      return [false, e];
    }
  };
  g.typeIs = (value: unknown, typeName: string) => {
    if (typeName === "table") return typeof value === "object" && value !== null;
    return typeof value === typeName;
  };
  g.game = {
    JobId: "test-job-123",
    GetService: (name: string) => {
      if (name === "DataStoreService") {
        return { GetDataStore: () => mockDataStore };
      }
      throw new Error(`Unexpected service: ${name}`);
    },
  };
}

function teardownGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  for (const key of ["print", "os", "math", "pcall", "typeIs", "game"]) {
    delete g[key];
  }
}

function makeConfig(overrides?: Partial<AnalyticsConfig>): AnalyticsConfig {
  return {
    datastoreName: "TestRetention",
    heartbeatInterval: 60,
    enableLogging: false,
    forwardToTelemetry: false,
    ...overrides,
  };
}

// ============================================================================
// EventTracker
// ============================================================================

describe("EventTracker", () => {
  beforeEach(() => {
    setupGlobals();
    vi.resetModules();
  });
  afterEach(teardownGlobals);

  async function getTracker(overrides?: Partial<AnalyticsConfig>) {
    const { EventTracker } = await import("./event-tracker");
    return new EventTracker(makeConfig(overrides));
  }

  describe("registration", () => {
    it("registers and retrieves event definitions", async () => {
      const tracker = await getTracker();
      const def: EventDefinition = {
        name: "player.level_up",
        category: "player",
        description: "Player leveled up",
        expectedFields: ["level", "xpEarned"],
      };
      tracker.registerEvent(def);
      expect(tracker.getDefinition("player.level_up")).toEqual(def);
    });

    it("registers multiple events via batch", async () => {
      const tracker = await getTracker();
      tracker.registerEvents([
        { name: "match.started", category: "match", description: "Match began" },
        { name: "match.ended", category: "match", description: "Match ended" },
      ]);
      expect(tracker.listEvents()).toHaveLength(2);
      expect(tracker.listEvents()).toContain("match.started");
    });

    it("returns undefined for unregistered event", async () => {
      const tracker = await getTracker();
      expect(tracker.getDefinition("nonexistent")).toBeUndefined();
    });
  });

  describe("tracking", () => {
    it("tracks an event and calls onEvent callback", async () => {
      const onEvent = vi.fn();
      const tracker = await getTracker({ onEvent });
      tracker.registerEvent({
        name: "player.joined",
        category: "player",
        description: "Player joined",
      });

      tracker.track("player.joined", 100, { lobby: "main" });

      expect(onEvent).toHaveBeenCalledTimes(1);
      const event = onEvent.mock.calls[0][0];
      expect(event.name).toBe("player.joined");
      expect(event.playerId).toBe(100);
      expect(event.data.lobby).toBe("main");
      expect(event.category).toBe("player");
      expect(event.timestamp).toBe(1000);
    });

    it("tracks unregistered events as 'custom' category", async () => {
      const onEvent = vi.fn();
      const tracker = await getTracker({ onEvent });

      tracker.track("something.random", 42);

      const event = onEvent.mock.calls[0][0];
      expect(event.category).toBe("custom");
    });

    it("allows category override", async () => {
      const onEvent = vi.fn();
      const tracker = await getTracker({ onEvent });

      tracker.track("custom.event", 1, {}, "economy");

      expect(onEvent.mock.calls[0][0].category).toBe("economy");
    });

    it("tracks a batch of events", async () => {
      const onEvent = vi.fn();
      const tracker = await getTracker({ onEvent });

      tracker.trackBatch([
        { name: "a", playerId: 1 },
        { name: "b", playerId: 2, data: { x: 1 } },
        { name: "c", playerId: 3 },
      ]);

      expect(onEvent).toHaveBeenCalledTimes(3);
    });

    it("includes serverId from game.JobId", async () => {
      const onEvent = vi.fn();
      const tracker = await getTracker({ onEvent });

      tracker.track("test", 1);

      expect(onEvent.mock.calls[0][0].serverId).toBe("test-job-123");
    });
  });

  describe("validation", () => {
    it("does not block tracking when expected fields are missing", async () => {
      const onEvent = vi.fn();
      const tracker = await getTracker({ onEvent, enableLogging: true });
      tracker.registerEvent({
        name: "economy.purchase",
        category: "economy",
        description: "In-game purchase",
        expectedFields: ["itemId", "price"],
      });

      // Missing "price" — should still track
      tracker.track("economy.purchase", 1, { itemId: "sword_01" });
      expect(onEvent).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// FunnelTracker
// ============================================================================

describe("FunnelTracker", () => {
  beforeEach(() => {
    setupGlobals();
    vi.resetModules();
  });
  afterEach(teardownGlobals);

  async function getTracker(overrides?: Partial<AnalyticsConfig>) {
    const { FunnelTracker } = await import("./funnel-tracker");
    return new FunnelTracker(makeConfig(overrides));
  }

  const tutorialFunnel: FunnelDefinition = {
    name: "tutorial",
    label: "Tutorial Flow",
    steps: ["welcome", "move", "jump", "combat", "complete"],
    timeoutSec: 600,
  };

  describe("registration", () => {
    it("registers a funnel", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);
      expect(tracker.getFunnel("tutorial")).toEqual(tutorialFunnel);
    });

    it("returns undefined for unregistered funnel", async () => {
      const tracker = await getTracker();
      expect(tracker.getFunnel("nope")).toBeUndefined();
    });
  });

  describe("progression", () => {
    it("enters a player into a funnel", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);

      expect(tracker.enterFunnel("tutorial", 100)).toBe(true);
      const prog = tracker.getProgress("tutorial", 100);
      expect(prog).toBeDefined();
      expect(prog!.currentStep).toBe(0);
      expect(prog!.completed).toBe(false);
    });

    it("rejects double-entry", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);
      tracker.enterFunnel("tutorial", 100);

      expect(tracker.enterFunnel("tutorial", 100)).toBe(false);
    });

    it("rejects entering unknown funnel", async () => {
      const tracker = await getTracker();
      expect(tracker.enterFunnel("unknown", 100)).toBe(false);
    });

    it("advances through steps in order", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);
      tracker.enterFunnel("tutorial", 100);

      expect(tracker.advanceStep("tutorial", 100, "move")).toBe(true);
      expect(tracker.getProgress("tutorial", 100)!.currentStep).toBe(1);

      expect(tracker.advanceStep("tutorial", 100, "jump")).toBe(true);
      expect(tracker.getProgress("tutorial", 100)!.currentStep).toBe(2);
    });

    it("rejects wrong step name", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);
      tracker.enterFunnel("tutorial", 100);

      // Next expected step is "move", not "jump"
      expect(tracker.advanceStep("tutorial", 100, "jump")).toBe(false);
      expect(tracker.getProgress("tutorial", 100)!.currentStep).toBe(0);
    });

    it("marks completed when reaching last step", async () => {
      const onComplete = vi.fn();
      const tracker = await getTracker({ onFunnelComplete: onComplete });
      tracker.registerFunnel(tutorialFunnel);
      tracker.enterFunnel("tutorial", 100);

      tracker.advanceStep("tutorial", 100, "move");
      tracker.advanceStep("tutorial", 100, "jump");
      tracker.advanceStep("tutorial", 100, "combat");
      tracker.advanceStep("tutorial", 100, "complete");

      const prog = tracker.getProgress("tutorial", 100)!;
      expect(prog.completed).toBe(true);
      expect(prog.currentStep).toBe(4);
      expect(onComplete).toHaveBeenCalledWith("tutorial", 100, 0);
    });

    it("rejects advance after completion", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel({
        name: "short",
        label: "Short",
        steps: ["a", "b"],
      });
      tracker.enterFunnel("short", 1);
      tracker.advanceStep("short", 1, "b");

      // Already completed
      expect(tracker.advanceStep("short", 1, "extra")).toBe(false);
    });

    it("times out players who take too long", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);
      tracker.enterFunnel("tutorial", 100);

      // Advance time past timeout
      mockTime = 1000 + 601;

      expect(tracker.advanceStep("tutorial", 100, "move")).toBe(false);
      expect(tracker.getProgress("tutorial", 100)!.timedOut).toBe(true);
    });
  });

  describe("player management", () => {
    it("removes a player from a funnel", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);
      tracker.enterFunnel("tutorial", 100);

      tracker.removePlayer("tutorial", 100);
      expect(tracker.getProgress("tutorial", 100)).toBeUndefined();
    });

    it("removes a player from all funnels", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);
      tracker.registerFunnel({ name: "shop", label: "Shop", steps: ["browse", "buy"] });
      tracker.enterFunnel("tutorial", 100);
      tracker.enterFunnel("shop", 100);

      tracker.removePlayerFromAll(100);
      expect(tracker.getProgress("tutorial", 100)).toBeUndefined();
      expect(tracker.getProgress("shop", 100)).toBeUndefined();
    });
  });

  describe("stats", () => {
    it("computes funnel statistics", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);

      // 3 players enter
      tracker.enterFunnel("tutorial", 1);
      tracker.enterFunnel("tutorial", 2);
      tracker.enterFunnel("tutorial", 3);

      // Player 1 completes all
      tracker.advanceStep("tutorial", 1, "move");
      tracker.advanceStep("tutorial", 1, "jump");
      tracker.advanceStep("tutorial", 1, "combat");
      tracker.advanceStep("tutorial", 1, "complete");

      // Player 2 gets to step 2
      tracker.advanceStep("tutorial", 2, "move");
      tracker.advanceStep("tutorial", 2, "jump");

      // Player 3 stays at step 0

      const stats = tracker.getStats("tutorial")!;
      expect(stats.entered).toBe(3);
      expect(stats.completed).toBe(1);
      expect(stats.conversionRate).toBeCloseTo(1 / 3);
      // stepCounts: all 3 at step 0, 2 at step 1, 2 at step 2, 1 at step 3, 1 at step 4
      expect(stats.stepCounts[0]).toBe(3); // welcome
      expect(stats.stepCounts[1]).toBe(2); // move
      expect(stats.stepCounts[2]).toBe(2); // jump
      expect(stats.stepCounts[3]).toBe(1); // combat
      expect(stats.stepCounts[4]).toBe(1); // complete
    });

    it("returns undefined for unknown funnel", async () => {
      const tracker = await getTracker();
      expect(tracker.getStats("nope")).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("resets a specific funnel", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);
      tracker.enterFunnel("tutorial", 1);

      tracker.reset("tutorial");
      expect(tracker.getProgress("tutorial", 1)).toBeUndefined();
    });

    it("resets all funnels", async () => {
      const tracker = await getTracker();
      tracker.registerFunnel(tutorialFunnel);
      tracker.registerFunnel({ name: "shop", label: "Shop", steps: ["a", "b"] });
      tracker.enterFunnel("tutorial", 1);
      tracker.enterFunnel("shop", 2);

      tracker.reset();
      expect(tracker.getProgress("tutorial", 1)).toBeUndefined();
      expect(tracker.getProgress("shop", 2)).toBeUndefined();
    });
  });
});

// ============================================================================
// SessionTracker
// ============================================================================

describe("SessionTracker", () => {
  beforeEach(() => {
    setupGlobals();
    vi.resetModules();
  });
  afterEach(teardownGlobals);

  async function getTracker(overrides?: Partial<AnalyticsConfig>) {
    const { SessionTracker } = await import("./session-tracker");
    return new SessionTracker(makeConfig(overrides));
  }

  describe("lifecycle", () => {
    it("starts a session", async () => {
      const tracker = await getTracker();
      tracker.startSession(100);

      const session = tracker.getSession(100);
      expect(session).toBeDefined();
      expect(session!.active).toBe(true);
      expect(session!.startedAt).toBe(1000);
      expect(session!.playtimeSec).toBe(0);
    });

    it("ignores duplicate session start", async () => {
      const tracker = await getTracker();
      tracker.startSession(100);
      tracker.startSession(100); // no-op

      expect(tracker.getActiveCount()).toBe(1);
    });

    it("records heartbeats and accumulates playtime", async () => {
      const tracker = await getTracker();
      tracker.startSession(100);

      mockTime = 1060; // 60 seconds later
      tracker.heartbeat(100);

      expect(tracker.getSession(100)!.playtimeSec).toBe(60);

      mockTime = 1120; // another 60 seconds
      tracker.heartbeat(100);

      expect(tracker.getSession(100)!.playtimeSec).toBe(120);
    });

    it("ends a session and returns final data", async () => {
      const tracker = await getTracker();
      tracker.startSession(100);

      mockTime = 1300; // 300 seconds later
      const final = tracker.endSession(100);

      expect(final).toBeDefined();
      expect(final!.playtimeSec).toBe(300);
      expect(final!.active).toBe(false);
      expect(tracker.getSession(100)).toBeUndefined();
    });

    it("returns undefined when ending non-existent session", async () => {
      const tracker = await getTracker();
      expect(tracker.endSession(999)).toBeUndefined();
    });
  });

  describe("queries", () => {
    it("returns active sessions", async () => {
      const tracker = await getTracker();
      tracker.startSession(1);
      tracker.startSession(2);
      tracker.startSession(3);

      expect(tracker.getActiveSessions()).toHaveLength(3);
      expect(tracker.getActiveCount()).toBe(3);
    });

    it("excludes ended sessions from active count", async () => {
      const tracker = await getTracker();
      tracker.startSession(1);
      tracker.startSession(2);
      tracker.endSession(1);

      expect(tracker.getActiveCount()).toBe(1);
    });
  });

  describe("properties", () => {
    it("sets custom properties on a session", async () => {
      const tracker = await getTracker();
      tracker.startSession(100, { region: "us-east" });
      tracker.setProperty(100, "level", 5);

      const session = tracker.getSession(100)!;
      expect(session.properties.region).toBe("us-east");
      expect(session.properties.level).toBe(5);
    });
  });

  describe("heartbeatAll", () => {
    it("updates playtime for all active sessions", async () => {
      const tracker = await getTracker();
      tracker.startSession(1);
      tracker.startSession(2);

      mockTime = 1030;
      tracker.heartbeatAll();

      expect(tracker.getSession(1)!.playtimeSec).toBe(30);
      expect(tracker.getSession(2)!.playtimeSec).toBe(30);
    });
  });
});

// ============================================================================
// RetentionTracker
// ============================================================================

describe("RetentionTracker", () => {
  beforeEach(() => {
    setupGlobals();
    vi.resetModules();
  });
  afterEach(teardownGlobals);

  async function getTracker(overrides?: Partial<AnalyticsConfig>) {
    const { RetentionTracker } = await import("./retention-tracker");
    const tracker = new RetentionTracker(makeConfig(overrides));
    tracker.init();
    return tracker;
  }

  describe("new player", () => {
    it("creates a retention record on first visit", async () => {
      const tracker = await getTracker();
      const record = tracker.recordVisit(100);

      expect(record).toBeDefined();
      expect(record!.firstSeen).toBe(1000);
      expect(record!.returnDays).toHaveLength(0);
      expect(record!.totalSessions).toBe(1);
    });

    it("stores the record in DataStore", async () => {
      const tracker = await getTracker();
      tracker.recordVisit(100);

      expect(mockDataStore.UpdateAsync).toHaveBeenCalledWith("ret_100", expect.any(Function));
    });
  });

  describe("returning player", () => {
    it("records a return visit on day 1", async () => {
      const tracker = await getTracker();

      // First visit
      tracker.recordVisit(100);

      // 1 day later
      mockTime = 1000 + 86400;
      const record = tracker.recordVisit(100);

      expect(record!.returnDays).toContain(1);
      expect(record!.totalSessions).toBe(2);
    });

    it("records return visits across multiple days", async () => {
      const tracker = await getTracker();

      tracker.recordVisit(100);

      // Day 1
      mockTime = 1000 + 86400;
      tracker.recordVisit(100);

      // Day 7
      mockTime = 1000 + 86400 * 7;
      tracker.recordVisit(100);

      // Day 30
      mockTime = 1000 + 86400 * 30;
      const record = tracker.recordVisit(100);

      expect(record!.returnDays).toContain(1);
      expect(record!.returnDays).toContain(7);
      expect(record!.returnDays).toContain(30);
      expect(record!.totalSessions).toBe(4);
    });

    it("does not duplicate same-day visits", async () => {
      const tracker = await getTracker();

      tracker.recordVisit(100);

      // Same day (within 24h)
      mockTime = 1000 + 3600;
      const record = tracker.recordVisit(100);

      // Day 0 is not added since daysSinceFirst = 0
      expect(record!.returnDays).toHaveLength(0);
      expect(record!.totalSessions).toBe(2);
    });

    it("accumulates playtime", async () => {
      const tracker = await getTracker();

      tracker.recordVisit(100, 300);

      mockTime = 1000 + 86400;
      const record = tracker.recordVisit(100, 600);

      expect(record!.totalPlaytimeSec).toBe(900);
    });
  });

  describe("retention queries", () => {
    it("checks retention flags", async () => {
      const tracker = await getTracker();

      const record: RetentionRecord = {
        firstSeen: 1000,
        returnDays: [1, 7],
        totalSessions: 3,
        totalPlaytimeSec: 1000,
      };

      const flags = tracker.getRetentionFlags(record);
      expect(flags[1]).toBe(true);
      expect(flags[7]).toBe(true);
      expect(flags[14]).toBe(false);
      expect(flags[30]).toBe(false);
    });

    it("computes days since first seen", async () => {
      const tracker = await getTracker();

      mockTime = 1000 + 86400 * 5;
      const record: RetentionRecord = {
        firstSeen: 1000,
        returnDays: [],
        totalSessions: 1,
        totalPlaytimeSec: 0,
      };

      expect(tracker.daysSinceFirstSeen(record)).toBe(5);
    });
  });

  describe("getRecord", () => {
    it("retrieves a stored retention record", async () => {
      const tracker = await getTracker();

      // Store data directly
      mockDataStore.data.set("ret_100", {
        firstSeen: 500,
        returnDays: [1, 3],
        totalSessions: 4,
        totalPlaytimeSec: 2000,
      });

      const record = tracker.getRecord(100);
      expect(record).toBeDefined();
      expect(record!.firstSeen).toBe(500);
      expect(record!.totalSessions).toBe(4);
    });

    it("returns undefined for unknown player", async () => {
      const tracker = await getTracker();
      expect(tracker.getRecord(999)).toBeUndefined();
    });
  });
});
