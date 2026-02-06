---
title: CacheAdvance.revert()
nextjs:
  metadata:
    title: CacheAdvance.revert()
    description: Reference for reverting speculative cache entries.
---

`CacheAdvance.revert()` rolls back speculative cache mutations when a dependent action fails.

## Example scenarios

- Optimistic progress update rejected by server validation.
- Prefetched branch selected incorrectly.
- Permission check fails after speculative load.

## Usage guidance

```ts
cacheAdvance.revert({ token: operationToken })
```

## Best practices

- Generate operation tokens per speculative transaction.
- Revert only affected keys.
- Log revert frequency for stability analysis.
