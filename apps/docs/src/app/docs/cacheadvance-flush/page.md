---
title: CacheAdvance.flush()
nextjs:
  metadata:
    title: CacheAdvance.flush()
    description: Reference for flushing scoped caches in Lyceum.
---

`CacheAdvance.flush()` invalidates cached values for a known scope when source-of-truth data changes.

## Use cases

- Content metadata updated.
- Path configuration changed.
- Role/permission mutation affects access checks.

## Usage guidance

```ts
cacheAdvance.flush({ scope: 'path', key: pathId })
```

## Safety rules

- Flush the narrowest possible scope.
- Emit an audit log event for bulk flushes.
- Avoid global flushes during peak traffic.
