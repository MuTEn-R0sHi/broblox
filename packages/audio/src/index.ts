/**
 * @rbx/audio
 *
 * SFX, music, and spatial audio management for Roblox games.
 * Provides:
 * - Sound definition registry with channel categorization
 * - Playback management (play, pause, resume, stop)
 * - Channel-based volume control (sfx, music, ambient, ui, voice)
 * - Master volume with per-channel mixing
 * - Playlist system with looping and track skipping
 * - Instance counting and max-instance limits
 * - Sound ended and volume changed event callbacks
 */

export { SoundRegistry } from "./sound-registry";
export { AudioManager } from "./audio-manager";

export type {
  AudioChannel,
  SoundDefinition,
  SoundInstance,
  SoundState,
  MusicTrack,
  Playlist,
  SpatialConfig,
  AudioConfig,
  AudioStatus,
  AudioResult,
  SoundEndedEvent,
  SoundEndedCallback,
  VolumeChangedEvent,
  VolumeChangedCallback,
} from "./types";

export { DEFAULT_AUDIO_CONFIG } from "./types";
