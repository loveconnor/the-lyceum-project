---
title: Writing plugins
nextjs:
  metadata:
    title: Writing plugins
    description: Plugin authoring guidelines for extending Lyceum.
---

Plugins should extend Lyceum behavior without coupling tightly to internal implementation details.

## Plugin contract expectations

- Explicit input/output schema.
- Deterministic behavior for same inputs.
- Timeouts and fallback handling.

## Authoring steps

1. Define plugin interface and config shape.
2. Implement core logic with unit tests.
3. Register plugin through approved extension point.
4. Document operational and failure behavior.

## Security considerations

- Validate all plugin configuration.
- Restrict external network access where possible.
- Log plugin failures with contextual metadata.
