# Modules: Rewards

Daily login rewards with streak tracking and an achievement/milestone system (`@broblox/rewards`). **Status: Implemented** (47 tests).

## Purpose

- Drive retention via daily login reward cycles with configurable streak mechanics.
- Achievement system for tracking milestones with auto-completion and reward payouts.
- DataStore persistence with dirty-flag tracking and auto-save.

## Core rules

- Claims are cooldown-gated by `dayDuration` (default 24 h); server time only.
- Streak resets if the grace period (default 24 h) elapses without a claim.
- Reward cycle loops after `cycleLength` days (default 7); supports bonus days.
- Achievement progress clamped at target; auto-completes when reached.

## Data model

- `DailyRewardDay` — `day` (1-based), `rewards[]`, `isBonus?`.
- `DailyLoginData` — `playerId`, `streak`, `cycleDay`, `lastClaimTime`, `totalDaysClaimed`.
- `AchievementDefinition` — `id`, `name`, `description`, `target`, `rewards[]`, `icon?`, `tags?`, `hidden?`.
- `AchievementProgress` — `achievementId`, `current`, `completed`, `completedAt?`.
- `RewardEntry` — `type` (currency/xp/item/boost/cosmetic/custom), `amount`, `itemId?`, `label?`.

## Public API

### DailyRewardStore (per-player)

| Method                                                    | Description                                |
| --------------------------------------------------------- | ------------------------------------------ |
| `canClaim()`                                              | Whether enough time has elapsed            |
| `claim()`                                                 | Claim today's reward, advance streak/cycle |
| `getStreak()` / `getCycleDay()` / `getTotalDaysClaimed()` | Query state                                |
| `getTimeUntilNextClaim()`                                 | Seconds until next claim                   |
| `onClaimed(callback)`                                     | Subscribe to claim events                  |

### AchievementStore (per-player)

| Method                                           | Description                            |
| ------------------------------------------------ | -------------------------------------- |
| `registerAchievement(def)` / `registerAll(defs)` | Register definitions                   |
| `incrementProgress(id, amount)`                  | Increment; returns `true` if completed |
| `setProgress(id, value)`                         | Set directly                           |
| `getProgress(id)` / `isCompleted(id)`            | Query progress                         |
| `getCompletionFraction(id)`                      | 0–1 fraction                           |
| `onAchievementCompleted(callback)`               | Subscribe to completion events         |

### Factory

```ts
const rewards = createRewardsService({
  rewardCycle: [
    { day: 1, rewards: [{ type: "currency", amount: 100, label: "Coins" }] },
    { day: 7, rewards: [{ type: "item", itemId: "rare_crate", amount: 1 }], isBonus: true },
  ],
  achievements: [
    {
      id: "first_kill",
      name: "First Blood",
      description: "Get your first kill",
      target: 1,
      rewards: [{ type: "xp", amount: 50 }],
    },
  ],
});
```

## Security

- **Server-side time** — all claim timing uses server clock.
- **Cooldown gating** — `dayDuration` prevents rapid claiming.
- **Streak grace period** — configurable forgiveness window.
- **Corrupt data sanitisation** — clamps negative/zero values from bad saves.

## Config

| Key                        | Default             | Description                  |
| -------------------------- | ------------------- | ---------------------------- |
| `dayDuration`              | `86400`             | Seconds per "day"            |
| `streakGracePeriod`        | `86400`             | Seconds before streak resets |
| `cycleLength`              | `7`                 | Reward cycle length          |
| `dailyDatastoreName`       | `"DailyRewards_v1"` | DataStore for daily data     |
| `achievementDatastoreName` | `"Achievements_v1"` | DataStore for achievements   |

## Observability

- `rewards_daily_claims` — successful claims
- `rewards_streak_resets` — streak broken
- `rewards_achievements_completed` — achievements completed
- `rewards_daily_save_attempts` / `rewards_daily_save_failures`
- `rewards_achievement_save_attempts` / `rewards_achievement_save_failures`
