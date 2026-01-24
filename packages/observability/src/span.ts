/**
 * Span Tracking
 *
 * Lightweight spans for tracing request flow and measuring durations.
 */

import { SpanStatus, SpanContext, CorrelationContext } from "./types";
import { generateTraceId, generateSpanId, getContext, setContext } from "./context";
import { emitPerformance } from "./telemetry";

// ============================================================================
// Span Implementation
// ============================================================================

/**
 * A span representing a unit of work.
 */
export class Span {
  readonly traceId: string;
  readonly spanId: string;
  readonly parentSpanId?: string;
  readonly name: string;
  readonly startTime: number;

  private _endTime?: number;
  private _status: SpanStatus = "ok";
  private _attributes: Record<string, unknown> = {};
  private _events: Array<{
    name: string;
    timestamp: number;
    attributes?: Record<string, unknown>;
  }> = [];

  constructor(name: string, parentSpanId?: string, traceId?: string) {
    this.traceId = traceId ?? getContext()?.traceId ?? generateTraceId();
    this.spanId = generateSpanId();
    this.parentSpanId = parentSpanId;
    this.name = name;
    this.startTime = os.clock() * 1000; // ms
  }

  /** Get the end time (undefined if not ended) */
  getEndTime(): number | undefined {
    return this._endTime;
  }

  /** Get the span status */
  getStatus(): SpanStatus {
    return this._status;
  }

  /** Get the span attributes */
  getAttributes(): Record<string, unknown> {
    return this._attributes;
  }

  /** Get the span events */
  getEvents(): Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }> {
    return this._events;
  }

  /**
   * Set an attribute on the span.
   */
  setAttribute(key: string, value: unknown): this {
    this._attributes[key] = value;
    return this;
  }

  /**
   * Set multiple attributes.
   */
  setAttributes(attrs: Record<string, unknown>): this {
    for (const [key, value] of pairs(attrs)) {
      this._attributes[key as string] = value;
    }
    return this;
  }

  /**
   * Add an event to the span.
   */
  addEvent(name: string, attributes?: Record<string, unknown>): this {
    this._events.push({
      name,
      timestamp: os.clock() * 1000,
      attributes,
    });
    return this;
  }

  /**
   * Set the span status.
   */
  setStatus(status: SpanStatus): this {
    this._status = status;
    return this;
  }

  /**
   * Mark the span as errored.
   */
  setError(message?: string): this {
    this._status = "error";
    if (message) {
      this._attributes["error.message"] = message;
    }
    return this;
  }

  /**
   * End the span and emit telemetry.
   */
  end(): void {
    if (this._endTime !== undefined) {
      return; // Already ended
    }

    this._endTime = os.clock() * 1000;
    const duration = this._endTime - this.startTime;

    emitPerformance(`span:${this.name}`, duration, {
      traceId: this.traceId,
      spanId: this.spanId,
      parentSpanId: this.parentSpanId,
      status: this._status,
      attributes: this._attributes,
      events: this._events,
    });
  }

  /**
   * Get span context for propagation.
   */
  getContext(): SpanContext {
    return {
      traceId: this.traceId,
      spanId: this.spanId,
    };
  }
}

// ============================================================================
// Active Span Tracking
// ============================================================================

let activeSpan: Span | undefined;

/**
 * Get the currently active span.
 */
export function getActiveSpan(): Span | undefined {
  return activeSpan;
}

/**
 * Set the active span.
 */
export function setActiveSpan(span: Span | undefined): void {
  activeSpan = span;
}

// ============================================================================
// Span Factory
// ============================================================================

/**
 * Start a new span.
 */
export function startSpan(name: string, parentSpan?: Span): Span {
  const parentSpanId = parentSpan?.spanId ?? activeSpan?.spanId;
  const traceId = parentSpan?.traceId ?? activeSpan?.traceId;
  return new Span(name, parentSpanId, traceId);
}

/**
 * Start a span and set it as active.
 */
export function startActiveSpan(name: string): Span {
  const span = startSpan(name);
  setActiveSpan(span);
  return span;
}

// ============================================================================
// Span Helpers
// ============================================================================

/**
 * Wrap a function in a span.
 * Automatically handles timing and error tracking.
 */
export function withSpan<T>(name: string, fn: (span: Span) => T): T {
  const span = startSpan(name);
  const previousActive = activeSpan;
  setActiveSpan(span);

  const [success, result] = pcall(fn, span);

  setActiveSpan(previousActive);

  if (!success) {
    span.setError(tostring(result));
    span.end();
    error(result as never);
  }

  span.end();
  return result;
}

/**
 * Create a child span of the current active span.
 */
export function childSpan(name: string): Span {
  return startSpan(name, activeSpan);
}

// ============================================================================
// Trace Context Helpers
// ============================================================================

// Declare Roblox globals
declare const game: {
  JobId: string;
  PlaceId: number;
};

/**
 * Create a new trace context and run a function within it.
 */
export function inTraceContext<T>(fn: () => T): T {
  const context: CorrelationContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    serverId: game.JobId,
    placeId: game.PlaceId,
  };

  setContext(context);
  const [success, result] = pcall(fn);

  if (!success) {
    error(result as never);
  }

  return result;
}

/**
 * Extract trace context from span for propagation.
 */
export function extractTraceContext(span: Span): { traceId: string; spanId: string } {
  return {
    traceId: span.traceId,
    spanId: span.spanId,
  };
}
