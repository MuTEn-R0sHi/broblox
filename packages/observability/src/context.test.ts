/**
 * Tests for observability/context.ts
 *
 * Exercises correlation context lifecycle: init, get/set, child contexts,
 * player contexts, tags, and ID generation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createMockPlayer, resetPlayerIdCounter } from "@broblox/testing";
import {
  initContext,
  getContext,
  setContext,
  createChildContext,
  getPlayerContext,
  setPlayerContext,
  clearPlayerContext,
  addTag,
  addPlayerTag,
  generateTraceId,
  generateSpanId,
} from "./context";

beforeEach(() => {
  resetPlayerIdCounter();
  // Re-init to start each test with a fresh global context
  initContext();
});

// ============================================================================
// ID Generation
// ============================================================================

describe("generateTraceId", () => {
  it("returns a string containing an underscore separator", () => {
    const id = generateTraceId();
    expect(id).toContain("_");
  });

  it("produces unique IDs on successive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateTraceId()));
    expect(ids.size).toBeGreaterThanOrEqual(15); // high-probability uniqueness
  });
});

describe("generateSpanId", () => {
  it("returns an 8-character alphanumeric string", () => {
    const id = generateSpanId();
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[a-z0-9]+$/);
  });

  it("produces unique IDs", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateSpanId()));
    expect(ids.size).toBeGreaterThanOrEqual(15);
  });
});

// ============================================================================
// Global Context
// ============================================================================

describe("initContext / getContext", () => {
  it("sets serverId and placeId from game globals", () => {
    const ctx = getContext();
    expect(ctx.serverId).toBeDefined();
    expect(ctx.placeId).toBeDefined();
  });

  it("generates a traceId on init", () => {
    const ctx = getContext();
    expect(ctx.traceId).toBeTruthy();
    expect(ctx.traceId).toContain("_");
  });
});

describe("setContext", () => {
  it("merges partial updates into the global context", () => {
    setContext({ sessionId: "sess-1" });
    const ctx = getContext();
    expect(ctx.sessionId).toBe("sess-1");
    // Original fields preserved
    expect(ctx.traceId).toBeTruthy();
  });

  it("can overwrite traceId", () => {
    setContext({ traceId: "custom-trace" });
    expect(getContext().traceId).toBe("custom-trace");
  });
});

// ============================================================================
// Child Context
// ============================================================================

describe("createChildContext", () => {
  it("inherits the parent traceId", () => {
    const parent = getContext();
    const child = createChildContext();
    expect(child.traceId).toBe(parent.traceId);
  });

  it("assigns a new spanId", () => {
    const child = createChildContext();
    expect(child.spanId).toBeTruthy();
  });

  it("sets parentSpanId to the parent spanId", () => {
    setContext({ spanId: "parent-span" });
    const child = createChildContext();
    expect(child.parentSpanId).toBe("parent-span");
  });

  it("accepts an explicit parent context", () => {
    const custom = {
      traceId: "t1",
      spanId: "s1",
      serverId: "srv",
      placeId: 123,
    };
    const child = createChildContext(custom);
    expect(child.traceId).toBe("t1");
    expect(child.parentSpanId).toBe("s1");
  });
});

// ============================================================================
// Player Context
// ============================================================================

describe("getPlayerContext", () => {
  it("creates a context with the player's UserId", () => {
    const player = createMockPlayer();
    const ctx = getPlayerContext(player);
    expect(ctx.playerId).toBe(player.UserId);
  });

  it("returns the same context on subsequent calls", () => {
    const player = createMockPlayer();
    const ctx1 = getPlayerContext(player);
    const ctx2 = getPlayerContext(player);
    expect(ctx1).toBe(ctx2);
  });

  it("inherits global context fields", () => {
    const global = getContext();
    const player = createMockPlayer();
    const ctx = getPlayerContext(player);
    expect(ctx.serverId).toBe(global.serverId);
  });
});

describe("setPlayerContext", () => {
  it("merges updates into the player context", () => {
    const player = createMockPlayer();
    setPlayerContext(player, { sessionId: "player-sess" });
    const ctx = getPlayerContext(player);
    expect(ctx.sessionId).toBe("player-sess");
    expect(ctx.playerId).toBe(player.UserId);
  });
});

describe("clearPlayerContext", () => {
  it("removes the player context so a new one is created next time", () => {
    const player = createMockPlayer();
    const ctx1 = getPlayerContext(player);
    clearPlayerContext(player);
    const ctx2 = getPlayerContext(player);
    expect(ctx2).not.toBe(ctx1);
  });
});

// ============================================================================
// Tags
// ============================================================================

describe("addTag", () => {
  it("adds a tag to the global context", () => {
    addTag("env", "production");
    expect(getContext().tags?.env).toBe("production");
  });

  it("preserves existing tags", () => {
    addTag("a", "1");
    addTag("b", "2");
    const tags = getContext().tags;
    expect(tags?.a).toBe("1");
    expect(tags?.b).toBe("2");
  });
});

describe("addPlayerTag", () => {
  it("adds a tag to a player context", () => {
    const player = createMockPlayer();
    addPlayerTag(player, "tier", "gold");
    const ctx = getPlayerContext(player);
    expect(ctx.tags?.tier).toBe("gold");
  });
});
