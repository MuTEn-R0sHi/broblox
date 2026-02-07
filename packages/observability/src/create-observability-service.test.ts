/**
 * Tests for createObservabilityService factory.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("createObservabilityService", () => {
  let mockLogger: Record<string, ReturnType<typeof vi.fn>>;
  let mockRegisterSink: ReturnType<typeof vi.fn>;
  let mockFlushAll: ReturnType<typeof vi.fn>;
  let mockUseConsoleSink: ReturnType<typeof vi.fn>;
  let mockRegisterMetricSink: ReturnType<typeof vi.fn>;
  let mockFlushMetrics: ReturnType<typeof vi.fn>;
  let mockUseConsoleMetricSink: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();

    mockLogger = { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() };

    const consoleSinkDisconnect = vi.fn();
    const metricSinkDisconnect = vi.fn();
    const customDisconnect = vi.fn();

    mockRegisterSink = vi.fn(() => customDisconnect);
    mockFlushAll = vi.fn();
    mockUseConsoleSink = vi.fn(() => consoleSinkDisconnect);
    mockRegisterMetricSink = vi.fn(() => customDisconnect);
    mockFlushMetrics = vi.fn();
    mockUseConsoleMetricSink = vi.fn(() => metricSinkDisconnect);

    vi.doMock("@rbx/core", () => ({
      createLogger: () => mockLogger,
    }));
    vi.doMock("./telemetry", () => ({
      registerSink: mockRegisterSink,
      flushAll: mockFlushAll,
      useConsoleSink: mockUseConsoleSink,
    }));
    vi.doMock("./metrics", () => ({
      registerMetricSink: mockRegisterMetricSink,
      flushMetrics: mockFlushMetrics,
      useConsoleMetricSink: mockUseConsoleMetricSink,
    }));
  });

  async function createService(
    cfg?: Parameters<typeof import("./create-observability-service").createObservabilityService>[0]
  ) {
    const mod = await import("./create-observability-service");
    return mod.createObservabilityService(cfg);
  }

  it("returns a Service with lifecycle methods", async () => {
    const handle = await createService();
    expect(handle.Service.name).toBe("ObservabilityService");
    expect(typeof handle.Service.onInit).toBe("function");
    expect(typeof handle.Service.onStart).toBe("function");
    expect(typeof handle.Service.onDestroy).toBe("function");
  });

  it("enables console sink by default on init", async () => {
    const handle = await createService();
    handle.Service.onInit!();

    expect(mockUseConsoleSink).toHaveBeenCalled();
    expect(mockUseConsoleMetricSink).not.toHaveBeenCalled();
  });

  it("skips console sink when disabled", async () => {
    const handle = await createService({ enableConsoleSink: false });
    handle.Service.onInit!();

    expect(mockUseConsoleSink).not.toHaveBeenCalled();
  });

  it("enables console metric sink when requested", async () => {
    const handle = await createService({ enableConsoleMetricSink: true });
    handle.Service.onInit!();

    expect(mockUseConsoleMetricSink).toHaveBeenCalled();
  });

  it("registers custom telemetry sinks", async () => {
    const sink = { name: "custom", write: vi.fn() } as never;
    const handle = await createService({ telemetrySinks: [sink] });
    handle.Service.onInit!();

    expect(mockRegisterSink).toHaveBeenCalledWith(sink);
  });

  it("registers custom metric sinks", async () => {
    const sink = { name: "custom", write: vi.fn() } as never;
    const handle = await createService({ metricSinks: [sink] });
    handle.Service.onInit!();

    expect(mockRegisterMetricSink).toHaveBeenCalledWith(sink);
  });

  it("flushes and disconnects all sinks on destroy", async () => {
    const handle = await createService();
    handle.Service.onInit!();
    handle.Service.onDestroy!();

    expect(mockFlushAll).toHaveBeenCalled();
    expect(mockFlushMetrics).toHaveBeenCalled();
  });

  it("logs on start", async () => {
    const handle = await createService();
    handle.Service.onStart!();

    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("started"));
  });

  it("each factory call creates independent services", async () => {
    const mod = await import("./create-observability-service");
    const h1 = mod.createObservabilityService();
    const h2 = mod.createObservabilityService();
    expect(h1.Service).not.toBe(h2.Service);
  });
});
