/**
 * Quest Tracker HUD
 *
 * Persistent corner overlay showing active quests with progress bars.
 * Includes a full quest-log toggle (keybind / button).
 *
 * Usage:
 * ```ts
 * import { createQuestTracker } from "@rbx/ui/screens/quest-tracker";
 *
 * const tracker = createQuestTracker(playerGui, {
 *   getActiveQuests: () => store.getActiveQuests(),
 *   getQuestDef: (id) => registry.get(id),
 *   onToggleLog: () => { ... },
 * });
 * ```
 */

import { createLogger } from "@rbx/core";
import type { QuestDefinition, QuestProgress, ObjectiveProgress, QuestSchedule } from "@rbx/quests";
import {
  createFrame,
  createLabel,
  createButton,
  createScrollFrame,
  addCorner,
  addPadding,
  addListLayout,
  px,
  scale,
  centerAnchor,
  centerPosition,
} from "../create";
import { createProgressBar } from "../components";
import { getTheme } from "../theme";
import type { Cleanup, ColorSpec } from "../types";

const logger = createLogger("QuestTracker");

declare const game: {
  GetService(name: "TweenService"): {
    Create(instance: Instance, tweenInfo: TweenInfo, properties: Record<string, unknown>): Tween;
  };
};

// ============================================================================
// Types
// ============================================================================

export interface QuestTrackerOptions {
  /** Fetch current active quests. */
  getActiveQuests: () => QuestProgress[];
  /** Resolve a quest definition by ID. */
  getQuestDef: (questId: string) => QuestDefinition | undefined;
  /** Max quests shown in the HUD overlay (default 3). */
  maxHudQuests?: number;
}

export interface QuestTrackerHandle {
  frame: Frame;
  /** Refresh the display with latest quest data. */
  refresh: () => void;
  /** Toggle the full quest log. */
  toggleLog: () => void;
  /** Show / hide the HUD overlay. */
  setVisible: (visible: boolean) => void;
  cleanup: Cleanup;
}

// ============================================================================
// Helpers
// ============================================================================

function scheduleColor(schedule: QuestSchedule, theme: ReturnType<typeof getTheme>): ColorSpec {
  switch (schedule) {
    case "daily":
      return theme.colors.success;
    case "weekly":
      return theme.colors.accent;
    case "seasonal":
      return theme.colors.warning;
    default:
      return theme.colors.textMuted;
  }
}

function scheduleLabel(schedule: QuestSchedule): string {
  switch (schedule) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "seasonal":
      return "Seasonal";
    default:
      return "Story";
  }
}

function objectiveText(obj: ObjectiveProgress): string {
  return `${obj.current}/${obj.target}`;
}

// ============================================================================
// HUD Overlay (corner)
// ============================================================================

