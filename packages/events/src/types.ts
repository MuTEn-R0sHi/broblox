/**
 * @broblox/events — Type Definitions
 *
 * Types for scheduled in-game events, modifiers, and callbacks.
 */

// ============================================================================
// Event Modifiers
// ============================================================================

/**
 * Gameplay modifiers applied while an event is active.
 * All fields are optional multipliers; the game applies whichever it needs.
 */
export interface EventModifiers {
  /** Experience multiplier (e.g. 2 = double XP). */
  xpMultiplier?: number;
  /** Drop-rate multiplier (e.g. 1.5 = 50 % more drops). */
  dropRateMultiplier?: number;
  /** Coin/currency multiplier (e.g. 2 = double coins). */
  coinMultiplier?: number;
  /** Catch-all for game-specific modifiers. */
  [key: string]: unknown;
}

// ============================================================================
// Event Definition
// ============================================================================

/**
 * Describes a single timed event.
 *
 * @example
 * ```ts
 * const doubleXpWeekend: EventDefinition = {
 *   id: "double-xp-weekend-2026-02",
 *   label: "Double XP Weekend",
 *   startTime: 1740700800, // Unix seconds
 *   endTime:   1740873600,
 *   modifiers: { xpMultiplier: 2 },
 * };
 * ```
 */
export interface EventDefinition {
  /** Unique stable identifier. */
  id: string;
  /** Human-readable display name. */
  label: string;
  /** When the event becomes active (Unix seconds via `os.time()`). */
  startTime: number;
  /** When the event expires (exclusive, Unix seconds). */
  endTime: number;
  /** Optional gameplay modifiers active during this event. */
  modifiers?: EventModifiers;
  /**
   * Optional feature-flag ID.  When provided the event only activates if
   * `isFlagEnabled(featureFlagId)` returns `true`.
   */
  featureFlagId?: string;
}

// ============================================================================
// Callbacks
// ============================================================================

/** Called when an event transitions from inactive → active. */
export type EventStartCallback = (event: EventDefinition) => void;

/** Called when an event transitions from active → inactive. */
export type EventEndCallback = (event: EventDefinition) => void;

// ============================================================================
// Scheduler tick result
// ============================================================================

export interface EventTickResult {
  /** Events that became active this tick. */
  started: EventDefinition[];
  /** Events that became inactive this tick. */
  ended: EventDefinition[];
}
