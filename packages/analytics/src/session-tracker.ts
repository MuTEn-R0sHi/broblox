/**
 * Session Tracker
 *
 * Tracks per-player session lifecycle: start, heartbeat, end.
 * Computes playtime and emits session analytics.
 */

import { createLogger } from "@broblox/core";
import { Counter } from "@broblox/observability";
import type { SessionData, AnalyticsConfig } from "./types";

const sessionsStarted = new Counter("analytics_sessions_started");
const sessionsEnded = new Counter("analytics_sessions_ended");

/**
 * Manages active player sessions and playtime tracking.
 */
export class SessionTracker {
  private sessions = new Map<number, SessionData>();
  private config: AnalyticsConfig;
  private logger: ReturnType<typeof createLogger> | undefined;

  constructor(config: AnalyticsConfig) {
    this.config = config;
    if (config.enableLogging) {
      this.logger = createLogger("SessionTracker");
    }
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Start a session for a player.
   */
  startSession(playerId: number, properties?: Record<string, unknown>): void {
    if (this.sessions.has(playerId)) {
      this.logger?.warn(`Session already active for player ${playerId}`);
      return;
    }

    const now = os.time();
    this.sessions.set(playerId, {
      playerId,
      startedAt: now,
      lastHeartbeat: now,
      playtimeSec: 0,
      active: true,
      properties: properties ?? {},
    });

    sessionsStarted.inc();
    this.logger?.info(`Session started for player ${playerId}`);
  }

  /**
   * Record a heartbeat for a player — updates playtime.
   */
  heartbeat(playerId: number): void {
    const session = this.sessions.get(playerId);
    if (!session || !session.active) return;

    const now = os.time();
    const delta = now - session.lastHeartbeat;
    session.playtimeSec += delta;
    session.lastHeartbeat = now;
  }

  /**
   * End a player's session and return final session data.
   */
  endSession(playerId: number): SessionData | undefined {
    const session = this.sessions.get(playerId);
    if (!session) return undefined;

    // Final heartbeat to capture remaining playtime
    const now = os.time();
    if (session.active) {
      const delta = now - session.lastHeartbeat;
      session.playtimeSec += delta;
      session.lastHeartbeat = now;
    }
    session.active = false;

    sessionsEnded.inc();
    this.logger?.info(`Session ended for player ${playerId} — ${session.playtimeSec}s playtime`);

    this.sessions.delete(playerId);
    return session;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /**
   * Get session data for a player.
   */
  getSession(playerId: number): SessionData | undefined {
    return this.sessions.get(playerId);
  }

  /**
   * Get all active sessions.
   */
  getActiveSessions(): SessionData[] {
    const result: SessionData[] = [];
    this.sessions.forEach((session) => {
      if (session.active) result.push(session);
    });
    return result;
  }

  /**
   * Get total number of active sessions.
   */
  getActiveCount(): number {
    let count = 0;
    this.sessions.forEach((session) => {
      if (session.active) count++;
    });
    return count;
  }

  /**
   * Set a custom property on a player's session.
   */
  setProperty(playerId: number, key: string, value: unknown): void {
    const session = this.sessions.get(playerId);
    if (session) {
      session.properties[key] = value;
    }
  }

  /**
   * Process heartbeats for all active sessions.
   * Call this periodically from a server loop.
   */
  heartbeatAll(): void {
    this.sessions.forEach((session) => {
      if (session.active) {
        const now = os.time();
        const delta = now - session.lastHeartbeat;
        session.playtimeSec += delta;
        session.lastHeartbeat = now;
      }
    });
  }
}
