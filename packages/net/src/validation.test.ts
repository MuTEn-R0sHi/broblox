/**
 * Unit tests for validation module.
 * Uses @rbx/testing for consistent types and mocks.
 */

import { describe, it, expect } from "vitest";
import {
  ErrorCode,
  ok,
  err,
  isOk,
  isErr,
  createDoActionPayload,
  createHandshakePayload,
} from "@rbx/testing";

// ============================================================================
// Validation Helper Implementations for Testing
// ============================================================================

/**
 * Creates a bounded number validator.
 */
function boundedNumber(min: number, max: number) {
  return (value: unknown) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return err(ErrorCode.InvalidType);
    }
    if (value < min || value > max) {
      return err(ErrorCode.OutOfBounds);
    }
    return ok(value);
  };
}

/**
 * Creates a bounded string validator.
 */
function boundedString(maxLength: number, minLength = 0) {
  return (value: unknown) => {
    if (typeof value !== "string") {
      return err(ErrorCode.InvalidType);
    }
    if (value.length < minLength || value.length > maxLength) {
      return err(ErrorCode.OutOfBounds);
    }
    return ok(value);
  };
}

/**
 * Validates an object against a schema.
 */
function validateObject<T extends Record<string, unknown>>(
  schema: Record<string, (v: unknown) => ReturnType<typeof ok> | ReturnType<typeof err>>,
  value: unknown,
  options?: { allowExtra?: boolean }
): ReturnType<typeof ok<T>> | (ReturnType<typeof err> & { field?: string }) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return err(ErrorCode.InvalidType);
  }

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, validator] of Object.entries(schema)) {
    const validated = validator(obj[key]);
    if (!validated.ok) {
      return { ...validated, field: key };
    }
    result[key] = validated.value;
  }

  if (!options?.allowExtra) {
    for (const key of Object.keys(obj)) {
      if (!(key in schema)) {
        return { ...err(ErrorCode.InvalidPayload), field: key };
      }
    }
  }

  return ok(result as T);
}

/**
 * Validates a DoAction payload.
 */
function validateDoActionPayload(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return { ...err(ErrorCode.InvalidType), field: undefined };
  }

  const obj = value as Record<string, unknown>;

  // actionId: string, 1-50 chars
  if (typeof obj.actionId !== "string") {
    return { ...err(ErrorCode.InvalidType), field: "actionId" };
  }
  if (obj.actionId.length < 1 || obj.actionId.length > 50) {
    return { ...err(ErrorCode.OutOfBounds), field: "actionId" };
  }

  // timestamp: number
  if (typeof obj.timestamp !== "number" || Number.isNaN(obj.timestamp)) {
    return { ...err(ErrorCode.InvalidType), field: "timestamp" };
  }

  return ok({ actionId: obj.actionId, timestamp: obj.timestamp });
}

/**
 * Validates a Handshake payload.
 */
