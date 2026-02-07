/**
 * Correlation Context
 *
 * Manages context that flows through all operations for distributed tracing.
 */

import { CorrelationContext } from "./types";
import { rbxSize } from "./runtime";

// ============================================================================
// Context Storage
// ============================================================================

/** Current global context */
let globalContext: CorrelationContext = {
  traceId: "",
  serverId: "",
  placeId: 0,
};

/** Per-player contexts */
const playerContexts = new Map<number, CorrelationContext>();

// ============================================================================
// Context Management
// ============================================================================

/**
 * Initialize the global correlation context.
 * Call this once at server/client startup.
 */
export function initContext(): void {
  globalContext = {
    traceId: generateTraceId(),
    serverId: game.JobId,
    placeId: game.PlaceId,
  };
}

/**
 * Get the current global context.
 */
export function getContext(): CorrelationContext {
  return globalContext;
}

/**
 * Update the global context with new values.
 */
export function setContext(updates: Partial<CorrelationContext>): void {
  globalContext = {
    ...globalContext,
    ...updates,
  };
}

/**
 * Create a child context with a new span ID.
 */
export function createChildContext(parentContext?: CorrelationContext): CorrelationContext {
  const parent = parentContext ?? globalContext;
  return {
    ...parent,
    spanId: generateSpanId(),
    parentSpanId: parent.spanId,
  };
}

// ============================================================================
// Player Context
// ============================================================================

/**
 * Get or create a context for a specific player.
 */
export function getPlayerContext(player: Player): CorrelationContext {
  let context = playerContexts.get(player.UserId);
  if (!context) {
    context = {
      ...globalContext,
      traceId: generateTraceId(),
      playerId: player.UserId,
    };
    playerContexts.set(player.UserId, context);
  }
  return context;
}

/**
 * Update a player's context.
 */
export function setPlayerContext(player: Player, updates: Partial<CorrelationContext>): void {
  const current = getPlayerContext(player);
  playerContexts.set(player.UserId, {
    ...current,
    ...updates,
  });
}

/**
 * Remove a player's context (call on leave).
 */
export function clearPlayerContext(player: Player): void {
  playerContexts.delete(player.UserId);
}

// ============================================================================
// Tags
// ============================================================================

/**
 * Add a tag to the global context.
 */
export function addTag(key: string, value: string): void {
  if (!globalContext.tags) {
    globalContext.tags = {};
  }
  globalContext.tags[key] = value;
}

/**
 * Add a tag to a player's context.
 */
export function addPlayerTag(player: Player, key: string, value: string): void {
  const context = getPlayerContext(player);
  if (!context.tags) {
    context.tags = {};
  }
  context.tags[key] = value;
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique trace ID.
 * Format: timestamp_random
 */
export function generateTraceId(): string {
  return `${os.time()}_${math.random(100000, 999999)}`;
}

/**
 * Generate a unique span ID.
 * Format: random 8 characters
 */
export function generateSpanId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    const idx = math.random(1, rbxSize(chars));
    result += chars.sub(idx, idx);
  }
  return result;
}
