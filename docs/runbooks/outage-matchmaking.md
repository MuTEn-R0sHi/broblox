# Runbook: Matchmaking outage

## Symptoms

- queue times spike
- teleports fail
- parties can’t join matches

## Checks

- current release version and recent promotions
- MemoryStore health (queue TTLs, errors)
- Teleport failures (rate limits, bad reserved server flow)

## Mitigation

- disable ranked queue
- fall back to casual queue
- reduce queue complexity (no backfill)

## Rollback criteria

- error rates continue rising after mitigation
- widespread teleport failures persist

## Follow-up

- add canary alerts for queue health
- add automated rollback triggers
