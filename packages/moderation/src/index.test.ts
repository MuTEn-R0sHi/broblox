/**
 * Moderation Package Tests
 *
 * Placeholder tests for the moderation system.
 * TODO: Add comprehensive tests for ban/mute logic.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { DEFAULT_MODERATION_CONFIG } from "./types";

describe("moderation types", () => {
  it("should have valid default config", () => {
    expect(DEFAULT_MODERATION_CONFIG.datastoreName).toBe("PlayerModeration");
    expect(DEFAULT_MODERATION_CONFIG.syncInterval).toBe(60);
    expect(DEFAULT_MODERATION_CONFIG.messagingTopic).toBe("moderation");
    expect(DEFAULT_MODERATION_CONFIG.enableLogging).toBe(true);
  });

  it("should have required callback functions in default config", () => {
    expect(typeof DEFAULT_MODERATION_CONFIG.onBanCheck).toBe("function");
    expect(typeof DEFAULT_MODERATION_CONFIG.onMuteCheck).toBe("function");
  });
});

describe("ModerationService sync handling", () => {
  const originalGlobals: Partial<Record<string, unknown>> = {};

  const setGlobal = (key: string, value: unknown) => {
    const g = globalThis as unknown as Record<string, unknown>;
    if (!(key in originalGlobals)) {
      originalGlobals[key] = g[key];
    }
    g[key] = value;
  };

  const resetGlobals = () => {
    const g = globalThis as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(originalGlobals)) {
      if (value === undefined) {
        delete g[key];
      } else {
        g[key] = value;
      }
    }
    for (const key of Object.keys(originalGlobals)) {
      delete originalGlobals[key];
    }
  };

  afterEach(() => {
    resetGlobals();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("decodes string ban payload and is safe on duplicates", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const banInvalidateCache = vi.fn();
    const muteInvalidateCache = vi.fn();

    vi.doMock("@rbx/core", () => ({
      createLogger: () => logger,
    }));

    vi.doMock("./ban-store", () => ({
      BanStore: class {
        constructor(_datastoreName: string) {}
        invalidateCache = banInvalidateCache;
      },
    }));

    vi.doMock("./mute-store", () => ({
      MuteStore: class {
        constructor(_datastoreName: string) {}
        invalidateCache = muteInvalidateCache;
      },
    }));

    const subscriptions = new Map<string, (message: { Data: unknown; Sent: number }) => void>();

    const messaging = {
      PublishAsync: vi.fn(),
      SubscribeAsync: vi.fn(
        (topic: string, cb: (message: { Data: unknown; Sent: number }) => void) => {
          subscriptions.set(topic, cb);
          return { Disconnect: vi.fn() };
        }
      ),
    };

    const http = {
      JSONDecode: vi.fn((input: string) => JSON.parse(input) as unknown),
    };

    setGlobal("typeOf", (value: unknown) => {
      if (value === undefined || value === null) return "nil";
      if (typeof value === "string") return "string";
      if (typeof value === "number") return "number";
      if (typeof value === "boolean") return "boolean";
      if (typeof value === "function") return "function";
      if (typeof value === "object") return "table";
      return "unknown";
    });

    setGlobal("tostring", (value: unknown) => String(value));
    setGlobal("task", { spawn: (fn: () => void) => fn() });
    setGlobal("os", { time: vi.fn(() => 0) });
    setGlobal("game", {
      GetService: (name: string) => {
        if (name === "MessagingService") return messaging;
        if (name === "HttpService") return http;
        throw new Error(`Unexpected GetService(${name})`);
      },
    });

    const { getModeration } = await import("./service");
    const svc = getModeration("PlayerModerationTest");

    const onBan = vi.fn();
    svc.onBan(onBan);

    const payload = {
      id: "ban_1",
      playerId: 123,
      type: "PERMANENT",
      status: "ACTIVE",
      reason: "testing",
      moderatorId: "mod",
      createdAt: 1,
    };

    const handler = subscriptions.get("ModBanSync");
    expect(handler).toBeTypeOf("function");

    handler?.({ Data: JSON.stringify(payload), Sent: 0 });
    handler?.({ Data: JSON.stringify(payload), Sent: 0 });

    expect(http.JSONDecode).toHaveBeenCalledTimes(2);
    expect(banInvalidateCache).toHaveBeenCalledTimes(2);
    expect(banInvalidateCache).toHaveBeenCalledWith(123);
    expect(onBan).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();

    // Unused in this test, but ensures the mute store mock doesn't trip.
    expect(muteInvalidateCache).not.toHaveBeenCalled();
  });

  it("accepts table mute payload without JSON decode and is safe on duplicates", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const banInvalidateCache = vi.fn();
    const muteInvalidateCache = vi.fn();

    vi.doMock("@rbx/core", () => ({
      createLogger: () => logger,
    }));

    vi.doMock("./ban-store", () => ({
      BanStore: class {
        constructor(_datastoreName: string) {}
        invalidateCache = banInvalidateCache;
      },
    }));

    vi.doMock("./mute-store", () => ({
      MuteStore: class {
        constructor(_datastoreName: string) {}
        invalidateCache = muteInvalidateCache;
      },
    }));

    const subscriptions = new Map<string, (message: { Data: unknown; Sent: number }) => void>();

    const messaging = {
      PublishAsync: vi.fn(),
      SubscribeAsync: vi.fn(
        (topic: string, cb: (message: { Data: unknown; Sent: number }) => void) => {
          subscriptions.set(topic, cb);
          return { Disconnect: vi.fn() };
        }
      ),
    };

    const http = {
      JSONDecode: vi.fn((_input: string) => {
        throw new Error("should not be called");
      }),
    };

    setGlobal("typeOf", (value: unknown) => {
      if (value === undefined || value === null) return "nil";
      if (typeof value === "string") return "string";
      if (typeof value === "number") return "number";
      if (typeof value === "boolean") return "boolean";
      if (typeof value === "function") return "function";
      if (typeof value === "object") return "table";
      return "unknown";
    });

    setGlobal("tostring", (value: unknown) => String(value));
    setGlobal("task", { spawn: (fn: () => void) => fn() });
    setGlobal("os", { time: vi.fn(() => 0) });
    setGlobal("game", {
      GetService: (name: string) => {
        if (name === "MessagingService") return messaging;
        if (name === "HttpService") return http;
        throw new Error(`Unexpected GetService(${name})`);
      },
    });

    const { getModeration } = await import("./service");
    const svc = getModeration("PlayerModerationTest");

    const onMute = vi.fn();
    svc.onMute(onMute);

    const mutePayload = {
      id: "mute_1",
      playerId: 456,
      type: "chat",
      isActive: true,
      reason: "testing",
      durationMinutes: 10,
      expiresAt: 999,
      moderatorId: "mod",
      createdAt: 1,
    };

    const handler = subscriptions.get("ModMuteSync");
    expect(handler).toBeTypeOf("function");

    handler?.({ Data: mutePayload, Sent: 0 });
    handler?.({ Data: mutePayload, Sent: 0 });

    expect(muteInvalidateCache).toHaveBeenCalledTimes(2);
    expect(muteInvalidateCache).toHaveBeenCalledWith(456);
    expect(onMute).toHaveBeenCalledTimes(2);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(banInvalidateCache).not.toHaveBeenCalled();
  });

  it("warns and does not invalidate cache on invalid JSON payload", async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    const banInvalidateCache = vi.fn();
    const muteInvalidateCache = vi.fn();

    vi.doMock("@rbx/core", () => ({
      createLogger: () => logger,
    }));

    vi.doMock("./ban-store", () => ({
      BanStore: class {
        constructor(_datastoreName: string) {}
        invalidateCache = banInvalidateCache;
      },
    }));

    vi.doMock("./mute-store", () => ({
      MuteStore: class {
        constructor(_datastoreName: string) {}
        invalidateCache = muteInvalidateCache;
      },
    }));

    const subscriptions = new Map<string, (message: { Data: unknown; Sent: number }) => void>();

    const messaging = {
      PublishAsync: vi.fn(),
      SubscribeAsync: vi.fn(
        (topic: string, cb: (message: { Data: unknown; Sent: number }) => void) => {
          subscriptions.set(topic, cb);
          return { Disconnect: vi.fn() };
        }
      ),
    };

    const http = {
      JSONDecode: vi.fn((_input: string) => {
        throw new Error("bad json");
      }),
    };

    setGlobal("typeOf", (value: unknown) => {
      if (value === undefined || value === null) return "nil";
      if (typeof value === "string") return "string";
      if (typeof value === "object") return "table";
      return "unknown";
    });
    setGlobal("tostring", (value: unknown) => String(value));
    setGlobal("task", { spawn: (fn: () => void) => fn() });
    setGlobal("os", { time: vi.fn(() => 0) });
    setGlobal("game", {
      GetService: (name: string) => {
        if (name === "MessagingService") return messaging;
        if (name === "HttpService") return http;
        throw new Error(`Unexpected GetService(${name})`);
      },
    });

    const { getModeration } = await import("./service");
    const svc = getModeration("PlayerModerationTest");
    const onBan = vi.fn();
    svc.onBan(onBan);

    const handler = subscriptions.get("ModBanSync");
    expect(handler).toBeTypeOf("function");

    handler?.({ Data: "{not-json", Sent: 0 });

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(banInvalidateCache).not.toHaveBeenCalled();
    expect(onBan).not.toHaveBeenCalled();
  });
});
