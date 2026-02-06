---
title: Getting started
nextjs:
  metadata:
    title: Getting started
    description: Start here to set up and contribute to The Lyceum Project.
---

Lyceum is a learning platform monorepo with three main apps: product (`apps/web`), docs (`apps/docs`), and landing (`apps/landing`). This guide gives you the shortest reliable path from clone to first meaningful contribution.

## What to read first

1. [Installation](/docs/installation) for clone, setup, and local run commands.
2. [Environment](/docs/environment) for environment variable structure.
3. [Onboarding](/docs/onboarding) and [Learning paths](/docs/learning-paths) for product behavior.
4. [Testing](/docs/testing) and [How to contribute](/docs/contributing) before opening a PR.

## Monorepo map

- `apps/web`: primary user-facing learning product.
- `apps/docs`: this documentation site.
- `apps/landing`: marketing and acquisition site.
- `packages/*`: shared utilities and domain packages.

## Daily workflow

1. Pull latest `main` and create a feature branch.
2. Run the apps you need (`web`, `docs`, optionally `landing`).
3. Make changes with tests for any behavior updates.
4. Update docs in the same branch when product behavior changes.

## Definition of done for documentation

- New contributors can follow the page without private context.
- Commands are copy/paste-ready and include expected paths.
- Cross-links exist for deeper topics.
- Troubleshooting section includes at least one realistic failure mode.
