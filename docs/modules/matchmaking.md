# Modules: Matchmaking

Server-authoritative matchmaking — queue management, match formation, ready-up, and reserved server teleportation (`@broblox/matchmaking`). **Status: Implemented** (125 tests).

## Purpose

- FIFO queue with optional MMR-based matching and configurable queue sizes.
- Match lifecycle state machine: `forming → starting → active → ended/cancelled`.
- Ready-up system with per-player tracking and `AllPlayersReady` events.
- Reserved server allocation and teleportation with retry logic.

## Core rules

- Players can only be in one queue at a time (single-queue enforcement).
- Match transitions follow a strict state machine — invalid transitions return errors.
- Queue entries auto-expire after `timeoutSeconds` to prevent starvation.
- Teams are assigned via round-robin when `teamSize` and `teamCount` are configured.

## Data model

- `QueueEntry` — `playerId`, `joinedAt`, `mmr?`, `gameMode`, `metadata?`.
- `QueueConfig` — `gameMode`, `minPlayers`, `maxPlayers`, `timeoutSeconds`, `useMMR?`, `maxMMRDelta?`.
- `Match` — `matchId`, `gameMode`, `players`, `teams?`, `status`, `serverAccessCode?`.
- `MatchStatus` — `"forming" | "starting" | "active" | "ended" | "cancelled"`.
- `ReservedServer` — `accessCode`, `placeId`, `matchId`, `expectedPlayers`, `joinedPlayers`.
- `TeleportRequest` — `requestId`, `matchId`, `players`, `status`, `retryCount`.

## Public API

### Queue management

| Method                                | Description                              |
| ------------------------------------- | ---------------------------------------- |
| `registerQueue(config)`               | Register a game mode queue               |
| `joinQueue(playerId, gameMode, mmr?)` | Add player to queue                      |
| `leaveQueue(playerId, reason?)`       | Remove player from queue                 |
| `getQueueStatus(playerId)`            | Position, wait time, estimated wait      |
| `tryFormMatch(gameMode, config?)`     | FIFO match formation with optional teams |
| `processTimeouts()`                   | Evict players exceeding timeout          |

### Match lifecycle

| Method                                  | Description                                           |
| --------------------------------------- | ----------------------------------------------------- |
| `playerReady(playerId)`                 | Ready-up; emits `AllPlayersReadyEvent` when all ready |
| `transitionToStarting(matchId)`         | `forming → starting`                                  |
| `startMatch(matchId)`                   | `starting → active`                                   |
| `endMatch(matchId)`                     | `active → ended`                                      |
| `cancelMatch(matchId, reason?)`         | Any → `cancelled`                                     |
| `removePlayerFromMatch(playerId, min?)` | Auto-cancels if below threshold                       |

### Server allocation

| Method                                      | Description                         |
| ------------------------------------------- | ----------------------------------- |
| `allocateServer(placeId, matchId, players)` | Reserve a private server            |
| `teleportToMatch(matchId, players, data?)`  | Teleport players to reserved server |
| `recordPlayerJoined(matchId, playerId)`     | Track player arrivals               |
| `cleanupExpiredServers()`                   | Evict stale reservations            |

### Factory

```ts
const mm = createMatchmakingService({
  queues: [{ gameMode: "ffa", minPlayers: 2, maxPlayers: 8, timeoutSeconds: 120 }],
  teleportService: myTeleportService,
});
```

## Security

- **Server-authoritative** — all queue and match state is server-side only.
- **Single-queue enforcement** — joining a second queue fails.
- **TeleportService DI** — injectable interface; stub returns errors in tests.
- **Player verification** — `recordPlayerJoined` validates against expected player list.

## Config

| Key                         | Default   | Description                      |
| --------------------------- | --------- | -------------------------------- |
| `timeoutSeconds`            | per-queue | Queue entry TTL                  |
| `maxMMRDelta`               | per-queue | Max MMR gap for matching         |
| `maxRetries`                | `3`       | Server allocation retry attempts |
| `retryDelaySeconds`         | `2`       | Delay between retries            |
| `reservationTimeoutSeconds` | `300`     | Stale server cleanup window      |

## Observability

- `QueueJoinEvent` / `QueueLeaveEvent` — queue activity
- `MatchFormedEvent` — match created (player count, avg wait time)
- `MatchStatusChangedEvent` — state transitions
- `AllPlayersReadyEvent` — all players ready
- `ServerAllocatedEvent` — server reserved
- `TeleportInitiatedEvent` / `TeleportFailureEvent` — teleport lifecycle
