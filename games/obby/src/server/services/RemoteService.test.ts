/**
 * RemoteService Tests (Obby)
 *
 * Tests custom init lifecycle, security violation reporting on rate-limit,
 * and typed registry interface.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("RemoteService (obby)", () => {
  let capturedOptions: Record<string, unknown> | undefined;
  let mockRegistry: Record<string, ReturnType<typeof vi.fn>>;
  let mockReportViolation: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    capturedOptions = undefined;

    mockRegistry = {
      initialize: vi.fn(),
      onFunction: vi.fn(),
      onEvent: vi.fn(),
    };

    mockReportViolation = vi.fn();

    vi.doMock("@broblox/net", () => ({
      createServerRegistry: vi.fn((_remotes: unknown, opts: Record<string, unknown>) => {
        capturedOptions = opts;
        return mockRegistry;
      }),
    }));

    vi.doMock("@broblox/security", () => ({
      reportViolation: mockReportViolation,
    }));

    vi.doMock("@broblox/core", () => ({
      createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        error: vi.fn(),
      }),
    }));

    vi.doMock("shared/remotes", () => ({
      ObbyRemotes: {},
      ObbyRemotesType: {},
    }));
  });

  async function loadService() {
    return import("./RemoteService");
  }

  it("exports RemoteService with getRegistry and onInit", async () => {
    const mod = await loadService();
    expect(mod.RemoteService).toBeDefined();
    expect(typeof mod.RemoteService.getRegistry).toBe("function");
    expect(typeof mod.RemoteService.onInit).toBe("function");
  });

  it("creates and initializes registry on onInit", async () => {
    const mod = await loadService();
    mod.RemoteService.onInit!();
    expect(mockRegistry.initialize).toHaveBeenCalled();
  });

  it("getRegistry returns initialized registry after onInit", async () => {
    const mod = await loadService();
    mod.RemoteService.onInit!();
    const reg = mod.RemoteService.getRegistry();
    expect(reg).toBe(mockRegistry);
  });

  it("passes folderName ObbyRemotes to createServerRegistry", async () => {
    const mod = await loadService();
    mod.RemoteService.onInit!();
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions!["folderName"]).toBe("ObbyRemotes");
  });

  it("reports security violation when rate-limited", async () => {
    const mod = await loadService();
    mod.RemoteService.onInit!();

    const player = { Name: "TestPlayer", UserId: 42 };
    const onRateLimited = capturedOptions!["onRateLimited"] as (
      player: unknown,
      endpoint: string,
      retryAfterMs: number
    ) => void;

    onRateLimited(player, "GetFullPlayerData", 5000);

    expect(mockReportViolation).toHaveBeenCalledWith(
      player,
      "rate-abuse",
      "medium",
      expect.stringContaining("GetFullPlayerData"),
      expect.objectContaining({ endpoint: "GetFullPlayerData", retryAfterMs: 5000 })
    );
  });
});
