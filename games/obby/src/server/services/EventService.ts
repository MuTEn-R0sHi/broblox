/**
 * Obby Game — EventService
 *
 * Defines the scheduled events for the obby game and wires them into
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
    id: "obby-xp-boost-2026-q1",
    label: "Obby XP Boost",
    // Stage completion yields 2× XP for this 48-hour window
    startTime: 1740873600, // 2026-03-01 00:00 UTC
    endTime: 1741046400, // 2026-03-03 00:00 UTC
    modifiers: { xpMultiplier: 2 },
    featureFlagId: "event.obby-xp-boost",
  },
  {
    id: "obby-coin-rush-2026-q1",
    label: "Coin Rush",
    // Coins collected in stages are worth 1.5× for 24 hours
    startTime: 1741219200, // 2026-03-05 00:00 UTC
    endTime: 1741305600, // 2026-03-06 00:00 UTC
    modifiers: { coinMultiplier: 1.5 },
    featureFlagId: "event.obby-coin-rush",
  },
  {
    id: "obby-speedrun-2026-q1",
    label: "Speedrun Challenge",
    // Top completion times tracked; no modifier — just for leaderboard prestige
    startTime: 1741392000, // 2026-03-07 00:00 UTC
    endTime: 1741564800, // 2026-03-09 00:00 UTC
    featureFlagId: "event.obby-speedrun",
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
