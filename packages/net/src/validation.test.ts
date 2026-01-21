/**
 * Unit tests for validation module.
 */

import { describe, it, expect } from "vitest";

// Inline ErrorCode for Node/vitest (matches @rbx/shared-types)
enum ErrorCode {
  Ok = 0,
  InvalidType = 1,
  InvalidPayload = 2,
  OutOfBounds = 3,
  RateLimited = 4,
  Unauthorized = 5,
  InternalError = 6,
}

// Note: These tests use a mock implementation since the actual validation
// code uses @rbxts/t which is Roblox-specific. In a real setup, you'd
// mock the Roblox environment or use conditional imports.

describe("Validation utilities", () => {
  describe("boundedNumber", () => {
    const boundedNumber = (min: number, max: number) => (value: unknown) => {
      if (typeof value !== "number" || Number.isNaN(value)) {
        return { ok: false, code: ErrorCode.InvalidType };
      }
      if (value < min || value > max) {
        return { ok: false, code: ErrorCode.OutOfBounds };
      }
      return { ok: true, value };
    };

    it("accepts number within bounds", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(50);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(50);
      }
    });

    it("accepts number at lower bound", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(0);
      expect(result.ok).toBe(true);
    });

    it("accepts number at upper bound", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(100);
      expect(result.ok).toBe(true);
    });

    it("rejects number below bounds", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(-1);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.OutOfBounds);
      }
    });

    it("rejects number above bounds", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(101);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.OutOfBounds);
      }
    });

    it("rejects non-number", () => {
      const validator = boundedNumber(0, 100);
      const result = validator("50");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.InvalidType);
      }
    });

    it("rejects NaN", () => {
      const validator = boundedNumber(0, 100);
      const result = validator(NaN);
      expect(result.ok).toBe(false);
    });
  });

  describe("boundedString", () => {
    const boundedString = (maxLength: number, minLength = 0) => (value: unknown) => {
      if (typeof value !== "string") {
        return { ok: false, code: ErrorCode.InvalidType };
      }
      if (value.length < minLength || value.length > maxLength) {
        return { ok: false, code: ErrorCode.OutOfBounds };
      }
      return { ok: true, value };
    };

    it("accepts string within bounds", () => {
      const validator = boundedString(10, 1);
      const result = validator("hello");
      expect(result.ok).toBe(true);
    });

    it("rejects empty string when minLength > 0", () => {
      const validator = boundedString(10, 1);
      const result = validator("");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.OutOfBounds);
      }
    });

    it("rejects string exceeding maxLength", () => {
      const validator = boundedString(5);
      const result = validator("hello world");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.OutOfBounds);
      }
    });

    it("rejects non-string", () => {
      const validator = boundedString(10);
      const result = validator(123);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.InvalidType);
      }
    });
  });

  describe("validateObject", () => {
    // Simplified object validation for testing
    const validateObject = (
      schema: Record<string, (v: unknown) => { ok: boolean; code?: number; value?: unknown }>,
      value: unknown,
      options?: { allowExtra?: boolean }
    ) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return { ok: false, code: ErrorCode.InvalidType };
      }
      
      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      
      for (const [key, validator] of Object.entries(schema)) {
        const validated = validator(obj[key]);
        if (!validated.ok) {
          return { ok: false, code: validated.code, field: key };
        }
        result[key] = validated.value;
      }
      
      if (!options?.allowExtra) {
        for (const key of Object.keys(obj)) {
          if (!(key in schema)) {
            return { ok: false, code: ErrorCode.InvalidPayload, field: key };
          }
        }
      }
      
      return { ok: true, value: result };
    };

    const isString = (v: unknown) => ({
      ok: typeof v === "string",
      code: ErrorCode.InvalidType,
      value: v as string,
    });

    const isNumber = (v: unknown) => ({
      ok: typeof v === "number" && !Number.isNaN(v),
      code: ErrorCode.InvalidType,
      value: v as number,
    });

    it("validates object with correct fields", () => {
      const schema = { name: isString, age: isNumber };
      const result = validateObject(schema, { name: "John", age: 30 });
      expect(result.ok).toBe(true);
    });

    it("rejects object with wrong field type", () => {
      const schema = { name: isString, age: isNumber };
      const result = validateObject(schema, { name: "John", age: "30" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.field).toBe("age");
      }
    });

    it("rejects object with extra fields by default", () => {
      const schema = { name: isString };
      const result = validateObject(schema, { name: "John", extra: "field" });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.field).toBe("extra");
      }
    });

    it("allows extra fields when configured", () => {
      const schema = { name: isString };
      const result = validateObject(schema, { name: "John", extra: "field" }, { allowExtra: true });
      expect(result.ok).toBe(true);
    });

    it("rejects non-object", () => {
      const schema = { name: isString };
      const result = validateObject(schema, "not an object");
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe(ErrorCode.InvalidType);
      }
    });

    it("rejects null", () => {
      const schema = { name: isString };
      const result = validateObject(schema, null);
      expect(result.ok).toBe(false);
    });

    it("rejects array", () => {
      const schema = { name: isString };
      const result = validateObject(schema, []);
      expect(result.ok).toBe(false);
    });
  });
});

describe("DoAction payload validation", () => {
  // Simplified validator for testing
  const validateDoActionPayload = (value: unknown) => {
    if (typeof value !== "object" || value === null) {
      return { ok: false, code: ErrorCode.InvalidType };
    }
    
    const obj = value as Record<string, unknown>;
    
    // actionId: string, 1-50 chars
    if (typeof obj.actionId !== "string") {
      return { ok: false, code: ErrorCode.InvalidType, field: "actionId" };
    }
    if (obj.actionId.length < 1 || obj.actionId.length > 50) {
      return { ok: false, code: ErrorCode.OutOfBounds, field: "actionId" };
    }
    
    // timestamp: number
    if (typeof obj.timestamp !== "number" || Number.isNaN(obj.timestamp)) {
      return { ok: false, code: ErrorCode.InvalidType, field: "timestamp" };
    }
    
    return {
      ok: true,
      value: { actionId: obj.actionId, timestamp: obj.timestamp },
    };
  };

  it("accepts valid payload", () => {
    const result = validateDoActionPayload({
      actionId: "test-action",
      timestamp: Date.now(),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects missing actionId", () => {
    const result = validateDoActionPayload({
      timestamp: Date.now(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("actionId");
    }
  });

  it("rejects empty actionId", () => {
    const result = validateDoActionPayload({
      actionId: "",
      timestamp: Date.now(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("actionId");
    }
  });

  it("rejects actionId > 50 chars", () => {
    const result = validateDoActionPayload({
      actionId: "a".repeat(51),
      timestamp: Date.now(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("actionId");
    }
  });

  it("rejects non-number timestamp", () => {
    const result = validateDoActionPayload({
      actionId: "test",
      timestamp: "now",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("timestamp");
    }
  });
});
