/**
 * @broblox/combat
 * Server-authoritative combat systems for PvP.
 *
 * **Integration status:**
 * - `setPositionProvider`, `resetPositionProvider`, `clearPlayerPosition` —
 *   integrated (CombatService wires movement positions)
 * - Cooldown system — integrated (test-park CombatService wires UseAbility remote)
 * - Hit validation — integrated (test-park CombatService wires ReportHit remote)
 */

// Types
export * from "./types";

// Cooldown system (wired via game-level CombatService → UseAbility remote)
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

// Hit validation (position provider + validateHit wired via game-level CombatService → ReportHit remote)
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

// Combat service factory
export * from "./create-combat-service";
