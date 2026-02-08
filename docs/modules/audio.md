# Modules: Audio

SFX, music, and spatial audio management (`@rbx/audio`). **Status: Implemented** (38 tests).

## Purpose

- Centralize all sound playback (SFX, music, ambient, UI, voice).
- Provide per-channel volume control with master volume.
- Support sequential and shuffled music playlists with crossfade.
- Reusable across multiple games with different sound assets.

## Core rules

- All sounds are registered statically at startup via `SoundRegistry`.
- Playback is managed through `AudioManager` which tracks active instances.
- Volume stacks: effective volume = master × channel × sound volume.
- Playlists auto-advance tracks; crossfade duration is configurable per track.

## Data model

- `SoundDefinition` — `id`, `assetId`, `channel`, `volume`, `looped`, `maxInstances`
- `SoundInstance` — `instanceId`, `soundId`, `state`, `volume`, `startedAt`
- `Playlist` — `id`, `name`, `tracks[]`, `loop`, `shuffle`

No per-player persistence (audio is session-only state).

## Config/flags

- `audio.enabled` (kill-switch)
- `audio.masterVolume` (default 1.0)
- `audio.startupPlaylist` (auto-play on join)

## Observability

- `audio.sound_played` — sound playback event
- `audio.sound_stopped` — sound stop event
- `audio.playlist_advanced` — track change event
