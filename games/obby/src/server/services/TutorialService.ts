/**
 * Tutorial Service — Obby Game
 *
 * First-time user experience for the obstacle course.
 */

import { createTutorialService } from "@rbx/tutorial";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createTutorialService({
  sequences: [
    {
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
    },
  ],
  datastoreName: "ObbyTutorial",
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const TutorialService = handle.Service;
export const getSequenceRegistry = () => handle.getSequenceRegistry();
export const getTutorialManager = (playerId: number) => handle.getTutorialManager(playerId);
export const initPlayerTutorial = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerTutorial = (playerId: number) => handle.cleanupPlayer(playerId);
