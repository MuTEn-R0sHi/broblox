# @broblox/data

Data persistence layer for Roblox games.

## Purpose

This package provides reliable data persistence patterns:

- **Player data store** — Profile loading, saving, session management
- **Session locking** — Prevent data corruption from multiple servers
- **Retry policies** — Handle DataStore throttling gracefully
- **Schema versioning** — Safe migrations for data structure changes

## Dependencies

- `@broblox/core` — Logging, cleanup utilities
- `@broblox/shared-types` — Type definitions

## Architecture

### Session Locking

Only one server can write to a player's data at a time:

```typescript
// On player join:
// 1. Attempt to acquire lock (write server ID to profile)
// 2. If lock held by another server, wait or fail
// 3. Load profile data
// 4. On leave: save and release lock
```

### Retry Policy

DataStore operations use exponential backoff:

```typescript
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  jitter: true, // Avoid thundering herd
};
```

### Write-Behind Queue

Changes are batched to reduce DataStore calls:

```typescript
// Changes queued in memory
// Flushed every 30s or on player leave
// Critical writes (purchases) flush immediately
```

## Usage

```typescript
import { PlayerDataStore } from "@broblox/data";

// Load player profile
const profile = await PlayerDataStore.load(player);

// Update data (queued for batch save)
profile.data.coins += 100;

// Force immediate save
await profile.save();
```

## Related Docs

- [State & Data Architecture](../../docs/architecture/state-and-data.md)
- [Data Corruption Runbook](../../docs/runbooks/data-corruption.md)
