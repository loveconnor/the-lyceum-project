---
title: Architecture
nextjs:
  metadata:
    title: Architecture
    description: High-level architecture for The Lyceum Project.
---

Lyceum is a pnpm monorepo with clear app boundaries and shared domain utilities.

## Repository boundaries

- `apps/web`: learner-facing product application.
- `apps/docs`: internal and contributor documentation.
- `apps/landing`: public marketing surface.
- `packages/*`: shared cross-app libraries.

## Web app layers

1. App routes and UI components.
2. Domain services and orchestration logic.
3. Data/integration clients.
4. Persistence and analytics sinks.

## Integration flow

1. Route loads user and activity context.
2. APIs validate input and enrich with domain data.
3. Assistant, analytics, and scoring systems consume normalized payloads.
4. Persisted outputs update progression state.

## Architecture rules

- Prefer shared schemas over route-specific payloads.
- Keep side effects in service boundaries, not leaf components.
- Version high-impact contracts when behavior changes.
