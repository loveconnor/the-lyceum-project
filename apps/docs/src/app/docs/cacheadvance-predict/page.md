---
title: CacheAdvance.predict()
nextjs:
  metadata:
    title: CacheAdvance.predict()
    description: Reference for proactive cache warming in Lyceum.
---

`CacheAdvance.predict()` pre-warms likely-needed data to reduce perceived latency.

## Typical candidates

- Next module metadata after current module load.
- Learner dashboard summary after onboarding completion.
- Lab rubric data before likely lab entry.

## Usage guidance

```ts
cacheAdvance.predict({ scope: 'module', key: nextModuleId })
```

## Operational constraints

- Keep predictive prefetch bounded.
- Favor high-confidence candidates.
- Track hit-rate to validate effectiveness.
