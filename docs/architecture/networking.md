# Architecture: Networking

Networking is the primary exploit surface. We treat it like a public API.

## Goals

- Typed, versioned, schema-validated remotes
- Rate limiting and abuse penalties
- Protocol compatibility for staged rollouts

## Remote contract rules

- Every remote has:
  - name (stable)
  - direction (client→server or server→client)
  - payload schema (runtime-validated)
  - error codes (stable)
  - rate limit budget

- Server accepts intents, not outcomes:
  - OK: "fire weapon", "activate ability", "move input"
  - NOT OK: "deal 25 damage", "set position", "grant item"

## Remote registry

Single source of truth (planned):

- A `net` registry defines all remotes in code.
- Registry generates server/client stubs.
- Registry ensures remotes exist under `ReplicatedStorage/Remotes`.

## Validation

Server-side validation is mandatory:

- type checks (numbers/strings/arrays)
- bounds checks (clamp vectors, max array lengths)
- state checks (cooldowns, ammo, match phase)

Reject unknown fields to reduce payload abuse.

## Rate limiting

Token bucket per:

- player + endpoint
- global endpoint budget

Penalties (configurable):

- log + score signal
- throttle
- kick (when malicious)

## Protocol versioning

- Client embeds `PROTOCOL_VERSION`.
- Server advertises `min/max` supported.
- Handshake decides:
  - continue
  - degrade features
  - force update (incompatible)

## PvP specifics

- Inputs are sent at a fixed rate (batched), not spammed.
- Server snapshots are applied with interpolation on client.
- Hit validation:
  - server raycasts/projectile sim
  - optional lag compensation (bounded rewind window)

## Error model

Never throw across remotes.

- Responses use `ok: boolean` and stable numeric `code`.
- Messages may include `retryAfterMs` for rate limits.
