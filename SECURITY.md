# Security Policy

## Reporting a vulnerability

Please do not open public issues for security reports.

Preferred: open a GitHub Security Advisory (private report) in this repository.

If that is not possible, contact the maintainers via email and include:

- A description of the issue and impact
- Reproduction steps or proof-of-concept (if available)
- Any suggested mitigation

## Security posture (high level)

- Client is untrusted; server decides outcomes.
- All inbound remotes must be schema-validated and rate-limited.
- Privileged actions must be authorized (RBAC) and audited.

Authoritative guidance lives in:

- `docs/security/threat-model.md`
- `docs/architecture/networking.md`
- `docs/architecture/state-and-data.md`
