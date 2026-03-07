/**
 * Telemetry Service — Test Park
 *
 * Emits structured telemetry events for key player actions using
 * the @broblox/observability package. Requires ObservabilityService
 * to be registered first (sinks must be active before events fire).
 *
 * Events emitted:
 * - player:player_joined   — when a player joins and data is ready
 * - player:player_left     — when a player leaves
 * - economy:purchase_granted — when a developer product purchase succeeds
 * - game:server_started    — when the service starts
 *
 * Metrics tracked:
 * - game.players_online (gauge)
 * - game.purchases_total (counter)
 * - game.coins_spent (counter)
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
const coinsSpent = new Counter("game.coins_spent");

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
 * Record a coin spend event.
 */
export function trackCoinSpend(player: Player, amount: number, reason: string): void {
  emitPlayer(player, "coins_spent", { amount, reason });
  coinsSpent.add(amount);
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
      game: "test-park",
      timestamp: os.time(),
    });

    logger.info("TelemetryService started — lifecycle hooks registered.");
  },
};
