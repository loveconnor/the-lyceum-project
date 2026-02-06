---
title: AI assistant
nextjs:
  metadata:
    title: AI assistant
    description: Integration patterns and guardrails for Lyceum's assistant.
---

Lyceum's assistant provides contextual coaching across onboarding, paths, labs, and reflections.

## Context assembly

Assistant requests should include:

- Current route context and task type.
- Learner progress snapshot.
- Recent reflection highlights.
- Relevant path/lab metadata.

Do not include raw secrets or unnecessary personally identifying data.

## Response constraints

- Prioritize coaching guidance over giving final answers directly.
- Return concise defaults with optional expansion.
- Use structured response fields for deterministic UI rendering.

## Reliability requirements

- Enforce request timeouts.
- Handle partial model responses gracefully.
- Log request metadata for debugging without storing secret values.

## Evaluation loop

Track:

- Suggestion acceptance rate.
- Follow-up clarification rate.
- Session-level completion impact after assistant interactions.
