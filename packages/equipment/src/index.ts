/**
 * @broblox/equipment — Public API
 */

export type {
  GearRarity,
  GearDefinition,
  StatModifier,
  EquipmentData,
  EquipmentResult,
  EquipmentResultStatus,
  GearEquipEvent,
  GearEquipCallback,
  EquipmentConfig,
} from "./types";
export { DEFAULT_EQUIPMENT_CONFIG } from "./types";
export { GearRegistry } from "./gear-registry";
export { EquipmentStore } from "./equipment-store";
export { createEquipmentService } from "./create-equipment-service";
export type { EquipmentServiceConfig, EquipmentServiceHandle } from "./create-equipment-service";
