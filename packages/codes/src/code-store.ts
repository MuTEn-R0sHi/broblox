/**
 * Code Store
 *
 * In-memory code registry + DataStore-backed redemption tracking.
 * Compatible with roblox-ts.
 */

import { createLogger } from "@broblox/core";
import { Counter } from "@broblox/observability";
import {
  RedeemableCode,
  CodeRedemptionRecord,
  RedeemResult,
  RedeemResultStatus,
  CodesConfig,
  DEFAULT_CODES_CONFIG,
} from "./types";

const logger = createLogger("Codes.CodeStore");

// Declare Roblox services
declare const game: {
  GetService(name: "DataStoreService"): DataStoreService;
};

interface DataStoreService {
  GetDataStore(name: string): DataStore;
}

interface DataStore {
  GetAsync(key: string): LuaTuple<[unknown, unknown]>;
  SetAsync(key: string, value: unknown): void;
  UpdateAsync(key: string, callback: (old: unknown) => unknown): unknown;
}

// ============================================================================
// Metrics
// ============================================================================

const redemptionAttempts = new Counter("codes_redemption_attempts");
const redemptionSuccesses = new Counter("codes_redemption_successes");
const redemptionFailures = new Counter("codes_redemption_failures");

// ============================================================================
// Code Store
// ============================================================================

export class CodeStore {
  private store: DataStore;
  private config: Required<CodesConfig>;
  private registry = new Map<string, RedeemableCode>();

  constructor(config?: CodesConfig) {
    this.config = {
      ...DEFAULT_CODES_CONFIG,
      ...(config ?? {}),
    };

    const DataStoreService = game.GetService("DataStoreService");
    this.store = DataStoreService.GetDataStore(this.config.datastoreName);

    if (this.config.enableLogging) {
      logger.info(`Code store initialized: ${this.config.datastoreName}`);
    }
  }

  // --------------------------------------------------------------------------
  // Code Registration
  // --------------------------------------------------------------------------

  /**
   * Register a new redeemable code.
   */
  registerCode(code: RedeemableCode): void {
    const upper = string.upper(code.code);
    const registered: RedeemableCode = { ...code, code: upper };
    this.registry.set(upper, registered);

    if (this.config.enableLogging) {
      logger.info(`Registered code: ${upper}`);
    }
  }

  /**
   * Register multiple codes at once.
   */
  registerCodes(codes: RedeemableCode[]): void {
    for (const code of codes) {
      this.registerCode(code);
    }
  }

  /**
   * Remove a code from the registry.
   */
  unregisterCode(code: string): boolean {
    const upper = string.upper(code);
    const existed = this.registry.has(upper);
    this.registry.delete(upper);
    return existed;
  }

  /**
   * Get a registered code definition, or undefined.
   */
  getCode(code: string): RedeemableCode | undefined {
    return this.registry.get(string.upper(code));
  }

  /**
   * Get all registered codes.
   */
  getAllCodes(): RedeemableCode[] {
    const out: RedeemableCode[] = [];
    this.registry.forEach((c) => out.push(c));
    return out;
  }

  /**
   * Set the status of a code (e.g. disable it).
   */
  setCodeStatus(code: string, status: "ACTIVE" | "EXPIRED" | "DISABLED"): boolean {
    const entry = this.registry.get(string.upper(code));
    if (!entry) return false;
    entry.status = status;
    return true;
  }

  // --------------------------------------------------------------------------
  // Redemption
  // --------------------------------------------------------------------------

  /**
   * Attempt to redeem a code for a player.
   */
  redeemCode(playerId: number, code: string): RedeemResult {
    redemptionAttempts.inc();
    const upper = string.upper(code);

    // 1. Look up in registry
    const entry = this.registry.get(upper);
    if (!entry) {
      redemptionFailures.inc();
      return this.fail("INVALID_CODE", "That code does not exist.");
    }

    // 2. Status check
    if (entry.status === "DISABLED") {
      redemptionFailures.inc();
      return this.fail("DISABLED", "That code is no longer available.");
    }
    if (entry.status === "EXPIRED") {
      redemptionFailures.inc();
      return this.fail("EXPIRED", "That code has expired.");
    }

    // 3. Expiry check
    if (entry.expiresAt > 0 && os.time() >= entry.expiresAt) {
      entry.status = "EXPIRED";
      redemptionFailures.inc();
      return this.fail("EXPIRED", "That code has expired.");
    }

    // 4. Global use limit
    if (entry.maxUses > 0 && entry.useCount >= entry.maxUses) {
      redemptionFailures.inc();
      return this.fail("MAX_USES_REACHED", "That code has reached its maximum redemptions.");
    }

    // 5. Per-player limit
    const records = this.getPlayerRecords(playerId);
    let playerUseCount = 0;
    for (const rec of records) {
      if (rec.code === upper) {
        playerUseCount += 1;
      }
    }

    if (playerUseCount >= entry.perPlayerLimit) {
      redemptionFailures.inc();
      return this.fail("ALREADY_REDEEMED", "You have already redeemed that code.");
    }

    // 6. Persist redemption
    const record: CodeRedemptionRecord = {
      code: upper,
      redeemedAt: os.time(),
    };

    const key = this.getPlayerKey(playerId);
    const [persistOk] = pcall(() => {
      this.store.UpdateAsync(key, (old) => {
        const existing = (old as CodeRedemptionRecord[] | undefined) ?? [];
        existing.push(record);
        return existing;
      });
    });

    if (!persistOk) {
      redemptionFailures.inc();
      return this.fail("INVALID_CODE", "Failed to save redemption. Try again.");
    }

    // 7. Bump global counter
    entry.useCount += 1;

    // 8. Fire callback
    this.config.onRedeem(playerId, upper, entry.rewards);

    if (this.config.enableLogging) {
      logger.info(`Player ${playerId} redeemed code: ${upper}`);
    }

    redemptionSuccesses.inc();

    return {
      success: true,
      status: "SUCCESS",
      message: "Code redeemed successfully!",
      rewards: entry.rewards,
    };
  }

  // --------------------------------------------------------------------------
  // Player Records
  // --------------------------------------------------------------------------

  /**
   * Get all redemption records for a player.
   */
  getPlayerRecords(playerId: number): CodeRedemptionRecord[] {
    const key = this.getPlayerKey(playerId);
    const [ok, rawResult] = pcall(() => {
      const [data] = this.store.GetAsync(key);
      return data;
    });
    if (!ok) return [];
    return (rawResult as CodeRedemptionRecord[] | undefined) ?? [];
  }

  /**
   * Check whether a player has redeemed a particular code.
   */
  hasPlayerRedeemed(playerId: number, code: string): boolean {
    const upper = string.upper(code);
    const records = this.getPlayerRecords(playerId);
    for (const rec of records) {
      if (rec.code === upper) {
        return true;
      }
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private getPlayerKey(playerId: number): string {
    return `codes_${playerId}`;
  }

  private fail(status: RedeemResultStatus, message: string): RedeemResult {
    return { success: false, status, message };
  }
}
