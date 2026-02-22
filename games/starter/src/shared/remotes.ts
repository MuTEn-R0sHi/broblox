/**
 * Shared Remote Definitions
 *
 * Single source of truth for all remote endpoints in the game.
 * Both server and client import from here.
 */

import {
  defineServerFunction,
  defineClientEvent,
  validateHandshakePayload,
  validateDoActionPayload,
} from "@rbx/net";
import type { HandshakeResponse } from "@rbx/shared-types";

// ============================================================================
// Payload Types
// ============================================================================

/** Handshake request from client */
export interface HandshakeRequest {
  protocolVersion: number;
  buildId: string;
  deviceClass: "kbm" | "gamepad" | "touch";
}

/**
 * Handshake response from server.
 * @see @rbx/shared-types HandshakeResponse
 */
export type { HandshakeResponse };

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

/** Payload for a scheduled in-game event becoming active or inactive */
export interface EventActivePayload {
  id: string;
  label: string;
  modifiers?: Record<string, unknown>;
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
    validate: (v): v is HandshakeRequest => validateHandshakePayload(v).ok,
  }),

  /**
   * Generic action intent from client.
   * Server validates and processes the action.
   */
  DoAction: defineServerFunction<ActionRequest, ActionResponse>("Intent_DoAction", {
    rateLimit: { windowMs: 1000, maxRequests: 10 },
    description: "Client action intent",
    validate: (v): v is ActionRequest => validateDoActionPayload(v).ok,
  }),

  /**
   * Server-to-client notification event.
   */
  Notification: defineClientEvent<ServerNotification>("Server_Notification", {
    description: "Server broadcasts notifications to clients",
  }),

  /**
   * Server → All Clients: A scheduled in-game event has started.
   */
  EventStarted: defineClientEvent<EventActivePayload>("Server_EventStarted", {
    description: "Server broadcasts that a scheduled event has become active",
  }),

  /**
   * Server → All Clients: A scheduled in-game event has ended.
   */
  EventEnded: defineClientEvent<EventActivePayload>("Server_EventEnded", {
    description: "Server broadcasts that a scheduled event has become inactive",
  }),
} as const;

/** Type of the game remotes registry */
export type GameRemotesType = typeof GameRemotes;
