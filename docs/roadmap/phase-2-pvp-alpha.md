# Phase 2 — PvP Alpha (v0.2)

> **Status: ✅ COMPLETE** — All acceptance criteria met. Ready for Phase 3.

This page documents the scope for **Phase 2**: competitive PvP gameplay with server-authoritative combat and match history tracking.

## Goal

- Server-authoritative hit validation prevents client-side exploits
- Match lifecycle is tracked end-to-end (queue → play → summary)
- Dashboard provides visibility into match outcomes and player performance
- Combat systems demonstrate proper trust boundary enforcement

## Delivered

### Combat Package (`packages/combat/`)

- **Weapon System** — Type-safe weapon definitions with stats (damage, fire rate, range, ammo)
- **Hit Validation** — Server-authoritative raycast validation with sanity checks
- **Damage Calculation** — Headshot multipliers, armor reduction, damage falloff
- **Cooldown Manager** — Server-enforced ability cooldowns
- **Combat State** — Centralized combat state with health, armor, status effects

### Match System (`packages/matchmaking/`)

- **Match Manager** — Full lifecycle management (waiting → starting → in-progress → ended)
- **Match State** — Team scores, player stats, time remaining
- **Match Events** — Typed events for kills, assists, round changes
- **Auto-balancing** — Team assignment with balance considerations

### Server Allocation (`packages/matchmaking/`)

- **Server Allocator** — Reserved server provisioning via Roblox TeleportService
- **Health Monitoring** — Server health checks with player counts
- **Graceful Shutdown** — Clean server decommissioning with player migration

### Dashboard Match History (`apps/dashboard/`)

- **Match List Page** — Filterable list with pagination
- **Match Detail Page** — Full match breakdown with player stats
- **Player Performance** — K/D, damage dealt, accuracy tracking
- **Status Filtering** — Filter by match status and game mode

### Database Schema

- **Match Table** — Match metadata, timestamps, outcome
- **MatchPlayer Table** — Per-player stats linked to matches

## Security Baseline

All Phase 2 features enforce the security model:

| Concern              | Implementation                                         |
| -------------------- | ------------------------------------------------------ |
| Hit validation       | Server raycast verification, distance/LOS checks       |
| Damage authority     | Server calculates all damage, clients only send intent |
| Cooldown enforcement | Server tracks all cooldowns, rejects early ability use |
| Match integrity      | Server controls match state transitions                |
| Anti-wallhack        | Server validates line-of-sight for hits                |

## Test Coverage

Phase 2 added comprehensive tests for combat systems:

- Combat state management tests
- Weapon fire and reload tests
- Hit validation tests
- Damage calculation tests
- Match lifecycle tests

## API Surface

### Combat Types

```typescript
interface WeaponDefinition {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  range: number;
  magazineSize: number;
  reloadTime: number;
  headshotMultiplier: number;
}

interface HitValidationResult {
  valid: boolean;
  damage: number;
  headshot: boolean;
  reason?: string;
}
```

### Match Types

```typescript
interface MatchState {
  matchId: string;
  status: MatchStatus;
  teams: Map<TeamId, TeamState>;
  players: Map<PlayerId, PlayerMatchState>;
  timeRemaining: number;
}

type MatchStatus = "waiting" | "starting" | "in_progress" | "ended";
```

## Dashboard Routes

| Route                     | Description               |
| ------------------------- | ------------------------- |
| `/dashboard/matches`      | Match list with filtering |
| `/dashboard/matches/[id]` | Match detail view         |

## Related Documents

- [Hit Validation Architecture](../architecture/hit-validation.md)
- [Matchmaking Design](../architecture/matchmaking-and-ranking.md)
- [Phase 1 — Platform MVP](./phase-1-platform-mvp.md)
