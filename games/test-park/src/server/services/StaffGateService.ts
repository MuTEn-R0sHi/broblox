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
import { defineFlag, isFlagEnabled } from "@broblox/config-featureflags";
import { Players } from "@rbxts/services";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const logger = createLogger("StaffGateService");

// =========================================================================
// Configuration
// =========================================================================

/**
 * Feature flag that disables the staff gate, allowing everyone in.
 *
 * Defaults to `false` (gate enforced). Set to `true` via the dashboard
 * or a remote snapshot during development when testing with arbitrary accounts.
 */
const STAFF_GATE_DISABLED_FLAG = defineFlag({
  name: "test_park.staff_gate_disabled",
  defaultValue: false,
  description:
    "When enabled, the staff-only gate is bypassed and all players may join the test park.",
  category: "security",
});

/**
 * Roblox UserIds of staff who may enter the test park.
 * Add / remove entries here — the gate adapts automatically.
 *
 * IMPORTANT: At least one UserId must be listed here before enabling
 * the gate in a shared environment, otherwise every player will be kicked.
 */
const STAFF_IDS: ReadonlySet<number> = new Set([
  // ──────────────── Add your team's UserIds below ────────────────
  // 123456789,  // ExampleDev
  // 987654321,  // ExampleQA
]);

/** Kick message shown to non-staff. */
const KICK_MESSAGE =
  "This is a staff-only test park. If you believe you should have access, " +
  "contact the development team.";

// =========================================================================
// Service
// =========================================================================

export const StaffGateService: Service = {
  onInit() {
    if (isFlagEnabled(STAFF_GATE_DISABLED_FLAG.name)) {
      logger.warn(
        "⚠️  Staff gate is DISABLED — all players allowed. Disable the 'test_park.staff_gate_disabled' flag to enforce."
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
    if (isFlagEnabled(STAFF_GATE_DISABLED_FLAG.name)) return;

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
