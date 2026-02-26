/**
 * @broblox/audio — Type Definitions
 *
 * Types for sounds, music, channels, and spatial audio.
 */

// ============================================================================
// Sound Definitions
// ============================================================================

/** Audio channel categories */
export type AudioChannel = "sfx" | "music" | "ambient" | "ui" | "voice";

/** A registered sound definition */
export interface SoundDefinition {
  /** Unique sound identifier */
  id: string;
  /** Roblox asset ID (the number in rbxassetid://) */
  assetId: string;
  /** Channel this sound belongs to */
  channel: AudioChannel;
  /** Default volume (0–1) */
  volume: number;
  /** Default playback speed (default: 1) */
  playbackSpeed?: number;
  /** Whether this sound loops */
  looped: boolean;
  /** Max simultaneous instances (0 = unlimited, default: 0) */
  maxInstances?: number;
  /** Optional group tag for batch operations */
  group?: string;
}

/** A playing sound instance */
export interface SoundInstance {
  /** Internal instance ID */
  instanceId: string;
  /** Reference to the SoundDefinition */
  soundId: string;
  /** Current state */
  state: SoundState;
  /** Current volume (after channel adjustment) */
  volume: number;
  /** Timestamp when playback started */
  startedAt: number;
}

export type SoundState = "playing" | "paused" | "stopped" | "fading";

// ============================================================================
// Music
// ============================================================================

/** A track in a playlist */
export interface MusicTrack {
  id: string;
  soundId: string;
  /** Crossfade duration in seconds when transitioning to this track */
  crossfadeDuration: number;
}

/** Playlist configuration */
export interface Playlist {
  id: string;
  name: string;
  tracks: MusicTrack[];
  /** Whether to loop the playlist */
  loop: boolean;
  /** Whether to shuffle */
  shuffle: boolean;
}

// ============================================================================
// Spatial Audio
// ============================================================================

/** Spatial audio configuration for a sound */
export interface SpatialConfig {
  /** Position in world space */
  position: { x: number; y: number; z: number };
  /** Max audible distance (studs) */
  maxDistance: number;
  /** Min distance before attenuation starts */
  minDistance: number;
  /** Rolloff mode: linear or inverse */
  rolloff: "linear" | "inverse";
}

// ============================================================================
// Configuration
// ============================================================================

export interface AudioConfig {
  /** Master volume (0–1) */
  masterVolume: number;
  /** Per-channel volumes */
  channelVolumes: Record<AudioChannel, number>;
  /** Default crossfade duration (seconds) */
  defaultCrossfade: number;
  /** Whether to enable logging */
  enableLogging: boolean;
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  masterVolume: 1.0,
  channelVolumes: {
    sfx: 1.0,
    music: 0.7,
    ambient: 0.5,
    ui: 0.8,
    voice: 1.0,
  },
  defaultCrossfade: 1.0,
  enableLogging: false,
};

// ============================================================================
// Results
// ============================================================================

export type AudioStatus =
  | "success"
  | "sound_not_found"
  | "max_instances"
  | "instance_not_found"
  | "already_playing"
  | "already_paused"
  | "already_stopped"
  | "playlist_not_found"
  | "playlist_empty"
  | "invalid_volume";

export interface AudioResult {
  ok: boolean;
  status: AudioStatus;
  instanceId?: string;
}

// ============================================================================
// Callbacks
// ============================================================================

export interface SoundEndedEvent {
  instanceId: string;
  soundId: string;
  channel: AudioChannel;
  timestamp: number;
}

export interface VolumeChangedEvent {
  channel: AudioChannel | "master";
  previousVolume: number;
  newVolume: number;
}

export type SoundEndedCallback = (event: SoundEndedEvent) => void;
export type VolumeChangedCallback = (event: VolumeChangedEvent) => void;
