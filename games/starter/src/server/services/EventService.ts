/**
 * Starter Game — EventService
 *
 * Defines the scheduled events for the starter game and wires them into
 * the player lifecycle. Add or remove EventDefinitions here to schedule
 * new events; the factory handles activation/deactivation automatically.
 */

import { createEventService } from "@broblox/events";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";
import type { EventDefinition } from "@broblox/events";

// ============================================================================
// Event Definitions
// ============================================================================

const EVENTS: EventDefinition[] = [
  {
    id: "double-xp-2026-q1",
    label: "Double XP Weekend",
    // Runs the first weekend of March 2026
    startTime: 1740873600, // 2026-03-01 00:00 UTC
    endTime: 1741046400, // 2026-03-02 24:00 UTC
    modifiers: { xpMultiplier: 2 },
    featureFlagId: "event.double-xp",
  },
  {
    id: "bonus-coins-2026-q1",
    label: "Bonus Coins Event",
    startTime: 1741219200, // 2026-03-05 00:00 UTC
    endTime: 1741305600, // 2026-03-06 00:00 UTC
    modifiers: { coinMultiplier: 1.5 },
    featureFlagId: "event.bonus-coins",
  },
  {
    id: "lucky-drops-2026-q1",
    label: "Lucky Drops",
    startTime: 1741392000, // 2026-03-07 00:00 UTC
    endTime: 1741564800, // 2026-03-09 00:00 UTC
    modifiers: { dropRateMultiplier: 2, xpMultiplier: 1.25 },
    featureFlagId: "event.lucky-drops",
  },
];

// ============================================================================
// Service
// ============================================================================

const handle = createEventService({
  events: EVENTS,

  onEventStart: (ev) => {
    RemoteService.getRegistry().fireAllClients("EventStarted", {
      id: ev.id,
      label: ev.label,
      modifiers: ev.modifiers as Record<string, unknown> | undefined,
    });
  },

  onEventEnd: (ev) => {
    RemoteService.getRegistry().fireAllClients("EventEnded", {
      id: ev.id,
      label: ev.label,
      modifiers: ev.modifiers as Record<string, unknown> | undefined,
    });
  },

  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const EventService = handle.Service;

/** Get the currently active events (safe to call from other services). */
export const getActiveEvents = () => handle.getActiveEvents();

/** Check whether a specific event is active right now. */
export const isEventActive = (id: string) => handle.isEventActive(id);

/** Access the underlying scheduler (for tests/dev tools). */
export const getEventScheduler = () => handle.getScheduler();
