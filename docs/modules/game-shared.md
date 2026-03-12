# Modules: Game Shared

Shared remote payload types used across all games (`@broblox/game-shared`). **Status: Implemented** (7 types).

## Purpose

- Define common interfaces for remote event payloads so all games use the same shapes.
- Eliminate duplicated type definitions across game `remotes.ts` files.
- Provide a single import source for payload types used by notifications, rewards, and events.

## Data model

- `RemoteRewardEntry` — `type` (`RewardType`), `amount`, `itemId?`, `label?`.
- `LevelUpPayload` — `newLevel`.
- `PrestigeUnlockedPayload` — `newPrestige`.
- `QuestCompletedPayload` — `questId`, `rewards: RemoteRewardEntry[]`.
- `AchievementCompletedPayload` — `achievementId`, `rewards: RemoteRewardEntry[]`.
- `DailyRewardClaimedPayload` — `day`, `streak`, `rewards: RemoteRewardEntry[]`.
- `EventActivePayload` — `id`, `label`, `modifiers?`.

## Usage

Games import payload types from `@broblox/game-shared` in their `remotes.ts`:

```typescript
import type {
  RemoteRewardEntry,
  LevelUpPayload,
  QuestCompletedPayload,
} from "@broblox/game-shared";
```

## Dependencies

- `@broblox/rewards` — `RewardType` enum used by `RemoteRewardEntry`.

## Testing

- Type-level tests validate all exported interfaces.

## See Also

- [Net module](net.md) — remote registry where these payloads are used
- [Rewards module](rewards.md) — `RewardType` definition
