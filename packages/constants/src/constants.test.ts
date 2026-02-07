import { describe, it, expect } from "vitest";
import {
  // limits
  ACTION_ID_MAX_LENGTH,
  ACTION_ID_MIN_LENGTH,
  MAX_PAYLOAD_SIZE_BYTES,
  TIMESTAMP_TOLERANCE_MS,
  TIMESTAMP_MAX_AGE_MS,
  MAX_POSITION_MAGNITUDE,
  MAX_VELOCITY_MAGNITUDE,
  MAX_LOOK_DIRECTION_MAGNITUDE,
  MAX_CONCURRENT_REQUESTS,
  MAX_EVENTS_PER_SECOND,
  MAX_BATCH_SIZE,
  MAX_INVENTORY_SIZE,
  MAX_FRIENDS_PER_REQUEST,
  // timeouts
  REMOTES_WAIT_TIMEOUT_SECONDS,
  REMOTE_INVOKE_TIMEOUT_MS,
  HANDSHAKE_RETRY_DELAY_MS,
  HANDSHAKE_MAX_RETRIES,
  SESSION_EXPIRY_SECONDS,
  DATA_SAVE_TIMEOUT_MS,
  SHUTDOWN_TIMEOUT_SECONDS,
  DEFAULT_COOLDOWN_MS,
  MIN_COOLDOWN_MS,
  MAX_COOLDOWN_MS,
  // build
  BUILD_ID,
  BUILD_TIMESTAMP,
  BUILD_COMMIT,
  BUILD_ENVIRONMENT,
  isDevelopment,
  isStaging,
  isProduction,
  isDebugEnabled,
  isVerboseLoggingEnabled,
  // validation
  isValidStringLength,
  isValidNumberRange,
  isValidActionId,
  isValidTimestamp,
  clamp,
} from "./index";

// ============================================================================
// Limits
// ============================================================================

describe("limits", () => {
  it("exports positive numeric limit constants", () => {
    const limits = [
      ACTION_ID_MAX_LENGTH,
      ACTION_ID_MIN_LENGTH,
      MAX_PAYLOAD_SIZE_BYTES,
      TIMESTAMP_TOLERANCE_MS,
      TIMESTAMP_MAX_AGE_MS,
      MAX_POSITION_MAGNITUDE,
      MAX_VELOCITY_MAGNITUDE,
      MAX_LOOK_DIRECTION_MAGNITUDE,
      MAX_CONCURRENT_REQUESTS,
      MAX_EVENTS_PER_SECOND,
      MAX_BATCH_SIZE,
      MAX_INVENTORY_SIZE,
      MAX_FRIENDS_PER_REQUEST,
    ];
    for (const val of limits) {
      expect(typeof val).toBe("number");
      expect(val).toBeGreaterThan(0);
    }
  });

  it("ACTION_ID_MIN_LENGTH < ACTION_ID_MAX_LENGTH", () => {
    expect(ACTION_ID_MIN_LENGTH).toBeLessThan(ACTION_ID_MAX_LENGTH);
  });

  it("MIN_COOLDOWN_MS < DEFAULT_COOLDOWN_MS < MAX_COOLDOWN_MS", () => {
    expect(MIN_COOLDOWN_MS).toBeLessThan(DEFAULT_COOLDOWN_MS);
    expect(DEFAULT_COOLDOWN_MS).toBeLessThan(MAX_COOLDOWN_MS);
  });
});

// ============================================================================
// Timeouts
// ============================================================================

