/**
 * Tests for observability/metrics.ts
 *
 * Exercises Counter, Gauge, Histogram, metric sinks,
 * timing helper, and ConsoleMetricSink.
 */

import { describe, it, expect, vi } from "vitest";
import {
  Counter,
  Gauge,
  Histogram,
  registerMetricSink,
  flushMetrics,
  createCounter,
  createGauge,
  createHistogram,
  time,
  ConsoleMetricSink,
  useConsoleMetricSink,
  CommonMetrics,
} from "./metrics";
import type { MetricPoint } from "./types";

// ============================================================================
// Counter
// ============================================================================

describe("Counter", () => {
  it("starts at zero", () => {
    const c = new Counter("test_counter");
    expect(c.get()).toBe(0);
  });

  it("inc() increments by 1", () => {
    const c = new Counter("test_counter");
    c.inc();
    c.inc();
    expect(c.get()).toBe(2);
  });

  it("add() increments by a positive delta", () => {
    const c = new Counter("test_counter");
    c.add(5);
    expect(c.get()).toBe(5);
  });

  it("ignores negative deltas (counters can't decrease)", () => {
    const c = new Counter("test_counter");
    c.add(10);
    c.add(-3);
    expect(c.get()).toBe(10);
  });

  it("emits metric points to registered sinks", () => {
    const points: MetricPoint[] = [];
    const unsub = registerMetricSink({
      record: (p) => points.push(p),
      flush: vi.fn(),
    });

    const c = new Counter("recorded_counter", { env: "test" });
    c.inc();

    expect(points).toHaveLength(1);
    expect(points[0].name).toBe("recorded_counter");
    expect(points[0].type).toBe("counter");
    expect(points[0].value).toBe(1);
    expect(points[0].labels?.env).toBe("test");

    unsub();
  });
});

describe("createCounter (deprecated factory)", () => {
  it("returns a Counter instance", () => {
    const c = createCounter("legacy_counter");
    expect(c).toBeInstanceOf(Counter);
  });
});

// ============================================================================
// Gauge
// ============================================================================

describe("Gauge", () => {
  it("starts at zero", () => {
    const g = new Gauge("test_gauge");
    expect(g.get()).toBe(0);
  });

  it("set() changes value", () => {
    const g = new Gauge("test_gauge");
    g.set(42);
    expect(g.get()).toBe(42);
  });

  it("inc() increases by delta (default 1)", () => {
    const g = new Gauge("test_gauge");
    g.inc();
    expect(g.get()).toBe(1);
    g.inc(4);
    expect(g.get()).toBe(5);
  });

  it("dec() decreases by delta (default 1)", () => {
    const g = new Gauge("test_gauge");
    g.set(10);
    g.dec();
    expect(g.get()).toBe(9);
    g.dec(3);
    expect(g.get()).toBe(6);
  });

  it("emits metric points to sinks", () => {
    const points: MetricPoint[] = [];
    const unsub = registerMetricSink({
      record: (p) => points.push(p),
      flush: vi.fn(),
    });

    const g = new Gauge("recorded_gauge");
    g.set(100);

    expect(points.length).toBeGreaterThan(0);
    expect(points[points.length - 1].type).toBe("gauge");
    expect(points[points.length - 1].value).toBe(100);

    unsub();
  });
});

describe("createGauge (deprecated factory)", () => {
  it("returns a Gauge instance", () => {
    const g = createGauge("legacy_gauge");
    expect(g).toBeInstanceOf(Gauge);
  });
});

// ============================================================================
// Histogram
// ============================================================================

describe("Histogram", () => {
  it("starts with zero sum and count", () => {
    const h = new Histogram("test_hist");
    const stats = h.getStats();
    expect(stats.sum).toBe(0);
    expect(stats.count).toBe(0);
    expect(stats.avg).toBe(0);
  });

  it("observe() tracks sum, count, and average", () => {
    const h = new Histogram("test_hist");
    h.observe(10);
    h.observe(20);
    h.observe(30);

    const stats = h.getStats();
    expect(stats.sum).toBe(60);
    expect(stats.count).toBe(3);
    expect(stats.avg).toBe(20);
  });

  it("uses custom bucket boundaries", () => {
    const h = new Histogram("custom_hist", undefined, {
      boundaries: [10, 50, 100],
    });
    h.observe(5); // bucket 0 (<=10)
    h.observe(25); // bucket 1 (<=50)
    h.observe(75); // bucket 2 (<=100)
    h.observe(200); // overflow bucket

    expect(h.getStats().count).toBe(4);
  });

  it("emits metric points to sinks", () => {
    const points: MetricPoint[] = [];
    const unsub = registerMetricSink({
      record: (p) => points.push(p),
      flush: vi.fn(),
    });

    const h = new Histogram("recorded_hist");
    h.observe(42);

    expect(points).toHaveLength(1);
    expect(points[0].type).toBe("histogram");
    expect(points[0].value).toBe(42);

    unsub();
  });
});

