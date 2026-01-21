// src/types.ts
import { z } from "zod";
var DynamicValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.object({ path: z.string() })
]);
var DynamicStringSchema = z.union([
  z.string(),
  z.object({ path: z.string() })
]);
var DynamicNumberSchema = z.union([
  z.number(),
  z.object({ path: z.string() })
]);
var DynamicBooleanSchema = z.union([
  z.boolean(),
  z.object({ path: z.string() })
]);
function resolveDynamicValue(value, dataModel) {
  if (value === null || value === void 0) {
    return void 0;
  }
  if (typeof value === "object" && "path" in value) {
    return getByPath(dataModel, value.path);
  }
  return value;
}
function getByPath(obj, path) {
  if (!path || path === "/") {
    return obj;
  }
  const segments = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");
  let current = obj;
  for (const segment of segments) {
    if (current === null || current === void 0) {
      return void 0;
    }
    if (typeof current === "object") {
      current = current[segment];
    } else {
      return void 0;
    }
  }
  return current;
}
function setByPath(obj, path, value) {
  const segments = path.startsWith("/") ? path.slice(1).split("/") : path.split("/");
  if (segments.length === 0) return;
  let current = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    if (!(segment in current) || typeof current[segment] !== "object") {
      current[segment] = {};
    }
    current = current[segment];
  }
  const lastSegment = segments[segments.length - 1];
  current[lastSegment] = value;
}