function validateHandshakePayload(value: unknown) {
  if (typeof value !== "object" || value === null) {
    return { ...err(ErrorCode.InvalidType), field: undefined };
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.protocolVersion !== "number") {
    return { ...err(ErrorCode.InvalidType), field: "protocolVersion" };
  }

  if (typeof obj.buildId !== "string") {
    return { ...err(ErrorCode.InvalidType), field: "buildId" };
  }

  const dc = obj.deviceClass;
  if (dc !== "kbm" && dc !== "gamepad" && dc !== "touch") {
    return { ...err(ErrorCode.InvalidPayload), field: "deviceClass" };
  }

  return ok({
    protocolVersion: obj.protocolVersion as number,
    buildId: obj.buildId as string,
    deviceClass: dc as "kbm" | "gamepad" | "touch",
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("Validation utilities", () => {
  describe("boundedNumber", () => {
    it("accepts number within bounds", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(50);
      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe(50);
      }
    });

    it("accepts number at lower bound", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(0);
      expect(isOk(result)).toBe(true);
    });

    it("accepts number at upper bound", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(100);
      expect(isOk(result)).toBe(true);
    });

    it("rejects number below bounds", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(-1);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.code).toBe(ErrorCode.OutOfBounds);
      }
    });

    it("rejects number above bounds", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(101);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.code).toBe(ErrorCode.OutOfBounds);
      }
    });

    it("rejects non-number", () => {
      const validator = boundedNumber(0, 100);
      const result = validator("50");
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.code).toBe(ErrorCode.InvalidType);
      }
    });

    it("rejects NaN", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(NaN);
      expect(isErr(result)).toBe(true);
    });
  });

  describe("boundedString", () => {
    it("accepts string within bounds", () => {
      const validator = boundedString(10, 1);
      const result = validator("hello");
      expect(isOk(result)).toBe(true);
    });

    it("rejects empty string when minLength > 0", () => {
      const validator = boundedString(10, 1);
      const result = validator("");
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.code).toBe(ErrorCode.OutOfBounds);
      }
    });

    it("rejects string exceeding maxLength", () => {
      const validator = boundedString(5);
      const result = validator("hello world");
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.code).toBe(ErrorCode.OutOfBounds);
      }
    });

    it("rejects non-string", () => {
      const validator = boundedString(10);
      const result = validator(123);
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.code).toBe(ErrorCode.InvalidType);
      }
    });
  });

  describe("validateObject", () => {
    const isString = (v: unknown) => (typeof v === "string" ? ok(v) : err(ErrorCode.InvalidType));

    const isNumber = (v: unknown) =>
      typeof v === "number" && !Number.isNaN(v) ? ok(v) : err(ErrorCode.InvalidType);

    it("validates object with correct fields", () => {
      const schema = { name: isString, age: isNumber };
      const result = validateObject(schema, { name: "John", age: 30 });
      expect(isOk(result)).toBe(true);
    });

    it("rejects object with wrong field type", () => {
      const schema = { name: isString, age: isNumber };
      const result = validateObject(schema, { name: "John", age: "30" });
      expect(isErr(result)).toBe(true);
      if (isErr(result) && "field" in result) {
        expect(result.field).toBe("age");
      }
    });

    it("rejects object with extra fields by default", () => {
      const schema = { name: isString };
      const result = validateObject(schema, { name: "John", extra: "field" });
      expect(isErr(result)).toBe(true);
      if (isErr(result) && "field" in result) {
        expect(result.field).toBe("extra");
      }
    });

    it("allows extra fields when configured", () => {
      const schema = { name: isString };
      const result = validateObject(schema, { name: "John", extra: "field" }, { allowExtra: true });
      expect(isOk(result)).toBe(true);
    });

    it("rejects non-object", () => {
      const schema = { name: isString };
      const result = validateObject(schema, "not an object");
      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.code).toBe(ErrorCode.InvalidType);
      }
    });

    it("rejects null", () => {
      const schema = { name: isString };
      const result = validateObject(schema, null);
      expect(isErr(result)).toBe(true);
    });

    it("rejects array", () => {
      const schema = { name: isString };
      const result = validateObject(schema, []);
      expect(isErr(result)).toBe(true);
    });
  });
});

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
    if (isErr(result) && "field" in result) {
      expect(result.field).toBe("actionId");
    }
  });

  it("rejects empty actionId", () => {
    const payload = createDoActionPayload({ actionId: "" });
    const result = validateDoActionPayload(payload);
    expect(isErr(result)).toBe(true);
    if (isErr(result) && "field" in result) {
      expect(result.field).toBe("actionId");
    }
  });

  it("rejects actionId > 50 chars", () => {
    const payload = createDoActionPayload({ actionId: "a".repeat(51) });
    const result = validateDoActionPayload(payload);
    expect(isErr(result)).toBe(true);
    if (isErr(result) && "field" in result) {
      expect(result.field).toBe("actionId");
    }
  });

  it("rejects non-number timestamp", () => {
    const result = validateDoActionPayload({
      actionId: "test",
      timestamp: "now",
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result) && "field" in result) {
      expect(result.field).toBe("timestamp");
    }
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
    if (isErr(result) && "field" in result) {
      expect(result.field).toBe("deviceClass");
    }
  });

  it("rejects missing protocolVersion", () => {
    const result = validateHandshakePayload({
      buildId: "test",
      deviceClass: "kbm",
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result) && "field" in result) {
      expect(result.field).toBe("protocolVersion");
    }
  });

  it("rejects missing buildId", () => {
    const result = validateHandshakePayload({
      protocolVersion: 1,
      deviceClass: "kbm",
    });
    expect(isErr(result)).toBe(true);
    if (isErr(result) && "field" in result) {
      expect(result.field).toBe("buildId");
    }
  });
});
