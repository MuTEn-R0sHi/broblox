/**
 * Tests for observability/span.ts
 *
 * Exercises Span lifecycle, attributes, events, status, active span
 * tracking, startSpan, startActiveSpan, withSpan, childSpan, and
 * trace context helpers.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetPlayerIdCounter } from "@rbx/testing";
import { initContext } from "./context";
import {
  Span,
  getActiveSpan,
  setActiveSpan,
  startSpan,
  startActiveSpan,
  withSpan,
  childSpan,
  inTraceContext,
  extractTraceContext,
} from "./span";
import { getContext } from "./context";

beforeEach(() => {
  resetPlayerIdCounter();
  initContext();
  setActiveSpan(undefined); // reset active span between tests
});

// ============================================================================
// Span lifecycle
// ============================================================================

describe("Span", () => {
  it("assigns traceId, spanId, and name on construction", () => {
    const span = new Span("test-op");
    expect(span.name).toBe("test-op");
    expect(span.traceId).toBeTruthy();
    expect(span.spanId).toBeTruthy();
  });

  it("records startTime on construction", () => {
    const span = new Span("timed-op");
    expect(span.startTime).toBeGreaterThan(0);
  });

  it("end() records an endTime", () => {
    const span = new Span("ending-op");
    expect(span.getEndTime()).toBeUndefined();
    span.end();
    expect(span.getEndTime()).toBeDefined();
    expect(span.getEndTime()!).toBeGreaterThanOrEqual(span.startTime);
  });

  it("end() is idempotent (second call is no-op)", () => {
    const span = new Span("idem-op");
    span.end();
    const endTime = span.getEndTime();
    span.end();
    expect(span.getEndTime()).toBe(endTime);
  });

  it("defaults status to ok", () => {
    const span = new Span("ok-op");
    expect(span.getStatus()).toBe("ok");
  });

  it("accepts parentSpanId and traceId", () => {
    const span = new Span("child-op", "parent-span-id", "my-trace");
    expect(span.parentSpanId).toBe("parent-span-id");
    expect(span.traceId).toBe("my-trace");
  });
});

// ============================================================================
// Attributes
// ============================================================================

describe("Span attributes", () => {
  it("setAttribute sets a single key-value pair", () => {
    const span = new Span("attr-op");
    span.setAttribute("db.name", "main");
    expect(span.getAttributes()["db.name"]).toBe("main");
  });

  it("setAttributes sets multiple pairs", () => {
    const span = new Span("multi-attr");
    span.setAttributes({ a: 1, b: "two" });
    expect(span.getAttributes().a).toBe(1);
    expect(span.getAttributes().b).toBe("two");
  });

  it("setAttribute returns this for chaining", () => {
    const span = new Span("chain-op");
    const result = span.setAttribute("x", 1).setAttribute("y", 2);
    expect(result).toBe(span);
    expect(span.getAttributes().x).toBe(1);
    expect(span.getAttributes().y).toBe(2);
  });
});

// ============================================================================
// Events
// ============================================================================

describe("Span events", () => {
  it("addEvent records an event with timestamp", () => {
    const span = new Span("event-op");
    span.addEvent("cache.miss", { key: "users" });
    const events = span.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("cache.miss");
    expect(events[0].attributes?.key).toBe("users");
    expect(events[0].timestamp).toBeGreaterThan(0);
  });

  it("addEvent returns this for chaining", () => {
    const span = new Span("chain-event");
    const result = span.addEvent("a").addEvent("b");
    expect(result).toBe(span);
    expect(span.getEvents()).toHaveLength(2);
  });
});

// ============================================================================
// Status
// ============================================================================

describe("Span status", () => {
  it("setStatus changes the status", () => {
    const span = new Span("status-op");
    span.setStatus("error");
    expect(span.getStatus()).toBe("error");
  });

  it("setError sets status to error and adds error.message attribute", () => {
    const span = new Span("error-op");
    span.setError("something broke");
    expect(span.getStatus()).toBe("error");
    expect(span.getAttributes()["error.message"]).toBe("something broke");
  });

  it("setError without message still sets error status", () => {
    const span = new Span("err-no-msg");
    span.setError();
    expect(span.getStatus()).toBe("error");
  });

  it("setStatus returns this for chaining", () => {
    const span = new Span("chain-status");
    expect(span.setStatus("timeout")).toBe(span);
  });
});

// ============================================================================
// Active Span Tracking
// ============================================================================

describe("getActiveSpan / setActiveSpan", () => {
  it("starts as undefined", () => {
    expect(getActiveSpan()).toBeUndefined();
  });

  it("setActiveSpan makes a span the current active", () => {
    const span = new Span("active-op");
    setActiveSpan(span);
    expect(getActiveSpan()).toBe(span);
  });

  it("can be reset to undefined", () => {
    setActiveSpan(new Span("temp"));
    setActiveSpan(undefined);
    expect(getActiveSpan()).toBeUndefined();
  });
});

// ============================================================================
// Span Factory Functions
// ============================================================================

describe("startSpan", () => {
  it("creates a new span inheriting active span's trace", () => {
    const parent = startActiveSpan("parent");
    const child = startSpan("child");

    expect(child.traceId).toBe(parent.traceId);
    expect(child.parentSpanId).toBe(parent.spanId);

    parent.end();
    child.end();
  });

  it("accepts explicit parent span", () => {
    const parent = new Span("explicit-parent");
    const child = startSpan("child", parent);

    expect(child.traceId).toBe(parent.traceId);
    expect(child.parentSpanId).toBe(parent.spanId);

    child.end();
    parent.end();
  });
});

describe("startActiveSpan", () => {
  it("creates a span and sets it as active", () => {
    const span = startActiveSpan("autoactive");
    expect(getActiveSpan()).toBe(span);
    span.end();
  });
});

describe("childSpan", () => {
  it("creates a child of the current active span", () => {
    const parent = startActiveSpan("parent");
    const child = childSpan("child");

    expect(child.parentSpanId).toBe(parent.spanId);
    expect(child.traceId).toBe(parent.traceId);

    child.end();
    parent.end();
  });
});

// ============================================================================
// withSpan
// ============================================================================

describe("withSpan", () => {
  it("runs the function and returns its result", () => {
    const result = withSpan("compute", () => 42);
    expect(result).toBe(42);
  });

  it("ends the span after the function completes", () => {
    let capturedSpan: Span | undefined;
    withSpan("capture", (span) => {
      capturedSpan = span;
    });
    expect(capturedSpan!.getEndTime()).toBeDefined();
  });

  it("restores the previous active span after completion", () => {
    const outer = startActiveSpan("outer");
    withSpan("inner", () => {
      // Inside, the active span is the inner one
    });
    expect(getActiveSpan()).toBe(outer);
    outer.end();
  });

  it("sets error status and re-throws on failure", () => {
    let capturedSpan: Span | undefined;
    expect(() => {
      withSpan("failing", (span) => {
        capturedSpan = span;
        throw new Error("boom");
      });
    }).toThrow("boom");

    expect(capturedSpan!.getStatus()).toBe("error");
    expect(capturedSpan!.getEndTime()).toBeDefined();
  });
});

// ============================================================================
// Trace Context Helpers
// ============================================================================

describe("extractTraceContext", () => {
  it("returns traceId and spanId from a span", () => {
    const span = new Span("extract-op");
    const ctx = extractTraceContext(span);
    expect(ctx.traceId).toBe(span.traceId);
    expect(ctx.spanId).toBe(span.spanId);
  });
});

describe("Span.getContext", () => {
  it("returns SpanContext with traceId and spanId", () => {
    const span = new Span("ctx-op");
    const ctx = span.getContext();
    expect(ctx.traceId).toBe(span.traceId);
    expect(ctx.spanId).toBe(span.spanId);
  });
});

// ============================================================================
// inTraceContext
// ============================================================================

describe("inTraceContext", () => {
  it("sets a fresh trace context and runs the function", () => {
    const result = inTraceContext(() => {
      const ctx = getContext();
      expect(ctx).toBeDefined();
      expect(ctx!.traceId).toBeTruthy();
      expect(ctx!.spanId).toBeTruthy();
      return 99;
    });
    expect(result).toBe(99);
  });

  it("propagates errors from the inner function", () => {
    expect(() => {
      inTraceContext(() => {
        throw new Error("trace-error");
      });
    }).toThrow("trace-error");
  });
});
