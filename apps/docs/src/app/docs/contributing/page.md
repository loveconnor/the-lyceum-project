---
title: How to contribute
nextjs:
  metadata:
    title: How to contribute
    description: Contribution workflow and standards for The Lyceum Project.
---

Contributions should be small enough to review quickly, testable, and documented.

## Standard workflow

1. Create a branch from `main`.
2. Implement change with tests.
3. Update docs for behavior changes.
4. Open PR with clear scope and risk summary.

## PR quality bar

- Explain user-facing impact.
- Include test evidence.
- Call out migrations, flags, or operational concerns.
- Keep unrelated refactors out of feature PRs.

## Code style expectations

- Follow existing patterns in touched files.
- Prefer shared utilities over copy-pasted helpers.
- Keep components focused and composable.

## Documentation expectations

If behavior changes, update the corresponding page in `apps/docs/src/app/docs/*/page.md` in the same PR.
