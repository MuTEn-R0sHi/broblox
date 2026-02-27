/**
 * Tests for createSecurityService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createSecurityService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockEnforcer: Record<string, ReturnType<typeof vi.fn>>;
  let mockCleanupEnforcementState: ReturnType<typeof vi.fn>;
  let mockCleanupPlayer: ReturnType<typeof vi.fn>;
  let mockCleanupTrustCache: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockEnforcer = {
      start: vi.fn(),
      stop: vi.fn(),
      handleViolation: vi.fn(),
    };

    mockCleanupEnforcementState = vi.fn();
    mockCleanupPlayer = vi.fn();
    mockCleanupTrustCache = vi.fn();

    vi.doMock("@broblox/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./enforcer", () => ({
      Enforcer: function () {
        return mockEnforcer;
      },
      cleanupEnforcementState: mockCleanupEnforcementState,
    }));
    vi.doMock("./detectors", () => ({
      cleanupPlayer: mockCleanupPlayer,
    }));
    vi.doMock("./trust-score", () => ({
      cleanupTrustCache: mockCleanupTrustCache,
    }));
  });

  async function createService(cfg?: Record<string, unknown>) {
    const mod = await import("./create-security-service");
    return mod.createSecurityService(cfg as never);
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("SecurityService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("logs on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("initialized"));
  });

  it("starts enforcer on start", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    expect(mockEnforcer.start).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("enforcer active"));
  });

  it("stops enforcer on destroy", async () => {
    const handle = await createService();
    handle.Service.onDestroy!();

    expect(mockEnforcer.stop).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("stopped"));
  });

  it("exposes the enforcer", async () => {
    const handle = await createService();
    expect(handle.getEnforcer()).toBe(mockEnforcer);
  });

  it("works with default config", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("SecurityService");
  });

  it("calls onPlayerRemoving with a cleanup callback on init", async () => {
    let registeredCallback: ((player: unknown) => void) | undefined;
    const onPlayerRemoving = vi.fn((cb: (player: unknown) => void) => {
      registeredCallback = cb;
    });

    const handle = await createService({ onPlayerRemoving } as never);
    handle.Service.onInit!();

    expect(onPlayerRemoving).toHaveBeenCalled();
    expect(registeredCallback).toBeDefined();

    const fakePlayer = { UserId: 42, Name: "TestPlayer" };
    registeredCallback!(fakePlayer);

    expect(mockCleanupEnforcementState).toHaveBeenCalledWith(fakePlayer);
    expect(mockCleanupPlayer).toHaveBeenCalledWith(fakePlayer);
    expect(mockCleanupTrustCache).toHaveBeenCalledWith(fakePlayer);
  });

  it("skips cleanup registration when onPlayerRemoving not provided", async () => {
    const handle = await createService();
    // Should not throw
    handle.Service.onInit!();
    expect(mockCleanupEnforcementState).not.toHaveBeenCalled();
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-security-service");
    const h1 = mod.createSecurityService();
    const h2 = mod.createSecurityService();
    expect(h1.Service).not.toBe(h2.Service);
  });
});
