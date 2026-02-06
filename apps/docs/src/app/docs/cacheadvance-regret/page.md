---
title: CacheAdvance.regret()
nextjs:
  metadata:
    title: CacheAdvance.regret()
    description: Reference for recording mispredicted cache warms.
---

`CacheAdvance.regret()` records mispredictions from proactive warming so heuristics can be tuned.

## Why it matters

Predictive caching can waste compute and memory if hit-rate is low. Regret tracking closes the loop.

## Usage guidance

```ts
cacheAdvance.regret({ scope: 'module', key: moduleId, reason: 'unused' })
```

## Metrics to monitor

- Regret rate by scope.
- Memory overhead of unused entries.
- Improvement after heuristic updates.
