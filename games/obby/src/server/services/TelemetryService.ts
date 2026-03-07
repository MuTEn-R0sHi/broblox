/**
 * Telemetry Service — Obby Game
 *
 * Emits structured telemetry events for key player actions using
 * the @broblox/observability package. Requires ObservabilityService
 * to be registered first (sinks must be active before events fire).
 *
 * Events emitted:
 * - player:player_joined      — when a player joins
 * - player:player_left        — when a player leaves
 * - player:player_death       — when a player dies (via remote)
 * - player:stage_completed    — when a stage is completed (via remote)
 * - economy:purchase_granted  — when a developer product purchase succeeds
 * - game:server_started       — when the service starts
 *
 * Metrics tracked:
 * - game.players_online (gauge)
 * - game.purchases_total (counter)
 * - game.stage_completions (counter)
 * - game.player_deaths (counter)
 */

import { Service, createLogger } from "@broblox/core";
import { emitPlayer, emitGame } from "@broblox/observability";
import { Counter, Gauge } from "@broblox/observability";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("TelemetryService");

// ============================================================================
// Metrics
// ============================================================================

const playersOnline = new Gauge("game.players_online");
const purchasesTotal = new Counter("game.purchases_total");
const stageCompletions = new Counter("game.stage_completions");
const playerDeaths = new Counter("game.player_deaths");

// ============================================================================
// Public helpers (other services can call these)
// ============================================================================

/**
 * Record a successful purchase event.
 */
export function trackPurchase(
  player: Player,
  productName: string,
  productId: number,
  robuxPrice: number
): void {
  emitPlayer(player, "purchase_granted", {
    productName,
    productId,
    robuxPrice,
  });
  purchasesTotal.inc();
}

/**
 * Record a stage completion.
 */
export function trackStageComplete(
  player: Player,
  stageNumber: number,
  completionTime: number,
  isNewBest: boolean
): void {
  emitPlayer(player, "stage_completed", {
    stageNumber,
    completionTime,
    isNewBest,
  });
  stageCompletions.inc();
}

/**
 * Record a player death.
 */
export function trackPlayerDeath(player: Player, stageNumber: number, cause: string): void {
  emitPlayer(player, "player_death", {
    stageNumber,
    cause,
  });
  playerDeaths.inc();
}

// ============================================================================
// Service
// ============================================================================

export const TelemetryService: Service = {
  name: "TelemetryService",

  onStart() {
    // ── Player join ───────────────────────────────────────────────────
    PlayerLifecycleService.onPlayerAdded((player) => {
      playersOnline.set(playersOnline.get() + 1);
      emitPlayer(player, "player_joined", {
        userId: player.UserId,
        playerName: player.Name,
      });
      logger.debug(`Telemetry: player_joined ${player.Name}`);
    });

    // ── Player leave ──────────────────────────────────────────────────
    PlayerLifecycleService.onPlayerRemoving((player) => {
      playersOnline.set(math.max(0, playersOnline.get() - 1));
      emitPlayer(player, "player_left", {
        userId: player.UserId,
        playerName: player.Name,
      });
      logger.debug(`Telemetry: player_left ${player.Name}`);
    });

    // ── Server started ────────────────────────────────────────────────
    emitGame("server_started", {
      game: "obby",
      timestamp: os.time(),
    });

    logger.info("TelemetryService started — lifecycle hooks registered.");
  },
};
