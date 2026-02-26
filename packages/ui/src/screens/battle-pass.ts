/**
 * Battle Pass Tier Viewer Screen
 *
 * Full-screen modal with horizontal scrollable tier track, XP progress,
 * free/premium rows, and claim buttons.
 *
 * Usage:
 * ```ts
 * import { createBattlePassScreen } from "@broblox/ui/screens/battle-pass";
 *
 * const bp = createBattlePassScreen(playerGui, {
 *   getSeason: () => registry.getActive(),
 *   getPlayerData: () => store.getData(),
 *   onClaim: (rewardId) => store.claim(rewardId),
 *   onUpgradePremium: () => store.purchasePremium(),
 * });
 * ```
 */

import { createLogger } from "@broblox/core";
import type {
  SeasonDefinition,
  BattlePassPlayerData,
  BattlePassTier,
  RewardTrack,
} from "@broblox/battle-pass";
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

const logger = createLogger("BattlePassScreen");

// ============================================================================
// Types
// ============================================================================

export interface BattlePassScreenOptions {
  /** Get active season definition. */
  getSeason: () => SeasonDefinition | undefined;
  /** Get player's battle pass data. */
  getPlayerData: () => BattlePassPlayerData | undefined;
  /** Claim a tier reward. */
  onClaim?: (rewardId: string) => void;
  /** Upgrade to premium track. */
  onUpgradePremium?: () => void;
  /** Close callback. */
  onClose?: () => void;
}

export interface BattlePassScreenHandle {
  frame: Frame;
  show: () => void;
  hide: () => void;
  refresh: () => void;
  cleanup: Cleanup;
}

// ============================================================================
// Helpers
// ============================================================================

const TRACK_COLORS: Record<RewardTrack, ColorSpec> = {
  free: { r: 0.3, g: 0.7, b: 1.0 },
  premium: { r: 1.0, g: 0.65, b: 0.0 },
};

