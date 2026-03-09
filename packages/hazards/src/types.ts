/**
 * @broblox/hazards — Types
 *
 * Defines hazard definitions, configs, and runtime state for
 * reusable environmental hazard systems.
 */

// ── Hazard Classification ──────────────────────────────────────────────

/** Broad category of hazard behaviour. */
export type HazardBehaviour =
  | "instant_kill" // contact → instant death
  | "damage_zone" // deals damage while player remains in zone
  | "timed_burst" // on/off cycle (e.g. fire jets)
  | "crumbling" // breaks after contact, respawns after cooldown
  | "contact_damage"; // single hit on touch, then cooldown

// ── Hazard Definition ──────────────────────────────────────────────────

/** Static definition of a hazard type. Registered once, shared by all instances. */
export interface HazardDefinition {
  /** Unique identifier, e.g. "lava_floor", "fire_jet" */
  readonly id: string;
  /** Human-readable name */
  readonly displayName: string;
  /** Behaviour category */
  readonly behaviour: HazardBehaviour;

  /**
   * Damage per activation.
   * - For `instant_kill`: ignored (kills regardless).
   * - For `damage_zone`: damage per tick.
   * - For `timed_burst`: damage per burst.
   * - For `contact_damage`: damage on touch.
   * - For `crumbling`: 0 (no damage — the fall kills).
   */
  readonly damage: number;

  /**
   * Interval between damage ticks (seconds).
   * Only used by `damage_zone` and `timed_burst`.
   */
  readonly tickInterval?: number;

  /**
   * For `timed_burst`: how long the burst is active (seconds).
   * For `crumbling`: how long until the platform breaks after first touch.
   */
  readonly activeDuration?: number;

  /**
   * For `timed_burst`: how long the hazard is off between bursts (seconds).
   * For `crumbling`: respawn delay after breaking (seconds).
   * For `contact_damage`: immunity window after hit (seconds).
   */
  readonly cooldownDuration?: number;

  /** CollectionService tag used to find instances of this hazard. */
  readonly tag: string;
}

// ── Per-Player Hazard State ────────────────────────────────────────────

/** Tracks per-player immunity / cooldown per hazard instance. */
export interface PlayerHazardState {
  /** Absolute timestamp when immunity expires (os.clock based). */
  immuneUntil: number;
}

// ── Per-Instance Hazard State ──────────────────────────────────────────

/** Runtime state for a single hazard instance in the world. */
export interface HazardInstanceState {
  /** Which definition this instance uses. */
  definitionId: string;
  /** Whether this instance is currently active (dealing damage). */
  active: boolean;
  /** Seconds remaining until next state toggle (for timed_burst / crumbling). Decremented by `update()` each frame. */
  nextToggleAt: number;
  /** For crumbling: whether the platform is broken. */
  broken?: boolean;
}

// ── Service Config ─────────────────────────────────────────────────────

/** Configuration for the hazard service factory. */
export interface HazardServiceConfig {
  /** Hazard definitions to register. */
  definitions: HazardDefinition[];

  /**
   * Apply damage to a player.
   *
   * This package is "pure-logic" and does not call `humanoid.TakeDamage`
   * or otherwise apply damage by itself. If this callback is not provided,
   * hazard contacts will not deal any damage (no-op).
   *
   * Implement this to integrate with your game's damage system. Return
   * `true` if the player died as a result of the damage.
   */
  onDamage?: (playerId: number, damage: number, hazardId: string) => boolean;

  /** Called when a hazard kills a player. */
  onKill?: (playerId: number, hazardId: string) => void;

  /** Called when a timed_burst / crumbling instance toggles state. */
  onToggle?: (instanceKey: string, active: boolean) => void;

  /** Wire into PlayerLifecycleService. */
  onPlayerRemoving?: (callback: (player: { UserId: number }) => void) => void;
}

// ── Handle ─────────────────────────────────────────────────────────────

/** Service lifecycle object compatible with Application.register(). */
export interface Service {
  name: string;
  onInit?(): void;
  onStart?(): void;
  onDestroy?(): void;
}

/** Returned by `createHazardService`. */
export interface HazardServiceHandle {
  Service: Service;
  getHazardRegistry(): HazardRegistry;
  getHazardManager(): HazardManager;
  initPlayer(playerId: number): void;
  cleanupPlayer(playerId: number): void;
}

// ── Registry & Manager interfaces ────────────────────────────────

/** Read-only hazard definition registry. */
export interface HazardRegistry {
  get(id: string): HazardDefinition | undefined;
  getAll(): HazardDefinition[];
  getByTag(tag: string): HazardDefinition | undefined;
  has(id: string): boolean;
  count(): number;
}

/** Runtime hazard manager — tracks instances and applies damage on tick. */
export interface HazardManager {
  /** Register a hazard instance at runtime. Returns instance key. */
  addInstance(definitionId: string, instanceKey: string): boolean;
  /** Remove a hazard instance. */
  removeInstance(instanceKey: string): boolean;
  /** Get active instance count. */
  instanceCount(): number;
  /** Advance hazard timers. Called every heartbeat with delta seconds. */
  update(deltaSec: number): void;

  /**
   * Process a player touching a hazard instance.
   * Returns true if damage was dealt or the player was killed.
   */
  processTouch(playerId: number, instanceKey: string, now: number): boolean;

  /** Check if a player is immune to a hazard instance. */
  isImmune(playerId: number, instanceKey: string, now: number): boolean;
}
