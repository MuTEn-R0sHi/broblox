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

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));

    vi.doMock("@rbx/observability", () => ({
      createCounter: () => ({ inc: vi.fn() }),
      createHistogram: () => ({ observe: vi.fn() }),
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

  it("logs initialization on creation", async () => {
    await getService();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("initialized"));
  });
});
