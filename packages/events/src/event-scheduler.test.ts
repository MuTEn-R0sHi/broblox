/**
 * Tests for EventScheduler.
 *
 * EventScheduler is pure logic (no Roblox APIs) so no mocking is needed.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { EventScheduler } from "./event-scheduler";
import { EventDefinition } from "./types";

const FLAG_ENABLED = () => true;
const FLAG_DISABLED = () => false;

function makeEvent(
  id: string,
  startOffset: number,
  endOffset: number,
  featureFlagId?: string
): EventDefinition {
  const now = 1_000_000;
  return {
    id,
    label: `Event ${id}`,
    startTime: now + startOffset,
    endTime: now + endOffset,
    featureFlagId,
  };
}

const NOW = 1_000_000;

describe("EventScheduler", () => {
  let scheduler: EventScheduler;

  beforeEach(() => {
    scheduler = new EventScheduler([]);
  });

  // --------------------------------------------------------------------------
  // getActiveEvents
  // --------------------------------------------------------------------------

  describe("getActiveEvents", () => {
    it("returns empty array when no events registered", () => {
      expect(scheduler.getActiveEvents(NOW)).toEqual([]);
    });

    it("returns events whose window contains now", () => {
      scheduler.addEvent(makeEvent("a", -100, 100)); // active
      scheduler.addEvent(makeEvent("b", 100, 200)); // future
      scheduler.addEvent(makeEvent("c", -200, -100)); // past

      const active = scheduler.getActiveEvents(NOW);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe("a");
    });

    it("treats startTime as inclusive", () => {
      const def: EventDefinition = {
        id: "x",
        label: "X",
        startTime: NOW,
        endTime: NOW + 100,
      };
      scheduler.addEvent(def);
      expect(scheduler.getActiveEvents(NOW)).toHaveLength(1);
    });

    it("treats endTime as exclusive", () => {
      const def: EventDefinition = {
        id: "x",
        label: "X",
        startTime: NOW - 100,
        endTime: NOW,
      };
      scheduler.addEvent(def);
      expect(scheduler.getActiveEvents(NOW)).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // isEventActive
  // --------------------------------------------------------------------------

  describe("isEventActive", () => {
    it("returns false for unknown id", () => {
      expect(scheduler.isEventActive("unknown", NOW)).toBe(false);
    });

    it("returns true when within window", () => {
      scheduler.addEvent(makeEvent("evt", -10, 10));
      expect(scheduler.isEventActive("evt", NOW)).toBe(true);
    });

    it("returns false before window", () => {
      scheduler.addEvent(makeEvent("evt", 10, 20));
      expect(scheduler.isEventActive("evt", NOW)).toBe(false);
    });

    it("returns false after window", () => {
      scheduler.addEvent(makeEvent("evt", -20, -10));
      expect(scheduler.isEventActive("evt", NOW)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // tick — transitions
  // --------------------------------------------------------------------------

  describe("tick", () => {
    it("returns empty started and ended when no events", () => {
      const result = scheduler.tick(NOW, FLAG_ENABLED);
      expect(result.started).toHaveLength(0);
      expect(result.ended).toHaveLength(0);
    });

    it("reports started events on first tick inside window", () => {
      scheduler.addEvent(makeEvent("a", -100, 100));
      const { started, ended } = scheduler.tick(NOW, FLAG_ENABLED);
      expect(started).toHaveLength(1);
      expect(started[0].id).toBe("a");
      expect(ended).toHaveLength(0);
    });

    it("does not report the same event started twice", () => {
      scheduler.addEvent(makeEvent("a", -100, 100));
      scheduler.tick(NOW, FLAG_ENABLED);
      const second = scheduler.tick(NOW, FLAG_ENABLED);
      expect(second.started).toHaveLength(0);
      expect(second.ended).toHaveLength(0);
    });

    it("reports ended events when they leave their window", () => {
      scheduler.addEvent(makeEvent("a", -100, 100));
      scheduler.tick(NOW, FLAG_ENABLED); // starts
      const after = scheduler.tick(NOW + 200, FLAG_ENABLED); // past endTime
      expect(after.ended).toHaveLength(1);
      expect(after.ended[0].id).toBe("a");
      expect(after.started).toHaveLength(0);
    });

    it("handles multiple events in same tick", () => {
      scheduler.addEvent(makeEvent("starts-now", -10, 200));
      scheduler.addEvent(makeEvent("ended-just-now", -200, -10));
      scheduler.addEvent(makeEvent("future", 100, 300));

      // Pre-seed "ended-just-now" as active
      (scheduler as unknown as { activeIds: Set<string> }).activeIds.add("ended-just-now");

      const { started, ended } = scheduler.tick(NOW, FLAG_ENABLED);
      expect(started.map((e) => e.id)).toContain("starts-now");
      expect(ended.map((e) => e.id)).toContain("ended-just-now");
    });
  });

  // --------------------------------------------------------------------------
  // tick — feature-flag gate
  // --------------------------------------------------------------------------

  describe("tick — feature flag gate", () => {
    it("does not start an event when its flag is disabled", () => {
      scheduler.addEvent(makeEvent("flagged", -100, 100, "my-flag"));
      const { started } = scheduler.tick(NOW, FLAG_DISABLED);
      expect(started).toHaveLength(0);
    });

    it("starts an event when its flag is enabled", () => {
      scheduler.addEvent(makeEvent("flagged", -100, 100, "my-flag"));
      const { started } = scheduler.tick(NOW, FLAG_ENABLED);
      expect(started).toHaveLength(1);
    });

    it("ends the event when flag is disabled mid-event", () => {
      scheduler.addEvent(makeEvent("flagged", -100, 100, "my-flag"));
      scheduler.tick(NOW, FLAG_ENABLED); // start
      const { ended } = scheduler.tick(NOW + 10, FLAG_DISABLED); // flag toggled off
      expect(ended).toHaveLength(1);
      expect(ended[0].id).toBe("flagged");
    });

    it("events with no featureFlagId are unaffected by flag checks", () => {
      scheduler.addEvent(makeEvent("plain", -100, 100));
      const { started } = scheduler.tick(NOW, FLAG_DISABLED);
      expect(started).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // addEvent / removeEvent
  // --------------------------------------------------------------------------

  describe("addEvent / removeEvent", () => {
    it("adds a new event", () => {
      scheduler.addEvent(makeEvent("new", -10, 10));
      expect(scheduler.getScheduledEvents()).toHaveLength(1);
    });

    it("does not add duplicate event by id", () => {
      scheduler.addEvent(makeEvent("dup", -10, 10));
      scheduler.addEvent(makeEvent("dup", -10, 10));
      expect(scheduler.getScheduledEvents()).toHaveLength(1);
    });

    it("removes an event by id", () => {
      scheduler.addEvent(makeEvent("rm", -10, 10));
      scheduler.removeEvent("rm");
      expect(scheduler.getScheduledEvents()).toHaveLength(0);
    });

    it("removeEvent also clears it from activeIds", () => {
      scheduler.addEvent(makeEvent("rm", -10, 10));
      scheduler.tick(NOW, FLAG_ENABLED);
      expect(scheduler.getActiveIds().has("rm")).toBe(true);
      scheduler.removeEvent("rm");
      expect(scheduler.getActiveIds().has("rm")).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // reset
  // --------------------------------------------------------------------------

  describe("reset", () => {
    it("clears active tracking without removing event definitions", () => {
      scheduler.addEvent(makeEvent("a", -10, 10));
      scheduler.tick(NOW, FLAG_ENABLED);
      expect(scheduler.getActiveIds().size).toBe(1);

      scheduler.reset();
      expect(scheduler.getActiveIds().size).toBe(0);
      expect(scheduler.getScheduledEvents()).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // constructor
  // --------------------------------------------------------------------------

  describe("constructor", () => {
    it("accepts initial events array", () => {
      const s = new EventScheduler([makeEvent("init", -10, 10)]);
      expect(s.getScheduledEvents()).toHaveLength(1);
    });

    it("defaults to empty when no argument given", () => {
      const s = new EventScheduler();
      expect(s.getScheduledEvents()).toHaveLength(0);
    });
  });
});
