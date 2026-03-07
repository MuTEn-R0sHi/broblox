/**
 * Shop Screen
 *
 * In-game shop showing Developer Products (consumable purchases) and
 * Game Passes (one-time permanent upgrades) in a two-section layout.
 *
 * Usage:
 * ```ts
 * import { createShopScreen } from "@broblox/ui/screens/shop";
 *
 * const shop = createShopScreen(playerGui, {
 *   getProducts: () => DEVELOPER_PRODUCTS,
 *   getPasses: () => GAME_PASSES,
 *   getBalance: () => wallet.coins,
 *   checkPassOwnership: (passId) => ownership.get(passId) ?? false,
 *   onBuyProduct: (productId) => remotes.buyProduct(productId),
 *   onBuyPass: (passId) => remotes.buyPass(passId),
 * });
 * ```
 */

import { createLogger } from "@broblox/core";
import {
  createFrame,
  createLabel,
  createButton,
  createScrollFrame,
  addCorner,
  addPadding,
  addListLayout,
  addStroke,
  px,
  scale,
  centerAnchor,
  centerPosition,
} from "../create";
import { getTheme } from "../theme";
import type { Cleanup, ColorSpec } from "../types";

const logger = createLogger("ShopScreen");

// ============================================================================
// Types
// ============================================================================

/** A purchasable developer product (can be bought multiple times). */
export interface ShopProduct {
  readonly productId: number;
  readonly name: string;
  readonly description?: string;
  readonly robuxPrice?: number;
}

/** A one-time game pass purchase. */
export interface ShopGamePass {
  readonly passId: number;
  readonly name: string;
  readonly description?: string;
  readonly robuxPrice?: number;
}

export interface ShopScreenOptions {
  /** Get available developer products. */
  getProducts: () => readonly ShopProduct[];
  /** Get available game passes. */
  getPasses: () => readonly ShopGamePass[];
  /** Get player coin balance (informational). */
  getBalance: () => number;
  /** Check if the player already owns a game pass. */
  checkPassOwnership: (passId: number) => boolean;
  /** Called when a developer product purchase is requested. */
  onBuyProduct: (productId: number) => void;
  /** Called when a game pass purchase is requested. */
  onBuyPass: (passId: number) => void;
  /** Called when the screen is opened (for tutorial hooks). */
  onOpen?: () => void;
  /** Called when a purchase succeeds (for tutorial hooks). */
  onPurchase?: () => void;
  /** Close callback. */
  onClose?: () => void;
}

export interface ShopScreenHandle {
  frame: Frame;
  show: () => void;
  hide: () => void;
  refresh: () => void;
  cleanup: Cleanup;
}

// ============================================================================
// Helpers
// ============================================================================

const PRODUCT_EMOJI: Record<string, string> = {
  coins: "💰",
  xp: "⚡",
  boost: "🚀",
};

const PASS_EMOJI = "🎫";

function productEmoji(name: string): string {
  const lower = name.lower();
  if (lower.find("coin")[0] !== undefined) return PRODUCT_EMOJI.coins;
  if (lower.find("xp")[0] !== undefined || lower.find("boost")[0] !== undefined)
    return PRODUCT_EMOJI.boost;
  return "🛒";
}

// ============================================================================
// Factory
// ============================================================================

