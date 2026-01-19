# Runbook: Data corruption / economy integrity

## Symptoms

- duplicate grants
- negative balances
- mismatched inventory states

## Immediate actions

1. Freeze writes for high-risk mutations (grants, trading, premium receipts)
2. Enable kill-switches for economy features
3. Preserve evidence (audit logs + ledger snapshots)

## Containment

- block duplicate idempotency keys aggressively
- quarantine affected players from ranked

## Recovery

- run reconciliation using ledger as source of truth
- compensate players based on policy

## Follow-up

- add regression tests for the corruption vector
- update ADR-0003 if the model changes
