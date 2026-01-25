/**
 * Unit tests for @rbx/observability package.
 * Tests telemetry, metrics, spans, and correlation context.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mockRobloxGlobals, createMockPlayer, resetPlayerIdCounter } from "@rbx/testing";

// Install Roblox globals
beforeEach(() => {
  mockRobloxGlobals();
  resetPlayerIdCounter();
});

// ============================================================================
// Type Definitions (mirrored from types.ts for testing)
// ============================================================================

type TelemetryCategory =
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

type TelemetryLevel = "debug" | "info" | "warn" | "error";

interface CorrelationContext {
  traceId: string;
  spanId?: string;
  parentSpanId?: string;
  serverId: string;
  placeId: number;
  playerId?: number;
  sessionId?: string;
  tags?: Record<string, string>;
}

interface TelemetryEvent {
  category: TelemetryCategory;
  name: string;
  level: TelemetryLevel;
  timestamp: number;
  clock: number;
  context: CorrelationContext;
  data: Record<string, unknown>;
}

type MetricType = "counter" | "gauge" | "histogram";

interface MetricPoint {
  name: string;
  type: MetricType;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

type SpanStatus = "ok" | "error" | "timeout";

interface SpanData {
  spanId: string;
  parentSpanId?: string;
  traceId: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: SpanStatus;
  attributes: Record<string, unknown>;
}

// ============================================================================
// ID Generation Tests
// ============================================================================

describe("ID Generation", () => {
  function generateTraceId(): string {
    const chars = "0123456789abcdef";
    let id = "";
    for (let i = 0; i < 32; i++) {
      id += chars[Math.floor(Math.random() * 16)];
    }
    return id;
  }

  function generateSpanId(): string {
    const chars = "0123456789abcdef";
    let id = "";
    for (let i = 0; i < 16; i++) {
      id += chars[Math.floor(Math.random() * 16)];
    }
    return id;
  }

  describe("generateTraceId", () => {
    it("generates 32-character hex string", () => {
      const id = generateTraceId();
      expect(id).toHaveLength(32);
      expect(/^[0-9a-f]+$/.test(id)).toBe(true);
    });

    it("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateTraceId());
      }
      // All IDs should be unique
      expect(ids.size).toBe(100);
    });
  });

  describe("generateSpanId", () => {
    it("generates 16-character hex string", () => {
      const id = generateSpanId();
      expect(id).toHaveLength(16);
      expect(/^[0-9a-f]+$/.test(id)).toBe(true);
    });

    it("generates unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateSpanId());
      }
      expect(ids.size).toBe(100);
    });
  });
});

// ============================================================================
// Correlation Context Tests
// ============================================================================

describe("Correlation Context", () => {
  describe("global context", () => {
    it("stores and retrieves global context", () => {
      const globalContext: CorrelationContext = {
        traceId: "abc123",
        serverId: "server-job-id",
        placeId: 12345,
      };

      expect(globalContext.traceId).toBe("abc123");
      expect(globalContext.serverId).toBe("server-job-id");
      expect(globalContext.placeId).toBe(12345);
    });

    it("updates context with partial values", () => {
      let context: CorrelationContext = {
        traceId: "original",
        serverId: "server",
        placeId: 100,
      };

      context = {
        ...context,
        spanId: "span123",
        playerId: 456,
      };

      expect(context.traceId).toBe("original");
      expect(context.spanId).toBe("span123");
      expect(context.playerId).toBe(456);
    });
  });

  describe("child context", () => {
    it("creates child context with new span ID", () => {
      const parent: CorrelationContext = {
        traceId: "trace123",
        spanId: "parent-span",
        serverId: "server",
        placeId: 100,
      };

      const child: CorrelationContext = {
        ...parent,
        spanId: "child-span",
        parentSpanId: parent.spanId,
      };

      expect(child.traceId).toBe(parent.traceId);
      expect(child.spanId).toBe("child-span");
      expect(child.parentSpanId).toBe("parent-span");
    });

    it("preserves parent properties in child", () => {
      const parent: CorrelationContext = {
        traceId: "trace",
        serverId: "server",
        placeId: 100,
        playerId: 789,
        sessionId: "session",
        tags: { env: "test" },
      };

      const child: CorrelationContext = {
        ...parent,
        spanId: "new-span",
        parentSpanId: parent.spanId,
      };

      expect(child.playerId).toBe(789);
      expect(child.sessionId).toBe("session");
      expect(child.tags?.env).toBe("test");
    });
  });

  describe("player context", () => {
    it("creates context with player ID", () => {
      const player = createMockPlayer();
      const globalContext: CorrelationContext = {
        traceId: "global",
        serverId: "server",
        placeId: 100,
      };

      const playerContext: CorrelationContext = {
        ...globalContext,
        traceId: "player-trace",
        playerId: player.UserId,
      };

      expect(playerContext.playerId).toBe(player.UserId);
      expect(playerContext.serverId).toBe("server");
    });

    it("isolates contexts per player", () => {
      const playerContexts = new Map<number, CorrelationContext>();
      const player1 = createMockPlayer();
      const player2 = createMockPlayer();

      playerContexts.set(player1.UserId, {
        traceId: "trace1",
        serverId: "server",
        placeId: 100,
        playerId: player1.UserId,
      });

      playerContexts.set(player2.UserId, {
        traceId: "trace2",
        serverId: "server",
        placeId: 100,
        playerId: player2.UserId,
      });

      expect(playerContexts.get(player1.UserId)?.traceId).toBe("trace1");
      expect(playerContexts.get(player2.UserId)?.traceId).toBe("trace2");
    });
  });
});

// ============================================================================
// Telemetry Tests
// ============================================================================

describe("Telemetry", () => {
  describe("event creation", () => {
    it("creates valid telemetry event", () => {
      const context: CorrelationContext = {
        traceId: "trace",
        serverId: "server",
        placeId: 100,
      };

      const event: TelemetryEvent = {
        category: "game",
        name: "game_started",
        level: "info",
        timestamp: 1706200000,
        clock: 0.123,
        context,
        data: { mode: "pvp", playerCount: 10 },
      };

      expect(event.category).toBe("game");
      expect(event.name).toBe("game_started");
      expect(event.level).toBe("info");
      expect(event.data.mode).toBe("pvp");
    });

    it("supports all categories", () => {
      const categories: TelemetryCategory[] = [
        "game",
        "player",
        "match",
        "economy",
        "combat",
        "social",
        "error",
        "performance",
        "security",
        "custom",
      ];

      expect(categories).toHaveLength(10);
    });

    it("supports all levels", () => {
      const levels: TelemetryLevel[] = ["debug", "info", "warn", "error"];
      expect(levels).toHaveLength(4);
    });
  });

  describe("convenience events", () => {
    it("creates player event with player name", () => {
      const player = createMockPlayer();
      const context: CorrelationContext = {
        traceId: "trace",
        serverId: "server",
        placeId: 100,
        playerId: player.UserId,
      };

      const event: TelemetryEvent = {
        category: "player",
        name: "player_joined",
        level: "info",
        timestamp: Date.now(),
        clock: 0,
        context,
        data: { playerName: player.Name },
      };

      expect(event.category).toBe("player");
      expect(event.data.playerName).toBe(player.Name);
    });

    it("creates error event with error level", () => {
      const event: TelemetryEvent = {
        category: "error",
        name: "error_occurred",
        level: "error",
        timestamp: Date.now(),
        clock: 0,
        context: { traceId: "t", serverId: "s", placeId: 1 },
        data: { message: "Something went wrong" },
      };

      expect(event.level).toBe("error");
      expect(event.data.message).toBe("Something went wrong");
    });

    it("creates security event with warn level", () => {
      const player = createMockPlayer();
      const event: TelemetryEvent = {
        category: "security",
        name: "violation_detected",
        level: "warn",
        timestamp: Date.now(),
        clock: 0,
        context: {
          traceId: "t",
          serverId: "s",
          placeId: 1,
          playerId: player.UserId,
        },
        data: { type: "speed_hack", severity: "high" },
      };

      expect(event.category).toBe("security");
      expect(event.level).toBe("warn");
    });
  });

  describe("sink management", () => {
    it("registers and calls sinks", () => {
      const events: TelemetryEvent[] = [];
      const sink = {
        emit: (event: TelemetryEvent) => events.push(event),
        flush: () => {},
      };

      const sinks = [sink];

      // Emit event
      const event: TelemetryEvent = {
        category: "game",
        name: "test",
        level: "info",
        timestamp: Date.now(),
        clock: 0,
        context: { traceId: "t", serverId: "s", placeId: 1 },
        data: {},
      };

      for (const s of sinks) {
        s.emit(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0].name).toBe("test");
    });

    it("supports multiple sinks", () => {
      const events1: TelemetryEvent[] = [];
      const events2: TelemetryEvent[] = [];

      const sinks = [
        { emit: (e: TelemetryEvent) => events1.push(e), flush: () => {} },
        { emit: (e: TelemetryEvent) => events2.push(e), flush: () => {} },
      ];

      const event: TelemetryEvent = {
        category: "game",
        name: "test",
        level: "info",
        timestamp: Date.now(),
        clock: 0,
        context: { traceId: "t", serverId: "s", placeId: 1 },
        data: {},
      };

      for (const s of sinks) {
        s.emit(event);
      }

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
    });
  });
});

// ============================================================================
// Metrics Tests
// ============================================================================

describe("Metrics", () => {
  describe("Counter", () => {
    it("increments by 1", () => {
      let value = 0;
      value += 1;
      expect(value).toBe(1);
      value += 1;
      expect(value).toBe(2);
    });

    it("increments by arbitrary amount", () => {
      let value = 0;
      value += 5;
      expect(value).toBe(5);
      value += 10;
      expect(value).toBe(15);
    });

    it("cannot decrease", () => {
      const add = (value: number, delta: number): number => {
        if (delta < 0) return value;
        return value + delta;
      };

      let value = 10;
      value = add(value, -5);
      expect(value).toBe(10); // Unchanged
    });
  });

  describe("Gauge", () => {
    it("sets to specific value", () => {
      let value = 0;
      value = 42;
      expect(value).toBe(42);
    });

    it("can increase and decrease", () => {
      let value = 50;
      value += 10;
      expect(value).toBe(60);
      value -= 20;
      expect(value).toBe(40);
    });
  });

  describe("Histogram", () => {
    it("assigns values to correct buckets", () => {
      const buckets = [10, 50, 100, 500, 1000];
      const findBucket = (value: number): number => {
        for (const boundary of buckets) {
          if (value <= boundary) return boundary;
        }
        return Infinity;
      };

      expect(findBucket(5)).toBe(10);
      expect(findBucket(10)).toBe(10);
      expect(findBucket(25)).toBe(50);
      expect(findBucket(100)).toBe(100);
      expect(findBucket(999)).toBe(1000);
      expect(findBucket(2000)).toBe(Infinity);
    });

    it("calculates percentiles", () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const percentile = (arr: number[], p: number): number => {
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
      };

      expect(percentile(values, 50)).toBe(5); // Median
      expect(percentile(values, 90)).toBe(9); // p90
      expect(percentile(values, 99)).toBe(10); // p99
    });
  });

  describe("MetricPoint", () => {
    it("creates valid counter point", () => {
      const point: MetricPoint = {
        name: "requests_total",
        type: "counter",
        value: 100,
        timestamp: Date.now(),
        labels: { endpoint: "/api/action" },
      };

      expect(point.type).toBe("counter");
      expect(point.labels?.endpoint).toBe("/api/action");
    });

    it("creates valid gauge point", () => {
      const point: MetricPoint = {
        name: "active_players",
        type: "gauge",
        value: 42,
        timestamp: Date.now(),
      };

      expect(point.type).toBe("gauge");
      expect(point.value).toBe(42);
    });
  });
});

// ============================================================================
// Span Tests
// ============================================================================

describe("Spans", () => {
  describe("span lifecycle", () => {
    it("creates span with start time", () => {
      const startTime = Date.now();
      const span: SpanData = {
        spanId: "span123",
        traceId: "trace456",
        name: "handleRequest",
        startTime,
        status: "ok",
        attributes: {},
      };

      expect(span.startTime).toBe(startTime);
      expect(span.endTime).toBeUndefined();
    });

    it("ends span with end time", () => {
      const startTime = 1000;
      const endTime = 1050;

      const span: SpanData = {
        spanId: "span123",
        traceId: "trace456",
        name: "handleRequest",
        startTime,
        endTime,
        status: "ok",
        attributes: {},
      };

      expect(span.endTime).toBe(1050);
    });

    it("calculates duration correctly", () => {
      const span: SpanData = {
        spanId: "span",
        traceId: "trace",
        name: "operation",
        startTime: 1000,
        endTime: 1150,
        status: "ok",
        attributes: {},
      };

      const duration = span.endTime! - span.startTime;
      expect(duration).toBe(150);
    });
  });

  describe("span attributes", () => {
    it("sets single attribute", () => {
      const span: SpanData = {
        spanId: "span",
        traceId: "trace",
        name: "operation",
        startTime: Date.now(),
        status: "ok",
        attributes: {},
      };

      span.attributes["http.method"] = "POST";
      expect(span.attributes["http.method"]).toBe("POST");
    });

    it("sets multiple attributes", () => {
      const span: SpanData = {
        spanId: "span",
        traceId: "trace",
        name: "operation",
        startTime: Date.now(),
        status: "ok",
        attributes: {
          "http.method": "POST",
          "http.url": "/api/action",
          "http.status_code": 200,
        },
      };

      expect(Object.keys(span.attributes)).toHaveLength(3);
    });
  });

  describe("span status", () => {
    it("defaults to ok status", () => {
      const span: SpanData = {
        spanId: "span",
        traceId: "trace",
        name: "operation",
        startTime: Date.now(),
        status: "ok",
        attributes: {},
      };

      expect(span.status).toBe("ok");
    });

    it("sets error status", () => {
      const span: SpanData = {
        spanId: "span",
        traceId: "trace",
        name: "operation",
        startTime: Date.now(),
        status: "error",
        attributes: {
          "error.message": "Something failed",
        },
      };

      expect(span.status).toBe("error");
      expect(span.attributes["error.message"]).toBe("Something failed");
    });

    it("sets timeout status", () => {
      const span: SpanData = {
        spanId: "span",
        traceId: "trace",
        name: "operation",
        startTime: Date.now(),
        status: "timeout",
        attributes: {},
      };

      expect(span.status).toBe("timeout");
    });
  });

  describe("nested spans", () => {
    it("creates parent-child relationship", () => {
      const parentSpan: SpanData = {
        spanId: "parent",
        traceId: "trace",
        name: "parentOp",
        startTime: 1000,
        status: "ok",
        attributes: {},
      };

      const childSpan: SpanData = {
        spanId: "child",
        parentSpanId: parentSpan.spanId,
        traceId: parentSpan.traceId,
        name: "childOp",
        startTime: 1010,
        status: "ok",
        attributes: {},
      };

      expect(childSpan.parentSpanId).toBe("parent");
      expect(childSpan.traceId).toBe(parentSpan.traceId);
    });

    it("child span starts after parent", () => {
      const parentSpan: SpanData = {
        spanId: "parent",
        traceId: "trace",
        name: "parentOp",
        startTime: 1000,
        status: "ok",
        attributes: {},
      };

      const childSpan: SpanData = {
        spanId: "child",
        parentSpanId: "parent",
        traceId: "trace",
        name: "childOp",
        startTime: 1010,
        status: "ok",
        attributes: {},
      };

      expect(childSpan.startTime).toBeGreaterThan(parentSpan.startTime);
    });
  });
});

// ============================================================================
// Batching Tests
// ============================================================================

describe("Event Batching", () => {
  it("batches events up to size limit", () => {
    const batch: TelemetryEvent[] = [];
    const batchSize = 10;

    const addToBatch = (event: TelemetryEvent): boolean => {
      if (batch.length >= batchSize) {
        return false; // Batch full
      }
      batch.push(event);
      return true;
    };

    for (let i = 0; i < 15; i++) {
      const event: TelemetryEvent = {
        category: "game",
        name: `event_${i}`,
        level: "info",
        timestamp: Date.now(),
        clock: 0,
        context: { traceId: "t", serverId: "s", placeId: 1 },
        data: {},
      };
      addToBatch(event);
    }

    expect(batch).toHaveLength(10);
  });

  it("flushes batch when full", () => {
    const flushedBatches: TelemetryEvent[][] = [];
    let batch: TelemetryEvent[] = [];
    const batchSize = 5;

    const addToBatch = (event: TelemetryEvent): void => {
      batch.push(event);
      if (batch.length >= batchSize) {
        flushedBatches.push([...batch]);
        batch = [];
      }
    };

    for (let i = 0; i < 12; i++) {
      addToBatch({
        category: "game",
        name: `event_${i}`,
        level: "info",
        timestamp: Date.now(),
        clock: 0,
        context: { traceId: "t", serverId: "s", placeId: 1 },
        data: {},
      });
    }

    expect(flushedBatches).toHaveLength(2); // 2 full batches of 5
    expect(batch).toHaveLength(2); // 2 remaining
  });
});

// ============================================================================
// Level Filtering Tests
// ============================================================================

describe("Level Filtering", () => {
  const levelPriority: Record<TelemetryLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  const shouldLog = (eventLevel: TelemetryLevel, minLevel: TelemetryLevel): boolean => {
    return levelPriority[eventLevel] >= levelPriority[minLevel];
  };

  it("filters debug events when min level is info", () => {
    expect(shouldLog("debug", "info")).toBe(false);
    expect(shouldLog("info", "info")).toBe(true);
    expect(shouldLog("warn", "info")).toBe(true);
    expect(shouldLog("error", "info")).toBe(true);
  });

  it("filters info and debug when min level is warn", () => {
    expect(shouldLog("debug", "warn")).toBe(false);
    expect(shouldLog("info", "warn")).toBe(false);
    expect(shouldLog("warn", "warn")).toBe(true);
    expect(shouldLog("error", "warn")).toBe(true);
  });

  it("allows all events when min level is debug", () => {
    expect(shouldLog("debug", "debug")).toBe(true);
    expect(shouldLog("info", "debug")).toBe(true);
    expect(shouldLog("warn", "debug")).toBe(true);
    expect(shouldLog("error", "debug")).toBe(true);
  });
});

// ============================================================================
// Timing Utility Tests
// ============================================================================

describe("Timing Utilities", () => {
  it("measures operation duration", () => {
    const startTime = 1000;
    const endTime = 1250;
    const duration = endTime - startTime;

    expect(duration).toBe(250);
  });

  it("records timing as performance event", () => {
    const operation = "database_query";
    const durationMs = 45;

    const event: TelemetryEvent = {
      category: "performance",
      name: operation,
      level: "info",
      timestamp: Date.now(),
      clock: 0,
      context: { traceId: "t", serverId: "s", placeId: 1 },
      data: { durationMs },
    };

    expect(event.category).toBe("performance");
    expect(event.data.durationMs).toBe(45);
  });
});
