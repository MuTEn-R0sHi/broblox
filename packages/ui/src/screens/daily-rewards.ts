/**
 * Daily Rewards Popup Screen
 *
 * Full-screen popup that shows the reward cycle, streak info, and a claim
 * button.  Auto-shows on player join when an unclaimed reward is available.
 *
 * Usage (server-side wiring):
 * ```ts
 * import { createDailyRewardsPopup } from "@broblox/ui/screens/daily-rewards";
 *
 * const popup = createDailyRewardsPopup(playerGui, {
 *   rewardCycle,
 *   currentDay: store.getCycleDay(),
 *   streak: store.getStreak(),
 *   canClaim: store.canClaim(),
 *   onClaim: () => store.claim(),
 * });
 * ```
 */

import { createLogger } from "@broblox/core";
import type { DailyRewardDay, RewardEntry } from "@broblox/rewards";
import {
  createFrame,
  createLabel,
  createButton,
  addCorner,
  addPadding,
  addStroke,
  addGridLayout,
  px,
  scale,
  centerAnchor,
  centerPosition,
} from "../create";
import { getTheme, toColor3 } from "../theme";
import type { Cleanup, ColorSpec } from "../types";

const logger = createLogger("DailyRewardsPopup");

/** TweenService obtained via the global `game` object. */
interface TweenService {
  Create(instance: Instance, tweenInfo: TweenInfo, properties: Record<string, unknown>): Tween;
}
const TweenService = game.GetService("TweenService") as TweenService;

// ============================================================================
// Types
// ============================================================================

export interface DailyRewardsPopupOptions {
  /** Full reward cycle (e.g. 7 days). */
  rewardCycle: DailyRewardDay[];
  /** 1-based current day in the cycle. */
  currentDay: number;
  /** Current streak length. */
  streak: number;
  /** Whether the player can claim right now. */
  canClaim: boolean;
  /** Time remaining (seconds) until next claim — 0 if claimable. */
  timeUntilNextClaim?: number;
  /** Called when the player clicks "Claim". Return the reward day so we can animate. */
  onClaim: () => DailyRewardDay | undefined;
  /** Called when popup is dismissed. */
  onDismiss?: () => void;
}

export interface DailyRewardsPopupHandle {
  /** Root GUI element. */
  frame: Frame;
  /** Show / hide. */
  show: () => void;
  hide: () => void;
  /** Tear down everything. */
  cleanup: Cleanup;
}

// ============================================================================
// Helpers
// ============================================================================

function rewardLabel(entry: RewardEntry): string {
  if (entry.label) return entry.label;
  switch (entry.type) {
    case "currency":
      return `${entry.amount} Coins`;
    case "xp":
      return `${entry.amount} XP`;
    case "item":
      return entry.itemId ?? "Item";
    case "boost":
      return `${entry.amount}x Boost`;
    case "cosmetic":
      return entry.itemId ?? "Cosmetic";
    default:
      return `${entry.amount}`;
  }
}

