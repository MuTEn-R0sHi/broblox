/**
 * Factory for game-level MarketplaceService.
 *
 * Wires together:
 * - `DeveloperProductRegistry` — product definitions + grant handlers
 * - `GamePassCache` — ownership cache with TTL
 * - `PurchaseValidator` — idempotent receipt processing
 *
 * In production, inject `MarketplaceService` adapters via the config so the
 * package remains testable without a live Roblox instance.
 *
 * @example
 * ```ts
 * const mps = game.GetService("MarketplaceService");
 *
 * const handle = createMarketplaceService({
 *   products: [{ productId: 12345, name: "100 Coins" }],
 *   passes:   [{ passId: 67890,    name: "VIP" }],
 *   passOwnershipCacheTtl: 300,
 *
 *   // Wire Roblox pass ownership API
 *   passOwnershipFetcher: (userId, passId) =>
 *     mps.UserOwnsGamePassAsync(userId, passId),
 *
 *   // Wire ProcessReceipt — Roblox calls this when a product is purchased
 *   onProcessReceipt: (receipt) => {
 *     mps.ProcessReceipt = () => handle.processReceipt(receipt);
 *   },
 *
 *   // Wire PromptGamePassPurchaseFinished so ownership cache is updated
 *   onGamePassPurchased: (player, passId, wasPurchased) => {
 *     if (wasPurchased) handle.setPassOwned(player.UserId, passId, true);
 *   },
 *
 *   onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
 *   onPlayerAdded:    (cb) => PlayerLifecycleService.onPlayerAdded(cb),
 * });
 * ```
 */

import { Service, createLogger, arraySize } from "@rbx/core";
import {
  DeveloperProduct,
  GamePass,
  MarketplaceConfig,
  PassOwnershipFetcher,
  PassOwnershipResult,
  ProductHandler,
  ProductReceipt,
  PurchaseDecision,
  DEFAULT_MARKETPLACE_CONFIG,
} from "./types";
import { DeveloperProductRegistry } from "./developer-products";
import { GamePassCache } from "./game-passes";
import { PurchaseValidator } from "./purchase-validator";

// ============================================================================
// Config
// ============================================================================

export interface MarketplaceServiceConfig extends MarketplaceConfig {
  /** Developer product definitions to register on init. */
  products?: DeveloperProduct[];
  /** Game pass definitions to register on init. */
  passes?: GamePass[];
  /**
   * Injected function that wraps `MarketplaceService:UserOwnsGamePassAsync`.
   * When omitted, ownership checks return `false` if not cached.
   */
  passOwnershipFetcher?: PassOwnershipFetcher;
  /**
   * Called after the service is initialised.  Wire `MarketplaceService.ProcessReceipt`
   * here:
   * ```ts
   * onSetupReceipt: () => {
   *   mps.ProcessReceipt = (receipt) => handle.processReceipt(receipt);
   * }
   * ```
   */
  onSetupReceipt?: () => void;
  /** Wires player-leave cleanup. */
  onPlayerRemoving?: (callback: (player: Player) => void) => void;
  /** Wires player-join cache warm-up. */
  onPlayerAdded?: (callback: (player: Player) => void) => void;
}

// ============================================================================
// Handle
// ============================================================================

export interface MarketplaceServiceHandle {
  /** The Service object — register with your game's Application. */
  Service: Service;
  /** Register a product + handler at runtime. */
  registerProduct(product: DeveloperProduct, handler: ProductHandler): void;
  /** Register a game pass definition at runtime. */
  registerPass(pass: GamePass): void;
  /** Process a purchase receipt (idempotent). */
  processReceipt(receipt: ProductReceipt): PurchaseDecision;
  /** Check if a player owns a game pass (cache-first). */
  userOwnsGamePass(userId: number, passId: number): PassOwnershipResult;
  /** Directly mark a player as owning a game pass (e.g. after a prompt purchase). */
  setPassOwned(userId: number, passId: number, owned: boolean): void;
  /** Access the underlying registry (for advanced use). */
  getProductRegistry(): DeveloperProductRegistry;
  /** Access the underlying game pass cache (for advanced use). */
  getGamePassCache(): GamePassCache;
}

// ============================================================================
// Factory
// ============================================================================

export function createMarketplaceService(
  config: MarketplaceServiceConfig
): MarketplaceServiceHandle {
  const logger = createLogger("MarketplaceService");

  const ttl = config.passOwnershipCacheTtl ?? DEFAULT_MARKETPLACE_CONFIG.passOwnershipCacheTtl;
  const registry = new DeveloperProductRegistry();
  const passCache = new GamePassCache(ttl);
  const validator = new PurchaseValidator(registry);

  if (config.passOwnershipFetcher) {
    passCache.setFetcher(config.passOwnershipFetcher);
  }

  const handle: MarketplaceServiceHandle = {
    Service: {
      name: "MarketplaceService",

      onInit() {
        // Register products
        if (config.products) {
          for (const product of config.products) {
            registry.register(product, () => "NotProcessedYet");
          }
        }
        // Register passes
        if (config.passes) {
          for (const pass of config.passes) {
            passCache.registerPass(pass);
          }
        }

        logger.info(
          `MarketplaceService initialized — ${registry.count()} product(s), ${arraySize(passCache.getAllPasses())} pass(es).`
        );

        config.onPlayerRemoving?.((player) => {
          passCache.invalidatePlayer(player.UserId);
          logger.debug(`Pass cache cleared for player ${player.UserId}`);
        });
      },

      onStart() {
        // Wire Roblox's ProcessReceipt callback
        config.onSetupReceipt?.();

        config.onPlayerAdded?.((player) => {
          logger.debug(`Player ${player.UserId} joined — pass cache ready.`);
        });

        logger.info("MarketplaceService started.");
      },

      onDestroy() {
        passCache.clearAll();
        logger.info("MarketplaceService stopped.");
      },
    },

    registerProduct(product: DeveloperProduct, handler: ProductHandler) {
      registry.register(product, handler);
    },

    registerPass(pass: GamePass) {
      passCache.registerPass(pass);
    },

    processReceipt(receipt: ProductReceipt): PurchaseDecision {
      const decision = validator.process(receipt);
      if (decision === "PurchaseGranted") {
        logger.info(
          `Receipt granted — product ${receipt.ProductId}, player ${receipt.PlayerId}, purchaseId ${receipt.PurchaseId}`
        );
      } else {
        logger.warn(
          `Receipt not processed — product ${receipt.ProductId}, player ${receipt.PlayerId}`
        );
      }
      return decision;
    },

    userOwnsGamePass(userId: number, passId: number): PassOwnershipResult {
      return passCache.userOwnsGamePass(userId, passId);
    },

    setPassOwned(userId: number, passId: number, owned: boolean) {
      passCache.setOwned(userId, passId, owned);
    },

    getProductRegistry() {
      return registry;
    },

    getGamePassCache() {
      return passCache;
    },
  };

  return handle;
}
