---
title: Onboarding
nextjs:
  metadata:
    title: Onboarding
    description: Product and engineering guide for Lyceum onboarding.
---

Onboarding establishes learner intent, baseline confidence, and first recommendations. It is the highest-leverage flow for activation.

## Primary goals

- Get a learner to first value quickly.
- Collect only data needed to personalize early experience.
- Produce a clear first path recommendation.
- Avoid dead-end steps and unclear state transitions.

## Flow shape

1. Account confirmation.
2. Learner goal capture.
3. Baseline self-assessment.
4. Recommendation handoff to dashboard/path.

## Engineering boundaries

- UI routes: `apps/web/app/onboarding/*`
- Validation should happen at both form and API boundaries.
- Recommendation payload should use shared schemas, not route-local object shapes.

## Quality checks

- Full flow keyboard accessible.
- Clear error recovery for each step.
- Analytics events emitted for completion and drop-off points.
- Time-to-complete stays within target threshold.

## Operational metrics

- Completion rate by step.
- Median completion time.
- Percentage of learners who start recommended path same session.
