/**
 * @rbx/battle-pass — Public API
 */

export type {
  RewardTrack,
  TierReward,
  BattlePassTier,
  SeasonDefinition,
  BattlePassPlayerData,
  BattlePassStatus,
  BattlePassResult,
  XpResult,
  ClaimResult,
  BattlePassTierUpEvent,
  BattlePassClaimEvent,
  TierUpCallback,
  ClaimCallback,
  BattlePassConfig,
} from "./types";
export { DEFAULT_BATTLE_PASS_CONFIG, VERSION } from "./types";
export type { RewardEntry, RewardType } from "@rbx/rewards";
export { SeasonRegistry } from "./season-registry";
export { BattlePassStore } from "./battle-pass-store";
export { createBattlePassService } from "./create-battle-pass-service";
export type {
  BattlePassServiceConfig,
  BattlePassServiceHandle,
} from "./create-battle-pass-service";
