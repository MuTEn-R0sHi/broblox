# Modules: Core

Core framework — service lifecycle, logging, and error handling (`@broblox/core`). **Status: Implemented** (153 tests).

## Purpose

- Provide the service lifecycle used by every game and package (`register → boot → onInit → onStart`).
- Centralize structured logging with named child loggers and log levels.
- Supply resource cleanup via `Janitor` and time helpers via `Clock`.
- Reusable across every game — all higher-level packages depend on core.

## Public API

### Service lifecycle

- `Application` — top-level container that registers `Service` instances.
- `Service` — base class with `onInit()` and `onStart()` lifecycle hooks.
- `createPlayerLifecycleService()` — factory that wires up `Players.PlayerAdded` / `PlayerRemoving` events. Includes built-in deduplication to prevent double-fire of `PlayerAdded` if a player reconnects before the previous session is fully torn down.

### Logging

- `createLogger(name)` — returns a `Logger` with `debug`, `info`, `warn`, `error` methods.
- `Logger` — supports child loggers for scoped context.
- `LogLevel` — `Debug | Info | Warn | Error`.
- `logError()` — rich error formatter that handles strings, tables, and error objects.

### Utilities

- `Janitor` — tracks connections, instances, and cleanup callbacks; `destroy()` releases all.
- `Clock` — `now()` (`os.clock`) and `timestamp()` (`os.time`).
- Collection helpers — `arraySize`, `arrayRemoveAt`, `arrayTake`, `setSize`.

## Dependencies

- `@broblox/shared-types` (zero-runtime-dep type package).

## Data ownership

Core owns no player data. It provides lifecycle hooks for other modules to load/save their own data.

## Trust & security

Core runs entirely server-side. No client API surface.

## Configuration

No feature flags. Log level is set at `createLogger` call-site.

## Observability

- `core.service_init` — emitted when a service completes `onInit`.
- `core.service_start` — emitted when a service completes `onStart`.
- `core.player_added` / `core.player_removing` — lifecycle events.

## Testing

153 unit tests covering service lifecycle (including PlayerAdded deduplication), logger output, Janitor cleanup, Clock wrappers, application lifecycle, and collection helpers.
