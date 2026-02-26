/**
 * @broblox/marketplace — Public API
 *
 * Roblox MarketplaceService wrapper for developer products, game passes,
 * and idempotent purchase receipt validation.
 *
 * @example
 * ```ts
 * import { createMarketplaceService } from "@broblox/marketplace";
 *
 * const mps = game.GetService("MarketplaceService");
 * const handle = createMarketplaceService({
 *   products: [{ productId: 12345, name: "100 Coins" }],
 *   passes:   [{ passId: 67890,    name: "VIP" }],
 *   passOwnershipFetcher: (userId, passId) =>
 *     mps.UserOwnsGamePassAsync(userId, passId),
 *   onSetupReceipt: () => {
 *     mps.ProcessReceipt = (r) => handle.processReceipt(r);
 *   },
 * });
 *
 * // Register a product handler after init
 * handle.registerProduct(
 *   { productId: 12345, name: "100 Coins" },
 *   (receipt) => {
 *     grantCoins(receipt.PlayerId, 100);
 *     return "PurchaseGranted";
 *   }
 * );
 * ```
 */

export type {
  DeveloperProduct,
  GamePass,
  MarketplaceConfig,
  PassOwnershipFetcher,
  PassOwnershipResult,
  ProductHandler,
  ProductReceipt,
  PurchaseDecision,
} from "./types";
export { DEFAULT_MARKETPLACE_CONFIG, VERSION } from "./types";

export { DeveloperProductRegistry } from "./developer-products";
export { GamePassCache } from "./game-passes";
export { PurchaseValidator } from "./purchase-validator";

export type {
  MarketplaceServiceConfig,
  MarketplaceServiceHandle,
} from "./create-marketplace-service";
export { createMarketplaceService } from "./create-marketplace-service";
