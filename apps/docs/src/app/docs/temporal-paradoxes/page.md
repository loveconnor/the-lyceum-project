---
title: Temporal paradoxes
nextjs:
  metadata:
    title: Temporal paradoxes
    description: Handling out-of-order events and conflicting state updates in Lyceum.
---

A temporal paradox occurs when event order and derived state disagree.

## Common causes

- Delayed webhook deliveries.
- Retry systems replaying stale messages.
- Client/server clock skew assumptions.

## Mitigation strategies

- Use monotonic sequence numbers where possible.
- Enforce idempotent update handlers.
- Reconcile derived state with canonical event streams.

## Incident response

1. Freeze non-essential writes.
2. Rebuild affected learner states from ordered events.
3. Patch ordering/idempotency gaps.
