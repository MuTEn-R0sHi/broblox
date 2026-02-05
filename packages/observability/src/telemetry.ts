/**
 * Telemetry System
 *
 * Structured event logging with batching and sinks.
 */

import {
  TelemetryCategory,
  TelemetryLevel,
  TelemetryEvent,
  TelemetrySink,
  CorrelationContext,
} from "./types";
import { getContext, getPlayerContext } from "./context";
import { rbxSize } from "./runtime";

// Declare Roblox globals for JSON encoding
declare const game: {
  GetService(name: "HttpService"): {
    JSONEncode(value: unknown): string;
  };
};

// ============================================================================
// Sink Management
// ============================================================================

const sinks: TelemetrySink[] = [];

/**
 * Register a telemetry sink.
 */
export function registerSink(sink: TelemetrySink): () => void {
  sinks.push(sink);
  return () => {
    const index = sinks.indexOf(sink);
    if (index >= 0) {
      sinks.remove(index);
    }
  };
}

/**
 * Flush all sinks.
 */
export function flushAll(): void {
  for (const sink of sinks) {
    pcall(() => sink.flush());
  }
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit a telemetry event.
 */
export function emit(
  category: TelemetryCategory,
  name: string,
  data: Record<string, unknown> = {},
  options?: {
    level?: TelemetryLevel;
    context?: CorrelationContext;
    player?: Player;
  }
): void {
  const context =
    options?.context ?? (options?.player ? getPlayerContext(options.player) : getContext());

  const event: TelemetryEvent = {
    category,
    name,
    level: options?.level ?? "info",
    timestamp: os.time(),
    clock: os.clock(),
    context,
    data,
  };

  // Send to all sinks
  for (const sink of sinks) {
    pcall(() => sink.emit(event));
  }
}

// ============================================================================
// Convenience Methods
// ============================================================================

/**
 * Emit a game event.
 */
export function emitGame(name: string, data?: Record<string, unknown>): void {
  emit("game", name, data);
}

/**
 * Emit a player event.
 */
export function emitPlayer(player: Player, name: string, data?: Record<string, unknown>): void {
  emit("player", name, { ...data, playerName: player.Name }, { player });
}

/**
 * Emit a match event.
 */
export function emitMatch(matchId: string, name: string, data?: Record<string, unknown>): void {
  emit("match", name, { ...data, matchId });
}

/**
 * Emit an error event.
 */
export function emitError(
  errorMessage: string,
  errorData?: Record<string, unknown>,
  player?: Player
): void {
  emit(
    "error",
    "error_occurred",
    { message: errorMessage, ...errorData },
    { level: "error", player }
  );
}

/**
 * Emit a performance event.
 */
export function emitPerformance(
  operation: string,
  durationMs: number,
  data?: Record<string, unknown>
): void {
  emit("performance", operation, { durationMs, ...data });
}

/**
 * Emit a security event.
 */
export function emitSecurity(
  eventName: string,
  player: Player,
  data?: Record<string, unknown>
): void {
  emit("security", eventName, data, { level: "warn", player });
}

// ============================================================================
// Console Sink (Default)
// ============================================================================

/**
 * Simple console sink that prints events as JSON.
 */
export class ConsoleSink implements TelemetrySink {
  private minLevel: TelemetryLevel;
  private levelPriority: Record<TelemetryLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(minLevel: TelemetryLevel = "info") {
    this.minLevel = minLevel;
  }

  emit(event: TelemetryEvent): void {
    if (this.levelPriority[event.level] < this.levelPriority[this.minLevel]) {
      return;
    }

    const HttpService = game.GetService("HttpService");
    const [success, json] = pcall(() => HttpService.JSONEncode(event));

    if (success) {
      print(`[TELEMETRY] ${json}`);
    } else {
      print(`[TELEMETRY] ${event.category}:${event.name}`);
    }
  }

  flush(): void {
    // Console sink has no buffer
  }
}

/**
 * Create and register a console sink.
 */
export function useConsoleSink(minLevel?: TelemetryLevel): () => void {
  return registerSink(new ConsoleSink(minLevel));
}

// ============================================================================
// Batched Sink
// ============================================================================

/**
 * Sink that batches events before forwarding to another sink.
 */
export class BatchedSink implements TelemetrySink {
  private buffer: TelemetryEvent[] = [];
  private flushThread?: thread;

  constructor(
    private target: TelemetrySink,
    private maxBatchSize = 10,
    private flushIntervalSec = 5
  ) {
    this.startAutoFlush();
  }

  emit(event: TelemetryEvent): void {
    this.buffer.push(event);

    if (rbxSize(this.buffer) >= this.maxBatchSize) {
      this.flush();
    }
  }

  flush(): void {
    if (rbxSize(this.buffer) === 0) {
      return;
    }

    const events = this.buffer;
    this.buffer = [];

    for (const event of events) {
      this.target.emit(event);
    }
    this.target.flush();
  }

  stop(): void {
    if (this.flushThread) {
      task.cancel(this.flushThread);
      this.flushThread = undefined;
    }
    this.flush();
  }

  private startAutoFlush(): void {
    this.flushThread = task.spawn(() => {
      while (this.flushThread !== undefined) {
        task.wait(this.flushIntervalSec);
        this.flush();
      }
    });
  }
}
