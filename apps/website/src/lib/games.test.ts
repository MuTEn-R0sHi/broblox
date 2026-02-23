import { describe, it, expect } from "vitest";
import { games, getGame, accentColors } from "./games";

describe("games data", () => {
  it("exports a non-empty games array", () => {
    expect(games.length).toBeGreaterThan(0);
  });

  it("every game has all required fields with correct types", () => {
    for (const game of games) {
      expect(typeof game.slug).toBe("string");
      expect(game.slug.length).toBeGreaterThan(0);
      expect(typeof game.name).toBe("string");
      expect(typeof game.shortDescription).toBe("string");
      expect(typeof game.longDescription).toBe("string");
      expect(Array.isArray(game.tags)).toBe(true);
      expect(game.tags.length).toBeGreaterThan(0);
      expect(typeof game.genre).toBe("string");
      expect(["live", "coming-soon"]).toContain(game.status);
      expect(["cyan", "purple"]).toContain(game.accent);
      expect(Array.isArray(game.highlights)).toBe(true);
      expect(Array.isArray(game.features)).toBe(true);
      // robloxUrl must be a string or null — never undefined
      expect(game.robloxUrl === null || typeof game.robloxUrl === "string").toBe(true);
      // robloxUniverseId must be a string or null — never undefined
      expect(game.robloxUniverseId === null || typeof game.robloxUniverseId === "string").toBe(
        true
      );
    }
  });

  it("every feature entry has title and description", () => {
    for (const game of games) {
      for (const feature of game.features) {
        expect(typeof feature.title).toBe("string");
        expect(feature.title.length).toBeGreaterThan(0);
        expect(typeof feature.description).toBe("string");
        expect(feature.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("slugs are unique", () => {
    const slugs = games.map((g) => g.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("includes the obby game", () => {
    const game = games.find((g) => g.slug === "obby");
    expect(game).toBeDefined();
    expect(game?.accent).toBe("cyan");
    expect(game?.status).toBe("live");
  });

  it("includes the starter game", () => {
    const game = games.find((g) => g.slug === "starter");
    expect(game).toBeDefined();
    expect(game?.accent).toBe("purple");
  });
});

describe("getGame", () => {
  it("returns the correct game for a known slug", () => {
    const game = getGame("obby");
    expect(game).toBeDefined();
    expect(game?.slug).toBe("obby");
    expect(game?.name).toBe("BroBlox Obby");
  });

  it("returns the starter game by slug", () => {
    const game = getGame("starter");
    expect(game).toBeDefined();
    expect(game?.slug).toBe("starter");
  });

  it("returns undefined for an unknown slug", () => {
    expect(getGame("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(getGame("")).toBeUndefined();
  });

  it("is case-sensitive", () => {
    expect(getGame("Obby")).toBeUndefined();
    expect(getGame("OBBY")).toBeUndefined();
  });
});

describe("accentColors", () => {
  const requiredKeys = ["text", "bg", "bgStrong", "border", "borderHover", "glow"] as const;

  it("cyan has all required keys with string values", () => {
    for (const key of requiredKeys) {
      expect(typeof accentColors.cyan[key]).toBe("string");
      expect(accentColors.cyan[key].length).toBeGreaterThan(0);
    }
  });

  it("purple has all required keys with string values", () => {
    for (const key of requiredKeys) {
      expect(typeof accentColors.purple[key]).toBe("string");
      expect(accentColors.purple[key].length).toBeGreaterThan(0);
    }
  });

  it("cyan uses #00e5ff as its text color", () => {
    expect(accentColors.cyan.text).toBe("#00e5ff");
  });

  it("purple uses #c084fc as its text color", () => {
    expect(accentColors.purple.text).toBe("#c084fc");
  });
});
