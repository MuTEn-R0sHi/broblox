/**
 * Tests for createSecurityService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createSecurityService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockEnforcer: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    mockEnforcer = {
      start: vi.fn(),
      stop: vi.fn(),
      handleViolation: vi.fn(),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./enforcer", () => ({
      Enforcer: function () {
        return mockEnforcer;
      },
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

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-security-service");
    const h1 = mod.createSecurityService();
    const h2 = mod.createSecurityService();
    expect(h1.Service).not.toBe(h2.Service);
  });
});
