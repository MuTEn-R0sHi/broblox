/**
 * Leaderboard Service
 * Manages rankings and leaderboard data.
 */

import { Service, createLogger } from "@rbx/core";
import { DataService } from "./DataService";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";
import { events, LeaderboardUpdatePayload } from "shared/types";

const logger = createLogger("LeaderboardService");

// Leaderboard entry
interface LeaderboardEntry {
  userId: number;
  playerName: string;
  completions: number;
  bestTime: number | undefined;
  lastUpdated: number;
}

// Module-level state
const leaderboardCache: LeaderboardEntry[] = [];
const MAX_LEADERBOARD_SIZE = 100;
const CACHE_UPDATE_INTERVAL = 60; // seconds

const COMPLETIONS_STORE_NAME = "obby_leaderboard_completions";
const META_STORE_NAME = "obby_leaderboard_meta";

let lastCacheUpdate = 0;
let lastBroadcastAt = 0;
const BROADCAST_MIN_INTERVAL = 2; // seconds

// Roblox service typings (kept local to avoid importing runtime globals at module eval time)
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

interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
}

interface DataStoreService {
  GetOrderedDataStore(name: string): OrderedDataStore;
  GetDataStore(name: string): DataStore;
}

function getDataStoreService(): DataStoreService {
  return game.GetService("DataStoreService") as unknown as DataStoreService;
}

let completionsStore: OrderedDataStore | undefined;
let metaStore: DataStore | undefined;

// Sort entries by completions (desc), then by best time (asc)
function sortLeaderboard(): void {
  leaderboardCache.sort((a, b) => {
    if (a.completions !== b.completions) {
      return a.completions > b.completions; // Higher completions first
    }
    if (a.bestTime !== undefined && b.bestTime !== undefined) {
      return a.bestTime < b.bestTime; // Lower time first
    }
    if (a.bestTime !== undefined) return true;
    if (b.bestTime !== undefined) return false;
    return false;
  });
}

function isPersistenceReady(): boolean {
  return completionsStore !== undefined && metaStore !== undefined;
}

function getLeaderboardKey(userId: number): string {
  return tostring(userId);
}

function persistEntry(entry: LeaderboardEntry): void {
  if (!isPersistenceReady()) return;

  const key = getLeaderboardKey(entry.userId);
  const [okScore, errScore] = pcall(() => {
    completionsStore!.SetAsync(key, entry.completions);
  });
  if (!okScore) {
    logger.warn(`Failed to persist completions for ${entry.userId}: ${tostring(errScore)}`);
  }

  const [okMeta, errMeta] = pcall(() => {
    metaStore!.SetAsync(key, {
      playerName: entry.playerName,
      bestTime: entry.bestTime,
      lastUpdated: entry.lastUpdated,
    });
  });
  if (!okMeta) {
    logger.warn(`Failed to persist meta for ${entry.userId}: ${tostring(errMeta)}`);
  }
}

function loadFromDataStore(): void {
  if (!isPersistenceReady()) return;

  const [okLoad, errLoad] = pcall(() => {
    const pages = completionsStore!.GetSortedAsync(false, MAX_LEADERBOARD_SIZE);
    const page = pages.GetCurrentPage();

    leaderboardCache.clear();

    for (const item of page) {
      const userId = tonumber(item.key);
      if (userId === undefined) continue;

      let playerName = `User_${item.key}`;
      let bestTime: number | undefined = undefined;

      const [okGetMeta, rawMeta] = pcall(() => metaStore!.GetAsync(item.key));
      if (okGetMeta && typeIs(rawMeta, "table")) {
        const meta = rawMeta as { playerName?: unknown; bestTime?: unknown; lastUpdated?: unknown };
        if (typeIs(meta.playerName, "string")) playerName = meta.playerName;
        if (typeIs(meta.bestTime, "number")) bestTime = meta.bestTime;
      }

      leaderboardCache.push({
        userId,
        playerName,
        completions: item.value,
        bestTime,
        lastUpdated: os.time(),
      });
    }

    sortLeaderboard();
  });

  if (!okLoad) {
    logger.warn(`Failed to load leaderboard from DataStore: ${tostring(errLoad)}`);
  }
}

function buildLeaderboardPayload(limit = 20): LeaderboardUpdatePayload {
  const entries: LeaderboardUpdatePayload["entries"] = [];
  const maxEntries = math.min(limit, leaderboardCache.size());

  for (let i = 0; i < maxEntries; i++) {
    const entry = leaderboardCache[i];
    entries.push({
      userId: entry.userId,
      playerName: entry.playerName,
      completions: entry.completions,
      bestTime: entry.bestTime,
      rank: i + 1,
    });
  }

  return {
    updatedAt: os.time(),
    entries,
  };
}

