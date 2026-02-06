# @rbx/rewards

Daily login rewards, streaks, and achievement tracking for Roblox games.

## Features

### Daily Rewards

- **Configurable reward cycles** — define rewards for each day (currency, XP, items, boosts)
- **Streak tracking** — consecutive login streak with grace period
- **Auto-reset** — streak resets if grace window is missed
- **Cycle wrapping** — repeats the reward cycle endlessly

### Achievements

- **Definition registry** — register achievements with targets and rewards
- **Progress tracking** — increment or set progress, auto-complete at target
- **Event callbacks** — fired when achievements are completed
- **DataStore persistence** — save/load per player

## Quick Start

### Daily Rewards

```ts
import { DailyRewardStore } from "@rbx/rewards";

const cycle = [
  { day: 1, rewards: [{ type: "currency", amount: 100 }] },
  { day: 2, rewards: [{ type: "currency", amount: 150 }] },
  { day: 3, rewards: [{ type: "xp", amount: 500 }] },
  { day: 7, rewards: [{ type: "currency", amount: 1000 }], isBonus: true },
];

const store = new DailyRewardStore(player.UserId, cycle, {
  dayDuration: 86400,
  streakGracePeriod: 86400,
  cycleLength: 7,
});
store.init();
store.load();

if (store.canClaim()) {
  const day = store.claim();
  print(`Day ${day.day}! Streak: ${store.getStreak()}`);
}

store.save();
```

### Achievements

```ts
import { AchievementStore } from "@rbx/rewards";

const store = new AchievementStore(player.UserId);
store.init();

store.registerAchievement({
  id: "ach_kills",
  name: "Slayer",
  description: "Kill 100 enemies",
  target: 100,
  rewards: [{ type: "currency", amount: 5000 }],
});

store.load();

store.onAchievementCompleted((event) => {
  print(`Achievement unlocked: ${event.achievementId}`);
});

// Call from game events
store.incrementProgress("ach_kills", 1);

store.save();
```

## Tests

```bash
pnpm test -- packages/rewards
```
