/**
 * Audio Service — Obby Game
 *
 * Sound effects, music, and audio management for the obstacle course.
 */

import { createAudioService } from "@broblox/audio";

const handle = createAudioService({
  sounds: [
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
  ],
  playlists: [
    {
      id: "obby_music",
      name: "Obby Music",
      tracks: [{ id: "obby_1", soundId: "music_obby", crossfadeDuration: 2 }],
      loop: true,
      shuffle: false,
    },
  ],
  startupPlaylist: "obby_music",
});

export const AudioService = handle.Service;
export const getSoundRegistry = () => handle.getSoundRegistry();
export const getAudioManager = () => handle.getAudioManager();
