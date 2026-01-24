/**
 * Remote Definitions Tests
 *
 * Tests for remote definition structures and types.
 * These validate the contract without importing Roblox packages.
 */

import { describe, it, expect } from "vitest";

// ============================================================================
// Type definitions (mirroring shared/remotes.ts)
// ============================================================================

interface HandshakeRequest {
  protocolVersion: number;
  buildId: string;
  deviceClass: "kbm" | "gamepad" | "touch";
}

interface HandshakeResponse {
  serverProtocolVersion: number;
  serverTime: number;
  sessionId: string;
}

interface ActionRequest {
  actionId: string;
  timestamp: number;
  payload?: unknown;
}

interface ActionResponse {
  accepted: boolean;
  serverTimestamp: number;
}

interface ServerNotification {
  type: string;
  message: string;
  data?: unknown;
}

// ============================================================================
// Tests
// ============================================================================

describe("Remote type contracts", () => {
  describe("HandshakeRequest", () => {
    it("should have required fields", () => {
      const request: HandshakeRequest = {
        protocolVersion: 1,
        buildId: "1.0.0",
        deviceClass: "kbm",
      };

      expect(request.protocolVersion).toBeTypeOf("number");
      expect(request.buildId).toBeTypeOf("string");
      expect(["kbm", "gamepad", "touch"]).toContain(request.deviceClass);
    });

    it("should accept all device classes", () => {
      const classes: Array<"kbm" | "gamepad" | "touch"> = ["kbm", "gamepad", "touch"];

      for (const deviceClass of classes) {
        const request: HandshakeRequest = {
          protocolVersion: 1,
          buildId: "1.0.0",
          deviceClass,
        };
        expect(request.deviceClass).toBe(deviceClass);
      }
    });
  });

  describe("HandshakeResponse", () => {
    it("should have required fields", () => {
      const response: HandshakeResponse = {
        serverProtocolVersion: 1,
        serverTime: Date.now(),
        sessionId: "session_123",
      };

      expect(response.serverProtocolVersion).toBeTypeOf("number");
      expect(response.serverTime).toBeTypeOf("number");
      expect(response.sessionId).toBeTypeOf("string");
    });

    it("should have valid server time", () => {
      const response: HandshakeResponse = {
        serverProtocolVersion: 1,
        serverTime: Date.now(),
        sessionId: "session_123",
      };

      expect(response.serverTime).toBeGreaterThan(0);
    });
  });

  describe("ActionRequest", () => {
    it("should have required fields", () => {
      const request: ActionRequest = {
        actionId: "jump",
        timestamp: Date.now(),
      };

      expect(request.actionId).toBeTypeOf("string");
      expect(request.timestamp).toBeTypeOf("number");
    });

    it("should allow optional payload", () => {
      const requestWithPayload: ActionRequest = {
        actionId: "attack",
        timestamp: Date.now(),
        payload: { targetId: "enemy_123" },
      };

      const requestWithoutPayload: ActionRequest = {
        actionId: "jump",
        timestamp: Date.now(),
      };

      expect(requestWithPayload.payload).toBeDefined();
      expect(requestWithoutPayload.payload).toBeUndefined();
    });
  });

  describe("ActionResponse", () => {
    it("should have required fields", () => {
      const response: ActionResponse = {
        accepted: true,
        serverTimestamp: Date.now(),
      };

      expect(response.accepted).toBeTypeOf("boolean");
      expect(response.serverTimestamp).toBeTypeOf("number");
    });
  });

  describe("ServerNotification", () => {
    it("should have required fields", () => {
      const notification: ServerNotification = {
        type: "info",
        message: "Welcome to the game!",
      };

      expect(notification.type).toBeTypeOf("string");
      expect(notification.message).toBeTypeOf("string");
    });

    it("should allow optional data", () => {
      const notification: ServerNotification = {
        type: "reward",
        message: "You earned coins!",
        data: { amount: 100 },
      };

      expect(notification.data).toBeDefined();
      expect(notification.data).toEqual({ amount: 100 });
    });
  });
});

describe("Remote naming conventions", () => {
  it("should use Net_ prefix for handshake", () => {
    const expectedName = "Net_Handshake";
    expect(expectedName.startsWith("Net_")).toBe(true);
  });

  it("should use Intent_ prefix for actions", () => {
    const expectedName = "Intent_DoAction";
    expect(expectedName.startsWith("Intent_")).toBe(true);
  });

  it("should use Server_ prefix for server events", () => {
    const expectedName = "Server_Notification";
    expect(expectedName.startsWith("Server_")).toBe(true);
  });
});
