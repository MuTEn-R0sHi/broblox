# ADR-0007: Multi-game dashboard design

## Status

Accepted

## Context

The initial dashboard was designed as a single-game control plane. Every
entity that required Roblox-side integration — feature flags, bans, mutes,
matches, metric points — had no `gameId` foreign key and was therefore
game-blind. The Open Cloud bridges (`featureflags-bridge.ts`,
`moderation-bridge.ts`) routed every call to the single `ROBLOX_UNIVERSE_ID`
environment variable, making it impossible to manage multiple title
experiences from one dashboard without code changes.

The platform roadmap calls for shipping several distinct Roblox experiences
(obby, starter, future titles) all operated by the same team with the same
tooling. The dashboard must therefore act as a **multi-game control plane** —
registering each experience and routing all actions to the correct universe.

### Constraints

- Backward compatibility: existing rows with `gameId = NULL` must continue to
  work without a migration that rewrites every record.
- The Flags API is consumed by in-game `HttpService` calls; changing its
  interface must be additive.
- RBAC already covers all action types and must simply gain game-management
  permissions.

## Decision

### 1 `Game` registry model

A new `Game` Prisma model is the root anchor for all per-experience
configuration:

```prisma
model Game {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  description   String?
  iconUrl       String?

  // Per-environment Roblox identifiers
  universeIdDev   BigInt?
  universeIdStage BigInt?
  universeIdProd  BigInt?
  placeIdDev      BigInt?
  placeIdStage    BigInt?
  placeIdProd     BigInt?

  isActive   Boolean  @default(true)
  createdById String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

Roblox IDs are per-environment so that one slug can span a dev place, a
staging universe, and the production universe with independent routing.

### 2 Optional `gameId` foreign key on every controllable entity

All entities that flow to Roblox receive an optional FK:

| Entity        | `gameId` semantics                                    |
| ------------- | ----------------------------------------------------- |
| `FeatureFlag` | Scoped flag; null = global (applies to all games)     |
| `Ban`         | Game-specific ban; null = platform-wide ban           |
| `Mute`        | Game-specific mute; null = platform-wide mute         |
| `Match`       | Always game-scoped (null only for legacy rows)        |
| `MetricPoint` | Scoped metric; null = platform-wide / non-game metric |
| `AuditLog`    | Contextual; null = admin action not tied to a game    |

Using nullable rather than required keeps all pre-existing rows valid without
a destructive migration.

### 3 Flag key uniqueness per game

The `FeatureFlag.key` column changes from `@unique` to `@@unique([key,
gameId])`:

- A global flag (`gameId = null`) and a game-specific flag may share the same
  key — the game-specific value shadows the global one in API responses.
- Two game-specific flags for _different_ games may share the same key.

### 4 Flags API additive game resolution

`GET /api/flags/[environment]` accepts two optional query parameters:

| Parameter      | Resolution strategy                                     |
| -------------- | ------------------------------------------------------- |
| `?gameId=`     | Direct CUID lookup in the `Game` table                  |
| `?universeId=` | Looks up the `universeId{Env}` column for the given env |

When a game is resolved the response merges:

1. All global flags (`gameId = null`)
2. All game-specific flags for the resolved game

Game-specific flags win on key conflicts. If no query parameter is supplied
the response contains only global flags (identical to the legacy behavior).

### 5 Per-game bridge routing

Both Open Cloud bridge modules accept an optional `universeId` / `universeIds`
argument instead of always reading `ROBLOX_UNIVERSE_ID` from the environment:

- `featureflags-bridge`: `bridgeSyncFeatureFlagsToRoblox(flags, universeIds?)`
  — the caller resolves the game's `universeId{Env}` values and passes them;
  the bridge falls back to `ROBLOX_UNIVERSE_ID` when the argument is absent.
- `moderation-bridge`: every function accepts `universeId?: number` with the
  same fallback semantics.

This keeps the bridges environment-variable-driven for global/legacy use while
enabling per-game routing for new calls.

### 6 RBAC additions

Four new permission tokens are added to the capability matrix:

| Permission     | Granted to                                  |
| -------------- | ------------------------------------------- |
| `games:view`   | VIEWER, SUPPORT, MODERATOR, ENGINEER, ADMIN |
| `games:create` | ADMIN only                                  |
| `games:manage` | ENGINEER, ADMIN                             |
| `games:delete` | ADMIN only                                  |

### 7 Dashboard surfaces

New UI surfaces added to the dashboard:

- **`/dashboard/games`** — game card grid with per-game flag/match/ban counts
  and linked environment badges.
- **`/dashboard/games/[id]`** — per-game control page with Roblox identifier
  table, stat cards, and quick links to game-scoped views of flags, matches,
  moderation, players, and audit log.
- **Dashboard home** — "Games" stat card (count of active experiences) and a
  game overview grid replacing the old "Mod Actions" card.

## Consequences

### Positive

- A single dashboard instance manages all current and future Roblox
  experiences.
- Flag namespacing is unambiguous: the same key can have different values per
  game without collision.
- Bridge routing is data-driven (stored in the DB) rather than hard-coded in
  env vars, removing the need to re-deploy when Roblox IDs change.
- Backward compatible: `NULL` game IDs continue to work as "global/platform"
  scope on all entities.

### Negative / trade-offs

- A schema migration is required to add the `Game` table and `gameId` columns.
  Existing rows are unaffected (columns default to `NULL`).
- Callers of the Flags API that relied on a flat, unique key namespace must be
  reviewed if they may now receive game-shadowed values unexpectedly (they
  won't unless they pass `?gameId` or `?universeId`, so the default path is
  unchanged).
- Introducing a nullable FK on `Ban` / `Mute` creates two conceptual scopes
  (global vs. game-local); operators must understand the distinction when
  issuing moderation actions.

## Alternatives considered

### Hard-code one universe per environment via env vars (status quo)

Simple but does not scale beyond one experience. Ruled out immediately given
the roadmap.

### Separate dashboard instance per game

Operationally expensive (N deployments, N databases, N config sets) and makes
cross-game analytics impossible. Ruled out.

### Require `gameId` (non-nullable) on all entities

Forces a destructive migration and breaks the concept of platform-wide
(cross-game) bans and global feature flags. Ruled out in favor of nullable.
