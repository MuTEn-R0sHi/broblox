/**
 * Tutorial Service — Obby Game
 *
 * First-time user experience for the obstacle course.
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
    sequenceRegistry.register({
      id: "ftue_obby",
      name: "Obby Basics",
      description: "Learn how to navigate the obstacle course",
      steps: [
        {
          id: "welcome",
          stepType: "dialog",
          title: "Welcome to the Obby!",
          message: "Navigate through stages to reach the finish line!",
          condition: { type: "manual" },
          skippable: true,
        },
        {
          id: "move",
          stepType: "action",
          title: "Movement",
          message: "Use WASD to move. Jump with Space.",
          condition: { type: "action", actionId: "first_move" },
          skippable: true,
        },
        {
          id: "checkpoint",
          stepType: "action",
          title: "Checkpoints",
          message: "Touch a checkpoint pad to save your progress.",
          condition: { type: "action", actionId: "first_checkpoint" },
          skippable: true,
        },
        {
          id: "done",
          stepType: "dialog",
          title: "You're Ready!",
          message: "Good luck! Try to complete the course as fast as you can!",
          condition: { type: "manual" },
          skippable: true,
        },
      ],
      skippable: true,
      persistent: true,
      prerequisites: [],
      version: 1,
    });

    logger.info(`Tutorial sequences registered: ${sequenceRegistry.count()}`);
  },

  onStart() {
    logger.info("TutorialService started");
  },
};
