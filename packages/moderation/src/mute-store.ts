/**
 * Mute Store
 *
 * DataStore wrapper for mute records with caching.
 * Uses synchronous patterns compatible with roblox-ts.
 */

import { createLogger } from "@rbx/core";
import { MuteRecord, MuteCheckResult, CreateMuteInput } from "./types";

const logger = createLogger("Moderation.MuteStore");

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
// Mute Store
// ============================================================================

export class MuteStore {
  private store: DataStore;
  private http: HttpService;
  private cache = new Map<number, MuteRecord[]>();
  private cacheTTL = 60;
  private cacheTimestamps = new Map<number, number>();

  constructor(datastoreName: string) {
    const DataStoreService = game.GetService("DataStoreService");
    this.store = DataStoreService.GetDataStore(datastoreName + "_Mutes");
    this.http = game.GetService("HttpService");
    logger.info(`Mute store initialized: ${datastoreName}_Mutes`);
  }

  private generateId(): string {
    return this.http.GenerateGUID(false);
  }

  private getKey(playerId: number): string {
    return `mutes_${playerId}`;
  }

  private isCacheValid(playerId: number): boolean {
    const timestamp = this.cacheTimestamps.get(playerId);
    if (!timestamp) return false;
    return os.time() - timestamp < this.cacheTTL;
  }

  /**
   * Get all mutes for a player.
   */
  getMutes(playerId: number): MuteRecord[] {
    if (this.isCacheValid(playerId)) {
      return this.cache.get(playerId) ?? [];
    }

    const key = this.getKey(playerId);
    const [data] = this.store.GetAsync(key);
    const mutes = (data as MuteRecord[] | undefined) ?? [];

    this.cache.set(playerId, mutes);
    this.cacheTimestamps.set(playerId, os.time());

    return mutes;
  }

  /**
   * Check if a player is currently muted.
   */
  checkMute(playerId: number): MuteCheckResult {
    const mutes = this.getMutes(playerId);
    const now = os.time();

    for (const mute of mutes) {
      if (!mute.isActive) continue;
      if (mute.expiresAt && mute.expiresAt < now) continue;

      return {
        isMuted: true,
        mute,
        expiresIn: mute.expiresAt ? mute.expiresAt - now : undefined,
      };
    }

    return { isMuted: false };
  }

  /**
   * Create a new mute.
   */
  createMute(input: CreateMuteInput): MuteRecord {
    const now = os.time();
    const mute: MuteRecord = {
      id: this.generateId(),
      playerId: input.playerId,
      type: input.type,
      isActive: true,
      reason: input.reason,
      durationMinutes: input.durationMinutes,
      expiresAt: now + input.durationMinutes * 60,
      moderatorId: input.moderatorId,
      createdAt: now,
    };

    const key = this.getKey(input.playerId);

    this.store.UpdateAsync(key, (old) => {
      const mutes = (old as MuteRecord[] | undefined) ?? [];
      mutes.push(mute);
      return mutes;
    });

    this.cache.delete(input.playerId);
    this.cacheTimestamps.delete(input.playerId);

    logger.info(`Created mute for player ${input.playerId}: ${input.reason}`);
    return mute;
  }

  /**
   * Remove a mute.
   */
  removeMute(playerId: number, muteId: string, _removedBy: number): boolean {
    const key = this.getKey(playerId);
    let found = false;

    this.store.UpdateAsync(key, (old) => {
      const mutes = (old as MuteRecord[] | undefined) ?? [];

      for (const mute of mutes) {
        if (mute.id === muteId && mute.isActive) {
          mute.isActive = false;
          found = true;
          break;
        }
      }

      return mutes;
    });

    this.cache.delete(playerId);
    this.cacheTimestamps.delete(playerId);

    if (found) {
      logger.info(`Removed mute ${muteId} for player ${playerId}`);
    }

    return found;
  }

  /**
   * Clear cache for a player.
   */
  invalidateCache(playerId: number): void {
    this.cache.delete(playerId);
    this.cacheTimestamps.delete(playerId);
  }
}
