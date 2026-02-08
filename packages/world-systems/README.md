# @rbx/world-systems

Day/night cycle, weather, and world environment management.

## Purpose

This package provides world environment systems:

- **Day/night cycle** — Configurable clock with time-of-day lighting presets
- **Weather system** — Dynamic weather types with transitions and intensity
- **Season system** — Seasonal rotation with weather weight modifiers
- **World state** — Unified snapshot of clock, weather, and season

## Dependencies

- `@rbx/core` — Service lifecycle, logging

## Architecture

### Single Manager

`WorldManager` drives all three sub-systems from a single `update(deltaSec)` tick:

1. **Day/night** — Advances `clockTime` (0–24), resolves `TimePeriod`, applies `LightingPreset`
2. **Weather** — Auto-transitions between weather types on cooldown, fires `onWeatherChanged`
3. **Seasons** — Rotates through seasons by day count, adjusts weather weights

### Time Periods

`dawn` → `morning` → `noon` → `afternoon` → `dusk` → `evening` → `night` → `midnight`

### Weather Types

`clear`, `cloudy`, `overcast`, `rain`, `heavy_rain`, `thunderstorm`, `snow`, `blizzard`, `fog`, `sandstorm`, `wind`

## Usage

```typescript
import { createWorldService } from "@rbx/world-systems";

const world = createWorldService({
  cycleDurationSeconds: 720, // 12-minute day
  startClockTime: 8, // Start at 8 AM
  transitionDuration: 5,
  minChangeCooldown: 60,
});

const manager = world.getWorldManager();
manager.start();

// In game loop
manager.update(dt);

// Listen for changes
manager.onTimePeriodChanged((period) => {
  print(`Time of day: ${period}`);
});

manager.onWeatherChanged((weather) => {
  print(`Weather: ${weather}`);
});

// Override for events
manager.setWeather("thunderstorm");
manager.setClockTime(22); // Force night
```

## Related Docs

- [Module Overview](../../docs/modules/index.md)
