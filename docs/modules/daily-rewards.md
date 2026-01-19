# Modules: Daily rewards

A reusable login streak system.

## Purpose

- Drive retention via daily claims.
- Support streaks and catch-up rules.

## Core rules

- All claims are server validated.
- Claims are idempotent (`dailyRewardClaimId`).
- Time logic uses server time only.

## Data model (planned)

- `lastClaimDay` (server day index)
- `streakCount`
- `missedDays`

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
