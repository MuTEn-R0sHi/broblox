# @rbx/battle-pass

Seasonal battle pass system with tiers, XP, and reward tracks.

## Purpose

This package implements a full battle pass:

- **Season definitions** — Named seasons with tier lists and active windows
- **Free & premium tracks** — Separate reward tracks per tier
- **XP progression** — Earn XP, level up tiers, claim rewards
- **Per-player persistence** — DataStore-backed progress with dirty tracking

## Dependencies

- `@rbx/core` — Service lifecycle, logging
- `@rbx/observability` — Metrics and telemetry
- `@rbx/rewards` — Reward entry definitions

## Architecture

### Registry → Store Pattern

1. **SeasonRegistry** — Register season definitions (tiers, XP curves, rewards)
2. **BattlePassStore** — Per-player state: current tier, XP, premium status, claimed rewards
3. **`createBattlePassService`** — Wires registry + per-player stores with `initPlayer`/`cleanupPlayer`

### Progression Flow

1. Player earns XP via gameplay → `store.addXp(amount)`
2. Store auto-levels through tiers, fires `onTierUp` callbacks
3. Player claims available rewards → `store.claimReward(rewardId)`
4. Premium track unlocked separately → `store.unlockPremium()`

## Usage

```typescript
import { createBattlePassService } from "@rbx/battle-pass";

const bp = createBattlePassService({
  seasons: [
    {
      id: "s1",
      name: "Season 1",
      description: "Launch season",
      active: true,
      startTime: 0,
      endTime: 9999999999,
      tiers: [
        { tier: 1, xpRequired: 100, rewards: [] },
        { tier: 2, xpRequired: 300, rewards: [] },
      ],
    },
  ],
  datastoreName: "BattlePass",
});

// On player join
bp.initPlayer(playerId);
const store = bp.getBattlePassStore(playerId);
store.addXp(150);
```

## Related Docs

- [Module Overview](../../docs/modules/index.md)
