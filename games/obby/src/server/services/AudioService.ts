/**
 * Audio Service — Obby Game
 *
 * Sound effects, music, and audio management for the obstacle course.
 */

import { Service, createLogger } from "@rbx/core";
import { SoundRegistry, AudioManager } from "@rbx/audio";

const logger = createLogger("AudioService");

const soundRegistry = new SoundRegistry();
const audioManager = new AudioManager(soundRegistry);

export function getSoundRegistry(): SoundRegistry {
  return soundRegistry;
}

export function getAudioManager(): AudioManager {
  return audioManager;
}

export const AudioService: Service = {
  onInit() {
    soundRegistry.registerAll([
      {
        id: "sfx_checkpoint",
        assetId: "rbxassetid://0",
        channel: "sfx",
        volume: 0.8,
        looped: false,
      },
      { id: "sfx_fall", assetId: "rbxassetid://0", channel: "sfx", volume: 0.5, looped: false },
      { id: "sfx_bounce", assetId: "rbxassetid://0", channel: "sfx", volume: 0.6, looped: false },
      { id: "sfx_complete", assetId: "rbxassetid://0", channel: "sfx", volume: 1.0, looped: false },
      { id: "sfx_click", assetId: "rbxassetid://0", channel: "ui", volume: 0.5, looped: false },
      { id: "music_obby", assetId: "rbxassetid://0", channel: "music", volume: 0.5, looped: true },
      {
        id: "ambient_nature",
        assetId: "rbxassetid://0",
        channel: "ambient",
        volume: 0.3,
        looped: true,
      },
    ]);

    audioManager.registerPlaylist("obby_music", {
      tracks: [{ soundId: "music_obby", label: "Obby Theme" }],
      loop: true,
      shuffle: false,
    });

    logger.info(`Audio initialized: ${soundRegistry.count()} sounds registered`);
  },

  onStart() {
    audioManager.startPlaylist("obby_music");
    logger.info("AudioService started — obby music playing");
  },
};