export function createShopScreen(parent: Instance, options: ShopScreenOptions): ShopScreenHandle {
  const theme = getTheme();

  // ── backdrop ──────────────────────────────────────────────────────────────
  const backdrop = createFrame({
    name: "ShopScreen",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.5,
    parent,
  });
  backdrop.Visible = false;

  // ── panel ─────────────────────────────────────────────────────────────────
  const panel = createFrame({
    name: "ShopPanel",
    size: new UDim2(0, 620, 0, 480),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(panel, 12);
  addPadding(panel, { top: 16, bottom: 16, left: 16, right: 16 });

  // ── header row ────────────────────────────────────────────────────────────
  createLabel({
    text: "🛒 Shop",
    name: "Title",
    size: new UDim2(0.5, 0, 0, 28),
    textColor: theme.colors.text,
    textSize: 20,
    font: Enum.Font.GothamBold,
    textXAlignment: Enum.TextXAlignment.Left,
    parent: panel,
  });

  const balanceLabel = createLabel({
    text: "💰 0",
    name: "Balance",
    size: new UDim2(0.3, 0, 0, 28),
    position: new UDim2(0.5, 0, 0, 0),
    textColor: theme.colors.warning,
    textSize: 14,
    font: Enum.Font.GothamBold,
    textXAlignment: Enum.TextXAlignment.Right,
    parent: panel,
  });

  const closeBtn = createButton({
    text: "✕",
    name: "CloseBtn",
    size: px(28, 28),
    position: new UDim2(1, 0, 0, 0),
    anchorPoint: new Vector2(1, 0),
    backgroundColor: theme.colors.surface,
    textColor: theme.colors.textMuted,
    textSize: 16,
    onClick: () => {
      hide();
      options.onClose?.();
    },
    parent: panel,
  });
  addCorner(closeBtn, 14);

  // ── content area ──────────────────────────────────────────────────────────
  const content = createScrollFrame({
    name: "ShopContent",
    size: new UDim2(1, 0, 1, -40),
    position: new UDim2(0, 0, 0, 38),
    parent: panel,
  });
  addListLayout(content, { direction: "Vertical", padding: 10 });

  // ── state ─────────────────────────────────────────────────────────────────
  let purchaseInFlight = false;

  function clearChildren(instance: Instance) {
    for (const child of instance.GetChildren()) {
      if (child.IsA("Frame") || child.IsA("TextLabel") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }
  }

  function createSectionHeader(parent: Instance, text: string, order: number): void {
    const header = createLabel({
      text,
      name: `Section_${text}`,
      size: new UDim2(1, 0, 0, 24),
      textColor: theme.colors.text,
      textSize: 16,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent,
    });
    header.LayoutOrder = order;
  }

  function createProductCard(parent: Instance, product: ShopProduct, order: number): void {
    const card = createFrame({
      name: `Product_${product.productId}`,
      size: new UDim2(1, 0, 0, 60),
      backgroundColor: theme.colors.background,
      parent,
    });
    card.LayoutOrder = order;
    addCorner(card, 8);
    addPadding(card, { top: 8, bottom: 8, left: 12, right: 12 });

    const emoji = productEmoji(product.name);
    createLabel({
      text: `${emoji} ${product.name}`,
      name: "Name",
      size: new UDim2(0.55, 0, 0, 18),
      textColor: theme.colors.text,
      textSize: 14,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: card,
    });

    if (product.description) {
      createLabel({
        text: product.description,
        name: "Desc",
        size: new UDim2(0.55, 0, 0, 14),
        position: new UDim2(0, 0, 0, 22),
        textColor: theme.colors.textMuted,
        textSize: 11,
        textWrapped: true,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: card,
      });
    }

    const priceText = product.robuxPrice !== undefined ? `R$ ${product.robuxPrice}` : "Buy";
    const buyBtn = createButton({
      text: priceText,
      name: "BuyBtn",
      size: new UDim2(0.3, 0, 0, 32),
      position: new UDim2(0.68, 0, 0.5, -16),
      backgroundColor: theme.colors.primary,
      textColor: { r: 1, g: 1, b: 1 },
      textSize: 13,
      font: Enum.Font.GothamBold,
      onClick: () => {
        if (purchaseInFlight) return;
        purchaseInFlight = true;
        logger.info(`Buying product ${product.productId} (${product.name})`);
        options.onBuyProduct(product.productId);
        options.onPurchase?.();
        // Re-enable after brief delay to debounce
        task.delay(1, () => {
          purchaseInFlight = false;
        });
      },
      parent: card,
    });
    addCorner(buyBtn, 6);
  }

  function createPassCard(
    parent: Instance,
    pass: ShopGamePass,
    owned: boolean,
    order: number
  ): void {
    const card = createFrame({
      name: `Pass_${pass.passId}`,
      size: new UDim2(1, 0, 0, 60),
      backgroundColor: theme.colors.background,
      parent,
    });
    card.LayoutOrder = order;
    addCorner(card, 8);
    addPadding(card, { top: 8, bottom: 8, left: 12, right: 12 });

    if (owned) {
      addStroke(card, { color: theme.colors.success, thickness: 2 });
    }

    createLabel({
      text: `${PASS_EMOJI} ${pass.name}`,
      name: "Name",
      size: new UDim2(0.55, 0, 0, 18),
      textColor: theme.colors.text,
      textSize: 14,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: card,
    });

    if (pass.description) {
      createLabel({
        text: pass.description,
        name: "Desc",
        size: new UDim2(0.55, 0, 0, 14),
        position: new UDim2(0, 0, 0, 22),
        textColor: theme.colors.textMuted,
        textSize: 11,
        textWrapped: true,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: card,
      });
    }

    if (owned) {
      createLabel({
        text: "✅ Owned",
        name: "OwnedBadge",
        size: new UDim2(0.3, 0, 0, 32),
        position: new UDim2(0.68, 0, 0.5, -16),
        textColor: theme.colors.success,
        textSize: 13,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: card,
      });
    } else {
      const priceText = pass.robuxPrice !== undefined ? `R$ ${pass.robuxPrice}` : "Buy";
      const buyBtn = createButton({
        text: priceText,
        name: "BuyBtn",
        size: new UDim2(0.3, 0, 0, 32),
        position: new UDim2(0.68, 0, 0.5, -16),
        backgroundColor: theme.colors.accent,
        textColor: { r: 1, g: 1, b: 1 },
        textSize: 13,
        font: Enum.Font.GothamBold,
        onClick: () => {
          if (purchaseInFlight) return;
          purchaseInFlight = true;
          logger.info(`Buying game pass ${pass.passId} (${pass.name})`);
          options.onBuyPass(pass.passId);
          options.onPurchase?.();
          task.delay(1, () => {
            purchaseInFlight = false;
          });
        },
        parent: card,
      });
      addCorner(buyBtn, 6);
    }
  }

  // ── refresh ───────────────────────────────────────────────────────────────
  function refresh(): void {
    clearChildren(content);
    let order = 0;

    // Balance
    const balance = options.getBalance();
    balanceLabel.Text = `💰 ${balance}`;

    // Developer Products section
    const products = options.getProducts();
    if (products.size() > 0) {
      createSectionHeader(content, "💎 Developer Products", order++);
      for (const product of products) {
        createProductCard(content, product, order++);
      }
    }

    // Game Passes section
    const passes = options.getPasses();
    if (passes.size() > 0) {
      createSectionHeader(content, "🎫 Game Passes", order++);
      for (const pass of passes) {
        const owned = options.checkPassOwnership(pass.passId);
        createPassCard(content, pass, owned, order++);
      }
    }

    // Empty state
    if (products.size() === 0 && passes.size() === 0) {
      createLabel({
        text: "No items available",
        name: "Empty",
        size: new UDim2(1, 0, 0, 40),
        textColor: theme.colors.textMuted,
        textSize: 14,
        textXAlignment: Enum.TextXAlignment.Center,
        textYAlignment: Enum.TextYAlignment.Center,
        parent: content,
      });
    }
  }

  // ── show / hide ───────────────────────────────────────────────────────────
  const show = () => {
    backdrop.Visible = true;
    refresh();
    options.onOpen?.();
  };

  const hide = () => {
    backdrop.Visible = false;
  };

  const cleanup = () => {
    backdrop.Destroy();
  };

  logger.info("Shop screen created");

  return { frame: backdrop, show, hide, refresh, cleanup };
}
