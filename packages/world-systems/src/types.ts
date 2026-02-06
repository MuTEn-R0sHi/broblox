/**
 * @rbx/world-systems — Type Definitions
 *
 * Types for day/night cycle, weather, seasons, biomes, and world events.
 */

// ============================================================================
// Time of Day
// ============================================================================

/** Time period categories */
export type TimePeriod =
  | "dawn"
  | "morning"
  | "noon"
  | "afternoon"
  | "dusk"
  | "evening"
  | "night"
  | "midnight";

/** Lighting presets keyed by time period */
export interface LightingPreset {
  /** Time period this preset applies to */
  period: TimePeriod;
  /** ClockTime (0–24) when this period starts */
  startHour: number;
  /** Ambient color [R, G, B] 0-255 */
  ambientColor: [number, number, number];
  /** Brightness level (0–1) */
  brightness: number;
  /** Fog end distance */
  fogEnd: number;
  /** Fog color [R, G, B] 0-255 */
  fogColor: [number, number, number];
}

/** Day-night cycle configuration */
export interface DayNightConfig {
  /** Whether the cycle is active */
  enabled: boolean;
  /** Real-time seconds per in-game day (e.g., 720 = 12min day cycle) */
  cycleDurationSeconds: number;
  /** Starting ClockTime when cycle begins */
  startClockTime: number;
  /** Lighting presets */
  presets: LightingPreset[];
}

export const DEFAULT_LIGHTING_PRESETS: LightingPreset[] = [
  {
    period: "dawn",
    startHour: 5,
    ambientColor: [180, 140, 100],
    brightness: 0.4,
    fogEnd: 1000,
    fogColor: [200, 170, 130],
  },
  {
    period: "morning",
    startHour: 7,
    ambientColor: [220, 200, 170],
    brightness: 0.7,
    fogEnd: 5000,
    fogColor: [220, 220, 230],
  },
  {
    period: "noon",
    startHour: 11,
    ambientColor: [255, 255, 255],
    brightness: 1.0,
    fogEnd: 10000,
    fogColor: [240, 240, 255],
  },
  {
    period: "afternoon",
    startHour: 14,
    ambientColor: [240, 230, 210],
    brightness: 0.9,
    fogEnd: 8000,
    fogColor: [230, 225, 220],
  },
  {
    period: "dusk",
    startHour: 17,
    ambientColor: [220, 150, 100],
    brightness: 0.5,
    fogEnd: 2000,
    fogColor: [210, 150, 110],
  },
  {
    period: "evening",
    startHour: 19,
    ambientColor: [80, 80, 130],
    brightness: 0.3,
    fogEnd: 3000,
    fogColor: [60, 60, 100],
  },
  {
    period: "night",
    startHour: 21,
    ambientColor: [40, 40, 80],
    brightness: 0.15,
    fogEnd: 2500,
    fogColor: [30, 30, 60],
  },
  {
    period: "midnight",
    startHour: 0,
    ambientColor: [20, 20, 50],
    brightness: 0.1,
    fogEnd: 2000,
    fogColor: [15, 15, 40],
  },
];

export const DEFAULT_DAY_NIGHT_CONFIG: DayNightConfig = {
  enabled: true,
  cycleDurationSeconds: 720,
  startClockTime: 8,
  presets: DEFAULT_LIGHTING_PRESETS,
};

// ============================================================================
// Weather
// ============================================================================

/** Weather types */
export type WeatherType =
  | "clear"
  | "cloudy"
  | "overcast"
  | "rain"
  | "heavy_rain"
  | "thunderstorm"
  | "snow"
  | "blizzard"
  | "fog"
  | "sandstorm"
  | "wind";

/** Weather definition */
export interface WeatherDefinition {
  /** Weather type identifier */
  type: WeatherType;
  /** Display name */
  name: string;
  /** Duration range [min, max] in seconds */
  durationRange: [number, number];
  /** Intensity 0-1 */
  intensity: number;
  /** Fog override (optional) */
  fogEnd?: number;
  /** Brightness modifier (multiplied with time-of-day brightness) */
  brightnessModifier?: number;
  /** Wind speed multiplier (0 = calm, 1 = normal, >1 = heavy) */
  windSpeed: number;
  /** Particle density (0-1) for rain/snow effects */
  particleDensity: number;
}

/** Weather system configuration */
export interface WeatherConfig {
  /** Whether weather is active */
  enabled: boolean;
  /** Transition time between weather states (seconds) */
  transitionDuration: number;
  /** Minimum time between weather changes (seconds) */
  minChangeCooldown: number;
  /** Registered weather definitions */
  definitions: WeatherDefinition[];
}

