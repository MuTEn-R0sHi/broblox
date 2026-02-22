/**
 * Analytics Service — Starter Game
 *
 * Sets up event tracking, funnels, sessions, and retention.
 * Uses the @rbx/analytics package.
 */

import { createAnalyticsService } from "@rbx/analytics";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createAnalyticsService({
  analyticsConfig: {
    datastoreName: "StarterAnalytics",
    heartbeatInterval: 60,
    enableLogging: true,
    forwardToTelemetry: true,
  },
  eventDefinitions: [
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
    {
      name: "action.kill",
      category: "action",
      description: "Player confirmed a kill",
    },
  ],
  funnelDefinitions: [
    {
      name: "onboarding",
      label: "New Player Onboarding",
      steps: ["spawn", "first_move", "first_interaction", "tutorial_complete"],
      timeoutSec: 300,
    },
  ],
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const AnalyticsService = handle.Service;
export const getEventTracker = () => handle.getEventTracker();
export const getFunnelTracker = () => handle.getFunnelTracker();
export const getSessionTracker = () => handle.getSessionTracker();
export const getRetentionTracker = () => handle.getRetentionTracker();
