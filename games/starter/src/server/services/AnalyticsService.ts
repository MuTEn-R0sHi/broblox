/**
 * Analytics Service — Starter Game
 *
 * Sets up event tracking, funnels, sessions, and retention.
 * Uses the @rbx/analytics package.
 */

import { Service, createLogger } from "@rbx/core";
import { EventTracker, FunnelTracker, SessionTracker, RetentionTracker } from "@rbx/analytics";

const logger = createLogger("AnalyticsService");

let eventTracker: EventTracker | undefined;
let funnelTracker: FunnelTracker | undefined;
let sessionTracker: SessionTracker | undefined;
let retentionTracker: RetentionTracker | undefined;

export function getEventTracker(): EventTracker {
  if (!eventTracker) throw "AnalyticsService has not been initialized yet.";
  return eventTracker;
}

export function getFunnelTracker(): FunnelTracker {
  if (!funnelTracker) throw "AnalyticsService has not been initialized yet.";
  return funnelTracker;
}

export function getSessionTracker(): SessionTracker {
  if (!sessionTracker) throw "AnalyticsService has not been initialized yet.";
  return sessionTracker;
}

export function getRetentionTracker(): RetentionTracker {
  if (!retentionTracker) throw "AnalyticsService has not been initialized yet.";
  return retentionTracker;
}

const analyticsConfig = {
  datastoreName: "StarterRetention",
  heartbeatInterval: 60,
  enableLogging: true,
  forwardToTelemetry: true,
};

export const AnalyticsService: Service = {
  onInit() {
    eventTracker = new EventTracker(analyticsConfig);
    funnelTracker = new FunnelTracker(analyticsConfig);
    sessionTracker = new SessionTracker(analyticsConfig);
    retentionTracker = new RetentionTracker(analyticsConfig);

    retentionTracker.init();

    // ----- Register events -----
    eventTracker.registerEvents([
      { name: "player.joined", category: "player", description: "Player joined the server" },
      { name: "player.left", category: "player", description: "Player left the server" },
      {
        name: "player.level_up",
        category: "player",
        description: "Player leveled up",
        expectedFields: ["level"],
      },
      { name: "match.started", category: "match", description: "Match started" },
      {
        name: "match.ended",
        category: "match",
        description: "Match ended",
        expectedFields: ["result", "durationSec"],
      },
      {
        name: "economy.purchase",
        category: "economy",
        description: "In-game purchase",
        expectedFields: ["itemId", "price"],
      },
    ]);

    // ----- Register funnels -----
    funnelTracker.registerFunnel({
      name: "onboarding",
      label: "New Player Onboarding",
      steps: ["spawn", "first_move", "first_interaction", "tutorial_complete"],
      timeoutSec: 300,
    });

    logger.info("Analytics initialized.");
  },

  onStart() {
    logger.info("AnalyticsService started.");
  },

  onStop() {
    logger.info("AnalyticsService stopped.");
  },
};