export function createQuestTracker(
  parent: Instance,
  options: QuestTrackerOptions
): QuestTrackerHandle {
  const theme = getTheme();
  const maxHud = options.maxHudQuests ?? 3;

  // ── container (top-right corner) ──────────────────────────────────────────
  const container = createFrame({
    name: "QuestTracker",
    size: new UDim2(0, 260, 0, 400),
    position: new UDim2(1, -10, 0, 80),
    anchorPoint: new Vector2(1, 0),
    backgroundTransparency: 1,
    parent,
  });

  // ── header ────────────────────────────────────────────────────────────────
  const header = createFrame({
    name: "Header",
    size: new UDim2(1, 0, 0, 28),
    backgroundColor: theme.colors.surface,
    backgroundTransparency: 0.2,
    parent: container,
  });
  addCorner(header, 6);

  createLabel({
    text: "📋 Quests",
    name: "Title",
    size: new UDim2(0.7, 0, 1, 0),
    position: new UDim2(0, 8, 0, 0),
    textColor: theme.colors.text,
    textSize: 13,
    font: Enum.Font.GothamBold,
    parent: header,
  });

  const toggleBtn = createButton({
    text: "▼",
    name: "ToggleBtn",
    size: px(28, 22),
    position: new UDim2(1, -4, 0.5, 0),
    anchorPoint: new Vector2(1, 0.5),
    backgroundColor: theme.colors.surface,
    textColor: theme.colors.textMuted,
    textSize: 10,
    parent: header,
  });
  addCorner(toggleBtn, 4);

  // ── quest list container ──────────────────────────────────────────────────
  const questList = createFrame({
    name: "QuestList",
    size: new UDim2(1, 0, 1, -34),
    position: new UDim2(0, 0, 0, 34),
    backgroundTransparency: 1,
    parent: container,
  });
  addListLayout(questList, { direction: "Vertical", padding: 6 });

  let collapsed = false;

  // ── render quests into the HUD ────────────────────────────────────────────
  function clearQuestList() {
    const children = questList.GetChildren();
    for (const child of children) {
      if (child.IsA("Frame")) {
        child.Destroy();
      }
    }
  }

  function renderHudQuests() {
    clearQuestList();

    const quests = options.getActiveQuests();
    const shown = quests.size() > maxHud ? maxHud : quests.size();

    for (let i = 0; i < shown; i++) {
      const qp = quests[i];
      const def = options.getQuestDef(qp.questId);
      if (!def) continue;

      const card = createFrame({
        name: `Quest_${qp.questId}`,
        size: new UDim2(1, 0, 0, 0), // auto-size below
        backgroundColor: theme.colors.surface,
        backgroundTransparency: 0.15,
        parent: questList,
      });
      addCorner(card, 6);
      addPadding(card, { top: 8, bottom: 8, left: 10, right: 10 });

      // Schedule badge + quest name
      const badgeText = scheduleLabel(def.schedule);
      const _badgeColor = scheduleColor(def.schedule, theme);

      createLabel({
        text: `[${badgeText}] ${def.name}`,
        name: "QuestName",
        size: new UDim2(1, 0, 0, 16),
        textColor: theme.colors.text,
        textSize: 12,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: card,
      });

      // Objectives with progress
      let yOffset = 20;
      for (const obj of qp.objectives) {
        const objDef = def.objectives.find((o) => o.id === obj.objectiveId);
        const desc = objDef?.description ?? obj.objectiveId;

        createLabel({
          text: `${desc}  ${objectiveText(obj)}`,
          name: `Obj_${obj.objectiveId}`,
          size: new UDim2(1, 0, 0, 14),
          position: new UDim2(0, 0, 0, yOffset),
          textColor: obj.completed ? theme.colors.success : theme.colors.textMuted,
          textSize: 10,
          textXAlignment: Enum.TextXAlignment.Left,
          parent: card,
        });
        yOffset += 16;

        // Mini progress bar
        const barContainer = createFrame({
          name: `Bar_${obj.objectiveId}`,
          size: new UDim2(1, 0, 0, 4),
          position: new UDim2(0, 0, 0, yOffset),
          backgroundTransparency: 1,
          parent: card,
        });
        createProgressBar(barContainer, {
          value: obj.target > 0 ? obj.current / obj.target : 0,
          color: obj.completed ? theme.colors.success : theme.colors.primary,
          height: 4,
        });
        yOffset += 8;
      }

      // Set actual card height
      card.Size = new UDim2(1, 0, 0, yOffset + 8);
    }

    // "X more" indicator
    if (quests.size() > maxHud) {
      createLabel({
        text: `+${quests.size() - maxHud} more quests`,
        name: "MoreLabel",
        size: new UDim2(1, 0, 0, 18),
        textColor: theme.colors.textMuted,
        textSize: 10,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: questList,
      });
    }
  }

  // ── full quest log (modal overlay) ────────────────────────────────────────
  let logOpen = false;
  let logBackdrop: Frame | undefined;

  function openQuestLog() {
    if (logBackdrop) return;
    logOpen = true;

    logBackdrop = createFrame({
      name: "QuestLogBackdrop",
      size: scale(1, 1),
      backgroundColor: { r: 0, g: 0, b: 0 },
      backgroundTransparency: 0.5,
      parent,
    });

    const logPanel = createFrame({
      name: "QuestLogPanel",
      size: new UDim2(0, 520, 0, 440),
      position: centerPosition(),
      anchorPoint: centerAnchor(),
      backgroundColor: theme.colors.surface,
      parent: logBackdrop,
    });
    addCorner(logPanel, 12);
    addPadding(logPanel, { top: 16, bottom: 16, left: 16, right: 16 });

    // Title
    createLabel({
      text: "📖 Quest Log",
      name: "Title",
      size: new UDim2(0.8, 0, 0, 30),
      textColor: theme.colors.text,
      textSize: 20,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: logPanel,
    });

    // Close button
    const closeBtn = createButton({
      text: "✕",
      name: "CloseLog",
      size: px(28, 28),
      position: new UDim2(1, 0, 0, 0),
      anchorPoint: new Vector2(1, 0),
      backgroundColor: theme.colors.surface,
      textColor: theme.colors.textMuted,
      textSize: 16,
      onClick: () => closeQuestLog(),
      parent: logPanel,
    });
    addCorner(closeBtn, 14);

    // Scrollable quest list
    const scroll = createScrollFrame({
      name: "QuestScroll",
      size: new UDim2(1, 0, 1, -44),
      position: new UDim2(0, 0, 0, 40),
      parent: logPanel,
    });
    addListLayout(scroll, { direction: "Vertical", padding: 8 });

    const allQuests = options.getActiveQuests();

    // Group by schedule
    const groups = new Map<string, QuestProgress[]>();
    for (const qp of allQuests) {
      const def = options.getQuestDef(qp.questId);
      const key = def ? scheduleLabel(def.schedule) : "Other";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(qp);
    }

    for (const [groupName, groupQuests] of groups) {
      // Group header
      createLabel({
        text: `── ${groupName} ──`,
        name: `GroupHeader_${groupName}`,
        size: new UDim2(1, 0, 0, 22),
        textColor: theme.colors.textMuted,
        textSize: 11,
        font: Enum.Font.GothamBold,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: scroll,
      });

      for (const qp of groupQuests) {
        const def = options.getQuestDef(qp.questId);
        if (!def) continue;

        const card = createFrame({
          name: `LogQuest_${qp.questId}`,
          size: new UDim2(1, 0, 0, 0),
          backgroundColor: theme.colors.background,
          parent: scroll,
        });
        addCorner(card, 8);
        addPadding(card, { top: 10, bottom: 10, left: 12, right: 12 });

        // Quest name + tier
        createLabel({
          text: `${def.name}`,
          name: "Name",
          size: new UDim2(0.8, 0, 0, 18),
          textColor: theme.colors.text,
          textSize: 14,
          font: Enum.Font.GothamBold,
          textXAlignment: Enum.TextXAlignment.Left,
          parent: card,
        });

        createLabel({
          text: (def.tier as string).upper(),
          name: "Tier",
          size: new UDim2(0.2, 0, 0, 16),
          position: new UDim2(0.8, 0, 0, 1),
          textColor: theme.colors.accent,
          textSize: 10,
          font: Enum.Font.GothamBold,
          textXAlignment: Enum.TextXAlignment.Right,
          parent: card,
        });

        // Description
        createLabel({
          text: def.description,
          name: "Desc",
          size: new UDim2(1, 0, 0, 16),
          position: new UDim2(0, 0, 0, 22),
          textColor: theme.colors.textMuted,
          textSize: 11,
          textWrapped: true,
          textXAlignment: Enum.TextXAlignment.Left,
          parent: card,
        });

        // Objectives
        let y = 44;
        for (const obj of qp.objectives) {
          const objDef = def.objectives.find((o) => o.id === obj.objectiveId);
          const desc = objDef?.description ?? obj.objectiveId;

          createLabel({
            text: `${obj.completed ? "✅" : "○"} ${desc}  (${objectiveText(obj)})`,
            name: `LogObj_${obj.objectiveId}`,
            size: new UDim2(1, 0, 0, 16),
            position: new UDim2(0, 0, 0, y),
            textColor: obj.completed ? theme.colors.success : theme.colors.text,
            textSize: 11,
            textXAlignment: Enum.TextXAlignment.Left,
            parent: card,
          });
          y += 18;

          const barHolder = createFrame({
            name: `LogBar_${obj.objectiveId}`,
            size: new UDim2(1, 0, 0, 6),
            position: new UDim2(0, 0, 0, y),
            backgroundTransparency: 1,
            parent: card,
          });
          createProgressBar(barHolder, {
            value: obj.target > 0 ? obj.current / obj.target : 0,
            color: obj.completed ? theme.colors.success : theme.colors.primary,
            height: 6,
          });
          y += 10;
        }

        // Rewards preview
        if (def.rewards.size() > 0) {
          const rewardTexts: string[] = [];
          for (const r of def.rewards) {
            rewardTexts.push(r.label ?? `${r.amount} ${r.type}`);
          }
          createLabel({
            text: `🎁 ${rewardTexts.join(", ")}`,
            name: "Rewards",
            size: new UDim2(1, 0, 0, 14),
            position: new UDim2(0, 0, 0, y + 4),
            textColor: theme.colors.warning,
            textSize: 10,
            textXAlignment: Enum.TextXAlignment.Left,
            parent: card,
          });
          y += 22;
        }

        card.Size = new UDim2(1, 0, 0, y + 10);
      }
    }

    // Slide in
    const TweenService = game.GetService("TweenService");
    logPanel.BackgroundTransparency = 1;
    const fadeIn = TweenService.Create(
      logPanel,
      new TweenInfo(0.25, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
      { BackgroundTransparency: 0 }
    );
    fadeIn.Play();
  }

  function closeQuestLog() {
    if (logBackdrop) {
      logBackdrop.Destroy();
      logBackdrop = undefined;
    }
    logOpen = false;
  }

  // ── toggle collapse ──────────────────────────────────────────────────────
  toggleBtn.MouseButton1Click.Connect(() => {
    collapsed = !collapsed;
    questList.Visible = !collapsed;
    toggleBtn.Text = collapsed ? "▶" : "▼";
  });

  // ── initial render ────────────────────────────────────────────────────────
  renderHudQuests();

  logger.info("Quest tracker HUD created");

  return {
    frame: container,
    refresh: renderHudQuests,
    toggleLog: () => {
      if (logOpen) {
        closeQuestLog();
      } else {
        openQuestLog();
      }
    },
    setVisible: (visible: boolean) => {
      container.Visible = visible;
    },
    cleanup: () => {
      closeQuestLog();
      container.Destroy();
    },
  };
}
