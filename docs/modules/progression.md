# Modules: Progression

XP, levels, and prestige/rebirth system with configurable XP curves (`@broblox/progression`). **Status: Implemented** (48 tests).

## Purpose

- XP award system with automatic multi-level-up.
- Configurable XP curves: linear, quadratic, exponential, or custom function.
- Optional prestige/rebirth system — reset level, keep total XP, gain bonus multiplier.
- DataStore persistence with dirty tracking and auto-save.

## Core rules

- `addXp()` rejects `NaN`, negative, zero, and `Infinity` values.
- Multi-level-up: a single XP grant can trigger multiple level-ups in one call.
- Level cap defaults to 100 (0 = unlimited).
- Prestige resets level to 1 and increments prestige tier; level history recorded.
- Prestige XP bonus: each tier grants `+10%` XP multiplier (configurable).

## Data model

- `ProgressionData` — `playerId`, `level`, `currentXp`, `totalXp`, `prestige`, `prestigeHistory[]`, `version`.
- `LevelUpEvent` — `playerId`, `previousLevel`, `newLevel`, `prestige`, `totalXp`.
- `PrestigeEvent` — `playerId`, `previousPrestige`, `newPrestige`, `levelAtPrestige`, `totalXp`.

## XP curve formulas

| Preset      | Formula                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| Linear      | $\text{baseXp} \times \text{level}$                                              |
| Quadratic   | $\lfloor \text{baseXp} \times \text{level}^2 \times \text{growthFactor} \rfloor$ |
| Exponential | $\lfloor \text{baseXp} \times \text{growthFactor}^{(\text{level}-1)} \rfloor$    |
| Custom      | User-supplied `(level) => number` function                                       |

## Public API

### ProgressionStore (per-player)

| Method                                           | Description                                       |
| ------------------------------------------------ | ------------------------------------------------- |
| `addXp(amount)`                                  | Award XP (applies prestige bonus), auto-levels up |
| `setXp(xp)` / `setLevel(level)`                  | Admin overrides                                   |
| `getLevel()` / `getCurrentXp()` / `getTotalXp()` | Queries                                           |
| `getXpForNextLevel()`                            | XP needed for next level                          |
| `getProgress()`                                  | 0.0–1.0 fraction toward next level                |
| `canPrestige()`                                  | Check prestige requirements                       |
| `prestige()`                                     | Execute prestige — reset level, keep XP           |
| `onLevelUp(cb)` / `onPrestige(cb)`               | Event subscriptions                               |

### Factory

```ts
const prog = createProgressionService({
  maxLevel: 100,
  xpCurve: "quadratic",
  baseXp: 100,
  growthFactor: 1.5,
  prestigeEnabled: true,
  prestigeMinLevel: 100,
  maxPrestige: 10,
});
```

## Security

- **Input validation** — rejects NaN, negative, zero, Infinity XP values.
- **Level clamped** — load clamps level to `max(1, ...)`.
- **Prestige gated** — requires `prestigeMinLevel`, `maxPrestige`, and `prestigeEnabled`.
- **Data copies** — `getData()` returns a copy to prevent external mutation.

## Config

| Key                | Default                  | Description                 |
| ------------------ | ------------------------ | --------------------------- |
| `maxLevel`         | `100`                    | Level cap (0 = unlimited)   |
| `xpCurve`          | `"quadratic"`            | Curve preset                |
| `baseXp`           | `100`                    | Base XP for level 2         |
| `growthFactor`     | `1.5`                    | Curve multiplier            |
| `prestigeEnabled`  | `false`                  | Enable prestige             |
| `prestigeMinLevel` | `100`                    | Min level to prestige       |
| `maxPrestige`      | `10`                     | Max prestige tier           |
| `prestigeXpBonus`  | `0.1`                    | XP boost per prestige (10%) |
| `datastoreName`    | `"PlayerProgression_v1"` | DataStore name              |

## Observability

- `progression_xp_gained` — total XP awarded
- `progression_level_ups` — level-up events
- `progression_prestiges` — prestige events
- `progression_save_attempts` / `progression_save_failures`
