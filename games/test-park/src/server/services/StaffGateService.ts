/**
 * Staff Gate Service
 *
 * Restricts the test park to authorized staff only.
 *
 * On each player join the service checks if the player's UserId
 * appears in STAFF_IDS. If not, they are kicked with a friendly message.
 *
 * To grant access: add the Roblox UserId to STAFF_IDS below.
 *
 * NOTE: This is intentionally simple. For production you might check a
 * Roblox group rank or an external allowlist, but for an internal test
 * park a static list is the most reliable and fastest option.
 */

import { Service, createLogger } from "@broblox/core";
import { Players } from "@rbxts/services";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("StaffGateService");

// =========================================================================
// Configuration
// =========================================================================

/**
 * Roblox UserIds of staff who may enter the test park.
 * Add / remove entries here — the gate adapts automatically.
 */
const STAFF_IDS: ReadonlySet<number> = new Set([
  // ──────────────── Add your team's UserIds below ────────────────
  // 123456789,  // ExampleDev
  // 987654321,  // ExampleQA
]);

/**
 * If true, the gate is disabled and everyone is allowed in.
 * Useful during development when testing with arbitrary accounts.
 * Set to `false` before publishing to a shared environment.
 */
const GATE_DISABLED = true;

/** Kick message shown to non-staff. */
const KICK_MESSAGE =
  "This is a staff-only test park. If you believe you should have access, " +
  "contact the development team.";

// =========================================================================
// Service
// =========================================================================

export const StaffGateService: Service = {
  onInit() {
    if (GATE_DISABLED) {
      logger.warn(
        "⚠️  Staff gate is DISABLED — all players allowed. Set GATE_DISABLED = false to enforce."
      );
      return;
    }

    logger.info(`Staff gate active — ${STAFF_IDS.size()} authorised user(s).`);

    // Check players that are already in the server (edge case on late service boot)
    for (const player of Players.GetPlayers()) {
      if (!STAFF_IDS.has(player.UserId)) {
        logger.warn(`Kicking unauthorized player: ${player.Name} (${player.UserId})`);
        player.Kick(KICK_MESSAGE);
      }
    }
  },

  onStart() {
    if (GATE_DISABLED) return;

    // Gate future joins via the lifecycle bus
    PlayerLifecycleService.onPlayerAdded((player: Player) => {
      if (!STAFF_IDS.has(player.UserId)) {
        logger.warn(`Kicking unauthorized player: ${player.Name} (${player.UserId})`);
        player.Kick(KICK_MESSAGE);
      } else {
        logger.info(`Staff member joined: ${player.Name} (${player.UserId})`);
      }
    });
  },
};
