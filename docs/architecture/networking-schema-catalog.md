# Architecture: Networking schema catalog

This page is the living catalog of every planned network message (remote), including payload shape, validation rules, budgets, and error codes.

## Golden path example (Phase 1)

This example shows how a remote is defined, validated, and handled. Use this as a template for all new remotes.

### 1. Type Definition (Shared)

```typescript
// packages/shared-types/src/index.ts
export interface DoActionPayload {
  actionId: string;
  timestamp: number;
}
```

### 2. Validation Schema (Net)

```typescript
// packages/net/src/validation.ts
import { t } from "@rbxts/t";

const doActionSchema = t.strictInterface({
  actionId: (v) => t.string(v) && v.size() <= 50,
  timestamp: t.number,
});

export function validateDoActionPayload(value: unknown): Result<DoActionPayload> {
  if (!doActionSchema(value)) return err(ErrorCode.InvalidPayload);
  return ok(value);
}
```

### 3. Remote Registry (Net)

```typescript
// packages/net/src/remotes.ts
export const REMOTES = {
  DoAction: {
    name: "Intent_DoAction",
    rateLimit: { windowMs: 1000, maxRequests: 5 },
  },
} as const;
```

### Server handler

```typescript
// games/starter/src/server/handlers/doAction.ts
import { validate, bounded } from "@rbx/net";
import { REMOTES } from "@rbx/net/registry";
import { ErrorCode, Result } from "@rbx/shared-types";
import { getFeatureFlag } from "@rbx/config-featureflags";

const playerState = new Map<number, number>();

export function handleDoAction(player: Player, rawPayload: unknown): Result<{ newCount: number }> {
  // 1. Check kill-switch
  if (!getFeatureFlag("doAction.enabled")) {
    return { ok: false, code: ErrorCode.FeatureDisabled };
  }

  // 2. Validate payload
  const validation = validate(REMOTES.Intent_DoAction.payloadGuard, rawPayload);
  if (!validation.ok) {
    // Log violation for security scoring
    logSecurityEvent("invalid_payload", { player, remote: "Intent_DoAction" });
    return { ok: false, code: ErrorCode.InvalidPayload };
  }

  const payload = validation.value;

  // 3. Bounds check (defense in depth)
  if (payload.timestamp < 0 || payload.timestamp > os.clock() * 1000 + 5000) {
    return { ok: false, code: ErrorCode.InvalidPayload };
  }

  // 4. Apply server-authoritative state change
  const currentCount = playerState.get(player.UserId) ?? 0;
  const newCount = currentCount + 1;
  playerState.set(player.UserId, newCount);

  // 5. Return success
  return { ok: true, value: { newCount } };
}
```

### Client caller

```typescript
// games/starter/src/client/actions/doAction.ts
import { callRemote } from "@rbx/net/client";
import { REMOTES } from "@rbx/net/registry";

export async function doAction(actionId: string): Promise<number | undefined> {
  const result = await callRemote(REMOTES.Intent_DoAction, {
    actionId,
    timestamp: os.clock() * 1000,
  });

  if (result.ok) {
    return result.value.newCount;
  } else {
    // Handle error (show UI feedback, etc.)
    warn(`Action failed: ${result.code}`);
    return undefined;
  }
}
```

### Key patterns demonstrated

1. **Single source of truth**: Remote is defined once in registry
2. **Schema validation**: Server validates before processing
3. **Rate limiting**: Handled by middleware (not shown, but applied)
4. **Kill-switch**: Feature flag checked before any logic
5. **Stable errors**: Returns `ErrorCode`, never throws
6. **Server authority**: State change is server-side only

---

## Global rules (apply to all remotes)

- All inbound payloads are schema-validated on the server.
- All inbound payloads are bounded (max sizes, max arrays, clamped numbers).
- All inbound remotes are rate-limited (per player + per endpoint).
- All remotes return stable error codes; no throws across the boundary.
- The server accepts **intent**, never outcomes.

## Common envelope conventions

### Identifiers

- `requestId`: string, required for any request that can be retried
- `matchId`: string, required for match-scoped actions
- `seq`: integer, monotonic per stream (input, fire requests)
- `clientTimeMs`: integer, for lag-comp proposals (bounded window)

### Error response

For request/response calls (or server acknowledgements):

- `ok: boolean`
- `code: number` (stable)
- `retryAfterMs?: number`
- `message?: string` (dev only; never leak internal server details)

## Rate limit policy (baseline)

