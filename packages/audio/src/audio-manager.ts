/**
 * @rbx/audio — Audio Manager
 *
 * Manages playback, channels, volume, playlists, and sound instances.
 */

import { createLogger } from "@rbx/core";
import type {
  AudioConfig,
  AudioChannel,
  AudioResult,
  AudioStatus,
  SoundInstance,
  SoundState,
  Playlist,
  MusicTrack,
  SoundEndedEvent,
  SoundEndedCallback,
  VolumeChangedEvent,
  VolumeChangedCallback,
} from "./types";
import { DEFAULT_AUDIO_CONFIG } from "./types";
import { SoundRegistry } from "./sound-registry";

declare const os: { time(): number };

let nextInstanceId = 0;
function generateInstanceId(): string {
  nextInstanceId++;
  return `snd_${nextInstanceId}`;
}

export class AudioManager {
  private registry: SoundRegistry;
  private config: AudioConfig;
  private logger;

  // Active sound instances
  private instances = new Map<string, SoundInstance>();
  // Count of active instances per sound ID
  private instanceCounts = new Map<string, number>();

  // Playlists
  private playlists = new Map<string, Playlist>();
  private activePlaylist: string | undefined;
  private currentTrackIndex = 0;
  private currentMusicInstance: string | undefined;

  // Callbacks
  private soundEndedCallbacks: SoundEndedCallback[] = [];
  private volumeChangedCallbacks: VolumeChangedCallback[] = [];

  constructor(registry: SoundRegistry, config?: Partial<AudioConfig>) {
    this.registry = registry;
    this.config = {
      ...DEFAULT_AUDIO_CONFIG,
      ...config,
      channelVolumes: {
        ...DEFAULT_AUDIO_CONFIG.channelVolumes,
        ...config?.channelVolumes,
      },
    };
    this.logger = this.config.enableLogging ? createLogger("AudioManager") : undefined;
  }

  // --------------------------------------------------------------------------
  // Playback
  // --------------------------------------------------------------------------

  /** Play a registered sound */
  play(soundId: string): AudioResult {
    const def = this.registry.get(soundId);
    if (!def) {
      return { ok: false, status: "sound_not_found" };
    }

    // Check max instances
    if (def.maxInstances > 0) {
      const current = this.instanceCounts.get(soundId) ?? 0;
      if (current >= def.maxInstances) {
        return { ok: false, status: "max_instances" };
      }
    }

    const channelVol = this.config.channelVolumes[def.channel] ?? 1;
    const effectiveVol = def.volume * channelVol * this.config.masterVolume;

    const instance: SoundInstance = {
      instanceId: generateInstanceId(),
      soundId,
      state: "playing",
      volume: effectiveVol,
      startedAt: os.time(),
    };

    this.instances.set(instance.instanceId, instance);
    this.instanceCounts.set(soundId, (this.instanceCounts.get(soundId) ?? 0) + 1);

    this.logger?.info(`Playing: ${soundId} (${instance.instanceId})`);
    return { ok: true, status: "success", instanceId: instance.instanceId };
  }

  /** Pause a playing instance */
  pause(instanceId: string): AudioResult {
    const instance = this.instances.get(instanceId);
    if (!instance) return { ok: false, status: "instance_not_found" };
    if (instance.state === "paused") return { ok: false, status: "already_paused" };
    if (instance.state === "stopped") return { ok: false, status: "already_stopped" };

    instance.state = "paused";
    return { ok: true, status: "success", instanceId };
  }

  /** Resume a paused instance */
  resume(instanceId: string): AudioResult {
    const instance = this.instances.get(instanceId);
    if (!instance) return { ok: false, status: "instance_not_found" };
    if (instance.state === "playing") return { ok: false, status: "already_playing" };

    instance.state = "playing";
    return { ok: true, status: "success", instanceId };
  }

  /** Stop a sound instance */
  stop(instanceId: string): AudioResult {
    const instance = this.instances.get(instanceId);
    if (!instance) return { ok: false, status: "instance_not_found" };
    if (instance.state === "stopped") return { ok: false, status: "already_stopped" };

    instance.state = "stopped";
    const count = this.instanceCounts.get(instance.soundId) ?? 1;
    if (count <= 1) {
      this.instanceCounts.delete(instance.soundId);
    } else {
      this.instanceCounts.set(instance.soundId, count - 1);
    }

    // Fire ended event
    const def = this.registry.get(instance.soundId);
    if (def) {
      const evt: SoundEndedEvent = {
        instanceId,
        soundId: instance.soundId,
        channel: def.channel,
        timestamp: os.time(),
      };
      for (let i = 0; i < this.soundEndedCallbacks.size(); i++) {
        this.soundEndedCallbacks[i](evt);
      }
    }

    this.instances.delete(instanceId);
    this.logger?.info(`Stopped: ${instance.soundId} (${instanceId})`);
    return { ok: true, status: "success", instanceId };
  }

  /** Stop all instances of a specific sound */
  stopAll(soundId: string): number {
    const toStop: string[] = [];
    this.instances.forEach((inst) => {
      if (inst.soundId === soundId && inst.state !== "stopped") {
        toStop.push(inst.instanceId);
      }
    });
    for (let i = 0; i < toStop.size(); i++) {
      this.stop(toStop[i]);
    }
    return toStop.size();
  }

  /** Stop all sounds on a channel */
  stopChannel(channel: AudioChannel): number {
    const toStop: string[] = [];
    this.instances.forEach((inst) => {
      const def = this.registry.get(inst.soundId);
      if (def && def.channel === channel && inst.state !== "stopped") {
        toStop.push(inst.instanceId);
      }
    });
    for (let i = 0; i < toStop.size(); i++) {
      this.stop(toStop[i]);
    }
    return toStop.size();
  }

