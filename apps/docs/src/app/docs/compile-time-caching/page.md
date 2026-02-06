---
title: Compile-time caching
nextjs:
  metadata:
    title: Compile-time caching
    description: Build-time cache strategy for docs and app bundles.
---

Compile-time caching reduces rebuild cost and improves local iteration speed.

## What can be cached

- Markdown parsing artifacts.
- Syntax highlighting outputs.
- Static asset transforms.

## Constraints

- Cache keys must include source file hash and relevant config version.
- Any runtime-dependent output must not be compile-time cached.

## Debug checklist

- If stale output appears, clear `.next` and rebuild.
- Verify cache key includes changed config fields.
- Ensure CI cache strategy matches local assumptions.
