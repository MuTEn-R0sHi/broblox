/**
 * Tests for createChatModerationService factory.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// Roblox globals stub
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

describe("createChatModerationService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let capturedOnIncomingMessage: ((msg: unknown) => unknown) | undefined;

  // Map of userId → Player
  const playersByUserId = new Map<number, Record<string, unknown>>();

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    capturedOnIncomingMessage = undefined;
    playersByUserId.clear();

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));

    // game.GetService delegates to globalThis so module-scope calls resolve
    setGlobal("game", {
      GetService: (name: string) => {
        const g = globalThis as unknown as Record<string, unknown>;
        return g[name] ?? { _service: name };
      },
      JobId: "test-job-id",
      PlaceId: 0,
    });

    // TextChatService stub — captures the OnIncomingMessage assignment
    setGlobal("TextChatService", {
      set OnIncomingMessage(fn: (msg: unknown) => unknown) {
        capturedOnIncomingMessage = fn;
      },
    });

    // Players stub
    setGlobal("Players", {
      GetPlayerByUserId: (userId: number) => playersByUserId.get(userId) ?? undefined,
    });

    // Instance stub (for TextChatMessageProperties)
    setGlobal(
      "Instance",
      class {
        ClassName: string;
        Text = "";
        PrefixText = "";
        constructor(className: string) {
          this.ClassName = className;
        }
      }
    );
  });

  afterEach(() => {
    resetGlobals();
    vi.restoreAllMocks();
  });

  async function createService() {
    const mod = await import("./create-chat-moderation-service");
    return mod.createChatModerationService();
  }

  it("returns a Service with onInit", async () => {
    const handle = await createService();
    expect(handle.Service).toBeDefined();
    expect(typeof handle.Service.onInit).toBe("function");
  });

  it("registers TextChatService.OnIncomingMessage on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();
    expect(capturedOnIncomingMessage).toBeDefined();
    expect(typeof capturedOnIncomingMessage).toBe("function");
  });

  it("logs info on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Chat moderation enabled")
    );
  });

  it("returns undefined for messages with no TextSource", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    const result = capturedOnIncomingMessage!({ TextSource: undefined });
    expect(result).toBeUndefined();
  });

  it("returns undefined for unknown player", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    const result = capturedOnIncomingMessage!({ TextSource: { UserId: 999 } });
    expect(result).toBeUndefined();
  });

  it("returns undefined for non-muted player", async () => {
    playersByUserId.set(1, {
      GetAttribute: (attr: string) => (attr === "rbx.moderation.muted" ? false : undefined),
    });

    const handle = await createService();
    handle.Service.onInit!();

    const result = capturedOnIncomingMessage!({ TextSource: { UserId: 1 } });
    expect(result).toBeUndefined();
  });

  it("blanks message for muted player", async () => {
    playersByUserId.set(42, {
      GetAttribute: (attr: string) => (attr === "rbx.moderation.muted" ? true : undefined),
    });

    const handle = await createService();
    handle.Service.onInit!();

    const result = capturedOnIncomingMessage!({ TextSource: { UserId: 42 } }) as Record<
      string,
      unknown
    >;
    expect(result).toBeDefined();
    expect(result.Text).toBe("");
    expect(result.PrefixText).toBe("");
  });

  it("does not blank message when attribute is not exactly true", async () => {
    playersByUserId.set(7, {
      GetAttribute: (attr: string) => (attr === "rbx.moderation.muted" ? "yes" : undefined),
    });

    const handle = await createService();
    handle.Service.onInit!();

    const result = capturedOnIncomingMessage!({ TextSource: { UserId: 7 } });
    expect(result).toBeUndefined();
  });

  it("each call to factory creates an independent service", async () => {
    const mod = await import("./create-chat-moderation-service");
    const handle1 = mod.createChatModerationService();
    const handle2 = mod.createChatModerationService();
    expect(handle1.Service).not.toBe(handle2.Service);
  });
});
