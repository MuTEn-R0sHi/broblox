/**
 * @rbx/localization — Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Roblox global mocks
// ---------------------------------------------------------------------------

let mockTime = 1000;

function setupGlobals() {
  mockTime = 1000;
  const g = globalThis as unknown as Record<string, unknown>;
  g.print = vi.fn();
  g.os = { time: vi.fn(() => mockTime), clock: vi.fn(() => mockTime / 1000) };
  g.math = {
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    huge: Infinity,
  };
  g.typeIs = (value: unknown, typeName: string) => {
    if (typeName === "table") return typeof value === "object" && value !== null;
    return typeof value === typeName;
  };
  g.pcall = (fn: (...a: unknown[]) => unknown) => {
    try {
      const result = fn();
      return [true, result];
    } catch (e) {
      return [false, e];
    }
  };
}

// ---------------------------------------------------------------------------
// Import after globals
// ---------------------------------------------------------------------------

import { LocalizationService } from "./localization-service";
import type { LocaleCode } from "./types";

describe("LocalizationService", () => {
  let svc: LocalizationService;

  beforeEach(() => {
    setupGlobals();
    svc = new LocalizationService();
  });

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  it("registers and retrieves a string", () => {
    svc.registerStrings("en", { greeting: "Hello" });
    expect(svc.t("greeting")).toBe("Hello");
  });

  it("registers multiple locales", () => {
    svc.registerStrings("en", { greeting: "Hello" });
    svc.registerStrings("es", { greeting: "Hola" });
    expect(svc.localeCount()).toBe(2);
    expect(svc.hasLocale("en")).toBe(true);
    expect(svc.hasLocale("es")).toBe(true);
  });

  it("registerBulk adds multiple locales at once", () => {
    svc.registerBulk([
      { locale: "en", entries: { play: "Play" } },
      { locale: "fr", entries: { play: "Jouer" } },
    ]);
    expect(svc.localeCount()).toBe(2);
    expect(svc.tLocale("fr", "play")).toBe("Jouer");
  });

  it("clearLocale removes a single locale", () => {
    svc.registerStrings("en", { a: "A" });
    svc.registerStrings("es", { a: "A" });
    svc.clearLocale("en");
    expect(svc.hasLocale("en")).toBe(false);
    expect(svc.hasLocale("es")).toBe(true);
  });

  it("clearAll removes everything", () => {
    svc.registerStrings("en", { a: "A" });
    svc.registerStrings("es", { a: "A" });
    svc.clearAll();
    expect(svc.localeCount()).toBe(0);
  });

  it("getRegisteredLocales returns all locale codes", () => {
    svc.registerStrings("en", { a: "A" });
    svc.registerStrings("ja", { a: "A" });
    const locales = svc.getRegisteredLocales();
    expect(locales).toContain("en");
    expect(locales).toContain("ja");
  });

  // -----------------------------------------------------------------------
  // Namespaces
  // -----------------------------------------------------------------------

  it("supports namespaces", () => {
    svc.registerStrings("en", { title: "Shop" }, "ui");
    svc.registerStrings("en", { title: "Inventory" }, "inventory");
    expect(svc.t("title", undefined, "ui")).toBe("Shop");
    expect(svc.t("title", undefined, "inventory")).toBe("Inventory");
  });

  it("treats missing namespace key as missing", () => {
    svc.registerStrings("en", { title: "Shop" }, "ui");
    const result = svc.translate("en", "title", undefined, "other");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("missing_key");
  });

  // -----------------------------------------------------------------------
  // Interpolation
  // -----------------------------------------------------------------------

  it("interpolates simple params", () => {
    svc.registerStrings("en", { welcome: "Hello, {{name}}!" });
    expect(svc.t("welcome", { name: "Player" })).toBe("Hello, Player!");
  });

  it("interpolates multiple params", () => {
    svc.registerStrings("en", { info: "{{name}} has {{count}} items" });
    expect(svc.t("info", { name: "John", count: 5 })).toBe("John has 5 items");
  });

  it("handles missing interpolation params gracefully", () => {
    svc.registerStrings("en", { msg: "Hello, {{name}}!" });
    expect(svc.t("msg")).toBe("Hello, {{name}}!");
  });

  // -----------------------------------------------------------------------
  // Fallback
  // -----------------------------------------------------------------------

  it("falls back to default locale when key missing in current", () => {
    svc.registerStrings("en", { greeting: "Hello" });
    svc.registerStrings("es", { other: "Otro" });
    svc.setLocale("es");
    expect(svc.t("greeting")).toBe("Hello"); // falls back to en
  });

  it("translate result indicates fallback", () => {
    svc.registerStrings("en", { greeting: "Hello" });
    svc.setLocale("es");
    const result = svc.translate("es", "greeting");
    expect(result.ok).toBe(true);
    expect(result.fallback).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Missing keys
  // -----------------------------------------------------------------------

  it("returns bracket-wrapped key when missing (default)", () => {
    expect(svc.t("nonexistent")).toBe("[nonexistent]");
  });

  it("returns empty when missingKeyBehavior is 'empty'", () => {
    const svc2 = new LocalizationService({ missingKeyBehavior: "empty" });
    expect(svc2.t("nonexistent")).toBe("");
  });

  it("returns key name when missingKeyBehavior is 'key'", () => {
    const svc2 = new LocalizationService({ missingKeyBehavior: "key" });
    expect(svc2.t("nonexistent")).toBe("nonexistent");
  });

  it("fires missing key callback", () => {
    const cb = vi.fn();
    svc.onMissingKeyEvent(cb);
    svc.t("nonexistent");
    expect(cb).toHaveBeenCalledWith("en", "nonexistent", "default");
  });

  // -----------------------------------------------------------------------
  // Pluralization
  // -----------------------------------------------------------------------

  it("pluralizes with two forms (one|other)", () => {
    svc.registerStrings("en", { items: "{{count}} item|{{count}} items" });
    expect(svc.plural("items", 1)).toBe("1 item");
    expect(svc.plural("items", 5)).toBe("5 items");
  });

  it("pluralizes with three forms (zero|one|other)", () => {
    svc.registerStrings("en", { items: "No items|{{count}} item|{{count}} items" });
    expect(svc.plural("items", 0)).toBe("No items");
    expect(svc.plural("items", 1)).toBe("1 item");
    expect(svc.plural("items", 3)).toBe("3 items");
  });

  it("plural returns missing key format when key missing", () => {
    expect(svc.plural("nonexistent", 1)).toBe("[nonexistent]");
  });

  // -----------------------------------------------------------------------
  // Locale switching
  // -----------------------------------------------------------------------

  it("setLocale changes current locale", () => {
    svc.setLocale("es");
    expect(svc.getLocale()).toBe("es");
  });

  it("setLocale fires callback", () => {
    const cb = vi.fn();
    svc.onLocaleChanged(cb);
    svc.setLocale("fr");
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ previousLocale: "en", newLocale: "fr" })
    );
  });

  it("setLocale does not fire callback if same locale", () => {
    const cb = vi.fn();
    svc.onLocaleChanged(cb);
    svc.setLocale("en"); // already en
    expect(cb).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // tLocale
  // -----------------------------------------------------------------------

  it("tLocale translates in a specific locale without changing current", () => {
    svc.registerStrings("en", { hello: "Hello" });
    svc.registerStrings("de", { hello: "Hallo" });
    expect(svc.tLocale("de", "hello")).toBe("Hallo");
    expect(svc.getLocale()).toBe("en"); // unchanged
  });

  // -----------------------------------------------------------------------
  // translate result
  // -----------------------------------------------------------------------

  it("translate returns full result object", () => {
    svc.registerStrings("en", { msg: "Hi" });
    const result = svc.translate("en", "msg");
    expect(result.ok).toBe(true);
    expect(result.status).toBe("success");
    expect(result.text).toBe("Hi");
    expect(result.fallback).toBe(false);
  });

  it("translate returns not-ok for missing key", () => {
    const result = svc.translate("en", "nope");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("missing_key");
  });

  // -----------------------------------------------------------------------
  // Overwrite behavior
  // -----------------------------------------------------------------------

  it("overwrites existing keys on re-register", () => {
    svc.registerStrings("en", { title: "Old" });
    svc.registerStrings("en", { title: "New" });
    expect(svc.t("title")).toBe("New");
  });
});
