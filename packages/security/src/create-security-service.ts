/**
 * Factory for game-level SecurityService.
 *
 * Composes the Enforcer (automatic rule enforcement) with the
 * detector signal bus and trust-score utilities.
 */

import { Service, createLogger } from "@broblox/core";
import { EnforcementConfig } from "./types";
import { Enforcer, cleanupEnforcementState } from "./enforcer";
import { cleanupPlayer } from "./detectors";
import { cleanupTrustCache } from "./trust-score";

export interface SecurityServiceConfig {
  /** Override default enforcement thresholds. */
  enforcementConfig?: Partial<EnforcementConfig>;
  /**
   * Wires player-leave cleanup.
   * Typically: `onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb)`
   */
  onPlayerRemoving?: (callback: (player: Player) => void) => void;
}

export interface SecurityServiceHandle {
  /** The Service object — register with your game's Application. */
  Service: Service;
  /** Access the Enforcer instance. */
  getEnforcer(): Enforcer;
}

export function createSecurityService(config: SecurityServiceConfig = {}): SecurityServiceHandle {
  const logger = createLogger("SecurityService");
  const enforcer = new Enforcer(config.enforcementConfig);

  return {
    Service: {
      name: "SecurityService",

      onInit() {
        // Clean up per-player detector + enforcement + trust state when players leave.
        config.onPlayerRemoving?.((player) => {
          cleanupEnforcementState(player);
          cleanupPlayer(player);
          cleanupTrustCache(player);
        });
        logger.info("SecurityService initialized.");
      },

      onStart() {
        enforcer.start();
        logger.info("SecurityService started — enforcer active.");
      },

      onDestroy() {
        enforcer.stop();
        logger.info("SecurityService stopped.");
      },
    },

    getEnforcer() {
      return enforcer;
    },
  };
}
