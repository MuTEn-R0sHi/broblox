/**
 * @rbx/cosmetics — Public API
 */

export type {
  CosmeticCategory,
  CosmeticDefinition,
  EquipSlot,
  CosmeticPlayerData,
  CosmeticStatus,
  CosmeticResult,
  CosmeticEquipEvent,
  CosmeticEquipCallback,
  CosmeticsConfig,
} from "./types";
export { CATEGORY_SLOTS, DEFAULT_COSMETICS_CONFIG, VERSION } from "./types";
export { CosmeticRegistry } from "./cosmetic-registry";
export { CosmeticStore } from "./cosmetic-store";
export { createCosmeticsService } from "./create-cosmetics-service";
export type { CosmeticsServiceConfig, CosmeticsServiceHandle } from "./create-cosmetics-service";
