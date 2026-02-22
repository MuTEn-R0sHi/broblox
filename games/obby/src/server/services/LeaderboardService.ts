/**
 * Leaderboard Service (Obby)
 *
 * Uses `@rbx/leaderboards` for completions ranking, DataStore persistence,
 * and automatic caching.  Enriches results with bestTime metadata and
 * broadcasts updates to clients via RemoteEvents.
 */

import { Service, createLogger } from "@rbx/core";
import { LeaderboardStore } from "@rbx/leaderboards";
import { DataService } from "./DataService";
import { PlayerLifecycleService } from "./PlayerLifecycleService";
import { RemoteService } from "./RemoteService";
import { LeaderboardRefreshStatusPayload, LeaderboardUpdatePayload } from "shared/types";

const logger = createLogger("LeaderboardService");

// ── LeaderboardStore instance ──────────────────────────────────────────────

const store = new LeaderboardStore({
  datastorePrefix: "obby_lb",
  refreshInterval: 60,
  enableLogging: false, // we handle our own logging
});

store.register({
  name: "completions",
  label: "Obby Completions",
  sortDirection: "desc",
  periods: ["alltime"],
  maxEntries: 100,
});

// ── Meta store for bestTime / playerName ───────────────────────────────────

interface MetaEntry {
  playerName: string;
  bestTime: number | undefined;
}

const META_STORE_NAME = "obby_leaderboard_meta";
const metaCache = new Map<number, MetaEntry>();

interface DataStore {
  GetAsync(key: string): unknown;
  SetAsync(key: string, value: unknown): void;
}
interface DataStoreService {
  GetDataStore(name: string): DataStore;
}

let metaStore: DataStore | undefined;

function persistMeta(userId: number, meta: MetaEntry): void {
  if (!metaStore) return;
  const [ok, err] = pcall(() => {
    metaStore!.SetAsync(tostring(userId), {
      playerName: meta.playerName,
      bestTime: meta.bestTime,
    });
  });
  if (!ok) logger.warn(`Failed to persist meta for ${userId}: ${tostring(err)}`);
}

function loadMeta(userId: number): MetaEntry | undefined {
  if (!metaStore) return undefined;
  const [ok, raw] = pcall(() => metaStore!.GetAsync(tostring(userId)));
  if (ok && typeIs(raw, "table")) {
    const t = raw as { playerName?: unknown; bestTime?: unknown };
    return {
      playerName: typeIs(t.playerName, "string") ? t.playerName : `User_${userId}`,
      bestTime: typeIs(t.bestTime, "number") ? t.bestTime : undefined,
    };
  }
  return undefined;
}

// ── Broadcasting ───────────────────────────────────────────────────────────

let lastBroadcastAt = 0;
const BROADCAST_MIN_INTERVAL = 2; // seconds

const lastRefreshRequestAt = new Map<number, number>();
const REFRESH_REQUEST_MIN_INTERVAL = 1; // seconds

function buildPayload(limit = 20): LeaderboardUpdatePayload {
  const top = store.getTopEntries("completions", "alltime", limit);
  const entries: LeaderboardUpdatePayload["entries"] = [];

  for (const row of top.entries) {
    const meta = metaCache.get(row.userId);
    entries.push({
      userId: row.userId,
      playerName: meta?.playerName ?? row.playerName,
      completions: row.score,
      bestTime: meta?.bestTime,
      rank: row.rank,
    });
  }

  return { updatedAt: os.time(), entries };
}

function broadcastLeaderboard(force = false): void {
  const now = os.clock();
  if (!force && now - lastBroadcastAt < BROADCAST_MIN_INTERVAL) return;
  lastBroadcastAt = now;
  RemoteService.getRegistry().fireAllClients("LeaderboardUpdate", buildPayload());
}

