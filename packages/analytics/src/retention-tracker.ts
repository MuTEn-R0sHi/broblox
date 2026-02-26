/**
 * Retention Tracker
 *
 * Persists first-seen timestamps and return-day markers to DataStore.
 * Computes D1/D7/D14/D30 retention for individual players.
 */

import { createLogger } from "@broblox/core";
import { Counter } from "@broblox/observability";
import type { RetentionRecord, RetentionDay, AnalyticsConfig } from "./types";

// Local DataStore override: UpdateAsync callback returns plain value (not LuaTuple).
declare interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
  UpdateAsync(key: string, callback: (old: unknown) => unknown): unknown;
}

const retentionChecks = new Counter("analytics_retention_checks");
const retentionNewPlayers = new Counter("analytics_retention_new_players");

const SECONDS_PER_DAY = 86400;

/**
 * Tracks player retention via DataStore.
 */
export class RetentionTracker {
  private store: DataStore | undefined;
  private config: AnalyticsConfig;
  private logger: ReturnType<typeof createLogger> | undefined;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    if (config.enableLogging) {
      this.logger = createLogger("RetentionTracker");
    }
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize the DataStore connection (call once at server startup).
   */
  init(): void {
    const [ok, svc] = pcall(() => game.GetService("DataStoreService") as DataStoreService);
    if (ok && svc) {
      this.store = (svc as DataStoreService).GetDataStore(this.config.datastoreName);
      this.logger?.info(`RetentionTracker initialized with store "${this.config.datastoreName}"`);
    } else {
      this.logger?.warn("DataStoreService unavailable — retention tracking disabled");
    }
  }

  // --------------------------------------------------------------------------
  // Player Visit
  // --------------------------------------------------------------------------

  /**
   * Record a player visit. Creates or updates their retention record.
   * Returns the updated record if DataStore is available.
   */
  recordVisit(playerId: number, sessionPlaytimeSec?: number): RetentionRecord | undefined {
    if (!this.store) return undefined;

    retentionChecks.inc();

    const key = `ret_${playerId}`;
    const now = os.time();

    let record: RetentionRecord | undefined;

    const [ok] = pcall(() => {
      this.store!.UpdateAsync(key, (old: unknown) => {
        if (old !== undefined && typeIs(old, "table")) {
          // Existing record
          const existing = old as unknown as RetentionRecord;
          const daysSinceFirst = math.floor((now - existing.firstSeen) / SECONDS_PER_DAY);

          // Add today's day-offset if not already present
          const returnDays = existing.returnDays ?? [];
          let found = false;
          for (const d of returnDays) {
            if (d === daysSinceFirst) {
              found = true;
              break;
            }
          }
          if (!found && daysSinceFirst > 0) {
            returnDays.push(daysSinceFirst);
          }

          record = {
            firstSeen: existing.firstSeen,
            returnDays,
            totalSessions: (existing.totalSessions ?? 0) + 1,
            totalPlaytimeSec: (existing.totalPlaytimeSec ?? 0) + (sessionPlaytimeSec ?? 0),
          };
          return record;
        }

        // New player
        retentionNewPlayers.inc();
        record = {
          firstSeen: now,
          returnDays: [],
          totalSessions: 1,
          totalPlaytimeSec: sessionPlaytimeSec ?? 0,
        };
        return record;
      });
    });

    if (!ok) {
      this.logger?.warn(`Failed to update retention for player ${playerId}`);
      return undefined;
    }

    this.logger?.info(`Retention recorded for player ${playerId}`);
    return record;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /**
   * Check if a player was retained on a specific day (D1, D7, etc.).
   */
  isRetained(record: RetentionRecord, day: RetentionDay): boolean {
    for (const d of record.returnDays) {
      if (d === day) return true;
    }
    return false;
  }

  /**
   * Check all standard retention windows for a player record.
   */
  getRetentionFlags(record: RetentionRecord): Record<RetentionDay, boolean> {
    return {
      1: this.isRetained(record, 1),
      7: this.isRetained(record, 7),
      14: this.isRetained(record, 14),
      30: this.isRetained(record, 30),
    };
  }

  /**
   * Get a player's retention record from DataStore.
   */
  getRecord(playerId: number): RetentionRecord | undefined {
    if (!this.store) return undefined;

    const key = `ret_${playerId}`;
    let record: RetentionRecord | undefined;

    const [ok] = pcall(() => {
      const raw = this.store!.GetAsync(key);
      if (raw !== undefined) {
        record = raw as unknown as RetentionRecord;
      }
    });

    if (!ok) {
      this.logger?.warn(`Failed to read retention for player ${playerId}`);
    }

    return record;
  }

  /**
   * Compute how many days since the player was first seen.
   */
  daysSinceFirstSeen(record: RetentionRecord): number {
    return math.floor((os.time() - record.firstSeen) / SECONDS_PER_DAY);
  }
}
