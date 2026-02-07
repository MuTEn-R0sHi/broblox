/**
 * Metrics Collection
 *
 * Counters, gauges, and histograms for performance monitoring.
 */

import { MetricPoint, MetricSink, HistogramBuckets } from "./types";
import { rbxSize } from "./runtime";

// ============================================================================
// Sink Management
// ============================================================================

const metricSinks: MetricSink[] = [];

/**
 * Register a metric sink.
 */
export function registerMetricSink(sink: MetricSink): () => void {
  metricSinks.push(sink);
  return () => {
    const index = metricSinks.indexOf(sink);
    if (index >= 0) {
      metricSinks.remove(index);
    }
  };
}

/**
 * Record a metric point to all sinks.
 */
function recordPoint(point: MetricPoint): void {
  for (const sink of metricSinks) {
    pcall(() => sink.record(point));
  }
}

/**
 * Flush all metric sinks.
 */
export function flushMetrics(): void {
  for (const sink of metricSinks) {
    pcall(() => sink.flush());
  }
}

// ============================================================================
// Counter
// ============================================================================

/**
 * A monotonically increasing counter.
 */
export class Counter {
  private value = 0;

  constructor(
    private name: string,
    private labels?: Record<string, string>
  ) {}

  /**
   * Increment the counter by 1.
   */
  inc(): void {
    this.add(1);
  }

  /**
   * Add a value to the counter.
   */
  add(delta: number): void {
    if (delta < 0) {
      return; // Counters can't decrease
    }
    this.value += delta;
    this.record();
  }

  /**
   * Get current value.
   */
  get(): number {
    return this.value;
  }

  private record(): void {
    recordPoint({
      name: this.name,
      type: "counter",
      value: this.value,
      timestamp: os.time(),
      labels: this.labels,
    });
  }
}

/**
 * Create a counter metric.
 * @deprecated Use `new Counter(name, labels)` directly.
 */
export function createCounter(name: string, labels?: Record<string, string>): Counter {
  return new Counter(name, labels);
}

// ============================================================================
// Gauge
// ============================================================================

/**
 * A metric that can go up and down.
 */
export class Gauge {
  private value = 0;

  constructor(
    private name: string,
    private labels?: Record<string, string>
  ) {}

  /**
   * Set the gauge to a specific value.
   */
  set(value: number): void {
    this.value = value;
    this.record();
  }

  /**
   * Increment the gauge.
   */
  inc(delta = 1): void {
    this.value += delta;
    this.record();
  }

  /**
   * Decrement the gauge.
   */
  dec(delta = 1): void {
    this.value -= delta;
    this.record();
  }

  /**
   * Get current value.
   */
  get(): number {
    return this.value;
  }

  private record(): void {
    recordPoint({
      name: this.name,
      type: "gauge",
      value: this.value,
      timestamp: os.time(),
      labels: this.labels,
    });
  }
}

/**
 * Create a gauge metric.
 * @deprecated Use `new Gauge(name, labels)` directly.
 */
export function createGauge(name: string, labels?: Record<string, string>): Gauge {
  return new Gauge(name, labels);
}

// ============================================================================
// Histogram
// ============================================================================

/** Default histogram buckets (in ms) */
const DEFAULT_BUCKETS: number[] = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

/**
 * A histogram for measuring distributions.
 */
export class Histogram {
  private buckets: number[];
  private counts: number[];
  private sum = 0;
  private count = 0;

  constructor(
    private name: string,
    private labels?: Record<string, string>,
    bucketConfig?: HistogramBuckets
  ) {
    this.buckets = bucketConfig?.boundaries ?? DEFAULT_BUCKETS;
    // Initialize counts array with zeros
    this.counts = [];
    for (let i = 0; i <= rbxSize(this.buckets); i++) {
      this.counts.push(0);
    }
  }

  /**
   * Observe a value.
   */
  observe(value: number): void {
    this.sum += value;
    this.count += 1;

    // Find bucket
    let bucketIdx = rbxSize(this.buckets);
    for (let i = 0; i < rbxSize(this.buckets); i++) {
      if (value <= this.buckets[i]) {
        bucketIdx = i;
        break;
      }
    }
    this.counts[bucketIdx] += 1;

    this.record(value);
  }

  /**
   * Get statistics.
   */
  getStats(): { sum: number; count: number; avg: number } {
    return {
      sum: this.sum,
      count: this.count,
      avg: this.count > 0 ? this.sum / this.count : 0,
    };
  }

  private record(value: number): void {
    recordPoint({
      name: this.name,
      type: "histogram",
      value,
      timestamp: os.time(),
      labels: this.labels,
    });
  }
}

/**
 * Create a histogram metric.
 * @deprecated Use `new Histogram(name, labels, buckets)` directly.
 */
export function createHistogram(
  name: string,
  labels?: Record<string, string>,
  buckets?: HistogramBuckets
): Histogram {
  return new Histogram(name, labels, buckets);
}

// ============================================================================
// Timing Helper
// ============================================================================

/**
 * Measure execution time and record to histogram.
 * Returns the result of the operation.
 */
export function time<T>(histogram: Histogram, operation: () => T): T {
  const start = os.clock();
  const result = operation();
  const durationMs = (os.clock() - start) * 1000;
  histogram.observe(durationMs);
  return result;
}

// ============================================================================
// Console Metric Sink
// ============================================================================

/**
 * Simple sink that prints metrics to console.
 */
export class ConsoleMetricSink implements MetricSink {
  record(point: MetricPoint): void {
    let labelStr = "";
    if (point.labels) {
      const parts: string[] = [];
      for (const [k, v] of pairs(point.labels)) {
        parts.push(`${k}="${v}"`);
      }
      if (rbxSize(parts) > 0) {
        labelStr = ` {${parts.join(",")}}`;
      }
    }
    print(`[METRIC] ${point.name}${labelStr} = ${point.value}`);
  }

  flush(): void {
    // No buffer
  }
}

/**
 * Create and register a console metric sink.
 */
export function useConsoleMetricSink(): () => void {
  return registerMetricSink(new ConsoleMetricSink());
}

// ============================================================================
// Common Metrics
// ============================================================================

/** Pre-defined common metrics */
export const CommonMetrics = {
  /** Number of active players */
  activePlayers: createGauge("game_active_players"),
  /** Number of active matches */
  activeMatches: createGauge("game_active_matches"),
  /** Remote call duration */
  remoteLatency: createHistogram("remote_latency_ms"),
  /** DataStore operation duration */
  datastoreLatency: createHistogram("datastore_latency_ms"),
  /** Errors count */
  errors: createCounter("game_errors_total"),
};
