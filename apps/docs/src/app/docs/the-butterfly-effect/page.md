---
title: The butterfly effect
nextjs:
  metadata:
    title: The butterfly effect
    description: Managing downstream impact of small product changes in Lyceum.
---

Small UI or schema changes can produce large downstream effects in progression, analytics, and assistant behavior.

## Change impact checklist

- Does this alter event payload shape?
- Does this change completion or scoring semantics?
- Does this affect assistant context quality?
- Does this break existing dashboard assumptions?

## Safe rollout pattern

1. Add feature flag for high-impact changes.
2. Deploy with targeted monitoring.
3. Compare outcome metrics against baseline.
4. Remove flag only after stability window.
