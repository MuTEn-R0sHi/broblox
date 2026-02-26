/**
 * Moderation Service
 *
 * Main entry point for moderation functionality.
 * Combines ban and mute stores with cross-server synchronization.
 */

import { createLogger } from "@broblox/core";
import { Counter, Histogram } from "@broblox/observability";
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

const messageAgeBucketsMs = {
  boundaries: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000, 120000],
};

const moderationSyncMetrics = {
  ban: {
    received: new Counter("moderation_sync_received_total", { topic: "ModBanSync" }),
    payloadString: new Counter("moderation_sync_payload_string_total", { topic: "ModBanSync" }),
    payloadTable: new Counter("moderation_sync_payload_table_total", { topic: "ModBanSync" }),
    payloadOther: new Counter("moderation_sync_payload_other_total", { topic: "ModBanSync" }),
    decodeError: new Counter("moderation_sync_decode_errors_total", { topic: "ModBanSync" }),
    cacheInvalidations: new Counter("moderation_sync_cache_invalidations_total", {
      topic: "ModBanSync",
    }),
    callbacks: new Counter("moderation_sync_callbacks_total", { topic: "ModBanSync" }),
    messageAgeMs: new Histogram(
      "moderation_sync_message_age_ms",
      { topic: "ModBanSync" },
      messageAgeBucketsMs
    ),
    published: new Counter("moderation_sync_published_total", { topic: "ModBanSync" }),
  },
  mute: {
    received: new Counter("moderation_sync_received_total", { topic: "ModMuteSync" }),
    payloadString: new Counter("moderation_sync_payload_string_total", { topic: "ModMuteSync" }),
    payloadTable: new Counter("moderation_sync_payload_table_total", { topic: "ModMuteSync" }),
    payloadOther: new Counter("moderation_sync_payload_other_total", { topic: "ModMuteSync" }),
    decodeError: new Counter("moderation_sync_decode_errors_total", { topic: "ModMuteSync" }),
    cacheInvalidations: new Counter("moderation_sync_cache_invalidations_total", {
      topic: "ModMuteSync",
    }),
    callbacks: new Counter("moderation_sync_callbacks_total", { topic: "ModMuteSync" }),
    messageAgeMs: new Histogram(
      "moderation_sync_message_age_ms",
      { topic: "ModMuteSync" },
      messageAgeBucketsMs
    ),
    published: new Counter("moderation_sync_published_total", { topic: "ModMuteSync" }),
  },
};

function recordMessageAgeMs(histogram: Histogram, sentTimestampSec: number): void {
  const ageSec = os.time() - sentTimestampSec;
  if (ageSec < 0) return;
  histogram.observe(ageSec * 1000);
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
      moderationSyncMetrics.ban.received.inc();
      recordMessageAgeMs(moderationSyncMetrics.ban.messageAgeMs, message.Sent);

      const raw = message.Data;
      let ban: BanRecord | undefined;

      if (typeOf(raw) === "string") {
        moderationSyncMetrics.ban.payloadString.inc();
        try {
          ban = this.http.JSONDecode(raw as string) as BanRecord;
        } catch (err) {
          moderationSyncMetrics.ban.decodeError.inc();
          logger.warn(`Failed to decode ban sync message: ${tostring(err)}`);
          return;
        }
      } else if (typeOf(raw) === "table") {
        moderationSyncMetrics.ban.payloadTable.inc();
        ban = raw as BanRecord;
      } else {
        moderationSyncMetrics.ban.payloadOther.inc();
      }

      if (ban?.playerId) {
        this.banStore.invalidateCache(ban.playerId);
        moderationSyncMetrics.ban.cacheInvalidations.inc();
        logger.debug(`Received ban sync for player ${ban.playerId}`);

        for (const callback of this.onBanCallbacks) {
          moderationSyncMetrics.ban.callbacks.inc();
          task.spawn(() => callback(ban));
        }
      }
    });

    // Mute sync
    this.messaging.SubscribeAsync("ModMuteSync", (message) => {
      moderationSyncMetrics.mute.received.inc();
      recordMessageAgeMs(moderationSyncMetrics.mute.messageAgeMs, message.Sent);

      const raw = message.Data;
      let mute: MuteRecord | undefined;

      if (typeOf(raw) === "string") {
        moderationSyncMetrics.mute.payloadString.inc();
        try {
          mute = this.http.JSONDecode(raw as string) as MuteRecord;
        } catch (err) {
          moderationSyncMetrics.mute.decodeError.inc();
          logger.warn(`Failed to decode mute sync message: ${tostring(err)}`);
          return;
        }
      } else if (typeOf(raw) === "table") {
        moderationSyncMetrics.mute.payloadTable.inc();
        mute = raw as MuteRecord;
      } else {
        moderationSyncMetrics.mute.payloadOther.inc();
      }

      if (mute?.playerId) {
        this.muteStore.invalidateCache(mute.playerId);
        moderationSyncMetrics.mute.cacheInvalidations.inc();
        logger.debug(`Received mute sync for player ${mute.playerId}`);

        for (const callback of this.onMuteCallbacks) {
          moderationSyncMetrics.mute.callbacks.inc();
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
    moderationSyncMetrics.ban.published.inc();
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
          moderationSyncMetrics.ban.published.inc();
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
    moderationSyncMetrics.mute.published.inc();
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
          moderationSyncMetrics.mute.published.inc();
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
