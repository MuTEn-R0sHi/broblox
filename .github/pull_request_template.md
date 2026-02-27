## Summary

-

## Type

- [ ] Docs-only
- [ ] Code change
- [ ] CI/CD change
- [ ] Dashboard change

## Architecture / Docs alignment

- [ ] Docs updated (or not needed)
- [ ] If this changes networking/security/data/CI/release flow, relevant docs pages updated

Docs to check (as applicable):

- `docs/architecture/clean-architecture.md`
- `docs/architecture/networking.md`
- `docs/architecture/networking-schema-catalog.md`
- `docs/architecture/state-and-data.md`
- `docs/architecture/config-schema-and-validation.md`
- `docs/security/threat-model.md`
- `docs/security/privacy-and-policy.md`
- `docs/dashboard/rbac-and-audit.md`

## ADR requirement

- [ ] ADR not required
- [ ] ADR added/updated in `docs/architecture/decisions/` and linked here:

## Security checklist (required for gameplay/network changes)

- [ ] Server remains authoritative for outcomes (damage, cooldowns, inventory, rewards, MMR, match results)
- [ ] All inbound remotes are schema-validated and bounded
- [ ] All inbound remotes are rate-limited (per player + per endpoint)
- [ ] Stable error codes used across boundary (no throws)
- [ ] Idempotency keys used for grants/admin actions where applicable

## Testing checklist

- [ ] Unit tests added/updated for outcome-deciding logic
- [ ] Remote validation tests (invalid payload, bounds, rate limit) added/updated (if applicable)

## Ops / Rollback

- [ ] Rollback impact considered
- [ ] Runbooks updated if operational behavior changed

## Notes for reviewers

- Key files to review:
- Risks:
- Rollback plan:
