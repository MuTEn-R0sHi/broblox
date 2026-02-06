/**
 * Leaderboard Store
 *
 * OrderedDataStore-backed leaderboard with period support,
 * in-memory caching, top-N queries, and rank lookups.
 * Compatible with roblox-ts.
 */

import { createLogger } from "@rbx/core";
import { Counter } from "@rbx/observability";
import {
  LeaderboardDefinition,
  LeaderboardEntry,
  LeaderboardPeriod,
  TopEntriesResult,
  PlayerRankResult,
  SubmitResult,
  LeaderboardsConfig,
  DEFAULT_LEADERBOARDS_CONFIG,
} from "./types";

const logger = createLogger("Leaderboards.Store");

// Declare Roblox services
declare const game: {
  GetService(name: "DataStoreService"): DataStoreService;
};

interface DataStoreService {
  GetOrderedDataStore(name: string): OrderedDataStore;
}

interface DataStorePages {
  GetCurrentPage(): Array<{ key: string; value: number }>;
}

interface OrderedDataStore {
  GetSortedAsync(
    ascending: boolean,
    pageSize: number,
    minValue?: number,
    maxValue?: number
  ): DataStorePages;
  SetAsync(key: string, value: number): void;
}

// ============================================================================
// Metrics
// ============================================================================

const scoreSubmissions = new Counter("leaderboards_score_submissions");
const scoreUpdates = new Counter("leaderboards_score_updates");
const topNQueries = new Counter("leaderboards_top_n_queries");
const rankLookups = new Counter("leaderboards_rank_lookups");

// ============================================================================
// Period Key Helpers
// ============================================================================

/**
 * Build the DataStore name for a leaderboard + period.
 * e.g. "lb_kills_alltime", "lb_coins_daily_20260206"
 */
function buildStoreName(prefix: string, leaderboard: string, period: LeaderboardPeriod): string {
  const base = `${prefix}_${leaderboard}_${period}`;
  if (period === "alltime") return base;
  if (period === "daily") return `${base}_${getDailyKey()}`;
  if (period === "weekly") return `${base}_${getWeeklyKey()}`;
  // seasonal — just use the base; caller can manage season IDs externally
  return base;
}

function getDailyKey(): string {
  const t = os.date("!*t") as DateTable;
  return `${t.year}${padTwo(t.month)}${padTwo(t.day)}`;
}

function getWeeklyKey(): string {
  // ISO week: Monday-based. Use a simple year+week approach.
  const t = os.date("!*t") as DateTable;
  const day = t.yday;
  const weekNum = math.floor((day - 1) / 7) + 1;
  return `${t.year}W${padTwo(weekNum)}`;
}

