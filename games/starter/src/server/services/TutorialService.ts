/**
 * Tutorial Service — Starter Game
 *
 * First-time user experience (FTUE) and guided onboarding.
 */

import { Service, createLogger } from "@rbx/core";
import { SequenceRegistry, TutorialManager } from "@rbx/tutorial";

const logger = createLogger("TutorialService");

const sequenceRegistry = new SequenceRegistry();
const playerTutorials = new Map<number, TutorialManager>();

export function getSequenceRegistry(): SequenceRegistry {
  return sequenceRegistry;
}

export function getTutorialManager(playerId: number): TutorialManager | undefined {
  return playerTutorials.get(playerId);
}

export const TutorialService: Service = {
  onInit() {
    // Register the basic FTUE sequence
    sequenceRegistry.register({
      id: "ftue_basics",
      name: "Getting Started",
      description: "Learn the basic controls and gameplay",
      steps: [
        {
          id: "welcome",
          stepType: "dialog",
          title: "Welcome!",
          message: "Welcome to Starter Game! Let's learn the basics.",
          condition: { type: "manual" },
          skippable: true,
        },
        {
          id: "move_wasd",
          stepType: "action",
          title: "Movement",
          message: "Use WASD to move around.",
          condition: { type: "action", actionId: "first_move" },
          skippable: true,
        },
        {
          id: "jump",
          stepType: "action",
          title: "Jump",
          message: "Press Space to jump.",
          condition: { type: "action", actionId: "first_jump" },
          skippable: true,
        },
        {
          id: "complete",
          stepType: "dialog",
          title: "You're Ready!",
          message: "Great job! You now know the basics. Have fun!",
          condition: { type: "manual" },
          skippable: true,
        },
      ],
      skippable: true,
      persistent: true,
      prerequisites: [],
      version: 1,
    });

    // Register a shop tutorial (requires basics)
    sequenceRegistry.register({
      id: "ftue_shop",
      name: "Using the Shop",
      description: "Learn how to buy items in the shop",
      steps: [
        {
          id: "open_shop",
          stepType: "highlight",
          title: "Open Shop",
          message: "Click the Shop button to open the store.",
          condition: { type: "action", actionId: "open_shop" },
          skippable: true,
        },
        {
          id: "buy_item",
          stepType: "action",
          title: "Buy an Item",
          message: "Select an item and click Buy.",
          condition: { type: "action", actionId: "first_purchase" },
          skippable: true,
        },
      ],
      skippable: true,
      persistent: true,
      prerequisites: ["ftue_basics"],
      version: 1,
    });

    logger.info(`Tutorial sequences registered: ${sequenceRegistry.count()}`);
  },

  onStart() {
    logger.info("TutorialService started");
  },
};
