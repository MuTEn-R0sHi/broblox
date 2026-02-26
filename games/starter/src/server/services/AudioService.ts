/**
 * Audio Service — Starter Game
 *
 * Sound effects, music, and audio management.
 */

import { createAudioService } from "@broblox/audio";

const handle = createAudioService({
  sounds: [
    { id: "sfx_coin", assetId: "rbxassetid://0", channel: "sfx", volume: 0.8, looped: false },
    { id: "sfx_jump", assetId: "rbxassetid://0", channel: "sfx", volume: 0.6, looped: false },
    { id: "sfx_hit", assetId: "rbxassetid://0", channel: "sfx", volume: 0.7, looped: false },
    { id: "sfx_levelup", assetId: "rbxassetid://0", channel: "sfx", volume: 1.0, looped: false },
    { id: "sfx_click", assetId: "rbxassetid://0", channel: "ui", volume: 0.5, looped: false },
    { id: "sfx_purchase", assetId: "rbxassetid://0", channel: "ui", volume: 0.7, looped: false },
    { id: "music_lobby", assetId: "rbxassetid://0", channel: "music", volume: 0.5, looped: true },
    { id: "music_battle", assetId: "rbxassetid://0", channel: "music", volume: 0.6, looped: true },
    {
      id: "ambient_wind",
      assetId: "rbxassetid://0",
      channel: "ambient",
      volume: 0.3,
      looped: true,
    },
  ],
  playlists: [
    {
      id: "lobby_music",
      name: "Lobby Music",
      tracks: [{ id: "lobby_1", soundId: "music_lobby", crossfadeDuration: 2 }],
      loop: true,
      shuffle: false,
    },
    {
      id: "battle_music",
      name: "Battle Music",
      tracks: [{ id: "battle_1", soundId: "music_battle", crossfadeDuration: 2 }],
      loop: true,
      shuffle: false,
    },
  ],
  startupPlaylist: "lobby_music",
});

export const AudioService = handle.Service;
export const getSoundRegistry = () => handle.getSoundRegistry();
export const getAudioManager = () => handle.getAudioManager();