describe("createHistogram (deprecated factory)", () => {
  it("returns a Histogram instance", () => {
    const h = createHistogram("legacy_hist");
    expect(h).toBeInstanceOf(Histogram);
  });
});

// ============================================================================
// Metric Sink Management
// ============================================================================

describe("registerMetricSink / flushMetrics", () => {
  it("unsub removes the sink", () => {
    const points: MetricPoint[] = [];
    const unsub = registerMetricSink({
      record: (p) => points.push(p),
      flush: vi.fn(),
    });

    unsub();

    const c = new Counter("after_unsub");
    c.inc();

    // The sink should not have received the point
    // (other globally registered sinks may have, but our local one shouldn't)
    const relevantPoints = points.filter((p) => p.name === "after_unsub");
    expect(relevantPoints).toHaveLength(0);
  });

  it("flushMetrics calls flush on all sinks", () => {
    const flush1 = vi.fn();
    const flush2 = vi.fn();
    const unsub1 = registerMetricSink({ record: vi.fn(), flush: flush1 });
    const unsub2 = registerMetricSink({ record: vi.fn(), flush: flush2 });

    flushMetrics();

    expect(flush1).toHaveBeenCalled();
    expect(flush2).toHaveBeenCalled();

    unsub1();
    unsub2();
  });
});

// ============================================================================
// timing helper
// ============================================================================

describe("time()", () => {
  it("records duration to histogram and returns the operation result", () => {
    const h = new Histogram("timed_op");
    const result = time(h, () => 42);

    expect(result).toBe(42);
    expect(h.getStats().count).toBe(1);
    expect(h.getStats().sum).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// ConsoleMetricSink
// ============================================================================

describe("ConsoleMetricSink", () => {
  function withPrintSpy(fn: (spy: ReturnType<typeof vi.fn>) => void): void {
    const g = globalThis as Record<string, unknown>;
    const origPrint = g.print;
    const spy = vi.fn();
    g.print = spy;
    try {
      fn(spy);
    } finally {
      g.print = origPrint;
    }
  }

  it("prints metric points", () => {
    withPrintSpy((printSpy) => {
      const sink = new ConsoleMetricSink();

      sink.record({
        name: "my_metric",
        type: "counter",
        value: 7,
        timestamp: 1000,
        labels: { env: "test" },
      });

      expect(printSpy).toHaveBeenCalledWith(expect.stringContaining("my_metric"));
    });
  });

  it("handles missing labels", () => {
    withPrintSpy((printSpy) => {
      const sink = new ConsoleMetricSink();

      sink.record({
        name: "no_labels",
        type: "gauge",
        value: 3,
        timestamp: 1000,
      });

      expect(printSpy).toHaveBeenCalledWith(expect.stringContaining("no_labels"));
    });
  });

  it("flush is a no-op", () => {
    const sink = new ConsoleMetricSink();
    expect(() => sink.flush()).not.toThrow();
  });
});

describe("useConsoleMetricSink", () => {
  it("returns an unsubscribe function", () => {
    const unsub = useConsoleMetricSink();
    expect(typeof unsub).toBe("function");
    unsub();
  });
});

// ============================================================================
// CommonMetrics
// ============================================================================

describe("CommonMetrics", () => {
  it("pre-defines standard game metrics", () => {
    expect(CommonMetrics.activePlayers).toBeInstanceOf(Gauge);
    expect(CommonMetrics.activeMatches).toBeInstanceOf(Gauge);
    expect(CommonMetrics.remoteLatency).toBeInstanceOf(Histogram);
    expect(CommonMetrics.datastoreLatency).toBeInstanceOf(Histogram);
    expect(CommonMetrics.errors).toBeInstanceOf(Counter);
  });
});
