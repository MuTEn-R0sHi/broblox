# @rbx/matchmaking

Matchmaking and match lifecycle management for competitive games.

## Purpose

This package provides the infrastructure for competitive matches:

- **Queue management** — Player queuing with skill-based grouping
- **Match lifecycle** — State machine for match phases
- **Team balancing** — Fair team composition
- **Server allocation** — Reserved server management

## Dependencies

- `@rbx/core` — Logging, cleanup utilities
- `@rbx/shared-types` — Type definitions
- `@rbx/constants` — Match constants

## Architecture

### Match States

```
WAITING → STARTING → IN_PROGRESS → ENDING → COMPLETED
    ↓         ↓           ↓
 CANCELLED  CANCELLED   CANCELLED
```

### Queue System

```typescript
// Players join queue with preferences
Queue.join(player, {
  mode: "ranked",
  region: "us-east",
});

// Matchmaker groups players by:
// 1. Game mode
// 2. Skill rating (MMR)
// 3. Region/latency
// 4. Party grouping
```

### Match Lifecycle

```typescript
import { Match, MatchState } from "@rbx/matchmaking";

// Create match from queue pop
const match = Match.create({
  players: queuedPlayers,
  mode: "ranked",
  map: "arena_01",
});

// State transitions are server-controlled
match.start(); // WAITING → STARTING
match.begin(); // STARTING → IN_PROGRESS
match.end(results); // IN_PROGRESS → ENDING → COMPLETED
```

## Usage

```typescript
import { MatchmakingService, MatchEvents } from "@rbx/matchmaking";

// Listen for match found
MatchEvents.onMatchFound.Connect((match) => {
  // Teleport players to match server
});

// Listen for match completion
MatchEvents.onMatchCompleted.Connect((match, results) => {
  // Update rankings, give rewards
});
```

## Related Docs

- [Matchmaking & Ranking Architecture](../../docs/architecture/matchmaking-and-ranking.md)
- [Phase 2 PvP Alpha](../../docs/roadmap/phase-2-pvp-alpha.md)
