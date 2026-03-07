/**
 * Marketplace Service — Obby Game
 *
 * Handles developer products, game passes, and idempotent purchase receipt
 * processing via the @broblox/marketplace package.
 *
 * Product handlers grant rewards through DataService / RewardFulfillment.
 * Game pass ownership is cached (TTL-based) and exposed to other services.
 */

import { createMarketplaceService } from "@broblox/marketplace";
import type { MarketplaceServiceHandle } from "@broblox/marketplace";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

// ============================================================================
// Product & Pass Definitions
// ============================================================================

/**
 * Developer products — one-time purchasable items (can be bought multiple times).
 * Update product IDs with real Roblox asset IDs before going live.
 */
const DEVELOPER_PRODUCTS = [
  { productId: 3_000_001, name: "100 Coins", description: "Get 100 coins", robuxPrice: 25 },
  { productId: 3_000_002, name: "500 Coins", description: "Get 500 coins", robuxPrice: 99 },
  {
    productId: 3_000_003,
    name: "Skip Stage",
    description: "Skip the current stage",
    robuxPrice: 49,
  },
] as const;

/**
 * Game passes — permanent one-time purchases.
 * Update pass IDs with real Roblox asset IDs before going live.
 */
const GAME_PASSES = [
  { passId: 4_000_001, name: "VIP", description: "VIP badge, 2x coin multiplier", robuxPrice: 199 },
  {
    passId: 4_000_002,
    name: "Speed Boost",
    description: "Permanent 10% speed boost",
    robuxPrice: 99,
  },
  {
    passId: 4_000_003,
    name: "Trail Pack",
    description: "Unlock all cosmetic trails",
    robuxPrice: 149,
  },
] as const;

// ============================================================================
// Factory
// ============================================================================

let _handle: MarketplaceServiceHandle | undefined;

function getHandle(): MarketplaceServiceHandle {
  if (!_handle) {
    _handle = createMarketplaceService({
      products: [...DEVELOPER_PRODUCTS],
      passes: [...GAME_PASSES],
      passOwnershipCacheTtl: 300,
      enableLogging: true,
      onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
      onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
    });
  }
  return _handle;
}

const handle = getHandle();

// ============================================================================
// Exports
// ============================================================================

export const MarketplaceService = handle.Service;

/** Check if a player owns a game pass (cache-first). */
export const userOwnsGamePass = (userId: number, passId: number) =>
  handle.userOwnsGamePass(userId, passId);

/** Register a product handler at runtime (called from PlayerActionService). */
export const registerProduct: typeof handle.registerProduct = (product, handler) =>
  handle.registerProduct(product, handler);

/** Process a purchase receipt — idempotent. */
export const processReceipt: typeof handle.processReceipt = (receipt) =>
  handle.processReceipt(receipt);

/** Directly mark a player as owning a game pass. */
export const setPassOwned: typeof handle.setPassOwned = (userId, passId, owned) =>
  handle.setPassOwned(userId, passId, owned);

/** Access the underlying product registry. */
export const getProductRegistry = () => handle.getProductRegistry();

/** Access the underlying game pass cache. */
export const getGamePassCache = () => handle.getGamePassCache();

/** Product and pass definitions for reference by other services. */
export { DEVELOPER_PRODUCTS, GAME_PASSES };
