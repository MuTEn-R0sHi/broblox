# Modules: Data

Data persistence layer for Roblox games (`@broblox/data`). **Status: Implemented** (~33 tests).

## Purpose

- Provide type-safe player data storage with versioning, session locking, and retry.
- Abstract away Roblox `DataStoreService` complexity behind a clean API.
- Prevent data corruption from multi-server sessions via session locking.
- Reusable across games — each game defines its own profile schema.

## Public API

### Service factory

- `createDataService(config)` — creates a data service with save scheduling and session locking.
- `DataServiceConfig` — connection options (store name, save interval, retry policy).
- `DataServiceHandle` — returned handle with `Service` and lifecycle methods.

### Stores

- `PlayerDataStore` — profile loading, saving, querying for a single player.
- `BasePlayerStore` / `BaseStoreConfig` — extensible base class for custom stores.

### Session management

- Session module — session locking to prevent multi-server data corruption.

## Dependencies

- `@broblox/core` (service lifecycle, logging).
- `@broblox/shared-types` (branded IDs, Result type).

## Data ownership

Owns the player profile root key. Each module writes its own sub-keys under the profile.

## Core rules

- All reads/writes go through `PlayerDataStore`; no direct `DataStoreService` calls.
- Session lock is acquired on `PlayerAdded` and released on `PlayerRemoving`.
- Write-behind queue batches saves every 30 seconds; purchases trigger immediate flush.
- Exponential backoff retry on transient `DataStore` errors.

## Trust & security

- Data is server-authoritative. Clients never read/write directly.
- Session locking prevents stale writes from zombie servers.

## Configuration

- `data.saveIntervalSeconds` — batch save cadence (default 30).
- `data.maxRetries` — retry cap for transient failures.
- `data.sessionLockTTL` — lock expiry (default 300 s).

## Observability

- `data.profile_loaded` — profile loaded for a player.
- `data.profile_saved` — profile saved (batch or immediate).
- `data.session_lock_acquired` / `data.session_lock_released`.
- `data.save_error` — retry exhausted or permanent failure.

## Testing

~33 unit tests covering store CRUD, session locking, retry logic, and write-behind scheduling.
