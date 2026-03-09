/**
 * @broblox/hazards — Public API
 */

export { createHazardService } from "./create-hazard-service";
export { createHazardRegistry } from "./hazard-registry";
export { createHazardManager } from "./hazard-manager";
export type { HazardManagerCallbacks } from "./hazard-manager";
export type {
  HazardBehaviour,
  HazardDefinition,
  HazardInstanceState,
  HazardManager,
  HazardRegistry,
  HazardServiceConfig,
  HazardServiceHandle,
  PlayerHazardState,
  Service,
} from "./types";
