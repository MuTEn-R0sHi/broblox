/**
 * MuteStore Tests
 *
 * Comprehensive tests for mute creation, expiry, removal,
 * cache invalidation, and edge cases.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { MuteRecord, CreateMuteInput } from "./types";

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
  g.game = {
    GetService: (name: string) => {
      if (name === "DataStoreService") {
        return { GetDataStore: () => store };
      }
      if (name === "HttpService") {
        return { GenerateGUID: () => `mute-guid-${++guidCounter}` };
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
  delete g.game;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MuteStore", () => {
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

  async function getMuteStore() {
    const mod = await import("./mute-store");
    return new mod.MuteStore("TestMod");
  }

  // ====================================================================
  // createMute
  // ====================================================================

  describe("createMute", () => {
    it("creates a chat mute with correct fields", async () => {
      const muteStore = await getMuteStore();
      const input: CreateMuteInput = {
        playerId: 100,
        type: "chat",
        reason: "Spam",
        durationMinutes: 30,
        moderatorId: "mod_1",
      };

      const mute = muteStore.createMute(input);

      expect(mute.id).toBe("mute-guid-1");
      expect(mute.playerId).toBe(100);
      expect(mute.type).toBe("chat");
      expect(mute.isActive).toBe(true);
      expect(mute.reason).toBe("Spam");
      expect(mute.durationMinutes).toBe(30);
      expect(mute.expiresAt).toBe(1000 + 30 * 60);
      expect(mute.moderatorId).toBe("mod_1");
      expect(mute.createdAt).toBe(1000);
    });

    it("creates a voice mute", async () => {
      const muteStore = await getMuteStore();
      const mute = muteStore.createMute({
        playerId: 200,
        type: "voice",
        reason: "Abusive voice chat",
        durationMinutes: 60,
        moderatorId: "mod_2",
      });

      expect(mute.type).toBe("voice");
      expect(mute.expiresAt).toBe(1000 + 60 * 60);
    });

    it("creates an 'all' mute (chat + voice)", async () => {
      const muteStore = await getMuteStore();
      const mute = muteStore.createMute({
        playerId: 300,
        type: "all",
        reason: "Severe disruption",
        durationMinutes: 120,
        moderatorId: "mod_3",
      });

      expect(mute.type).toBe("all");
    });

    it("persists mute to DataStore", async () => {
      const muteStore = await getMuteStore();
      muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Test",
        durationMinutes: 10,
        moderatorId: "mod",
      });

      expect(store.UpdateAsync).toHaveBeenCalledWith("mutes_100", expect.any(Function));
      const storedData = store._data.get("mutes_100") as MuteRecord[];
      expect(storedData).toHaveLength(1);
    });

    it("appends to existing mutes", async () => {
      const muteStore = await getMuteStore();

      muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "First",
        durationMinutes: 10,
        moderatorId: "mod",
      });
      muteStore.createMute({
        playerId: 100,
        type: "voice",
        reason: "Second",
        durationMinutes: 20,
        moderatorId: "mod",
      });

      const stored = store._data.get("mutes_100") as MuteRecord[];
      expect(stored).toHaveLength(2);
      expect(stored[0].type).toBe("chat");
      expect(stored[1].type).toBe("voice");
    });
  });

  // ====================================================================
  // checkMute
  // ====================================================================

  describe("checkMute", () => {
    it("returns not-muted when no mutes exist", async () => {
      const muteStore = await getMuteStore();
      const result = muteStore.checkMute(999);

      expect(result.isMuted).toBe(false);
      expect(result.mute).toBeUndefined();
      expect(result.expiresIn).toBeUndefined();
    });

    it("returns muted for active mute", async () => {
      const muteStore = await getMuteStore();
      muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Spam",
        durationMinutes: 30,
        moderatorId: "mod",
      });

      muteStore.invalidateCache(100);
      const result = muteStore.checkMute(100);

      expect(result.isMuted).toBe(true);
      expect(result.mute?.type).toBe("chat");
      expect(result.expiresIn).toBe(30 * 60); // 1800 seconds
    });

    it("returns not-muted for expired mute", async () => {
      const muteStore = await getMuteStore();
      muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Spam",
        durationMinutes: 10,
        moderatorId: "mod",
      });

      // Advance time past expiry
      const g = globalThis as unknown as Record<string, unknown>;
      g.os = { time: vi.fn(() => 1000 + 10 * 60 + 1) };

      muteStore.invalidateCache(100);
      const result = muteStore.checkMute(100);

      expect(result.isMuted).toBe(false);
    });

    it("returns not-muted for removed (inactive) mute", async () => {
      const muteStore = await getMuteStore();
      const mute = muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Spam",
        durationMinutes: 30,
        moderatorId: "mod",
      });

      muteStore.removeMute(100, mute.id, 999);
      muteStore.invalidateCache(100);
      const result = muteStore.checkMute(100);

      expect(result.isMuted).toBe(false);
    });

    it("finds first active mute when some are inactive", async () => {
      const muteStore = await getMuteStore();

      // First mute — remove it
      const mute1 = muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "First",
        durationMinutes: 10,
        moderatorId: "mod",
      });
      muteStore.removeMute(100, mute1.id, 999);

      // Second mute — active
      muteStore.createMute({
        playerId: 100,
        type: "voice",
        reason: "Second",
        durationMinutes: 60,
        moderatorId: "mod",
      });

      muteStore.invalidateCache(100);
      const result = muteStore.checkMute(100);

      expect(result.isMuted).toBe(true);
      expect(result.mute?.reason).toBe("Second");
      expect(result.mute?.type).toBe("voice");
    });

    it("calculates correct expiresIn", async () => {
      const muteStore = await getMuteStore();
      // Mute expiring at 1000 + 60*60 = 4600
      muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Spam",
        durationMinutes: 60,
        moderatorId: "mod",
      });

      // Advance time 15 minutes
      const g = globalThis as unknown as Record<string, unknown>;
      g.os = { time: vi.fn(() => 1000 + 15 * 60) };

      muteStore.invalidateCache(100);
      const result = muteStore.checkMute(100);

      expect(result.isMuted).toBe(true);
      expect(result.expiresIn).toBe(45 * 60); // 2700 seconds remaining
    });
  });

  // ====================================================================
  // removeMute
  // ====================================================================

  describe("removeMute", () => {
    it("deactivates an active mute and returns true", async () => {
      const muteStore = await getMuteStore();
      const mute = muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Spam",
        durationMinutes: 30,
        moderatorId: "mod",
      });

      const result = muteStore.removeMute(100, mute.id, 999);

      expect(result).toBe(true);
      const stored = store._data.get("mutes_100") as MuteRecord[];
      expect(stored[0].isActive).toBe(false);
    });

    it("returns false for non-existent mute ID", async () => {
      const muteStore = await getMuteStore();
      muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Spam",
        durationMinutes: 30,
        moderatorId: "mod",
      });

      const result = muteStore.removeMute(100, "nonexistent", 999);

      expect(result).toBe(false);
    });

    it("returns false when removing already-inactive mute", async () => {
      const muteStore = await getMuteStore();
      const mute = muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Spam",
        durationMinutes: 30,
        moderatorId: "mod",
      });

      muteStore.removeMute(100, mute.id, 999);
      const secondRemove = muteStore.removeMute(100, mute.id, 999);

      expect(secondRemove).toBe(false);
    });
  });

  // ====================================================================
  // getMutes
  // ====================================================================

  describe("getMutes", () => {
    it("returns empty array for player with no mutes", async () => {
      const muteStore = await getMuteStore();
      const mutes = muteStore.getMutes(999);
      expect(mutes).toEqual([]);
    });

    it("returns all mutes including inactive ones", async () => {
      const muteStore = await getMuteStore();

      const mute1 = muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "First",
        durationMinutes: 10,
        moderatorId: "mod",
      });
      muteStore.removeMute(100, mute1.id, 999);

      muteStore.createMute({
        playerId: 100,
        type: "voice",
        reason: "Second",
        durationMinutes: 30,
        moderatorId: "mod",
      });

      muteStore.invalidateCache(100);
      const mutes = muteStore.getMutes(100);

      expect(mutes).toHaveLength(2);
    });
  });

  // ====================================================================
  // Cache
  // ====================================================================

  describe("cache", () => {
    it("uses cache within TTL", async () => {
      const muteStore = await getMuteStore();
      muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Test",
        durationMinutes: 10,
        moderatorId: "mod",
      });

      muteStore.invalidateCache(100);
      muteStore.getMutes(100);
      const calls = store.GetAsync.mock.calls.length;

      muteStore.getMutes(100);
      expect(store.GetAsync.mock.calls.length).toBe(calls);
    });

    it("refetches after cache TTL expires", async () => {
      const muteStore = await getMuteStore();
      muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Test",
        durationMinutes: 10,
        moderatorId: "mod",
      });

      muteStore.invalidateCache(100);
      muteStore.getMutes(100);
      const calls = store.GetAsync.mock.calls.length;

      const g = globalThis as unknown as Record<string, unknown>;
      g.os = { time: vi.fn(() => 1061) };

      muteStore.getMutes(100);
      expect(store.GetAsync.mock.calls.length).toBe(calls + 1);
    });

    it("invalidateCache forces refetch", async () => {
      const muteStore = await getMuteStore();
      muteStore.createMute({
        playerId: 100,
        type: "chat",
        reason: "Test",
        durationMinutes: 10,
        moderatorId: "mod",
      });

      muteStore.invalidateCache(100);
      muteStore.getMutes(100);
      const calls = store.GetAsync.mock.calls.length;

      muteStore.invalidateCache(100);
      muteStore.getMutes(100);
      expect(store.GetAsync.mock.calls.length).toBe(calls + 1);
    });
  });
});
