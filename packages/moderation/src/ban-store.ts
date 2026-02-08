/**
 * Ban Store
 *
 * DataStore wrapper for ban records with caching.
 * Uses synchronous patterns compatible with roblox-ts.
 */

import { createLogger } from "@rbx/core";
import { BanRecord, BanCheckResult, CreateBanInput } from "./types";

const logger = createLogger("Moderation.BanStore");

// Declare Roblox services
declare const game: {
  GetService(name: "DataStoreService"): DataStoreService;
  GetService(name: "HttpService"): HttpService;
};

interface DataStoreService {
  GetDataStore(name: string): DataStore;
}

interface DataStore {
  GetAsync(key: string): LuaTuple<[unknown, unknown]>;
  SetAsync(key: string, value: unknown): void;
  UpdateAsync(key: string, callback: (old: unknown) => unknown): unknown;
}

interface HttpService {
  GenerateGUID(wrapInCurlyBraces?: boolean): string;
}

// ============================================================================
// Ban Store
// ============================================================================

export class BanStore {
  private store: DataStore;
  private http: HttpService;
  private cache = new Map<number, BanRecord[]>();
  private cacheTTL = 60; // seconds
  private cacheTimestamps = new Map<number, number>();

  constructor(datastoreName: string) {
    const DataStoreService = game.GetService("DataStoreService");
    this.store = DataStoreService.GetDataStore(datastoreName + "_Bans");
    this.http = game.GetService("HttpService");
    logger.info(`Ban store initialized: ${datastoreName}_Bans`);
  }

  private generateId(): string {
    return this.http.GenerateGUID(false);
  }

  private getKey(playerId: number): string {
    return `bans_${playerId}`;
  }

  private isCacheValid(playerId: number): boolean {
    const timestamp = this.cacheTimestamps.get(playerId);
    if (!timestamp) return false;
    return os.time() - timestamp < this.cacheTTL;
  }

  /**
   * Get all bans for a player.
   */
  getBans(playerId: number): BanRecord[] {
    if (this.isCacheValid(playerId)) {
      return this.cache.get(playerId) ?? [];
    }

    const key = this.getKey(playerId);
    const [data] = this.store.GetAsync(key);
    const bans = (data as BanRecord[] | undefined) ?? [];

    this.cache.set(playerId, bans);
    this.cacheTimestamps.set(playerId, os.time());

    return bans;
  }

  /**
   * Check if a player has an active ban.
   */
  checkBan(playerId: number): BanCheckResult {
    const bans = this.getBans(playerId);
    const now = os.time();

    // Find active ban
    for (const ban of bans) {
      if (ban.status !== "ACTIVE") continue;

      // Check if expired
      if (ban.expiresAt && ban.expiresAt < now) {
        continue;
      }

      // Build ban message
      let message = `You are banned from this game.\n\nReason: ${ban.reason}`;

      if (ban.type === "TEMPORARY" && ban.expiresAt) {
        const remaining = ban.expiresAt - now;
        const hours = math.floor(remaining / 3600);
        const minutes = math.floor((remaining % 3600) / 60);

        if (hours > 0) {
          message += `\n\nBan expires in: ${hours}h ${minutes}m`;
        } else {
          message += `\n\nBan expires in: ${minutes} minutes`;
        }
      } else {
        message += "\n\nThis ban is permanent.";
      }

      message += "\n\nIf you believe this is a mistake, please submit an appeal.";

      return {
        isBanned: true,
        ban,
        message,
      };
    }

    return {
      isBanned: false,
      message: "",
    };
  }

  /**
   * Create a new ban.
   */
  createBan(input: CreateBanInput): BanRecord {
    // Input validation
    if (input.playerId <= 0) {
      error("createBan: playerId must be a positive number");
    }
    const trimmedReason = input.reason !== undefined ? tostring(input.reason) : "";
    if (trimmedReason.size() === 0) {
      error("createBan: reason must not be empty");
    }
    if (input.durationHours !== undefined && input.durationHours <= 0) {
      error("createBan: durationHours must be positive when provided");
    }

    const now = os.time();
    const ban: BanRecord = {
      id: this.generateId(),
      playerId: input.playerId,
      playerName: input.playerName,
      type: input.type,
      status: "ACTIVE",
      reason: input.reason,
      internalNote: input.internalNote,
      durationHours: input.durationHours,
      expiresAt: input.durationHours ? now + input.durationHours * 3600 : undefined,
      moderatorId: input.moderatorId,
      createdAt: now,
    };

    const key = this.getKey(input.playerId);

    this.store.UpdateAsync(key, (old) => {
      const bans = (old as BanRecord[] | undefined) ?? [];
      bans.push(ban);
      return bans;
    });

    this.cache.delete(input.playerId);
    this.cacheTimestamps.delete(input.playerId);

    logger.info(`Created ban for player ${input.playerId}: ${input.reason}`);
    return ban;
  }

  /**
   * Revoke a ban.
   */
  revokeBan(playerId: number, banId: string, revokedById: string, reason: string): boolean {
    const key = this.getKey(playerId);
    let found = false;

    this.store.UpdateAsync(key, (old) => {
      const bans = (old as BanRecord[] | undefined) ?? [];

      for (const ban of bans) {
        if (ban.id === banId && ban.status === "ACTIVE") {
          ban.status = "REVOKED";
          ban.revokedAt = os.time();
          ban.revokedById = revokedById;
          ban.revokeReason = reason;
          found = true;
          break;
        }
      }

      return bans;
    });

    this.cache.delete(playerId);
    this.cacheTimestamps.delete(playerId);

    if (found) {
      logger.info(`Revoked ban ${banId} for player ${playerId}`);
    }

    return found;
  }

  /**
   * Sync ban from external source.
   */
  syncBan(ban: BanRecord): void {
    const key = this.getKey(ban.playerId);

    this.store.UpdateAsync(key, (old) => {
      const bans = (old as BanRecord[] | undefined) ?? [];

      let found = false;
      for (let i = 0; i < bans.size(); i++) {
        if (bans[i].id === ban.id) {
          bans[i] = ban;
          found = true;
          break;
        }
      }

      if (!found) {
        bans.push(ban);
      }

      return bans;
    });

    this.cache.delete(ban.playerId);
    this.cacheTimestamps.delete(ban.playerId);

    logger.debug(`Synced ban ${ban.id} for player ${ban.playerId}`);
  }

  /**
   * Clear cache for a player.
   */
  invalidateCache(playerId: number): void {
    this.cache.delete(playerId);
    this.cacheTimestamps.delete(playerId);
  }
}
