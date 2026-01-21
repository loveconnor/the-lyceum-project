# @ai-json-renderer/core

**Predictable. Guardrailed. Fast.** Core library for safe, user-prompted UI generation.

## Features

- **Conditional Visibility**: Show/hide components based on data paths, auth state, or complex logic expressions
- **Rich Actions**: Actions with typed parameters, confirmation dialogs, and success/error callbacks
- **Enhanced Validation**: Built-in validation functions with custom catalog functions support
- **Type-Safe Catalog**: Define component schemas using Zod for full type safety
- **Framework Agnostic**: Core logic is independent of UI frameworks

## Installation

```bash
## @ai-json-renderer/core

Core building blocks for safe, predictable AI-generated UI.

This package is framework-agnostic. It helps you define a catalog of allowed components, build system prompts, and validate AI output. Your UI framework then renders the JSON safely.

What it provides

- Catalog definition with Zod schemas
- Prompt helpers for consistent system prompts
- Validation helpers to enforce rules
- Visibility and logic helpers
- Types shared across packages

Install

```bash
pnpm add @ai-json-renderer/core
```

Basic example

```ts
import { createCatalog, generateCatalogPrompt } from "@ai-json-renderer/core";
import { z } from "zod";

const catalog = createCatalog({
  name: "My UI",
  components: {
    Card: {
      props: z.object({
        title: z.string().optional(),
      }),
      hasChildren: true,
      description: "Container card",
    },
    Button: {
      props: z.object({
        label: z.string(),
      }),
      hasChildren: false,
      description: "Button",
    customValidation: (value) => typeof value === 'string' && value.length > 0,
  },
});

const systemPrompt = generateCatalogPrompt(catalog);
```

How to use it

1) Define a catalog of allowed components.
2) Create a system prompt from the catalog.
3) Ask a model to output JSON that matches the catalog.
4) Validate and render that JSON in your UI.

Common exports

- `createCatalog` for catalog creation
- `generateCatalogPrompt` for AI system prompts
- Validation and visibility helpers
- Core types used by the React package

```typescript
import { visibility, evaluateVisibility } from '@ai-json-renderer/core';

// Simple path-based visibility
const element1 = {
  key: 'error-banner',
  type: 'Alert',
  props: { message: 'Error!' },
  visible: { path: '/form/hasError' },
};

// Auth-based visibility
const element2 = {
  key: 'admin-panel',
  type: 'Card',
  props: { title: 'Admin' },
  visible: { auth: 'signedIn' },
};

// Complex logic
const element3 = {
  key: 'notification',
  type: 'Alert',
  props: { message: 'Warning' },
  visible: {
    and: [
      { path: '/settings/notifications' },
      { not: { path: '/user/dismissed' } },
      { gt: [{ path: '/items/count' }, 10] },
    ],
  },
};

// Evaluate visibility
const isVisible = evaluateVisibility(element1.visible, {
  dataModel: { form: { hasError: true } },
});
```

### Rich Actions

```typescript
import { resolveAction, executeAction } from '@ai-json-renderer/core';

const buttonAction = {
  name: 'refund',
  params: {
    paymentId: { path: '/selected/id' },
    amount: 100,
  },
  confirm: {
    title: 'Confirm Refund',
    message: 'Refund $100 to customer?',
    variant: 'danger',
  },
  onSuccess: { navigate: '/payments' },
  onError: { set: { '/ui/error': '$error.message' } },
};

// Resolve dynamic values
const resolved = resolveAction(buttonAction, dataModel);
```

### Validation

```typescript
import { runValidation, check } from '@ai-json-renderer/core';

const config = {
  checks: [
    check.required('Email is required'),
    check.email('Invalid email'),
    check.maxLength(100, 'Too long'),
  ],
  validateOn: 'blur',
};

const result = runValidation(config, {
  value: 'user@example.com',
  dataModel: {},
});

// result.valid = true
// result.errors = []
```

## API Reference

### Visibility

- `evaluateVisibility(condition, context)` - Evaluate a visibility condition
- `evaluateLogicExpression(expr, context)` - Evaluate a logic expression
- `visibility.*` - Helper functions for creating visibility conditions

### Actions

- `resolveAction(action, dataModel)` - Resolve dynamic values in an action
- `executeAction(context)` - Execute an action with callbacks
- `interpolateString(template, dataModel)` - Interpolate `${path}` in strings

### Validation

- `runValidation(config, context)` - Run validation checks
- `runValidationCheck(check, context)` - Run a single validation check
- `builtInValidationFunctions` - Built-in validators (required, email, min, max, etc.)
- `check.*` - Helper functions for creating validation checks

### Catalog

- `createCatalog(config)` - Create a catalog with components, actions, and functions
- `generateCatalogPrompt(catalog)` - Generate an AI prompt describing the catalog

## Types

See `src/types.ts` for full type definitions:

- `UIElement` - Base element structure
- `UITree` - Flat tree structure
- `VisibilityCondition` - Visibility condition types
- `LogicExpression` - Logic expression types
- `Action` - Rich action definition
- `ValidationConfig` - Validation configuration