// src/visibility.ts
import { z as z2 } from "zod";
var DynamicNumberValueSchema = z2.union([
  z2.number(),
  z2.object({ path: z2.string() })
]);
var LogicExpressionSchema = z2.lazy(
  () => z2.union([
    z2.object({ and: z2.array(LogicExpressionSchema) }),
    z2.object({ or: z2.array(LogicExpressionSchema) }),
    z2.object({ not: LogicExpressionSchema }),
    z2.object({ path: z2.string() }),
    z2.object({ eq: z2.tuple([DynamicValueSchema, DynamicValueSchema]) }),
    z2.object({ neq: z2.tuple([DynamicValueSchema, DynamicValueSchema]) }),
    z2.object({
      gt: z2.tuple([DynamicNumberValueSchema, DynamicNumberValueSchema])
    }),
    z2.object({
      gte: z2.tuple([DynamicNumberValueSchema, DynamicNumberValueSchema])
    }),
    z2.object({
      lt: z2.tuple([DynamicNumberValueSchema, DynamicNumberValueSchema])
    }),
    z2.object({
      lte: z2.tuple([DynamicNumberValueSchema, DynamicNumberValueSchema])
    })
  ])
);
var VisibilityConditionSchema = z2.union([
  z2.boolean(),
  z2.object({ path: z2.string() }),
  z2.object({ auth: z2.enum(["signedIn", "signedOut"]) }),
  LogicExpressionSchema
]);
function evaluateLogicExpression(expr, ctx) {
  const { dataModel } = ctx;
  if ("and" in expr) {
    return expr.and.every((subExpr) => evaluateLogicExpression(subExpr, ctx));
  }
  if ("or" in expr) {
    return expr.or.some((subExpr) => evaluateLogicExpression(subExpr, ctx));
  }
  if ("not" in expr) {
    return !evaluateLogicExpression(expr.not, ctx);
  }
  if ("path" in expr) {
    const value = resolveDynamicValue({ path: expr.path }, dataModel);
    return Boolean(value);
  }
  if ("eq" in expr) {
    const [left, right] = expr.eq;
    const leftValue = resolveDynamicValue(left, dataModel);
    const rightValue = resolveDynamicValue(right, dataModel);
    return leftValue === rightValue;
  }
  if ("neq" in expr) {
    const [left, right] = expr.neq;
    const leftValue = resolveDynamicValue(left, dataModel);
    const rightValue = resolveDynamicValue(right, dataModel);
    return leftValue !== rightValue;
  }
  if ("gt" in expr) {
    const [left, right] = expr.gt;
    const leftValue = resolveDynamicValue(
      left,
      dataModel
    );
    const rightValue = resolveDynamicValue(
      right,
      dataModel
    );
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return leftValue > rightValue;
    }
    return false;
  }
  if ("gte" in expr) {
    const [left, right] = expr.gte;
    const leftValue = resolveDynamicValue(
      left,
      dataModel
    );
    const rightValue = resolveDynamicValue(
      right,
      dataModel
    );
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return leftValue >= rightValue;
    }
    return false;
  }
  if ("lt" in expr) {
    const [left, right] = expr.lt;
    const leftValue = resolveDynamicValue(
      left,
      dataModel
    );
    const rightValue = resolveDynamicValue(
      right,
      dataModel
    );
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return leftValue < rightValue;
    }
    return false;
  }
  if ("lte" in expr) {
    const [left, right] = expr.lte;
    const leftValue = resolveDynamicValue(
      left,
      dataModel
    );
    const rightValue = resolveDynamicValue(
      right,
      dataModel
    );
    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return leftValue <= rightValue;
    }
    return false;
  }
  return false;
}
function evaluateVisibility(condition, ctx) {
  if (condition === void 0) {
    return true;
  }
  if (typeof condition === "boolean") {
    return condition;
  }
  if ("path" in condition && !("and" in condition) && !("or" in condition)) {
    const value = resolveDynamicValue({ path: condition.path }, ctx.dataModel);
    return Boolean(value);
  }
  if ("auth" in condition) {
    const isSignedIn = ctx.authState?.isSignedIn ?? false;
    if (condition.auth === "signedIn") {
      return isSignedIn;
    }
    if (condition.auth === "signedOut") {
      return !isSignedIn;
    }
    return false;
  }
  return evaluateLogicExpression(condition, ctx);
}
var visibility = {
  /** Always visible */
  always: true,
  /** Never visible */
  never: false,
  /** Visible when path is truthy */
  when: (path) => ({ path }),
  /** Visible when signed in */
  signedIn: { auth: "signedIn" },
  /** Visible when signed out */
  signedOut: { auth: "signedOut" },
  /** AND multiple conditions */
  and: (...conditions) => ({
    and: conditions
  }),
  /** OR multiple conditions */
  or: (...conditions) => ({
    or: conditions
  }),
  /** NOT a condition */
  not: (condition) => ({ not: condition }),
  /** Equality check */
  eq: (left, right) => ({
    eq: [left, right]
  }),
  /** Not equal check */
  neq: (left, right) => ({
    neq: [left, right]
  }),
  /** Greater than */
  gt: (left, right) => ({ gt: [left, right] }),
  /** Greater than or equal */
  gte: (left, right) => ({ gte: [left, right] }),
  /** Less than */
  lt: (left, right) => ({ lt: [left, right] }),
  /** Less than or equal */
  lte: (left, right) => ({ lte: [left, right] })
};

