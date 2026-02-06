---
title: Labs
nextjs:
  metadata:
    title: Labs
    description: Hands-on lab architecture and quality standards in Lyceum.
---

Labs convert conceptual understanding into demonstrated skill. They should be practical, measurable, and resilient to retries.

## Lab lifecycle

1. Learner enters lab from a path module.
2. Instructions and rubric load.
3. Submission is evaluated (automated or assisted).
4. Score/feedback updates progression state.

## Lab design standards

- State expected outputs clearly.
- Provide examples of successful completion.
- Define retry policy and grading behavior.
- Separate instructional content from scoring logic.

## Engineering guidance

- Keep evaluation deterministic where possible.
- Store submissions with revision history.
- Return structured feedback for consistent rendering.
- Protect external integrations with timeouts and fallback messaging.

## QA focus areas

- Edge-case submissions.
- Retry behavior and score reconciliation.
- Partial outage behavior for external dependencies.
