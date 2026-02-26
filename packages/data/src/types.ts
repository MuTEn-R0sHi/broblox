/**
 * Data persistence types
 */

import { Result } from "@broblox/shared-types";

// ============================================================================
// Schema & Versioning
// ============================================================================

/**
 * Base interface for all stored data.
 * Includes version for migrations.
 */
export interface VersionedData {
  /** Data schema version */
  readonly __version: number;
}

/**
 * Migration function to upgrade data from one version to another.
 */
export type Migration<TFrom, TTo> = (data: TFrom) => TTo;

/**
 * Migration chain for upgrading through versions.
 * Keys are "fromVersion_toVersion" format.
 */
export type MigrationChain = Map<string, Migration<unknown, unknown>>;

// ============================================================================
// Store Configuration
// ============================================================================

export interface StoreConfig<T extends VersionedData> {
  /** DataStore name */
  name: string;

  /** Current schema version */
  version: number;

  /** Default data for new players */
  defaultData: () => T;

  /** Migration chain */
  migrations?: MigrationChain;

  /** Retry configuration */
  retry?: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  };
}

// ============================================================================
// Data Store Types
// ============================================================================

export interface DataStoreResult<T> {
  data: T;
  metadata: DataMetadata;
}

export interface DataMetadata {
  /** Last save timestamp (os.time()) */
  lastSave: number;
  /** Number of times data was saved */
  saveCount: number;
  /** Session ID that owns this data */
  sessionId?: string;
  /** Server JobId that owns this data */
  serverId?: string;
}

// ============================================================================
// Operation Results
// ============================================================================

export type LoadResult<T> = Result<DataStoreResult<T>>;
export type SaveResult = Result<{ savedAt: number }>;

// ============================================================================
// Session Types
// ============================================================================

export type SessionState = "active" | "saving" | "closing" | "closed";

export interface PlayerSession<T extends VersionedData> {
  /** Player reference */
  readonly player: Player;
  /** Unique session ID */
  readonly sessionId: string;
  /** Current session state */
  state: SessionState;
  /** Player data (mutable) */
  data: T;
  /** Metadata about the data */
  metadata: DataMetadata;

  /** Mark data as dirty (needs save) */
  markDirty(): void;
  /** Check if data needs saving */
  isDirty(): boolean;
}
