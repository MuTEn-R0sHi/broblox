# Roblox-TS: Performance

## Performance philosophy

- Prefer correctness and security first, then optimize hot paths.
- Optimize based on measurement, not assumptions.

## Server performance targets (initial)

- Stable simulation with headroom under peak players.
- No unbounded loops or per-frame allocations in hot paths.

## Client performance targets (initial)

- Mobile-first UI performance: minimize layout thrash.
- Avoid heavy per-frame work in UI and effects.

## Replication cost awareness

- Instances replicate; too many instances is too expensive.
- Prefer compact replicated state (attributes or minimal objects) when needed.
- Prefer server snapshots over replicating many transient objects.

## Networking budgets

- Batch input commands.
- Keep payloads small, bounded, and validated.
- Avoid RemoteFunction for high-frequency traffic.
