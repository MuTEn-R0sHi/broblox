/**
 * Player Data Store
 *
 * Type-safe DataStore wrapper with versioning, migrations, and retry.
 * Uses synchronous patterns compatible with roblox-ts packages.
 */

import { err, ok, ErrorCode } from "@broblox/shared-types";
import { createLogger } from "@broblox/core";
import { VersionedData, StoreConfig, DataMetadata, LoadResult, SaveResult } from "./types";

const logger = createLogger("PlayerDataStore");

// Declare Roblox services
declare const game: {
  GetService(name: "DataStoreService"): {
    GetDataStore(name: string): DataStore;
  };
  JobId: string;
};

interface DataStore {
  GetAsync(key: string): LuaTuple<[unknown, DataStoreKeyInfo]>;
  SetAsync(key: string, value: unknown): void;
}

interface DataStoreKeyInfo {
  Version: string;
  CreatedTime: number;
  UpdatedTime: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 10000;

// ============================================================================
// Player Data Store
// ============================================================================

export class PlayerDataStore<T extends VersionedData> {
  private store: DataStore;
  private config: Required<StoreConfig<T>> & {
    retry: Required<NonNullable<StoreConfig<T>["retry"]>>;
  };
  private cache = new Map<number, { data: T; metadata: DataMetadata }>();
  private dirty = new Set<number>();

  constructor(config: StoreConfig<T>) {
    const DataStoreService = game.GetService("DataStoreService");
    this.store = DataStoreService.GetDataStore(config.name);

    this.config = {
      name: config.name,
      version: config.version,
      defaultData: config.defaultData,
      migrations: config.migrations ?? new Map(),
      retry: {
        maxAttempts: config.retry?.maxAttempts ?? DEFAULT_RETRY_ATTEMPTS,
        baseDelayMs: config.retry?.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
        maxDelayMs: config.retry?.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
      },
    };

    logger.info(`Initialized store '${config.name}' (v${config.version})`);
  }

  /**
   * Load player data from DataStore.
   * Creates default data if none exists.
   * Runs migrations if data version is outdated.
   */
  load(player: Player): LoadResult<T> {
    const key = this.getKey(player);

    return this.withRetry(() => {
      const [rawData] = this.store.GetAsync(key);

      if (rawData === undefined) {
        // New player - create default data
        const data = this.config.defaultData();
        const metadata: DataMetadata = {
          lastSave: 0,
          saveCount: 0,
          sessionId: this.generateSessionId(),
          serverId: game.JobId,
        };

        this.cache.set(player.UserId, { data, metadata });
        this.dirty.add(player.UserId);

        logger.debug(`Created default data for ${player.Name}`);
        return ok({ data, metadata });
      }

      // Parse existing data
      const stored = rawData as { data: unknown; metadata?: DataMetadata };
      let data = stored.data as T;
      const metadata: DataMetadata = stored.metadata ?? {
        lastSave: 0,
        saveCount: 0,
      };

      // Run migrations if needed
      const dataVersion = (data as VersionedData).__version ?? 0;
      if (dataVersion < this.config.version) {
        data = this.migrate(data, dataVersion);
        this.dirty.add(player.UserId);
      }

      // Update session info
      metadata.sessionId = this.generateSessionId();
      metadata.serverId = game.JobId;

      this.cache.set(player.UserId, { data, metadata });
      logger.debug(`Loaded data for ${player.Name} (v${dataVersion})`);

      return ok({ data, metadata });
    });
  }

  /**
   * Save player data to DataStore.
   */
  save(player: Player): SaveResult {
    const cached = this.cache.get(player.UserId);
    if (!cached) {
      return err(ErrorCode.NotFound, { message: "No data loaded for player" });
    }

    const key = this.getKey(player);

    return this.withRetry(() => {
      const savedAt = os.time();

      cached.metadata.lastSave = savedAt;
      cached.metadata.saveCount += 1;

      this.store.SetAsync(key, {
        data: cached.data,
        metadata: cached.metadata,
      });

      this.dirty.delete(player.UserId);
      logger.debug(`Saved data for ${player.Name}`);

      return ok({ savedAt });
    });
  }

  /**
   * Get cached data for a player (must load first).
   */
  get(player: Player): T | undefined {
    return this.cache.get(player.UserId)?.data;
  }

  /**
   * Get cached metadata for a player.
   */
  getMetadata(player: Player): DataMetadata | undefined {
    return this.cache.get(player.UserId)?.metadata;
  }

  /**
   * Update player data in cache.
   * Does not immediately save - call save() to persist.
   */
  update(player: Player, updater: (data: T) => void): boolean {
    const cached = this.cache.get(player.UserId);
    if (!cached) {
      return false;
    }

    updater(cached.data);
    this.dirty.add(player.UserId);
    return true;
  }

  /**
   * Mark player data as dirty (needs save).
   */
  markDirty(player: Player): void {
    if (this.cache.has(player.UserId)) {
      this.dirty.add(player.UserId);
    }
  }

  /**
   * Check if player has unsaved changes.
   */
  isDirty(player: Player): boolean {
    return this.dirty.has(player.UserId);
  }

  /**
   * Remove player from cache (call after they leave).
   */
  unload(player: Player): void {
    this.cache.delete(player.UserId);
    this.dirty.delete(player.UserId);
    logger.debug(`Unloaded data for ${player.Name}`);
  }

  /**
   * Get all players with dirty data.
   */
  getDirtyPlayerIds(): number[] {
    const result: number[] = [];
    this.dirty.forEach((id) => result.push(id));
    return result;
  }

  /**
   * Check if player data is loaded.
   */
  isLoaded(player: Player): boolean {
    return this.cache.has(player.UserId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getKey(player: Player): string {
    return `player_${player.UserId}`;
  }

  private generateSessionId(): string {
    return `${game.JobId}_${os.time()}_${math.random(1000, 9999)}`;
  }

  private migrate(data: unknown, fromVersion: number): T {
    let current = data;
    let version = fromVersion;

    while (version < this.config.version) {
      const migrationKey = `${version}_${version + 1}`;
      const migration = this.config.migrations.get(migrationKey);

      if (!migration) {
        logger.warn(`Missing migration: ${migrationKey}, using current data`);
        break;
      }

      logger.debug(`Running migration ${migrationKey}`);
      current = migration(current);
      version += 1;
    }

    // Ensure version is updated
    (current as VersionedData & { __version: number }).__version = this.config.version;
    return current as T;
  }

  private withRetry<R>(operation: () => R): R {
    let lastError: unknown;
    let delay = this.config.retry.baseDelayMs;

    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      const [success, result] = pcall(operation);

      if (success) {
        return result as R;
      }

      lastError = result;
      logger.warn(`Attempt ${attempt} failed: ${tostring(result)}`);

      if (attempt < this.config.retry.maxAttempts) {
        // Exponential backoff
        task.wait(delay / 1000);
        delay = math.min(delay * 2, this.config.retry.maxDelayMs);
      }
    }

    // Return error result
    return err(ErrorCode.DataStoreFailed, {
      message: `Operation failed after ${this.config.retry.maxAttempts} attempts: ${tostring(lastError)}`,
    }) as R;
  }
}

/**
 * Creates a new player data store.
 */
export function createPlayerDataStore<T extends VersionedData>(
  config: StoreConfig<T>
): PlayerDataStore<T> {
  return new PlayerDataStore(config);
}
