/**
 * @broblox/obstacles — Types
 *
 * Defines obstacle definitions, configs, and runtime state for
 * reusable dynamic obstacle systems.
 */

// ── Obstacle Classification ────────────────────────────────────────────

/** Broad category of obstacle behaviour. */
export type ObstacleBehaviour =
  | "moving_platform" // oscillates between two positions
  | "rotating_beam" // rotates continuously around an axis
  | "timed_sequence" // appears/disappears on a cycle
  | "conveyor"; // pushes players in a direction

// ── Obstacle Definition ────────────────────────────────────────────────

/** Static definition of an obstacle type. Registered once, shared by all instances. */
export interface ObstacleDefinition {
  /** Unique identifier, e.g. "slow_platform", "fast_spinner" */
  readonly id: string;
  /** Human-readable name */
  readonly displayName: string;
  /** Behaviour category */
  readonly behaviour: ObstacleBehaviour;

  /**
   * Movement speed factor (units/sec for moving, degrees/sec for rotating).
   * - For `moving_platform`: travel speed in studs/sec.
   * - For `rotating_beam`: rotation speed in degrees/sec.
   * - For `conveyor`: push speed in studs/sec.
   * - For `timed_sequence`: unused.
   */
  readonly speed?: number;

  /**
   * For `moving_platform`: travel distance in studs from origin.
   * The platform oscillates between origin and origin + distance along its axis.
   */
  readonly distance?: number;

  /**
   * For `timed_sequence`: how long the platform is visible/solid (seconds).
   */
  readonly activeDuration?: number;

  /**
   * For `timed_sequence`: how long the platform is hidden/intangible (seconds).
   */
  readonly cooldownDuration?: number;

  /**
   * For `timed_sequence`: phase offset (0–1). Allows staggering multiple
   * platforms in a sequence so they don't all disappear at once.
   */
  readonly phaseOffset?: number;

  /** CollectionService tag used to find instances of this obstacle. */
  readonly tag: string;
}

// ── Per-Instance State ─────────────────────────────────────────────────

/** Runtime state for a single obstacle instance in the world. */
export interface ObstacleInstanceState {
  /** Which definition this instance uses. */
  definitionId: string;

  /**
   * Normalised progress [0, 1] along the movement path.
   * - For `moving_platform`: 0 = origin, 1 = destination. Ping-pongs.
   * - For `rotating_beam`: cumulative rotation (wraps at 360).
   * - For `timed_sequence`: phase timer progress.
   * - For `conveyor`: unused (always 0).
   */
  progress: number;

  /**
   * Direction of travel for oscillating obstacles.
   * +1 = forward, -1 = backward.
   */
  direction: 1 | -1;

  /** Whether the obstacle is currently visible/solid (for timed_sequence). */
  active: boolean;
}

// ── Service Config ─────────────────────────────────────────────────────

/** Configuration for the obstacle service factory. */
export interface ObstacleServiceConfig {
  /** Obstacle definitions to register. */
  definitions: ObstacleDefinition[];

  /**
   * Called each frame with per-instance position updates.
   * The game layer uses this to apply CFrame/transparency changes.
   *
   * @param instanceKey — unique key for this obstacle instance
   * @param progress — normalised progress [0, 1]
   * @param active — whether the obstacle is currently solid/visible
   */
  onUpdate?: (instanceKey: string, progress: number, active: boolean) => void;

  /** Called when a timed_sequence obstacle toggles visibility. */
  onToggle?: (instanceKey: string, active: boolean) => void;
}

// ── Handle ─────────────────────────────────────────────────────────────

/** Service lifecycle object compatible with Application.register(). */
export interface Service {
  name: string;
  onInit?(): void;
  onStart?(): void;
  onDestroy?(): void;
}

/** Returned by `createObstacleService`. */
export interface ObstacleServiceHandle {
  Service: Service;
  getObstacleRegistry(): ObstacleRegistry;
  getObstacleManager(): ObstacleManager;
}

// ── Registry & Manager interfaces ──────────────────────────────────────

/** Read-only obstacle definition registry. */
export interface ObstacleRegistry {
  get(id: string): ObstacleDefinition | undefined;
  getAll(): ObstacleDefinition[];
  getByTag(tag: string): ObstacleDefinition | undefined;
  has(id: string): boolean;
  count(): number;
}

/** Runtime obstacle manager — tracks instances and drives movement each frame. */
export interface ObstacleManager {
  /** Register an obstacle instance at runtime. Returns true if added. */
  addInstance(definitionId: string, instanceKey: string): boolean;
  /** Remove an obstacle instance. */
  removeInstance(instanceKey: string): boolean;
  /** Get active instance count. */
  instanceCount(): number;
  /** Get the current state of an instance. */
  getInstanceState(instanceKey: string): ObstacleInstanceState | undefined;
  /** Advance all obstacle timers/positions. Called every heartbeat with delta seconds. */
  update(deltaSec: number): void;
}