function formatTime(seconds: number): string {
  const h = math.floor(seconds / 3600);
  const m = math.floor((seconds % 3600) / 60);
  const s = math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ============================================================================
// Factory
// ============================================================================

export function createDailyRewardsPopup(
  parent: Instance,
  options: DailyRewardsPopupOptions
): DailyRewardsPopupHandle {
  const theme = getTheme();
  const cycleLen = options.rewardCycle.size();

  // ── backdrop ──────────────────────────────────────────────────────────────
  const backdrop = createFrame({
    name: "DailyRewardsPopup",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.55,
    parent,
  });

  // ── panel ─────────────────────────────────────────────────────────────────
  const panelWidth = math.min(480, cycleLen * 80);
  const panelHeight = 360;
  const panel = createFrame({
    name: "Panel",
    size: px(panelWidth, panelHeight),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(panel, 12);
  addPadding(panel, { top: 20, bottom: 20, left: 20, right: 20 });

  // ── title ─────────────────────────────────────────────────────────────────
  createLabel({
    text: "Daily Rewards",
    name: "Title",
    size: new UDim2(1, 0, 0, 32),
    textColor: theme.colors.text,
    textSize: 22,
    font: Enum.Font.GothamBold,
    textXAlignment: Enum.TextXAlignment.Center,
    parent: panel,
  });

  // ── streak bar ────────────────────────────────────────────────────────────
  const streakBar = createFrame({
    name: "StreakBar",
    size: new UDim2(1, 0, 0, 28),
    position: new UDim2(0, 0, 0, 38),
    backgroundTransparency: 1,
    parent: panel,
  });

  createLabel({
    text: `🔥 ${options.streak} day streak`,
    name: "StreakLabel",
    size: new UDim2(0.5, 0, 1, 0),
    textColor: theme.colors.warning ?? theme.colors.primary,
    textSize: 14,
    font: Enum.Font.GothamMedium,
    textXAlignment: Enum.TextXAlignment.Left,
    parent: streakBar,
  });

  const statusText = options.canClaim
    ? "Ready to claim!"
    : `Next in ${formatTime(options.timeUntilNextClaim ?? 0)}`;
  createLabel({
    text: statusText,
    name: "StatusLabel",
    size: new UDim2(0.5, 0, 1, 0),
    position: new UDim2(0.5, 0, 0, 0),
    textColor: options.canClaim
      ? (theme.colors.success ?? { r: 0.3, g: 0.9, b: 0.4 })
      : theme.colors.textMuted,
    textSize: 14,
    font: Enum.Font.GothamMedium,
    textXAlignment: Enum.TextXAlignment.Right,
    parent: streakBar,
  });

  // ── day grid ──────────────────────────────────────────────────────────────
  const gridContainer = createFrame({
    name: "DayGrid",
    size: new UDim2(1, 0, 0, 160),
    position: new UDim2(0, 0, 0, 76),
    backgroundTransparency: 1,
    parent: panel,
  });

  const cellSize = math.floor((panelWidth - 40) / cycleLen) - 8;
  addGridLayout(gridContainer, {
    cellSize: { xOffset: cellSize, yOffset: 140 },
    cellPadding: { xOffset: 6, yOffset: 0 },
    fillDirection: "Horizontal",
    horizontalAlignment: "Center",
  });

  const currentCycleDay = options.currentDay;

  for (const day of options.rewardCycle) {
    const isPast = day.day < currentCycleDay;
    const isCurrent = day.day === currentCycleDay;
    const _isFuture = day.day > currentCycleDay;

    let bgColor: ColorSpec;
    let borderColor: ColorSpec | undefined;
    if (isPast) {
      bgColor = { r: 0.15, g: 0.4, b: 0.15 }; // claimed green tint
    } else if (isCurrent && options.canClaim) {
      bgColor = theme.colors.primary;
      borderColor = theme.colors.warning ?? { r: 1, g: 0.85, b: 0.2 };
    } else if (isCurrent) {
      bgColor = theme.colors.surface;
      borderColor = theme.colors.primary;
    } else {
      bgColor = theme.colors.background;
    }

    const dayFrame = createFrame({
      name: `Day_${day.day}`,
      size: px(cellSize, 140),
      backgroundColor: bgColor,
      parent: gridContainer,
    });
    addCorner(dayFrame, 8);
    if (borderColor) {
      addStroke(dayFrame, { color: borderColor, thickness: 2 });
    }

    // Day number
    createLabel({
      text: day.isBonus ? `Day ${day.day} ⭐` : `Day ${day.day}`,
      name: "DayNum",
      size: new UDim2(1, 0, 0, 20),
      position: new UDim2(0, 0, 0, 6),
      textColor: isCurrent ? { r: 1, g: 1, b: 1 } : theme.colors.text,
      textSize: 11,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Center,
      parent: dayFrame,
    });

    // Reward entries
    const rewardTexts: string[] = [];
    for (const r of day.rewards) {
      rewardTexts.push(rewardLabel(r));
    }

    createLabel({
      text: rewardTexts.join("\n"),
      name: "Rewards",
      size: new UDim2(1, -8, 0, 70),
      position: new UDim2(0, 4, 0, 30),
      textColor: isCurrent ? { r: 1, g: 1, b: 1 } : theme.colors.textMuted,
      textSize: 10,
      textWrapped: true,
      textXAlignment: Enum.TextXAlignment.Center,
      textYAlignment: Enum.TextYAlignment.Top,
      parent: dayFrame,
    });

    // Checkmark for past days
    if (isPast) {
      createLabel({
        text: "✅",
        name: "Check",
        size: new UDim2(1, 0, 0, 24),
        position: new UDim2(0, 0, 1, -28),
        textSize: 18,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: dayFrame,
      });
    }
  }

  // ── claim / close buttons ─────────────────────────────────────────────────
  const buttonBar = createFrame({
    name: "ButtonBar",
    size: new UDim2(1, 0, 0, 44),
    position: new UDim2(0, 0, 1, -44),
    backgroundTransparency: 1,
    parent: panel,
  });

  let claimed = false;

  if (options.canClaim) {
    const claimBtn = createButton({
      text: "🎁 Claim Reward",
      name: "ClaimBtn",
      size: px(180, 40),
      position: centerPosition(),
      anchorPoint: centerAnchor(),
      backgroundColor: theme.colors.success ?? { r: 0.2, g: 0.75, b: 0.3 },
      textColor: { r: 1, g: 1, b: 1 },
      textSize: 16,
      font: Enum.Font.GothamBold,
      onClick: () => {
        if (claimed) return;
        claimed = true;

        const result = options.onClaim();
        if (result) {
          // Quick reward animation — flash the panel
          const flash = TweenService.Create(
            panel,
            new TweenInfo(0.15, Enum.EasingStyle.Quad, Enum.EasingDirection.Out, 1, true),
            { BackgroundColor3: toColor3(theme.colors.warning ?? { r: 1, g: 0.9, b: 0.3 }) }
          );
          flash.Play();

          // Update button text
          claimBtn.Text = "✅ Claimed!";
          claimBtn.AutoButtonColor = false;

          // Show reward toast
          const rewardText = result.rewards.map((r: RewardEntry) => rewardLabel(r)).join(", ");
          createLabel({
            text: `You received: ${rewardText}`,
            name: "RewardReveal",
            size: new UDim2(1, 0, 0, 24),
            position: new UDim2(0, 0, 1, -90),
            textColor: theme.colors.success ?? { r: 0.3, g: 0.9, b: 0.4 },
            textSize: 14,
            font: Enum.Font.GothamBold,
            textXAlignment: Enum.TextXAlignment.Center,
            parent: panel,
          });

          // Auto-close after a moment
          task.delay(2.5, () => {
            hide();
            options.onDismiss?.();
          });
        }
      },
      parent: buttonBar,
    });
    addCorner(claimBtn, 8);
  } else {
    // Close button only
    const closeBtn = createButton({
      text: "Close",
      name: "CloseBtn",
      size: px(120, 36),
      position: centerPosition(),
      anchorPoint: centerAnchor(),
      backgroundColor: theme.colors.surface,
      textColor: theme.colors.text,
      textSize: 14,
      onClick: () => {
        hide();
        options.onDismiss?.();
      },
      parent: buttonBar,
    });
    addCorner(closeBtn, 6);
    addStroke(closeBtn, { color: theme.colors.textMuted, thickness: 1 });
  }

  // ── X close button (top right) ────────────────────────────────────────────
  const xBtn = createButton({
    text: "✕",
    name: "CloseX",
    size: px(28, 28),
    position: new UDim2(1, -4, 0, 4),
    anchorPoint: new Vector2(1, 0),
    backgroundColor: theme.colors.surface,
    textColor: theme.colors.textMuted,
    textSize: 16,
    onClick: () => {
      hide();
      options.onDismiss?.();
    },
    parent: panel,
  });
  addCorner(xBtn, 14);

  // ── show/hide/cleanup ─────────────────────────────────────────────────────
  const show = () => {
    backdrop.Visible = true;
    // Slide-in animation
    panel.Position = new UDim2(0.5, 0, 0, -panelHeight);
    const slideIn = TweenService.Create(
      panel,
      new TweenInfo(0.35, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
      { Position: centerPosition() }
    );
    slideIn.Play();
  };

  const hide = () => {
    const slideOut = TweenService.Create(
      panel,
      new TweenInfo(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
      { Position: new UDim2(0.5, 0, 1, panelHeight) }
    );
    slideOut.Play();
    slideOut.Completed.Connect(() => {
      backdrop.Visible = false;
    });
  };

  const cleanup = () => {
    backdrop.Destroy();
  };

  // Start visible
  show();

  logger.info("Daily rewards popup created");

  return { frame: backdrop, show, hide, cleanup };
}
