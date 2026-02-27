# ADR-0010: Versioned Data and Migrations

**Status:** Accepted  
**Date:** 2026-02-27  
**Relates to:** S7 from the improvement plan

## Context

`BasePlayerStore<TData>` is the abstract base class for all per-player DataStore-backed stores. The `TData` generic had no constraint, which meant:

1. Subclasses were not required to include a `__version` field in their stored data.
2. There was no migration hook — schema changes to stored data would silently produce corrupt/partial objects when old data was loaded.
3. `PlayerDataStore<T extends VersionedData>` (the higher-level store) already handled versioning, but the simpler `BasePlayerStore` that feature stores extend did not.

## Decision

### Opt-in versioning via schemaVersion()

The `TData` generic remains unconstrained so that simple stores work without modification. Versioning is **opt-in**: stores that need data migrations override `schemaVersion()` and include `__version` in their data.

```typescript
export abstract class BasePlayerStore<
  TData,
  TConfig extends BaseStoreConfig = BaseStoreConfig,
>
```

### schemaVersion() — non-abstract, defaults to 0

```typescript
protected schemaVersion(): number {
  return 0;
}
```

A return value of `0` means "no versioning" — the migration block in `load()` is skipped entirely. Stores that use versioning override this to return a positive integer.

### Migration hook

A default-no-op `migrate()` method is provided:

```typescript
protected migrate(data: TData, _fromVersion: number): TData {
  return data;
}
```

Subclasses override this to transform old data into the new shape. The method receives the loaded data and the version it was stored at.

### Version check on load

`load()` checks `schemaVersion()` first — if it returns `0`, the entire migration block is skipped. When versioning is active (`schemaVersion() > 0`), it compares the stored version against the current one:

```typescript
const currentVersion = this.schemaVersion();
if (currentVersion > 0) {
  const storedVersion = data.__version ?? 0;
  if (storedVersion < currentVersion) {
    this.data = this.migrate(this.data, storedVersion);
    this.data.__version = currentVersion;
    this.markDirty();
  }
}
```

### Policy for feature stores that opt in

When a feature store wants data versioning:

1. Include `__version: 1` in default data (or extend `VersionedData`).
2. Override `schemaVersion()` to return the current version number.
3. When any stored field is added, renamed, or removed, increment `schemaVersion()`.
4. Implement `migrate(data, fromVersion)` to transform old data — handle each version step.

## Consequences

- Existing `BasePlayerStore` subclasses are **not** affected — they continue to work without any changes.
- Stores that opt into versioning by overriding `schemaVersion()` gain automatic migration on load.
- Data saved with no `__version` field is treated as version 0 and will trigger migration on first load if the store has `schemaVersion() > 0`.
- Migration only runs on load, not on save — saves always write the current schema version.
