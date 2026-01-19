# Modules: Battle pass

A reusable seasonal progression system.

## Purpose

- Provide seasonal progression with rewards.
- Support both free and premium tracks.
- Work across multiple games with shared account progression.

## Core rules

- Progress is granted server-side only.
- Claims are idempotent (`battlePassClaimId`).
- Rewards must be ledgered if economy-impacting.

## Data model (planned)

- `seasonId`
- `xp`
- `level`
- `claimedRewards[]` (bounded set)
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
