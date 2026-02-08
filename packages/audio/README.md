# @rbx/audio

SFX, music, and spatial audio management for Roblox games.

## Purpose

This package provides a complete audio system:

- **Sound registry** — Define and organize sound assets by channel and group
- **Audio manager** — Play, pause, stop, and manage sound instances
- **Playlist system** — Sequential and shuffled music playlists with crossfade
- **Volume control** — Per-channel and master volume with callbacks
- **Spatial audio** — Position-based 3D audio support

## Dependencies

- `@rbx/core` — Service lifecycle, logging utilities

## Architecture

### Registry → Manager Pattern

1. **SoundRegistry** holds static `SoundDefinition` entries (asset IDs, channels, volumes)
2. **AudioManager** manages runtime playback — creating instances, tracking state, running playlists
3. **`createAudioService`** wires both together into a `Service`-lifecycle handle

### Audio Channels

Sounds are organized into channels: `sfx`, `music`, `ambient`, `ui`, and `voice`. Each channel has independent volume that stacks with the master volume.

## Usage

```typescript
import { createAudioService } from "@rbx/audio";

const audio = createAudioService({
  sounds: [
    { id: "coin", assetId: "rbxassetid://123", channel: "sfx", volume: 0.8, looped: false },
    { id: "bgm_lobby", assetId: "rbxassetid://456", channel: "music", volume: 0.6, looped: true },
  ],
  playlists: [
    {
      id: "lobby_music",
      name: "Lobby",
      tracks: [{ id: "t1", soundId: "bgm_lobby", crossfadeDuration: 2 }],
      loop: true,
      shuffle: false,
    },
  ],
  startupPlaylist: "lobby_music",
});

// Play a sound effect
const manager = audio.getAudioManager();
manager.play("coin");

// Adjust volume
manager.setMasterVolume(0.5);
manager.setChannelVolume("music", 0.3);
```

## Related Docs

- [Module docs](../../docs/modules/audio.md)
