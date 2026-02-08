# Modules: World Systems

Day/night cycle, weather, and seasons (`@rbx/world-systems`). **Status: Implemented** (29 tests).

## Purpose

- Configurable day/night cycle with lighting presets per time period.
- Dynamic weather system with smooth transitions and intensity.
- Seasonal rotation with weather weight modifiers.
- Unified `WorldState` snapshot for networking and UI.

## Core rules

- `WorldManager` is tick-driven: call `update(deltaSec)` each frame.
- Day/night clock runs continuously from 0–24h; cycle speed is configurable.
- Weather auto-transitions after cooldown; can be overridden via `setWeather()`.
- Seasons advance by in-game day count, adjusting weather probabilities.
- All state is server-authoritative; clients receive replicated `WorldState`.

## Data model

- `WorldState` — `clockTime`, `timePeriod`, `activeWeather`, `weatherIntensity`, `activeSeason?`, `dayCount`, `isTransitioning`
- `LightingPreset` — `period`, `startHour`, `ambientColor`, `brightness`, `fogEnd`
- `WeatherDefinition` — `type`, `durationRange`, `intensity`, `windSpeed`, `particleDensity`
- `SeasonDefinition` — `type`, `durationDays`, `weatherWeights`, `foliageTint`, `temperatureModifier`

No per-player persistence (world state is global/server).

## Time periods

dawn → morning → noon → afternoon → dusk → evening → night → midnight

## Weather types

clear, cloudy, overcast, rain, heavy_rain, thunderstorm, snow, blizzard, fog, sandstorm, wind

## Config/flags

- `world.dayNight.enabled` (kill-switch)
- `world.dayNight.cycleDurationSeconds` (default 720 = 12-minute day)
- `world.weather.enabled`
- `world.weather.transitionDuration`
- `world.season.enabled`

## Observability

- `world.time_period_changed` — dawn/noon/night etc.
- `world.weather_changed` — weather transition
- `world.season_changed` — season rotation
