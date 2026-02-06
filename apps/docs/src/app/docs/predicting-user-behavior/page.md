---
title: Predicting user behavior
nextjs:
  metadata:
    title: Predicting user behavior
    description: Responsible behavior prediction for personalization in Lyceum.
---

Behavior prediction in Lyceum should improve guidance quality without reducing learner agency.

## Acceptable prediction targets

- Likelihood of completing next module.
- Risk of drop-off during onboarding.
- Need for additional assistant scaffolding.

## Modeling rules

- Use interpretable features where possible.
- Keep model outputs as recommendations, not irreversible decisions.
- Regularly evaluate for bias and drift.

## Product usage

- Trigger supportive interventions, not hard restrictions.
- Log when prediction changes user experience.
