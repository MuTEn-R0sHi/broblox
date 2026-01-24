/**
 * Shared Remote Definitions
 *
 * Single source of truth for all remote endpoints in the game.
 * Both server and client import from here.
 */

import { defineServerFunction, defineClientEvent } from "@rbx/net";

// ============================================================================
// Payload Types
// ============================================================================

/** Handshake request from client */
export interface HandshakeRequest {
  protocolVersion: number;
  buildId: string;
  deviceClass: "kbm" | "gamepad" | "touch";
}

/** Handshake response from server */
export interface HandshakeResponse {
  serverProtocolVersion: number;
  serverTime: number;
  sessionId: string;
}

/** Action request from client */
export interface ActionRequest {
  actionId: string;
  timestamp: number;
  payload?: unknown;
}

/** Action response from server */
export interface ActionResponse {
  accepted: boolean;
  serverTimestamp: number;
}

/** Server notification to client */
export interface ServerNotification {
  type: string;
  message: string;
  data?: unknown;
}

// ============================================================================
// Remote Registry
// ============================================================================

/**
 * All remotes for the game.
 * Add new remotes here - they'll be automatically created and typed.
 */
export const GameRemotes = {
  /**
   * Initial handshake to establish session and verify protocol compatibility.
   */
  Handshake: defineServerFunction<HandshakeRequest, HandshakeResponse>("Net_Handshake", {
    rateLimit: { windowMs: 60000, maxRequests: 3 },
    description: "Client-server handshake for session establishment",
  }),

  /**
   * Generic action intent from client.
   * Server validates and processes the action.
   */
  DoAction: defineServerFunction<ActionRequest, ActionResponse>("Intent_DoAction", {
    rateLimit: { windowMs: 1000, maxRequests: 10 },
    description: "Client action intent",
  }),

  /**
   * Server-to-client notification event.
   */
  Notification: defineClientEvent<ServerNotification>("Server_Notification", {
    description: "Server broadcasts notifications to clients",
  }),
} as const;

/** Type of the game remotes registry */
export type GameRemotesType = typeof GameRemotes;
