/**
 * Tests for PurchaseValidator
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { DeveloperProductRegistry } from "./developer-products";
import { PurchaseValidator } from "./purchase-validator";
import { ProductReceipt } from "./types";

function setupGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  g.pcall = <T>(fn: (...a: unknown[]) => T, ...args: unknown[]): [true, T] | [false, string] => {
    try {
      return [true, fn(...args)];
    } catch (e) {
      return [false, String(e)];
    }
  };
}

function teardownGlobals() {
  const g = globalThis as unknown as Record<string, unknown>;
  delete g.pcall;
}

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

describe("PurchaseValidator", () => {
  let registry: DeveloperProductRegistry;
  let validator: PurchaseValidator;

  beforeEach(() => {
    setupGlobals();
    registry = new DeveloperProductRegistry();
    validator = new PurchaseValidator(registry);
  });

  afterEach(() => teardownGlobals());

  it("starts with zero granted purchases", () => {
    expect(validator.grantedCount()).toBe(0);
  });

  it("returns PurchaseGranted when handler succeeds", () => {
    registry.register({ productId: 100, name: "100 Coins" }, () => "PurchaseGranted");
    const decision = validator.process(makeReceipt());
    expect(decision).toBe("PurchaseGranted");
  });

  it("records purchase after PurchaseGranted", () => {
    registry.register({ productId: 100, name: "100 Coins" }, () => "PurchaseGranted");
    validator.process(makeReceipt({ PurchaseId: "p-001" }));
    expect(validator.isGranted("p-001")).toBe(true);
    expect(validator.grantedCount()).toBe(1);
  });

  it("is idempotent — second call with same PurchaseId skips handler", () => {
    let callCount = 0;
    registry.register({ productId: 100, name: "100 Coins" }, () => {
      callCount++;
      return "PurchaseGranted";
    });

    validator.process(makeReceipt({ PurchaseId: "p-001" }));
    validator.process(makeReceipt({ PurchaseId: "p-001" }));

    expect(callCount).toBe(1);
    expect(validator.grantedCount()).toBe(1);
  });

  it("does not record purchase on NotProcessedYet", () => {
    registry.register({ productId: 100, name: "Failing" }, () => "NotProcessedYet");
    const decision = validator.process(makeReceipt({ PurchaseId: "p-001" }));
    expect(decision).toBe("NotProcessedYet");
    expect(validator.isGranted("p-001")).toBe(false);
    expect(validator.grantedCount()).toBe(0);
  });

  it("does not record purchase when no handler is registered", () => {
    const decision = validator.process(makeReceipt({ ProductId: 999 }));
    expect(decision).toBe("NotProcessedYet");
    expect(validator.grantedCount()).toBe(0);
  });

  it("handles multiple distinct purchases independently", () => {
    registry.register({ productId: 100, name: "100 Coins" }, () => "PurchaseGranted");
    validator.process(makeReceipt({ PurchaseId: "p-001" }));
    validator.process(makeReceipt({ PurchaseId: "p-002" }));

    expect(validator.grantedCount()).toBe(2);
    expect(validator.isGranted("p-001")).toBe(true);
    expect(validator.isGranted("p-002")).toBe(true);
  });

  it("resetForTesting clears granted set", () => {
    registry.register({ productId: 100, name: "100 Coins" }, () => "PurchaseGranted");
    validator.process(makeReceipt({ PurchaseId: "p-001" }));
    expect(validator.grantedCount()).toBe(1);

    validator.resetForTesting();
    expect(validator.grantedCount()).toBe(0);
    expect(validator.isGranted("p-001")).toBe(false);
  });
});
