/**
 * Tests for ModerationService — ban, mute, revoke, unmute, and singleton.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Globals helpers
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

describe("ModerationService", () => {
  let mockBanStore: Record<string, ReturnType<typeof vi.fn>>;
  let mockMuteStore: Record<string, ReturnType<typeof vi.fn>>;
  let messaging: Record<string, ReturnType<typeof vi.fn>>;
  let http: Record<string, ReturnType<typeof vi.fn>>;
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockBanStore = {
      checkBan: vi.fn(() => ({ banned: false })),
      getBans: vi.fn(() => []),
      createBan: vi.fn((input: Record<string, unknown>) => ({
        id: "ban_1",
        playerId: input.playerId,
        type: "PERMANENT",
        status: "ACTIVE",
        reason: input.reason ?? "test",
        moderatorId: input.moderatorId ?? "mod",
        createdAt: 1,
      })),
      revokeBan: vi.fn(() => true),
      invalidateCache: vi.fn(),
    };

    mockMuteStore = {
      checkMute: vi.fn(() => ({ muted: false })),
      getMutes: vi.fn(() => []),
      createMute: vi.fn((input: Record<string, unknown>) => ({
        id: "mute_1",
        playerId: input.playerId,
        type: "chat",
        isActive: true,
        reason: input.reason ?? "test",
        moderatorId: input.moderatorId ?? "mod",
        createdAt: 1,
      })),
      removeMute: vi.fn(() => true),
      invalidateCache: vi.fn(),
    };

    messaging = {
      PublishAsync: vi.fn(),
      SubscribeAsync: vi.fn(() => ({ Disconnect: vi.fn() })),
    };

    http = {
      JSONDecode: vi.fn((s: string) => JSON.parse(s) as unknown),
    };

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));

    vi.doMock("@broblox/observability", () => ({
      Counter: class {
        inc = vi.fn();
      },
      Histogram: class {
        observe = vi.fn();
      },
    }));

    vi.doMock("./ban-store", () => ({
      BanStore: function () {
        return mockBanStore;
      },
    }));

    vi.doMock("./mute-store", () => ({
      MuteStore: function () {
        return mockMuteStore;
      },
    }));

    setGlobal("typeOf", (v: unknown) => {
      if (v === undefined || v === null) return "nil";
      if (typeof v === "string") return "string";
      if (typeof v === "object") return "table";
      return typeof v;
    });
    setGlobal("tostring", (v: unknown) => String(v));
    setGlobal("task", { spawn: (fn: () => void) => fn() });
    setGlobal("os", { time: vi.fn(() => 100) });
    setGlobal("game", {
      GetService: (name: string) => {
        if (name === "MessagingService") return messaging;
        if (name === "HttpService") return http;
        throw new Error(`Unknown service: ${name}`);
      },
    });
  });

  afterEach(() => {
    resetGlobals();
    vi.restoreAllMocks();
  });

  async function getService() {
    const mod = await import("./service");
    return mod.getModeration("TestModeration");
  }

  // --------------------------------------------------------------------------
  // Singleton
  // --------------------------------------------------------------------------

  it("getModeration returns a ModerationService", async () => {
    const svc = await getService();
    expect(svc).toBeDefined();
    expect(typeof svc.checkBan).toBe("function");
    expect(typeof svc.ban).toBe("function");
    expect(typeof svc.mute).toBe("function");
  });

  // --------------------------------------------------------------------------
  // Ban methods
  // --------------------------------------------------------------------------

  it("checkBan delegates to BanStore", async () => {
    mockBanStore.checkBan.mockReturnValue({ banned: true, reason: "cheating" });
    const svc = await getService();

    const result = svc.checkBan(42);
    expect(result).toEqual({ banned: true, reason: "cheating" });
    expect(mockBanStore.checkBan).toHaveBeenCalledWith(42);
  });

  it("getBans delegates to BanStore", async () => {
    const bans = [{ id: "ban_1", playerId: 42 }];
    mockBanStore.getBans.mockReturnValue(bans);
    const svc = await getService();

    expect(svc.getBans(42)).toEqual(bans);
    expect(mockBanStore.getBans).toHaveBeenCalledWith(42);
  });

  it("ban creates record, publishes sync, and notifies callbacks", async () => {
    const svc = await getService();
    const onBan = vi.fn();
    svc.onBan(onBan);

    const input = { playerId: 42, reason: "griefing", moderatorId: "mod_1" };
    const record = svc.ban(input as never);

    expect(record.playerId).toBe(42);
    expect(mockBanStore.createBan).toHaveBeenCalledWith(input);
    expect(messaging.PublishAsync).toHaveBeenCalledWith("ModBanSync", record);
    expect(onBan).toHaveBeenCalledWith(record);
  });

  it("revokeBan delegates to BanStore and syncs on success", async () => {
    const revokedBan = { id: "ban_1", playerId: 42, status: "REVOKED" };
    mockBanStore.getBans.mockReturnValue([revokedBan]);
    const svc = await getService();

    const result = svc.revokeBan(42, "ban_1", "admin_1", "appeal granted");
    expect(result).toBe(true);
    expect(mockBanStore.revokeBan).toHaveBeenCalledWith(42, "ban_1", "admin_1", "appeal granted");
    expect(messaging.PublishAsync).toHaveBeenCalledWith("ModBanSync", revokedBan);
  });

  it("revokeBan does not sync when revoke fails", async () => {
    mockBanStore.revokeBan.mockReturnValue(false);
    const svc = await getService();

    const result = svc.revokeBan(42, "ban_xxx", "admin_1", "not found");
    expect(result).toBe(false);
    expect(messaging.PublishAsync).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Mute methods
  // --------------------------------------------------------------------------

  it("checkMute delegates to MuteStore", async () => {
    mockMuteStore.checkMute.mockReturnValue({ muted: true, reason: "spam" });
    const svc = await getService();

    const result = svc.checkMute(42);
    expect(result).toEqual({ muted: true, reason: "spam" });
    expect(mockMuteStore.checkMute).toHaveBeenCalledWith(42);
  });

  it("getMutes delegates to MuteStore", async () => {
    const mutes = [{ id: "mute_1", playerId: 42 }];
    mockMuteStore.getMutes.mockReturnValue(mutes);
    const svc = await getService();

    expect(svc.getMutes(42)).toEqual(mutes);
    expect(mockMuteStore.getMutes).toHaveBeenCalledWith(42);
  });

  it("mute creates record, publishes sync, and notifies callbacks", async () => {
    const svc = await getService();
    const onMute = vi.fn();
    svc.onMute(onMute);

    const input = { playerId: 42, reason: "spam", moderatorId: "mod_1", durationMinutes: 30 };
    const record = svc.mute(input as never);

    expect(record.playerId).toBe(42);
    expect(mockMuteStore.createMute).toHaveBeenCalledWith(input);
    expect(messaging.PublishAsync).toHaveBeenCalledWith("ModMuteSync", record);
    expect(onMute).toHaveBeenCalledWith(record);
  });

  it("unmute delegates to MuteStore and syncs on success", async () => {
    const removedMute = { id: "mute_1", playerId: 42, isActive: false };
    mockMuteStore.getMutes.mockReturnValue([removedMute]);
    const svc = await getService();

    const result = svc.unmute(42, "mute_1", 99);
    expect(result).toBe(true);
    expect(mockMuteStore.removeMute).toHaveBeenCalledWith(42, "mute_1", 99);
    expect(messaging.PublishAsync).toHaveBeenCalledWith("ModMuteSync", removedMute);
  });

  it("unmute does not sync when removal fails", async () => {
    mockMuteStore.removeMute.mockReturnValue(false);
    const svc = await getService();

    const result = svc.unmute(42, "mute_xxx", 99);
    expect(result).toBe(false);
    expect(messaging.PublishAsync).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Callbacks
  // --------------------------------------------------------------------------

  it("multiple ban callbacks are all invoked", async () => {
    const svc = await getService();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    svc.onBan(cb1);
    svc.onBan(cb2);

    svc.ban({ playerId: 1, reason: "test", moderatorId: "m" } as never);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it("multiple mute callbacks are all invoked", async () => {
    const svc = await getService();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    svc.onMute(cb1);
    svc.onMute(cb2);

    svc.mute({ playerId: 1, reason: "test", moderatorId: "m" } as never);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  it("subscribes to ModBanSync and ModMuteSync on creation", async () => {
    await getService();
    expect(messaging.SubscribeAsync).toHaveBeenCalledWith("ModBanSync", expect.any(Function));
    expect(messaging.SubscribeAsync).toHaveBeenCalledWith("ModMuteSync", expect.any(Function));
  });

  // --------------------------------------------------------------------------
  // Sync subscription handlers
  // --------------------------------------------------------------------------

  async function getSubscribeCallbacks() {
    await getService();
    const banCb = messaging.SubscribeAsync.mock.calls.find(
      (c: unknown[]) => c[0] === "ModBanSync"
    )?.[1] as (msg: { Data: unknown; Sent: number }) => void;
    const muteCb = messaging.SubscribeAsync.mock.calls.find(
      (c: unknown[]) => c[0] === "ModMuteSync"
    )?.[1] as (msg: { Data: unknown; Sent: number }) => void;
    return { banCb, muteCb };
  }

  it("ban sync handles string payload via JSONDecode", async () => {
    const { banCb } = await getSubscribeCallbacks();
    const ban = { id: "b1", playerId: 42, status: "ACTIVE" };
    http.JSONDecode.mockReturnValue(ban);

    banCb({ Data: JSON.stringify(ban), Sent: 100 });

    expect(http.JSONDecode).toHaveBeenCalled();
    expect(mockBanStore.invalidateCache).toHaveBeenCalledWith(42);
  });

  it("ban sync handles table payload directly", async () => {
    const { banCb } = await getSubscribeCallbacks();
    const ban = { id: "b2", playerId: 99, status: "ACTIVE" };

    banCb({ Data: ban, Sent: 100 });

    expect(mockBanStore.invalidateCache).toHaveBeenCalledWith(99);
  });

  it("ban sync ignores non-string non-table payload", async () => {
    const { banCb } = await getSubscribeCallbacks();
    mockBanStore.invalidateCache.mockClear();

    banCb({ Data: 12345, Sent: 100 });

    expect(mockBanStore.invalidateCache).not.toHaveBeenCalled();
  });

  it("ban sync handles JSONDecode error gracefully", async () => {
    const { banCb } = await getSubscribeCallbacks();
    http.JSONDecode.mockImplementation(() => {
      throw new Error("bad json");
    });

    banCb({ Data: "invalid", Sent: 100 });

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to decode ban"));
    expect(mockBanStore.invalidateCache).not.toHaveBeenCalled();
  });

  it("ban sync fires onBan callbacks and handles callback error", async () => {
    const svc = await getService();
    const { banCb } = await getSubscribeCallbacks();
    const badCb = vi.fn(() => {
      throw new Error("callback boom");
    });
    svc.onBan(badCb);

    banCb({ Data: { id: "b3", playerId: 10, status: "ACTIVE" }, Sent: 100 });

    expect(badCb).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("onBan callback error"));
  });

  it("mute sync handles string payload via JSONDecode", async () => {
    const { muteCb } = await getSubscribeCallbacks();
    const mute = { id: "m1", playerId: 55, isActive: true };
    http.JSONDecode.mockReturnValue(mute);

    muteCb({ Data: JSON.stringify(mute), Sent: 100 });

    expect(mockMuteStore.invalidateCache).toHaveBeenCalledWith(55);
  });

  it("mute sync handles table payload directly", async () => {
    const { muteCb } = await getSubscribeCallbacks();
    const mute = { id: "m2", playerId: 77, isActive: true };

    muteCb({ Data: mute, Sent: 100 });

    expect(mockMuteStore.invalidateCache).toHaveBeenCalledWith(77);
  });

  it("mute sync ignores non-string non-table payload", async () => {
    const { muteCb } = await getSubscribeCallbacks();
    mockMuteStore.invalidateCache.mockClear();

    muteCb({ Data: false, Sent: 100 });

    expect(mockMuteStore.invalidateCache).not.toHaveBeenCalled();
  });

  it("mute sync handles JSONDecode error gracefully", async () => {
    const { muteCb } = await getSubscribeCallbacks();
    http.JSONDecode.mockImplementation(() => {
      throw new Error("bad json");
    });

    muteCb({ Data: "invalid", Sent: 100 });

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to decode mute"));
  });

  it("mute sync fires onMute callbacks and handles callback error", async () => {
    const svc = await getService();
    const { muteCb } = await getSubscribeCallbacks();
    const badCb = vi.fn(() => {
      throw new Error("callback boom");
    });
    svc.onMute(badCb);

    muteCb({ Data: { id: "m3", playerId: 10, isActive: true }, Sent: 100 });

    expect(badCb).toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("onMute callback error"));
  });

  it("sync skips ban without playerId", async () => {
    const { banCb } = await getSubscribeCallbacks();
    mockBanStore.invalidateCache.mockClear();

    banCb({ Data: { id: "b_no_player" }, Sent: 100 });

    expect(mockBanStore.invalidateCache).not.toHaveBeenCalled();
  });

  it("recordMessageAgeMs skips negative age", async () => {
    // Create service with os.time in the past so Sent > os.time
    const g = globalThis as unknown as Record<string, unknown>;
    (g.os as Record<string, unknown>).time = vi.fn(() => 50);

    const { banCb } = await getSubscribeCallbacks();
    // Sent: 200 > os.time: 50 → age is negative, should not error
    banCb({ Data: { id: "b_neg", playerId: 1 }, Sent: 200 });

    expect(mockBanStore.invalidateCache).toHaveBeenCalledWith(1);
  });

  it("logs initialization on creation", async () => {
    await getService();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("initialized"));
  });

  // --------------------------------------------------------------------------
  // createForTesting / resetInstance
  // --------------------------------------------------------------------------

  it("createForTesting bypasses singleton", async () => {
    const mod = await import("./service");
    const svc1 = mod.ModerationService.createForTesting("Test1");
    const svc2 = mod.ModerationService.createForTesting("Test2");
    expect(svc1).not.toBe(svc2);
  });

  it("resetInstance clears the singleton", async () => {
    const mod = await import("./service");
    const svc1 = mod.getModeration("TestMod");
    mod.ModerationService.resetInstance();
    const svc2 = mod.getModeration("TestMod");
    expect(svc1).not.toBe(svc2);
  });

  // --------------------------------------------------------------------------
  // evictPlayer
  // --------------------------------------------------------------------------

  it("evictPlayer delegates to both stores", async () => {
    mockBanStore.evictPlayer = vi.fn();
    mockMuteStore.evictPlayer = vi.fn();
    const svc = await getService();

    svc.evictPlayer(42);
    expect(mockBanStore.evictPlayer).toHaveBeenCalledWith(42);
    expect(mockMuteStore.evictPlayer).toHaveBeenCalledWith(42);
  });
});
