/**
 * @broblox/world-systems — Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TimePeriodChangedEvent, WeatherChangedEvent, SeasonChangedEvent } from "./types";

// ---------------------------------------------------------------------------
// Roblox global mocks
// ---------------------------------------------------------------------------

let mockTime = 1000;

function setupGlobals() {
  mockTime = 1000;
  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = {
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    huge: Infinity,
  };
  g.typeIs = (value: unknown, typeName: string) => {
    if (typeName === "table") return typeof value === "object" && value !== null;
    return typeof value === typeName;
  };
  g.pcall = (fn: (...a: unknown[]) => unknown) => {
    try {
      return [true, fn()];
    } catch (e) {
      return [false, e];
    }
  };
}

// ---------------------------------------------------------------------------
// Tests — WorldManager
// ---------------------------------------------------------------------------

describe("WorldManager", () => {
  beforeEach(() => {
    setupGlobals();
  });

  async function loadManager(config?: Record<string, unknown>) {
    const { WorldManager } = await import("./world-manager");
    return new WorldManager(config as never);
  }

  // ------ Initialization ------

  it("initializes with default config", async () => {
    const wm = await loadManager();
    const state = wm.getState();
    expect(state.clockTime).toBe(8);
    expect(state.activeWeather).toBe("clear");
    expect(state.dayCount).toBe(0);
    expect(state.isTransitioning).toBe(false);
  });

  it("starts and stops", async () => {
    const wm = await loadManager();
    expect(wm.isRunning()).toBe(false);
    wm.start();
    expect(wm.isRunning()).toBe(true);
    wm.stop();
    expect(wm.isRunning()).toBe(false);
  });

  // ------ Day / Night ------

  it("advances clock time on update", async () => {
    const wm = await loadManager();
    wm.start();
    // Default cycle is 720s for 24h → 0.0333 hours per second
    // After 30 seconds: 30 * (24/720) = 1 hour advancement
    wm.update(30);
    expect(wm.getClockTime()).toBeCloseTo(9, 1);
  });

  it("wraps clock time at 24", async () => {
    const wm = await loadManager({ dayNight: { startClockTime: 23 } });
    wm.start();
    // Advance enough to wrap: 2 hours = 60 seconds
    wm.update(60);
    expect(wm.getClockTime()).toBeCloseTo(1, 0);
    expect(wm.getDayCount()).toBe(1);
  });

  it("fires timePeriodChanged callback", async () => {
    const wm = await loadManager({ dayNight: { startClockTime: 6.5 } });
    const events: TimePeriodChangedEvent[] = [];
    wm.onTimePeriodChanged((e) => events.push(e));
    wm.start();

    // Advance past 7am boundary (morning starts at 7) → 0.5h = 15s at default rate
    wm.update(20);
    expect(events.size()).toBeGreaterThanOrEqual(1);
    expect(events[0].newPeriod).toBe("morning");
  });

  it("setClockTime forces clock and fires event", async () => {
    const wm = await loadManager();
    const events: TimePeriodChangedEvent[] = [];
    wm.onTimePeriodChanged((e) => events.push(e));

    wm.setClockTime(22); // night
    expect(wm.getClockTime()).toBeCloseTo(22, 1);
    expect(wm.getTimePeriod()).toBe("night");
    expect(events.size()).toBe(1);
  });

  it("does not update when stopped", async () => {
    const wm = await loadManager();
    wm.update(100);
    expect(wm.getClockTime()).toBe(8); // unchanged
  });

  // ------ Time Period ------

  it("returns correct time period for various hours", async () => {
    const wm = await loadManager();

    wm.setClockTime(6); // dawn starts at 5
    expect(wm.getTimePeriod()).toBe("dawn");

    wm.setClockTime(10); // morning starts at 7
    expect(wm.getTimePeriod()).toBe("morning");

    wm.setClockTime(12); // noon starts at 11
    expect(wm.getTimePeriod()).toBe("noon");

    wm.setClockTime(15); // afternoon starts at 14
    expect(wm.getTimePeriod()).toBe("afternoon");

    wm.setClockTime(18); // dusk starts at 17
    expect(wm.getTimePeriod()).toBe("dusk");

    wm.setClockTime(20); // evening starts at 19
    expect(wm.getTimePeriod()).toBe("evening");

    wm.setClockTime(22); // night starts at 21
    expect(wm.getTimePeriod()).toBe("night");
  });

  it("getCurrentPreset returns matching preset", async () => {
    const wm = await loadManager();
    wm.setClockTime(12); // noon
    const preset = wm.getCurrentPreset();
    expect(preset).toBeDefined();
    expect(preset!.period).toBe("noon");
    expect(preset!.brightness).toBe(1.0);
  });

  // ------ Weather ------

  it("setWeather changes weather and fires callback", async () => {
    const wm = await loadManager();
    const events: WeatherChangedEvent[] = [];
    wm.onWeatherChanged((e) => events.push(e));

    wm.setWeather("rain");
    expect(wm.getWeather()).toBe("rain");
    expect(wm.getWeatherIntensity()).toBe(0.6);
    expect(events.size()).toBe(1);
    expect(events[0].previousWeather).toBe("clear");
    expect(events[0].newWeather).toBe("rain");
  });

  it("weather changes automatically when duration expires", async () => {
    const wm = await loadManager({
      weather: {
        enabled: true,
        definitions: [
          {
            type: "clear",
            name: "Clear",
            durationRange: [1, 1],
            intensity: 0,
            windSpeed: 0,
            particleDensity: 0,
          },
          {
            type: "rain",
            name: "Rain",
            durationRange: [100, 100],
            intensity: 0.5,
            windSpeed: 0.5,
            particleDensity: 0.5,
          },
        ],
      },
    });
    const events: WeatherChangedEvent[] = [];
    wm.onWeatherChanged((e) => events.push(e));
    wm.start();

    // default weatherDurationLeft=120, update enough to expire it
    wm.update(130);
    // Should have picked next weather
    expect(events.size()).toBeGreaterThanOrEqual(1);
  });

  it("getState includes weather info", async () => {
    const wm = await loadManager();
    wm.setWeather("snow");
    const state = wm.getState();
    expect(state.activeWeather).toBe("snow");
    expect(state.weatherIntensity).toBe(0.5);
  });

  // ------ Seasons ------

  it("season is undefined when disabled", async () => {
    const wm = await loadManager();
    expect(wm.getSeason()).toBeUndefined();
  });

  it("returns season when enabled", async () => {
    const wm = await loadManager({ season: { enabled: true, startingSeason: 0 } });
    expect(wm.getSeason()).toBe("spring");
  });

  it("setSeason changes and fires callback", async () => {
    const wm = await loadManager({ season: { enabled: true, startingSeason: 0 } });
    const events: SeasonChangedEvent[] = [];
    wm.onSeasonChanged((e) => events.push(e));

    wm.setSeason("winter");
    expect(wm.getSeason()).toBe("winter");
    expect(events.size()).toBe(1);
    expect(events[0].previousSeason).toBe("spring");
    expect(events[0].newSeason).toBe("winter");
  });

  it("season advances after enough day rollovers", async () => {
    // Use a very short cycle so each small update wraps the clock once
    const wm = await loadManager({
      season: { enabled: true, startingSeason: 0 },
      dayNight: { startClockTime: 23, cycleDurationSeconds: 24, enabled: true },
    });
    const events: SeasonChangedEvent[] = [];
    wm.onSeasonChanged((e) => events.push(e));
    wm.start();

    // cycleDurationSeconds=24 means 1 hour/second, so 2s wraps once from 23→1
    // Do 7 wraps (7 days) to trigger season change
    for (let d = 0; d < 7; d++) {
      // Step forward 2 seconds → advances 2 hours → wraps from ~23 to ~1
      wm.update(2);
      // Step forward 22 seconds → advances 22 hours → back near 23
      wm.update(22);
    }

    expect(events.size()).toBeGreaterThanOrEqual(1);
    expect(events[0].newSeason).toBe("summer");
  });

  // ------ Edge Cases ------

  it("handles update with zero delta", async () => {
    const wm = await loadManager();
    wm.start();
    const before = wm.getClockTime();
    wm.update(0);
    expect(wm.getClockTime()).toBe(before);
  });

  it("setWeather ignores unknown weather", async () => {
    const wm = await loadManager();
    wm.setWeather("tornado" as never);
    expect(wm.getWeather()).toBe("clear"); // unchanged
  });

  it("setSeason ignores unknown season", async () => {
    const wm = await loadManager({ season: { enabled: true } });
    wm.setSeason("monsoon");
    expect(wm.getSeason()).toBe("spring"); // unchanged
  });

  it("handles disabled dayNight — no time advancement", async () => {
    const wm = await loadManager({ dayNight: { enabled: false, startClockTime: 12 } });
    wm.start();
    wm.update(100);
    expect(wm.getClockTime()).toBe(12); // unchanged
  });

  it("ignores negative delta time", async () => {
    const wm = await loadManager();
    wm.start();
    const before = wm.getClockTime();
    wm.update(-10);
    expect(wm.getClockTime()).toBe(before); // unchanged
  });

  it("does not fire time period callback on negative delta", async () => {
    const wm = await loadManager({ dayNight: { startClockTime: 12 } });
    const events: TimePeriodChangedEvent[] = [];
    wm.onTimePeriodChanged((e) => events.push(e));
    wm.start();
    wm.update(-500);
    expect(events).toHaveLength(0);
  });

  // -----------------------------------------------------------------------
  // Edge-case tests for branch coverage
  // -----------------------------------------------------------------------

  it("setClockTime fires callback only when period changes", async () => {
    const wm = await loadManager({ dayNight: { startClockTime: 12 } });
    const events: TimePeriodChangedEvent[] = [];
    wm.onTimePeriodChanged((e) => events.push(e));
    wm.start();
    const before = events.length;
    // Jump to a very different time to ensure period changes
    wm.setClockTime(0); // midnight
    const after1 = events.length;
    // A second call to midnight should NOT fire again
    wm.setClockTime(0);
    expect(events.length).toBe(after1);
    // Verify at least one event was fired for the initial change
    expect(after1).toBeGreaterThan(before);
  });

  it("setSeason is no-op when setting current season", async () => {
    const wm = await loadManager({ season: { enabled: true } });
    wm.start();
    const currentSeason = wm.getSeason();
    const events: SeasonChangedEvent[] = [];
    wm.onSeasonChanged((e) => events.push(e));
    wm.setSeason(currentSeason);
    expect(events).toHaveLength(0);
  });

  it("getState returns complete world state snapshot", async () => {
    const wm = await loadManager();
    wm.start();
    const state = wm.getState();
    expect(state).toBeDefined();
    expect(state).toHaveProperty("clockTime");
  });
});
