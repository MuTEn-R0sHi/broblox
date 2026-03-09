/**
 * Player World State
 *
 * Shared module that owns the player → active world tracking map.
 * Extracted to break circular dependencies between WorldService,
 * StageService, and CheckpointService — all need to read/write
 * the player's current world.
 */

/** userId → worldId (absent = player is in the Hub) */
const playerWorlds = new Map<number, string>();

/** Get the player's current world ID (undefined = hub). */
export function getPlayerWorldId(userId: number): string | undefined {
  return playerWorlds.get(userId);
}

/** Set the player's active world (undefined to clear / return to hub). */
export function setPlayerWorld(userId: number, worldId: string | undefined): void {
  if (worldId === undefined) {
    playerWorlds.delete(userId);
  } else {
    playerWorlds.set(userId, worldId);
  }
}

/** Remove a player's entry (cleanup on leave). */
export function deletePlayerWorld(userId: number): void {
  playerWorlds.delete(userId);
}

/** Clear all entries (cleanup on destroy). */
export function clearPlayerWorlds(): void {
  playerWorlds.clear();
}
