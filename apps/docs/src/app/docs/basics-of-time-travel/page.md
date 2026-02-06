---
title: Basics of time-travel
nextjs:
  metadata:
    title: Basics of time-travel
    description: Debugging historical state and event timelines in Lyceum.
---

"Time travel" in Lyceum means reconstructing user state from historical events to debug progression issues.

## When to use timeline debugging

- Incorrect module completion state.
- Missing reflection/lab transitions.
- Inconsistent analytics versus UI progress.

## Workflow

1. Identify learner/session and time window.
2. Retrieve ordered events from persistence.
3. Rebuild derived progression state.
4. Compare expected vs actual transitions.

## Guardrails

- Use immutable event records where possible.
- Keep event schemas versioned.
- Record source system for each event.