  /** Stop everything */
  stopEverything(): number {
    const toStop: string[] = [];
    this.instances.forEach((inst) => {
      if (inst.state !== "stopped") toStop.push(inst.instanceId);
    });
    for (let i = 0; i < toStop.size(); i++) {
      this.stop(toStop[i]);
    }
    return toStop.size();
  }

  // --------------------------------------------------------------------------
  // Volume
  // --------------------------------------------------------------------------

  /** Set master volume (0–1) */
  setMasterVolume(volume: number): AudioResult {
    if (volume < 0 || volume > 1) return { ok: false, status: "invalid_volume" };
    const prev = this.config.masterVolume;
    this.config.masterVolume = volume;
    this.fireVolumeChanged("master", prev, volume);
    this.recalculateVolumes();
    return { ok: true, status: "success" };
  }

  /** Set channel volume (0–1) */
  setChannelVolume(channel: AudioChannel, volume: number): AudioResult {
    if (volume < 0 || volume > 1) return { ok: false, status: "invalid_volume" };
    const prev = this.config.channelVolumes[channel] ?? 1;
    this.config.channelVolumes[channel] = volume;
    this.fireVolumeChanged(channel, prev, volume);
    this.recalculateVolumes();
    return { ok: true, status: "success" };
  }

  /** Get master volume */
  getMasterVolume(): number {
    return this.config.masterVolume;
  }

  /** Get channel volume */
  getChannelVolume(channel: AudioChannel): number {
    return this.config.channelVolumes[channel] ?? 1;
  }

  // --------------------------------------------------------------------------
  // Playlists
  // --------------------------------------------------------------------------

  /** Register a playlist */
  registerPlaylist(playlist: Playlist): boolean {
    if (this.playlists.has(playlist.id)) return false;
    this.playlists.set(playlist.id, playlist);
    return true;
  }

  /** Start playing a playlist */
  startPlaylist(playlistId: string): AudioResult {
    const pl = this.playlists.get(playlistId);
    if (!pl) return { ok: false, status: "playlist_not_found" };
    if (pl.tracks.size() === 0) return { ok: false, status: "playlist_empty" };

    // Stop current music if any
    if (this.currentMusicInstance) {
      this.stop(this.currentMusicInstance);
    }

    this.activePlaylist = playlistId;
    this.currentTrackIndex = 0;
    return this.playCurrentTrack(pl);
  }

  /** Skip to next track in active playlist */
  nextTrack(): AudioResult {
    if (!this.activePlaylist) return { ok: false, status: "playlist_not_found" };
    const pl = this.playlists.get(this.activePlaylist);
    if (!pl) return { ok: false, status: "playlist_not_found" };

    if (this.currentMusicInstance) {
      this.stop(this.currentMusicInstance);
    }

    this.currentTrackIndex++;
    if (this.currentTrackIndex >= pl.tracks.size()) {
      if (pl.loop) {
        this.currentTrackIndex = 0;
      } else {
        this.activePlaylist = undefined;
        return { ok: true, status: "success" }; // playlist ended
      }
    }

    return this.playCurrentTrack(pl);
  }

  /** Stop active playlist */
  stopPlaylist(): AudioResult {
    if (!this.activePlaylist) return { ok: false, status: "playlist_not_found" };
    if (this.currentMusicInstance) {
      this.stop(this.currentMusicInstance);
    }
    this.activePlaylist = undefined;
    this.currentMusicInstance = undefined;
    return { ok: true, status: "success" };
  }

  /** Get active playlist ID */
  getActivePlaylist(): string | undefined {
    return this.activePlaylist;
  }

  /** Get current track index */
  getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** Get a playing instance */
  getInstance(instanceId: string): SoundInstance | undefined {
    return this.instances.get(instanceId);
  }

  /** Count active (non-stopped) instances */
  activeInstanceCount(): number {
    let count = 0;
    this.instances.forEach((inst) => {
      if (inst.state !== "stopped") count++;
    });
    return count;
  }

  /** Count instances of a specific sound */
  instanceCountOf(soundId: string): number {
    return this.instanceCounts.get(soundId) ?? 0;
  }

  // --------------------------------------------------------------------------
  // Events
  // --------------------------------------------------------------------------

  onSoundEnded(cb: SoundEndedCallback): void {
    this.soundEndedCallbacks.push(cb);
  }

  onVolumeChanged(cb: VolumeChangedCallback): void {
    this.volumeChangedCallbacks.push(cb);
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private playCurrentTrack(pl: Playlist): AudioResult {
    const track = pl.tracks[this.currentTrackIndex];
    const result = this.play(track.soundId);
    if (result.ok) {
      this.currentMusicInstance = result.instanceId;
    }
    return result;
  }

  private recalculateVolumes(): void {
    this.instances.forEach((inst) => {
      const def = this.registry.get(inst.soundId);
      if (def && inst.state !== "stopped") {
        const channelVol = this.config.channelVolumes[def.channel] ?? 1;
        inst.volume = def.volume * channelVol * this.config.masterVolume;
      }
    });
  }

  private fireVolumeChanged(channel: AudioChannel | "master", prev: number, next: number): void {
    const evt: VolumeChangedEvent = {
      channel,
      previousVolume: prev,
      newVolume: next,
    };
    for (let i = 0; i < this.volumeChangedCallbacks.size(); i++) {
      this.volumeChangedCallbacks[i](evt);
    }
  }
}
