# Modules: Trading

> **Status: NOT IMPLEMENTED** — This module is planned for a future phase. No `@broblox/trading` package exists yet. See [Future Phases](../roadmap/future-phases.md).

Trading is high risk (fraud, scams, economy abuse). It must be gated and kill-switchable.

## Purpose

- Allow player-to-player trades of eligible items.
- Provide an escrow model so no duplication occurs.

## Core rules

- Trading is disabled by default until policy and abuse controls are proven.
- All trades are server authoritative and ledgered.
- Every trade has a unique `tradeId` and is idempotent.

## Threats

- dupes via retries or server hops
- impersonation / scams
- exploiters spamming trade requests

## Mitigations

- Escrow state lives server-side; items are locked during trade.
- Rate limits on requests, offers, accept/decline.
- Account gating:
  - account age
  - prior moderation status
  - optional trust score threshold

## Data model (planned)

- `tradeLedger[]` (append-only summary entries)
- `lockedItems[]` (temporary locks with TTL)

## Config/flags

- `trading.enabled` (hard kill-switch)
- `trading.eligibility` (account age, trust score)
- `trading.rateLimits`

## Observability

- `trade.requested`
- `trade.completed`
- `security.trade_spam`
- `security.trade_duplicate`

## Rollout

- Dev only initially
- Stage with internal testers
- Prod with strict gating + rapid kill-switch
