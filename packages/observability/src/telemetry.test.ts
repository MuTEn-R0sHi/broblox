/**
 * Tests for observability/telemetry.ts
 *
 * Exercises sink management, event emission, convenience helpers,
 * ConsoleSink level filtering, and BatchedSink behaviour.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockPlayer, resetPlayerIdCounter } from "@rbx/testing";
import { initContext } from "./context";
import {
  registerSink,
  flushAll,
  emit,
  emitGame,
  emitPlayer,
  emitMatch,
  emitError,
  emitPerformance,
  emitSecurity,
  ConsoleSink,
  BatchedSink,
  useConsoleSink,
} from "./telemetry";
import type { TelemetrySink, TelemetryEvent } from "./types";

beforeEach(() => {
  resetPlayerIdCounter();
  initContext();
});

// ============================================================================
// Sink Registration
// ============================================================================

describe("registerSink / flushAll", () => {
  it("registers a sink and receives emitted events", () => {
    const events: TelemetryEvent[] = [];
    const sink: TelemetrySink = {
      emit: (e) => events.push(e),
      flush: vi.fn(),
    };

    const unsub = registerSink(sink);
    emit("game", "test_event", { foo: 1 });

    expect(events).toHaveLength(1);
    expect(events[0].name).toBe("test_event");
    expect(events[0].category).toBe("game");
    expect(events[0].data.foo).toBe(1);

    unsub();
  });

  it("unsubscribe removes the sink", () => {
    const events: TelemetryEvent[] = [];
    const sink: TelemetrySink = {
      emit: (e) => events.push(e),
      flush: vi.fn(),
    };

    const unsub = registerSink(sink);
    unsub();
    emit("game", "after_unsub");

    expect(events).toHaveLength(0);
  });

  it("flushAll calls flush on all registered sinks", () => {
    const flush1 = vi.fn();
    const flush2 = vi.fn();
    const unsub1 = registerSink({ emit: vi.fn(), flush: flush1 });
    const unsub2 = registerSink({ emit: vi.fn(), flush: flush2 });

    flushAll();

    expect(flush1).toHaveBeenCalled();
    expect(flush2).toHaveBeenCalled();

    unsub1();
    unsub2();
  });
});

// ============================================================================
// emit()
// ============================================================================

describe("emit", () => {
  let unsub: () => void;
  let events: TelemetryEvent[];

  beforeEach(() => {
    events = [];
    unsub = registerSink({ emit: (e) => events.push(e), flush: vi.fn() });
  });

  afterEach(() => unsub());

  it("includes timestamp and clock", () => {
    emit("game", "tick");
    expect(events[0].timestamp).toBeGreaterThan(0);
    expect(events[0].clock).toBeGreaterThanOrEqual(0);
  });

  it("defaults level to info", () => {
    emit("game", "default_level");
    expect(events[0].level).toBe("info");
  });

  it("allows overriding level", () => {
    emit("error", "bad_thing", {}, { level: "error" });
    expect(events[0].level).toBe("error");
  });

  it("attaches global context when no player/context provided", () => {
    emit("game", "global");
    expect(events[0].context.serverId).toBeDefined();
  });

  it("attaches player context when player option is set", () => {
    const player = createMockPlayer();
    emit("player", "joined", {}, { player });
    expect(events[0].context.playerId).toBe(player.UserId);
  });

  it("uses explicit context when provided", () => {
    const ctx = { traceId: "custom", serverId: "s", placeId: 0 };
    emit("game", "ctx_test", {}, { context: ctx });
    expect(events[0].context.traceId).toBe("custom");
  });
});

// ============================================================================
// Convenience Methods
// ============================================================================

describe("convenience emitters", () => {
  let unsub: () => void;
  let events: TelemetryEvent[];

  beforeEach(() => {
    events = [];
    unsub = registerSink({ emit: (e) => events.push(e), flush: vi.fn() });
  });

  afterEach(() => unsub());

  it("emitGame sends a game category event", () => {
    emitGame("round_start", { round: 1 });
    expect(events[0].category).toBe("game");
    expect(events[0].data.round).toBe(1);
  });

  it("emitPlayer includes playerName in data", () => {
    const player = createMockPlayer();
    emitPlayer(player, "level_up", { level: 5 });
    expect(events[0].category).toBe("player");
    expect(events[0].data.playerName).toBe(player.Name);
    expect(events[0].data.level).toBe(5);
  });

  it("emitMatch includes matchId in data", () => {
    emitMatch("m-123", "match_end", { winner: 42 });
    expect(events[0].data.matchId).toBe("m-123");
    expect(events[0].data.winner).toBe(42);
  });

  it("emitError uses error level", () => {
    emitError("something broke", { code: 500 });
    expect(events[0].level).toBe("error");
    expect(events[0].data.message).toBe("something broke");
  });

  it("emitPerformance includes durationMs", () => {
    emitPerformance("db_query", 42);
    expect(events[0].data.durationMs).toBe(42);
  });

  it("emitSecurity uses warn level and player context", () => {
    const player = createMockPlayer();
    emitSecurity("speed_hack", player, { speed: 999 });
    expect(events[0].level).toBe("warn");
    expect(events[0].context.playerId).toBe(player.UserId);
  });
});

// ============================================================================
// ConsoleSink
// ============================================================================

describe("ConsoleSink", () => {
  it("emits events above min level", () => {
    const sink = new ConsoleSink("warn");
    // Should not throw
    sink.emit({
      category: "error",
      name: "test",
      level: "error",
      timestamp: 1000,
      clock: 1,
      context: { traceId: "t", serverId: "s", placeId: 0 },
      data: {},
    });
  });

  it("skips events below min level", () => {
    const printSpy = vi.spyOn(globalThis, "print" as never).mockImplementation(() => {});
    const sink = new ConsoleSink("warn");
    sink.emit({
      category: "game",
      name: "debug_event",
      level: "debug",
      timestamp: 1000,
      clock: 1,
      context: { traceId: "t", serverId: "s", placeId: 0 },
      data: {},
    });
    // print should NOT have been called because debug < warn
    expect(printSpy).not.toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("flush is a no-op", () => {
    const sink = new ConsoleSink();
    expect(() => sink.flush()).not.toThrow();
  });
});

describe("useConsoleSink", () => {
  it("returns an unsubscribe function", () => {
    const unsub = useConsoleSink("error");
    expect(typeof unsub).toBe("function");
    unsub();
  });
});

// ============================================================================
// BatchedSink
// ============================================================================

describe("BatchedSink", () => {
  it("forwards events to target after reaching batch size", () => {
    const targetEmit = vi.fn();
    const targetFlush = vi.fn();
    const target: TelemetrySink = { emit: targetEmit, flush: targetFlush };

    const batched = new BatchedSink(target, 3, 9999);

    const makeEvent = (name: string): TelemetryEvent => ({
      category: "game",
      name,
      level: "info",
      timestamp: 1000,
      clock: 1,
      context: { traceId: "t", serverId: "s", placeId: 0 },
      data: {},
    });

    batched.emit(makeEvent("e1"));
    batched.emit(makeEvent("e2"));
    expect(targetEmit).not.toHaveBeenCalled();

    batched.emit(makeEvent("e3")); // triggers flush
    expect(targetEmit).toHaveBeenCalledTimes(3);
    expect(targetFlush).toHaveBeenCalled();

    batched.stop();
  });

  it("flush sends buffered events", () => {
    const targetEmit = vi.fn();
    const target: TelemetrySink = { emit: targetEmit, flush: vi.fn() };

    const batched = new BatchedSink(target, 100, 9999);
    batched.emit({
      category: "game",
      name: "e",
      level: "info",
      timestamp: 1,
      clock: 0,
      context: { traceId: "t", serverId: "s", placeId: 0 },
      data: {},
    });

    expect(targetEmit).not.toHaveBeenCalled();
    batched.flush();
    expect(targetEmit).toHaveBeenCalledTimes(1);

    batched.stop();
  });

  it("flush is a no-op when buffer is empty", () => {
    const targetEmit = vi.fn();
    const target: TelemetrySink = { emit: targetEmit, flush: vi.fn() };

    const batched = new BatchedSink(target, 10, 9999);
    batched.flush();
    expect(targetEmit).not.toHaveBeenCalled();
    batched.stop();
  });

  it("stop cancels the auto-flush thread and flushes remaining", () => {
    const targetEmit = vi.fn();
    const target: TelemetrySink = { emit: targetEmit, flush: vi.fn() };

    const batched = new BatchedSink(target, 100, 9999);
    batched.emit({
      category: "game",
      name: "leftover",
      level: "info",
      timestamp: 1,
      clock: 0,
      context: { traceId: "t", serverId: "s", placeId: 0 },
      data: {},
    });

    batched.stop();
    expect(targetEmit).toHaveBeenCalledTimes(1); // flushed on stop
  });
});
