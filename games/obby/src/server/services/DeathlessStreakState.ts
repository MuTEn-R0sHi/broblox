/**
 * Deathless Streak State
 *
 * Shared module that owns the deathless-stages tracking map.
 * Extracted to break the circular dependency between CheckpointService
 * and StageService — both need to mutate the streak map.
 */

/** playerId → consecutive deathless stages */
const deathlessStreaks = new Map<number, number>();

/** Reset the deathless streak to 0 (called on player death). */
export function resetDeathlessStreak(playerId: number): void {
  deathlessStreaks.set(playerId, 0);
}

/** Increment the streak by 1 and return the new value. */
export function incrementDeathlessStreak(playerId: number): number {
  const streak = (deathlessStreaks.get(playerId) ?? 0) + 1;
  deathlessStreaks.set(playerId, streak);
  return streak;
}

/** Remove a player's streak entry (cleanup on leave). */
export function deleteDeathlessStreak(playerId: number): void {
  deathlessStreaks.delete(playerId);
}

/** Clear all streak data (cleanup on destroy). */
export function clearDeathlessStreaks(): void {
  deathlessStreaks.clear();
}
