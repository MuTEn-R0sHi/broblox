# Architecture: Matchmaking & ranking (PvP spec)

This page defines the competitive matchmaking model, ranking/MMR rules, party behavior, and anti-abuse protections.

## Goals

- Fair matches with acceptable queue times.
- Predictable ranked integrity (anti-boosting).
- Works across devices and regions.

## Concepts

- **Mode**: a queue definition (e.g. `ranked_2v2`, `casual_6v6`).
- **Ticket**: a request to match (player or party).
- **Match**: an allocated game server session.
- **MMR**: hidden rating used for matchmaking.
- **Rank**: player-facing tier derived from MMR (seasonal).

## Queue definitions

Each mode specifies:

- team size (e.g. 2v2)
- ranked vs casual
- allowed device classes (kbm/gamepad/touch)
- region selection policy
- max allowed party size
- allowed ping window
- allowed MMR spread (expands over time)

## Party rules

- A party queues as a unit.
- Party MMR for matchmaking:
  - default: use **max MMR** in the party (anti-smurf)
  - alternative: weighted average (only if queue times are unacceptable)

Restrictions (ranked):

- party size must match mode constraints
- prevent high MMR + very low MMR pair abuse by limiting MMR spread

## Region selection

- Prefer lowest median ping among party members.
- If region is overloaded, expand to next best region.
- Avoid mixing very high ping players into ranked where possible.

## Match allocation

Recommended approach:

1. Queue join writes a ticket to MemoryStore with TTL.
2. Matchmaker worker (server-side or dedicated place) forms matches.
3. Allocate a reserved server and Teleport players.
4. Match server validates the ticket and starts the match.

## MMR model (v1)

Start simple:

- Elo-like update per match
- Separate MMR per mode (2v2 vs 6v6)
- Provisional state for new players (higher volatility)

Season model:

- Season resets _rank_ visuals.
- MMR may be soft-reset (e.g. pull toward mean) to reduce long-term drift.

## Rank tiers (player-facing)

Example:

- Bronze / Silver / Gold / Platinum / Diamond / Elite

Rules:

- Rank is derived from MMR + confidence.
- Ranked rewards are tied to season rank and require clean match completion.

## Anti-abuse (ranked integrity)

Signals:

- suspicious repeated matches against same opponents
- extreme win trading patterns
- party pairing patterns inconsistent with population
- abnormal disconnect patterns near loss

Mitigations:

- reduce MMR gain for repeated opponent pairings
- block rematches beyond threshold
- quarantine suspicious accounts to unranked-only
- require additional verification gating for ranked (account age, trust score)

## Disconnect handling

- Treat disconnects as losses only with caution (avoid punishing network issues too harshly).
- For ranked:
  - track disconnect rate
  - apply queue penalties for chronic leavers

## Teleport and ticket validation

- TeleportData is not trusted.
- Match server must validate ticket authenticity via server-side storage (MemoryStore/DataStore).

## Observability

Must log:

- queue time distributions per mode and region
- match formation failures
- teleport failures
- MMR updates and anomalies
- anti-abuse signals and enforcement actions
