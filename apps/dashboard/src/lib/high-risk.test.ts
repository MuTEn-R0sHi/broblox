import { describe, it, expect } from "vitest";
import { normalizeHighRiskReason, assertHighRiskConfirmation } from "./high-risk";

describe("normalizeHighRiskReason", () => {
  it("returns trimmed reason when >= 5 characters", () => {
    expect(normalizeHighRiskReason("  hello  ")).toBe("hello");
  });

  it("throws when reason is shorter than 5 characters", () => {
    expect(() => normalizeHighRiskReason("abc")).toThrow("Reason must be at least 5 characters");
  });

  it("throws for whitespace-only input", () => {
    expect(() => normalizeHighRiskReason("    ")).toThrow("Reason must be at least 5 characters");
  });

  it("throws for non-string input", () => {
    expect(() => normalizeHighRiskReason(42)).toThrow("Reason must be at least 5 characters");
    expect(() => normalizeHighRiskReason(undefined)).toThrow(
      "Reason must be at least 5 characters"
    );
    expect(() => normalizeHighRiskReason(null)).toThrow("Reason must be at least 5 characters");
  });

  it("accepts exactly 5 characters after trim", () => {
    expect(normalizeHighRiskReason("abcde")).toBe("abcde");
  });
});

describe("assertHighRiskConfirmation", () => {
  it("does not throw when confirmation matches expected", () => {
    expect(() => assertHighRiskConfirmation("delete all", "delete all")).not.toThrow();
  });

  it("throws when confirmation does not match", () => {
    expect(() => assertHighRiskConfirmation("wrong", "delete all")).toThrow(
      "Confirmation text did not match"
    );
  });

  it("normalizes whitespace before comparing", () => {
    expect(() => assertHighRiskConfirmation("  delete   all  ", "delete all")).not.toThrow();
  });

  it("throws when provided is empty", () => {
    expect(() => assertHighRiskConfirmation("", "delete all")).toThrow(
      "Confirmation text did not match"
    );
  });

  it("throws for non-string provided value", () => {
    expect(() => assertHighRiskConfirmation(undefined, "delete all")).toThrow(
      "Confirmation text did not match"
    );
  });

  it("uses custom error message when provided", () => {
    expect(() => assertHighRiskConfirmation("wrong", "expected", "Custom error")).toThrow(
      "Custom error"
    );
  });

  it("matches expected with extra whitespace in expected", () => {
    expect(() => assertHighRiskConfirmation("delete all", "  delete   all  ")).not.toThrow();
  });
});