describe("timeouts", () => {
  it("exports positive numeric timeout constants", () => {
    const timeouts = [
      REMOTES_WAIT_TIMEOUT_SECONDS,
      REMOTE_INVOKE_TIMEOUT_MS,
      HANDSHAKE_RETRY_DELAY_MS,
      HANDSHAKE_MAX_RETRIES,
      SESSION_EXPIRY_SECONDS,
      DATA_SAVE_TIMEOUT_MS,
      SHUTDOWN_TIMEOUT_SECONDS,
      DEFAULT_COOLDOWN_MS,
      MIN_COOLDOWN_MS,
      MAX_COOLDOWN_MS,
    ];
    for (const val of timeouts) {
      expect(typeof val).toBe("number");
      expect(val).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// Build
// ============================================================================

describe("build", () => {
  it("exports build metadata", () => {
    expect(typeof BUILD_ID).toBe("string");
    expect(typeof BUILD_TIMESTAMP).toBe("number");
    expect(typeof BUILD_COMMIT).toBe("string");
    expect(BUILD_ENVIRONMENT).toBe("development");
  });

  it("isDevelopment returns true in dev", () => {
    expect(isDevelopment()).toBe(true);
  });

  it("isStaging returns false in dev", () => {
    expect(isStaging()).toBe(false);
  });

  it("isProduction returns false in dev", () => {
    expect(isProduction()).toBe(false);
  });

  it("isDebugEnabled returns true in non-production", () => {
    expect(isDebugEnabled()).toBe(true);
  });

  it("isVerboseLoggingEnabled returns true in dev", () => {
    expect(isVerboseLoggingEnabled()).toBe(true);
  });
});

// ============================================================================
// Validation
// ============================================================================

describe("validation", () => {
  describe("isValidStringLength", () => {
    it("returns true for string within bounds", () => {
      expect(isValidStringLength("hello", 1, 10)).toBe(true);
    });

    it("returns true at exact min boundary", () => {
      expect(isValidStringLength("a", 1, 5)).toBe(true);
    });

    it("returns true at exact max boundary", () => {
      expect(isValidStringLength("abcde", 1, 5)).toBe(true);
    });

    it("returns false for string below min", () => {
      expect(isValidStringLength("", 1, 10)).toBe(false);
    });

    it("returns false for string above max", () => {
      expect(isValidStringLength("abcdef", 1, 5)).toBe(false);
    });
  });

  describe("isValidNumberRange", () => {
    it("returns true for value within range", () => {
      expect(isValidNumberRange(5, 1, 10)).toBe(true);
    });

    it("returns true at exact boundaries", () => {
      expect(isValidNumberRange(1, 1, 10)).toBe(true);
      expect(isValidNumberRange(10, 1, 10)).toBe(true);
    });

    it("returns false outside range", () => {
      expect(isValidNumberRange(0, 1, 10)).toBe(false);
      expect(isValidNumberRange(11, 1, 10)).toBe(false);
    });
  });

  describe("isValidActionId", () => {
    it("accepts valid action IDs", () => {
      expect(isValidActionId("jump")).toBe(true);
      expect(isValidActionId("a")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isValidActionId("")).toBe(false);
    });

    it("rejects strings exceeding max length", () => {
      const tooLong = "a".repeat(ACTION_ID_MAX_LENGTH + 1);
      expect(isValidActionId(tooLong)).toBe(false);
    });

    it("accepts string at exact max length", () => {
      const exact = "a".repeat(ACTION_ID_MAX_LENGTH);
      expect(isValidActionId(exact)).toBe(true);
    });
  });

  describe("isValidTimestamp", () => {
    it("accepts timestamp at current time", () => {
      expect(isValidTimestamp(1000, 1000)).toBe(true);
    });

    it("accepts timestamp within tolerance", () => {
      expect(isValidTimestamp(1000, 1000 + TIMESTAMP_TOLERANCE_MS)).toBe(true);
      expect(isValidTimestamp(1000 + TIMESTAMP_TOLERANCE_MS, 1000)).toBe(true);
    });

    it("rejects timestamp beyond tolerance", () => {
      expect(isValidTimestamp(1000, 1000 + TIMESTAMP_TOLERANCE_MS + 1)).toBe(false);
    });

    it("rejects negative timestamp", () => {
      expect(isValidTimestamp(-1, 1000)).toBe(false);
    });
  });

  describe("clamp", () => {
    it("returns value when within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("clamps to min when below", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("clamps to max when above", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("returns boundary when at boundary", () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });
});
