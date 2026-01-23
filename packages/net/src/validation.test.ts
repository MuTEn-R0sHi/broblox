/**
 * Unit tests for validation module.
 * Uses @rbx/testing for consistent types and mocks.
 */

import { describe, it, expect } from "vitest";

import { isOk, isErr, createDoActionPayload, createHandshakePayload } from "@rbx/testing";
import { validateDoActionPayload, validateHandshakePayload } from "./validation";

describe("DoAction payload validation", () => {
  it("accepts valid payload", () => {
    const payload = createDoActionPayload();
    const result = validateDoActionPayload(payload);
    expect(isOk(result)).toBe(true);
  });

  it("accepts payload with custom actionId", () => {
    const payload = createDoActionPayload({ actionId: "custom-action-123" });
    const result = validateDoActionPayload(payload);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.actionId).toBe("custom-action-123");
    }
  });

  it("rejects missing actionId", () => {
    const result = validateDoActionPayload({
      timestamp: Date.now(),
    });
    expect(isErr(result)).toBe(true);
  });

  it("rejects empty actionId (too short)", () => {
    const payload = createDoActionPayload({ actionId: "" });
    const result = validateDoActionPayload(payload);
    expect(isErr(result)).toBe(true);
  });

  it("rejects actionId > 50 chars", () => {
    const payload = createDoActionPayload({ actionId: "a".repeat(51) });
    const result = validateDoActionPayload(payload);
    expect(isErr(result)).toBe(true);
  });

  it("rejects non-number timestamp", () => {
    const result = validateDoActionPayload({
      actionId: "test",
      timestamp: "now",
    });
    expect(isErr(result)).toBe(true);
  });
});

describe("Handshake payload validation", () => {
  it("accepts valid payload", () => {
    const payload = createHandshakePayload();
    const result = validateHandshakePayload(payload);
    expect(isOk(result)).toBe(true);
  });

  it("accepts all device classes", () => {
    for (const deviceClass of ["kbm", "gamepad", "touch"] as const) {
      const payload = createHandshakePayload({ deviceClass });
      const result = validateHandshakePayload(payload);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.deviceClass).toBe(deviceClass);
      }
    }
  });

  it("rejects invalid device class", () => {
    const result = validateHandshakePayload({
      protocolVersion: 1,
      buildId: "test",
      deviceClass: "invalid",
    });
    expect(isErr(result)).toBe(true);
  });

  it("rejects missing protocolVersion", () => {
    const result = validateHandshakePayload({
      buildId: "test",
      deviceClass: "kbm",
    });
    expect(isErr(result)).toBe(true);
  });

  it("rejects missing buildId", () => {
    const result = validateHandshakePayload({
      protocolVersion: 1,
      deviceClass: "kbm",
    });
    expect(isErr(result)).toBe(true);
  });
});
