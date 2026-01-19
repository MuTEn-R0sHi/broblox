# Runbook: Incident response

## Severity levels

- SEV0: platform-wide outage, security breach, economy corruption
- SEV1: major feature outage (matchmaking down, ranked unusable)
- SEV2: partial degradation, elevated errors
- SEV3: minor issue

## First 10 minutes

1. Declare severity and incident commander
2. Contain blast radius (disable risky features via kill-switch)
3. Preserve evidence (logs, security events, release versions)
4. Communicate status (internal + player-facing if needed)

## Containment tools

- Disable ranked matchmaking
- Disable trading/economy grants
- Throttle high-cost remotes
- Roll back to previous release

## After containment

- Identify root cause
- Fix forward or roll back
- Write postmortem with action items
