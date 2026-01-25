/**
 * @rbx/combat
 * Server-authoritative combat systems for PvP.
 */

// Types
export * from "./types";

// Cooldown system
export {
  // Configuration
  registerAbility,
  getAbilityConfig,
  getRegisteredAbilities,
  // Core API
  useAbility,
  isOnCooldown,
  getRemainingCooldown,
  getCooldownState,
  getAvailableCharges,
  // Manual control
  startCooldown,
  resetCooldown,
  resetAllCooldowns,
  clearPlayerCooldowns,
  // Event listeners
  onCooldownStarted,
  onCooldownEnded,
  onAbilityRejected,
  // Testing
  resetCooldowns,
} from "./cooldown";