function sendToPlayer(player: Player, force = false, reason = "unknown"): boolean {
  const now = os.clock();
  const last = lastRefreshRequestAt.get(player.UserId) ?? -math.huge;
  const elapsed = now - last;
  if (!force && elapsed < REFRESH_REQUEST_MIN_INTERVAL) {
    logger.debug(
      `Rate-limited leaderboard snapshot for ${player.Name} (${reason}), wait ${string.format("%.2f", REFRESH_REQUEST_MIN_INTERVAL - elapsed)}s`
    );
    return false;
  }
  lastRefreshRequestAt.set(player.UserId, now);
  RemoteService.getRegistry().fireClient("LeaderboardUpdate", player, buildPayload());
  logger.debug(`Sent leaderboard snapshot to ${player.Name} (${reason})`);
  return true;
}

// ── Service ────────────────────────────────────────────────────────────────

export const LeaderboardService: Service & {
  getLeaderboard(limit?: number): LeaderboardUpdatePayload["entries"];
  getPlayerRank(player: Player): number | undefined;
  updatePlayerEntry(player: Player): void;
  refreshLeaderboard(): void;
} = {
  getLeaderboard(limit?: number) {
    return buildPayload(limit ?? 100).entries;
  },

  getPlayerRank(player: Player): number | undefined {
    const result = store.getPlayerRank("completions", "alltime", player.UserId);
    return result.found ? result.entry?.rank : undefined;
  },

  updatePlayerEntry(player: Player): void {
    const data = DataService.getData(player);
    if (!data || data.totalCompletions === 0) return;

    const meta: MetaEntry = {
      playerName: player.Name,
      bestTime: data.bestFullRunTime,
    };
    metaCache.set(player.UserId, meta);

    store.submitScore("completions", player.UserId, player.Name, data.totalCompletions);
    logger.debug(`Updated leaderboard entry for ${player.Name}`);

    task.spawn(() => persistMeta(player.UserId, meta));
    broadcastLeaderboard();
  },

  refreshLeaderboard(): void {
    store.refresh("completions", "alltime");
    broadcastLeaderboard();
    logger.debug("Refreshed leaderboard cache");
  },

  onInit() {
    logger.debug("Initializing leaderboard service...");

    // Initialise meta store
    const ds = game.GetService("DataStoreService") as unknown as DataStoreService;
    metaStore = ds.GetDataStore(META_STORE_NAME);

    // Prime cache – loads from DataStore automatically
    task.spawn(() => {
      const top = store.getTopEntries("completions", "alltime");
      // Hydrate meta cache from meta DataStore
      for (const row of top.entries) {
        const meta = loadMeta(row.userId);
        if (meta) metaCache.set(row.userId, meta);
      }
      broadcastLeaderboard(true);
    });

    // Send leaderboard to joining players
    PlayerLifecycleService.onPlayerAdded((player) => {
      RemoteService.getRegistry().fireClient("LeaderboardUpdate", player, buildPayload());
    });

    // Client refresh requests
    RemoteService.getRegistry().onEvent("RequestLeaderboard", (player: Player) => {
      logger.debug(`Client requested leaderboard snapshot: ${player.Name}`);
      this.refreshLeaderboard();

      const now = os.clock();
      const last = lastRefreshRequestAt.get(player.UserId) ?? -math.huge;
      const elapsed = now - last;
      const retryAfter = math.max(0, REFRESH_REQUEST_MIN_INTERVAL - elapsed);

      const ok = sendToPlayer(player, false, "manual");
      const status: LeaderboardRefreshStatusPayload = ok ? { ok: true } : { ok: false, retryAfter };
      RemoteService.getRegistry().fireClient("LeaderboardRefreshStatus", player, status);
    });

    // Flush player entry on leave
    PlayerLifecycleService.onPlayerRemoving((player) => {
      this.updatePlayerEntry(player);
      lastRefreshRequestAt.delete(player.UserId);
    });

    // Periodic refresh
    task.spawn(() => {
      while (true) {
        task.wait(60);
        this.refreshLeaderboard();
      }
    });

    logger.info("Leaderboard service initialized");
  },

  onDestroy() {
    logger.debug("Saving leaderboard metadata...");
    metaCache.forEach((meta, userId) => {
      const [ok, err] = pcall(() => persistMeta(userId, meta));
      if (!ok) logger.warn(`Failed to flush meta for ${userId}: ${tostring(err)}`);
    });
    lastRefreshRequestAt.clear();
  },
};
