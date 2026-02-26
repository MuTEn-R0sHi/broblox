/**
 * @broblox/events — EventScheduler
 *
 * Pure-logic scheduler: compares event time windows against the current
 * server time and maintains which events are currently active.  Has no
 * Roblox API dependencies so it can be unit-tested in Node/Vitest.
 */

import { EventDefinition, EventTickResult } from "./types";

export class EventScheduler {
  private events: EventDefinition[];
  private activeIds: Set<string>;

  constructor(events: EventDefinition[] = []) {
    this.events = [...events];
    this.activeIds = new Set();
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  /** Add a new event definition at runtime. */
  addEvent(def: EventDefinition): void {
    const exists = this.events.find((e) => e.id === def.id);
    if (!exists) {
      this.events.push(def);
    }
  }

  /** Remove an event definition by id. */
  removeEvent(id: string): void {
    this.events = this.events.filter((e) => e.id !== id);
    this.activeIds.delete(id);
  }

  /** All registered event definitions. */
  getScheduledEvents(): EventDefinition[] {
    return [...this.events];
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /**
   * Returns all events whose window contains `now` (flag check not applied
   * here — flag evaluation happens in `tick`).
   */
  getActiveEvents(now: number): EventDefinition[] {
    return this.events.filter((e) => now >= e.startTime && now < e.endTime);
  }

  /**
   * True when the event with the given id is within its time window.
   * Flag check not applied.
   */
  isEventActive(id: string, now: number): boolean {
    const def = this.events.find((e) => e.id === id);
    if (def === undefined) return false;
    return now >= def.startTime && now < def.endTime;
  }

  /** Returns the set of currently-tracked active event ids. */
  getActiveIds(): ReadonlySet<string> {
    return this.activeIds;
  }

  // --------------------------------------------------------------------------
  // Tick
  // --------------------------------------------------------------------------

  /**
   * Evaluate all events at the given timestamp.
   *
   * @param now - Current Unix time in seconds.
   * @param isFlagEnabled - Predicate for feature-flag gate (pass
   *   `isFlagEnabled` from `@broblox/config-featureflags`).
   * @returns Lists of events that started or ended this tick.
   */
  tick(now: number, isFlagEnabled: (name: string) => boolean): EventTickResult {
    const started: EventDefinition[] = [];
    const ended: EventDefinition[] = [];

    for (const def of this.events) {
      const flagOk = def.featureFlagId ? isFlagEnabled(def.featureFlagId) : true;
      const timeOk = now >= def.startTime && now < def.endTime;
      const shouldBeActive = flagOk && timeOk;
      const isCurrentlyActive = this.activeIds.has(def.id);

      if (shouldBeActive && !isCurrentlyActive) {
        this.activeIds.add(def.id);
        started.push(def);
      } else if (!shouldBeActive && isCurrentlyActive) {
        this.activeIds.delete(def.id);
        ended.push(def);
      }
    }

    return { started, ended };
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /** Clear active-event tracking (does not remove event definitions). */
  reset(): void {
    this.activeIds.clear();
  }
}
