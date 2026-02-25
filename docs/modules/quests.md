# Modules: Quests

Quest system with objectives, scheduling, and progress tracking (`@rbx/quests`). **Status: Implemented** (53 tests).

## Purpose

- Quest registry with definitions, objectives, rewards, and tier/schedule metadata.
- Per-player quest acceptance, progress tracking, and auto-completion.
- Objective types: kill, collect, visit, interact, craft, score, survive, stage_complete, custom.
- Schedule support: once, daily, weekly, seasonal.

## Core rules

- `acceptQuest()` validates: quest exists, not already active, prerequisite quests completed, active cap not exceeded, once-only quests can't be re-accepted.
- `incrementObjective()` rejects amounts ≤ 0; progress clamped at target.
- Quest completion is auto-triggered server-side when all objectives are verified complete.
- Metadata matching ensures only the correct objective type + metadata combination is incremented.

## Data model

- `QuestDefinition` — `id`, `name`, `description`, `schedule`, `tier`, `objectives[]`, `rewards[]`, `tags?`, `minLevel?`, `maxLevel?`, `autoAccept?`, `timeLimit?`, `prerequisites?`.
- `QuestObjective` — `id`, `description`, `type`, `target`, `metadata?`.
- `QuestProgress` — `questId`, `status`, `objectives[]`, `acceptedAt`, `completedAt?`.
- `QuestStatus` — `"available" | "active" | "completed" | "failed" | "expired"`.
- `QuestTier` — `"common" | "uncommon" | "rare" | "epic" | "legendary"`.
- `QuestSchedule` — `"once" | "daily" | "weekly" | "seasonal"`.
- `RewardEntry` — `type`, `amount`, `itemId?`, `label?`.

## Public API

### QuestRegistry

| Method                        | Description                 |
| ----------------------------- | --------------------------- |
| `register(quest)`             | Register a quest definition |
| `getBySchedule(schedule)`     | Filter by schedule type     |
| `getByTier(tier)`             | Filter by difficulty tier   |
| `getAvailableForLevel(level)` | Filter by level range       |

### QuestStore (per-player)

| Method                                                                     | Description                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------- |
| `acceptQuest(questId)`                                                     | Accept a quest (validates prerequisites, cap, etc.) |
| `incrementObjective(type, amount, metadata?)`                              | Increment all matching active objectives            |
| `setObjectiveProgress(questId, objectiveId, value)`                        | Set progress directly                               |
| `failQuest(questId)`                                                       | Mark as failed                                      |
| `abandonQuest(questId)`                                                    | Remove from active list                             |
| `getActiveQuests()`                                                        | All quests with `"active"` status                   |
| `isCompleted(questId)`                                                     | Completion check                                    |
| `getQuestProgress(questId)`                                                | 0–1 fraction                                        |
| `onQuestAccepted(cb)` / `onQuestCompleted(cb)` / `onObjectiveProgress(cb)` | Event subscriptions                                 |

### Factory

```ts
const quests = createQuestService({
  maxActiveQuests: 10,
  quests: [
    {
      id: "kill_10_zombies",
      name: "Zombie Hunter",
      schedule: "daily",
      tier: "common",
      objectives: [{ id: "kills", description: "Kill zombies", type: "kill", target: 10 }],
      rewards: [{ type: "xp", amount: 100 }],
    },
  ],
});
```

## Security

- **Prerequisites** — quests can require other quests to be completed first.
- **Active cap** — `maxActiveQuests` (default 10) prevents quest hoarding.
- **Once-only** — quests with `schedule: "once"` can't be re-accepted after completion.
- **Progress clamping** — objective progress can't exceed target.
- **Data copies** — `completedQuestIds` returned as copy.

## Config

| Key               | Default             | Description                  |
| ----------------- | ------------------- | ---------------------------- |
| `maxActiveQuests` | `10`                | Max concurrent active quests |
| `datastoreName`   | `"PlayerQuests_v1"` | DataStore name               |

## Observability

- `quests_accepted` — quests accepted
- `quests_completed` — quests completed
- `quests_failed` — quests failed
- `quests_save_attempts` / `quests_save_failures`
