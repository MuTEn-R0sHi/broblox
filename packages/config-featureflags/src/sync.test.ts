/**
 * Tests for FeatureFlagSyncService.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
let mockApplySnapshot: ReturnType<typeof vi.fn>;
let mockGetAsync: ReturnType<typeof vi.fn>;
let mockSubscribeAsync: ReturnType<typeof vi.fn>;
let mockJSONDecode: ReturnType<typeof vi.fn>;

// Track the subscriber callback so we can invoke it in tests.
let subscriberCallback: ((msg: { Data: unknown; Sent: number }) => void) | undefined;

beforeEach(() => {
  vi.resetModules();

  mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
  mockApplySnapshot = vi.fn();
  mockGetAsync = vi.fn(() => [undefined, undefined]);
  subscriberCallback = undefined;
  mockSubscribeAsync = vi.fn((_, cb: (msg: { Data: unknown; Sent: number }) => void) => {
    subscriberCallback = cb;
    return { Disconnect: vi.fn() };
  });
  mockJSONDecode = vi.fn((s: string) => JSON.parse(s));

  vi.doMock("@broblox/core", () => ({
    createLogger: () => mockLogger,
  }));

  vi.doMock("./overrides", () => ({
    applyRemoteFeatureFlagSnapshot: mockApplySnapshot,
  }));

  // Roblox globals
  vi.stubGlobal("game", {
    GetService: (name: string) => {
      if (name === "DataStoreService") {
        return { GetDataStore: () => ({ GetAsync: mockGetAsync }) };
      }
      if (name === "MessagingService") {
        return { SubscribeAsync: mockSubscribeAsync };
      }
      if (name === "HttpService") {
        return { JSONDecode: mockJSONDecode };
      }
      return {};
    },
  });

  vi.stubGlobal("pcall", (fn: () => unknown) => {
    try {
      const result = fn();
      if (Array.isArray(result)) return [true, ...result];
      return [true, result];
    } catch (e) {
      return [false, e];
    }
  });

  vi.stubGlobal("typeOf", (v: unknown) => {
    if (v === undefined || v === null) return "nil";
    if (typeof v === "string") return "string";
    if (typeof v === "number") return "number";
    if (typeof v === "boolean") return "boolean";
    if (typeof v === "function") return "function";
    if (typeof v === "object") return "table";
    return typeof v;
  });

  vi.stubGlobal("tostring", (v: unknown) => String(v));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function getModule() {
  return import("./sync");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("initFeatureFlagSync", () => {
  it("creates the sync service and subscribes", async () => {
    const { initFeatureFlagSync } = await getModule();
    initFeatureFlagSync({ environment: "production" });

    expect(mockSubscribeAsync).toHaveBeenCalledOnce();
    expect(mockGetAsync).toHaveBeenCalledOnce();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("sync enabled"));
  });

  it("does not create a second instance on repeated calls", async () => {
    const { initFeatureFlagSync } = await getModule();
    initFeatureFlagSync({ environment: "production" });
    initFeatureFlagSync({ environment: "production" });

    // Only one subscription + one initial refresh
    expect(mockSubscribeAsync).toHaveBeenCalledTimes(1);
  });
});

describe("refreshFeatureFlags", () => {
  it("no-ops if sync was never initialized", async () => {
    const { refreshFeatureFlags } = await getModule();
    refreshFeatureFlags();
    // Should not error or call GetAsync
    expect(mockGetAsync).not.toHaveBeenCalled();
  });

  it("applies valid snapshot from DataStore", async () => {
    const snapshot = { flags: { myFlag: true }, updatedAt: 1000 };
    mockGetAsync.mockReturnValue([snapshot, undefined]);

    const { initFeatureFlagSync, refreshFeatureFlags } = await getModule();
    initFeatureFlagSync({ environment: "production" });

    // init already calls refresh once — reset and call again
    mockApplySnapshot.mockClear();
    refreshFeatureFlags();

    expect(mockApplySnapshot).toHaveBeenCalledWith(snapshot);
  });

  it("warns on pcall failure", async () => {
    mockGetAsync.mockImplementation(() => {
      throw new Error("DataStore unavailable");
    });

    const { initFeatureFlagSync } = await getModule();
    initFeatureFlagSync({ environment: "production" });

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to load"));
  });

  it("skips when DataStore returns undefined", async () => {
    mockGetAsync.mockReturnValue([undefined, undefined]);

    const { initFeatureFlagSync } = await getModule();
    initFeatureFlagSync({ environment: "production" });

    expect(mockApplySnapshot).not.toHaveBeenCalled();
    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining("No feature flag"));
  });

  it("warns on non-table snapshot", async () => {
    mockGetAsync.mockReturnValue(["not-a-table", undefined]);

    const { initFeatureFlagSync } = await getModule();
    initFeatureFlagSync({ environment: "production" });

    expect(mockApplySnapshot).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Invalid feature flag snapshot type")
    );
  });

  it("warns on snapshot missing flags field", async () => {
    mockGetAsync.mockReturnValue([{ updatedAt: 1 }, undefined]);

    const { initFeatureFlagSync } = await getModule();
    initFeatureFlagSync({ environment: "production" });

    expect(mockApplySnapshot).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("missing flags"));
  });
});

describe("subscribe message handling", () => {
  async function initAndGetCallback() {
    const snapshot = { flags: { a: true }, updatedAt: 1 };
    mockGetAsync.mockReturnValue([snapshot, undefined]);

    const { initFeatureFlagSync } = await getModule();
    initFeatureFlagSync({ environment: "production" });

    mockApplySnapshot.mockClear();
    mockGetAsync.mockClear();
    return subscriberCallback!;
  }

  it("handles string payload via JSONDecode", async () => {
    const cb = await initAndGetCallback();
    const msg = JSON.stringify({ environment: "production", updatedAt: 2 });
    cb({ Data: msg, Sent: 1000 });

    expect(mockJSONDecode).toHaveBeenCalledWith(msg);
    expect(mockGetAsync).toHaveBeenCalled();
  });

  it("handles table payload directly", async () => {
    const cb = await initAndGetCallback();
    cb({ Data: { environment: "production", updatedAt: 2 }, Sent: 1000 });

    expect(mockGetAsync).toHaveBeenCalled();
  });

  it("ignores messages for other environments", async () => {
    const cb = await initAndGetCallback();
    cb({ Data: { environment: "staging", updatedAt: 2 }, Sent: 1000 });

    expect(mockGetAsync).not.toHaveBeenCalled();
  });

  it("ignores non-string non-table payloads", async () => {
    const cb = await initAndGetCallback();
    cb({ Data: 12345, Sent: 1000 });

    expect(mockGetAsync).not.toHaveBeenCalled();
  });

  it("handles JSONDecode failure gracefully", async () => {
    mockJSONDecode.mockImplementation(() => {
      throw new Error("invalid json");
    });

    const cb = await initAndGetCallback();
    cb({ Data: "bad-json", Sent: 1000 });

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to decode"));
    expect(mockGetAsync).not.toHaveBeenCalled();
  });

  it("refreshes when message has no environment field", async () => {
    const cb = await initAndGetCallback();
    cb({ Data: { updatedAt: 3 }, Sent: 1000 });

    expect(mockGetAsync).toHaveBeenCalled();
  });
});

describe("subscribe failure", () => {
  it("warns when SubscribeAsync throws", async () => {
    mockSubscribeAsync.mockImplementation(() => {
      throw new Error("subscribe failed");
    });

    const { initFeatureFlagSync } = await getModule();
    initFeatureFlagSync({ environment: "production" });

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to subscribe"));
  });
});