function padTwo(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

// DateTable shape returned by os.date("!*t")
interface DateTable {
  year: number;
  month: number;
  day: number;
  yday: number;
  hour: number;
  min: number;
  sec: number;
}

// ============================================================================
// Cache Entry
// ============================================================================

interface CachedLeaderboard {
  entries: LeaderboardEntry[];
  cachedAt: number;
}

// ============================================================================
// Leaderboard Store
// ============================================================================

export class LeaderboardStore {
  private config: Required<LeaderboardsConfig>;
  private definitions = new Map<string, LeaderboardDefinition>();
  private cache = new Map<string, CachedLeaderboard>(); // key: "name:period"

  constructor(config?: LeaderboardsConfig) {
    this.config = {
      ...DEFAULT_LEADERBOARDS_CONFIG,
      ...(config ?? {}),
    };

    if (this.config.enableLogging) {
      logger.info(`Leaderboard store initialized (prefix: ${this.config.datastorePrefix})`);
    }
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /**
   * Register a leaderboard definition.
   */
  register(def: LeaderboardDefinition): void {
    this.definitions.set(def.name, def);
    if (this.config.enableLogging) {
      logger.info(`Registered leaderboard: ${def.name} (${def.periods.join(", ")})`);
    }
  }

  /**
   * Register multiple leaderboard definitions.
   */
  registerAll(defs: LeaderboardDefinition[]): void {
    for (const def of defs) {
      this.register(def);
    }
  }

  /**
   * Get a registered definition.
   */
  getDefinition(name: string): LeaderboardDefinition | undefined {
    return this.definitions.get(name);
  }

  /**
   * Get all registered definitions.
   */
  getAllDefinitions(): LeaderboardDefinition[] {
    const out: LeaderboardDefinition[] = [];
    this.definitions.forEach((d) => out.push(d));
    return out;
  }

  // --------------------------------------------------------------------------
  // Score Submission
  // --------------------------------------------------------------------------

  /**
   * Submit a score for a player. Updates all configured periods.
   */
  submitScore(
    leaderboard: string,
    userId: number,
    playerName: string,
    score: number
  ): SubmitResult {
    scoreSubmissions.inc();

    const def = this.definitions.get(leaderboard);
    if (!def) {
      return { success: false, status: "ERROR" };
    }

    const dsService = game.GetService("DataStoreService");
    const key = `${userId}`;
    let updated = false;

    for (const period of def.periods) {
      const storeName = buildStoreName(this.config.datastorePrefix, leaderboard, period);
      const store = dsService.GetOrderedDataStore(storeName);
      store.SetAsync(key, score);

      // Update in-memory cache
      const cacheKey = `${leaderboard}:${period}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.updateCacheEntry(cached, def, userId, playerName, score);
      }

      updated = true;
    }

    if (updated) {
      scoreUpdates.inc();
      this.config.onScoreSubmit(leaderboard, userId, score);

      if (this.config.enableLogging) {
        logger.info(`Score submitted: ${leaderboard} player=${userId} score=${score}`);
      }
    }

    // Look up new rank from alltime cache (or first period)
    const primaryPeriod = def.periods[0] ?? "alltime";
    const rank = this.getPlayerRank(leaderboard, primaryPeriod, userId);

    return {
      success: true,
      status: updated ? "UPDATED" : "NO_CHANGE",
      newRank: rank.entry?.rank,
    };
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /**
   * Get the top N entries for a leaderboard + period.
   * Uses cache if available and fresh; otherwise loads from DataStore.
   */
  getTopEntries(leaderboard: string, period: LeaderboardPeriod, limit?: number): TopEntriesResult {
    topNQueries.inc();

    const def = this.definitions.get(leaderboard);
    const maxEntries = limit ?? def?.maxEntries ?? 100;
    const cacheKey = `${leaderboard}:${period}`;

    // Check cache freshness
    const cached = this.cache.get(cacheKey);
    if (cached && os.time() - cached.cachedAt < this.config.refreshInterval) {
      const entries = this.sliceEntries(cached.entries, maxEntries);
      return { leaderboard, period, entries, cachedAt: cached.cachedAt };
    }

    // Load from DataStore
    const entries = this.loadFromDataStore(leaderboard, period, maxEntries);
    const now = os.time();

    this.cache.set(cacheKey, { entries, cachedAt: now });

    return { leaderboard, period, entries, cachedAt: now };
  }

  /**
   * Look up a player's rank on a specific leaderboard + period.
   * Uses cached data.
   */
  getPlayerRank(leaderboard: string, period: LeaderboardPeriod, userId: number): PlayerRankResult {
    rankLookups.inc();

    const cacheKey = `${leaderboard}:${period}`;
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      // Force a load
      this.getTopEntries(leaderboard, period);
      const reloaded = this.cache.get(cacheKey);
      if (!reloaded) return { found: false };
      return this.findInEntries(reloaded.entries, userId);
    }

    return this.findInEntries(cached.entries, userId);
  }

  /**
   * Force a cache refresh for a leaderboard + period.
   */
  refresh(leaderboard: string, period: LeaderboardPeriod): TopEntriesResult {
    const def = this.definitions.get(leaderboard);
    const maxEntries = def?.maxEntries ?? 100;
    const entries = this.loadFromDataStore(leaderboard, period, maxEntries);
    const now = os.time();
    const cacheKey = `${leaderboard}:${period}`;

    this.cache.set(cacheKey, { entries, cachedAt: now });

    if (this.config.enableLogging) {
      logger.info(`Refreshed ${leaderboard}:${period} — ${entries.size()} entries`);
    }

    return { leaderboard, period, entries, cachedAt: now };
  }

  /**
   * Refresh all registered leaderboards across all periods.
   */
  refreshAll(): void {
    this.definitions.forEach((def) => {
      for (const period of def.periods) {
        this.refresh(def.name, period);
      }
    });
  }

  /**
   * Clear cache for all or a specific leaderboard.
   */
  clearCache(leaderboard?: string): void {
    if (leaderboard) {
      const prefix = `${leaderboard}:`;
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.sub(1, prefix.size()) === prefix) {
          keysToDelete.push(key);
        }
      });
      for (const k of keysToDelete) {
        this.cache.delete(k);
      }
    } else {
      this.cache.clear();
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private loadFromDataStore(
    leaderboard: string,
    period: LeaderboardPeriod,
    limit: number
  ): LeaderboardEntry[] {
    const def = this.definitions.get(leaderboard);
    const ascending = def?.sortDirection === "asc";
    const storeName = buildStoreName(this.config.datastorePrefix, leaderboard, period);
    const dsService = game.GetService("DataStoreService");
    const store = dsService.GetOrderedDataStore(storeName);

    const pages = store.GetSortedAsync(ascending, math.min(limit, 100));
    const page = pages.GetCurrentPage();

    const entries: LeaderboardEntry[] = [];
    let rank = 1;

    for (const item of page) {
      const userId = tonumber(item.key);
      if (userId === undefined) continue;

      entries.push({
        userId,
        playerName: `Player_${item.key}`,
        score: item.value,
        rank,
        updatedAt: os.time(),
      });
      rank += 1;
    }

    return entries;
  }

  private updateCacheEntry(
    cached: CachedLeaderboard,
    def: LeaderboardDefinition,
    userId: number,
    playerName: string,
    score: number
  ): void {
    // Find existing
    let existingIndex = -1;
    for (let i = 0; i < cached.entries.size(); i++) {
      if (cached.entries[i].userId === userId) {
        existingIndex = i;
        break;
      }
    }

    const entry: LeaderboardEntry = {
      userId,
      playerName,
      score,
      rank: 0, // recalculated below
      updatedAt: os.time(),
    };

    if (existingIndex >= 0) {
      cached.entries[existingIndex] = entry;
    } else {
      cached.entries.push(entry);
    }

    // Re-sort using boolean comparator (Lua table.sort requires boolean)
    const asc = def.sortDirection === "asc";
    cached.entries.sort((a, b) => {
      if (asc) return a.score < b.score;
      return a.score > b.score;
    });

    // Re-rank
    for (let i = 0; i < cached.entries.size(); i++) {
      cached.entries[i].rank = i + 1;
    }

    // Trim
    const maxEntries = def.maxEntries ?? 100;
    while (cached.entries.size() > maxEntries) {
      cached.entries.pop();
    }
  }

  private findInEntries(entries: LeaderboardEntry[], userId: number): PlayerRankResult {
    for (const entry of entries) {
      if (entry.userId === userId) {
        return { found: true, entry };
      }
    }
    return { found: false };
  }

  private sliceEntries(entries: LeaderboardEntry[], limit: number): LeaderboardEntry[] {
    const out: LeaderboardEntry[] = [];
    for (let i = 0; i < math.min(entries.size(), limit); i++) {
      out.push(entries[i]);
    }
    return out;
  }
}
