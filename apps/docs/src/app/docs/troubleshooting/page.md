---
title: Troubleshooting
nextjs:
  metadata:
    title: Troubleshooting
    description: Common local development issues and fixes for Lyceum.
---

Use this page for the fastest path to recovery when local development breaks.

## `MODULE_NOT_FOUND` for Next.js vendor chunks

Symptom:

```text
Cannot find module './vendor-chunks/...'
```

Fix:

```shell
rm -rf apps/web/.next apps/docs/.next apps/landing/.next
pnpm --filter lyceum-docs dev
```

## Command palette does not open with `Cmd/Ctrl + K`

- Confirm docs search is mounted in the header.
- Ensure browser focus is not trapped in an input that intercepts keybindings.
- Hard refresh after hot-reload/runtime errors.

## Hydration mismatch on docs headings

Symptom often includes mismatched heading IDs.

Fixes:

- Keep heading text unique per page where possible.
- Avoid client-only heading ID generation that can differ from server output.
- Clear `.next` and restart if stale transforms were cached.

## Workspace lockfile warning

If you see multiple lockfiles in a pnpm workspace:

- Remove `apps/docs/package-lock.json` if npm is not used there.
- Keep the root `pnpm-lock.yaml` as the source of truth.

## Search index looks stale

The docs search index is generated from markdown pages.

- Restart the docs dev server after major content edits.
- Confirm `page.md` files have valid frontmatter and markdown headings.
