# Architecture: State & data

## Principles

- Server owns canonical state.
- Persistence is versioned and migratable.
- All grants are idempotent.

## Data types

- Durable (persistent): player progression, inventory, MMR, punishments
- Ephemeral (short-lived): matchmaking queues, temporary tokens, rate limit counters
- Observability: events/logs, match summaries, moderation evidence links

## Storage strategy

Roblox-side:

- DataStore: durable player profile and ledgers (careful with budgets)
- MemoryStore: queues/tokens/state caches (TTL, best effort)
- MessagingService: fanout invalidations (best effort)

Web-side (dashboard):

- Postgres for audit logs and config history
- Optional: Redis for queues/caching

## Profile schema (planned)

- `schemaVersion`
- `progression` (xp, level, season)
- `mmr` (per mode)
- `inventory` (owned items, equipped loadouts)
- `moderation` (ban state, mutes, trust score)
- `receipts` / `grants` (idempotency keys)

## Idempotency (non-negotiable)

Every mutation that can be retried must have a unique id:

- purchases: receipt id
- rewards: claim id
- admin actions: action id
- match results: match id + version

## Migration model

- Each document stores `schemaVersion`.
- On load:
  - migrate to current
  - write back only when safe

## Competitive integrity

- Match results are computed server-side.
- Rewards are granted via a ledger-like process.
- Any detected corruption triggers containment (disable grants, require review).
