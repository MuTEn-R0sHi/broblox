/**
 * @broblox/obstacles — Obstacle Registry
 *
 * Immutable registry of obstacle definitions. Built once during service init,
 * queried at runtime by the obstacle manager.
 */

import type { ObstacleDefinition, ObstacleRegistry } from "./types";

/** Create an obstacle registry from an array of definitions. */
export function createObstacleRegistry(definitions: ObstacleDefinition[]): ObstacleRegistry {
  const byId = new Map<string, ObstacleDefinition>();
  const byTag = new Map<string, ObstacleDefinition>();

  for (const def of definitions) {
    if (byId.has(def.id)) {
      error(`Duplicate obstacle id: ${def.id}`);
    }
    if (byTag.has(def.tag)) {
      error(`Duplicate obstacle tag: ${def.tag}`);
    }
    byId.set(def.id, def);
    byTag.set(def.tag, def);
  }

  return {
    get(id: string) {
      return byId.get(id);
    },
    getAll() {
      const result: ObstacleDefinition[] = [];
      byId.forEach((d) => result.push(d));
      return result;
    },
    getByTag(tag: string) {
      return byTag.get(tag);
    },
    has(id: string) {
      return byId.has(id);
    },
    count() {
      let n = 0;
      byId.forEach(() => n++);
      return n;
    },
  };
}
