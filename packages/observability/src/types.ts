/**
 * Observability types
 */

// ============================================================================
// Telemetry Types
// ============================================================================

/** Standard telemetry event categories */
export type TelemetryCategory =
  | "game"
  | "player"
  | "match"
  | "economy"
  | "combat"
  | "social"
  | "error"
  | "performance"
  | "security"
  | "custom";

/** Telemetry event severity/level */
export type TelemetryLevel = "debug" | "info" | "warn" | "error";

/** Base telemetry event structure */
export interface TelemetryEvent {
  /** Event category */
  category: TelemetryCategory;
  /** Event name (e.g., "player_joined", "match_started") */
  name: string;
  /** Event level */
  level: TelemetryLevel;
  /** Unix timestamp (os.time()) */
  timestamp: number;
  /** High-precision timestamp for ordering (os.clock()) */
  clock: number;
  /** Correlation context */
  context: CorrelationContext;
  /** Event-specific data */
  data: Record<string, unknown>;
}

// ============================================================================
// Correlation Context
// ============================================================================

/** Context that flows through all operations for tracing */
export interface CorrelationContext {
  /** Unique trace ID for this session/flow */
  traceId: string;
  /** Current span ID (changes per operation) */
  spanId?: string;
  /** Parent span ID (for nested spans) */
  parentSpanId?: string;
  /** Server/job identifier */
  serverId: string;
  /** Place ID */
  placeId: number;
  /** Player user ID (if player-specific) */
  playerId?: number;
  /** Session ID (if established) */
  sessionId?: string;
  /** Custom tags */
  tags?: Record<string, string>;
}

// ============================================================================
// Metrics Types
// ============================================================================

/** Metric types */
export type MetricType = "counter" | "gauge" | "histogram";

/** A recorded metric point */
export interface MetricPoint {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

/** Histogram bucket configuration */
export interface HistogramBuckets {
  /** Upper bounds for buckets (e.g., [10, 50, 100, 500, 1000]) */
  boundaries: number[];
}

// ============================================================================
// Span Types
// ============================================================================

/** Status of a span */
export type SpanStatus = "ok" | "error" | "timeout";

/** A performance measurement span (data structure) */
export interface SpanData {
  /** Unique span ID */
  spanId: string;
  /** Parent span ID (if nested) */
  parentSpanId?: string;
  /** Operation name */
  name: string;
  /** Start timestamp (os.clock()) */
  startTime: number;
  /** End timestamp (os.clock()) */
  endTime?: number;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Span status */
  status: SpanStatus;
  /** Attributes/tags */
  attributes: Record<string, unknown>;
  /** Events during the span */
  events: SpanEvent[];
}

/** An event that occurred during a span */
export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

// ============================================================================
// Sink Types
// ============================================================================

/** Interface for telemetry sinks (where events are sent) */
export interface TelemetrySink {
  /** Send a telemetry event */
  emit(event: TelemetryEvent): void;
  /** Flush any buffered events */
  flush(): void;
}

/** Interface for metric sinks */
export interface MetricSink {
  /** Record a metric point */
  record(point: MetricPoint): void;
  /** Flush any buffered metrics */
  flush(): void;
}

// ============================================================================
// Context Types
// ============================================================================

/** Span context for propagation across boundaries */
export interface SpanContext {
  traceId: string;
  spanId: string;
}