// src/actions.ts
import { z as z3 } from "zod";
var ActionConfirmSchema = z3.object({
  title: z3.string(),
  message: z3.string(),
  confirmLabel: z3.string().optional(),
  cancelLabel: z3.string().optional(),
  variant: z3.enum(["default", "danger"]).optional()
});
var ActionOnSuccessSchema = z3.union([
  z3.object({ navigate: z3.string() }),
  z3.object({ set: z3.record(z3.string(), z3.unknown()) }),
  z3.object({ action: z3.string() })
]);
var ActionOnErrorSchema = z3.union([
  z3.object({ set: z3.record(z3.string(), z3.unknown()) }),
  z3.object({ action: z3.string() })
]);
var ActionSchema = z3.object({
  name: z3.string(),
  params: z3.record(z3.string(), DynamicValueSchema).optional(),
  confirm: ActionConfirmSchema.optional(),
  onSuccess: ActionOnSuccessSchema.optional(),
  onError: ActionOnErrorSchema.optional()
});
function resolveAction(action2, dataModel) {
  const resolvedParams = {};
  if (action2.params) {
    for (const [key, value] of Object.entries(action2.params)) {
      resolvedParams[key] = resolveDynamicValue(value, dataModel);
    }
  }
  let confirm = action2.confirm;
  if (confirm) {
    confirm = {
      ...confirm,
      message: interpolateString(confirm.message, dataModel),
      title: interpolateString(confirm.title, dataModel)
    };
  }
  return {
    name: action2.name,
    params: resolvedParams,
    confirm,
    onSuccess: action2.onSuccess,
    onError: action2.onError
  };
}
function interpolateString(template, dataModel) {
  return template.replace(/\$\{([^}]+)\}/g, (_, path) => {
    const value = resolveDynamicValue({ path }, dataModel);
    return String(value ?? "");
  });
}
async function executeAction(ctx) {
  const { action: action2, handler, setData, navigate, executeAction: executeAction2 } = ctx;
  try {
    await handler(action2.params);
    if (action2.onSuccess) {
      if ("navigate" in action2.onSuccess && navigate) {
        navigate(action2.onSuccess.navigate);
      } else if ("set" in action2.onSuccess) {
        for (const [path, value] of Object.entries(action2.onSuccess.set)) {
          setData(path, value);
        }
      } else if ("action" in action2.onSuccess && executeAction2) {
        await executeAction2(action2.onSuccess.action);
      }
    }
  } catch (error) {
    if (action2.onError) {
      if ("set" in action2.onError) {
        for (const [path, value] of Object.entries(action2.onError.set)) {
          const resolvedValue = typeof value === "string" && value === "$error.message" ? error.message : value;
          setData(path, resolvedValue);
        }
      } else if ("action" in action2.onError && executeAction2) {
        await executeAction2(action2.onError.action);
      }
    } else {
      throw error;
    }
  }
}
var action = {
  /** Create a simple action */
  simple: (name, params) => ({
    name,
    params
  }),
  /** Create an action with confirmation */
  withConfirm: (name, confirm, params) => ({
    name,
    params,
    confirm
  }),
  /** Create an action with success handler */
  withSuccess: (name, onSuccess, params) => ({
    name,
    params,
    onSuccess
  })
};

