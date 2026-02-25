/**
 * Theme System
 *
 * Centralized theming for consistent UI styling.
 */

import { createLogger } from "@rbx/core";
import { ColorSpec, TextStyleSpec, CornerSpec, PaddingSpec } from "./types";

const _logger = createLogger("UITheme");

// ============================================================================
// Theme Definition
// ============================================================================

/** Complete theme definition */
export interface Theme {
  name: string;

  // Colors
  colors: {
    primary: ColorSpec;
    secondary: ColorSpec;
    accent: ColorSpec;
    background: ColorSpec;
    surface: ColorSpec;
    text: ColorSpec;
    textMuted: ColorSpec;
    error: ColorSpec;
    success: ColorSpec;
    warning: ColorSpec;
  };

  // Typography
  typography: {
    heading: TextStyleSpec;
    body: TextStyleSpec;
    caption: TextStyleSpec;
    button: TextStyleSpec;
  };

  // Spacing
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };

  // Borders
  borders: {
    radius: CornerSpec;
    radiusLarge: CornerSpec;
    radiusPill: CornerSpec;
  };

  // Component defaults
  button: {
    padding: PaddingSpec;
    height: number;
  };
  input: {
    padding: PaddingSpec;
    height: number;
  };
}

// ============================================================================
// Color Helpers
// ============================================================================

/**
 * Create a color from RGB values (0-255).
 */
export function rgb(r: number, g: number, b: number): ColorSpec {
  return { r: r / 255, g: g / 255, b: b / 255 };
}

/**
 * Create a color from hex string.
 */
export function hex(hexStr: string): ColorSpec {
  // Remove # if present
  const h = hexStr.sub(1, 1) === "#" ? hexStr.sub(2) : hexStr;

  const r = tonumber(h.sub(1, 2), 16) ?? 0;
  const g = tonumber(h.sub(3, 4), 16) ?? 0;
  const b = tonumber(h.sub(5, 6), 16) ?? 0;

  return { r: r / 255, g: g / 255, b: b / 255 };
}

/**
 * Convert ColorSpec to Color3.
 */
export function toColor3(color: ColorSpec): Color3 {
  return new Color3(color.r, color.g, color.b);
}

/**
 * Lighten a color.
 */
export function lighten(color: ColorSpec, amount: number): ColorSpec {
  return {
    r: math.min(1, color.r + amount),
    g: math.min(1, color.g + amount),
    b: math.min(1, color.b + amount),
  };
}

/**
 * Darken a color.
 */
export function darken(color: ColorSpec, amount: number): ColorSpec {
  return {
    r: math.max(0, color.r - amount),
    g: math.max(0, color.g - amount),
    b: math.max(0, color.b - amount),
  };
}

// ============================================================================
// Default Theme
// ============================================================================

/** Default dark theme */
export const DarkTheme: Theme = {
  name: "dark",

  colors: {
    primary: hex("#3B82F6"), // Blue
    secondary: hex("#6366F1"), // Indigo
    accent: hex("#8B5CF6"), // Purple
    background: hex("#0F0F0F"), // Near black
    surface: hex("#1A1A1A"), // Dark gray
    text: hex("#FFFFFF"), // White
    textMuted: hex("#9CA3AF"), // Gray
    error: hex("#EF4444"), // Red
    success: hex("#22C55E"), // Green
    warning: hex("#F59E0B"), // Amber
  },

  typography: {
    heading: {
      fontSize: 24,
      fontWeight: "Bold",
      textColor: hex("#FFFFFF"),
    },
    body: {
      fontSize: 16,
      fontWeight: "Regular",
      textColor: hex("#FFFFFF"),
    },
    caption: {
      fontSize: 12,
      fontWeight: "Regular",
      textColor: hex("#9CA3AF"),
    },
    button: {
      fontSize: 16,
      fontWeight: "SemiBold",
      textColor: hex("#FFFFFF"),
      textAlign: "Center",
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  borders: {
    radius: { radius: 8 },
    radiusLarge: { radius: 16 },
    radiusPill: { radius: 9999 },
  },

  button: {
    padding: { left: 16, right: 16, top: 8, bottom: 8 },
    height: 40,
  },
  input: {
    padding: { left: 12, right: 12, top: 8, bottom: 8 },
    height: 40,
  },
};

/** Light theme */
export const LightTheme: Theme = {
  name: "light",

  colors: {
    primary: hex("#2563EB"), // Blue
    secondary: hex("#4F46E5"), // Indigo
    accent: hex("#7C3AED"), // Purple
    background: hex("#FFFFFF"), // White
    surface: hex("#F3F4F6"), // Light gray
    text: hex("#111827"), // Near black
    textMuted: hex("#6B7280"), // Gray
    error: hex("#DC2626"), // Red
    success: hex("#16A34A"), // Green
    warning: hex("#D97706"), // Amber
  },

  typography: {
    heading: {
      fontSize: 24,
      fontWeight: "Bold",
      textColor: hex("#111827"),
    },
    body: {
      fontSize: 16,
      fontWeight: "Regular",
      textColor: hex("#111827"),
    },
    caption: {
      fontSize: 12,
      fontWeight: "Regular",
      textColor: hex("#6B7280"),
    },
    button: {
      fontSize: 16,
      fontWeight: "SemiBold",
      textColor: hex("#FFFFFF"),
      textAlign: "Center",
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  borders: {
    radius: { radius: 8 },
    radiusLarge: { radius: 16 },
    radiusPill: { radius: 9999 },
  },

  button: {
    padding: { left: 16, right: 16, top: 8, bottom: 8 },
    height: 40,
  },
  input: {
    padding: { left: 12, right: 12, top: 8, bottom: 8 },
    height: 40,
  },
};

// ============================================================================
// Theme Management
// ============================================================================

let currentTheme: Theme = DarkTheme;

/**
 * Get the current theme.
 */
export function getTheme(): Theme {
  return currentTheme;
}

/**
 * Set the current theme.
 */
export function setTheme(theme: Theme): void {
  currentTheme = theme;
}

/**
 * Use dark theme.
 */
export function useDarkTheme(): void {
  setTheme(DarkTheme);
}

/**
 * Use light theme.
 */
export function useLightTheme(): void {
  setTheme(LightTheme);
}
