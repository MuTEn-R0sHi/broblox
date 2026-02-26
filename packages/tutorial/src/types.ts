/**
 * @broblox/tutorial — Type Definitions
 *
 * Types for tutorial steps, sequences, conditions, and FTUE tracking.
 */

// ============================================================================
// Tutorial Steps
// ============================================================================

/** Types of tutorial actions */
export type StepType =
  | "dialog" // Show a dialog/tooltip message
  | "highlight" // Highlight a UI element
  | "action" // Wait for player to perform an action
  | "teleport" // Move player to a location
  | "delay" // Wait for a duration
  | "checkpoint" // Save progress checkpoint
  | "custom"; // Custom step handled by callback

/** Condition that must be met to advance */
export interface StepCondition {
  type: "action" | "timeout" | "manual" | "event";
  /** For action: the action ID to wait for */
  actionId?: string;
  /** For timeout: seconds to wait */
  timeoutSeconds?: number;
  /** For event: the event name to listen for */
  eventName?: string;
}

/** A single tutorial step */
export interface TutorialStep {
  /** Unique step identifier */
  id: string;
  /** Step type determines rendering */
  stepType: StepType;
  /** Title shown to the player */
  title?: string;
  /** Body text / instructions */
  message?: string;
  /** Condition to advance to next step */
  condition: StepCondition;
  /** Whether the player can skip this step */
  skippable: boolean;
  /** Optional metadata for custom rendering */
  metadata?: Record<string, unknown>;
  /** Optional delay before showing the step (seconds) */
  delayBefore?: number;
}

/** A complete tutorial sequence */
export interface TutorialSequence {
  /** Unique sequence identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description of what this tutorial teaches */
  description?: string;
  /** Ordered list of steps */
  steps: TutorialStep[];
  /** Whether the entire sequence can be skipped */
  skippable: boolean;
  /** Whether to save progress if player leaves mid-tutorial */
  persistent: boolean;
  /** Prerequisites: other sequence IDs that must be completed first */
  prerequisites: string[];
  /** Optional version for invalidating stale progress */
  version: number;
}

// ============================================================================
// Player Progress
// ============================================================================

/** Per-player tutorial progress */
export interface TutorialProgress {
  /** Completed sequence IDs */
  completedSequences: string[];
  /** Currently active sequence ID (if any) */
  activeSequenceId?: string;
  /** Current step index in active sequence */
  activeStepIndex: number;
  /** Skipped sequences */
  skippedSequences: string[];
  /** Total steps completed across all tutorials */
  totalStepsCompleted: number;
  /** Timestamp of last tutorial activity */
  lastActivityAt: number;
  /** Data version */
  version: number;
}

// ============================================================================
// Configuration
// ============================================================================

export interface TutorialConfig {
  /** Whether to show tutorials automatically for new players */
  autoStart: boolean;
  /** Whether to allow skipping all tutorials */
  allowSkipAll: boolean;
  /** Whether to enable logging */
  enableLogging: boolean;
  /** Default delay between steps (seconds) */
  defaultStepDelay: number;
  /** DataStore name for persisting progress */
  datastoreName: string;
}

export const DEFAULT_TUTORIAL_CONFIG: TutorialConfig = {
  autoStart: true,
  allowSkipAll: false,
  enableLogging: false,
  defaultStepDelay: 0.5,
  datastoreName: "TutorialProgress_v1",
};

// ============================================================================
// Results
// ============================================================================

export type TutorialStatus =
  | "success"
  | "sequence_not_found"
  | "already_active"
  | "no_active_sequence"
  | "prerequisites_not_met"
  | "sequence_completed"
  | "sequence_skipped"
  | "step_not_found"
  | "not_skippable"
  | "already_completed";

export interface TutorialResult {
  ok: boolean;
  status: TutorialStatus;
  sequenceId?: string;
  stepId?: string;
}

// ============================================================================
// Callbacks
// ============================================================================

export interface StepStartedEvent {
  playerId: number;
  sequenceId: string;
  stepId: string;
  stepIndex: number;
  stepType: StepType;
  timestamp: number;
}

export interface StepCompletedEvent {
  playerId: number;
  sequenceId: string;
  stepId: string;
  stepIndex: number;
  timestamp: number;
}

export interface SequenceCompletedEvent {
  playerId: number;
  sequenceId: string;
  totalSteps: number;
  skipped: boolean;
  timestamp: number;
}

export type StepStartedCallback = (event: StepStartedEvent) => void;
export type StepCompletedCallback = (event: StepCompletedEvent) => void;
export type SequenceCompletedCallback = (event: SequenceCompletedEvent) => void;