function formatTime(seconds: number): string {
  const days = math.floor(seconds / 86400);
  const hours = math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function rewardEmoji(rewardType: string): string {
  switch (rewardType) {
    case "currency":
      return "💰";
    case "xp":
      return "⭐";
    case "item":
      return "📦";
    case "boost":
      return "🚀";
    case "cosmetic":
      return "👗";
    default:
      return "🎁";
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createBattlePassScreen(
  parent: Instance,
  options: BattlePassScreenOptions
): BattlePassScreenHandle {
  const theme = getTheme();

  // ── backdrop ──────────────────────────────────────────────────────────────
  const backdrop = createFrame({
    name: "BattlePassScreen",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.5,
    parent,
  });
  backdrop.Visible = false;

  // ── panel ─────────────────────────────────────────────────────────────────
  const panel = createFrame({
    name: "BPPanel",
    size: new UDim2(0, 700, 0, 440),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(panel, 12);
  addPadding(panel, { top: 16, bottom: 16, left: 16, right: 16 });

  // ── header ────────────────────────────────────────────────────────────────
  const _titleLabel = createLabel({
    text: "🏆 Battle Pass",
    name: "Title",
    size: new UDim2(0.4, 0, 0, 28),
    textColor: theme.colors.text,
    textSize: 20,
    font: Enum.Font.GothamBold,
    textXAlignment: Enum.TextXAlignment.Left,
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

  // Season info
  const seasonLabel = createLabel({
    text: "",
    name: "SeasonInfo",
    size: new UDim2(0.4, 0, 0, 16),
    position: new UDim2(0.4, 0, 0, 6),
    textColor: theme.colors.textMuted,
    textSize: 10,
    textXAlignment: Enum.TextXAlignment.Center,
    parent: panel,
  });

  // XP bar area
  const xpBarBg = createFrame({
    name: "XpBarBg",
    size: new UDim2(1, 0, 0, 20),
    position: new UDim2(0, 0, 0, 32),
    backgroundColor: theme.colors.background,
    parent: panel,
  });
  addCorner(xpBarBg, 4);

  const xpBarFill = createFrame({
    name: "XpBarFill",
    size: new UDim2(0, 0, 1, 0),
    backgroundColor: theme.colors.primary,
    parent: xpBarBg,
  });
  addCorner(xpBarFill, 4);

  const xpLabel = createLabel({
    text: "",
    name: "XpLabel",
    size: scale(1, 1),
    textColor: { r: 1, g: 1, b: 1 },
    textSize: 10,
    font: Enum.Font.GothamBold,
    textXAlignment: Enum.TextXAlignment.Center,
    textYAlignment: Enum.TextYAlignment.Center,
    parent: xpBarBg,
  });

  // Premium upgrade button
  const premiumBtn = createButton({
    text: "⭐ Upgrade to Premium",
    name: "PremiumBtn",
    size: new UDim2(0, 160, 0, 26),
    position: new UDim2(1, 0, 0, 56),
    anchorPoint: new Vector2(1, 0),
    backgroundColor: TRACK_COLORS.premium,
    textColor: { r: 1, g: 1, b: 1 },
    textSize: 11,
    font: Enum.Font.GothamBold,
    onClick: () => {
      options.onUpgradePremium?.();
      refresh();
    },
    parent: panel,
  });
  addCorner(premiumBtn, 6);

  // Tier / Track legend
  createLabel({
    text: "Tier →",
    name: "TierLegend",
    size: new UDim2(0, 60, 0, 16),
    position: new UDim2(0, 0, 0, 58),
    textColor: theme.colors.textMuted,
    textSize: 10,
    textXAlignment: Enum.TextXAlignment.Left,
    parent: panel,
  });

  // ── tier track scroll ─────────────────────────────────────────────────────
  const trackScroll = createScrollFrame({
    name: "TierTrack",
    size: new UDim2(1, 0, 1, -90),
    position: new UDim2(0, 0, 0, 82),
    parent: panel,
  });
  addListLayout(trackScroll, { direction: "Horizontal", padding: 4 });

  // ── render ────────────────────────────────────────────────────────────────
  function clearTrack() {
    for (const child of trackScroll.GetChildren()) {
      if (child.IsA("Frame") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }
  }

  function refresh() {
    clearTrack();

    const season = options.getSeason();
    const data = options.getPlayerData();

    if (!season || !data) {
      seasonLabel.Text = "No active season";
      xpLabel.Text = "";
      xpBarFill.Size = new UDim2(0, 0, 1, 0);
      premiumBtn.Visible = false;
      return;
    }

    // Season info
    const now = os.time();
    const remaining = math.max(0, season.endTime - now);
    seasonLabel.Text = `${season.name} · ${formatTime(remaining)} remaining`;
    premiumBtn.Visible = !data.premiumUnlocked;

    // XP bar
    const currentTierDef = season.tiers[data.tier - 1] as BattlePassTier | undefined;
    if (currentTierDef && data.tier < season.tiers.size()) {
      // XP into current tier
      let xpBefore = 0;
      for (let i = 0; i < data.tier - 1; i++) {
        xpBefore += season.tiers[i].xpRequired;
      }
      const xpIntoCurrent = data.xp - xpBefore;
      const nextReq = currentTierDef.xpRequired;
      const ratio = nextReq > 0 ? math.clamp(xpIntoCurrent / nextReq, 0, 1) : 1;
      xpBarFill.Size = new UDim2(ratio, 0, 1, 0);
      xpLabel.Text = `Tier ${data.tier} · ${xpIntoCurrent} / ${nextReq} XP`;
    } else {
      xpBarFill.Size = new UDim2(1, 0, 1, 0);
      xpLabel.Text = `Tier ${data.tier} · MAX`;
    }

    // Render each tier column
    for (const tierDef of season.tiers) {
      const tierNum = tierDef.tier;
      const reached = data.tier >= tierNum;
      const isCurrent = data.tier === tierNum;

      const col = createFrame({
        name: `Tier_${tierNum}`,
        size: new UDim2(0, 90, 1, 0),
        backgroundColor: isCurrent ? theme.colors.primary : theme.colors.background,
        backgroundTransparency: reached ? 0 : 0.5,
        parent: trackScroll,
      });
      addCorner(col, 6);
      if (isCurrent) {
        addStroke(col, { color: theme.colors.accent, thickness: 2 });
      }

      // Tier number header
      createLabel({
        text: `T${tierNum}`,
        name: "TierNum",
        size: new UDim2(1, 0, 0, 18),
        textColor: isCurrent ? { r: 1, g: 1, b: 1 } : theme.colors.text,
        textSize: 12,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: col,
      });

      // Free track rewards
      const freeRewards = tierDef.rewards.filter((r) => r.track === "free");
      const premRewards = tierDef.rewards.filter((r) => r.track === "premium");

      let y = 22;

      // Free track section
      createLabel({
        text: "Free",
        name: "FreeLabel",
        size: new UDim2(1, 0, 0, 12),
        position: new UDim2(0, 0, 0, y),
        textColor: TRACK_COLORS.free,
        textSize: 8,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: col,
      });
      y += 14;

      for (const reward of freeRewards) {
        const claimed = data.claimedRewards.includes(reward.id);
        const canClaim = reached && !claimed;

        const rewardFrame = createFrame({
          name: `R_${reward.id}`,
          size: new UDim2(1, -8, 0, 36),
          position: new UDim2(0, 4, 0, y),
          backgroundColor: claimed ? theme.colors.surface : theme.colors.background,
          parent: col,
        });
        addCorner(rewardFrame, 4);

        createLabel({
          text: `${rewardEmoji(reward.reward.type)} ${reward.name}`,
          name: "Rname",
          size: new UDim2(1, -4, 0, 14),
          position: new UDim2(0, 2, 0, 2),
          textColor: claimed ? theme.colors.textMuted : theme.colors.text,
          textSize: 8,
          textXAlignment: Enum.TextXAlignment.Left,
          parent: rewardFrame,
        });

        if (canClaim) {
          const claimBtn = createButton({
            text: "Claim",
            name: "ClaimBtn",
            size: new UDim2(1, -4, 0, 14),
            position: new UDim2(0, 2, 0, 18),
            backgroundColor: theme.colors.success,
            textColor: { r: 1, g: 1, b: 1 },
            textSize: 8,
            font: Enum.Font.GothamBold,
            onClick: () => {
              options.onClaim?.(reward.id);
              refresh();
            },
            parent: rewardFrame,
          });
          addCorner(claimBtn, 3);
        } else if (claimed) {
          createLabel({
            text: "✅",
            name: "Claimed",
            size: new UDim2(1, -4, 0, 14),
            position: new UDim2(0, 2, 0, 18),
            textSize: 10,
            textXAlignment: Enum.TextXAlignment.Center,
            parent: rewardFrame,
          });
        }

        y += 40;
      }

      // Premium track section
      y += 4;
      createLabel({
        text: "Premium",
        name: "PremLabel",
        size: new UDim2(1, 0, 0, 12),
        position: new UDim2(0, 0, 0, y),
        textColor: TRACK_COLORS.premium,
        textSize: 8,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: col,
      });
      y += 14;

      for (const reward of premRewards) {
        const claimed = data.claimedRewards.includes(reward.id);
        const canClaim = reached && !claimed && data.premiumUnlocked;
        const locked = !data.premiumUnlocked;

        const rewardFrame = createFrame({
          name: `R_${reward.id}`,
          size: new UDim2(1, -8, 0, 36),
          position: new UDim2(0, 4, 0, y),
          backgroundColor: claimed ? theme.colors.surface : theme.colors.background,
          backgroundTransparency: locked ? 0.5 : 0,
          parent: col,
        });
        addCorner(rewardFrame, 4);

        createLabel({
          text: `${rewardEmoji(reward.reward.type)} ${reward.name}`,
          name: "Rname",
          size: new UDim2(1, -4, 0, 14),
          position: new UDim2(0, 2, 0, 2),
          textColor: locked
            ? theme.colors.textMuted
            : claimed
              ? theme.colors.textMuted
              : theme.colors.text,
          textSize: 8,
          textXAlignment: Enum.TextXAlignment.Left,
          parent: rewardFrame,
        });

        if (locked) {
          createLabel({
            text: "🔒",
            name: "Lock",
            size: new UDim2(1, -4, 0, 14),
            position: new UDim2(0, 2, 0, 18),
            textSize: 10,
            textXAlignment: Enum.TextXAlignment.Center,
            parent: rewardFrame,
          });
        } else if (canClaim) {
          const claimBtn = createButton({
            text: "Claim",
            name: "ClaimBtn",
            size: new UDim2(1, -4, 0, 14),
            position: new UDim2(0, 2, 0, 18),
            backgroundColor: TRACK_COLORS.premium,
            textColor: { r: 1, g: 1, b: 1 },
            textSize: 8,
            font: Enum.Font.GothamBold,
            onClick: () => {
              options.onClaim?.(reward.id);
              refresh();
            },
            parent: rewardFrame,
          });
          addCorner(claimBtn, 3);
        } else if (claimed) {
          createLabel({
            text: "✅",
            name: "Claimed",
            size: new UDim2(1, -4, 0, 14),
            position: new UDim2(0, 2, 0, 18),
            textSize: 10,
            textXAlignment: Enum.TextXAlignment.Center,
            parent: rewardFrame,
          });
        }

        y += 40;
      }
    }
  }

  // ── show / hide ───────────────────────────────────────────────────────────
  const show = () => {
    backdrop.Visible = true;
    refresh();
  };

  const hide = () => {
    backdrop.Visible = false;
  };

  const cleanup = () => {
    backdrop.Destroy();
  };

  logger.info("Battle Pass screen created");

  return { frame: backdrop, show, hide, refresh, cleanup };
}
