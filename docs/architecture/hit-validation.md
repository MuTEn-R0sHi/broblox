```markdown
# Architecture: Hit validation (PvP)

This page defines how combat hits are validated in competitive modes. Hit validation is the highest-risk area for exploits and fairness complaints.

## Goals

- Server authority: hits are confirmed by server simulation
- Fairness: no player has systematic advantage due to ping or device
- Anti-cheat: impossible shots are rejected silently
- Feel: responsive feedback despite latency

## Trust model

- Client proposes **intent**: "I fired at time T, direction D, from position P"
- Server validates and simulates: "Was this shot plausible? Did it hit?"
- Client receives **confirmation** or silent rejection

The client may show optimistic hit markers, but damage/kills are only applied on server confirmation.

## Snapshot and tick model

### Server tick rate

- Authoritative simulation runs at **60 Hz** (Heartbeat)
- State changes are computed each tick

### Snapshot rate

- Snapshots are sent to clients at **20 Hz** (every 3 ticks)
- Snapshots contain: entity positions, health, relevant state
- Clients interpolate between snapshots for smooth visuals

### Client input rate

- Inputs are batched and sent at **20 Hz** (aligned with snapshot rate)
- Each input batch contains up to 4 commands (covering ~200ms)

## Lag compensation

### Overview

Lag compensation allows the server to "rewind" the game state to validate a shot from the client's perspective. This improves hit registration for high-ping players.

### Rewind window

- **Maximum rewind**: 150ms
- Shots claiming a `clientTimeMs` older than 150ms from server time are validated against **current** server state (no rewind benefit)
- This bounds the advantage a high-ping or exploiting player can gain

### Rewind implementation

1. Server stores recent snapshots (ring buffer, ~200ms history)
2. On `Combat.Fire`, server:
   - Clamps `clientTimeMs` to [serverTime - 150ms, serverTime]
   - Finds the snapshot closest to the claimed time
   - Performs raycast/projectile simulation against that snapshot
   - Records hit or miss

### Hit detection

For hitscan weapons:
- Server raycast from validated origin in validated direction
- Check line-of-sight (no shooting through walls)
- Check target hitbox intersection

For projectiles:
- Server spawns authoritative projectile
- Projectile simulates at server tick rate
- Hit is registered when projectile intersects target hitbox

## Conflict resolution policy

### Competitive (ranked) modes

- **Server simulation wins**: no favor-the-shooter
- If client and server disagree, server result is canonical
- This prioritizes fairness over individual feel

### Casual modes

- **Favor-the-shooter** with limits:
  - If client claims hit and server rewind confirms plausibility, grant hit
  - If server rewind shows clear miss (>2m discrepancy), reject
  - Flag suspicious patterns for abuse scoring

### Mutual kills

- Both players can kill each other in the same tick window
- Deaths are processed before respawn immunity

## Origin validation

Clients send `origin` (muzzle position) with fire intents. Server validates:

- Origin is within plausible bounds of player's current position
- Origin is not inside geometry (wall clip exploit)
- Origin matches equipped weapon's muzzle offset (±tolerance)

Tolerance: **0.5 studs** (accounts for animation/interpolation)

Violations:
- Reject shot silently
- Increment security score

## Direction validation

Clients send `direction` (aim vector). Server validates:

- Direction is normalized (length ~1.0)
- Direction does not indicate impossible snap (>180° from previous frame)

Violations:
- Reject shot silently
- High-confidence aimbot signals flagged for review

## Hitbox model

### Hitbox types

- **Head**: smaller, higher damage multiplier
- **Body**: standard
- **Limbs**: optional, lower damage

### Hitbox simplification

- Use simplified capsules/boxes for server validation (not mesh-accurate)
- Client may use detailed hitboxes for visual feedback (non-authoritative)
- Simplified hitboxes are slightly larger than visual to reduce "I clearly hit them" complaints

### Hitbox during animations

- Hitboxes follow bone positions (approximate)
- Emotes/taunts use standing hitbox (no exploit via animation)

## Abuse detection

### Signals

- Shots with origin far from player position
- Shots with impossible direction changes (snap aim)
- Shots landing on occluded targets (through walls)
- Statistically improbable accuracy (over time)

### Response

- Low confidence: log + increment score
- Medium confidence: flag for review
- High confidence: quarantine to unranked
- Automated bans only with very high confidence + human review queue

## Performance considerations

- Rewind buffer: fixed size (e.g., 12 snapshots × 20 players × 100 bytes = ~24KB)
- Raycast budget: limit rays per tick (e.g., 100 total across all players)
- Hitbox updates: only for visible/relevant entities

## Client prediction

- Client may show hit markers optimistically
- Client must not apply damage until server confirms
- Mismatch handling: smooth correction (no jarring teleports)

## Configuration

All values should be tunable via config:

```typescript
hitValidation: {
  maxRewindMs: 150,
  originToleranceStuds: 0.5,
  snapshotRateHz: 20,
  maxRaysPerTick: 100,
  favorShooterMode: "off" | "casual-only",
}
```

## Testing requirements

- Unit tests for rewind buffer logic
- Integration tests for hit/miss scenarios with simulated latency
- Exploit tests:
  - Origin manipulation (should reject)
  - Impossible snap (should reject)
  - Wall clip (should reject)

## Definition of done

- [ ] Server validates all combat hits (no client-trusted damage)
- [ ] Rewind window is bounded and configurable
- [ ] Origin and direction validation implemented
- [ ] Abuse signals are logged with structured events
- [ ] Hit validation config is externalized
```
