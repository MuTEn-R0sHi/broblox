# Game Ideas

> Concrete game concepts that could be built on the BroBlox platform.

---

## BroStars 🎸

**Genre:** Pet Collector + Music Creator Hybrid  
**Target Audience:** Casual/creative players, music fans, collectors  
**Monetization:** Pet gacha, instrument skins, stage cosmetics, premium sounds

### Core Concept

Players collect pets to form a band. Each pet makes its own specific sound, adjustable by enchantments/items. When put together as a band, their sounds combine into music — the more pets and better synergy, the better the song.

### Gameplay Loop

1. **Collect Pets** — Hatch eggs, find wild pets, trade with players
2. **Customize Sounds** — Apply enchantments to modify pitch, tempo, effects
3. **Form Bands** — Arrange pets in formation (drummer, bass, lead, vocals, etc.)
4. **Perform** — Play on stages, compete in battles of the bands
5. **Share** — Record and share songs with the community

### Pet System

| Role    | Sound Type        | Examples                        |
| ------- | ----------------- | ------------------------------- |
| Drums   | Percussion, beats | BeatBot, ThumpBunny, RhythmRex  |
| Bass    | Low frequencies   | GrooveFrog, DeepDog, SubWoofer  |
| Lead    | Melody, synths    | MeloCat, SynthSlime, KeyKoala   |
| Vocals  | Voice, chants     | HumBird, ChoroCrow, VoxFox      |
| Effects | Ambient, FX       | EchoGhost, ReverbRat, FizzFairy |

### Rarity Tiers

| Tier      | Sound Quality      | Band Bonus                 |
| --------- | ------------------ | -------------------------- |
| Common    | Basic tones        | —                          |
| Uncommon  | Cleaner sound      | +5% harmony                |
| Rare      | Unique instruments | +10% harmony               |
| Epic      | Layered sounds     | +20% harmony               |
| Legendary | Signature sounds   | +35% harmony               |
| Mythical  | Otherworldly       | +50% harmony + visual aura |

### Enchantments

- **Pitch Shift** — Higher or lower notes
- **Tempo Boost** — Faster BPM contribution
- **Echo** — Reverb/delay effect
- **Distortion** — Gritty, rock sound
- **Harmony** — Auto-harmonize with adjacent pets
- **Solo** — Spotlight moments during performances

### Band Formations

```
    [Lead]
[Bass]  [Drums]  [Effects]
      [Vocals]
```

- Pets in adjacent slots can "sync" for bonus harmony
- Different formations unlock different genres (rock, electronic, jazz, etc.)

### Stages & Venues

| Stage         | Capacity | Unlock         |
| ------------- | -------- | -------------- |
| Street Corner | 1 band   | Free           |
| Coffee Shop   | 1 band   | Level 5        |
| Club          | 2 bands  | Level 15       |
| Arena         | 4 bands  | Level 30       |
| Stadium       | 8 bands  | Level 50       |
| World Stage   | 16 bands | Seasonal event |

### Competitive Modes

- **Battle of the Bands** — 1v1 or tournament brackets
- **Crowd Vote** — Players vote on best performance
- **Genre Challenges** — Weekly challenges (best rock band, best electronic, etc.)
- **Collab Concerts** — Multiple players combine bands

### Monetization

| Item             | Type         | Price Range     |
| ---------------- | ------------ | --------------- |
| Egg Packs        | Gacha        | 50-500 Robux    |
| Instrument Skins | Cosmetic     | 25-150 Robux    |
| Stage Themes     | Cosmetic     | 100-300 Robux   |
| Premium Sounds   | Functional   | 50-200 Robux    |
| Band Pass        | Season Pass  | 400 Robux       |
| VIP Backstage    | Subscription | 200 Robux/month |

### Platform Features Used

- `pets/` — Pet collection, evolution, equipment
- `gacha/` — Egg hatching with pity system
- `audio/` — Core sound system for pet instruments
- `rewards/` — Band Pass progression
- `trading/` — Pet marketplace
- `social/` — Leaderboards, friend bands, concerts

### Unique Selling Points

1. **Creative expression** — Players create unique music
2. **Collection + purpose** — Pets aren't just stats, they're instruments
3. **Social performance** — Share creations, compete, collaborate
4. **Accessible music creation** — No musical skill required

### Technical Challenges

- **Audio mixing** — Combining multiple pet sounds in real-time
- **Latency** — Multiplayer performances need sync
- **Sound variety** — Need large library of quality samples
- **Performance** — Many pets + effects = potential lag

### Development Priority

**Phase 1 (MVP):**

- Basic pet collection (5-10 pets)
- Simple sound system (one sound per pet)
- Solo band formation
- Street performance

**Phase 2:**

- Enchantments
- More pets (30+)
- Battle of the Bands mode
- Trading

**Phase 3:**

- Full audio mixing
- Stages and venues
- Collab concerts
- Band Pass

---

## Future Game Ideas

_Add more game concepts below..._

### Placeholder: Obby Tycoon

Combine procedural obby generation with tycoon management — players build and monetize their own obstacle courses.

### Placeholder: BroFish

Relaxing fishing simulator with rare catches, rod upgrades, and island exploration.

### Placeholder: BroDefense

Anime-style tower defense with gacha unit collection and co-op waves.

---

_Last updated: 2026-01-25_
