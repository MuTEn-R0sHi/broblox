/**
 * @rbx/events — createEventService factory
 *
 * Creates a Roblox Service that polls for event transitions on a configurable
 * interval, fires `onEventStart` / `onEventEnd` callbacks, and exposes
 * scheduler queries to the rest of the game.
 *
 * Integrates with:
 *   - `@rbx/config-featureflags` — per-event kill-switch via `featureFlagId`
 *   - Player lifecycle hooks (reserved; future per-player event state)
 */

import { Service, createLogger, arraySize } from "@rbx/core";
import { isFlagEnabled } from "@rbx/config-featureflags";
import { EventDefinition, EventStartCallback, EventEndCallback } from "./types";
import { EventScheduler } from "./event-scheduler";

// ============================================================================
// Config
// ============================================================================

export interface EventServiceConfig {
  /** Event definitions to schedule. */
  events: EventDefinition[];
  /**
   * How often (in seconds) the service polls for event transitions.
   * Defaults to 60 s.
   */
  pollIntervalSeconds?: number;
  /** Called when an event transitions inactive → active. */
  onEventStart?: EventStartCallback;
  /** Called when an event transitions active → inactive. */
  onEventEnd?: EventEndCallback;
  /**
   * Wires player-leave hook (reserved for future per-player event state).
   * Typically: `(cb) => PlayerLifecycleService.onPlayerRemoving(cb)`
   */
  onPlayerRemoving?: (callback: (player: Player) => void) => void;
  /**
   * Wires player-join hook — notifies the caller when a player joins while
   * one or more events are active.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerAdded(cb)`
   */
  onPlayerAdded?: (callback: (player: Player) => void) => void;
}

// ============================================================================
// Handle
// ============================================================================

export interface EventServiceHandle {
  /** The Service object — register with your game's Application. */
  Service: Service;
  /** Access the underlying EventScheduler. */
  getScheduler(): EventScheduler;
  /** Convenience: returns all currently active events at call time. */
  getActiveEvents(): EventDefinition[];
  /** Convenience: true if the event with `id` is currently active. */
  isEventActive(id: string): boolean;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an event service.
 *
 * @example
 * ```ts
 * const handle = createEventService({
 *   events: [
 *     {
 *       id: "double-xp-2026-02",
 *       label: "Double XP Weekend",
 *       startTime: 1740700800,
 *       endTime:   1740873600,
 *       modifiers: { xpMultiplier: 2 },
 *     },
 *   ],
 *   onEventStart: (ev) => logger.info(`Event started: ${ev.label}`),
 *   onEventEnd:   (ev) => logger.info(`Event ended: ${ev.label}`),
 *   onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
 *   onPlayerAdded:    (cb) => PlayerLifecycleService.onPlayerAdded(cb),
 * });
 * export const EventService = handle.Service;
 * ```
 */
export function createEventService(config: EventServiceConfig): EventServiceHandle {
  const logger = createLogger("EventService");
  const scheduler = new EventScheduler(config.events);
  const pollSeconds = config.pollIntervalSeconds ?? 60;

  // Runs one tick and fires callbacks for any transitions.
  function runTick(): void {
    const now = os.time();
    const { started, ended } = scheduler.tick(now, isFlagEnabled);

    for (const def of started) {
      logger.info(`Event started: "${def.label}" (${def.id})`);
      config.onEventStart?.(def);
    }

    for (const def of ended) {
      logger.info(`Event ended: "${def.label}" (${def.id})`);
      config.onEventEnd?.(def);
    }
  }

  // Recursive task.delay loop — starts in onStart, runs for server lifetime.
  function schedulePoll(): void {
    task.delay(pollSeconds, () => {
      runTick();
      schedulePoll();
    });
  }

  const handle: EventServiceHandle = {
    Service: {
      name: "EventService",

      onInit() {
        // Reserve player-removing hook for future per-player event state.
        config.onPlayerRemoving?.((player) => {
          logger.debug(`Player ${player.UserId} removed — no per-player event state to clean.`);
        });

        logger.info(`EventService initialized — ${arraySize(config.events)} event(s) scheduled.`);
      },

      onStart() {
        // Notify caller when a player joins during an active event.
        config.onPlayerAdded?.((player) => {
          const active = scheduler.getActiveEvents(os.time());
          if (arraySize(active) > 0) {
            logger.debug(`Player ${player.UserId} joined — ${arraySize(active)} event(s) active.`);
          }
        });

        // Run an immediate first tick so transitions don't wait for the first
        // poll interval.
        runTick();

        // Start the recurring poll loop.
        schedulePoll();

        logger.info(`EventService started — polling every ${pollSeconds}s.`);
      },

      onDestroy() {
        scheduler.reset();
        logger.info("EventService stopped.");
      },
    },

    getScheduler() {
      return scheduler;
    },

    getActiveEvents() {
      return scheduler.getActiveEvents(os.time());
    },

    isEventActive(id: string) {
      return scheduler.isEventActive(id, os.time());
    },
  };

  return handle;
}
