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

- MySQL/MariaDB for audit logs and config history
- Optional: Redis for queues/caching

## DataStore reliability patterns

### Session locking

To prevent data corruption from multiple servers writing to the same player profile:

- Use **session locking** pattern: one server "owns" a player's data at a time
- On join: acquire lock (write server ID + timestamp to profile metadata)
- On leave: release lock and save final state
- On conflict: newer session wins after grace period

Consider using `@rbxts/profileservice` or similar battle-tested library that implements this pattern.

### Retry policy

DataStore operations can fail due to throttling or transient errors:

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  jitter: true, // ±20% randomization to avoid thundering herd
};

// Exponential backoff: 1s → 2s → 4s (with jitter)
```

### Budget management

DataStore has strict rate limits (60 + 10×players requests/min for GetAsync, etc.):

- **Batch reads** on player join (single GetAsync for full profile)
- **Debounce writes** (queue changes, flush periodically or on leave)
- **On budget exhaustion**: queue writes in-memory, flush on player leave
- **Critical writes** (purchases): retry with higher priority, alert if persistently failing

### Write-behind queue

```typescript
interface WriteQueue {
  pending: Map<string, ProfileData>;
  flushIntervalMs: 30000; // flush every 30s
  flushOnLeave: true;
  maxQueueSize: 100; // per server
}
```

If a player leaves before flush completes, attempt synchronous save with timeout.

### Corruption recovery

- Store `schemaVersion` and `lastWriteAt` in every profile
- On load, validate schema; if corrupt, load from backup or quarantine
- See `docs/runbooks/data-corruption.md` for recovery procedures

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
