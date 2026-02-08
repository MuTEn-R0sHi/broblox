# @rbx/progression

XP, levels, and prestige/rebirth system for Roblox games.

## Features

- **Configurable XP curves** — linear, quadratic, exponential, or custom functions
- **Auto level-up** — batched level-ups when large XP amounts are awarded
- **Prestige / rebirth** — optional reset-and-boost mechanic with configurable tiers
- **Prestige XP bonus** — earn more XP each prestige tier
- **DataStore persistence** — save/load with dirty-state tracking
- **Event callbacks** — subscribe to level-up and prestige events
- **Observability** — built-in counters for XP gained, level-ups, prestiges, saves

## Quick Start

```ts
import { ProgressionStore } from "@rbx/progression";

const store = new ProgressionStore(player.UserId, {
  maxLevel: 100,
  xpCurve: "quadratic",
  baseXp: 100,
  growthFactor: 1.5,
  prestigeEnabled: true,
  prestigeMinLevel: 100,
  maxPrestige: 10,
  prestigeXpBonus: 0.1,
});

store.init();
store.load();

// Award XP — returns number of levels gained
const levels = store.addXp(500);
if (levels > 0) {
  print(`Leveled up ${levels} times! Now level ${store.getLevel()}`);
}

// Subscribe to events
store.onLevelUp((event) => {
  print(`${event.previousLevel} → ${event.newLevel}`);
});

store.onPrestige((event) => {
  print(`Prestige ${event.newPrestige}!`);
});

// Prestige when ready
if (store.canPrestige()) {
  store.prestige(); // resets level to 1, keeps totalXp, increments prestige
}

// Save
store.save();
```

## XP Curves

| Preset        | Formula                            | Example (base=100, growth=1.5)  |
| ------------- | ---------------------------------- | ------------------------------- |
| `linear`      | `baseXp × level`                   | L2=200, L10=1000, L50=5000      |
| `quadratic`   | `floor(baseXp × level² × growth)`  | L2=600, L10=15000, L50=375000   |
| `exponential` | `floor(baseXp × growth^(level-1))` | L2=150, L10=3844, L50=637621500 |
| `custom`      | User-provided function             | `(level) => level * 50 + 50`    |

## Tests

```bash
pnpm --filter @rbx/progression test
```
