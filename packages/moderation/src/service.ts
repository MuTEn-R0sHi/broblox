/**
 * Moderation Service
 *
 * Main entry point for moderation functionality.
 * Combines ban and mute stores with cross-server synchronization.
 */

import { createLogger } from "@rbx/core";
import { BanStore } from "./ban-store";
import { MuteStore } from "./mute-store";
import {
  BanRecord,
  MuteRecord,
  BanCheckResult,
  MuteCheckResult,
  CreateBanInput,
  CreateMuteInput,
} from "./types";

const logger = createLogger("Moderation.Service");

// Declare Roblox services
declare const game: {
  GetService(name: "MessagingService"): MessagingService;
  GetService(name: "HttpService"): HttpService;
};

interface MessagingService {
  PublishAsync(topic: string, message: unknown): void;
  SubscribeAsync(
    topic: string,
    callback: (message: { Data: unknown; Sent: number }) => void
  ): RBXScriptConnection;
}

interface HttpService {
  JSONDecode(input: string): unknown;
}

// ============================================================================
// Moderation Service
// ============================================================================

export class ModerationService {
  private static instance: ModerationService | undefined;

  private banStore: BanStore;
  private muteStore: MuteStore;
  private messaging: MessagingService;
  private http: HttpService;
  private onBanCallbacks: Array<(record: BanRecord) => void> = [];
  private onMuteCallbacks: Array<(record: MuteRecord) => void> = [];

  private constructor(datastoreName: string) {
    this.banStore = new BanStore(datastoreName);
    this.muteStore = new MuteStore(datastoreName);
    this.messaging = game.GetService("MessagingService");
    this.http = game.GetService("HttpService");

    this.subscribeToSync();
    logger.info("ModerationService initialized");
  }

  /**
   * Get the singleton instance.
   */
  static getInstance(datastoreName = "Moderation"): ModerationService {
    if (!ModerationService.instance) {
      ModerationService.instance = new ModerationService(datastoreName);
    }
    return ModerationService.instance;
  }

  /**
   * Subscribe to cross-server sync messages.
   */
  private subscribeToSync(): void {
    // Ban sync
    this.messaging.SubscribeAsync("ModBanSync", (message) => {
      const raw = message.Data;
      let ban: BanRecord | undefined;

      if (typeOf(raw) === "string") {
        try {
          ban = this.http.JSONDecode(raw as string) as BanRecord;
        } catch (err) {
          logger.warn(`Failed to decode ban sync message: ${tostring(err)}`);
          return;
        }
      } else if (typeOf(raw) === "table") {
        ban = raw as BanRecord;
      }

      if (ban?.playerId) {
        this.banStore.invalidateCache(ban.playerId);
        logger.debug(`Received ban sync for player ${ban.playerId}`);

        for (const callback of this.onBanCallbacks) {
          task.spawn(() => callback(ban));
        }
      }
    });

    // Mute sync
    this.messaging.SubscribeAsync("ModMuteSync", (message) => {
      const raw = message.Data;
      let mute: MuteRecord | undefined;

      if (typeOf(raw) === "string") {
        try {
          mute = this.http.JSONDecode(raw as string) as MuteRecord;
        } catch (err) {
          logger.warn(`Failed to decode mute sync message: ${tostring(err)}`);
          return;
        }
      } else if (typeOf(raw) === "table") {
        mute = raw as MuteRecord;
      }

      if (mute?.playerId) {
        this.muteStore.invalidateCache(mute.playerId);
        logger.debug(`Received mute sync for player ${mute.playerId}`);

        for (const callback of this.onMuteCallbacks) {
          task.spawn(() => callback(mute));
        }
      }
    });
  }

  /**
   * Register callback for ban events.
   */
  onBan(callback: (record: BanRecord) => void): void {
    this.onBanCallbacks.push(callback);
  }

  /**
   * Register callback for mute events.
   */
  onMute(callback: (record: MuteRecord) => void): void {
    this.onMuteCallbacks.push(callback);
  }

  // ============================================================================
  // Ban Methods
  // ============================================================================

  /**
   * Check if a player is banned.
   */
  checkBan(playerId: number): BanCheckResult {
    return this.banStore.checkBan(playerId);
  }

  /**
   * Get all bans for a player.
   */
  getBans(playerId: number): BanRecord[] {
    return this.banStore.getBans(playerId);
  }

  /**
   * Create a new ban.
   */
  ban(input: CreateBanInput): BanRecord {
    const record = this.banStore.createBan(input);

    // Sync to other servers
    this.messaging.PublishAsync("ModBanSync", record);

    // Notify callbacks
    for (const callback of this.onBanCallbacks) {
      task.spawn(() => callback(record));
    }

    return record;
  }

  /**
   * Revoke a ban.
   */
  revokeBan(playerId: number, banId: string, revokedById: string, reason: string): boolean {
    const result = this.banStore.revokeBan(playerId, banId, revokedById, reason);

    if (result) {
      // Sync to other servers
      const bans = this.banStore.getBans(playerId);
      for (const ban of bans) {
        if (ban.id === banId) {
          this.messaging.PublishAsync("ModBanSync", ban);
          break;
        }
      }
    }

    return result;
  }

  // ============================================================================
  // Mute Methods
  // ============================================================================

  /**
   * Check if a player is muted.
   */
  checkMute(playerId: number): MuteCheckResult {
    return this.muteStore.checkMute(playerId);
  }

  /**
   * Get all mutes for a player.
   */
  getMutes(playerId: number): MuteRecord[] {
    return this.muteStore.getMutes(playerId);
  }

  /**
   * Create a new mute.
   */
  mute(input: CreateMuteInput): MuteRecord {
    const record = this.muteStore.createMute(input);

    // Sync to other servers
    this.messaging.PublishAsync("ModMuteSync", record);

    // Notify callbacks
    for (const callback of this.onMuteCallbacks) {
      task.spawn(() => callback(record));
    }

    return record;
  }

  /**
   * Remove a mute.
   */
  unmute(playerId: number, muteId: string, removedBy: number): boolean {
    const result = this.muteStore.removeMute(playerId, muteId, removedBy);

    if (result) {
      // Sync to other servers
      const mutes = this.muteStore.getMutes(playerId);
      for (const mute of mutes) {
        if (mute.id === muteId) {
          this.messaging.PublishAsync("ModMuteSync", mute);
          break;
        }
      }
    }

    return result;
  }
}

/**
 * Get the moderation service singleton.
 */
export function getModeration(datastoreName?: string): ModerationService {
  return ModerationService.getInstance(datastoreName);
}