// src/validation.ts
import { z as z4 } from "zod";
var ValidationCheckSchema = z4.object({
  fn: z4.string(),
  args: z4.record(z4.string(), DynamicValueSchema).optional(),
  message: z4.string()
});
var ValidationConfigSchema = z4.object({
  checks: z4.array(ValidationCheckSchema).optional(),
  validateOn: z4.enum(["change", "blur", "submit"]).optional(),
  enabled: LogicExpressionSchema.optional()
});
var builtInValidationFunctions = {
  /**
   * Check if value is not null, undefined, or empty string
   */
  required: (value) => {
    if (value === null || value === void 0) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  },
  /**
   * Check if value is a valid email address
   */
  email: (value) => {
    if (typeof value !== "string") return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },
  /**
   * Check minimum string length
   */
  minLength: (value, args) => {
    if (typeof value !== "string") return false;
    const min = args?.min;
    if (typeof min !== "number") return false;
    return value.length >= min;
  },
  /**
   * Check maximum string length
   */
  maxLength: (value, args) => {
    if (typeof value !== "string") return false;
    const max = args?.max;
    if (typeof max !== "number") return false;
    return value.length <= max;
  },
  /**
   * Check if string matches a regex pattern
   */
  pattern: (value, args) => {
    if (typeof value !== "string") return false;
    const pattern = args?.pattern;
    if (typeof pattern !== "string") return false;
    try {
      return new RegExp(pattern).test(value);
    } catch {
      return false;
    }
  },
  /**
   * Check minimum numeric value
   */
  min: (value, args) => {
    if (typeof value !== "number") return false;
    const min = args?.min;
    if (typeof min !== "number") return false;
    return value >= min;
  },
  /**
   * Check maximum numeric value
   */
  max: (value, args) => {
    if (typeof value !== "number") return false;
    const max = args?.max;
    if (typeof max !== "number") return false;
    return value <= max;
  },
  /**
   * Check if value is a number
   */
  numeric: (value) => {
    if (typeof value === "number") return !isNaN(value);
    if (typeof value === "string") return !isNaN(parseFloat(value));
    return false;
  },
  /**
   * Check if value is a valid URL
   */
  url: (value) => {
    if (typeof value !== "string") return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  /**
   * Check if value matches another field
   */
  matches: (value, args) => {
    const other = args?.other;
    return value === other;
  }
};
function runValidationCheck(check2, ctx) {
  const { value, dataModel, customFunctions } = ctx;
  const resolvedArgs = {};
  if (check2.args) {
    for (const [key, argValue] of Object.entries(check2.args)) {
      resolvedArgs[key] = resolveDynamicValue(argValue, dataModel);
    }
  }
  const fn = builtInValidationFunctions[check2.fn] ?? customFunctions?.[check2.fn];
  if (!fn) {
    console.warn(`Unknown validation function: ${check2.fn}`);
    return {
      fn: check2.fn,
      valid: true,
      // Don't fail on unknown functions
      message: check2.message
    };
  }
  const valid = fn(value, resolvedArgs);
  return {
    fn: check2.fn,
    valid,
    message: check2.message
  };
}
function runValidation(config, ctx) {
  const checks = [];
  const errors = [];
  if (config.enabled) {
    const enabled = evaluateLogicExpression(config.enabled, {
      dataModel: ctx.dataModel,
      authState: ctx.authState
    });
    if (!enabled) {
      return { valid: true, errors: [], checks: [] };
    }
  }
  if (config.checks) {
    for (const check2 of config.checks) {
      const result = runValidationCheck(check2, ctx);
      checks.push(result);
      if (!result.valid) {
        errors.push(result.message);
      }
    }
  }
  return {
    valid: errors.length === 0,
    errors,
    checks
  };
}
var check = {
  required: (message = "This field is required") => ({
    fn: "required",
    message
  }),
  email: (message = "Invalid email address") => ({
    fn: "email",
    message
  }),
  minLength: (min, message) => ({
    fn: "minLength",
    args: { min },
    message: message ?? `Must be at least ${min} characters`
  }),
  maxLength: (max, message) => ({
    fn: "maxLength",
    args: { max },
    message: message ?? `Must be at most ${max} characters`
  }),
  pattern: (pattern, message = "Invalid format") => ({
    fn: "pattern",
    args: { pattern },
    message
  }),
  min: (min, message) => ({
    fn: "min",
    args: { min },
    message: message ?? `Must be at least ${min}`
  }),
  max: (max, message) => ({
    fn: "max",
    args: { max },
    message: message ?? `Must be at most ${max}`
  }),
  url: (message = "Invalid URL") => ({
    fn: "url",
    message
  }),
  matches: (otherPath, message = "Fields must match") => ({
    fn: "matches",
    args: { other: { path: otherPath } },
    message
  })
};

// src/catalog.ts
import { z as z5 } from "zod";
function createCatalog(config) {
  const {
    name = "unnamed",
    components,
    actions = {},
    functions = {},
    validation = "strict"
  } = config;
  const componentNames = Object.keys(components);
  const actionNames = Object.keys(actions);
  const functionNames = Object.keys(functions);
  const componentSchemas = componentNames.map((componentName) => {
    const def = components[componentName];
    return z5.object({
      key: z5.string(),
      type: z5.literal(componentName),
      props: def.props,
      children: z5.array(z5.string()).optional(),
      parentKey: z5.string().nullable().optional(),
      visible: VisibilityConditionSchema.optional()
    });
  });
  let elementSchema;
  if (componentSchemas.length === 0) {
    elementSchema = z5.object({
      key: z5.string(),
      type: z5.string(),
      props: z5.record(z5.string(), z5.unknown()),
      children: z5.array(z5.string()).optional(),
      parentKey: z5.string().nullable().optional(),
      visible: VisibilityConditionSchema.optional()
    });
  } else if (componentSchemas.length === 1) {
    elementSchema = componentSchemas[0];
  } else {
    elementSchema = z5.discriminatedUnion("type", [
      componentSchemas[0],
      componentSchemas[1],
      ...componentSchemas.slice(2)
    ]);
  }
  const treeSchema = z5.object({
    root: z5.string(),
    elements: z5.record(z5.string(), elementSchema)
  });
  return {
    name,
    componentNames,
    actionNames,
    functionNames,
    validation,
    components,
    actions,
    functions,
    elementSchema,
    treeSchema,
    hasComponent(type) {
      return type in components;
    },
    hasAction(name2) {
      return name2 in actions;
    },
    hasFunction(name2) {
      return name2 in functions;
    },
    validateElement(element) {
      const result = elementSchema.safeParse(element);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    },
    validateTree(tree) {
      const result = treeSchema.safeParse(tree);
      if (result.success) {
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error };
    }
  };
}
function generateCatalogPrompt(catalog) {
  const lines = [
    `# ${catalog.name} Component Catalog`,
    "",
    "## Available Components",
    ""
  ];
  for (const name of catalog.componentNames) {
    const def = catalog.components[name];
    lines.push(`### ${String(name)}`);
    if (def.description) {
      lines.push(def.description);
    }
    lines.push("");
  }
  if (catalog.actionNames.length > 0) {
    lines.push("## Available Actions");
    lines.push("");
    for (const name of catalog.actionNames) {
      const def = catalog.actions[name];
      lines.push(
        `- \`${String(name)}\`${def.description ? `: ${def.description}` : ""}`
      );
    }
    lines.push("");
  }
  lines.push("## Visibility Conditions");
  lines.push("");
  lines.push("Components can have a `visible` property:");
  lines.push("- `true` / `false` - Always visible/hidden");
  lines.push('- `{ "path": "/data/path" }` - Visible when path is truthy');
  lines.push('- `{ "auth": "signedIn" }` - Visible when user is signed in');
  lines.push('- `{ "and": [...] }` - All conditions must be true');
  lines.push('- `{ "or": [...] }` - Any condition must be true');
  lines.push('- `{ "not": {...} }` - Negates a condition');
  lines.push('- `{ "eq": [a, b] }` - Equality check');
  lines.push("");
  lines.push("## Validation Functions");
  lines.push("");
  lines.push(
    "Built-in: `required`, `email`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `url`"
  );
  if (catalog.functionNames.length > 0) {
    lines.push(`Custom: ${catalog.functionNames.map(String).join(", ")}`);
  }
  lines.push("");
  return lines.join("\n");
}
export {
  ActionConfirmSchema,
  ActionOnErrorSchema,
  ActionOnSuccessSchema,
  ActionSchema,
  DynamicBooleanSchema,
  DynamicNumberSchema,
  DynamicStringSchema,
  DynamicValueSchema,
  LogicExpressionSchema,
  ValidationCheckSchema,
  ValidationConfigSchema,
  VisibilityConditionSchema,
  action,
  builtInValidationFunctions,
  check,
  createCatalog,
  evaluateLogicExpression,
  evaluateVisibility,
  executeAction,
  generateCatalogPrompt,
  getByPath,
  interpolateString,
  resolveAction,
  resolveDynamicValue,
  runValidation,
  runValidationCheck,
  setByPath,
  visibility
};
//# sourceMappingURL=index.mjs.map