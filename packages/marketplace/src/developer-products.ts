/**
 * Developer Product Registry
 *
 * Maintains a registry of developer products and their handlers.
 * Routes Roblox's `ProcessReceipt` callback to the correct handler.
 *
 * Usage:
 * ```ts
 * const registry = new DeveloperProductRegistry();
 * registry.register(
 *   { productId: 12345, name: "100 Coins" },
 *   (receipt) => {
 *     grantCoins(receipt.PlayerId, 100);
 *     return "PurchaseGranted";
 *   }
 * );
 * ```
 */

import { mapSize } from "@broblox/core";
import { DeveloperProduct, ProductHandler, ProductReceipt, PurchaseDecision } from "./types";

export class DeveloperProductRegistry {
  private products = new Map<number, DeveloperProduct>();
  private handlers = new Map<number, ProductHandler>();

  /**
   * Register a developer product with its grant handler.
   * Replaces any existing registration for the same `productId`.
   */
  register(product: DeveloperProduct, handler: ProductHandler): void {
    this.products.set(product.productId, product);
    this.handlers.set(product.productId, handler);
  }

  /**
   * Remove a product registration.
   */
  unregister(productId: number): void {
    this.products.delete(productId);
    this.handlers.delete(productId);
  }

  /**
   * Look up a registered product definition.
   */
  getProduct(productId: number): DeveloperProduct | undefined {
    return this.products.get(productId);
  }

  /**
   * Look up a registered handler.
   */
  getHandler(productId: number): ProductHandler | undefined {
    return this.handlers.get(productId);
  }

  /**
   * Process a purchase receipt.
   *
   * - Returns `"PurchaseGranted"` if the handler succeeds.
   * - Returns `"NotProcessedYet"` if no handler is registered for the product
   *   or if the handler throws.
   */
  handleReceipt(receipt: ProductReceipt): PurchaseDecision {
    const handler = this.handlers.get(receipt.ProductId);
    if (!handler) {
      return "NotProcessedYet";
    }

    const [ok, result] = pcall(() => handler(receipt));
    if (!ok) {
      return "NotProcessedYet";
    }

    return result as PurchaseDecision;
  }

  /**
   * Return all registered products as an array.
   */
  getAllProducts(): DeveloperProduct[] {
    const out: DeveloperProduct[] = [];
    this.products.forEach((product) => out.push(product));
    return out;
  }

  /**
   * Number of registered products.
   */
  count(): number {
    return mapSize(this.products);
  }
}
