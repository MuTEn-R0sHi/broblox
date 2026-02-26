/**
 * Analytics Service — Obby Game
 *
 * Sets up event tracking, funnels, sessions, and retention.
 * Uses the @broblox/analytics package.
 */

import { createAnalyticsService } from "@broblox/analytics";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createAnalyticsService({
  analyticsConfig: {
    datastoreName: "ObbyAnalytics",
    heartbeatInterval: 60,
    enableLogging: true,
    forwardToTelemetry: true,
  },
  eventDefinitions: [
    { name: "player.joined", category: "player", description: "Player joined the server" },
    { name: "player.left", category: "player", description: "Player left the server" },
    {
      name: "stage.completed",
      category: "player",
      description: "Player completed a stage",
      expectedFields: ["stageId", "durationSec"],
    },
    {
      name: "stage.failed",
      category: "player",
      description: "Player fell or failed a stage",
      expectedFields: ["stageId"],
    },
    {
      name: "checkpoint.reached",
      category: "player",
      description: "Player reached a checkpoint",
      expectedFields: ["checkpointId", "stageId"],
    },
    {
      name: "economy.purchase",
      category: "economy",
      description: "In-game purchase",
      expectedFields: ["itemId", "price"],
    },
  ],
  funnelDefinitions: [
    {
      name: "progression",
      label: "Obby Progression",
      steps: ["stage_1_complete", "stage_5_complete", "stage_10_complete", "obby_complete"],
      timeoutSec: 3600,
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
