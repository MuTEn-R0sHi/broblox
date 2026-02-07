/**
 * Factory for game-level AudioService.
 *
 * Encapsulates sound registry, audio manager, and playlist setup.
 */

import { Service, createLogger } from "@rbx/core";
import { SoundDefinition, Playlist } from "./types";
import { SoundRegistry } from "./sound-registry";
import { AudioManager } from "./audio-manager";

export interface AudioServiceConfig {
  /** Sounds to register. */
  sounds: SoundDefinition[];
  /** Playlists to register. */
  playlists: Playlist[];
  /** Playlist to auto-start on onStart(). */
  startupPlaylist?: string;
}

export interface AudioServiceHandle {
  Service: Service;
  getSoundRegistry(): SoundRegistry;
  getAudioManager(): AudioManager;
}

export function createAudioService(config: AudioServiceConfig): AudioServiceHandle {
  const logger = createLogger("AudioService");
  const soundRegistry = new SoundRegistry();
  const audioManager = new AudioManager(soundRegistry);

  return {
    Service: {
      name: "AudioService",

      onInit() {
        soundRegistry.registerAll(config.sounds);
        for (const playlist of config.playlists) {
          audioManager.registerPlaylist(playlist);
        }
        logger.info(`Audio initialized: ${soundRegistry.count()} sounds registered`);
      },

      onStart() {
        if (config.startupPlaylist) {
          audioManager.startPlaylist(config.startupPlaylist);
        }
        logger.info("AudioService started.");
      },
    },

    getSoundRegistry() {
      return soundRegistry;
    },

    getAudioManager() {
      return audioManager;
    },
  };
}
