---
title: Deployment
nextjs:
  metadata:
    title: Deployment
    description: Deployment strategy and release safety for Lyceum.
---

Deployments should protect learner continuity and data integrity first, then optimize release speed.

## Pre-deploy checklist

- All required tests pass.
- Environment variables set for target environment.
- Database migrations reviewed and rollback plan documented.
- Release notes summarize behavior changes and operational risk.

## Deployment sequence

1. Deploy low-risk surfaces first (docs/landing if changed).
2. Deploy web app and API changes.
3. Run smoke checks for onboarding, paths, labs, and reflections.
4. Validate analytics and assistant request health.

## Rollback principles

- Keep rollback command/process documented in the PR.
- Feature-flag high-risk changes when possible.
- If migration is non-reversible, provide forward-fix playbook.

## Post-deploy monitoring

- Error rate and latency spikes.
- Drop in key conversion metrics.
- Event ingestion gaps in analytics.
