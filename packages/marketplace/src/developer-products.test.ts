/**
 * Tests for DeveloperProductRegistry
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeveloperProductRegistry } from "./developer-products";
import { ProductReceipt } from "./types";

function makeReceipt(overrides?: Partial<ProductReceipt>): ProductReceipt {
  return {
    PlayerId: 1,
    ProductId: 100,
    PurchaseId: "purchase-abc",
    PlaceIdWherePurchased: 999,
    CurrencySpent: 99,
    ...overrides,
  };
}

describe("DeveloperProductRegistry", () => {
  let registry: DeveloperProductRegistry;

  beforeEach(() => {
    registry = new DeveloperProductRegistry();
  });

  it("starts empty", () => {
    expect(registry.count()).toBe(0);
    expect(registry.getAllProducts()).toEqual([]);
  });

  it("registers a product and handler", () => {
    registry.register({ productId: 100, name: "100 Coins" }, () => "PurchaseGranted");
    expect(registry.count()).toBe(1);
    expect(registry.getProduct(100)?.name).toBe("100 Coins");
  });

  it("replaces an existing registration", () => {
    registry.register({ productId: 100, name: "100 Coins" }, () => "PurchaseGranted");
    registry.register({ productId: 100, name: "100 Gold" }, () => "PurchaseGranted");
    expect(registry.count()).toBe(1);
    expect(registry.getProduct(100)?.name).toBe("100 Gold");
  });

  it("unregisters a product", () => {
    registry.register({ productId: 100, name: "100 Coins" }, () => "PurchaseGranted");
    registry.unregister(100);
    expect(registry.count()).toBe(0);
    expect(registry.getProduct(100)).toBeUndefined();
    expect(registry.getHandler(100)).toBeUndefined();
  });

  it("getAllProducts returns all registered products", () => {
    registry.register({ productId: 100, name: "A" }, () => "PurchaseGranted");
    registry.register({ productId: 200, name: "B" }, () => "PurchaseGranted");
    const products = registry.getAllProducts();
    expect(products).toHaveLength(2);
    const ids = products.map((p) => p.productId).sort();
    expect(ids).toEqual([100, 200]);
  });

  describe("handleReceipt", () => {
    it("returns PurchaseGranted when handler succeeds", () => {
      registry.register({ productId: 100, name: "100 Coins" }, () => "PurchaseGranted");
      expect(registry.handleReceipt(makeReceipt({ ProductId: 100 }))).toBe("PurchaseGranted");
    });

    it("returns NotProcessedYet when no handler registered", () => {
      expect(registry.handleReceipt(makeReceipt({ ProductId: 999 }))).toBe("NotProcessedYet");
    });

    it("returns NotProcessedYet when handler throws", () => {
      registry.register({ productId: 100, name: "Boom" }, () => {
        throw new Error("handler error");
      });
      expect(registry.handleReceipt(makeReceipt({ ProductId: 100 }))).toBe("NotProcessedYet");
    });

    it("passes the receipt to the handler", () => {
      const received: ProductReceipt[] = [];
      registry.register({ productId: 100, name: "100 Coins" }, (r) => {
        received.push(r);
        return "PurchaseGranted";
      });
      const receipt = makeReceipt({ ProductId: 100, PlayerId: 42 });
      registry.handleReceipt(receipt);
      expect(received).toHaveLength(1);
      expect(received[0].PlayerId).toBe(42);
    });

    it("returns NotProcessedYet when handler returns NotProcessedYet", () => {
      registry.register({ productId: 100, name: "Failing" }, () => "NotProcessedYet");
      expect(registry.handleReceipt(makeReceipt({ ProductId: 100 }))).toBe("NotProcessedYet");
    });
  });
});
