---
title: Testing
nextjs:
  metadata:
    title: Testing
    description: Testing strategy for Lyceum product quality.
---

Testing in Lyceum should focus on progression correctness, data integrity, and assistant reliability.

## Test layers

- Unit tests for domain utilities and validation.
- Integration tests for API handlers and persistence paths.
- End-to-end tests for onboarding, path progression, labs, and reflections.

## Priority risk areas

- Progress state calculations.
- Prerequisite gating logic.
- Lab retry and scoring behavior.
- Assistant context construction and fallback paths.

## CI expectations

1. Lint and type-check on all PRs.
2. Run targeted tests for touched surfaces.
3. Block merge on critical flow failures.

## Local test workflow

```shell
pnpm --filter web test
pnpm --filter web lint
pnpm --filter web typecheck
```

Adjust filter names if package scripts differ.
