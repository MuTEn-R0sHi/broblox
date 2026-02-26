# Modules: Codes

Redeemable promo-code system with DataStore persistence (`@broblox/codes`). **Status: Implemented** (46 tests).

## Purpose

- Register redeemable codes with configurable rewards, use limits, and expiry.
- Server-side redemption with per-player and global use tracking.
- DataStore persistence for redemption records across sessions.

## Core rules

- All codes are stored and matched in UPPER-CASE (case-insensitive input).
- 6-step validation chain: registry lookup → status check → expiry → global use limit → per-player limit → persist.
- DataStore failures return graceful errors without granting rewards.
- Time-based expiry auto-marks codes as `EXPIRED` on first attempted use past deadline.

## Data model

- `RedeemableCode` — `code`, `description`, `status`, `rewards[]`, `maxUses`, `perPlayerLimit`, `expiresAt`, `useCount`.
- `CodeReward` — `type`, `label`, `amount?`, `assetId?`.
- `CodeStatus` — `"ACTIVE" | "EXPIRED" | "DISABLED"`.
- `CodeRedemptionRecord` — `code`, `redeemedAt`.
- `RedeemResult` — `success`, `status`, `message`, `rewards?`.

## Public API

| Method                              | Description                                   |
| ----------------------------------- | --------------------------------------------- |
| `registerCode(code)`                | Register a redeemable code                    |
| `registerCodes(codes[])`            | Bulk register                                 |
| `unregisterCode(code)`              | Remove from registry                          |
| `setCodeStatus(code, status)`       | Change ACTIVE/EXPIRED/DISABLED                |
| `redeemCode(playerId, code)`        | Full redemption flow — returns `RedeemResult` |
| `hasPlayerRedeemed(playerId, code)` | Check if player already redeemed              |
| `getPlayerRecords(playerId)`        | All redemption records from DataStore         |
| `getAllCodes()`                     | List all registered codes                     |

### Factory

```ts
const codes = createCodeRedemptionService({
  codes: [
    {
      code: "LAUNCH2026",
      description: "Launch day reward",
      status: "ACTIVE",
      rewards: [{ type: "currency", label: "Coins", amount: 500 }],
      maxUses: 10000,
      perPlayerLimit: 1,
      expiresAt: 0,
    },
  ],
});
```

## Security

- **UPPER-CASE normalisation** — case-insensitive matching.
- **Per-player limits** (default 1) prevent multi-redeem.
- **Global use limits** (`maxUses`, 0 = unlimited) prevent exhaustion.
- **DataStore `UpdateAsync`** — atomic updates; failure = no reward granted.
- **`pcall` wrapping** on all DataStore calls — prevents crashes.

## Config

| Key             | Default         | Description    |
| --------------- | --------------- | -------------- |
| `datastoreName` | `"PlayerCodes"` | DataStore name |
| `enableLogging` | `true`          | Debug logging  |

## Observability

- `codes_redemption_attempts` — total attempts
- `codes_redemption_successes` — successful redemptions
- `codes_redemption_failures` — failed attempts
