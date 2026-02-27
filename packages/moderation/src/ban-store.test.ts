/**
 * BanStore Tests
 *
 * Comprehensive tests for ban creation, expiry, revocation,
 * cache invalidation, and Edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { BanRecord, CreateBanInput } from "./types";

// LuaTuple is a roblox-ts compiler global not available under vitest's tsconfig
declare type LuaTuple<T extends unknown[]> = T & { readonly LUA_TUPLE: never };

// ---------------------------------------------------------------------------
// Roblox globals stub
// ---------------------------------------------------------------------------

type StoreCallback = (old: unknown) => unknown;

function createMockDataStore() {
  const data = new Map<string, unknown>();
  return {
    GetAsync: vi.fn(
      (key: string) => [data.get(key), undefined] as unknown as LuaTuple<[unknown, unknown]>
    ),
    SetAsync: vi.fn((key: string, value: unknown) => {
      data.set(key, value);
    }),
    UpdateAsync: vi.fn((key: string, callback: StoreCallback) => {
      const old = data.get(key);
      const result = callback(old);
      data.set(key, result);
      return result;
    }),
    _data: data,
  };
}

let guidCounter = 0;

// Polyfill roblox-ts array .size() for Node/vitest
const proto = Array.prototype as unknown as Record<string, unknown>;
if (!proto.size) {
  proto.size = function (this: unknown[]) {
    return this.length;
  };
}

function setupGlobals() {
  guidCounter = 0;
  const store = createMockDataStore();

  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => 1000) };
  g.math = { floor: Math.floor };
  g.game = {
    GetService: (name: string) => {
      if (name === "DataStoreService") {
        return { GetDataStore: () => store };
      }
      if (name === "HttpService") {
        return { GenerateGUID: () => `guid-${++guidCounter}` };
      }
      throw new Error(`Unexpected service: ${name}`);
    },
  };

  return { store };
}

function teardownGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.print;
  delete g.os;
  delete g.math;
  delete g.game;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BanStore", () => {
  let store: ReturnType<typeof createMockDataStore>;

  beforeEach(() => {
    vi.resetModules();
    const mocks = setupGlobals();
    store = mocks.store;
  });

  afterEach(() => {
    teardownGlobals();
    vi.restoreAllMocks();
  });

  async function getBanStore() {
    const mod = await import("./ban-store");
    return new mod.BanStore("TestMod");
  }

  // ====================================================================
  // createBan
  // ====================================================================

  describe("createBan", () => {
    it("creates a permanent ban", async () => {
      const banStore = await getBanStore();
      const input: CreateBanInput = {
        playerId: 100,
        playerName: "TestPlayer",
        type: "PERMANENT",
        reason: "Exploiting",
        moderatorId: "mod_1",
      };

      const ban = banStore.createBan(input);

      expect(ban.id).toBe("guid-1");
      expect(ban.playerId).toBe(100);
      expect(ban.playerName).toBe("TestPlayer");
      expect(ban.type).toBe("PERMANENT");
      expect(ban.status).toBe("ACTIVE");
      expect(ban.reason).toBe("Exploiting");
      expect(ban.moderatorId).toBe("mod_1");
      expect(ban.createdAt).toBe(1000);
      expect(ban.expiresAt).toBeUndefined();
      expect(ban.durationHours).toBeUndefined();
    });

    it("creates a temporary ban with correct expiresAt", async () => {
      const banStore = await getBanStore();
      const input: CreateBanInput = {
        playerId: 200,
        type: "TEMPORARY",
        durationHours: 24,
        reason: "Spam",
        moderatorId: "mod_2",
      };

      const ban = banStore.createBan(input);

      expect(ban.type).toBe("TEMPORARY");
      expect(ban.durationHours).toBe(24);
      expect(ban.expiresAt).toBe(1000 + 24 * 3600);
    });

    it("persists ban to DataStore", async () => {
      const banStore = await getBanStore();
      banStore.createBan({
        playerId: 300,
        type: "PERMANENT",
        reason: "Test",
        moderatorId: "mod_3",
      });

      expect(store.UpdateAsync).toHaveBeenCalledWith("bans_300", expect.any(Function));
      const storedData = store._data.get("bans_300") as BanRecord[];
      expect(storedData).toHaveLength(1);
      expect(storedData[0].reason).toBe("Test");
    });

    it("appends to existing bans", async () => {
      const banStore = await getBanStore();

      banStore.createBan({
        playerId: 400,
        type: "TEMPORARY",
        durationHours: 1,
        reason: "First",
        moderatorId: "mod",
      });
      banStore.createBan({
        playerId: 400,
        type: "PERMANENT",
        reason: "Second",
        moderatorId: "mod",
      });

      const stored = store._data.get("bans_400") as BanRecord[];
      expect(stored).toHaveLength(2);
      expect(stored[0].reason).toBe("First");
      expect(stored[1].reason).toBe("Second");
    });

    it("includes internalNote when provided", async () => {
      const banStore = await getBanStore();
      const ban = banStore.createBan({
        playerId: 500,
        type: "PERMANENT",
        reason: "Exploiting",
        internalNote: "Evidence: video clip #1234",
        moderatorId: "mod",
      });

      expect(ban.internalNote).toBe("Evidence: video clip #1234");
    });
  });

  // ====================================================================
  // checkBan
  // ====================================================================

  describe("checkBan", () => {
    it("returns not-banned when no bans exist", async () => {
      const banStore = await getBanStore();
      const result = banStore.checkBan(999);

      expect(result.isBanned).toBe(false);
      expect(result.ban).toBeUndefined();
    });

    it("returns banned for active permanent ban", async () => {
      const banStore = await getBanStore();
      banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Testing",
        moderatorId: "mod",
      });

      // Invalidate cache so it reads from store
      banStore.invalidateCache(100);
      const result = banStore.checkBan(100);

      expect(result.isBanned).toBe(true);
      expect(result.ban?.type).toBe("PERMANENT");
      expect(result.message).toContain("permanent");
      expect(result.message).toContain("Testing");
    });

    it("returns banned for active temporary ban that hasn't expired", async () => {
      const banStore = await getBanStore();
      banStore.createBan({
        playerId: 100,
        type: "TEMPORARY",
        durationHours: 24,
        reason: "Spam",
        moderatorId: "mod",
      });

      banStore.invalidateCache(100);
      const result = banStore.checkBan(100);

      expect(result.isBanned).toBe(true);
      expect(result.ban?.type).toBe("TEMPORARY");
      expect(result.message).toContain("Spam");
      expect(result.message).toContain("expires in");
    });

    it("returns not-banned for expired temporary ban", async () => {
      const banStore = await getBanStore();

      // Create ban at time=1000 with 1-hour duration
      banStore.createBan({
        playerId: 100,
        type: "TEMPORARY",
        durationHours: 1,
        reason: "Spam",
        moderatorId: "mod",
      });

      // Advance time past expiry
      const g = globalThis as unknown as Record<string, unknown>;
      g.os = { time: vi.fn(() => 1000 + 3601) };

      banStore.invalidateCache(100);
      const result = banStore.checkBan(100);

      expect(result.isBanned).toBe(false);
    });

    it("returns not-banned for revoked ban", async () => {
      const banStore = await getBanStore();
      const ban = banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Mistake",
        moderatorId: "mod",
      });

      banStore.revokeBan(100, ban.id, "admin", "Appeal approved");
      banStore.invalidateCache(100);
      const result = banStore.checkBan(100);

      expect(result.isBanned).toBe(false);
    });

    it("shows time remaining in hours and minutes for temp ban", async () => {
      const banStore = await getBanStore();
      // Ban expires at 1000 + 2*3600 = 8200
      banStore.createBan({
        playerId: 100,
        type: "TEMPORARY",
        durationHours: 2,
        reason: "AFK farming",
        moderatorId: "mod",
      });

      // Set time so 1h 30m remain
      const g = globalThis as unknown as Record<string, unknown>;
      g.os = { time: vi.fn(() => 1000 + 30 * 60) }; // 30 minutes into the ban

      banStore.invalidateCache(100);
      const result = banStore.checkBan(100);

      expect(result.isBanned).toBe(true);
      expect(result.message).toContain("1h 30m");
    });

    it("shows time in minutes only when < 1 hour remains", async () => {
      const banStore = await getBanStore();
      banStore.createBan({
        playerId: 100,
        type: "TEMPORARY",
        durationHours: 1,
        reason: "Minor",
        moderatorId: "mod",
      });

      // Set time so 45 minutes remain
      const g = globalThis as unknown as Record<string, unknown>;
      g.os = { time: vi.fn(() => 1000 + 15 * 60) };

      banStore.invalidateCache(100);
      const result = banStore.checkBan(100);

      expect(result.isBanned).toBe(true);
      expect(result.message).toContain("45 minutes");
      expect(result.message).not.toContain("h ");
    });

    it("includes appeal notice in ban message", async () => {
      const banStore = await getBanStore();
      banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Test",
        moderatorId: "mod",
      });

      banStore.invalidateCache(100);
      const result = banStore.checkBan(100);

      expect(result.message).toContain("appeal");
    });

    it("finds first active ban among multiple records", async () => {
      const banStore = await getBanStore();

      // First ban — revoke it
      const ban1 = banStore.createBan({
        playerId: 100,
        type: "TEMPORARY",
        durationHours: 1,
        reason: "First",
        moderatorId: "mod",
      });
      banStore.revokeBan(100, ban1.id, "admin", "Mistake");

      // Second ban — active
      banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Second offense",
        moderatorId: "mod",
      });

      banStore.invalidateCache(100);
      const result = banStore.checkBan(100);

      expect(result.isBanned).toBe(true);
      expect(result.ban?.reason).toBe("Second offense");
    });
  });

  // ====================================================================
  // revokeBan
  // ====================================================================

  describe("revokeBan", () => {
    it("revokes an active ban and returns true", async () => {
      const banStore = await getBanStore();
      const ban = banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Test",
        moderatorId: "mod",
      });

      const result = banStore.revokeBan(100, ban.id, "admin_1", "Appeal approved");

      expect(result).toBe(true);

      // Verify the record was updated
      const stored = store._data.get("bans_100") as BanRecord[];
      expect(stored[0].status).toBe("REVOKED");
      expect(stored[0].revokedById).toBe("admin_1");
      expect(stored[0].revokeReason).toBe("Appeal approved");
      expect(stored[0].revokedAt).toBe(1000);
    });

    it("returns false for non-existent ban ID", async () => {
      const banStore = await getBanStore();
      banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Test",
        moderatorId: "mod",
      });

      const result = banStore.revokeBan(100, "nonexistent-id", "admin", "Reason");

      expect(result).toBe(false);
    });

    it("returns false when revoking an already-revoked ban", async () => {
      const banStore = await getBanStore();
      const ban = banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Test",
        moderatorId: "mod",
      });

      banStore.revokeBan(100, ban.id, "admin", "First revoke");
      const secondRevoke = banStore.revokeBan(100, ban.id, "admin", "Second attempt");

      expect(secondRevoke).toBe(false);
    });
  });

  // ====================================================================
  // getBans
  // ====================================================================

  describe("getBans", () => {
    it("returns empty array for player with no bans", async () => {
      const banStore = await getBanStore();
      const bans = banStore.getBans(999);
      expect(bans).toEqual([]);
    });

    it("returns all bans including revoked ones", async () => {
      const banStore = await getBanStore();

      const ban1 = banStore.createBan({
        playerId: 100,
        type: "TEMPORARY",
        durationHours: 1,
        reason: "First",
        moderatorId: "mod",
      });
      banStore.revokeBan(100, ban1.id, "admin", "Revoked");

      banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Second",
        moderatorId: "mod",
      });

      banStore.invalidateCache(100);
      const bans = banStore.getBans(100);

      expect(bans).toHaveLength(2);
    });
  });

  // ====================================================================
  // syncBan
  // ====================================================================

  describe("syncBan", () => {
    it("adds new ban from external source", async () => {
      const banStore = await getBanStore();
      const externalBan: BanRecord = {
        id: "ext-ban-1",
        playerId: 100,
        type: "PERMANENT",
        status: "ACTIVE",
        reason: "Dashboard ban",
        moderatorId: "dashboard_mod",
        createdAt: 900,
      };

      banStore.syncBan(externalBan);

      banStore.invalidateCache(100);
      const bans = banStore.getBans(100);
      expect(bans).toHaveLength(1);
      expect(bans[0].id).toBe("ext-ban-1");
      expect(bans[0].reason).toBe("Dashboard ban");
    });

    it("updates existing ban with same ID", async () => {
      const banStore = await getBanStore();
      const ban = banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Original",
        moderatorId: "mod",
      });

      const updatedBan: BanRecord = {
        ...ban,
        status: "REVOKED",
        revokedAt: 1500,
        revokedById: "admin",
        revokeReason: "Overturned",
      };

      banStore.syncBan(updatedBan);

      banStore.invalidateCache(100);
      const bans = banStore.getBans(100);
      expect(bans).toHaveLength(1);
      expect(bans[0].status).toBe("REVOKED");
      expect(bans[0].revokeReason).toBe("Overturned");
    });

    it("skips duplicate ban sync with same ID", async () => {
      const banStore = await getBanStore();
      const externalBan: BanRecord = {
        id: "dup-ban-1",
        playerId: 100,
        type: "PERMANENT",
        status: "ACTIVE",
        reason: "Exploiting",
        moderatorId: "mod",
        createdAt: 900,
      };

      banStore.syncBan(externalBan);
      const updateCallsBefore = store.UpdateAsync.mock.calls.length;

      // Second call with same ID should be skipped
      banStore.syncBan(externalBan);
      expect(store.UpdateAsync.mock.calls.length).toBe(updateCallsBefore);
    });
  });

  // ====================================================================
  // Cache
  // ====================================================================

  describe("cache", () => {
    it("uses cache within TTL", async () => {
      const banStore = await getBanStore();
      banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Test",
        moderatorId: "mod",
      });

      // Cache is populated after createBan invalidates + next getBans reads
      banStore.invalidateCache(100);
      banStore.getBans(100);
      const getAsyncCalls = store.GetAsync.mock.calls.length;

      // Second call should use cache
      banStore.getBans(100);
      expect(store.GetAsync.mock.calls.length).toBe(getAsyncCalls);
    });

    it("refetches after cache TTL expires", async () => {
      const banStore = await getBanStore();
      banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Test",
        moderatorId: "mod",
      });

      banStore.invalidateCache(100);
      banStore.getBans(100);
      const getAsyncCalls = store.GetAsync.mock.calls.length;

      // Advance time past cache TTL (60 seconds)
      const g = globalThis as unknown as Record<string, unknown>;
      g.os = { time: vi.fn(() => 1061) };

      banStore.getBans(100);
      expect(store.GetAsync.mock.calls.length).toBe(getAsyncCalls + 1);
    });

    it("invalidateCache forces refetch", async () => {
      const banStore = await getBanStore();
      banStore.createBan({
        playerId: 100,
        type: "PERMANENT",
        reason: "Test",
        moderatorId: "mod",
      });

      banStore.invalidateCache(100);
      banStore.getBans(100);
      const getAsyncCalls = store.GetAsync.mock.calls.length;

      banStore.invalidateCache(100);
      banStore.getBans(100);
      expect(store.GetAsync.mock.calls.length).toBe(getAsyncCalls + 1);
    });
  });
});
