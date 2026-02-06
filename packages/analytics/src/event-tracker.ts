/**
 * Event Tracker
 *
 * Structured event tracking with optional schema validation.
 * Fires events to registered callbacks and optionally forwards
 * them to @rbx/observability telemetry sinks.
 */

import { createLogger } from "@rbx/core";
import { Counter } from "@rbx/observability";
import { emit } from "@rbx/observability";
import type { AnalyticsEvent, EventCategory, EventDefinition, AnalyticsConfig } from "./types";

// Roblox globals
declare const game: {
  JobId: string;
};

const eventsTracked = new Counter("analytics_events_tracked");
const eventsDropped = new Counter("analytics_events_dropped");

/**
 * Tracks structured analytics events with optional schema enforcement.
 */
export class EventTracker {
  private definitions = new Map<string, EventDefinition>();
  private config: AnalyticsConfig;
  private logger: ReturnType<typeof createLogger> | undefined;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    if (config.enableLogging) {
      this.logger = createLogger("EventTracker");
    }
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /**
   * Register an event definition for validation.
   */
  registerEvent(def: EventDefinition): void {
    this.definitions.set(def.name, def);
    this.logger?.info(`Registered event: ${def.name}`);
  }

  /**
   * Register multiple event definitions.
   */
  registerEvents(defs: EventDefinition[]): void {
    for (const def of defs) {
      this.registerEvent(def);
    }
  }

  /**
   * Get a registered event definition.
   */
  getDefinition(name: string): EventDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * List all registered event names.
   */
  listEvents(): string[] {
    const names: string[] = [];
    this.definitions.forEach((_, key) => names.push(key));
    return names;
  }

  // --------------------------------------------------------------------------
  // Tracking
  // --------------------------------------------------------------------------

  /**
   * Track a single event. If a definition is registered for the event name,
   * the event's data fields are validated against expectedFields.
   */
  track(
    name: string,
    playerId: number,
    data: Record<string, unknown> = {},
    categoryOverride?: EventCategory
  ): void {
    const def = this.definitions.get(name);
    const category = categoryOverride ?? def?.category ?? "custom";

    // Warn on unknown events (loose tracking is allowed)
    if (!def && this.logger) {
      this.logger.warn(`Unregistered event: ${name}`);
    }

    // Validate expected fields
    if (def?.expectedFields) {
      for (const field of def.expectedFields) {
        if (data[field] === undefined) {
          this.logger?.warn(`Event "${name}" missing expected field "${field}"`);
        }
      }
    }

    const event: AnalyticsEvent = {
      name,
      category,
      playerId,
      data,
      timestamp: os.time(),
      serverId: this.getServerId(),
    };

    eventsTracked.inc();

    // Callback
    if (this.config.onEvent) {
      const [ok] = pcall(() => this.config.onEvent!(event));
      if (!ok) {
        eventsDropped.inc();
      }
    }

    // Forward to observability telemetry
    if (this.config.forwardToTelemetry) {
      this.forwardToTelemetry(event);
    }

    this.logger?.info(`Tracked: ${name} (player ${playerId})`);
  }

  /**
   * Track a batch of events.
   */
  trackBatch(
    events: Array<{ name: string; playerId: number; data?: Record<string, unknown> }>
  ): void {
    for (const e of events) {
      this.track(e.name, e.playerId, e.data);
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private getServerId(): string {
    const [ok, id] = pcall(() => game.JobId);
    return ok ? (id as string) : "unknown";
  }

  private forwardToTelemetry(event: AnalyticsEvent): void {
    pcall(() => {
      emit(
        event.category === "custom"
          ? "game"
          : (event.category as
              | "game"
              | "player"
              | "match"
              | "economy"
              | "combat"
              | "social"
              | "error"
              | "performance"
              | "security"
              | "custom"),
        event.name,
        { ...event.data, playerId: event.playerId },
        { level: "info" }
      );
    });
  }
}
