/**
 * Unit tests for protocol versioning.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { mockRobloxGlobals } from "@rbx/testing";
import {
  validateProtocolVersion,
  isExactVersion,
  isLegacyVersion,
  getCurrentProtocolVersion,
  getMinProtocolVersion,
} from "./protocol";

// Mock Roblox globals for Node.js
beforeAll(() => {
  mockRobloxGlobals();
});

describe("Protocol Versioning", () => {
  describe("validateProtocolVersion", () => {
    describe("with default config", () => {
      it("accepts current version", () => {
        const result = validateProtocolVersion(1);
        expect(result.compatible).toBe(true);
        expect(result.serverVersion).toBe(1);
      });

      it("rejects version 0 when min is 1", () => {
        const result = validateProtocolVersion(0);
        expect(result.compatible).toBe(false);
        expect(result.reason).toContain("too old");
      });

      it("rejects future versions", () => {
        const result = validateProtocolVersion(999);
        expect(result.compatible).toBe(false);
        expect(result.reason).toContain("newer than server");
      });

      it("rejects negative versions", () => {
        const result = validateProtocolVersion(-1);
        expect(result.compatible).toBe(false);
        expect(result.reason).toContain("Invalid");
      });

      it("rejects non-integer versions", () => {
        const result = validateProtocolVersion(1.5);
        expect(result.compatible).toBe(false);
        expect(result.reason).toContain("Invalid");
      });

      it("rejects NaN", () => {
        const result = validateProtocolVersion(NaN);
        expect(result.compatible).toBe(false);
        expect(result.reason).toContain("Invalid");
      });
    });

    describe("with custom config", () => {
      it("accepts N-1 version when allowLegacy is true", () => {
        const result = validateProtocolVersion(2, {
          currentVersion: 3,
          minVersion: 1,
          allowLegacy: true,
        });
        expect(result.compatible).toBe(true);
      });

      it("rejects N-1 version when allowLegacy is false", () => {
        const result = validateProtocolVersion(2, {
          currentVersion: 3,
          minVersion: 1,
          allowLegacy: false,
        });
        expect(result.compatible).toBe(false);
        expect(result.reason).toContain("too old");
      });

      it("accepts current version when allowLegacy is false", () => {
        const result = validateProtocolVersion(3, {
          currentVersion: 3,
          minVersion: 1,
          allowLegacy: false,
        });
        expect(result.compatible).toBe(true);
      });

      it("respects minVersion over N-1 rule", () => {
        // If minVersion is higher than N-1, use minVersion
        const result = validateProtocolVersion(4, {
          currentVersion: 5,
          minVersion: 5, // Forces exact match
          allowLegacy: true,
        });
        expect(result.compatible).toBe(false);
        expect(result.minVersion).toBe(5);
      });

      it("returns correct version info", () => {
        const result = validateProtocolVersion(2, {
          currentVersion: 3,
          minVersion: 1,
          allowLegacy: true,
        });
        expect(result.serverVersion).toBe(3);
        expect(result.minVersion).toBe(2); // N-1
        expect(result.maxVersion).toBe(3);
      });
    });

    describe("edge cases", () => {
      it("handles version 0 as current", () => {
        const result = validateProtocolVersion(0, {
          currentVersion: 0,
          minVersion: 0,
        });
        expect(result.compatible).toBe(true);
      });

      it("handles large version numbers", () => {
        const result = validateProtocolVersion(100, {
          currentVersion: 100,
          minVersion: 99,
        });
        expect(result.compatible).toBe(true);
      });
    });
  });

  describe("isExactVersion", () => {
    it("returns true for exact match", () => {
      expect(isExactVersion(getCurrentProtocolVersion())).toBe(true);
    });

    it("returns false for different version", () => {
      expect(isExactVersion(getCurrentProtocolVersion() + 1)).toBe(false);
      expect(isExactVersion(getCurrentProtocolVersion() - 1)).toBe(false);
    });
  });

  describe("isLegacyVersion", () => {
    it("returns true for N-1 version", () => {
      // Only works if current > minVersion
      const current = getCurrentProtocolVersion();
      const min = getMinProtocolVersion();
      if (current > min) {
        expect(isLegacyVersion(current - 1)).toBe(true);
      }
    });

    it("returns false for current version", () => {
      expect(isLegacyVersion(getCurrentProtocolVersion())).toBe(false);
    });

    it("returns false for version below min", () => {
      expect(isLegacyVersion(getMinProtocolVersion() - 1)).toBe(false);
    });
  });

  describe("version getters", () => {
    it("getCurrentProtocolVersion returns a positive integer", () => {
      const version = getCurrentProtocolVersion();
      expect(typeof version).toBe("number");
      expect(Number.isInteger(version)).toBe(true);
      expect(version).toBeGreaterThanOrEqual(0);
    });

    it("getMinProtocolVersion returns a positive integer", () => {
      const version = getMinProtocolVersion();
      expect(typeof version).toBe("number");
      expect(Number.isInteger(version)).toBe(true);
      expect(version).toBeGreaterThanOrEqual(0);
    });

    it("min version is <= current version", () => {
      expect(getMinProtocolVersion()).toBeLessThanOrEqual(getCurrentProtocolVersion());
    });
  });
});
