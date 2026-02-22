/**
 * @rbx/combat
 * Server-authoritative combat systems for PvP.
 *
 * **Integration status:**
 * - `setPositionProvider`, `resetPositionProvider`, `clearPlayerPosition` —
 *   integrated (CombatService wires movement positions)
 * - Cooldown system, hit validation core — @planned (tested internally,
 *   not yet wired to damage/ability remotes)
 */

// Types
export * from "./types";

// Cooldown system — @planned: wire to ability remotes
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

// Hit validation — partially integrated (position provider wired),
// @planned: wire validateHit to damage remote handler
export {
  // Configuration
  configureHitValidation,
  getHitValidationConfig,
  resetHitValidationConfig,
  // Position management
  setPositionProvider,
  resetPositionProvider,
  setRaycastProvider,
  resetRaycastProvider,
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
