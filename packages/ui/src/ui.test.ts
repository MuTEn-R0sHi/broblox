import { describe, it, expect, beforeEach } from "vitest";
import {
  rgb,
  hex,
  lighten,
  darken,
  DarkTheme,
  LightTheme,
  getTheme,
  setTheme,
  useDarkTheme,
  useLightTheme,
} from "./theme";
import type { Theme } from "./theme";

// ============================================================================
// Color Helpers
// ============================================================================

describe("color helpers", () => {
  describe("rgb", () => {
    it("converts 0-255 values to 0-1 range", () => {
      const c = rgb(255, 128, 0);
      expect(c.r).toBeCloseTo(1);
      expect(c.g).toBeCloseTo(128 / 255);
      expect(c.b).toBeCloseTo(0);
    });

    it("handles all zeros", () => {
      const c = rgb(0, 0, 0);
      expect(c.r).toBe(0);
      expect(c.g).toBe(0);
      expect(c.b).toBe(0);
    });

    it("handles all 255s", () => {
      const c = rgb(255, 255, 255);
      expect(c.r).toBeCloseTo(1);
      expect(c.g).toBeCloseTo(1);
      expect(c.b).toBeCloseTo(1);
    });
  });

  describe("hex", () => {
    it("parses hex string with #", () => {
      const c = hex("#FF8000");
      expect(c.r).toBeCloseTo(1);
      expect(c.g).toBeCloseTo(128 / 255);
      expect(c.b).toBeCloseTo(0);
    });

    it("parses hex string without #", () => {
      const c = hex("FF8000");
      expect(c.r).toBeCloseTo(1);
      expect(c.g).toBeCloseTo(128 / 255);
      expect(c.b).toBeCloseTo(0);
    });

    it("parses black", () => {
      const c = hex("#000000");
      expect(c.r).toBe(0);
      expect(c.g).toBe(0);
      expect(c.b).toBe(0);
    });

    it("parses white", () => {
      const c = hex("#FFFFFF");
      expect(c.r).toBeCloseTo(1);
      expect(c.g).toBeCloseTo(1);
      expect(c.b).toBeCloseTo(1);
    });
  });

  describe("lighten", () => {
    it("increases color values", () => {
      const c = rgb(128, 128, 128);
      const result = lighten(c, 0.1);
      expect(result.r).toBeCloseTo(c.r + 0.1);
      expect(result.g).toBeCloseTo(c.g + 0.1);
      expect(result.b).toBeCloseTo(c.b + 0.1);
    });

    it("clamps at 1", () => {
      const c = { r: 0.95, g: 0.95, b: 0.95 };
      const result = lighten(c, 0.2);
      expect(result.r).toBe(1);
      expect(result.g).toBe(1);
      expect(result.b).toBe(1);
    });
  });

  describe("darken", () => {
    it("decreases color values", () => {
      const c = rgb(128, 128, 128);
      const result = darken(c, 0.1);
      expect(result.r).toBeCloseTo(c.r - 0.1);
      expect(result.g).toBeCloseTo(c.g - 0.1);
      expect(result.b).toBeCloseTo(c.b - 0.1);
    });

    it("clamps at 0", () => {
      const c = { r: 0.05, g: 0.05, b: 0.05 };
      const result = darken(c, 0.2);
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });
  });
});

// ============================================================================
// Themes
// ============================================================================

describe("themes", () => {
  describe("DarkTheme", () => {
    it("has name 'dark'", () => {
      expect(DarkTheme.name).toBe("dark");
    });

    it("has all required color keys", () => {
      const keys = [
        "primary",
        "secondary",
        "accent",
        "background",
        "surface",
        "text",
        "textMuted",
        "error",
        "success",
        "warning",
      ] as const;
      for (const k of keys) {
        expect(DarkTheme.colors[k]).toBeDefined();
        expect(typeof DarkTheme.colors[k].r).toBe("number");
      }
    });

    it("has typography definitions", () => {
      expect(DarkTheme.typography.heading.fontSize).toBeGreaterThan(0);
      expect(DarkTheme.typography.body.fontSize).toBeGreaterThan(0);
      expect(DarkTheme.typography.caption.fontSize).toBeGreaterThan(0);
    });

    it("has spacing values", () => {
      expect(DarkTheme.spacing.xs).toBeLessThan(DarkTheme.spacing.sm);
      expect(DarkTheme.spacing.sm).toBeLessThan(DarkTheme.spacing.md);
      expect(DarkTheme.spacing.md).toBeLessThan(DarkTheme.spacing.lg);
      expect(DarkTheme.spacing.lg).toBeLessThan(DarkTheme.spacing.xl);
    });
  });

  describe("LightTheme", () => {
    it("has name 'light'", () => {
      expect(LightTheme.name).toBe("light");
    });

    it("has all required color keys", () => {
      const keys = [
        "primary",
        "secondary",
        "accent",
        "background",
        "surface",
        "text",
        "textMuted",
      ] as const;
      for (const k of keys) {
        expect(LightTheme.colors[k]).toBeDefined();
      }
    });
  });
});

// ============================================================================
// Theme Management
// ============================================================================

describe("theme management", () => {
  beforeEach(() => {
    useDarkTheme(); // Reset to default before each test
  });

  it("getTheme returns DarkTheme by default", () => {
    expect(getTheme().name).toBe("dark");
  });

  it("setTheme changes current theme", () => {
    setTheme(LightTheme);
    expect(getTheme().name).toBe("light");
  });

  it("useDarkTheme sets dark theme", () => {
    setTheme(LightTheme);
    useDarkTheme();
    expect(getTheme().name).toBe("dark");
  });

  it("useLightTheme sets light theme", () => {
    useLightTheme();
    expect(getTheme().name).toBe("light");
  });

  it("setTheme accepts custom themes", () => {
    const custom: Theme = {
      ...DarkTheme,
      name: "custom",
    };
    setTheme(custom);
    expect(getTheme().name).toBe("custom");
  });
});
