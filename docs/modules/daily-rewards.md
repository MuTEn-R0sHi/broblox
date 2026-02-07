# Modules: Daily rewards

A reusable login streak system (`@rbx/rewards`). **Status: Implemented** (35 tests).

## Purpose

- Drive retention via daily claims.
- Support streaks and catch-up rules.

## Core rules

- All claims are server validated.
- Claims are idempotent (`dailyRewardClaimId`).
- Time logic uses server time only.

## Data model

- `lastClaimDay` — server day index of last claim
- `streakCount` — consecutive login days
- `gracePeriod` — configurable missed-day allowance before streak reset
- `rewards[]` — ordered reward definitions per day
- Achievement tracking via `AchievementStore` with progress counters

## Security

- Client requests claim.
- Server checks day window and prevents duplicates.
- Rate limit claim requests.

## Config/flags

- `dailyRewards.enabled` (kill-switch)
- `dailyRewards.calendar` (reward schedule)

## Observability

- `progression.daily_reward_claimed`
- `progression.daily_streak_reset`
- `security.daily_reward_duplicate_claim`