function broadcastLeaderboard(force = false): void {
  const now = os.clock();
  if (!force && now - lastBroadcastAt < BROADCAST_MIN_INTERVAL) return;
  lastBroadcastAt = now;

  const payload = buildLeaderboardPayload();
  RemoteService.leaderboardUpdate().FireAllClients(payload);
}

export const LeaderboardService: Service & {
  getLeaderboard(limit?: number): LeaderboardEntry[];
  getPlayerRank(player: Player): number | undefined;
  updatePlayerEntry(player: Player): void;
  refreshLeaderboard(): void;
} = {
  getLeaderboard(limit?: number): LeaderboardEntry[] {
    const maxEntries = limit ?? MAX_LEADERBOARD_SIZE;
    const result: LeaderboardEntry[] = [];

    for (let i = 0; i < math.min(leaderboardCache.size(), maxEntries); i++) {
      result.push(leaderboardCache[i]);
    }

    return result;
  },

  getPlayerRank(player: Player): number | undefined {
    for (let i = 0; i < leaderboardCache.size(); i++) {
      if (leaderboardCache[i].userId === player.UserId) {
        return i + 1;
      }
    }
    return undefined;
  },

  updatePlayerEntry(player: Player): void {
    const data = DataService.getData(player);
    if (!data || data.totalCompletions === 0) return;

    // Find existing entry
    let existingIndex = -1;
    for (let i = 0; i < leaderboardCache.size(); i++) {
      if (leaderboardCache[i].userId === player.UserId) {
        existingIndex = i;
        break;
      }
    }

    const entry: LeaderboardEntry = {
      userId: player.UserId,
      playerName: player.Name,
      completions: data.totalCompletions,
      bestTime: data.bestFullRunTime,
      lastUpdated: os.time(),
    };

    if (existingIndex >= 0) {
      leaderboardCache[existingIndex] = entry;
    } else {
      leaderboardCache.push(entry);
    }

    sortLeaderboard();

    // Trim to max size
    while (leaderboardCache.size() > MAX_LEADERBOARD_SIZE) {
      leaderboardCache.pop();
    }

    logger.debug(`Updated leaderboard entry for ${player.Name}`);

    // Persist in background (DataStore operations may yield)
    task.spawn(() => persistEntry(entry));

    broadcastLeaderboard();
  },

  refreshLeaderboard(): void {
    const now = os.time();
    if (now - lastCacheUpdate < CACHE_UPDATE_INTERVAL) {
      return;
    }

    lastCacheUpdate = now;

    if (!isPersistenceReady()) {
      // In non-Roblox runtimes (tests), just keep local cache sorted.
      sortLeaderboard();
      broadcastLeaderboard();
      return;
    }

    task.spawn(() => {
      loadFromDataStore();
      broadcastLeaderboard();
    });

    logger.debug("Refreshed leaderboard cache");
  },

  onInit() {
    logger.debug("Initializing leaderboard service...");

    // Initialize DataStore handles lazily in lifecycle (safe for Node/Vitest imports).
    const ds = getDataStoreService();
    completionsStore = ds.GetOrderedDataStore(COMPLETIONS_STORE_NAME);
    metaStore = ds.GetDataStore(META_STORE_NAME);

    // Prime cache on boot
    task.spawn(() => {
      loadFromDataStore();
      broadcastLeaderboard(true);
    });

    // Send current leaderboard to new players
    PlayerLifecycleService.onPlayerAdded((player) => {
      RemoteService.leaderboardUpdate().FireClient(player, buildLeaderboardPayload());
    });

    // Update leaderboard when players leave
    PlayerLifecycleService.onPlayerRemoving((player) => {
      this.updatePlayerEntry(player);
    });

    // Periodic refresh
    task.spawn(() => {
      while (true) {
        task.wait(CACHE_UPDATE_INTERVAL);
        this.refreshLeaderboard();
      }
    });

    logger.info("Leaderboard service initialized");
  },

  onDestroy() {
    // Best-effort flush of cached entries (do not assume PlayerLifecycle events ran for all players).
    logger.debug("Saving leaderboard...");
    if (!isPersistenceReady()) return;

    for (const entry of leaderboardCache) {
      const [okFlush, errFlush] = pcall(() => persistEntry(entry));
      if (!okFlush) {
        logger.warn(`Failed to flush leaderboard entry for ${entry.userId}: ${tostring(errFlush)}`);
      }
    }
  },
};
