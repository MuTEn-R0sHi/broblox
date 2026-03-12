import { describe, it, expect } from "vitest";

describe("@broblox/game-shared", () => {
  it("exports shared payload types", async () => {
    const mod = await import("./index");
    // Type-only module — verify the module is importable
    expect(mod).toBeDefined();
  });
});
