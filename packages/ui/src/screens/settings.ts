/**
 * Settings / Audio Controls Screen
 *
 * In-game settings modal with Audio, Controls, and Graphics tabs.
 * Volumes persist via `onVolumeChange` callback.
 *
 * Usage:
 * ```ts
 * import { createSettingsScreen } from "@rbx/ui/screens/settings";
 *
 * const settings = createSettingsScreen(playerGui, {
 *   getVolumes: () => audio.getChannelVolumes(),
 *   getMasterVolume: () => audio.getMasterVolume(),
 *   onVolumeChange: (ch, v) => audio.setVolume(ch, v),
 *   onMasterVolumeChange: (v) => audio.setMasterVolume(v),
 *   getBindings: () => input.getBindings(),
 * });
 * ```
 */

import { createLogger } from "@rbx/core";
import type { AudioChannel } from "@rbx/audio";
import type { InputBinding } from "@rbx/input";
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
import { getTheme, toColor3 } from "../theme";
import type { Cleanup } from "../types";

const logger = createLogger("SettingsScreen");

// ============================================================================
// Types
// ============================================================================

export type SettingsTab = "audio" | "controls" | "graphics";

export interface SettingsScreenOptions {
  /** Current per-channel volumes { sfx, music, ambient, ui, voice }. */
  getVolumes: () => Record<AudioChannel, number>;
  /** Current master volume 0–1. */
  getMasterVolume: () => number;
  /** Callback when a channel volume is changed. */
  onVolumeChange: (channel: AudioChannel, value: number) => void;
  /** Callback when master volume is changed. */
  onMasterVolumeChange: (value: number) => void;
  /** Current keybindings for display. */
  getBindings?: () => InputBinding[];
  /** Current quality level (1–10). */
  getQuality?: () => number;
  /** Callback when quality changes. */
  onQualityChange?: (level: number) => void;
  /** Close callback. */
  onClose?: () => void;
}

export interface SettingsScreenHandle {
  frame: Frame;
  show: () => void;
  hide: () => void;
  cleanup: Cleanup;
}

// ============================================================================
// Constants
// ============================================================================

const AUDIO_CHANNELS: { channel: AudioChannel; label: string; emoji: string }[] = [
  { channel: "music", label: "Music", emoji: "🎵" },
  { channel: "sfx", label: "Sound Effects", emoji: "🔊" },
  { channel: "ambient", label: "Ambient", emoji: "🌿" },
  { channel: "ui", label: "UI Sounds", emoji: "🔔" },
  { channel: "voice", label: "Voice", emoji: "🎙️" },
];

const VOLUME_STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

// ============================================================================
// Factory
// ============================================================================

