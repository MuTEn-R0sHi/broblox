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

// Hit validation
export {
  // Configuration
  configureHitValidation,
  getHitValidationConfig,
  resetHitValidationConfig,
  // Player management
  updatePlayerPosition,
  getPlayerPosition,
  clearPlayerPosition,
  setInvulnerable,
  isInvulnerable,
  // Core validation
  validateHit,
  isInLagWindow,
  // Suspicious pattern tracking
  getSuspiciousHitCount,
  resetSuspiciousHitCount,
  // Event listeners
  onSuspiciousHit,
  onValidHit,
  // Testing
  resetHitValidation,
} from "./hit-validation";
