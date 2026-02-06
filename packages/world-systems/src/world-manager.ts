/**
 * @rbx/world-systems — World Manager
 *
 * Manages day/night cycle, weather transitions, and season progression.
 * Pure logic layer — rendering hooks are triggered via callbacks.
 */

import { createLogger } from "@rbx/core";
import type {
  WorldSystemsConfig,
  WorldState,
  TimePeriod,
  WeatherType,
  SeasonType,
  LightingPreset,
  WeatherDefinition,
  TimePeriodChangedCallback,
  WeatherChangedCallback,
  SeasonChangedCallback,
  TimePeriodChangedEvent,
  WeatherChangedEvent,
  SeasonChangedEvent,
} from "./types";
import { DEFAULT_WORLD_SYSTEMS_CONFIG, DEFAULT_LIGHTING_PRESETS } from "./types";

declare const os: { time(): number; clock(): number };
declare const math: {
  floor(n: number): number;
  min(a: number, b: number): number;
  max(a: number, b: number): number;
  huge: number;
};

export class WorldManager {
  private config: WorldSystemsConfig;
  private logger;

  // --------------- State ---------------
  private clockTime: number;
  private currentPeriod: TimePeriod;
  private currentWeather: WeatherType = "clear";
  private weatherIntensity = 0;
  private currentSeasonIndex = 0;
  private dayCount = 0;
  private dayInSeason = 0;
  private lastUpdateTime = 0;
  private lastWeatherChange = 0;
  private weatherDurationLeft = 0;
  private isTransitioning = false;
  private running = false;

  // --------------- Callbacks ---------------
  private timePeriodCallbacks: TimePeriodChangedCallback[] = [];
  private weatherCallbacks: WeatherChangedCallback[] = [];
  private seasonCallbacks: SeasonChangedCallback[] = [];

  constructor(config?: Partial<WorldSystemsConfig>) {
    this.config = {
      dayNight: { ...DEFAULT_WORLD_SYSTEMS_CONFIG.dayNight, ...config?.dayNight },
      weather: { ...DEFAULT_WORLD_SYSTEMS_CONFIG.weather, ...config?.weather },
      season: { ...DEFAULT_WORLD_SYSTEMS_CONFIG.season, ...config?.season },
      enableLogging: config?.enableLogging ?? DEFAULT_WORLD_SYSTEMS_CONFIG.enableLogging,
    };
    this.logger = this.config.enableLogging ? createLogger("WorldManager") : undefined;
    this.clockTime = this.config.dayNight.startClockTime;
    this.currentPeriod = this.getTimePeriodForHour(this.clockTime);
    this.currentSeasonIndex = this.config.season.startingSeason;
    this.lastUpdateTime = os.time();
    this.lastWeatherChange = os.time();
    this.weatherDurationLeft = 120;
  }

  // =========================================================================
  // Public API
  // =========================================================================

  /** Start the cycle */
  start(): void {
    this.running = true;
    this.lastUpdateTime = os.time();
    this.logger?.info("World systems started");
  }

  /** Stop the cycle */
  stop(): void {
    this.running = false;
    this.logger?.info("World systems stopped");
  }

  /** Whether the cycle is running */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Tick the world forward by `deltaSec` real-time seconds.
   * Call this from a heartbeat/step loop.
   */
  update(deltaSec: number): void {
    if (!this.running) return;

    // ---------- Day / Night ----------
    if (this.config.dayNight.enabled) {
      const hoursPerSecond = 24 / this.config.dayNight.cycleDurationSeconds;
      const advance = deltaSec * hoursPerSecond;
      const prev = this.clockTime;
      this.clockTime = (this.clockTime + advance) % 24;

      // Detect day rollover
      if (this.clockTime < prev) {
        this.dayCount++;
        this.advanceDay();
      }

      const newPeriod = this.getTimePeriodForHour(this.clockTime);
      if (newPeriod !== this.currentPeriod) {
        const evt: TimePeriodChangedEvent = {
          previousPeriod: this.currentPeriod,
          newPeriod,
          clockTime: this.clockTime,
        };
        this.currentPeriod = newPeriod;
        for (let i = 0; i < this.timePeriodCallbacks.size(); i++) {
          this.timePeriodCallbacks[i](evt);
        }
        this.logger?.info(`Time period: ${newPeriod}`);
      }
    }

    // ---------- Weather ----------
    if (this.config.weather.enabled) {
      this.weatherDurationLeft -= deltaSec;
      if (this.weatherDurationLeft <= 0) {
        this.pickNextWeather();
      }
    }

    this.lastUpdateTime = os.time();
  }

