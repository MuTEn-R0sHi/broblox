/**
 * Factory for game-level AnalyticsService.
 *
 * Composes EventTracker, FunnelTracker, SessionTracker, and
 * RetentionTracker into a single Service with player lifecycle helpers.
 */

import { Service, createLogger } from "@rbx/core";
import { AnalyticsConfig, EventDefinition, FunnelDefinition } from "./types";
import { EventTracker } from "./event-tracker";
import { FunnelTracker } from "./funnel-tracker";
import { SessionTracker } from "./session-tracker";
import { RetentionTracker } from "./retention-tracker";

export interface AnalyticsServiceConfig {
  /** Pre-register event definitions at init. */
  eventDefinitions?: EventDefinition[];
  /** Pre-register funnel definitions at init. */
  funnelDefinitions?: FunnelDefinition[];
  /** Analytics configuration (datastore, logging, etc.). */
  analyticsConfig?: Partial<AnalyticsConfig>;
  /**
   * Wires player-leave cleanup.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerRemoving(cb)`
   */
  onPlayerRemoving?: (callback: (player: Player) => void) => void;
  /**
   * Wires player-join initialization.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerAdded(cb)`
   */
  onPlayerAdded?: (callback: (player: Player) => void) => void;
}

export interface AnalyticsServiceHandle {
  /** The Service object — register with your game's Application. */
  Service: Service;
  /** Access the EventTracker. */
  getEventTracker(): EventTracker;
  /** Access the FunnelTracker. */
  getFunnelTracker(): FunnelTracker;
  /** Access the SessionTracker. */
  getSessionTracker(): SessionTracker;
  /** Access the RetentionTracker. */
  getRetentionTracker(): RetentionTracker;
  /** Call from PlayerAdded — starts session and checks retention. */
  initPlayer(playerId: number): void;
  /** Call from PlayerRemoving — ends session. */
  cleanupPlayer(playerId: number): void;
}

export function createAnalyticsService(config: AnalyticsServiceConfig): AnalyticsServiceHandle {
  const logger = createLogger("AnalyticsService");

  const analyticsConfig: AnalyticsConfig = {
    datastoreName: config.analyticsConfig?.datastoreName ?? "AnalyticsRetention",
    heartbeatInterval: config.analyticsConfig?.heartbeatInterval ?? 60,
    enableLogging: config.analyticsConfig?.enableLogging ?? true,
    forwardToTelemetry: config.analyticsConfig?.forwardToTelemetry ?? true,
    onEvent: config.analyticsConfig?.onEvent,
    onFunnelComplete: config.analyticsConfig?.onFunnelComplete,
  };

  const eventTracker = new EventTracker(analyticsConfig);
  const funnelTracker = new FunnelTracker(analyticsConfig);
  const sessionTracker = new SessionTracker(analyticsConfig);
  const retentionTracker = new RetentionTracker(analyticsConfig);

  const handle: AnalyticsServiceHandle = {
    Service: {
      name: "AnalyticsService",

      onInit() {
        retentionTracker.init();

        if (config.eventDefinitions) {
          eventTracker.registerEvents(config.eventDefinitions);
        }

        if (config.funnelDefinitions) {
          for (const def of config.funnelDefinitions) {
            funnelTracker.registerFunnel(def);
          }
        }

        logger.info("AnalyticsService initialized.");
        config.onPlayerRemoving?.((player) => handle.cleanupPlayer(player.UserId));
      },

      onStart() {
        logger.info("AnalyticsService started.");
        config.onPlayerAdded?.((player) => handle.initPlayer(player.UserId));
      },

      onDestroy() {
        logger.info("AnalyticsService stopped.");
      },
    },

    getEventTracker() {
      return eventTracker;
    },

    getFunnelTracker() {
      return funnelTracker;
    },

    getSessionTracker() {
      return sessionTracker;
    },

    getRetentionTracker() {
      return retentionTracker;
    },

    initPlayer(playerId: number) {
      sessionTracker.startSession(playerId);
      retentionTracker.recordVisit(playerId);
      logger.info(`Analytics initialized for player ${playerId}`);
    },

    cleanupPlayer(playerId: number) {
      sessionTracker.endSession(playerId);
      logger.info(`Analytics cleaned up for player ${playerId}`);
    },
  };
  return handle;
}
