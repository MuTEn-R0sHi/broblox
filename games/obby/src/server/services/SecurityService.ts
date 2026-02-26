/**
 * Security Service
 *
 * Boots the @broblox/security enforcement pipeline:
 *   reportViolation (any code) → onViolation bus → Enforcer → kick/shadow/warn
 *
 * Cleanup of per-player detector + enforcement state is wired automatically
 * via onPlayerRemoving.
 */

import { createSecurityService } from "@broblox/security";
import { getModeration } from "@broblox/moderation";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createSecurityService({
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  enforcementConfig: {
    onBan: (player, banType, reason, durationHours) => {
      getModeration("ObbyModeration").ban({
        playerId: player.UserId,
        playerName: player.Name,
        type: banType,
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