export const DEFAULT_WEATHER_DEFINITIONS: WeatherDefinition[] = [
  {
    type: "clear",
    name: "Clear",
    durationRange: [120, 300],
    intensity: 0,
    windSpeed: 0.2,
    particleDensity: 0,
  },
  {
    type: "cloudy",
    name: "Cloudy",
    durationRange: [90, 240],
    intensity: 0.3,
    windSpeed: 0.4,
    particleDensity: 0,
    brightnessModifier: 0.85,
  },
  {
    type: "rain",
    name: "Rain",
    durationRange: [60, 180],
    intensity: 0.6,
    windSpeed: 0.5,
    particleDensity: 0.5,
    fogEnd: 3000,
    brightnessModifier: 0.7,
  },
  {
    type: "heavy_rain",
    name: "Heavy Rain",
    durationRange: [30, 120],
    intensity: 0.9,
    windSpeed: 0.8,
    particleDensity: 0.85,
    fogEnd: 1500,
    brightnessModifier: 0.5,
  },
  {
    type: "thunderstorm",
    name: "Thunderstorm",
    durationRange: [30, 90],
    intensity: 1.0,
    windSpeed: 1.0,
    particleDensity: 0.9,
    fogEnd: 1000,
    brightnessModifier: 0.4,
  },
  {
    type: "snow",
    name: "Snow",
    durationRange: [60, 200],
    intensity: 0.5,
    windSpeed: 0.3,
    particleDensity: 0.6,
    fogEnd: 2500,
    brightnessModifier: 0.8,
  },
  {
    type: "fog",
    name: "Fog",
    durationRange: [90, 240],
    intensity: 0.7,
    windSpeed: 0.1,
    particleDensity: 0.1,
    fogEnd: 500,
    brightnessModifier: 0.6,
  },
];

export const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  enabled: true,
  transitionDuration: 10,
  minChangeCooldown: 60,
  definitions: DEFAULT_WEATHER_DEFINITIONS,
};

// ============================================================================
// Seasons
// ============================================================================

/** Season identifiers */
export type SeasonType = "spring" | "summer" | "autumn" | "winter";

/** Season definition */
export interface SeasonDefinition {
  type: SeasonType;
  name: string;
  /** Duration in in-game days */
  durationDays: number;
  /** Weighted weather types during this season [weatherType, weight] */
  weatherWeights: Array<[WeatherType, number]>;
  /** Color tint applied to foliage [R, G, B] */
  foliageTint: [number, number, number];
  /** Temperature modifier (-1 to 1, affects gameplay) */
  temperatureModifier: number;
}

export interface SeasonConfig {
  enabled: boolean;
  /** Ordered seasons in the year */
  seasons: SeasonDefinition[];
  /** Starting season index */
  startingSeason: number;
}

export const DEFAULT_SEASONS: SeasonDefinition[] = [
  {
    type: "spring",
    name: "Spring",
    durationDays: 7,
    weatherWeights: [
      ["clear", 3],
      ["rain", 2],
      ["cloudy", 1],
    ],
    foliageTint: [100, 200, 80],
    temperatureModifier: 0.2,
  },
  {
    type: "summer",
    name: "Summer",
    durationDays: 7,
    weatherWeights: [
      ["clear", 5],
      ["cloudy", 1],
    ],
    foliageTint: [60, 180, 60],
    temperatureModifier: 0.8,
  },
  {
    type: "autumn",
    name: "Autumn",
    durationDays: 7,
    weatherWeights: [
      ["cloudy", 3],
      ["rain", 2],
      ["fog", 1],
    ],
    foliageTint: [200, 140, 40],
    temperatureModifier: -0.1,
  },
  {
    type: "winter",
    name: "Winter",
    durationDays: 7,
    weatherWeights: [
      ["snow", 3],
      ["cloudy", 2],
      ["clear", 1],
    ],
    foliageTint: [180, 200, 220],
    temperatureModifier: -0.6,
  },
];

export const DEFAULT_SEASON_CONFIG: SeasonConfig = {
  enabled: false,
  seasons: DEFAULT_SEASONS,
  startingSeason: 0,
};

// ============================================================================
// World Systems Config (combined)
// ============================================================================

export interface WorldSystemsConfig {
  dayNight: DayNightConfig;
  weather: WeatherConfig;
  season: SeasonConfig;
  enableLogging: boolean;
}

export const DEFAULT_WORLD_SYSTEMS_CONFIG: WorldSystemsConfig = {
  dayNight: DEFAULT_DAY_NIGHT_CONFIG,
  weather: DEFAULT_WEATHER_CONFIG,
  season: DEFAULT_SEASON_CONFIG,
  enableLogging: false,
};

// ============================================================================
// State & Events
// ============================================================================

export interface WorldState {
  /** Current ClockTime (0–24) */
  clockTime: number;
  /** Current time period */
  timePeriod: TimePeriod;
  /** Current weather type */
  activeWeather: WeatherType;
  /** Weather intensity 0-1 */
  weatherIntensity: number;
  /** Current season (if seasons enabled) */
  activeSeason?: SeasonType;
  /** In-game day count */
  dayCount: number;
  /** Whether currently transitioning weather */
  isTransitioning: boolean;
}

export interface TimePeriodChangedEvent {
  previousPeriod: TimePeriod;
  newPeriod: TimePeriod;
  clockTime: number;
}

export interface WeatherChangedEvent {
  previousWeather: WeatherType;
  newWeather: WeatherType;
  intensity: number;
}

export interface SeasonChangedEvent {
  previousSeason: SeasonType;
  newSeason: SeasonType;
  dayCount: number;
}

export type TimePeriodChangedCallback = (event: TimePeriodChangedEvent) => void;
export type WeatherChangedCallback = (event: WeatherChangedEvent) => void;
export type SeasonChangedCallback = (event: SeasonChangedEvent) => void;
