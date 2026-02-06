---
title: Analytics
nextjs:
  metadata:
    title: Analytics
    description: Event strategy and instrumentation standards for Lyceum.
---

Lyceum analytics should measure learning outcomes and system reliability, not just UI interaction volume.

## Core event families

- Onboarding (`onboarding_started`, `onboarding_completed`).
- Paths (`path_started`, `module_completed`).
- Labs (`lab_started`, `lab_submitted`, `lab_completed`).
- Reflections (`reflection_started`, `reflection_submitted`).
- Assistant (`assistant_opened`, `assistant_suggestion_applied`).

## Event design rules

- Use versioned event schemas.
- Keep payloads minimal and purposeful.
- Include stable learner/session identifiers that preserve privacy.

## Data quality controls

- Alert on major event volume drops.
- Validate dashboard expectations after each release.
- Maintain event dictionaries for analysts and engineers.

## Implementation guidance

- Emit from stable product boundaries.
- Avoid duplicative events from nested UI effects.
- Co-locate event constants with feature modules.
