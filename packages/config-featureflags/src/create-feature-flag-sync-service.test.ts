/**
 * Tests for createFeatureFlagSyncService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createFeatureFlagSyncService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockInitFeatureFlagSync: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };
    mockInitFeatureFlagSync = vi.fn();

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));

    vi.doMock("./sync", () => ({
      initFeatureFlagSync: mockInitFeatureFlagSync,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function createService(
    config?: Partial<{
      environment: string;
      datastoreName: string;
      topic: string;
      entryKeyPrefix: string;
    }>
  ) {
    const mod = await import("./create-feature-flag-sync-service");
    return mod.createFeatureFlagSyncService({
      environment: (config?.environment ?? "development") as "development",
      datastoreName: config?.datastoreName ?? "TestFlags",
      topic: config?.topic,
      entryKeyPrefix: config?.entryKeyPrefix,
    });
  }

  // --------------------------------------------------------------------------
  // Factory structure
  // --------------------------------------------------------------------------

  it("returns a handle with a Service", async () => {
    const handle = await createService();
    expect(handle).toBeDefined();
    expect(handle.Service).toBeDefined();
  });

  it("Service has onStart lifecycle", async () => {
    const handle = await createService();
    expect(typeof handle.Service.onStart).toBe("function");
  });

  it("each call creates an independent service", async () => {
    const mod = await import("./create-feature-flag-sync-service");
    const a = mod.createFeatureFlagSyncService({
      environment: "development",
      datastoreName: "A",
    });
    const b = mod.createFeatureFlagSyncService({
      environment: "staging",
      datastoreName: "B",
    });
    expect(a.Service).not.toBe(b.Service);
  });

  // --------------------------------------------------------------------------
  // onStart — calls initFeatureFlagSync
  // --------------------------------------------------------------------------

  it("calls initFeatureFlagSync with config on start", async () => {
    const handle = await createService({
      environment: "production",
      datastoreName: "ProdFlags",
    });
    handle.Service.onStart!();

    expect(mockInitFeatureFlagSync).toHaveBeenCalledOnce();
    expect(mockInitFeatureFlagSync).toHaveBeenCalledWith({
      environment: "production",
      datastoreName: "ProdFlags",
      topic: "FeatureFlagsSync",
      entryKeyPrefix: "featureflags_",
    });
  });

  it("uses default topic when not provided", async () => {
    const handle = await createService({ datastoreName: "Flags" });
    handle.Service.onStart!();

    const call = mockInitFeatureFlagSync.mock.calls[0][0];
    expect(call.topic).toBe("FeatureFlagsSync");
  });

  it("uses custom topic when provided", async () => {
    const handle = await createService({ topic: "CustomSync" });
    handle.Service.onStart!();

    const call = mockInitFeatureFlagSync.mock.calls[0][0];
    expect(call.topic).toBe("CustomSync");
  });

  it("uses default entryKeyPrefix when not provided", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    const call = mockInitFeatureFlagSync.mock.calls[0][0];
    expect(call.entryKeyPrefix).toBe("featureflags_");
  });

  it("uses custom entryKeyPrefix when provided", async () => {
    const handle = await createService({ entryKeyPrefix: "ff_" });
    handle.Service.onStart!();

    const call = mockInitFeatureFlagSync.mock.calls[0][0];
    expect(call.entryKeyPrefix).toBe("ff_");
  });

  // --------------------------------------------------------------------------
  // Logging
  // --------------------------------------------------------------------------

  it("logs info on start", async () => {
    const handle = await createService({ environment: "staging" });
    handle.Service.onStart!();

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Feature flag sync initialized")
    );
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("staging"));
  });

  // --------------------------------------------------------------------------
  // Does not call sync before onStart
  // --------------------------------------------------------------------------

  it("does not call initFeatureFlagSync before onStart", async () => {
    await createService();
    expect(mockInitFeatureFlagSync).not.toHaveBeenCalled();
  });

  // --------------------------------------------------------------------------
  // Service name
  // --------------------------------------------------------------------------

  it("has name property for application logging", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("FeatureFlagSyncService");
  });

  // --------------------------------------------------------------------------
  // Graceful fallback when initFeatureFlagSync throws
  // --------------------------------------------------------------------------

  it("does not throw when initFeatureFlagSync throws", async () => {
    mockInitFeatureFlagSync.mockImplementation(() => {
      throw "DataStore unavailable";
    });

    const handle = await createService();
    expect(() => handle.Service.onStart!()).not.toThrow();
  });

  it("logs warning when initFeatureFlagSync throws", async () => {
    mockInitFeatureFlagSync.mockImplementation(() => {
      throw "DataStore unavailable";
    });

    const handle = await createService();
    handle.Service.onStart!();

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("using defaults"));
  });
});
