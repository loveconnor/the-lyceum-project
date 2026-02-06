---
title: Installation
nextjs:
  metadata:
    title: Installation
    description: Clone and run The Lyceum Project locally.
---

This guide sets up Lyceum from an empty machine to a working local environment.

## Prerequisites

- `git` 2.40+
- Node.js `20.x`
- `pnpm` 9+ (recommended via Corepack)

```shell
corepack enable
node --version
pnpm --version
git --version
```

## Clone the repository

```shell
git clone https://github.com/loveconnor/the-lyceum-project.git
cd the-lyceum-project
```

If you plan to contribute immediately:

```shell
git checkout -b your-feature-name
```

## Install dependencies

Run install from the workspace root (not inside an individual app):

```shell
pnpm install
```

## Configure environment variables

At minimum, configure `apps/web`:

```shell
cp apps/web/.env.example apps/web/.env.local
```

Then set required values for auth, database, and third-party integrations. See [Environment](/docs/environment) for file-by-file guidance.

## Start local development

Run each app in a separate terminal from the repo root.

```shell
pnpm --filter web dev
pnpm --filter lyceum-docs dev
pnpm --filter landing dev
```

`landing` is optional if you are only working on product/docs.

## Verify the setup

- Open web app: `http://localhost:3000` (or next available port).
- Open docs app: `http://localhost:3001` when `3000` is occupied.
- Complete a basic smoke check: login flow, onboarding entry, one docs page.

## Common first-run fixes

- Next.js lockfile warning: remove `apps/docs/package-lock.json` if using pnpm workspace tooling.
- Missing vendor chunks: stop dev server, remove `apps/*/.next`, restart.
- Environment errors: confirm `.env.local` files exist and keys are not empty.

For more issues, use [Troubleshooting](/docs/troubleshooting).
