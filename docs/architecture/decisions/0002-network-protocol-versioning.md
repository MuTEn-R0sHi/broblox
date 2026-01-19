# ADR-0002: Network protocol versioning

## Status

Accepted

## Context

This platform will ship continuously (dev) and periodically (stage/prod), potentially with multiple live server versions at the same time. Competitive PvP requires predictable networking and a safe rollout path.

Without explicit protocol versioning, we risk:

- clients calling remotes with incompatible payload shapes
- silent gameplay desync or security bypass
- difficult staged rollouts (dev/stage/prod)

## Decision

We will implement explicit network protocol versioning.

- Define a single `PROTOCOL_VERSION` constant in shared types.
- Server supports a `minProtocolVersion` and `maxProtocolVersion` range.
- Client performs a handshake on join:
  - if client version is within range: proceed
  - if not: show “update required” UX and prevent gameplay

Compatibility rules:

- Minor additive changes (new optional fields) can keep the same major version.
- Breaking changes (renamed fields, semantic changes, new invariants) require incrementing `PROTOCOL_VERSION`.
- For staged rollouts, server may accept N-1 payloads for a bounded window (with explicit transforms and metrics).

## Alternatives considered

- No versioning, rely on manual coordination
  - Rejected: too risky for live ops.

- Version per remote
  - Rejected initially: adds complexity; we start with a global protocol version.

## Consequences

- Requires an explicit handshake remote and a place to store min/max on the server.
- Rollouts become safer: you can deploy server first, then clients, with a compatibility window.
- Adds ongoing discipline: breaking changes require a deliberate bump.

## Rollout plan

1. Add shared `PROTOCOL_VERSION` constant.
2. Add handshake flow in the `net` package.
3. Log handshake outcomes (accepted/rejected) for rollout monitoring.
4. Add a “compatible client required” gate for ranked matchmaking.
