/**
 * Tests for observability/http-sink.ts
 *
 * Exercises HttpTelemetrySink and HttpMetricSink batching, flushing,
 * and error handling.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TelemetryEvent, MetricPoint } from "./types";

// ── Roblox global mocks ──────────────────────────────────────────────

const mockRequestAsync = vi.fn();
const mockJSONEncode = vi.fn((v: unknown) => JSON.stringify(v));

vi.stubGlobal("game", {
  GetService: () => ({
    JSONEncode: mockJSONEncode,
    RequestAsync: mockRequestAsync,
  }),
});

vi.stubGlobal("warn", vi.fn());
vi.stubGlobal("pcall", (fn: () => unknown) => {
  try {
    return [true, fn()];
  } catch (e) {
    return [false, String(e)];
  }
});
vi.stubGlobal("task", {
  spawn: vi.fn(),
  wait: vi.fn(),
  cancel: vi.fn(),
});

// Mock rbxSize to use .length
vi.mock("./runtime", () => ({
  rbxSize: (arr: unknown[]) => arr.length,
}));

import { HttpTelemetrySink, HttpMetricSink } from "./http-sink";

function makeEvent(name: string): TelemetryEvent {
  return {
    category: "game",
    name,
    level: "info",
    timestamp: 1000,
    clock: 0.5,
    context: { traceId: "t1", serverId: "s1", placeId: 123 },
    data: {},
  };
}

function makeMetric(name: string, value: number): MetricPoint {
  return { name, type: "counter", value, timestamp: 1000 };
}

// ============================================================================

describe("HttpTelemetrySink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("buffers events and sends on flush", () => {
    const sink = new HttpTelemetrySink({
      baseUrl: "https://dash.example.com",
      apiKey: "key123",
    });

    mockRequestAsync.mockReturnValue({ Success: true, StatusCode: 201, Body: "{}" });

    sink.emit(makeEvent("ev1"));
    sink.emit(makeEvent("ev2"));

    // Not sent yet (below batch size)
    expect(mockRequestAsync).not.toHaveBeenCalled();

    sink.flush();

    expect(mockRequestAsync).toHaveBeenCalledTimes(1);
    const call = mockRequestAsync.mock.calls[0][0];
    expect(call.Url).toBe("https://dash.example.com/api/telemetry");
    expect(call.Method).toBe("POST");
    expect(call.Headers["x-api-key"]).toBe("key123");
    expect(call.Headers["Content-Type"]).toBe("application/json");

    // Body contains 2 events
    const parsed = JSON.parse(mockJSONEncode.mock.results[0].value);
    expect(parsed.events).toHaveLength(2);
  });

  it("auto-flushes when batch size is reached", () => {
    const sink = new HttpTelemetrySink({
      baseUrl: "https://dash.example.com",
      apiKey: "key123",
      maxBatchSize: 2,
    });

    mockRequestAsync.mockReturnValue({ Success: true, StatusCode: 201, Body: "{}" });

    sink.emit(makeEvent("ev1"));
    expect(mockRequestAsync).not.toHaveBeenCalled();

    sink.emit(makeEvent("ev2")); // triggers flush
    expect(mockRequestAsync).toHaveBeenCalledTimes(1);
  });

  it("does not send when buffer is empty", () => {
    const sink = new HttpTelemetrySink({
      baseUrl: "https://dash.example.com",
      apiKey: "key123",
    });

    sink.flush();
    expect(mockRequestAsync).not.toHaveBeenCalled();
  });

  it("warns on HTTP error", () => {
    const sink = new HttpTelemetrySink({
      baseUrl: "https://dash.example.com",
      apiKey: "key123",
    });

    mockRequestAsync.mockReturnValue({ Success: false, StatusCode: 500, Body: "Internal error" });

    sink.emit(makeEvent("ev1"));
    sink.flush();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("API returned 500"));
  });

  it("warns on network failure", () => {
    const sink = new HttpTelemetrySink({
      baseUrl: "https://dash.example.com",
      apiKey: "key123",
    });

    mockRequestAsync.mockImplementation(() => {
      throw new Error("Connection refused");
    });

    sink.emit(makeEvent("ev1"));
    sink.flush();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Failed to send telemetry"));
  });

  it("stop() flushes remaining events and cancels thread", () => {
    const sink = new HttpTelemetrySink({
      baseUrl: "https://dash.example.com",
      apiKey: "key123",
    });

    mockRequestAsync.mockReturnValue({ Success: true, StatusCode: 201, Body: "{}" });

    sink.emit(makeEvent("ev1"));
    sink.stop();

    expect(mockRequestAsync).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================

describe("HttpMetricSink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("buffers metrics and sends on flush", () => {
    const sink = new HttpMetricSink({
      baseUrl: "https://dash.example.com",
      apiKey: "key123",
    });

    mockRequestAsync.mockReturnValue({ Success: true, StatusCode: 201, Body: "{}" });

    sink.record(makeMetric("m1", 1));
    sink.record(makeMetric("m2", 2));
    sink.flush();

    expect(mockRequestAsync).toHaveBeenCalledTimes(1);
    const call = mockRequestAsync.mock.calls[0][0];
    expect(call.Url).toBe("https://dash.example.com/api/metrics");
  });

  it("auto-flushes at batch size", () => {
    const sink = new HttpMetricSink({
      baseUrl: "https://dash.example.com",
      apiKey: "key123",
      maxBatchSize: 1,
    });

    mockRequestAsync.mockReturnValue({ Success: true, StatusCode: 201, Body: "{}" });

    sink.record(makeMetric("m1", 1)); // triggers flush
    expect(mockRequestAsync).toHaveBeenCalledTimes(1);
  });

  it("does not send when buffer is empty", () => {
    const sink = new HttpMetricSink({
      baseUrl: "https://dash.example.com",
      apiKey: "key123",
    });

    sink.flush();
    expect(mockRequestAsync).not.toHaveBeenCalled();
  });
});