  /** Force-set the clock time */
  setClockTime(hour: number): void {
    this.clockTime = hour % 24;
    const newPeriod = this.getTimePeriodForHour(this.clockTime);
    if (newPeriod !== this.currentPeriod) {
      const prev = this.currentPeriod;
      this.currentPeriod = newPeriod;
      const evt: TimePeriodChangedEvent = {
        previousPeriod: prev,
        newPeriod,
        clockTime: this.clockTime,
      };
      for (let i = 0; i < this.timePeriodCallbacks.size(); i++) {
        this.timePeriodCallbacks[i](evt);
      }
    }
  }

  /** Force-change the weather */
  setWeather(weatherType: WeatherType): void {
    const def = this.findWeatherDef(weatherType);
    if (!def) return;
    const prevWeather = this.currentWeather;
    this.currentWeather = weatherType;
    this.weatherIntensity = def.intensity;
    this.weatherDurationLeft = (def.durationRange[0] + def.durationRange[1]) / 2;
    this.lastWeatherChange = os.time();
    this.isTransitioning = true;

    const evt: WeatherChangedEvent = {
      previousWeather: prevWeather,
      newWeather: weatherType,
      intensity: def.intensity,
    };
    for (let i = 0; i < this.weatherCallbacks.size(); i++) {
      this.weatherCallbacks[i](evt);
    }
  }

  /** Force-set the season */
  setSeason(seasonType: string): void {
    const seasons = this.config.season.seasons;
    for (let i = 0; i < seasons.size(); i++) {
      if (seasons[i].type === seasonType) {
        if (i !== this.currentSeasonIndex) {
          const prevSeason = seasons[this.currentSeasonIndex].type;
          this.currentSeasonIndex = i;
          this.dayInSeason = 0;
          const evt: SeasonChangedEvent = {
            previousSeason: prevSeason,
            newSeason: seasons[i].type,
            dayCount: this.dayCount,
          };
          for (let j = 0; j < this.seasonCallbacks.size(); j++) {
            this.seasonCallbacks[j](evt);
          }
        }
        return;
      }
    }
  }

  // =========================================================================
  // Queries
  // =========================================================================

  /** Get current clock time (0–24) */
  getClockTime(): number {
    return this.clockTime;
  }

  /** Get current time period */
  getTimePeriod(): TimePeriod {
    return this.currentPeriod;
  }

  /** Get current weather type */
  getWeather(): WeatherType {
    return this.currentWeather;
  }

  /** Get weather intensity (0-1) */
  getWeatherIntensity(): number {
    return this.weatherIntensity;
  }

  /** Get current season */
  getSeason(): SeasonType | undefined {
    if (!this.config.season.enabled) return undefined;
    return this.config.season.seasons[this.currentSeasonIndex]?.type;
  }

  /** Get day count */
  getDayCount(): number {
    return this.dayCount;
  }

  /** Get full world state snapshot */
  getState(): WorldState {
    return {
      clockTime: this.clockTime,
      timePeriod: this.currentPeriod,
      activeWeather: this.currentWeather,
      weatherIntensity: this.weatherIntensity,
      activeSeason: this.getSeason(),
      dayCount: this.dayCount,
      isTransitioning: this.isTransitioning,
    };
  }

