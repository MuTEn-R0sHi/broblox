/**
 * @broblox/obstacles — Public API
 */

export { createObstacleService } from "./create-obstacle-service";
export { createObstacleRegistry } from "./obstacle-registry";
export { createObstacleManager } from "./obstacle-manager";
export type { ObstacleManagerCallbacks } from "./obstacle-manager";
export type {
  ObstacleBehaviour,
  ObstacleDefinition,
  ObstacleInstanceState,
  ObstacleManager,
  ObstacleRegistry,
  ObstacleServiceConfig,
  ObstacleServiceHandle,
  Service,
} from "./types";
