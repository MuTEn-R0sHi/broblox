import { describe, expect, it } from "vitest";
import {
  updateUserRoleSchema,
  createNewsPostSchema,
  createBanSchema,
  revokeBanSchema,
  addEvidenceSchema,
  createMuteSchema,
  revokeMuteSchema,
  resolveAppealSchema,
  createGameSchema,
  createFlagSchema,
  updateRolloutSchema,
  parseFormData,
  parseInput,
} from "./schemas";

// ============================================================================
// updateUserRoleSchema
// ============================================================================

describe("updateUserRoleSchema", () => {
  it("accepts valid input", () => {
    const result = updateUserRoleSchema.safeParse({
      userId: "user-123",
      role: "MODERATOR",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe("user-123");
      expect(result.data.role).toBe("MODERATOR");
      expect(result.data.reason).toBe("");
      expect(result.data.confirmation).toBe("");
    }
  });

  it("rejects empty userId", () => {
    const result = updateUserRoleSchema.safeParse({ userId: "", role: "ADMIN" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = updateUserRoleSchema.safeParse({ userId: "u1", role: "SUPERADMIN" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid roles", () => {
    for (const role of ["VIEWER", "SUPPORT", "MODERATOR", "ENGINEER", "ADMIN"]) {
      const result = updateUserRoleSchema.safeParse({ userId: "u1", role });
      expect(result.success).toBe(true);
    }
  });

  it("trims userId whitespace", () => {
    const result = updateUserRoleSchema.safeParse({ userId: "  u1  ", role: "ADMIN" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe("u1");
    }
  });
});

// ============================================================================
// createNewsPostSchema
// ============================================================================

describe("createNewsPostSchema", () => {
  it("accepts valid input with defaults", () => {
    const result = createNewsPostSchema.safeParse({ title: "Hello", body: "World" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publish).toBe(false);
    }
  });

  it("rejects empty title", () => {
    const result = createNewsPostSchema.safeParse({ title: "", body: "World" });
    expect(result.success).toBe(false);
  });

  it("rejects empty body", () => {
    const result = createNewsPostSchema.safeParse({ title: "Hello", body: "" });
    expect(result.success).toBe(false);
  });

  it("accepts nullable optional fields", () => {
    const result = createNewsPostSchema.safeParse({
      title: "Hello",
      body: "World",
      excerpt: null,
      tags: null,
      gameId: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts publish true", () => {
    const result = createNewsPostSchema.safeParse({
      title: "Hello",
      body: "World",
      publish: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publish).toBe(true);
    }
  });
});

// ============================================================================
// createBanSchema
// ============================================================================

describe("createBanSchema", () => {
  const valid = {
    playerId: "12345",
    type: "TEMPORARY" as const,
    reason: "Exploiting detected",
    durationHours: 24,
  };

  it("accepts valid TEMPORARY ban", () => {
    const result = createBanSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts valid PERMANENT ban without duration", () => {
    const result = createBanSchema.safeParse({
      playerId: "12345",
      type: "PERMANENT",
      reason: "Repeated offences",
    });
    expect(result.success).toBe(true);
  });

  it("rejects reason shorter than 5 characters", () => {
    const result = createBanSchema.safeParse({ ...valid, reason: "Bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("5 characters");
    }
  });

  it("rejects empty playerId", () => {
    const result = createBanSchema.safeParse({ ...valid, playerId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid ban type", () => {
    const result = createBanSchema.safeParse({ ...valid, type: "INFINITE" });
    expect(result.success).toBe(false);
  });

  it("rejects negative durationHours", () => {
    const result = createBanSchema.safeParse({ ...valid, durationHours: -1 });
    expect(result.success).toBe(false);
  });

  it("trims reason whitespace", () => {
    const result = createBanSchema.safeParse({ ...valid, reason: "  Exploiting detected  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reason).toBe("Exploiting detected");
    }
  });
});

// ============================================================================
// revokeBanSchema
// ============================================================================

describe("revokeBanSchema", () => {
  it("accepts valid reason", () => {
    const result = revokeBanSchema.safeParse({ reason: "Not guilty" });
    expect(result.success).toBe(true);
  });

  it("rejects reason shorter than 3 characters", () => {
    const result = revokeBanSchema.safeParse({ reason: "No" });
    expect(result.success).toBe(false);
  });

  it("rejects empty reason", () => {
    const result = revokeBanSchema.safeParse({ reason: "" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// addEvidenceSchema
// ============================================================================

describe("addEvidenceSchema", () => {
  it("accepts valid text evidence", () => {
    const result = addEvidenceSchema.safeParse({
      type: "text",
      content: "Player was flying around the map.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects content under 3 characters", () => {
    const result = addEvidenceSchema.safeParse({ type: "text", content: "ab" });
    expect(result.success).toBe(false);
  });

  it("rejects content over 20,000 characters", () => {
    const result = addEvidenceSchema.safeParse({
      type: "screenshot",
      content: "x".repeat(20_001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid evidence type", () => {
    const result = addEvidenceSchema.safeParse({ type: "audio", content: "something" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid evidence types", () => {
    for (const type of ["text", "screenshot", "video", "log"]) {
      const result = addEvidenceSchema.safeParse({ type, content: "valid content here" });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// createMuteSchema
// ============================================================================

describe("createMuteSchema", () => {
  const valid = {
    playerId: "12345",
    type: "CHAT" as const,
    reason: "Spamming in chat",
    durationMinutes: 60,
  };

  it("accepts valid mute", () => {
    const result = createMuteSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects reason under 5 characters", () => {
    const result = createMuteSchema.safeParse({ ...valid, reason: "Spam" });
    expect(result.success).toBe(false);
  });

  it("rejects durationMinutes less than 1", () => {
    const result = createMuteSchema.safeParse({ ...valid, durationMinutes: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer durationMinutes", () => {
    const result = createMuteSchema.safeParse({ ...valid, durationMinutes: 1.5 });
    expect(result.success).toBe(false);
  });

  it("accepts all valid mute types", () => {
    for (const type of ["CHAT", "VOICE", "ALL"]) {
      const result = createMuteSchema.safeParse({ ...valid, type });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================================
// revokeMuteSchema
// ============================================================================

describe("revokeMuteSchema", () => {
  it("accepts valid reason", () => {
    const result = revokeMuteSchema.safeParse({ reason: "Mistake" });
    expect(result.success).toBe(true);
  });

  it("rejects reason under 3 characters", () => {
    const result = revokeMuteSchema.safeParse({ reason: "OK" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// resolveAppealSchema
// ============================================================================

describe("resolveAppealSchema", () => {
  it("accepts valid APPROVED resolution", () => {
    const result = resolveAppealSchema.safeParse({
      status: "APPROVED",
      resolution: "Player provided evidence of innocence",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid DENIED resolution", () => {
    const result = resolveAppealSchema.safeParse({
      status: "DENIED",
      resolution: "Evidence confirms violation",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = resolveAppealSchema.safeParse({
      status: "PENDING",
      resolution: "Some reason here",
    });
    expect(result.success).toBe(false);
  });

  it("rejects resolution under 5 characters", () => {
    const result = resolveAppealSchema.safeParse({ status: "DENIED", resolution: "Nope" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// createGameSchema
// ============================================================================

describe("createGameSchema", () => {
  it("accepts valid game", () => {
    const result = createGameSchema.safeParse({ name: "My Game", slug: "my-game" });
    expect(result.success).toBe(true);
  });

  it("rejects slug starting with number", () => {
    const result = createGameSchema.safeParse({ name: "Game", slug: "1game" });
    expect(result.success).toBe(false);
  });

  it("rejects slug with uppercase", () => {
    const result = createGameSchema.safeParse({ name: "Game", slug: "MyGame" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = createGameSchema.safeParse({ name: "", slug: "game" });
    expect(result.success).toBe(false);
  });

  it("accepts slug with hyphens and underscores", () => {
    const result = createGameSchema.safeParse({ name: "Game", slug: "my_cool-game2" });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// createFlagSchema
// ============================================================================

describe("createFlagSchema", () => {
  it("accepts valid flag", () => {
    const result = createFlagSchema.safeParse({ key: "enable_feature", name: "Enable Feature" });
    expect(result.success).toBe(true);
  });

  it("rejects key with hyphens", () => {
    const result = createFlagSchema.safeParse({ key: "enable-feature", name: "Feature" });
    expect(result.success).toBe(false);
  });

  it("rejects key starting with number", () => {
    const result = createFlagSchema.safeParse({ key: "1flag", name: "Feature" });
    expect(result.success).toBe(false);
  });

  it("rejects key with uppercase", () => {
    const result = createFlagSchema.safeParse({ key: "Enable_Feature", name: "Feature" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateRolloutSchema
// ============================================================================

describe("updateRolloutSchema", () => {
  it("accepts valid rollout percentage", () => {
    const result = updateRolloutSchema.safeParse({ rolloutPercentage: 50 });
    expect(result.success).toBe(true);
  });

  it("rejects percentage over 100", () => {
    const result = updateRolloutSchema.safeParse({ rolloutPercentage: 101 });
    expect(result.success).toBe(false);
  });

  it("rejects negative percentage", () => {
    const result = updateRolloutSchema.safeParse({ rolloutPercentage: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts empty object (all optional)", () => {
    const result = updateRolloutSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts date strings via coerce", () => {
    const result = updateRolloutSchema.safeParse({
      startsAt: "2025-01-01T00:00:00Z",
      endsAt: "2025-12-31T23:59:59Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null dates", () => {
    const result = updateRolloutSchema.safeParse({ startsAt: null, endsAt: null });
    expect(result.success).toBe(true);
  });

  it("accepts segments array", () => {
    const result = updateRolloutSchema.safeParse({ segments: ["beta", "canary"] });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// parseFormData helper
// ============================================================================

describe("parseFormData", () => {
  it("parses valid FormData", () => {
    const fd = new FormData();
    fd.set("userId", "user-1");
    fd.set("role", "ADMIN");

    const result = parseFormData(fd, updateUserRoleSchema);
    expect(result.success).toBe(true);
    expect(result.data?.userId).toBe("user-1");
    expect(result.data?.role).toBe("ADMIN");
  });

  it("converts 'true' and 'false' strings to booleans", () => {
    const fd = new FormData();
    fd.set("title", "Hello");
    fd.set("body", "World");
    fd.set("publish", "true");

    const result = parseFormData(fd, createNewsPostSchema);
    expect(result.success).toBe(true);
    expect(result.data?.publish).toBe(true);
  });

  it("returns error for invalid FormData", () => {
    const fd = new FormData();
    fd.set("userId", "");
    fd.set("role", "INVALID");

    const result = parseFormData(fd, updateUserRoleSchema);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

// ============================================================================
// parseInput helper
// ============================================================================

describe("parseInput", () => {
  it("parses valid input", () => {
    const result = parseInput({ reason: "Valid reason" }, revokeBanSchema);
    expect(result.success).toBe(true);
    expect(result.data?.reason).toBe("Valid reason");
  });

  it("returns error for invalid input", () => {
    const result = parseInput({ reason: "" }, revokeBanSchema);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns first issue message as error", () => {
    const result = parseInput({}, createBanSchema);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("string");
  });
});