  /** Get the lighting preset for the current time period */
  getCurrentPreset(): LightingPreset | undefined {
    const presets = this.config.dayNight.presets ?? DEFAULT_LIGHTING_PRESETS;
    for (let i = 0; i < presets.size(); i++) {
      if (presets[i].period === this.currentPeriod) return presets[i];
    }
    return undefined;
  }

  // =========================================================================
  // Events
  // =========================================================================

  onTimePeriodChanged(cb: TimePeriodChangedCallback): void {
    this.timePeriodCallbacks.push(cb);
  }

  onWeatherChanged(cb: WeatherChangedCallback): void {
    this.weatherCallbacks.push(cb);
  }

  onSeasonChanged(cb: SeasonChangedCallback): void {
    this.seasonCallbacks.push(cb);
  }

  // =========================================================================
  // Internal
  // =========================================================================

  private getTimePeriodForHour(hour: number): TimePeriod {
    const presets = this.config.dayNight.presets ?? DEFAULT_LIGHTING_PRESETS;
    let best: TimePeriod = "midnight";
    let bestHour = -1;
    for (let i = 0; i < presets.size(); i++) {
      if (presets[i].startHour <= hour && presets[i].startHour > bestHour) {
        best = presets[i].period;
        bestHour = presets[i].startHour;
      }
    }
    // Handle midnight wrap-around (hour < first preset's startHour)
    if (bestHour < 0 || (hour < presets[0].startHour && presets[0].startHour > 0)) {
      // Find the last preset (wraps from previous day)
      let lastPreset = presets[0];
      for (let i = 1; i < presets.size(); i++) {
        if (presets[i].startHour > lastPreset.startHour) {
          lastPreset = presets[i];
        }
      }
      best = lastPreset.period;
    }
    return best;
  }

  private findWeatherDef(weatherType: WeatherType): WeatherDefinition | undefined {
    const defs = this.config.weather.definitions;
    for (let i = 0; i < defs.size(); i++) {
      if (defs[i].type === weatherType) return defs[i];
    }
    return undefined;
  }

  private pickNextWeather(): void {
    const defs = this.config.weather.definitions;
    if (defs.size() === 0) return;

    // Simple round-robin (game code could use weighted random from season)
    let nextIndex = 0;
    for (let i = 0; i < defs.size(); i++) {
      if (defs[i].type === this.currentWeather) {
        nextIndex = (i + 1) % defs.size();
        break;
      }
    }
    const nextDef = defs[nextIndex];
    const prevWeather = this.currentWeather;
    this.currentWeather = nextDef.type;
    this.weatherIntensity = nextDef.intensity;
    this.weatherDurationLeft = (nextDef.durationRange[0] + nextDef.durationRange[1]) / 2;
    this.lastWeatherChange = os.time();
    this.isTransitioning = true;

    const evt: WeatherChangedEvent = {
      previousWeather: prevWeather,
      newWeather: nextDef.type,
      intensity: nextDef.intensity,
    };
    for (let i = 0; i < this.weatherCallbacks.size(); i++) {
      this.weatherCallbacks[i](evt);
    }
    this.logger?.info(`Weather: ${nextDef.type}`);
  }

  private advanceDay(): void {
    if (!this.config.season.enabled) return;
    this.dayInSeason++;
    const seasons = this.config.season.seasons;
    if (seasons.size() === 0) return;
    const current = seasons[this.currentSeasonIndex];
    if (this.dayInSeason >= current.durationDays) {
      const prevSeason = current.type;
      this.currentSeasonIndex = (this.currentSeasonIndex + 1) % seasons.size();
      this.dayInSeason = 0;
      const newSeason = seasons[this.currentSeasonIndex];
      const evt: SeasonChangedEvent = {
        previousSeason: prevSeason,
        newSeason: newSeason.type,
        dayCount: this.dayCount,
      };
      for (let i = 0; i < this.seasonCallbacks.size(); i++) {
        this.seasonCallbacks[i](evt);
      }
      this.logger?.info(`Season: ${newSeason.type}`);
    }
  }
}
