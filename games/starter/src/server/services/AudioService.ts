/**
 * Audio Service — Starter Game
 *
 * Sound effects, music, and audio management.
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
    // Register sound effects
    soundRegistry.registerAll([
      { id: "sfx_coin", assetId: "rbxassetid://0", channel: "sfx", volume: 0.8, looped: false },
      { id: "sfx_jump", assetId: "rbxassetid://0", channel: "sfx", volume: 0.6, looped: false },
      { id: "sfx_hit", assetId: "rbxassetid://0", channel: "sfx", volume: 0.7, looped: false },
      { id: "sfx_levelup", assetId: "rbxassetid://0", channel: "sfx", volume: 1.0, looped: false },
      { id: "sfx_click", assetId: "rbxassetid://0", channel: "ui", volume: 0.5, looped: false },
      { id: "sfx_purchase", assetId: "rbxassetid://0", channel: "ui", volume: 0.7, looped: false },
      { id: "music_lobby", assetId: "rbxassetid://0", channel: "music", volume: 0.5, looped: true },
      {
        id: "music_battle",
        assetId: "rbxassetid://0",
        channel: "music",
        volume: 0.6,
        looped: true,
      },
      {
        id: "ambient_wind",
        assetId: "rbxassetid://0",
        channel: "ambient",
        volume: 0.3,
        looped: true,
      },
    ]);

    // Register playlists
    audioManager.registerPlaylist({
      id: "lobby_music",
      name: "Lobby Music",
      tracks: [{ id: "lobby_1", soundId: "music_lobby", crossfadeDuration: 2 }],
      loop: true,
      shuffle: false,
    });

    audioManager.registerPlaylist({
      id: "battle_music",
      name: "Battle Music",
      tracks: [{ id: "battle_1", soundId: "music_battle", crossfadeDuration: 2 }],
      loop: true,
      shuffle: false,
    });

    logger.info(`Audio initialized: ${soundRegistry.count()} sounds registered`);
  },

  onStart() {
    audioManager.startPlaylist("lobby_music");
    logger.info("AudioService started — lobby music playing");
  },
};