export function createSettingsScreen(
  parent: Instance,
  options: SettingsScreenOptions
): SettingsScreenHandle {
  const theme = getTheme();

  // ── backdrop ──────────────────────────────────────────────────────────────
  const backdrop = createFrame({
    name: "SettingsScreen",
    size: scale(1, 1),
    backgroundColor: { r: 0, g: 0, b: 0 },
    backgroundTransparency: 0.5,
    parent,
  });
  backdrop.Visible = false;

  // ── panel ─────────────────────────────────────────────────────────────────
  const panel = createFrame({
    name: "SettingsPanel",
    size: new UDim2(0, 520, 0, 420),
    position: centerPosition(),
    anchorPoint: centerAnchor(),
    backgroundColor: theme.colors.surface,
    parent: backdrop,
  });
  addCorner(panel, 12);
  addPadding(panel, { top: 16, bottom: 16, left: 16, right: 16 });

  // ── header ────────────────────────────────────────────────────────────────
  createLabel({
    text: "⚙️ Settings",
    name: "Title",
    size: new UDim2(0.5, 0, 0, 28),
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

  // ── tab bar ───────────────────────────────────────────────────────────────
  const tabBar = createFrame({
    name: "TabBar",
    size: new UDim2(1, 0, 0, 28),
    position: new UDim2(0, 0, 0, 34),
    backgroundTransparency: 1,
    parent: panel,
  });
  addListLayout(tabBar, { direction: "Horizontal", padding: 6 });

  let activeTab: SettingsTab = "audio";

  const tabDefs: { id: SettingsTab; label: string }[] = [
    { id: "audio", label: "🔊 Audio" },
    { id: "controls", label: "🎮 Controls" },
    { id: "graphics", label: "🖥️ Graphics" },
  ];

  for (const td of tabDefs) {
    const btn = createButton({
      text: td.label,
      name: `Tab_${td.id}`,
      size: px(110, 24),
      backgroundColor: activeTab === td.id ? theme.colors.primary : theme.colors.background,
      textColor: activeTab === td.id ? { r: 1, g: 1, b: 1 } : theme.colors.text,
      textSize: 11,
      font: Enum.Font.GothamMedium,
      onClick: () => {
        activeTab = td.id;
        renderActiveTab();
      },
      parent: tabBar,
    });
    addCorner(btn, 4);
  }

  // ── content area ──────────────────────────────────────────────────────────
  const content = createScrollFrame({
    name: "Content",
    size: new UDim2(1, 0, 1, -74),
    position: new UDim2(0, 0, 0, 70),
    parent: panel,
  });
  addListLayout(content, { direction: "Vertical", padding: 8 });

  // ── clear content ─────────────────────────────────────────────────────────
  function clearContent() {
    for (const child of content.GetChildren()) {
      if (child.IsA("Frame") || child.IsA("TextLabel") || child.IsA("TextButton")) {
        child.Destroy();
      }
    }
  }

  // ── slider row helper ─────────────────────────────────────────────────────
  function createSliderRow(label: string, value: number, onChange: (v: number) => void) {
    const row = createFrame({
      name: `Slider_${label}`,
      size: new UDim2(1, 0, 0, 36),
      backgroundTransparency: 1,
      parent: content,
    });

    createLabel({
      text: label,
      name: "Label",
      size: new UDim2(0.35, 0, 1, 0),
      textColor: theme.colors.text,
      textSize: 12,
      font: Enum.Font.GothamMedium,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: row,
    });

    // Volume bar segments
    const barFrame = createFrame({
      name: "Bar",
      size: new UDim2(0.5, 0, 0, 20),
      position: new UDim2(0.35, 0, 0.5, 0),
      anchorPoint: new Vector2(0, 0.5),
      backgroundTransparency: 1,
      parent: row,
    });
    addListLayout(barFrame, { direction: "Horizontal", padding: 2 });

    for (const step of VOLUME_STEPS) {
      const filled = value >= step;
      const seg = createButton({
        text: "",
        name: `Seg_${step}`,
        size: px(18, 18),
        backgroundColor: filled ? theme.colors.primary : theme.colors.background,
        textSize: 1,
        onClick: () => {
          onChange(step);
          renderActiveTab();
        },
        parent: barFrame,
      });
      addCorner(seg, 3);
    }

    // Percentage
    createLabel({
      text: `${math.floor(value * 100)}%`,
      name: "Pct",
      size: new UDim2(0.15, 0, 1, 0),
      position: new UDim2(0.85, 0, 0, 0),
      textColor: theme.colors.textMuted,
      textSize: 11,
      textXAlignment: Enum.TextXAlignment.Right,
      parent: row,
    });
  }

  // ── Audio tab ─────────────────────────────────────────────────────────────
  function renderAudioTab() {
    const master = options.getMasterVolume();
    const volumes = options.getVolumes();

    createSliderRow("🔈 Master Volume", master, (v) => {
      options.onMasterVolumeChange(v);
    });

    // Separator
    const _sep = createFrame({
      name: "Sep",
      size: new UDim2(1, 0, 0, 1),
      backgroundColor: theme.colors.textMuted,
      backgroundTransparency: 0.7,
      parent: content,
    });

    for (const ac of AUDIO_CHANNELS) {
      const vol = volumes[ac.channel] ?? 1.0;
      createSliderRow(`${ac.emoji} ${ac.label}`, vol, (v) => {
        options.onVolumeChange(ac.channel, v);
      });
    }
  }

  // ── Controls tab ──────────────────────────────────────────────────────────
  function renderControlsTab() {
    const bindings = options.getBindings?.() ?? [];

    if (bindings.size() === 0) {
      createLabel({
        text: "No keybinding data available",
        name: "NoBindings",
        size: new UDim2(1, 0, 0, 30),
        textColor: theme.colors.textMuted,
        textSize: 12,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: content,
      });
      return;
    }

    // Header
    const header = createFrame({
      name: "BindHeader",
      size: new UDim2(1, 0, 0, 22),
      backgroundTransparency: 1,
      parent: content,
    });

    createLabel({
      text: "Action",
      name: "H1",
      size: new UDim2(0.4, 0, 1, 0),
      textColor: theme.colors.textMuted,
      textSize: 10,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: header,
    });
    createLabel({
      text: "Primary",
      name: "H2",
      size: new UDim2(0.3, 0, 1, 0),
      position: new UDim2(0.4, 0, 0, 0),
      textColor: theme.colors.textMuted,
      textSize: 10,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Center,
      parent: header,
    });
    createLabel({
      text: "Secondary",
      name: "H3",
      size: new UDim2(0.3, 0, 1, 0),
      position: new UDim2(0.7, 0, 0, 0),
      textColor: theme.colors.textMuted,
      textSize: 10,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Center,
      parent: header,
    });

    for (const binding of bindings) {
      const row = createFrame({
        name: `Bind_${binding.action}`,
        size: new UDim2(1, 0, 0, 24),
        backgroundTransparency: 1,
        parent: content,
      });

      createLabel({
        text: binding.action,
        name: "Action",
        size: new UDim2(0.4, 0, 1, 0),
        textColor: theme.colors.text,
        textSize: 11,
        textXAlignment: Enum.TextXAlignment.Left,
        parent: row,
      });

      const inputLabel = (src: {
        type: string;
        key?: string;
        button?: string;
        gesture?: string;
      }) => {
        if (src.type === "key") return src.key ?? "?";
        if (src.type === "mouse") return src.button ?? "?";
        if (src.type === "gamepad") return src.button ?? "?";
        if (src.type === "touch") return src.gesture ?? "?";
        return "?";
      };

      createLabel({
        text: inputLabel(binding.primary as never),
        name: "Primary",
        size: new UDim2(0.3, 0, 1, 0),
        position: new UDim2(0.4, 0, 0, 0),
        textColor: theme.colors.text,
        textSize: 11,
        textXAlignment: Enum.TextXAlignment.Center,
        parent: row,
      });

      if (binding.secondary) {
        createLabel({
          text: inputLabel(binding.secondary as never),
          name: "Secondary",
          size: new UDim2(0.3, 0, 1, 0),
          position: new UDim2(0.7, 0, 0, 0),
          textColor: theme.colors.textMuted,
          textSize: 11,
          textXAlignment: Enum.TextXAlignment.Center,
          parent: row,
        });
      }
    }
  }

  // ── Graphics tab ──────────────────────────────────────────────────────────
  function renderGraphicsTab() {
    const quality = options.getQuality?.() ?? 5;

    createLabel({
      text: "Render Quality",
      name: "QualityLabel",
      size: new UDim2(1, 0, 0, 20),
      textColor: theme.colors.text,
      textSize: 13,
      font: Enum.Font.GothamBold,
      textXAlignment: Enum.TextXAlignment.Left,
      parent: content,
    });

    const qualityBar = createFrame({
      name: "QualityBar",
      size: new UDim2(1, 0, 0, 30),
      backgroundTransparency: 1,
      parent: content,
    });
    addListLayout(qualityBar, { direction: "Horizontal", padding: 4 });

    for (let level = 1; level <= 10; level++) {
      const active = level === quality;
      const btn = createButton({
        text: `${level}`,
        name: `Q_${level}`,
        size: px(32, 26),
        backgroundColor: active ? theme.colors.primary : theme.colors.background,
        textColor: active ? { r: 1, g: 1, b: 1 } : theme.colors.text,
        textSize: 11,
        font: Enum.Font.GothamBold,
        onClick: () => {
          options.onQualityChange?.(level);
          renderActiveTab();
        },
        parent: qualityBar,
      });
      addCorner(btn, 4);
    }

    createLabel({
      text: "Higher values mean better visuals but lower FPS.\nRoblox may override this based on device capabilities.",
      name: "QualityHint",
      size: new UDim2(1, 0, 0, 30),
      textColor: theme.colors.textMuted,
      textSize: 10,
      textWrapped: true,
      textXAlignment: Enum.TextXAlignment.Left,
      textYAlignment: Enum.TextYAlignment.Top,
      parent: content,
    });
  }

  // ── render active tab ─────────────────────────────────────────────────────
  function renderActiveTab() {
    clearContent();
    switch (activeTab) {
      case "audio":
        renderAudioTab();
        break;
      case "controls":
        renderControlsTab();
        break;
      case "graphics":
        renderGraphicsTab();
        break;
    }

    // Update tab highlights
    for (const child of tabBar.GetChildren()) {
      if (child.IsA("TextButton") && child.Name.sub(1, 4) === "Tab_") {
        const id = child.Name.sub(5) as SettingsTab;
        child.BackgroundColor3 = toColor3(
          activeTab === id ? theme.colors.primary : theme.colors.background
        );
        child.TextColor3 = toColor3(activeTab === id ? { r: 1, g: 1, b: 1 } : theme.colors.text);
      }
    }
  }

  // ── show / hide ───────────────────────────────────────────────────────────
  const show = () => {
    backdrop.Visible = true;
    renderActiveTab();
  };

  const hide = () => {
    backdrop.Visible = false;
  };

  const cleanup = () => {
    backdrop.Destroy();
  };

  logger.info("Settings screen created");

  return { frame: backdrop, show, hide, cleanup };
}
