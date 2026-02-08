# @rbx/quests

Quest and objective tracking system for Roblox games.

## Features

- **Quest definitions** — static blueprints with objectives, rewards, tiers, and schedules
- **Quest registry** — central lookup with filtering by schedule, tier, tag, and level range
- **Objective tracking** — increment-by-type across all active quests with metadata matching
- **Auto-completion** — quests complete automatically when all objectives are met
- **Quest lifecycle** — accept, progress, complete, fail, abandon
- **Repeating quests** — once, daily, weekly, seasonal schedules
- **Prerequisites** — chain quests together
- **DataStore persistence** — save/load per player
- **Event callbacks** — accepted, completed, objective progress

## Quick Start

```ts
import { QuestRegistry, QuestStore } from "@rbx/quests";

// 1. Define quests
const registry = new QuestRegistry();
registry.register({
  id: "kill_zombies",
  name: "Zombie Slayer",
  description: "Kill 10 zombies",
  schedule: "daily",
  tier: "common",
  objectives: [{ id: "obj_kill", description: "Kill zombies", type: "kill", target: 10 }],
  xpReward: 500,
  currencyReward: 100,
});

// 2. Create per-player store
const store = new QuestStore(player.UserId, registry, {
  maxActiveQuests: 10,
});
store.init();
store.load();

// 3. Accept a quest
store.acceptQuest("kill_zombies");

// 4. Track progress (call from game events)
store.incrementObjective("kill", 1, { enemy: "zombie" });

// 5. Listen for completion
store.onQuestCompleted((event) => {
  print(`Quest done! +${event.xpReward} XP, +${event.currencyReward} coins`);
});

// 6. Save
store.save();
```

## Objective Types

| Type       | Description               |
| ---------- | ------------------------- |
| `kill`     | Defeat enemies            |
| `collect`  | Gather items              |
| `visit`    | Reach a location          |
| `interact` | Use an object / NPC       |
| `craft`    | Create items              |
| `score`    | Reach a point threshold   |
| `survive`  | Stay alive for a duration |
| `custom`   | Game-specific objectives  |

## Tests

```bash
pnpm --filter @rbx/quests test
```
