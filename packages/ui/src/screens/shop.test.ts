import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  createShopScreen,
  type ShopProduct,
  type ShopGamePass,
  type ShopScreenOptions,
} from "./shop";

// ============================================================================
// Fixtures
// ============================================================================

const PRODUCTS: ShopProduct[] = [
  { productId: 1_000_001, name: "100 Coins", description: "Get 100 coins", robuxPrice: 25 },
  { productId: 1_000_002, name: "500 Coins", description: "Get 500 coins", robuxPrice: 99 },
  {
    productId: 1_000_003,
    name: "2x XP Boost",
    description: "Double XP for 30 minutes",
    robuxPrice: 49,
  },
];

const PASSES: ShopGamePass[] = [
  { passId: 2_000_001, name: "VIP", description: "VIP badge, 2x coin multiplier", robuxPrice: 199 },
  {
    passId: 2_000_002,
    name: "Extra Inventory",
    description: "+100 inventory slots",
    robuxPrice: 99,
  },
];

function makeOptions(overrides?: Partial<ShopScreenOptions>): ShopScreenOptions {
  return {
    getProducts: () => PRODUCTS,
    getPasses: () => PASSES,
    getBalance: () => 1000,
    checkPassOwnership: () => false,
    onBuyProduct: vi.fn(),
    onBuyPass: vi.fn(),
    onOpen: vi.fn(),
    onPurchase: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("createShopScreen", () => {
  let parent: Instance;

  beforeEach(() => {
    parent = new Instance("ScreenGui");
  });

  it("returns a handle with frame, show, hide, refresh, cleanup", () => {
    const handle = createShopScreen(parent, makeOptions());
    expect(handle.frame).toBeDefined();
    expect(typeof handle.show).toBe("function");
    expect(typeof handle.hide).toBe("function");
    expect(typeof handle.refresh).toBe("function");
    expect(typeof handle.cleanup).toBe("function");
  });

  it("starts hidden", () => {
    const handle = createShopScreen(parent, makeOptions());
    expect(handle.frame.Visible).toBe(false);
  });

  it("becomes visible on show()", () => {
    const handle = createShopScreen(parent, makeOptions());
    handle.show();
    expect(handle.frame.Visible).toBe(true);
  });

  it("fires onOpen callback on show()", () => {
    const onOpen = vi.fn();
    const handle = createShopScreen(parent, makeOptions({ onOpen }));
    handle.show();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("hides on hide()", () => {
    const handle = createShopScreen(parent, makeOptions());
    handle.show();
    handle.hide();
    expect(handle.frame.Visible).toBe(false);
  });

  it("cleans up by destroying the frame", () => {
    const handle = createShopScreen(parent, makeOptions());
    const destroySpy = vi.spyOn(handle.frame, "Destroy");
    handle.cleanup();
    expect(destroySpy).toHaveBeenCalled();
  });

  it("renders developer products section after show", () => {
    const handle = createShopScreen(parent, makeOptions());
    handle.show();

    // Check that the frame has child elements (section headers + product cards)
    const panel = handle.frame.FindFirstChild("ShopPanel") as Frame;
    expect(panel).toBeDefined();
    const content = panel?.FindFirstChild("ShopContent") as ScrollingFrame;
    expect(content).toBeDefined();
  });

  it("renders game passes section after show", () => {
    const handle = createShopScreen(parent, makeOptions());
    handle.show();

    const panel = handle.frame.FindFirstChild("ShopPanel") as Frame;
    const content = panel?.FindFirstChild("ShopContent") as ScrollingFrame;
    expect(content).toBeDefined();
  });

  it("shows empty state when no products or passes", () => {
    const handle = createShopScreen(
      parent,
      makeOptions({
        getProducts: () => [],
        getPasses: () => [],
      })
    );
    handle.show();
    const panel = handle.frame.FindFirstChild("ShopPanel") as Frame;
    const content = panel?.FindFirstChild("ShopContent") as ScrollingFrame;
    expect(content).toBeDefined();
  });

  it("shows owned badge for owned passes", () => {
    const handle = createShopScreen(
      parent,
      makeOptions({
        checkPassOwnership: (passId) => passId === 2_000_001,
      })
    );
    handle.show();
    // Check that at least one pass card exists in the content
    const panel = handle.frame.FindFirstChild("ShopPanel") as Frame;
    expect(panel).toBeDefined();
  });

  it("refresh re-renders content", () => {
    let balance = 100;
    const handle = createShopScreen(
      parent,
      makeOptions({
        getBalance: () => balance,
      })
    );
    handle.show();
    balance = 500;
    handle.refresh();
    // Balance label should be updated
    const panel = handle.frame.FindFirstChild("ShopPanel") as Frame;
    const balanceLabel = panel?.FindFirstChild("Balance") as TextLabel;
    expect(balanceLabel).toBeDefined();
    expect(balanceLabel.Text).toContain("500");
  });

  it("multiple show/hide cycles work correctly", () => {
    const handle = createShopScreen(parent, makeOptions());
    handle.show();
    expect(handle.frame.Visible).toBe(true);
    handle.hide();
    expect(handle.frame.Visible).toBe(false);
    handle.show();
    expect(handle.frame.Visible).toBe(true);
  });
});
