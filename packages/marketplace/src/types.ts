/**
 * @broblox/marketplace — Type Definitions
 *
 * Types for Roblox MarketplaceService integration.
 * Covers developer products, game passes, and purchase receipt processing.
 */

// ============================================================================
// Purchase Decision
// ============================================================================

/**
 * Result returned by a ProcessReceipt handler.
 *
 * - `"PurchaseGranted"` — reward was successfully delivered; Roblox will not
 *   call the handler again for this receipt.
 * - `"NotProcessedYet"` — something went wrong; Roblox will retry delivery.
 */
export type PurchaseDecision = "PurchaseGranted" | "NotProcessedYet";

// ============================================================================
// Developer Products
// ============================================================================

/**
 * A one-time purchasable developer product (can be bought multiple times).
 */
export interface DeveloperProduct {
  /** Roblox developer product ID */
  readonly productId: number;
  /** Human-readable name */
  readonly name: string;
  /** Optional description */
  readonly description?: string;
  /** Price in Robux (informational only; enforced by Roblox) */
  readonly robuxPrice?: number;
}

/**
 * Raw receipt data passed by Roblox's `ProcessReceipt` callback.
 */
export interface ProductReceipt {
  /** The player who made the purchase */
  readonly PlayerId: number;
  /** The developer product ID that was purchased */
  readonly ProductId: number;
  /** Unique identifier for this specific purchase transaction */
  readonly PurchaseId: string;
  /** The place where the purchase was made */
  readonly PlaceIdWherePurchased: number;
  /** Currency spent (in Robux) */
  readonly CurrencySpent: number;
}

/**
 * Handler called when a developer product is purchased.
 * Must return a PurchaseDecision.
 */
export type ProductHandler = (receipt: ProductReceipt) => PurchaseDecision;

// ============================================================================
// Game Passes
// ============================================================================

/**
 * A game pass — permanent one-time purchase granting access to a feature.
 */
export interface GamePass {
  /** Roblox game pass ID */
  readonly passId: number;
  /** Human-readable name */
  readonly name: string;
  /** Optional description */
  readonly description?: string;
  /** Price in Robux (informational only; enforced by Roblox) */
  readonly robuxPrice?: number;
}

/**
 * Injected function that checks if a user owns a game pass via the Roblox API.
 * In production: wraps `MarketplaceService:UserOwnsGamePassAsync(userId, passId)`.
 * In tests: provided as a mock.
 */
export type PassOwnershipFetcher = (userId: number, passId: number) => boolean;

/**
 * Result of a game pass ownership check.
 */
export interface PassOwnershipResult {
  /** Whether the player owns the pass */
  readonly owned: boolean;
  /** Whether the result came from the in-memory cache */
  readonly fromCache: boolean;
}

// ============================================================================
// Configuration
// ============================================================================

/** Configuration for the MarketplaceService wrapper */
export interface MarketplaceConfig {
  /**
   * TTL in seconds for game pass ownership cache.
   * After expiry, the next ownership check re-fetches from Roblox.
   * Defaults to 300 (5 minutes).
   */
  readonly passOwnershipCacheTtl?: number;
  /** Enable verbose logging. Defaults to false. */
  readonly enableLogging?: boolean;
}

export const DEFAULT_MARKETPLACE_CONFIG: Required<MarketplaceConfig> = {
  passOwnershipCacheTtl: 300,
  enableLogging: false,
};

export const VERSION = "0.1.0";
