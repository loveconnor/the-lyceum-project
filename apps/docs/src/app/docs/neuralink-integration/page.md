---
title: Neuralink integration
nextjs:
  metadata:
    title: Neuralink integration
    description: External integration policy and status for speculative interfaces.
---

Lyceum has no production neural-interface integration. This page documents policy for speculative external integrations.

## Current status

- No direct neural hardware integration in production.
- Any such work must be isolated behind feature flags and explicit approvals.

## Integration policy

- Document data contracts and privacy implications first.
- Start in sandbox/non-production environments.
- Require legal and security review before broader testing.

## Engineering requirements

- Strict input validation.
- Full audit logs.
- Kill switch for immediate disable.
