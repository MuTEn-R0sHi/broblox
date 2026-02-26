/**
 * @broblox/events — Public API
 *
 * Scheduled in-game events with time-window management, feature-flag gates,
 * gameplay modifiers, and start/end callbacks.
 */

export type {
  EventModifiers,
  EventDefinition,
  EventStartCallback,
  EventEndCallback,
  EventTickResult,
} from "./types";

export { EventScheduler } from "./event-scheduler";

export { createEventService } from "./create-event-service";
export type { EventServiceConfig, EventServiceHandle } from "./create-event-service";
