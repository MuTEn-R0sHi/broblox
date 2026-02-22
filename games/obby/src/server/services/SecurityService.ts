/**
 * Security Service
 *
 * Boots the @rbx/security enforcement pipeline:
 *   reportViolation (any code) → onViolation bus → Enforcer → kick/shadow/warn
 *
 * Cleanup of per-player detector + enforcement state is wired automatically
 * via onPlayerRemoving.
 */

import { createSecurityService } from "@rbx/security";
import { getModeration } from "@rbx/moderation";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createSecurityService({
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  enforcementConfig: {
    onBan: (player, type, reason, durationHours) => {
      getModeration("ObbyModeration").ban({
        playerId: player.UserId,
        playerName: player.Name,
        type,
        reason,
        durationHours,
        moderatorId: "system:security",
      });
    },
  },
});

export const SecurityService = handle.Service;

/** Exposed for use in other services that need direct enforcer access. */
export const enforcer = handle.getEnforcer();
