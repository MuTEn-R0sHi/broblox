# Roblox-TS: Patterns

## Platform lifecycle pattern

Planned pattern:

- Server: services with `init(container)` and `start()`
- Client: controllers with `init(container)` and `start()`

This makes boot order explicit and testable.

## Networking pattern

- All remotes are defined in `net` registry.
- Game code uses typed stubs, not raw `RemoteEvent` access.

## Security-by-default

- Default deny: if a remote is not in the registry, it does not exist.
- Validation and rate limiting are middleware, not ad-hoc checks.

## UI kit usage

- Central design tokens (spacing, typography, color).
- Device-safe layout rules:
  - safe areas
  - scalable text
  - controller navigation

## Competitive PvP patterns

- Client prediction for feel.
- Server arbitration for outcomes.
- Limited lag compensation (bounded rewind window, simplified hitboxes).
