/**
 * Tutorial Service — Test Park
 *
 * First-time user experience (FTUE) and guided onboarding.
 */

import { createTutorialService } from "@broblox/tutorial";
import { PlayerLifecycleService } from "./PlayerLifecycleService";

const handle = createTutorialService({
  sequences: [
    {
      id: "ftue_basics",
      name: "Getting Started",
      description: "Learn the basic controls and gameplay",
      steps: [
        {
          id: "welcome",
          stepType: "dialog",
          title: "Welcome!",
          message: "Welcome to Test Park! Let's learn the basics.",
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
    },
    {
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
    },
  ],
  datastoreName: "TestParkTutorial",
  onPlayerRemoving: (cb) => PlayerLifecycleService.onPlayerRemoving(cb),
  onPlayerAdded: (cb) => PlayerLifecycleService.onPlayerAdded(cb),
});

export const TutorialService = handle.Service;
export const getSequenceRegistry = () => handle.getSequenceRegistry();
export const getTutorialManager = (playerId: number) => handle.getTutorialManager(playerId);
export const initPlayerTutorial = (playerId: number) => handle.initPlayer(playerId);
export const cleanupPlayerTutorial = (playerId: number) => handle.cleanupPlayer(playerId);
