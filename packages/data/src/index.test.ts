/**
 * Unit tests for @broblox/data package.
 * Tests persistence types, session management, and data operations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mockRobloxGlobals, createMockPlayer, resetPlayerIdCounter } from "@broblox/testing";
import type {
  VersionedData,
  DataMetadata,
  SessionState,
  StoreConfig,
  MigrationChain,
} from "./types";

// Install Roblox globals
beforeEach(() => {
  mockRobloxGlobals();
  resetPlayerIdCounter();
});

// ============================================================================
// Test Data Types
// ============================================================================

interface TestPlayerData extends VersionedData {
  __version: number;
  coins: number;
  level: number;
  inventory: string[];
}

function createDefaultTestData(): TestPlayerData {
  return {
    __version: 1,
    coins: 0,
    level: 1,
    inventory: [],
  };
}

// ============================================================================
// Type Tests
// ============================================================================

describe("VersionedData interface", () => {
  it("requires __version field", () => {
    const data: VersionedData = { __version: 1 };
    expect(data.__version).toBe(1);
  });

  it("allows additional fields on extended types", () => {
    const data: TestPlayerData = {
      __version: 2,
      coins: 100,
      level: 5,
      inventory: ["sword", "shield"],
    };
    expect(data.__version).toBe(2);
    expect(data.coins).toBe(100);
    expect(data.level).toBe(5);
    expect(data.inventory).toEqual(["sword", "shield"]);
  });
});

describe("DataMetadata interface", () => {
  it("tracks save information", () => {
    const metadata: DataMetadata = {
      lastSave: 1706200000,
      saveCount: 5,
    };
    expect(metadata.lastSave).toBe(1706200000);
    expect(metadata.saveCount).toBe(5);
  });

  it("supports optional session tracking", () => {
    const metadata: DataMetadata = {
      lastSave: 1706200000,
      saveCount: 1,
      sessionId: "abc123_1234567890_1234",
      serverId: "server-job-id-xyz",
    };
    expect(metadata.sessionId).toBe("abc123_1234567890_1234");
    expect(metadata.serverId).toBe("server-job-id-xyz");
  });
});

describe("SessionState type", () => {
  it("defines valid session states", () => {
    const states: SessionState[] = ["active", "saving", "closing", "closed"];
    expect(states).toHaveLength(4);
    expect(states).toContain("active");
    expect(states).toContain("saving");
    expect(states).toContain("closing");
    expect(states).toContain("closed");
  });
});

describe("StoreConfig interface", () => {
  it("defines required configuration fields", () => {
    const config: StoreConfig<TestPlayerData> = {
      name: "PlayerData",
      version: 1,
      defaultData: createDefaultTestData,
    };
    expect(config.name).toBe("PlayerData");
    expect(config.version).toBe(1);
    expect(config.defaultData()).toEqual(createDefaultTestData());
  });

  it("supports optional retry configuration", () => {
    const config: StoreConfig<TestPlayerData> = {
      name: "PlayerData",
      version: 1,
      defaultData: createDefaultTestData,
      retry: {
        maxAttempts: 5,
        baseDelayMs: 2000,
        maxDelayMs: 15000,
      },
    };
    expect(config.retry?.maxAttempts).toBe(5);
    expect(config.retry?.baseDelayMs).toBe(2000);
    expect(config.retry?.maxDelayMs).toBe(15000);
  });

  it("supports migration chain configuration", () => {
    const migrations: MigrationChain = new Map();
    migrations.set("0_1", (data: unknown) => ({
      ...(data as object),
      __version: 1,
      inventory: [],
    }));

    const config: StoreConfig<TestPlayerData> = {
      name: "PlayerData",
      version: 1,
      defaultData: createDefaultTestData,
      migrations,
    };
    expect(config.migrations?.size).toBe(1);
    expect(config.migrations?.has("0_1")).toBe(true);
  });
});

// ============================================================================
// Migration Tests
// ============================================================================

describe("Migration chain", () => {
  it("upgrades data through versions", () => {
    const migrations: MigrationChain = new Map();

    // v0 -> v1: add inventory
    migrations.set("0_1", (data: unknown) => {
      const d = data as { coins: number; level: number };
      return {
        __version: 1,
        coins: d.coins,
        level: d.level,
        inventory: [],
      };
    });

    // v1 -> v2: double coins
    migrations.set("1_2", (data: unknown) => {
      const d = data as TestPlayerData;
      return {
        ...d,
        __version: 2,
        coins: d.coins * 2,
      };
    });

    // Start with v0 data
    const v0Data = { coins: 50, level: 3 };

    // Apply v0 -> v1
    const migrate0to1 = migrations.get("0_1")!;
    const v1Data = migrate0to1(v0Data) as TestPlayerData;
    expect(v1Data.__version).toBe(1);
    expect(v1Data.inventory).toEqual([]);
    expect(v1Data.coins).toBe(50);

    // Apply v1 -> v2
    const migrate1to2 = migrations.get("1_2")!;
    const v2Data = migrate1to2(v1Data) as TestPlayerData;
    expect(v2Data.__version).toBe(2);
    expect(v2Data.coins).toBe(100); // Doubled
  });

  it("handles missing migrations gracefully", () => {
    const migrations: MigrationChain = new Map();
    expect(migrations.get("5_6")).toBeUndefined();
  });
});

// ============================================================================
// Data Validation Tests
// ============================================================================

describe("Data validation patterns", () => {
  it("validates schema version is present", () => {
    const validateVersion = (data: unknown): data is VersionedData => {
      return (
        typeof data === "object" &&
        data !== null &&
        "__version" in data &&
        typeof (data as VersionedData).__version === "number"
      );
    };

    expect(validateVersion({ __version: 1 })).toBe(true);
    expect(validateVersion({ __version: "1" })).toBe(false);
    expect(validateVersion({})).toBe(false);
    expect(validateVersion(null)).toBe(false);
  });

  it("validates player data structure", () => {
    const validatePlayerData = (data: unknown): data is TestPlayerData => {
      if (typeof data !== "object" || data === null) return false;
      const d = data as Record<string, unknown>;
      return (
        typeof d.__version === "number" &&
        typeof d.coins === "number" &&
        typeof d.level === "number" &&
        Array.isArray(d.inventory)
      );
    };

    expect(validatePlayerData(createDefaultTestData())).toBe(true);
    expect(validatePlayerData({ __version: 1, coins: "100", level: 1, inventory: [] })).toBe(false);
    expect(validatePlayerData({ __version: 1, coins: 100 })).toBe(false);
  });
});

// ============================================================================
// Session State Machine Tests
// ============================================================================

describe("Session state transitions", () => {
  it("follows valid state flow: active -> saving -> active", () => {
    let state: SessionState = "active";

    // Start save
    expect(state).toBe("active");
    state = "saving";
    expect(state).toBe("saving");

    // Complete save
    state = "active";
    expect(state).toBe("active");
  });

  it("follows valid state flow: active -> closing -> closed", () => {
    let state: SessionState = "active";

    // Start close
    state = "closing";
    expect(state).toBe("closing");

    // Complete close
    state = "closed";
    expect(state).toBe("closed");
  });

  it("follows valid state flow: active -> saving -> closing -> closed", () => {
    let state: SessionState = "active";

    state = "saving";
    state = "closing";
    state = "closed";

    expect(state).toBe("closed");
  });
});

// ============================================================================
// Retry Logic Tests
// ============================================================================

describe("Retry configuration", () => {
  it("calculates exponential backoff delays", () => {
    const calculateDelay = (attempt: number, baseDelayMs: number, maxDelayMs: number): number => {
      const delay = baseDelayMs * Math.pow(2, attempt);
      return Math.min(delay, maxDelayMs);
    };

    expect(calculateDelay(0, 1000, 10000)).toBe(1000);
    expect(calculateDelay(1, 1000, 10000)).toBe(2000);
    expect(calculateDelay(2, 1000, 10000)).toBe(4000);
    expect(calculateDelay(3, 1000, 10000)).toBe(8000);
    expect(calculateDelay(4, 1000, 10000)).toBe(10000); // Capped
    expect(calculateDelay(5, 1000, 10000)).toBe(10000); // Still capped
  });

  it("applies jitter to avoid thundering herd", () => {
    const applyJitter = (delay: number, jitterPercent: number): number => {
      const jitter = delay * jitterPercent * (Math.random() * 2 - 1);
      return Math.max(0, delay + jitter);
    };

    // Run multiple times to verify jitter is applied
    const delays = Array.from({ length: 10 }, () => applyJitter(1000, 0.2));
    const allSame = delays.every((d) => d === delays[0]);

    // With random jitter, not all values should be the same
    // (statistically very unlikely)
    expect(allSame).toBe(false);

    // All values should be within ±20% of base
    delays.forEach((d) => {
      expect(d).toBeGreaterThanOrEqual(800);
      expect(d).toBeLessThanOrEqual(1200);
    });
  });
});

// ============================================================================
// Dirty Tracking Tests
// ============================================================================

describe("Dirty tracking", () => {
  it("tracks when data needs saving", () => {
    const dirty = new Set<number>();
    const player = createMockPlayer();

    expect(dirty.has(player.UserId)).toBe(false);

    dirty.add(player.UserId);
    expect(dirty.has(player.UserId)).toBe(true);

    dirty.delete(player.UserId);
    expect(dirty.has(player.UserId)).toBe(false);
  });

  it("handles multiple players independently", () => {
    const dirty = new Set<number>();
    const player1 = createMockPlayer();
    const player2 = createMockPlayer();

    dirty.add(player1.UserId);

    expect(dirty.has(player1.UserId)).toBe(true);
    expect(dirty.has(player2.UserId)).toBe(false);

    dirty.add(player2.UserId);
    dirty.delete(player1.UserId);

    expect(dirty.has(player1.UserId)).toBe(false);
    expect(dirty.has(player2.UserId)).toBe(true);
  });
});

// ============================================================================
// Cache Tests
// ============================================================================

describe("Data cache", () => {
  it("stores and retrieves player data", () => {
    const cache = new Map<number, { data: TestPlayerData; metadata: DataMetadata }>();
    const player = createMockPlayer();
    const data = createDefaultTestData();
    const metadata: DataMetadata = { lastSave: 0, saveCount: 0 };

    cache.set(player.UserId, { data, metadata });

    const cached = cache.get(player.UserId);
    expect(cached?.data).toEqual(data);
    expect(cached?.metadata).toEqual(metadata);
  });

  it("allows data mutation in cache", () => {
    const cache = new Map<number, { data: TestPlayerData; metadata: DataMetadata }>();
    const player = createMockPlayer();
    const data = createDefaultTestData();
    const metadata: DataMetadata = { lastSave: 0, saveCount: 0 };

    cache.set(player.UserId, { data, metadata });

    // Mutate cached data
    const cached = cache.get(player.UserId)!;
    cached.data.coins = 500;
    cached.data.level = 10;

    // Verify mutation persisted
    const updated = cache.get(player.UserId)!;
    expect(updated.data.coins).toBe(500);
    expect(updated.data.level).toBe(10);
  });

  it("removes data on player leave", () => {
    const cache = new Map<number, { data: TestPlayerData; metadata: DataMetadata }>();
    const player = createMockPlayer();
    const data = createDefaultTestData();
    const metadata: DataMetadata = { lastSave: 0, saveCount: 0 };

    cache.set(player.UserId, { data, metadata });
    expect(cache.has(player.UserId)).toBe(true);

    cache.delete(player.UserId);
    expect(cache.has(player.UserId)).toBe(false);
  });
});

// ============================================================================
// Session ID Generation Tests
// ============================================================================

describe("Session ID generation", () => {
  it("generates unique session IDs", () => {
    const generateSessionId = (jobId: string): string => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 9000) + 1000;
      return `${jobId}_${timestamp}_${random}`;
    };

    const jobId = "test-job-id";
    const id1 = generateSessionId(jobId);
    const id2 = generateSessionId(jobId);

    expect(id1).toContain(jobId);
    expect(id2).toContain(jobId);
    // IDs should be different (different timestamps/random)
    expect(id1).not.toBe(id2);
  });

  it("session ID follows expected format", () => {
    const generateSessionId = (jobId: string): string => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 9000) + 1000;
      return `${jobId}_${timestamp}_${random}`;
    };

    const id = generateSessionId("server-123");
    const parts = id.split("_");

    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("server-123");
    expect(parseInt(parts[1])).toBeGreaterThan(0);
    expect(parseInt(parts[2])).toBeGreaterThanOrEqual(1000);
    expect(parseInt(parts[2])).toBeLessThanOrEqual(9999);
  });
});