- **Hard real-time** (input stream): fixed frequency (no burst); drop excess.
- **Action** (fire/ability): token bucket with cooldown semantics.
- **Admin**: very low rate + RBAC enforced.

## Endpoint catalog (v1 target)

Notation:

- Direction: `C→S` client to server, `S→C` server to client
- Budget: per player unless stated

### Session & compatibility

1. `Net.Handshake` (C→S, request/response)
   - Purpose: protocol compatibility and server capabilities
   - Payload:
     - `protocolVersion: number`
     - `buildId: string`
     - `deviceClass: "kbm"|"gamepad"|"touch"`
   - Server validates:
     - protocol range check
     - device enum
   - Budget: 1 per join
   - Errors:
     - `3001 PROTOCOL_INCOMPATIBLE`

2. `Config.GetSnapshot` (C→S, request/response)
   - Purpose: deliver a validated config snapshot (non-secret)
   - Payload:
     - `knownConfigVersion?: string`
   - Budget: 1 per join + manual refresh (cooldown 30s)

### Real-time match traffic

3. `Match.Input` (C→S, event)
   - Purpose: batched input command stream
   - Payload (batched):
     - `matchId: string`
     - `seqStart: number`
     - `commands: InputCommand[]`
   - `InputCommand`:
     - `seq: number`
     - `dtMs: number` (clamped)
     - `moveX: number`, `moveY: number`
     - `lookYaw: number`, `lookPitch: number` (clamped)
     - `jump: boolean`, `sprint: boolean`, `crouch: boolean`
   - Budget:
     - 20 Hz recommended (device dependent)
     - max commands per packet (e.g. 4)
   - Abuse handling:
     - drop packets beyond budget
     - increment security score if persistent

4. `Match.Snapshot` (S→C, event)
   - Purpose: authoritative state snapshots
   - Payload:
     - `matchId: string`
     - `serverTick: number`
     - `entities: EntityState[]` (bounded)
   - Notes:
     - clients interpolate; corrections are smoothed

### Combat & abilities

5. `Combat.Fire` (C→S, request/ack)
   - Purpose: propose firing intent (server validates hit)
   - Payload:
     - `matchId: string`
     - `seq: number`
     - `weaponId: string`
     - `origin: Vector3` (clamped to player muzzle bounds)
     - `direction: Vector3` (normalized, clamped)
     - `clientTimeMs: number`
   - Budget:
     - aligned to weapon fire rate; enforce on server
   - Server validates:
     - weapon equipped
     - ammo + cooldown
     - origin plausibility
     - optional lag-comp window
   - Errors:
     - `2101 COOLDOWN`
     - `2102 NO_AMMO`
     - `2103 INVALID_STATE`

6. `Combat.ActivateAbility` (C→S, request/ack)
   - Purpose: ability activation intent
   - Payload:
     - `abilityId: string`
     - `target?: TargetRef` (bounded)
   - Budget:
     - per-ability

### Matchmaking

7. `Queue.Join` (C→S, request/response)
   - Payload:
     - `mode: string` (e.g. `ranked_2v2`)
     - `partyId?: string`
     - `regionPreference?: string`
     - `deviceClass: "kbm"|"gamepad"|"touch"`
   - Budget: low (cooldown 2s)

8. `Queue.Leave` (C→S, request/response)
   - Budget: low

9. `Queue.MatchFound` (S→C, event)
   - Payload:
     - `ticketId: string`
     - `teleportData: object` (non-secret)

### Moderation

10. `Report.Player` (C→S, request/response)

- Payload:
  - `reportedUserId: number`
  - `reasonCode: string`
  - `freeform?: string` (length limited)
- Budget: strict (cooldown 30s)

11. `Admin.Command` (C→S, request/response)

- Purpose: in-experience admin actions for authorized moderators
- Must be RBAC gated server-side
- Budget: very strict

### Telemetry

12. `Telemetry.EventBatch` (C→S, event)

- Purpose: client telemetry in batches
- Budget: strict; sample heavily
- Notes:
  - must never include secrets or personal data

## Error code ranges (recommendation)

- `1xxx`: validation (schema, bounds)
- `2xxx`: gameplay (cooldowns, state)
- `3xxx`: compatibility (protocol)
- `4xxx`: authz/admin
- `5xxx`: server busy/transient

## Change process

- Any change to this catalog requires an ADR if it breaks compatibility.
- Every new endpoint must specify:
  - payload schema
  - budget
  - abuse handling
  - observability event(s)
