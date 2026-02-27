/**
 * BasePlayerStore — abstract base class for per-player DataStore-backed stores.
 *
 * Extracts the common init/load/save/dirty pattern shared by all player stores
 * (BattlePassStore, PetStore, InventoryStore, CosmeticStore, GachaStore,
 * ProgressionStore, QuestStore, DailyRewardStore, AchievementStore, etc.).
 *
 * Subclasses supply:
 *   - `keyPrefix` — e.g. "bp_", "pets_", "inventory_"
 *   - `defaultData()` — factory for empty player data
 *   - `deserialize(raw)` — optional custom deserialization
 *   - `serialize()` — optional custom serialization
 *
 * The base class owns:
 *   - DataStore init (GetService + GetDataStore)
 *   - pcall-wrapped load/save
 *   - dirty flag tracking
 *   - playerId + config storage
 */

import { createLogger, Logger } from "@broblox/core";

declare const game: {
  GetService(name: string): unknown;
};

declare function pcall<T>(fn: () => T): LuaTuple<[boolean, T]>;

interface DataStoreService {
  GetDataStore(name: string): DataStore;
}

interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
}

// ============================================================================
// Base Config
// ============================================================================

export interface BaseStoreConfig {
  /** DataStore name. */
  datastoreName: string;
  /** Whether to emit log messages. */
  enableLogging?: boolean;
}

// ============================================================================
// BasePlayerStore
// ============================================================================

export abstract class BasePlayerStore<TData, TConfig extends BaseStoreConfig = BaseStoreConfig> {
  readonly playerId: number;
  protected config: TConfig;
  protected data: TData;
  protected store: DataStore | undefined;
  protected logger: Logger | undefined;
  private dirty = false;

  constructor(playerId: number, config: TConfig, defaultData: TData) {
    this.playerId = playerId;
    this.config = config;
    this.data = defaultData;
    this.logger = config.enableLogging ? createLogger(this.storeName()) : undefined;
  }

  // --------------------------------------------------------------------------
  // Template methods — override in subclasses
  // --------------------------------------------------------------------------

  /** Human-readable name for logging. Override to customise. */
  protected storeName(): string {
    return "PlayerStore";
  }

  /** Key prefix for DataStore keys, e.g. "pets_". */
  protected abstract keyPrefix(): string;

  /**
   * Current schema version. Override in subclasses that use data versioning.
   * Increment when the data shape changes and implement migrate().
   * Default: 0 (no versioning).
   */
  protected schemaVersion(): number {
    return 0;
  }

  /**
   * Optionally override to migrate data from an older version.
   * Called during load() if stored version < schemaVersion().
   * Default: returns data unchanged.
   */
  protected migrate(data: TData, _fromVersion: number): TData {
    return data;
  }

  /**
   * Deserialize raw DataStore value into `this.data`.
   * Called after a successful GetAsync.
   * Default implementation assigns the raw value directly.
   */
  protected deserialize(raw: unknown): void {
    this.data = raw as TData;
  }

  /**
   * Serialize `this.data` for DataStore.
   * Override if data contains Maps or non-serializable types.
   * Default returns `this.data` as-is.
   */
  protected serialize(): unknown {
    return this.data;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /** Initialize the DataStore reference. Call once after construction. */
  init(): void {
    const dss = game.GetService("DataStoreService") as DataStoreService;
    this.store = dss.GetDataStore(this.config.datastoreName);
    this.logger?.info(`init for player ${this.playerId}`);
  }

  /** Load player data from DataStore. Returns true on success. */
  load(): boolean {
    if (!this.store) return false;
    const key = `${this.keyPrefix()}${this.playerId}`;
    const [ok, raw] = pcall(() => this.store!.GetAsync(key));
    if (!ok) return false;
    if (raw !== undefined) {
      this.deserialize(raw);
      // Check version and migrate if needed (only when store opts in to versioning)
      const currentVersion = this.schemaVersion();
      if (currentVersion > 0) {
        const storedVersion = ((this.data as Record<string, unknown>).__version as number) ?? 0;
        if (storedVersion < currentVersion) {
          this.data = this.migrate(this.data, storedVersion);
          (this.data as Record<string, unknown>).__version = currentVersion;
          this.markDirty(); // force save after migration
          return true;
        }
      }
    }
    this.dirty = false;
    return true;
  }

  /** Save player data to DataStore. Returns true on success. */
  save(): boolean {
    if (!this.store) return false;
    const key = `${this.keyPrefix()}${this.playerId}`;
    const serialized = this.serialize();
    const [ok] = pcall(() => this.store!.SetAsync(key, serialized));
    if (!ok) return false;
    this.dirty = false;
    return true;
  }

  // --------------------------------------------------------------------------
  // Dirty tracking
  // --------------------------------------------------------------------------

  /** Whether the store has unsaved changes. */
  isDirty(): boolean {
    return this.dirty;
  }

  /** Mark the store as having unsaved changes. */
  protected markDirty(): void {
    this.dirty = true;
  }

  /** Mark the store as clean (e.g. after save or load). */
  protected markClean(): void {
    this.dirty = false;
  }

  // --------------------------------------------------------------------------
  // Data access
  // --------------------------------------------------------------------------

  /** Get the current in-memory data snapshot. */
  getData(): Readonly<TData> {
    return this.data;
  }
}
