# Runbook: Release rollback

## When to roll back

- SEV0/SEV1 incidents linked to a release
- economy integrity risk
- widespread client incompatibility

## Steps

1. Disable risky features (ranked, trading, grants)
2. Promote previous known-good build to prod
3. Verify:
   - matchmaking success
   - error rate normalization
   - economy grant stability

## After rollback

- root cause analysis
- fix forward in dev
- add tests and monitors to prevent recurrence
