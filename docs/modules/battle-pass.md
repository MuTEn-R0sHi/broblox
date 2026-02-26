# Modules: Battle pass

A reusable seasonal progression system (`@broblox/battle-pass`). **Status: Implemented** (29 tests).

## Purpose

- Provide seasonal progression with rewards.
- Support both free and premium tracks.
- Work across multiple games with shared account progression.

## Core rules

- Progress is granted server-side only.
- Claims are idempotent (`battlePassClaimId`).
- Rewards must be ledgered if economy-impacting.

## Data model

- `seasonId` — active season identifier
- `xp` — current season XP
- `tier` — current tier (computed from XP)
- `claimedFree[]` — claimed free-track rewards (bounded set)
- `claimedPremium[]` — claimed premium-track rewards
- `premiumUnlocked: boolean`

## Security

- Client may request claim for a reward tier.
- Server verifies eligibility and marks claim idempotently.
- Rate limit claim requests.

## Config/flags

- `battlePass.enabled` (kill-switch)
- `battlePass.seasonId`
- `battlePass.tiers` (reward definitions)

## Observability

- `progression.battlepass_xp_granted`
- `progression.battlepass_reward_claimed`
- `security.battlepass_invalid_claim`

## Rollout

- Dev: enable by default
- Stage: canary with a small segment
- Prod: progressive rollout + instant kill-switch
