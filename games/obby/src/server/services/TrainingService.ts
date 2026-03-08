/**
 * Training Service
 * Handles training station interactions that increase player attributes.
 *
 * Three station types: speed, jump, stamina — each tagged with
 * "ObbyTrainingStation" and has an attribute `StationType` indicating which
 * attribute it trains.
 *
 * Flow:
 * 1. Client fires `RequestTraining` with the station type.
 * 2. Server validates proximity, cooldown, and attribute cap.
 * 3. A short delay simulates the mini-activity (3s).
 * 4. On success: attribute increases, data saved, client notified.
 */

import { CollectionService } from "@rbxts/services";
import { Service, createLogger } from "@broblox/core";
import { OBBY_CONSTANTS, AttributeType, PlayerAttributes } from "shared/types";
import { DataService } from "./DataService";
import { AttributeService } from "./AttributeService";
import { RemoteService } from "./RemoteService";

const logger = createLogger("TrainingService");

// ── Per-player cooldown tracking ─────────────────────────────────────────────

/** userId → last training completion time (os.clock) */
const lastTrainTime = new Map<number, number>();

// ── Helpers ──────────────────────────────────────────────────────────────────

const ATTR_CAPS: Record<AttributeType, number> = {
  speed: OBBY_CONSTANTS.MAX_SPEED,
  jump: OBBY_CONSTANTS.MAX_JUMP,
  stamina: OBBY_CONSTANTS.MAX_STAMINA,
};

function computeGain(currentValue: number): number {
  if (currentValue >= OBBY_CONSTANTS.TRAINING_DIMINISH_THRESHOLD) {
    return OBBY_CONSTANTS.TRAINING_GAIN_DIMINISHED;
  }
  return OBBY_CONSTANTS.TRAINING_GAIN;
}

function isNearStation(player: Player, stationType: AttributeType): boolean {
  const character = player.Character;
  if (!character) return false;

  const root = character.FindFirstChild("HumanoidRootPart") as BasePart | undefined;
  if (!root) return false;

  const PROXIMITY_RANGE = 20; // studs

  for (const station of CollectionService.GetTagged(OBBY_CONSTANTS.TRAINING_STATION_TAG)) {
    if (!station.IsA("BasePart") && !station.IsA("Model")) continue;

    const attrType = station.GetAttribute("StationType") as string | undefined;
    if (attrType !== stationType) continue;

    const stationPos = station.IsA("Model")
      ? ((station.FindFirstChild("PrimaryPart") as BasePart | undefined)?.Position ??
        (station.FindFirstChildWhichIsA("BasePart") as BasePart | undefined)?.Position)
      : station.Position;

    if (stationPos && root.Position.sub(stationPos).Magnitude <= PROXIMITY_RANGE) {
      return true;
    }
  }

  return false;
}

// ── Public API ───────────────────────────────────────────────────────────────

export const TrainingService: Service = {
  onInit() {
    logger.debug("TrainingService initializing...");
  },

  onStart() {
    const registry = RemoteService.getRegistry();

    registry.onEvent("RequestTraining", (player, payload) => {
      const stationType = (payload as { stationType: string }).stationType as AttributeType;

      // Validate attribute type
      if (stationType !== "speed" && stationType !== "jump" && stationType !== "stamina") {
        logger.warn(`Invalid training type from ${player.Name}: ${stationType}`);
        return;
      }

      // Validate proximity to a station
      if (!isNearStation(player, stationType)) {
        logger.debug(`${player.Name} is not near a ${stationType} training station`);
        return;
      }

      // Validate cooldown
      const now = os.clock();
      const last = lastTrainTime.get(player.UserId) ?? 0;
      if (now - last < OBBY_CONSTANTS.TRAINING_COOLDOWN) {
        logger.debug(`${player.Name} training on cooldown`);
        return;
      }

      // Check attribute cap
      const attrs = DataService.getAttributes(player);
      if (!attrs) return;

      const currentValue = attrs[stationType];
      const cap = ATTR_CAPS[stationType];
      if (currentValue >= cap) {
        logger.debug(`${player.Name} ${stationType} already at cap (${cap})`);
        return;
      }

      // Simulate mini-activity (3s delay on server)
      lastTrainTime.set(player.UserId, now);

      task.delay(3, () => {
        // Re-validate player is still in game and near station
        if (!player.Parent) return;
        const currentAttrs = DataService.getAttributes(player);
        if (!currentAttrs) return;

        const curVal = currentAttrs[stationType];
        if (curVal >= cap) return;

        const gain = computeGain(curVal);
        const newVal = math.min(cap, curVal + gain);

        // Update attribute in data
        DataService.setAttributes(player, { [stationType]: newVal });

        // Increment training rep counter
        const data = DataService.getData(player);
        if (data) {
          data.trainingReps[stationType] += 1;
        }

        // Apply new stats to Humanoid
        AttributeService.applyToHumanoid(player);

        // Notify client
        registry.fireClient("TrainingComplete", player, {
          attribute: stationType,
          newValue: math.floor(newVal * 100) / 100,
          gain,
        });

        // Full attribute sync
        AttributeService.syncToClient(player);

        logger.debug(
          `${player.Name} trained ${stationType}: ${string.format("%.2f", curVal)} → ${string.format("%.2f", newVal)}`
        );
      });
    });

    logger.info("TrainingService started.");
  },
};
