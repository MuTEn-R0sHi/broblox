/**
 * Tests for @rbx/marketplace public index
 */

import { describe, it, expect } from "vitest";

describe("@rbx/marketplace index exports", () => {
  it("exports createMarketplaceService", async () => {
    const mod = await import("./index");
    expect(typeof mod.createMarketplaceService).toBe("function");
  });

  it("exports DeveloperProductRegistry", async () => {
    const mod = await import("./index");
    expect(typeof mod.DeveloperProductRegistry).toBe("function");
  });

  it("exports GamePassCache", async () => {
    const mod = await import("./index");
    expect(typeof mod.GamePassCache).toBe("function");
  });

  it("exports PurchaseValidator", async () => {
    const mod = await import("./index");
    expect(typeof mod.PurchaseValidator).toBe("function");
  });

  it("exports DEFAULT_MARKETPLACE_CONFIG", async () => {
    const mod = await import("./index");
    expect(mod.DEFAULT_MARKETPLACE_CONFIG).toBeDefined();
    expect(mod.DEFAULT_MARKETPLACE_CONFIG.passOwnershipCacheTtl).toBe(300);
  });

  it("exports VERSION", async () => {
    const mod = await import("./index");
    expect(typeof mod.VERSION).toBe("string");
  });
});
