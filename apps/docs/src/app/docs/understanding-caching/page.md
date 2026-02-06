---
title: Understanding caching
nextjs:
  metadata:
    title: Understanding caching
    description: Caching fundamentals and practical use in Lyceum.
---

Caching improves perceived performance but must never become the source of truth for learner progress.

## Cache categories

- Request-level memoization.
- Application in-memory caches.
- CDN/static asset caches.

## Invalidation rules

- Invalidate on authoritative data mutation.
- Prefer scoped invalidation over global clears.
- Track invalidation events for debugging.

## Common pitfalls

- Serving stale progression state.
- Caching permission-sensitive responses too broadly.
- Missing cache key dimensions (user, locale, feature flags).
