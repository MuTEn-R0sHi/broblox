# ADR-0003: Persistence, idempotency, and ledgers

## Status

Accepted

## Context

Roblox persistence is budgeted and failure-prone under load (throttling, transient errors). Multiplayer introduces concurrency (multiple servers writing, teleports, retries). Competitive PvP and monetization require correctness and auditability.

Without a strict idempotency model, we risk:

- duplicate rewards or purchases (economy inflation)
- inconsistent progression/MMR
- hard-to-debug “ghost grants” and support burden

## Decision

We will treat all grants and critical mutations as **idempotent** and, where appropriate, **ledgered**.

Rules:

- Every critical mutation has an idempotency key:
  - purchases: receipt id
  - rewards: claim id
  - match results: match id + result version
  - admin actions: admin action id
- Persistence writes use conflict-safe patterns:
  - prefer `UpdateAsync`-style merges for contested keys
  - avoid overwriting whole documents without merge logic
- Player profile documents include:
  - `schemaVersion`
  - `lastWriteAt`
  - bounded “processed ids” sets for dedupe (with pruning)

Ledger guidance:

- For monetization and high-impact rewards, record an append-only ledger entry (or an equivalent durable record) before applying the grant.
- If ledger write succeeds but profile write fails, reconcile later.

## Alternatives considered

- “Best effort” persistence with `SetAsync`
  - Rejected: too prone to corruption and duplication.

- Full external database for all game state
  - Deferred: adds complexity; keep Roblox as the primary store initially, with a dashboard DB for ops/audit.

## Consequences

- Slightly more code and storage, significantly higher integrity.
- Requires bounded dedupe storage and pruning policies.
- Enables reliable support tooling and player compensation policies.

## Rollout plan

1. Define canonical idempotency key formats in shared types.
2. Implement a dedupe helper in `core` or `security`.
3. Ensure commerce receipts and match rewards both use the same idempotency primitives.
4. Add observability events for duplicate attempts and reconciliation outcomes.
