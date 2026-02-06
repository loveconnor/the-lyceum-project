---
title: Predictive data generation
nextjs:
  metadata:
    title: Predictive data generation
    description: Generating synthetic/predictive datasets for testing Lyceum systems.
---

Predictive and synthetic data helps validate recommendation and analytics pipelines before production traffic changes.

## Use cases

- Load-testing progression calculations.
- Validating analytics schema migrations.
- Reproducing rare behavior patterns.

## Guardrails

- Never mix synthetic records with production learner identities.
- Tag generated datasets clearly.
- Keep generation deterministic for reproducibility.

## Review checklist

- Dataset assumptions documented.
- Statistical shape compared to production baseline.
- Cleanup procedure included.
