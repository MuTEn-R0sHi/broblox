/**
 * Game Pass Ownership Cache
 *
 * Caches game pass ownership results to avoid excessive Roblox API calls.
 * The in-memory cache uses a configurable TTL.
 *
 * Ownership is checked via an injected `PassOwnershipFetcher` so the core
 * logic is testable without a live Roblox instance.
 *
 * Usage (production wiring):
 * ```ts
 * const mps = game.GetService("MarketplaceService");
 * setPassOwnershipFetcher((userId, passId) =>
 *   mps.UserOwnsGamePassAsync(userId, passId)
 * );
 * ```
 */

import { mapSize } from "@broblox/core";
import { GamePass, PassOwnershipFetcher, PassOwnershipResult } from "./types";

// ============================================================================
// Cache entry
// ============================================================================

interface CacheEntry {
  owned: boolean;
  expiresAt: number;
}

// ============================================================================
// GamePassCache
// ============================================================================

export class GamePassCache {
  /** key: `${userId}:${passId}` */
  private cache = new Map<string, CacheEntry>();
  private passes = new Map<number, GamePass>();
  private fetcher?: PassOwnershipFetcher;

  constructor(private readonly ttlSeconds: number) {}

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  /**
   * Register a game pass definition.
   * Replaces any existing registration for the same `passId`.
   */
  registerPass(pass: GamePass): void {
    this.passes.set(pass.passId, pass);
  }

  /**
   * Remove a game pass registration.
   */
  unregisterPass(passId: number): void {
    this.passes.delete(passId);
  }

  /**
   * Return a registered game pass definition, or undefined.
   */
  getPass(passId: number): GamePass | undefined {
    return this.passes.get(passId);
  }

  /**
   * Return all registered game passes.
   */
  getAllPasses(): GamePass[] {
    const out: GamePass[] = [];
    this.passes.forEach((pass) => out.push(pass));
    return out;
  }

  // --------------------------------------------------------------------------
  // Ownership fetcher
  // --------------------------------------------------------------------------

  /**
   * Inject the ownership fetcher that wraps `MarketplaceService:UserOwnsGamePassAsync`.
   * Must be set before calling `userOwnsGamePass` with `fetchIfMissing = true`.
   */
  setFetcher(fetcher: PassOwnershipFetcher): void {
    this.fetcher = fetcher;
  }

  // --------------------------------------------------------------------------
  // Ownership checks
  // --------------------------------------------------------------------------

  /**
   * Check if a player owns a game pass.
   *
   * - Returns the cached result if present and not expired.
   * - Falls back to the injected fetcher when `fetchIfMissing` is `true`
   *   (default) and a fetcher has been registered.
   * - Returns `{ owned: false, fromCache: false }` if no fetcher is available.
   */
  userOwnsGamePass(userId: number, passId: number, fetchIfMissing = true): PassOwnershipResult {
    const key = `${userId}:${passId}`;
    const now = os.time();
    const cached = this.cache.get(key);

    if (cached && now < cached.expiresAt) {
      return { owned: cached.owned, fromCache: true };
    }

    if (!fetchIfMissing || !this.fetcher) {
      return { owned: false, fromCache: false };
    }

    const [ok, owned] = pcall(() => this.fetcher!(userId, passId));
    const result = ok ? (owned as boolean) : false;

    this.cache.set(key, { owned: result, expiresAt: now + this.ttlSeconds });
    return { owned: result, fromCache: false };
  }

  /**
   * Directly set ownership in the cache (e.g., after a successful game pass purchase
   * is detected via `MarketplaceService.PromptGamePassPurchaseFinished`).
   */
  setOwned(userId: number, passId: number, owned: boolean): void {
    const key = `${userId}:${passId}`;
    this.cache.set(key, { owned, expiresAt: os.time() + this.ttlSeconds });
  }

  /**
   * Invalidate all cached ownership entries for a player.
   * Call this on player leave to free memory.
   */
  invalidatePlayer(userId: number): void {
    const prefix = `${userId}:`;
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.sub(1, prefix.size()) === prefix) {
        keysToDelete.push(key);
      }
    });
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear the entire ownership cache (e.g., on server shutdown).
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Number of entries currently in the cache.
   */
  cacheSize(): number {
    return mapSize(this.cache);
  }
}
