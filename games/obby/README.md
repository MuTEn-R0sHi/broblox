# @rbx/game-obby

An obstacle course (Obby) game template built with BroBlox.

## Features

- **Checkpoint System**: Progress saved per checkpoint, respawn at last reached
- **Stage Tracking**: Per-stage statistics (best time, completions, deaths)
- **Leaderboards**: Global rankings for best times, completions, and coins
- **Coins & Rewards**: Earn coins for completing stages, bonus for fast times
- **Kill Bricks**: Tag parts with `KillBrick` attribute
- **Fall Detection**: Automatic respawn when falling too far

## Getting Started

### Setup

```bash
# From root of monorepo
pnpm install

# Build packages
pnpm run build:packages

# Build obby game
pnpm run build:obby
```

### Development

```bash
# Watch mode (auto-compile on changes)
pnpm run game:obby:dev

# In another terminal, serve with Rojo
pnpm run game:obby:rojo
```

### Connect in Roblox Studio

1. Install the [Rojo plugin](https://rojo.space/docs/v7/getting-started/installation/)
2. Open Roblox Studio
3. Click "Connect" in the Rojo plugin
4. Build and sync your project

## Setting Up Stages

### Using Workspace Folders

Create a `Stages` folder in Workspace with this structure:

```
Workspace/
├── Stages/
│   ├── Stage1/         (Model or Folder)
│   │   ├── Parts...
│   │   └── Checkpoint  (BasePart)
│   ├── Stage2/
│   └── ...
└── Checkpoints/
    ├── Checkpoint1     (BasePart)
    ├── Checkpoint2
    └── ...
```

### Stage Attributes

On each Stage folder/model:

- `StageNumber` (number): Stage order (1, 2, 3...)
- `Difficulty` (number): 1-5 difficulty rating
- `CoinsReward` (number): Coins awarded on completion
- `TimeBonusThreshold` (number, optional): Seconds for time bonus

### Checkpoint Attributes

On each Checkpoint part:

- `CheckpointId` (number): Must match stage number
- `StageNumber` (number): Which stage this checkpoint belongs to

### Kill Bricks

Add the `KillBrick` attribute (boolean, true) to any part that should kill the player on touch.

## Client Controls

- **R**: Reset/respawn at checkpoint
- Touch checkpoint parts to save progress

## Architecture

```
src/
├── client/
│   ├── main.client.ts       # Client entry point
│   └── controllers/
│       ├── RemoteController.ts   # Server communication
│       ├── UIController.ts       # HUD and notifications
│       └── InputController.ts    # Keybinds
├── server/
│   ├── main.server.ts       # Server entry point
│   └── services/
│       ├── PlayerLifecycleService.ts  # Join/leave handling
│       ├── RemoteService.ts           # Remote events
│       ├── DataService.ts             # Player data persistence
│       ├── StageService.ts            # Stage config & completion
│       ├── CheckpointService.ts       # Checkpoint logic
│       └── LeaderboardService.ts      # Rankings
└── shared/
    └── types.ts             # Shared type definitions
```

## Customization

### Adding New Stages

1. Create stage geometry in Roblox Studio
2. Add a checkpoint part with proper attributes
3. Configure stage attributes on the parent folder/model
4. Test with `pnpm run game:obby:dev`

### Modifying UI

Edit `src/client/controllers/UIController.ts` to customize:

- Top bar layout
- Notification appearance
- Timer formatting

### Custom Rewards

Modify `StageService.ts` to add:

- Experience points
- Badges
- Unlockables

## Package Dependencies

This game uses:

- `@rbx/core` - Application framework and logging
- `@rbx/config-featureflags` - Feature flags and kill-switches
- `@rbx/shared-types` - Shared constants, types, and limits
- `@rbx/data` - Data persistence
- `@rbx/net` - Remote registry and validation
- `@rbx/input` - Input handling
- `@rbx/movement` - Movement validation (anti-cheat)
- `@rbx/moderation` - Ban/mute system
- `@rbx/observability` - Telemetry and metrics
- `@rbx/codes` - Promo code system
- `@rbx/leaderboards` - Cross-game leaderboards
- `@rbx/inventory` - Item/slot inventory
- `@rbx/progression` - XP, levels, prestige
- `@rbx/quests` - Quest/objective tracking
- `@rbx/rewards` - Daily rewards and achievements
- `@rbx/pets` - Pet system
- `@rbx/gacha` - Egg/loot box system
- `@rbx/cosmetics` - Cosmetic ownership and equipping
- `@rbx/battle-pass` - Seasonal battle pass
- `@rbx/localization` - Internationalization
- `@rbx/audio` - Sound and music management
- `@rbx/tutorial` - FTUE framework
- `@rbx/world-systems` - Day/night cycle, weather, seasons
