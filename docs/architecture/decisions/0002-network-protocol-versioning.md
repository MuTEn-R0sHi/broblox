# ADR-0002: Network protocol versioning

## Status

**Implemented** ✅

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
  - if not: show "update required" UX and prevent gameplay

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

## Implementation

### Constants (\`@broblox/shared-types\`)

\`\`\`typescript
export const PROTOCOL_VERSION = 1;
export const MIN_PROTOCOL_VERSION = 1;
\`\`\`

### Validation (\`@broblox/net/protocol.ts\`)

\`\`\`typescript
import { validateProtocolVersion } from "@broblox/net";

const result = validateProtocolVersion(clientVersion);
if (!result.compatible) {
// Reject with minVersion in error context
}
\`\`\`

Key functions:

- \`validateProtocolVersion(version, config?)\` - Validates with N-1 support
- \`isExactVersion(version)\` - Strict match (for ranked)
- \`isLegacyVersion(version)\` - Detects N-1 clients
- \`getCurrentProtocolVersion()\` - Current server version
- \`getMinProtocolVersion()\` - Minimum supported version

### Handshake Flow

1. Client sends \`HandshakeRequest\` with \`protocolVersion\`
2. Server calls \`validateProtocolVersion()\`
3. If incompatible: return \`ErrorCode.ProtocolMismatch\` with version context
4. If legacy: log for deprecation tracking
5. If compatible: proceed with session

### Test Coverage

- 21 unit tests in \`packages/net/src/protocol.test.ts\`
- Covers: version ranges, N-1 compatibility, edge cases, invalid inputs

## Rollout checklist

- [x] Add shared \`PROTOCOL_VERSION\` constant
- [x] Add \`validateProtocolVersion()\` in net package
- [x] Handshake validates protocol version
- [x] N-1 compatibility with \`allowLegacy\` option
- [x] Error response includes \`minVersion\` context
- [x] Log legacy version usage for monitoring
- [ ] Add "compatible client required" gate for ranked matchmaking (Phase 2)
