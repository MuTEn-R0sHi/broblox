/**
 * Player Session Management
 *
 * Manages player sessions with auto-save and cleanup.
 */

import { createLogger } from "@broblox/core";
import { VersionedData, SessionState, PlayerSession, DataMetadata } from "./types";
import { PlayerDataStore } from "./player-data-store";

const logger = createLogger("SessionManager");

// Declare Roblox globals
declare const game: {
  JobId: string;
};

// ============================================================================
// Session Implementation
// ============================================================================

class SessionImpl<T extends VersionedData> implements PlayerSession<T> {
  readonly sessionId: string;
  state: SessionState = "active";
  private _dirty = false;

  constructor(
    readonly player: Player,
    public data: T,
    public metadata: DataMetadata
  ) {
    this.sessionId = metadata.sessionId ?? this.generateSessionId();
    this.metadata.sessionId = this.sessionId;
  }

  markDirty(): void {
    this._dirty = true;
  }

  isDirty(): boolean {
    return this._dirty;
  }

  clearDirty(): void {
    this._dirty = false;
  }

  private generateSessionId(): string {
    return `${game.JobId}_${os.time()}_${math.random(1000, 9999)}`;
  }
}

// ============================================================================
// Session Manager
// ============================================================================

/**
 * Manages all player sessions for a data store.
 */
export class SessionManager<T extends VersionedData> {
  private sessions = new Map<number, SessionImpl<T>>();
  private autoSaveThread?: thread;
  private autoSaveInterval: number;

  constructor(
    private store: PlayerDataStore<T>,
    autoSaveIntervalSec = 60
  ) {
    this.autoSaveInterval = autoSaveIntervalSec;
  }

  /**
   * Start a session for a player.
   * Loads their data from the store.
   */
  startSession(player: Player): PlayerSession<T> | undefined {
    // Check if session already exists
    if (this.sessions.has(player.UserId)) {
      logger.warn(`Session already exists for ${player.Name}`);
      return this.sessions.get(player.UserId);
    }

    // Load player data
    const result = this.store.load(player);
    if (!result.ok) {
      logger.error(`Failed to load data for ${player.Name}: ${result.message}`);
      return undefined;
    }

    const session = new SessionImpl(player, result.value.data, result.value.metadata);
    this.sessions.set(player.UserId, session);
    logger.debug(`Session started for ${player.Name} (${session.sessionId})`);

    return session;
  }

  /**
   * End a player's session.
   * Saves data and cleans up.
   */
  endSession(player: Player): void {
    const session = this.sessions.get(player.UserId);
    if (!session) {
      return;
    }

    session.state = "closing";

    // Final save if dirty
    if (session.isDirty() || this.store.isDirty(player)) {
      const result = this.store.save(player);
      if (!result.ok) {
        logger.error(`Failed to save data for ${player.Name}: ${result.message}`);
      }
    }

    this.store.unload(player);
    session.state = "closed";
    this.sessions.delete(player.UserId);
    logger.debug(`Session ended for ${player.Name}`);
  }

  /**
   * Get a player's active session.
   */
  getSession(player: Player): PlayerSession<T> | undefined {
    return this.sessions.get(player.UserId);
  }

  /**
   * Check if a player has an active session.
   */
  hasSession(player: Player): boolean {
    return this.sessions.has(player.UserId);
  }

  /**
   * Save a specific player's session.
   */
  saveSession(player: Player): boolean {
    const session = this.sessions.get(player.UserId);
    if (!session || session.state !== "active") {
      return false;
    }

    session.state = "saving";
    const result = this.store.save(player);
    session.state = "active";

    if (result.ok) {
      session.clearDirty();
      return true;
    }

    logger.error(`Failed to save session for ${player.Name}: ${result.message}`);
    return false;
  }

  /**
   * Save all dirty sessions.
   */
  saveAllDirty(): number {
    let saved = 0;
    this.sessions.forEach((session, _userId) => {
      if (session.state === "active" && (session.isDirty() || this.store.isDirty(session.player))) {
        if (this.saveSession(session.player)) {
          saved += 1;
        }
      }
    });
    return saved;
  }

  /**
   * Start auto-save loop.
   */
  startAutoSave(): void {
    if (this.autoSaveThread) {
      return;
    }

    this.autoSaveThread = task.spawn(() => {
      while (this.autoSaveThread !== undefined) {
        task.wait(this.autoSaveInterval);
        const saved = this.saveAllDirty();
        if (saved > 0) {
          logger.debug(`Auto-saved ${saved} session(s)`);
        }
      }
    });

    logger.info(`Auto-save started (${this.autoSaveInterval}s interval)`);
  }

  /**
   * Stop auto-save loop.
   */
  stopAutoSave(): void {
    if (this.autoSaveThread) {
      task.cancel(this.autoSaveThread);
      this.autoSaveThread = undefined;
      logger.info("Auto-save stopped");
    }
  }

  /**
   * Close all sessions (for server shutdown).
   */
  closeAll(): void {
    this.stopAutoSave();

    this.sessions.forEach((session) => {
      session.state = "closing";

      if (session.isDirty() || this.store.isDirty(session.player)) {
        this.store.save(session.player);
      }

      this.store.unload(session.player);
      session.state = "closed";
    });

    this.sessions.clear();
    logger.info("All sessions closed");
  }

  /**
   * Get count of active sessions.
   */
  getSessionCount(): number {
    return this.sessions.size();
  }
}

/**
 * Creates a session manager for a data store.
 */
export function createSessionManager<T extends VersionedData>(
  store: PlayerDataStore<T>,
  autoSaveIntervalSec?: number
): SessionManager<T> {
  return new SessionManager(store, autoSaveIntervalSec);
}
