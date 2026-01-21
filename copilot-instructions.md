# Copilot Instructions (Roblox Studio Platform)

These instructions are **binding** for any Copilot-assisted code changes in this repository.

## Source of truth

- The docs site under `docs/` is the source of truth for architecture and invariants.
- If a change affects **networking, security, data/persistence, CI/CD, dashboard privileges, or release flow**, you must:
  1) update the relevant doc page(s)
  2) add/update an ADR in `docs/architecture/decisions/` when the change is hard-to-reverse or breaks compatibility

Key docs to follow:

- Clean architecture rules: `docs/architecture/clean-architecture.md`
- Networking model: `docs/architecture/networking.md`
- Networking endpoint catalog: `docs/architecture/networking-schema-catalog.md`
- Hit validation (PvP): `docs/architecture/hit-validation.md`
- Data/idempotency: `docs/architecture/state-and-data.md` and ADR-0003
- Threat model: `docs/security/threat-model.md`
- Privacy/policy: `docs/security/privacy-and-policy.md`
- Config validation: `docs/architecture/config-schema-and-validation.md`
- Dashboard RBAC/audit: `docs/dashboard/rbac-and-audit.md`
- Dashboard tech stack: `docs/dashboard/tech-stack.md`
- Schema validation: ADR-0005 (`docs/architecture/decisions/0005-schema-validation-library.md`)
- Framework choice: ADR-0006 (`docs/architecture/decisions/0006-framework-choice-custom-vs-flamework.md`)
- Roblox-TS patterns: `docs/roblox-ts/patterns.md`
- Testing strategy: `docs/standards/testing-strategy.md`
- Observability: `docs/architecture/observability.md`

## Non-negotiable security invariants

1. **Client is untrusted.** Client code may only send intent.
2. **Server decides outcomes.** Damage, cooldowns, inventory, rewards, MMR, match results are computed server-side.
3. **Every inbound remote is hardened**:
   - defined in the net registry (single source of truth)
   - runtime schema validated (server)
   - bounded payload sizes / clamped numeric ranges
   - rate-limited (per player + per endpoint)
   - uses stable error codes (never throw across boundary)
4. **All grants are idempotent.** Purchases, rewards, match results, and admin actions must have idempotency keys.
5. **Privileged actions are audited.** Dashboard ops and publish/promote actions must emit immutable audit logs.

## Clean architecture rules (dependency direction)

- Domain/shared logic must not depend on Roblox services or Instances.
- Roblox adapters (DataStore, MemoryStore, MessagingService, Teleport, Remotes transport) live in server/client infrastructure layers.
- Games consume shared packages; shared packages must not depend on games.

## Networking rules

- Do not access `RemoteEvent`/`RemoteFunction` directly from feature code.
- Add or modify endpoints only through the `net` package and keep `docs/architecture/networking-schema-catalog.md` updated.
- Changes that break compatibility require ADR + protocol version bump (ADR-0002).

## Performance and device support

- Keep hot paths allocation-light.
- Avoid excessive replication (Instances) and excessive remote traffic.
- Any feature that increases networking/replication cost must document budgets and include safeguards.
- Respect device classes (kbm/gamepad/touch) and avoid device-only competitive advantages unless explicitly designed.

## Testing and quality gates

- Any new outcome-deciding logic requires unit tests.
- Any new/changed remote must have tests for:
  - invalid payload rejection
  - bounds validation
  - rate-limit behavior
- Do not merge changes that reduce security posture or remove validation.

## CI/CD and environments

- Releases are CI-driven (ADR-0004). Do not add manual publishing steps as the primary path.
- Keep `dev`, `stage`, `prod` isolated in configuration and credentials.

## Documentation hygiene

- Keep docs concise but complete: purpose, contracts, threats, rollback.
- Update runbooks when changing behavior that affects ops.

## Defaults

- Prefer simple, explicit code.
- Avoid deep inheritance; favor composition and clear interfaces.
- Avoid changing unrelated files.
