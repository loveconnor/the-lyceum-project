---
title: Environment
nextjs:
  metadata:
    title: Environment
    description: Environment variable setup for The Lyceum Project apps.
---

Lyceum uses per-app environment files. Keep secrets local and avoid checking `.env.local` into git.

## Environment file layout

- `apps/web/.env.example` -> `apps/web/.env.local`
- `apps/docs/.env.example` (if present) -> `apps/docs/.env.local`
- `apps/landing/.env.example` (if present) -> `apps/landing/.env.local`

If an app has no `.env.example`, inspect its `README.md` and runtime errors for required keys.

## Required categories in `apps/web`

- Authentication provider configuration.
- Database connection and pooling settings.
- AI provider keys and model defaults.
- Analytics/telemetry identifiers.
- Optional feature flags.

## Safe setup process

1. Copy examples to `.env.local`.
2. Fill only keys used by the app you are running.
3. Restart dev servers after any env change.
4. Confirm startup logs no missing-variable errors.

## Team practices

- Never commit `.env.local`.
- Prefer manager-provided shared secrets over ad hoc personal values.
- Rotate leaked or accidentally exposed keys immediately.

## Debug checklist

- Wrong app running? Ensure command uses the correct `pnpm --filter ...` target.
- Value not picked up? Restart the server; Next.js does not always hot-reload env files.
- Runtime mismatch? Check both server-side and client-side variable naming conventions.
