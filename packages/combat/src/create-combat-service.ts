/**
 * Factory for game-level CombatService.
 *
 * Wraps the cooldown and hit-validation modules with lifecycle hooks
 * so games get automatic per-player state management & cleanup.
 */

import { Service, createLogger } from "@rbx/core";
import type { PlayerId } from "@rbx/shared-types";
import type {
  CooldownConfig,
  HitValidationConfig,
  PositionProvider,
  RaycastProvider,
  SuspiciousHitEvent,
  HitValidationResult,
} from "./types";
import { registerAbility, clearPlayerCooldowns, resetCooldowns } from "./cooldown";
import {
  configureHitValidation,
  setPositionProvider,
  setRaycastProvider,
  clearPlayerPosition,
  resetHitValidation,
  validateHit,
  onSuspiciousHit,
  onValidHit,
} from "./hit-validation";

// ============================================================================
// Config
// ============================================================================

export interface CombatServiceConfig {
  /** Ability/weapon definitions to register at init time. */
  abilities?: CooldownConfig[];

  /** Hit-validation tuning. */
  hitValidation?: Partial<HitValidationConfig>;

  /** Position provider (usually wired from movement system). */
  positionProvider?: PositionProvider;

  /** Raycast provider for server-side LOS checks. */
  raycastProvider?: RaycastProvider;

  /**
   * Called when a validated hit is confirmed. Wire damage application here.
   */
  onHit?: (result: HitValidationResult) => void;

  /**
   * Called when a suspicious hit pattern is detected.
   */
  onSuspicious?: (event: SuspiciousHitEvent) => void;

  /**
   * Wires player-leave cleanup.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerRemoving(cb)`
   */
  onPlayerRemoving?: (callback: (player: { UserId: number }) => void) => void;

  /**
   * Wires player-join initialization.
   * Typically: `(cb) => PlayerLifecycleService.onPlayerAdded(cb)`
   */
  onPlayerAdded?: (callback: (player: { UserId: number }) => void) => void;
}

// ============================================================================
// Handle
// ============================================================================

export interface CombatServiceHandle {
  /** Service lifecycle object (register with Application). */
  Service: Service;

  /**
   * Validate a hit intent server-side.
   * Convenience passthrough — games can also call `validateHit` directly.
   */
  validateHit: typeof validateHit;

  /** Initialise per-player combat state (called automatically if onPlayerAdded is provided). */
  initPlayer(playerId: PlayerId): void;

  /** Tear down per-player combat state (called automatically if onPlayerRemoving is provided). */
  cleanupPlayer(playerId: PlayerId): void;
}

// ============================================================================
// Factory
// ============================================================================

export function createCombatService(config: CombatServiceConfig): CombatServiceHandle {
  const logger = createLogger("CombatService");

  /** Tracks which players have been initialised so cleanup is safe. */
  const activePlayers = new Set<number>();

  // Unsubscribe handles for event listeners
  let unsubSuspicious: (() => void) | undefined;
  let unsubValidHit: (() => void) | undefined;

  const handle: CombatServiceHandle = {
    Service: {
      name: "CombatService",

      onInit() {
        // Register abilities
        if (config.abilities) {
          for (const ability of config.abilities) {
            registerAbility(ability);
          }
          logger.info(`Registered ${config.abilities.length} abilities`);
        }

        // Configure hit validation
        if (config.hitValidation) {
          configureHitValidation(config.hitValidation);
        }

        // Wire providers
        if (config.positionProvider) {
          setPositionProvider(config.positionProvider);
        }
        if (config.raycastProvider) {
          setRaycastProvider(config.raycastProvider);
        }

        // Subscribe to events
        if (config.onSuspicious) {
          unsubSuspicious = onSuspiciousHit(config.onSuspicious);
        }
        if (config.onHit) {
          const hitCb = config.onHit;
          unsubValidHit = onValidHit((event) => {
            hitCb(event);
          });
        }

        // Wire player-leave cleanup
        config.onPlayerRemoving?.((player) => {
          handle.cleanupPlayer(player.UserId as PlayerId);
        });

        logger.info("CombatService initialised");
      },

      onStart() {
        config.onPlayerAdded?.((player) => {
          handle.initPlayer(player.UserId as PlayerId);
        });
        logger.info("CombatService started");
      },

      onDestroy() {
        // Clean up all tracked players
        activePlayers.forEach((id) => {
          clearPlayerCooldowns(id as PlayerId);
          clearPlayerPosition(id as PlayerId);
        });
        activePlayers.clear();

        // Unsubscribe event listeners
        unsubSuspicious?.();
        unsubValidHit?.();

        // Reset module state
        resetCooldowns();
        resetHitValidation();

        logger.info("CombatService stopped");
      },
    },

    validateHit,

    initPlayer(playerId: PlayerId) {
      activePlayers.add(playerId as number);
      logger.debug(`Player ${playerId} combat state initialised`);
    },

    cleanupPlayer(playerId: PlayerId) {
      if (!activePlayers.has(playerId as number)) return;
      clearPlayerCooldowns(playerId);
      clearPlayerPosition(playerId);
      activePlayers.delete(playerId as number);
      logger.debug(`Player ${playerId} combat state cleaned up`);
    },
  };

  return handle;
}
