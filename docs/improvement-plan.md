# BroBlox Improvement Plan

> **Generated:** 2026-02-26  
> **Based on:** Full deep-dive code review of all 33 packages  
> **Format:** Each session is a focused, completable unit of work with a clear scope, exact files, and acceptance criteria.

This plan converts every finding from the code review into an ordered, dependency-aware execution schedule. Sessions are sized to be completable in 1–3 hours each. Run them in order — later sessions build on earlier ones.

---

## Quick-reference priority table

| Session | Area | Severity | Effort |
| ------- | ---- | -------- | ------ |
| [S1](#s1) | Memory leaks — RateLimiter & security state Maps | 🔴 High | ~1 h |
| [S2](#s2) | Constants — move magic numbers to `@broblox/constants` | 🔴 High | ~1 h |
| [S3](#s3) | Security — configurable thresholds + auto-cleanup integration | 🔴 High | ~2 h |
| [S4](#s4) | Logger — fix `child()` prefix extraction, cache prefix string | 🟡 Medium | ~30 min |
| [S5](#s5) | Net — expose `cleanup(playerId)` + integrate with player lifecycle | 🟡 Medium | ~1 h |
| [S6](#s6) | Testing — DataStore mock + richer Player mock | 🟡 Medium | ~2 h |
| [S7](#s7) | Data — wire `BasePlayerStore` subclasses to `VersionedData` | 🟡 Medium | ~2 h |
| [S8](#s8) | Moderation — deduplication, cleanup lifecycle, callback safety | 🟡 Medium | ~2 h |
| [S9](#s9) | Net validation — short-circuit on first failure + NaN guard | 🟢 Low | ~1 h |
| [S10](#s10) | Protocol — validation robustness + NaN/negative guard | 🟢 Low | ~30 min |
| [S11](#s11) | Core — duplicate-name collision produces unreachable service | 🟢 Low | ~1 h |
| [S12](#s12) | Docs — update ADRs to reflect improvements | 🟢 Low | ~1 h |

---

## S1 — Memory leaks in module-level Maps {#s1}

### Problem

Four modules hold player state in **module-level Maps that never evict entries** for players who have left the server. Over a long session (hours, many joins/leaves) these Maps grow unboundedly.

| File | Map(s) | Leak surface |
| ---- | ------ | ------------ |
| `packages/net/src/ratelimit.ts` | `RateLimiter.buckets` | One `TokenBucket` per player per `RateLimiter` instance |
| `packages/security/src/detectors.ts` | `speedStates`, `rateStates` | `SpeedCheckState` + per-action `RateState` per player |
| `packages/security/src/trust-score.ts` | `trustCache` | `TrustScore` entry per player |
| `packages/security/src/enforcer.ts` | `playerStates` | `PlayerEnforcementState` per player |

`cleanupPlayer()` in `detectors.ts` and `cleanupEnforcementState()` in `enforcer.ts` exist but are **not called automatically**. `RateLimiter` has no cleanup at all.

### Changes

**`packages/net/src/ratelimit.ts`**

```typescript
// Add to RateLimiter class:
/**
 * Remove the token bucket for a player (call on player leave).
 * Prevents unbounded Map growth.
 */
cleanup(playerId: number): void {
  this.buckets.delete(tostring(playerId));
}
```

> `reset()` already deletes the bucket, but it's semantically "reset for reuse". Rename it to `cleanup()` — or keep both where `reset()` is for mid-session reset and `cleanup()` is called on leave. Prefer adding `cleanup` as a distinct alias so existing usages of `reset()` are unaffected.

**`packages/security/src/create-security-service.ts`**

Wire `cleanupPlayer()` and `cleanupEnforcementState()` into the `PlayerLifecycleService.onPlayerLeft` callback so they are always called, eliminating the manual-call requirement.

```typescript
// In createSecurityService(), when registering with the player lifecycle:
lifecycle.onPlayerLeft((player) => {
  cleanupPlayer(player);
  enforcer.resetPlayer(player);     // already exists
  cleanupEnforcementState(player);  // currently not called
  cleanupTrustCache(player);        // currently not called
  rateLimiter.cleanup(player.UserId);
});
```

### Acceptance criteria

- [ ] `RateLimiter` has a `cleanup(playerId: number): void` method
- [ ] `createSecurityService` calls all four cleanup functions in its `onPlayerLeft` handler
- [ ] Unit test: `RateLimiter` — create bucket, call `cleanup()`, assert bucket count is 0
- [ ] Unit test: security service — simulate player leave, assert no residual state in all four Maps

### Files

```
packages/net/src/ratelimit.ts
packages/net/src/ratelimit.test.ts
packages/security/src/create-security-service.ts
packages/security/src/create-security-service.test.ts
```

---

## S2 — Centralize magic numbers in `@broblox/constants` {#s2}

### Problem

Hardcoded literals are scattered across packages, making them impossible to override without modifying library code:

| File | Literal | Meaning |
| ---- | ------- | ------- |
| `packages/security/src/detectors.ts:78` | `100` | Max speed studs/sec |
| `packages/security/src/detectors.ts:81` | `0.5` | Speed check interval (s) |
| `packages/security/src/detectors.ts:134` | `200` | Max teleport distance (studs) |
| `packages/security/src/types.ts` | `24` | Default temp-ban hours |
| `packages/security/src/trust-score.ts:94` | `60` | Trust cache TTL (s) |
| `packages/moderation/src/ban-store.ts:41` | `60` | Ban cache TTL (s) |
| `packages/net/src/ratelimit.ts` | (config-driven, OK) | — |

### Changes

**`packages/constants/src/anticheat.ts`** ← **new file**

```typescript
/**
 * Anticheat and security constants.
 */

/** Maximum player movement speed in studs/second before flagging. */
export const ANTICHEAT_MAX_SPEED_STUDS_PER_SEC = 100;

/** Minimum interval between speed checks (seconds). */
export const ANTICHEAT_SPEED_CHECK_INTERVAL_SEC = 0.5;

/** Maximum position delta in a single frame before flagging as teleport (studs). */
export const ANTICHEAT_MAX_TELEPORT_DISTANCE_STUDS = 200;

/** How long to cache a player's trust score before recalculating (seconds). */
export const TRUST_SCORE_CACHE_TTL_SEC = 60;

/** Default temporary ban duration when enforcer issues a temp-ban (hours). */
export const DEFAULT_TEMP_BAN_DURATION_HOURS = 24;
```

**`packages/constants/src/moderation.ts`** ← **new file**

```typescript
/**
 * Moderation system constants.
 */

/** How long to cache ban/mute records before re-fetching from DataStore (seconds). */
export const MODERATION_CACHE_TTL_SEC = 60;
```

**`packages/constants/src/index.ts`** — add two new exports:

```typescript
export * from "./anticheat";
export * from "./moderation";
```

**`packages/security/src/detectors.ts`** — replace all four literals with imports.

**`packages/security/src/trust-score.ts`** — replace `CACHE_TTL = 60`.

**`packages/security/src/types.ts`** — replace `tempBanDurationHours: 24` default.

**`packages/moderation/src/ban-store.ts`** — replace `cacheTTL = 60`.

### Acceptance criteria

- [ ] `packages/constants/src/anticheat.ts` exists with all five constants
- [ ] `packages/constants/src/moderation.ts` exists with cache TTL
- [ ] No raw numeric literals remain for these values in `detectors.ts`, `trust-score.ts`, `types.ts`, `ban-store.ts`
- [ ] Existing unit tests still pass (behavior unchanged)

### Files

```
packages/constants/src/anticheat.ts         (new)
packages/constants/src/moderation.ts        (new)
packages/constants/src/index.ts
packages/security/src/detectors.ts
packages/security/src/trust-score.ts
packages/security/src/types.ts
packages/moderation/src/ban-store.ts
```

---

## S3 — Security: configurable thresholds + aerial movement awareness {#s3}

### Problem

1. `checkSpeed()` uses `MAX_SPEED_STUDS_PER_SEC` as a single global threshold — but aerial movement (jumping, falling, being flung) legitimately exceeds ground speed. Without differentiation, legit players get false positives.
2. `checkTeleport()` uses `allowedTeleport = false` as a manual flag — there is no per-player whitelist or timed suppression window, so any game feature that teleports the player (staircase, zipline, respawn) must manually pass `true`.
3. All thresholds are hardcoded (S2 fixes literals; S3 fixes architecture).

### Changes

**`packages/security/src/detectors.ts`**

Extend `SpeedCheckState` to track ground vs aerial:

```typescript
interface SpeedCheckState {
  lastPosition?: Vector3;
  lastCheck: number;
  violations: number;
  isAerial: boolean;           // NEW
}
```

Extend `checkSpeed` signature:

```typescript
export function checkSpeed(
  player: Player,
  currentPosition: Vector3,
  isAerial = false             // NEW — caller provides Humanoid.FloorMaterial check
): void
```

Apply a multiplier for aerial movement (e.g. `1.5×`) so players in the air have a higher allowed speed before triggering:

```typescript
const maxSpeed = isAerial
  ? ANTICHEAT_MAX_SPEED_STUDS_PER_SEC * 1.5
  : ANTICHEAT_MAX_SPEED_STUDS_PER_SEC;
```

Add a **per-player timed suppression** for teleport detection:

```typescript
const teleportSuppressions = new Map<number, number>(); // playerId → expiry (os.clock())

/**
 * Suppress teleport detection for a player for a given duration.
 * Call before any server-initiated teleport.
 */
export function suppressTeleportCheck(player: Player, durationSeconds = 1): void {
  teleportSuppressions.set(player.UserId, os.clock() + durationSeconds);
}
```

In `checkTeleport()`:

```typescript
export function checkTeleport(
  player: Player,
  oldPosition: Vector3,
  newPosition: Vector3
): boolean {
  // Honor suppression window
  const suppressUntil = teleportSuppressions.get(player.UserId);
  if (suppressUntil !== undefined && os.clock() < suppressUntil) {
    return false;
  }
  // ... existing distance check
}
```

Remove the `allowedTeleport` parameter (breaking change — update all call sites, currently only internal).

Update `cleanupPlayer()` to also clear `teleportSuppressions`.

### Acceptance criteria

- [ ] `checkSpeed` accepts optional `isAerial` parameter; aerial speed threshold is `1.5×` ground threshold
- [ ] `suppressTeleportCheck(player, durationSec)` function is exported
- [ ] `checkTeleport` no longer takes `allowedTeleport` parameter; uses suppression map instead
- [ ] `cleanupPlayer` clears all four Maps including `teleportSuppressions`
- [ ] Unit tests cover: aerial speed (should NOT flag), ground speed (should flag), suppressed teleport (should NOT flag), unsuppressed teleport (should flag)

### Files

```
packages/security/src/detectors.ts
packages/security/src/detectors.test.ts
packages/security/src/index.ts       (re-export suppressTeleportCheck)
```

---

## S4 — Logger: fix `child()` prefix extraction {#s4}

### Problem

`LoggerImpl.child()` in `packages/core/src/logger.ts:42` strips brackets from `this.prefix` on every call using `.sub()`:

```typescript
child(name: string): Logger {
  const childLogger = new LoggerImpl(`${this.prefix.sub(2, this.prefix.size() - 1)}/${name}`);
  // ↑ Calls .sub() every time a child logger is created
```

This has two issues:
1. **Performance**: `.sub()` allocates a new string on every `child()` call. For long-running servers that create many child loggers, this is wasteful.
2. **Correctness**: `this.prefix` is `[ParentName]`. The extraction `.sub(2, size-1)` strips the `[` and `]` correctly in Luau (1-indexed), but the resulting child prefix becomes `[ParentName/ChildName]` — a double-wrapped name. That's correct behavior but the string manipulation is fragile if prefix format ever changes.

### Changes

**`packages/core/src/logger.ts`** — store the raw name separately:

```typescript
class LoggerImpl implements Logger {
  private prefix: string;
  private name: string;    // NEW — store raw name without brackets
  private level: LogLevel = LogLevel.Info;

  constructor(name: string) {
    this.name = name;
    this.prefix = `[${name}]`;
  }

  child(childName: string): Logger {
    // Use cached `name` instead of stripping brackets from `prefix`
    return new LoggerImpl(`${this.name}/${childName}`);
  }
}
```

### Acceptance criteria

- [ ] `LoggerImpl` stores `name` as a private field
- [ ] `child()` uses `this.name` directly, no string `.sub()` call
- [ ] Existing logger tests pass (prefix format `[Parent/Child]` unchanged)
- [ ] Add test: `logger.child("sub").child("leaf")` produces prefix `[Root/sub/leaf]`

### Files

```
packages/core/src/logger.ts
packages/core/src/application.test.ts  (may need update if logger output is checked)
```

---

## S5 — Net: integrate `RateLimiter.cleanup` into player lifecycle {#s5}

### Problem

After S1 adds `RateLimiter.cleanup()`, it still needs to be called. The `createRemoteService` factory in `packages/net/src/create-remote-service.ts` creates a `RateLimiter` internally but never exposes a cleanup path or hooks into the player lifecycle.

### Changes

**`packages/net/src/create-remote-service.ts`**

The factory already accepts a `PlayerLifecycleService`. Add cleanup registration:

```typescript
// In createRemoteService(), after creating the rateLimiter:
lifecycle.onPlayerLeft((player) => {
  rateLimiter.cleanup(player.UserId);
});
```

If the factory does not yet accept `lifecycle`, add it to `RemoteServiceConfig`:

```typescript
export interface RemoteServiceConfig {
  // ... existing fields
  lifecycle?: PlayerLifecycleService;  // optional for backwards compat
}
```

And in the factory body:

```typescript
if (config.lifecycle) {
  config.lifecycle.onPlayerLeft((player) => {
    rateLimiter.cleanup(player.UserId);
  });
}
```

### Acceptance criteria

- [ ] `createRemoteService` optionally accepts `lifecycle` config
- [ ] When provided, cleanup is registered on player leave
- [ ] Unit test: create service with mock lifecycle, simulate player leave, assert bucket count decremented
- [ ] Backward-compatible: omitting `lifecycle` does not break existing usage

### Files

```
packages/net/src/create-remote-service.ts
packages/net/src/create-remote-service.test.ts
```

---

## S6 — Testing: DataStore mock + richer Player mock {#s6}

### Problem

`packages/testing/src/roblox-mocks.ts` has no `DataStoreService` mock. Any package that calls `game.GetService("DataStoreService")` in a test throws at runtime. This blocks unit-testing `BasePlayerStore`, `PlayerDataStore`, `BanStore`, `MuteStore`, and all store subclasses (BattlePassStore, PetStore, etc.).

`packages/testing/src/factories.ts` `MockPlayer` only has `UserId`, `Name`, `DisplayName` — missing `Kick()` which `Enforcer.kick()` calls directly.

### Changes

**`packages/testing/src/roblox-mocks.ts`** — inside `mockRobloxGlobals()`, add DataStore support to the existing `game.GetService` mock:

```typescript
// Inside the existing GetService mock switch:
if (name === "DataStoreService") {
  return createMockDataStoreService();
}
```

Add helper (can be placed in a new file `packages/testing/src/datastore-mock.ts` and re-exported from index):

```typescript
interface MockDataStore {
  store: Map<string, unknown>;
  // LuaTuple: [data, keyInfo] — keyInfo is a stub (empty object) since tests don't need it
  GetAsync(key: string): LuaTuple<[unknown, Record<string, never>]>;
  SetAsync(key: string, value: unknown): void;
  UpdateAsync(key: string, callback: (old: unknown) => unknown): unknown;
  _reset(): void;
}

export function createMockDataStore(): MockDataStore {
  const store = new Map<string, unknown>();
  return {
    store,
    GetAsync(key: string) {
      // Returns [data, keyInfo stub] — keyInfo is unused in all current stores
      return [store.get(key), {}] as LuaTuple<[unknown, Record<string, never>]>;
    },
    SetAsync(key: string, value: unknown) {
      store.set(key, value);
    },
    UpdateAsync(key: string, callback: (old: unknown) => unknown) {
      const old = store.get(key);
      const updated = callback(old);
      store.set(key, updated);
      return updated;
    },
    _reset() {
      store.clear();
    },
  };
}

interface MockDataStoreService {
  stores: Map<string, MockDataStore>;
  GetDataStore(name: string): MockDataStore;
  _getStore(name: string): MockDataStore;
  _reset(): void;
}

export function createMockDataStoreService(): MockDataStoreService {
  const stores = new Map<string, MockDataStore>();
  return {
    stores,
    GetDataStore(name: string) {
      if (!stores.has(name)) {
        stores.set(name, createMockDataStore());
      }
      return stores.get(name)!;
    },
    _getStore(name: string) {
      return stores.get(name) ?? createMockDataStore();
    },
    _reset() {
      stores.forEach((s) => s._reset());
      stores.clear();
    },
  };
}
```

**`packages/testing/src/factories.ts`** — extend `MockPlayer`:

```typescript
export interface MockPlayer {
  UserId: number;
  Name: string;
  DisplayName: string;
  Kick: (message?: string) => void;   // NEW
  _kickedWith?: string;               // NEW — inspection helper for tests
}

export function createMockPlayer(overrides?: Partial<MockPlayer>): MockPlayer {
  const id = playerIdCounter++;
  let _kickedWith: string | undefined;
  return {
    UserId: id,
    Name: `Player${id}`,
    DisplayName: `Player ${id}`,
    Kick(message?: string) {
      _kickedWith = message;
    },
    get _kickedWith() { return _kickedWith; },
    ...overrides,
  };
}
```

### Acceptance criteria

- [ ] `createMockDataStore()` exported from `@broblox/testing`
- [ ] `createMockDataStoreService()` exported from `@broblox/testing`
- [ ] `game.GetService("DataStoreService")` returns a mock in tests
- [ ] `MockPlayer.Kick()` exists and records the kick message in `_kickedWith`
- [ ] New unit test: `BasePlayerStore` load/save round-trip using mock DataStore
- [ ] New unit test: `PlayerDataStore` migration path using mock DataStore
- [ ] New unit test: `Enforcer.kick()` verifies `MockPlayer._kickedWith` is set

### Files

```
packages/testing/src/datastore-mock.ts    (new)
packages/testing/src/roblox-mocks.ts
packages/testing/src/factories.ts
packages/testing/src/index.ts            (export new file)
packages/data/src/base-player-store.test.ts   (new tests using mock)
packages/data/src/player-data-store.test.ts   (new tests using mock)
packages/security/src/enforcer.test.ts        (extend existing)
```

---

## S7 — Data: wire `BasePlayerStore` subclasses to `VersionedData` {#s7}

### Problem

`PlayerDataStore<T extends VersionedData>` correctly handles versioning and migrations. However, the simpler `BasePlayerStore<TData>` (which all feature stores extend — `BattlePassStore`, `PetStore`, `CosmeticStore`, etc.) has no version constraint on `TData`. Schema changes to any of these stores will silently fail when existing players load old data.

### Changes

**Step 1** — constrain `BasePlayerStore` to `VersionedData`:

```typescript
// packages/data/src/base-player-store.ts
import { VersionedData } from "./types";

export abstract class BasePlayerStore<
  TData extends VersionedData,           // ← add constraint
  TConfig extends BaseStoreConfig = BaseStoreConfig
> {
  // ...existing code...

  /**
   * Current schema version. Subclasses must set this.
   */
  protected abstract schemaVersion(): number;

  /**
   * Optionally override to migrate data from an older version.
   * Called during load() if stored version < schemaVersion().
   */
  protected migrate(data: TData, fromVersion: number): TData {
    void fromVersion;
    return data; // default: no migration
  }
```

Update `load()` to call `migrate()` when version mismatch detected:

```typescript
load(): boolean {
  // ... existing GetAsync call ...
  if (raw !== undefined) {
    this.deserialize(raw);
    // Check version and migrate if needed
    const storedVersion = (this.data as VersionedData).__version ?? 0;
    if (storedVersion < this.schemaVersion()) {
      this.data = this.migrate(this.data, storedVersion);
      (this.data as { __version: number }).__version = this.schemaVersion();
      this.markDirty(); // force save after migration
    }
  }
  this.dirty = false;
  return true;
}
```

**Step 2** — update each feature store to implement `schemaVersion()` and include `__version` in default data:

Target stores: `BattlePassStore`, `PetStore`, `CosmeticStore`, `GachaStore`, `ProgressionStore`, `QuestStore`, `DailyRewardStore`, `AchievementStore`, `InventoryStore`.

Pattern to apply to each:

```typescript
// e.g. packages/battle-pass/src/battle-pass-store.ts
protected schemaVersion(): number {
  return 1; // increment when data shape changes
}

// In defaultData():
const defaultData: BattlePassData = {
  __version: 1,   // ← ADD to every default data factory
  // ... existing fields
};
```

### Acceptance criteria

- [ ] `BasePlayerStore<TData>` requires `TData extends VersionedData`
- [ ] `BasePlayerStore` has `schemaVersion()` abstract method and `migrate()` hook
- [ ] `load()` calls `migrate()` and marks dirty when version is outdated
- [ ] All feature store default data objects include `__version: 1`
- [ ] Unit tests: load data with version 0, assert migration runs and `__version` is updated

### Files

```
packages/data/src/base-player-store.ts
packages/battle-pass/src/battle-pass-store.ts
packages/pets/src/pet-store.ts
packages/cosmetics/src/cosmetic-store.ts
packages/gacha/src/gacha-store.ts   (if exists)
packages/progression/src/progression-store.ts
packages/quests/src/quest-store.ts
packages/rewards/src/daily-reward-store.ts
packages/rewards/src/achievement-store.ts
packages/inventory/src/inventory-store.ts   (if exists)
```

---

## S8 — Moderation: deduplication, cleanup, callback error safety {#s8}

### Problem

1. **No deduplication**: Cross-server sync messages via `MessagingService` can arrive multiple times (network retries). `subscribeToSync()` in `service.ts` calls `banStore.syncBan()` on every message — a duplicate ban would be re-inserted.
2. **Callback safety**: `onBanCallbacks` are called inside `task.spawn()` but there is no per-callback error isolation. If one callback throws, it silently swallows the error.
3. **Singleton never resets**: `ModerationService.instance` is a module-level singleton. This is appropriate for production, but makes testing impossible without patching the module.
4. **`BanStore` cache leak**: `cache` and `cacheTimestamps` Maps grow unboundedly for all players ever checked. Old offline players' entries are never evicted.

### Changes

**Deduplication** (`packages/moderation/src/ban-store.ts`):

`syncBan()` already handles upsert logic (update if found, insert if not) inside `UpdateAsync`. This is correct — the duplication issue is that the same ban record is re-published and re-inserted with each sync. Add a per-server processed set to skip re-processing the same ban ID:

```typescript
private processedBanIds = new Set<string>();

// In syncBan():
if (this.processedBanIds.has(ban.id)) {
  logger.debug(`Skipping duplicate ban sync: ${ban.id}`);
  return;
}
this.processedBanIds.add(ban.id);
// ... rest of syncBan
```

Limit set growth:

```typescript
// Prune oldest entries when set exceeds 1000
if (this.processedBanIds.size > 1000) {
  const iter = this.processedBanIds.values();
  this.processedBanIds.delete(iter.next().value);
}
```

Apply same pattern to `MuteStore`.

**Callback error isolation** (`packages/moderation/src/service.ts`):

```typescript
for (const callback of this.onBanCallbacks) {
  moderationSyncMetrics.ban.callbacks.inc();
  task.spawn(() => {
    const [ok, err] = pcall(() => callback(ban!));   // ← wrap in pcall
    if (!ok) {
      logger.warn(`onBan callback error: ${tostring(err)}`);
    }
  });
}
```

**Cache eviction** (`packages/moderation/src/ban-store.ts`):

Add `evictPlayer()` to be called on player leave:

```typescript
evictPlayer(playerId: number): void {
  this.cache.delete(playerId);
  this.cacheTimestamps.delete(playerId);
}
```

Wire in `createModerationEnforcementService.ts` (or equivalent lifecycle hook).

**Testability**: extract singleton creation for injection:

```typescript
// Add factory function that bypasses singleton (for tests):
export function createModerationServiceInstance(datastoreName: string): ModerationService {
  return new (ModerationService as any)(datastoreName); // access private constructor
}
```

Better: make constructor `protected` and provide a static `createForTesting()`:

```typescript
static createForTesting(datastoreName: string): ModerationService {
  return new ModerationService(datastoreName);
}
```

### Acceptance criteria

- [ ] `BanStore.syncBan()` skips already-processed ban IDs
- [ ] `MuteStore.syncMute()` (if exists) has same deduplication
- [ ] All callback invocations in `subscribeToSync()` are wrapped in `pcall`
- [ ] `BanStore.evictPlayer()` and `MuteStore.evictPlayer()` exist
- [ ] These are called in the player-left lifecycle handler
- [ ] `ModerationService.createForTesting()` static method added
- [ ] Unit test for deduplication: send same ban ID twice, assert DataStore written once

### Files

```
packages/moderation/src/ban-store.ts
packages/moderation/src/mute-store.ts
packages/moderation/src/service.ts
packages/moderation/src/create-moderation-enforcement-service.ts
packages/moderation/src/ban-store.test.ts
packages/moderation/src/service.test.ts
```

---

## S9 — Net validation: short-circuit + input safety {#s9}

### Problem

**`bounded.array()`** in `packages/net/src/validation.ts` iterates all items even after the first failure:

```typescript
for (const item of arr) {
  if (!itemGuard(item)) return false;   // ← good, this already short-circuits
}
```

On closer inspection, `bounded.array()` _does_ short-circuit correctly (returns `false` on first bad item). The actual issue is it does not guard against pathological inputs:

```typescript
if (arr.size() > maxLength) return false;  // correct
// But there is no guard against:
// - Non-array tables (plain objects)
// - Sparse arrays (arrays with nil holes)
```

Add a table-type check:

```typescript
// Ensure it's an actual array-like table, not an object
if (!Array.isArray(v)) return false;
```

**`bounded.string()`** uses `.size()` which compiles to `.length` in Node.js tests but to Lua's `#string` in Roblox. This is fine as implemented; just confirm in tests that multi-byte UTF-8 strings are correctly bounded.

### Changes

**`packages/net/src/validation.ts`**

```typescript
array:
  <T>(itemGuard: t.check<T>, maxLength: number) =>
  (v: unknown): v is T[] => {
    if (!Array.isArray(v)) return false;  // guard: reject plain objects and non-arrays
    const arr = v as T[];
    if (arr.size() > maxLength) return false;
    for (const item of arr) {
      if (!itemGuard(item)) return false;
    }
    return true;
  },
```

Add tests for edge cases:

- Plain object (should fail)
- Empty array (should pass)
- Array over maxLength (should fail)
- Array with one bad item (should fail, short-circuit)
- Large valid array at exactly maxLength (should pass)

### Acceptance criteria

- [ ] `bounded.array()` rejects plain objects passed as arrays
- [ ] Tests cover all five edge cases above
- [ ] All existing validation tests still pass

### Files

```
packages/net/src/validation.ts
packages/net/src/validation.test.ts
```

---

## S10 — Protocol: NaN / negative guard {#s10}

### Problem

`validateProtocolVersion()` in `packages/net/src/protocol.ts` guards with:

```typescript
if (typeOf(clientVersion) !== "number" || !isInteger(clientVersion) || clientVersion < 0)
```

In Roblox/Lua, `typeOf(NaN)` returns `"number"`, but `isInteger(NaN)` returns `false` (because `NaN === math.floor(NaN)` is `false`). So NaN is correctly rejected. However:

- `Infinity` passes `typeOf` and `isInteger` if somehow a float that rounds to itself (not a concern in practice, but worth an explicit guard).
- The order of checks means `clientVersion < 0` is evaluated only after `isInteger`, so `-1` is caught — correct.
- `0` passes all checks and would be compared as version `0` — likely too old and rejected by min-version check, but a version-0 client sending `0` would produce the message "Client version 0 is too old" which is clear.

Add explicit `isFinite` guard for completeness:

```typescript
if (
  typeOf(clientVersion) !== "number" ||
  !isFinite(clientVersion) ||  // rejects NaN, Infinity, -Infinity
  !isInteger(clientVersion) ||
  clientVersion < 0
)
```

### Acceptance criteria

- [ ] `validateProtocolVersion(NaN)` returns `{ compatible: false, reason: "Invalid protocol version format" }`
- [ ] `validateProtocolVersion(Infinity)` returns same
- [ ] `validateProtocolVersion(-Infinity)` returns same
- [ ] Existing protocol tests still pass

### Files

```
packages/net/src/protocol.ts
packages/net/src/protocol.test.ts
```

---

## S11 — Core: duplicate name collision makes service unreachable {#s11}

### Problem

`Application.register()` in `packages/core/src/application.ts` handles name collision as:

```typescript
if (this.nameToItem.has(name)) {
  warn(`[Application] Name "${name}" already registered, using ${name}_${this.items.size()}`);
  const uniqueName = `${name}_${this.items.size()}`;
  this.nameToItem.set(uniqueName, item);
  this.itemNames.set(item, uniqueName);
}
```

This silently renames the service to `${name}_N`. The caller registered it as `"PlayerService"` and will call `getByName("PlayerService")` expecting to find it — but it's now stored as `"PlayerService_3"`. This creates a silent mis-registration that is very hard to debug.

### Changes

**Option A (recommended):** Treat duplicate names as a hard error during `idle` state:

```typescript
if (this.nameToItem.has(name)) {
  error(
    `[Application] Service name "${name}" is already registered. ` +
    `Each service must have a unique name. ` +
    `Set a unique 'name' property on your service.`
  );
}
```

**Option B (if breaking is undesirable):** Keep the warn but also emit a distinct warn that the service is registered under a different name and `getByName("X")` will not find it:

```typescript
if (this.nameToItem.has(name)) {
  const uniqueName = `${name}_${this.items.size()}`;
  warn(
    `[Application] Name "${name}" already registered. ` +
    `This service will be registered as "${uniqueName}". ` +
    `getByName("${name}") will NOT return this service. ` +
    `Fix by giving this service a unique name property.`
  );
  // ... rest unchanged
}
```

Option A is preferred — silent mis-registration is a category of bug that causes hours of debugging.

### Acceptance criteria

- [ ] Registering two services with the same name throws a clear error (Option A) or at minimum emits a specific warning that the service is unreachable by its requested name (Option B)
- [ ] Unit test: register two services with the same name, assert error thrown (Option A) or assert both names are distinct in the registry (Option B)
- [ ] Existing tests still pass (no duplicate names in test data)

### Files

```
packages/core/src/application.ts
packages/core/src/application.test.ts
```

---

## S12 — Docs: update ADRs to reflect improvements {#s12}

After completing S1–S11, update relevant architecture documentation.

### Changes

**`docs/architecture/decisions/`** — add:

- `0009-security-detector-configuration.md` — documents configurable thresholds (S2, S3), auto-cleanup via lifecycle (S1, S3), aerial speed multiplier rationale.
- `0010-versioned-data-and-migrations.md` — documents why `BasePlayerStore` now requires `VersionedData`, migration hook pattern, `schemaVersion()` increment policy.

**`docs/architecture/state-and-data.md`** — add a section:

> **Schema versioning:** All player stores must extend `BasePlayerStore<T extends VersionedData>`. Default data must include `__version: 1`. When any stored field is added, renamed, or removed, increment `schemaVersion()` and implement `migrate(data, fromVersion)`.

**`docs/security/`** (if directory exists) — update threat model to reflect:
- Configurable speed/teleport thresholds
- Auto-cleanup of player state on leave
- Trust score cache TTL

**`docs/roadmap/overview.md`** — move S1–S11 items from "Open items" into a "Code quality" completed section once sessions are done.

### Acceptance criteria

- [ ] ADR-0009 exists and covers security detector configuration decisions
- [ ] ADR-0010 exists and covers versioned data migration policy
- [ ] `state-and-data.md` has `__version` policy section
- [ ] Roadmap open items updated

### Files

```
docs/architecture/decisions/0009-security-detector-configuration.md  (new)
docs/architecture/decisions/0010-versioned-data-and-migrations.md    (new)
docs/architecture/state-and-data.md
docs/roadmap/overview.md
```

---

## Dependency graph

Sessions can be parallelized where there is no dependency:

```
S2 (constants) ──────────────────────────────────────────────────────────────┐
                                                                              ↓
S1 (memory leaks) ─── S5 (net cleanup integration) ─── S3 (security config) ─── S8 (moderation)
S4 (logger fix)       ← independent
S6 (test mocks)       ← independent (but unlocks better test coverage for S7, S8)
S7 (versioned data)   ← after S6 (DataStore mock)
S9 (validation)       ← independent
S10 (protocol guard)  ← independent
S11 (app collision)   ← independent
S12 (docs)            ← after all others
```

**Recommended execution order for a single multi-day sprint:**

1. S2, S4, S9, S10, S11 — quick wins, fully independent, no breaking changes (Day 1)
2. S1, S6 — memory leaks + test infrastructure (Day 2)
3. S3, S5 — security hardening + net cleanup (Day 3, depends on S1, S2)
4. S7 — data versioning (Day 4, depends on S6)
5. S8 — moderation (Day 4–5, depends on S1)
6. S12 — docs (Day 5, after all code sessions)

---

## Testing strategy per session

Every session must maintain or improve the existing 2,400+ test count. The table below lists the minimum new tests expected:

| Session | Minimum new tests | Notes |
| ------- | ----------------- | ----- |
| S1 | 4 | RateLimiter cleanup; security Map cleanup |
| S2 | 0 | Pure refactor, no behavior change — run existing suite |
| S3 | 5 | Aerial speed, suppressed teleport, cleanup |
| S4 | 1 | Nested child logger prefix |
| S5 | 2 | Remote service + lifecycle |
| S6 | 6 | DataStore mock unit tests, Player.Kick, migration round-trip |
| S7 | 4 | Version migration in BasePlayerStore + one feature store |
| S8 | 3 | Dedup ban sync, callback isolation, eviction |
| S9 | 5 | Array validation edge cases |
| S10 | 3 | NaN, Infinity, -Infinity |
| S11 | 2 | Duplicate name error |
| S12 | 0 | Docs only |

**Total minimum new tests: ~35**

---

## How to run tests for a single package

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @broblox/net test
pnpm --filter @broblox/security test
pnpm --filter @broblox/data test
pnpm --filter @broblox/core test
pnpm --filter @broblox/moderation test
pnpm --filter @broblox/constants test
pnpm --filter @broblox/testing test

# Run with coverage
pnpm test:coverage

# Lint all
pnpm lint

# Type-check all
pnpm typecheck
```

---

_This plan is intended to be executed session-by-session. Commit after each session so progress is tracked and rollback is possible._
