/**
 * Protocol compatibility tests.
 * Verifies that request/response structures serialize correctly
 * and can be used across the network boundary.
 */

import { describe, it, expect } from "vitest";
import { ErrorCode, ok, err, isOk, isErr } from "@rbx/shared-types";
import {
  createDoActionPayload,
  createHandshakePayload,
  createActionResult,
  createErrorResult,
} from "@rbx/testing";
import { validateDoActionPayload, validateHandshakePayload } from "./validation";

describe("Protocol Serialization", () => {
  describe("DoAction payload", () => {
    it("maintains structure after JSON round-trip", () => {
      const original = createDoActionPayload({
        actionId: "fire-weapon",
        timestamp: 1704067200000,
      });

      // Simulate network serialization
      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(original);
      expect(deserialized.actionId).toBe("fire-weapon");
      expect(deserialized.timestamp).toBe(1704067200000);
    });

    it("validates correctly after deserialization", () => {
      const original = createDoActionPayload();
      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized);

      const result = validateDoActionPayload(deserialized);
      expect(isOk(result)).toBe(true);
    });

    it("handles all valid action ID characters", () => {
      const validIds = [
        "simple",
        "with-dashes",
        "with_underscores",
        "mixedCase123",
        "a".repeat(50), // Max length
      ];

      for (const actionId of validIds) {
        const payload = createDoActionPayload({ actionId });
        const serialized = JSON.stringify(payload);
        const deserialized = JSON.parse(serialized);

        const result = validateDoActionPayload(deserialized);
        expect(isOk(result)).toBe(true);
      }
    });
  });

  describe("Handshake payload", () => {
    it("maintains structure after JSON round-trip", () => {
      const original = createHandshakePayload({
        buildId: "v1.2.3",
        deviceClass: "kbm",
      });

      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(original);
      expect(deserialized.buildId).toBe("v1.2.3");
      expect(deserialized.deviceClass).toBe("kbm");
    });

    it("validates correctly after deserialization", () => {
      const original = createHandshakePayload();
      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized);

      const result = validateHandshakePayload(deserialized);
      expect(isOk(result)).toBe(true);
    });

    it("handles all device classes", () => {
      const deviceClasses = ["kbm", "gamepad", "touch"] as const;

      for (const deviceClass of deviceClasses) {
        const payload = createHandshakePayload({ deviceClass });
        const serialized = JSON.stringify(payload);
        const deserialized = JSON.parse(serialized);

        const result = validateHandshakePayload(deserialized);
        expect(isOk(result)).toBe(true);
        if (isOk(result)) {
          expect(result.value.deviceClass).toBe(deviceClass);
        }
      }
    });
  });

  describe("Result responses", () => {
    it("serializes success result correctly", () => {
      const result = createActionResult({ effectApplied: true });

      const serialized = JSON.stringify(result);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.ok).toBe(true);
      expect(deserialized.value.effectApplied).toBe(true);
    });

    it("serializes error result correctly", () => {
      const result = createErrorResult(ErrorCode.InvalidPayload, "Invalid input");

      const serialized = JSON.stringify(result);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.ok).toBe(false);
      expect(deserialized.code).toBe(ErrorCode.InvalidPayload);
      expect(deserialized.message).toBe("Invalid input");
    });

    it("preserves error code numeric values", () => {
      const codes = [
        ErrorCode.Unknown,
        ErrorCode.InvalidPayload,
        ErrorCode.Unauthorized,
        ErrorCode.NotFound,
        ErrorCode.RateLimited,
        ErrorCode.Timeout,
        ErrorCode.InternalError,
      ];

      for (const code of codes) {
        const result = createErrorResult(code, "test");
        const serialized = JSON.stringify(result);
        const deserialized = JSON.parse(serialized);

        expect(typeof deserialized.code).toBe("number");
        expect(deserialized.code).toBe(code);
      }
    });

    it("handles optional retryAfterMs field", () => {
      const result = err(ErrorCode.RateLimited, {
        message: "Too many requests",
        retryAfterMs: 5000,
      });

      const serialized = JSON.stringify(result);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.retryAfterMs).toBe(5000);
    });

    it("handles optional field validation error", () => {
      const result = err(ErrorCode.InvalidPayload, {
        message: "Invalid field",
        field: "actionId",
      });

      const serialized = JSON.stringify(result);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.field).toBe("actionId");
    });
  });

  describe("Complex payloads", () => {
    it("handles nested data structures", () => {
      const payload = {
        action: createDoActionPayload(),
        metadata: {
          sessionId: "session-123",
          sequence: 42,
        },
      };

      const serialized = JSON.stringify(payload);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.action.actionId).toBe(payload.action.actionId);
      expect(deserialized.metadata.sessionId).toBe("session-123");
      expect(deserialized.metadata.sequence).toBe(42);
    });

    it("handles arrays of actions", () => {
      const actions = [
        createDoActionPayload({ actionId: "action-1" }),
        createDoActionPayload({ actionId: "action-2" }),
        createDoActionPayload({ actionId: "action-3" }),
      ];

      const serialized = JSON.stringify(actions);
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toHaveLength(3);
      expect(deserialized[0].actionId).toBe("action-1");
      expect(deserialized[2].actionId).toBe("action-3");
    });
  });

  describe("Edge cases", () => {
    it("handles maximum valid timestamp", () => {
      const payload = createDoActionPayload({
        timestamp: Number.MAX_SAFE_INTEGER,
      });

      const serialized = JSON.stringify(payload);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.timestamp).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("handles zero timestamp", () => {
      const payload = createDoActionPayload({ timestamp: 0 });

      const serialized = JSON.stringify(payload);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.timestamp).toBe(0);
    });

    it("handles unicode in strings", () => {
      const payload = createHandshakePayload({
        buildId: "v1.0.0-测试-🎮",
      });

      const serialized = JSON.stringify(payload);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.buildId).toBe("v1.0.0-测试-🎮");
    });
  });
});

describe("Type Guards", () => {
  it("isOk correctly identifies success results", () => {
    const success = ok({ value: 42 });
    const failure = err(ErrorCode.InternalError);

    expect(isOk(success)).toBe(true);
    expect(isOk(failure)).toBe(false);
  });

  it("isErr correctly identifies error results", () => {
    const success = ok({ value: 42 });
    const failure = err(ErrorCode.InternalError);

    expect(isErr(success)).toBe(false);
    expect(isErr(failure)).toBe(true);
  });

  it("type guards work after serialization", () => {
    const success = ok({ data: "test" });
    const serialized = JSON.stringify(success);
    const deserialized = JSON.parse(serialized);

    // After deserialization, we verify the structure
    expect(deserialized.ok).toBe(true);
    expect(deserialized.value.data).toBe("test");
  });
});
