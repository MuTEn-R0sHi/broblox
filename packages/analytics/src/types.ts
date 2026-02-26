/**
 * @broblox/analytics — Type Definitions
 *
 * Types for event tracking, funnels, sessions, and retention.
 */

// ============================================================================
// Event Tracking
// ============================================================================

/** Dot-separated event category for namespace grouping */
export type EventCategory =
  | "player"
  | "match"
  | "economy"
  | "social"
  | "ui"
  | "progression"
  | "combat"
  | "custom";

/** A single analytics event */
export interface AnalyticsEvent {
  /** Dot-separated event name (e.g., "player.level_up") */
  name: string;
  /** Category for grouping/filtering */
  category: EventCategory;
  /** Player who triggered the event (0 for server events) */
  playerId: number;
  /** Key–value payload (privacy-safe, no PII) */
  data: Record<string, unknown>;
  /** Unix timestamp (os.time()) */
  timestamp: number;
  /** Server job ID for correlation */
  serverId: string;
}

/** Registered event definition with optional schema */
export interface EventDefinition {
  /** Unique event name */
  name: string;
  /** Category for grouping */
  category: EventCategory;
  /** Human-readable description */
  description: string;
  /** List of expected data field names (for validation warnings) */
  expectedFields?: string[];
  /** Version for schema evolution */
  version?: number;
}

// ============================================================================
// Funnel Tracking
// ============================================================================

/** A funnel is an ordered list of steps a player moves through */
export interface FunnelDefinition {
  /** Unique funnel identifier */
  name: string;
  /** Human-readable label */
  label: string;
  /** Ordered step names */
  steps: string[];
  /** Maximum seconds a player can spend in the funnel before timeout */
  timeoutSec?: number;
}

/** A player's progress through a funnel */
export interface FunnelProgress {
  /** Player user ID */
  playerId: number;
  /** Which step they reached (0-indexed) */
  currentStep: number;
  /** Timestamp when they entered the funnel */
  startedAt: number;
  /** Timestamp of last step advancement */
  lastStepAt: number;
  /** Has the player completed all steps? */
  completed: boolean;
  /** Has the funnel timed out for this player? */
  timedOut: boolean;
}

/** Aggregated funnel statistics */
export interface FunnelStats {
  /** Funnel name */
  funnel: string;
  /** Count of players who entered */
  entered: number;
  /** Count per step reached (index = step, value = count) */
  stepCounts: number[];
  /** Count of players who completed */
  completed: number;
  /** Conversion rate (completed / entered) */
  conversionRate: number;
}

// ============================================================================
// Session Tracking
// ============================================================================

/** Per-player session data */
export interface SessionData {
  /** Player user ID */
  playerId: number;
  /** Session start timestamp */
  startedAt: number;
  /** Last heartbeat timestamp */
  lastHeartbeat: number;
  /** Total playtime this session in seconds */
  playtimeSec: number;
  /** Whether the player is still connected */
  active: boolean;
  /** Custom session properties */
  properties: Record<string, unknown>;
}

// ============================================================================
// Retention
// ============================================================================

/** Retention time windows to check */
export type RetentionDay = 1 | 7 | 14 | 30;

/** Per-player retention record (stored in DataStore) */
export interface RetentionRecord {
  /** First seen timestamp (unix) */
  firstSeen: number;
  /** Array of day-offsets when the player returned */
  returnDays: number[];
  /** Total lifetime sessions */
  totalSessions: number;
  /** Total lifetime playtime in seconds */
  totalPlaytimeSec: number;
}

// ============================================================================
// Analytics Config
// ============================================================================

/** Configuration for the analytics system */
export interface AnalyticsConfig {
  /** DataStore name for retention data */
  datastoreName: string;
  /** How often to emit session heartbeats (seconds, default 60) */
  heartbeatInterval: number;
  /** Enable debug logging */
  enableLogging: boolean;
  /** Forward events to @broblox/observability telemetry sinks */
  forwardToTelemetry: boolean;
  /** Callback when an event is tracked */
  onEvent?: (event: AnalyticsEvent) => void;
  /** Callback when a funnel completes */
  onFunnelComplete?: (funnel: string, playerId: number, durationSec: number) => void;
}

/** Default analytics configuration */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  datastoreName: "AnalyticsRetention",
  heartbeatInterval: 60,
  enableLogging: true,
  forwardToTelemetry: true,
};
