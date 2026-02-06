---
title: Learning paths
nextjs:
  metadata:
    title: Learning paths
    description: How Lyceum learning paths are authored and delivered.
---

Learning paths are the structured backbone of Lyceum. They organize modules, prerequisites, and progression rules.

## Path model

- Path: container for a topic journey.
- Module: ordered content unit inside a path.
- Milestone: checkpoint used for progression and reflection triggers.

## Authoring rules

- Write module goals in outcome language.
- Keep module difficulty progression explicit.
- Tie labs and reflections to meaningful milestones.
- Version paths when changing grading/progression logic.

## Runtime behavior

1. User context loads.
2. Eligibility and prerequisite checks run.
3. Next recommended module resolves.
4. Progress state updates after completion events.

## Common implementation pitfalls

- Inconsistent module IDs across content and code.
- Hard-coded path branching in UI components.
- Progress updates that are not idempotent.

## Review checklist

- Path metadata complete.
- Prerequisite logic test-covered.
- Analytics events emitted at module start/complete.
