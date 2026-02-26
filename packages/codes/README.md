# @broblox/codes

Redeemable promo-code system for Roblox games built on `roblox-ts`.

## Features

- **Code registration** — define codes with rewards, limits, and expiry
- **Per-player tracking** — DataStore-backed redemption records
- **Global & per-player limits** — `maxUses` and `perPlayerLimit`
- **Time-based expiry** — auto-expire codes after a timestamp
- **Status management** — activate, disable, or expire codes at runtime
- **Observability** — counters for attempts, successes, and failures
- **Case-insensitive** — codes are stored and compared in UPPER CASE

## Installation

Already included as a workspace package:

```jsonc
// package.json
"dependencies": {
  "@broblox/codes": "workspace:*"
}
```

## Quick Start

```ts
import { CodeStore } from "@broblox/codes";

// Create the store
const codes = new CodeStore({
  datastoreName: "MyCodes", // default: "PlayerCodes"
  enableLogging: true,
  onRedeem: (playerId, code, rewards) => {
    // Grant rewards to the player
    for (const reward of rewards) {
      // e.g. grantCoins(playerId, reward.amount)
    }
  },
});

// Register codes
codes.registerCode({
  code: "LAUNCH2025",
  description: "Launch day bonus",
  status: "ACTIVE",
  rewards: [
    { type: "coins", label: "1000 Coins", amount: 1000 },
    { type: "item", label: "Launch Hat", assetId: "hat_launch_2025" },
  ],
  maxUses: 10000, // global limit
  perPlayerLimit: 1, // one per player
  expiresAt: 0, // never expires (or set Unix timestamp)
  createdAt: os.time(),
  useCount: 0,
});

// Player redeems a code
const result = codes.redeemCode(player.UserId, "launch2025");

if (result.success) {
  // result.rewards contains the granted rewards
} else {
  // result.status: INVALID_CODE | ALREADY_REDEEMED | MAX_USES_REACHED | EXPIRED | DISABLED
  // result.message: human-readable error
}
```

## API

### `CodeStore`

| Method                              | Description                       |
| ----------------------------------- | --------------------------------- |
| `registerCode(code)`                | Register a single redeemable code |
| `registerCodes(codes)`              | Register multiple codes at once   |
| `unregisterCode(code)`              | Remove a code from the registry   |
| `getCode(code)`                     | Look up a code definition         |
| `getAllCodes()`                     | Get all registered codes          |
| `setCodeStatus(code, status)`       | Change a code's status            |
| `redeemCode(playerId, code)`        | Attempt to redeem a code          |
| `getPlayerRecords(playerId)`        | Get all redemptions for a player  |
| `hasPlayerRedeemed(playerId, code)` | Check if a player used a code     |

### `RedeemResult`

```ts
{
  success: boolean;
  status: "SUCCESS" | "INVALID_CODE" | "ALREADY_REDEEMED"
        | "MAX_USES_REACHED" | "EXPIRED" | "DISABLED";
  message: string;
  rewards?: CodeReward[];
}
```

### `RedeemableCode`

```ts
{
  code: string;         // stored as UPPER CASE
  description: string;
  status: "ACTIVE" | "EXPIRED" | "DISABLED";
  rewards: CodeReward[];
  maxUses: number;      // 0 = unlimited
  perPlayerLimit: number;
  expiresAt: number;    // 0 = never
  createdAt: number;
  useCount: number;
}
```

### `CodeReward`

```ts
{
  type: string;      // "coins", "gems", "item", "xp", etc.
  label: string;     // shown to player
  amount?: number;   // for currency/XP
  assetId?: string;  // for items
}
```

## Metrics

| Counter                      | Description               |
| ---------------------------- | ------------------------- |
| `codes_redemption_attempts`  | Total redemption attempts |
| `codes_redemption_successes` | Successful redemptions    |
| `codes_redemption_failures`  | Failed redemptions        |

## DataStore Layout

Player redemption records are stored per-player:

- **Key**: `codes_{playerId}`
- **Value**: `CodeRedemptionRecord[]` — array of `{ code, redeemedAt }`

Code definitions are kept in-memory (registered at server start). For
dashboard-managed codes, sync from an external source on startup.
