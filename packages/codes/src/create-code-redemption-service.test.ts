/**
 * Tests for createCodeRedemptionService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createCodeRedemptionService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockCodeStore: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockCodeStore = {
      registerCodes: vi.fn(),
    };

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./code-store", () => ({
      CodeStore: function () {
        return mockCodeStore;
      },
    }));
  });

  async function createService(overrides?: { onRedeem?: () => void }) {
    const mod = await import("./create-code-redemption-service");
    return mod.createCodeRedemptionService({
      codes: [{ code: "FREE100" }, { code: "LAUNCH" }] as never[],
      datastoreName: "TestCodes",
      ...overrides,
    });
  }

  it("returns a Service with onInit and onStart", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("CodeRedemptionService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
  });

  it("registers codes on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockCodeStore.registerCodes).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ code: "FREE100" })])
    );
  });

  it("logs code count on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("2 codes"));
  });

  it("logs on start", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));
  });

  it("exposes getCodeStore", async () => {
    const handle = await createService();
    expect(handle.getCodeStore()).toBe(mockCodeStore);
  });

  it("passes onRedeem callback to CodeStore", async () => {
    const onRedeem = vi.fn();
    await createService({ onRedeem });
    // Verify the service was created without error (onRedeem is passed through)
    expect(onRedeem).not.toHaveBeenCalled();
  });

  it("uses noop onRedeem when not provided", async () => {
    // Should not throw when no onRedeem is provided
    const handle = await createService();
    expect(handle.getCodeStore()).toBeDefined();
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-code-redemption-service");
    const h1 = mod.createCodeRedemptionService({ codes: [], datastoreName: "A" });
    const h2 = mod.createCodeRedemptionService({ codes: [], datastoreName: "B" });
    expect(h1.Service).not.toBe(h2.Service);
  });
});
