import { z } from 'zod';

/**
 * Dynamic value - can be a literal or a path reference to data model
 */
type DynamicValue<T = unknown> = T | {
    path: string;
};
/**
 * Dynamic string value
 */
type DynamicString = DynamicValue<string>;
/**
 * Dynamic number value
 */
type DynamicNumber = DynamicValue<number>;
/**
 * Dynamic boolean value
 */
type DynamicBoolean = DynamicValue<boolean>;
/**
 * Zod schema for dynamic values
 */
declare const DynamicValueSchema: z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>]>;
declare const DynamicStringSchema: z.ZodUnion<readonly [z.ZodString, z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>]>;
declare const DynamicNumberSchema: z.ZodUnion<readonly [z.ZodNumber, z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>]>;
declare const DynamicBooleanSchema: z.ZodUnion<readonly [z.ZodBoolean, z.ZodObject<{
    path: z.ZodString;
}, z.core.$strip>]>;
/**
 * Base UI element structure for v2
 */
interface UIElement<T extends string = string, P = Record<string, unknown>> {
    /** Unique key for reconciliation */
    key: string;
    /** Component type from the catalog */
    type: T;
    /** Component props */
    props: P;
    /** Child element keys (flat structure) */
    children?: string[];
    /** Parent element key (null for root) */
    parentKey?: string | null;
    /** Visibility condition */
    visible?: VisibilityCondition;
}
/**
 * Visibility condition types
 */
type VisibilityCondition = boolean | {
    path: string;
} | {
    auth: "signedIn" | "signedOut";
} | LogicExpression;
/**
 * Logic expression for complex conditions
 */
type LogicExpression = {
    and: LogicExpression[];
} | {
    or: LogicExpression[];
} | {
    not: LogicExpression;
} | {
    path: string;
} | {
    eq: [DynamicValue, DynamicValue];
} | {
    neq: [DynamicValue, DynamicValue];
} | {
    gt: [DynamicValue<number>, DynamicValue<number>];
} | {
    gte: [DynamicValue<number>, DynamicValue<number>];
} | {
    lt: [DynamicValue<number>, DynamicValue<number>];
} | {
    lte: [DynamicValue<number>, DynamicValue<number>];
};
/**
 * Flat UI tree structure (optimized for LLM generation)
 */
interface UITree {
    /** Root element key */
    root: string;
    /** Flat map of elements by key */
    elements: Record<string, UIElement>;
}
/**
 * Auth state for visibility evaluation
 */
interface AuthState {
    isSignedIn: boolean;
    user?: Record<string, unknown>;
}
/**
 * Data model type
 */
type DataModel = Record<string, unknown>;
/**
 * Component schema definition using Zod
 */
type ComponentSchema = z.ZodType<Record<string, unknown>>;
/**
 * Validation mode for catalog validation
 */
type ValidationMode = "strict" | "warn" | "ignore";
/**
 * JSON patch operation types
 */
type PatchOp = "add" | "remove" | "replace" | "set";
/**
 * JSON patch operation
 */
interface JsonPatch {
    op: PatchOp;
    path: string;
    value?: unknown;
}
/**
 * Resolve a dynamic value against a data model
 */
declare function resolveDynamicValue<T>(value: DynamicValue<T>, dataModel: DataModel): T | undefined;
/**
 * Get a value from an object by JSON Pointer path
 */
declare function getByPath(obj: unknown, path: string): unknown;
/**
 * Set a value in an object by JSON Pointer path
 */
declare function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void;

/**
 * Logic expression schema (recursive)
 * Using a more permissive schema that aligns with runtime behavior
 */
declare const LogicExpressionSchema: z.ZodType<LogicExpression>;
/**
 * Visibility condition schema
 */
declare const VisibilityConditionSchema: z.ZodType<VisibilityCondition>;
/**
 * Context for evaluating visibility
 */
interface VisibilityContext {
    dataModel: DataModel;
    authState?: AuthState;
}
/**
 * Evaluate a logic expression against data and auth state
 */
declare function evaluateLogicExpression(expr: LogicExpression, ctx: VisibilityContext): boolean;
/**
 * Evaluate a visibility condition
 */
declare function evaluateVisibility(condition: VisibilityCondition | undefined, ctx: VisibilityContext): boolean;
/**
 * Helper to create visibility conditions
 */
declare const visibility: {
    /** Always visible */
    always: true;
    /** Never visible */
    never: false;
    /** Visible when path is truthy */
    when: (path: string) => VisibilityCondition;
    /** Visible when signed in */
    signedIn: {
        readonly auth: "signedIn";
    };
    /** Visible when signed out */
    signedOut: {
        readonly auth: "signedOut";
    };
    /** AND multiple conditions */
    and: (...conditions: LogicExpression[]) => LogicExpression;
    /** OR multiple conditions */
    or: (...conditions: LogicExpression[]) => LogicExpression;
    /** NOT a condition */
    not: (condition: LogicExpression) => LogicExpression;
    /** Equality check */
    eq: (left: DynamicValue, right: DynamicValue) => LogicExpression;
    /** Not equal check */
    neq: (left: DynamicValue, right: DynamicValue) => LogicExpression;
    /** Greater than */
    gt: (left: DynamicValue<number>, right: DynamicValue<number>) => LogicExpression;
    /** Greater than or equal */
    gte: (left: DynamicValue<number>, right: DynamicValue<number>) => LogicExpression;
    /** Less than */
    lt: (left: DynamicValue<number>, right: DynamicValue<number>) => LogicExpression;
    /** Less than or equal */
    lte: (left: DynamicValue<number>, right: DynamicValue<number>) => LogicExpression;
};

/**
 * Confirmation dialog configuration
 */
interface ActionConfirm {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "danger";
}
/**
 * Action success handler
 */
type ActionOnSuccess = {
    navigate: string;
} | {
    set: Record<string, unknown>;
} | {
    action: string;
};
/**
 * Action error handler
 */
type ActionOnError = {
    set: Record<string, unknown>;
} | {
    action: string;
};
/**
 * Rich action definition
 */
interface Action {
    /** Action name (must be in catalog) */
    name: string;
    /** Parameters to pass to the action handler */
    params?: Record<string, DynamicValue>;
    /** Confirmation dialog before execution */
    confirm?: ActionConfirm;
    /** Handler after successful execution */
    onSuccess?: ActionOnSuccess;
    /** Handler after failed execution */
    onError?: ActionOnError;
}
/**
 * Schema for action confirmation
 */
declare const ActionConfirmSchema: z.ZodObject<{
    title: z.ZodString;
    message: z.ZodString;
    confirmLabel: z.ZodOptional<z.ZodString>;
    cancelLabel: z.ZodOptional<z.ZodString>;
    variant: z.ZodOptional<z.ZodEnum<{
        default: "default";
        danger: "danger";
    }>>;
}, z.core.$strip>;
/**
 * Schema for success handlers
 */
declare const ActionOnSuccessSchema: z.ZodUnion<readonly [z.ZodObject<{
    navigate: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    set: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodString;
}, z.core.$strip>]>;
/**
 * Schema for error handlers
 */
declare const ActionOnErrorSchema: z.ZodUnion<readonly [z.ZodObject<{
    set: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodString;
}, z.core.$strip>]>;
/**
 * Full action schema
 */
declare const ActionSchema: z.ZodObject<{
    name: z.ZodString;
    params: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        path: z.ZodString;
    }, z.core.$strip>]>>>;
    confirm: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        message: z.ZodString;
        confirmLabel: z.ZodOptional<z.ZodString>;
        cancelLabel: z.ZodOptional<z.ZodString>;
        variant: z.ZodOptional<z.ZodEnum<{
            default: "default";
            danger: "danger";
        }>>;
    }, z.core.$strip>>;
    onSuccess: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        navigate: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        set: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
        action: z.ZodString;
    }, z.core.$strip>]>>;
    onError: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        set: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>, z.ZodObject<{
        action: z.ZodString;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
/**
 * Action handler function signature
 */
type ActionHandler<TParams = Record<string, unknown>, TResult = unknown> = (params: TParams) => Promise<TResult> | TResult;
/**
 * Action definition in catalog
 */
interface ActionDefinition<TParams = Record<string, unknown>> {
    /** Zod schema for params validation */
    params?: z.ZodType<TParams>;
    /** Description for AI */
    description?: string;
}
/**
 * Resolved action with all dynamic values resolved
 */
interface ResolvedAction {
    name: string;
    params: Record<string, unknown>;
    confirm?: ActionConfirm;
    onSuccess?: ActionOnSuccess;
    onError?: ActionOnError;
}
/**
 * Resolve all dynamic values in an action
 */
declare function resolveAction(action: Action, dataModel: DataModel): ResolvedAction;
/**
 * Interpolate ${path} expressions in a string
 */
declare function interpolateString(template: string, dataModel: DataModel): string;
/**
 * Context for action execution
 */
interface ActionExecutionContext {
    /** The resolved action */
    action: ResolvedAction;
    /** The action handler from the host */
    handler: ActionHandler;
    /** Function to update data model */
    setData: (path: string, value: unknown) => void;
    /** Function to navigate */
    navigate?: (path: string) => void;
    /** Function to execute another action */
    executeAction?: (name: string) => Promise<void>;
}
/**
 * Execute an action with all callbacks
 */
declare function executeAction(ctx: ActionExecutionContext): Promise<void>;
/**
 * Helper to create actions
 */
declare const action: {
    /** Create a simple action */
    simple: (name: string, params?: Record<string, DynamicValue>) => Action;
    /** Create an action with confirmation */
    withConfirm: (name: string, confirm: ActionConfirm, params?: Record<string, DynamicValue>) => Action;
    /** Create an action with success handler */
    withSuccess: (name: string, onSuccess: ActionOnSuccess, params?: Record<string, DynamicValue>) => Action;
};

/**
 * Validation check definition
 */
interface ValidationCheck {
    /** Function name (built-in or from catalog) */
    fn: string;
    /** Additional arguments for the function */
    args?: Record<string, DynamicValue>;
    /** Error message to display if check fails */
    message: string;
}
/**
 * Validation configuration for a field
 */
interface ValidationConfig {
    /** Array of checks to run */
    checks?: ValidationCheck[];
    /** When to run validation */
    validateOn?: "change" | "blur" | "submit";
    /** Condition for when validation is enabled */
    enabled?: LogicExpression;
}
/**
 * Schema for validation check
 */
declare const ValidationCheckSchema: z.ZodObject<{
    fn: z.ZodString;
    args: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
        path: z.ZodString;
    }, z.core.$strip>]>>>;
    message: z.ZodString;
}, z.core.$strip>;
/**
 * Schema for validation config
 */
declare const ValidationConfigSchema: z.ZodObject<{
    checks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        fn: z.ZodString;
        args: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull, z.ZodObject<{
            path: z.ZodString;
        }, z.core.$strip>]>>>;
        message: z.ZodString;
    }, z.core.$strip>>>;
    validateOn: z.ZodOptional<z.ZodEnum<{
        change: "change";
        blur: "blur";
        submit: "submit";
    }>>;
    enabled: z.ZodOptional<z.ZodType<LogicExpression, unknown, z.core.$ZodTypeInternals<LogicExpression, unknown>>>;
}, z.core.$strip>;
/**
 * Validation function signature
 */
type ValidationFunction = (value: unknown, args?: Record<string, unknown>) => boolean;
/**
 * Validation function definition in catalog
 */
interface ValidationFunctionDefinition {
    /** The validation function */
    validate: ValidationFunction;
    /** Description for AI */
    description?: string;
}
/**
 * Built-in validation functions
 */
declare const builtInValidationFunctions: Record<string, ValidationFunction>;
/**
 * Validation result for a single check
 */
interface ValidationCheckResult {
    fn: string;
    valid: boolean;
    message: string;
}
/**
 * Full validation result for a field
 */
interface ValidationResult {
    valid: boolean;
    errors: string[];
    checks: ValidationCheckResult[];
}
/**
 * Context for running validation
 */
interface ValidationContext {
    /** Current value to validate */
    value: unknown;
    /** Full data model for resolving paths */
    dataModel: DataModel;
    /** Custom validation functions from catalog */
    customFunctions?: Record<string, ValidationFunction>;
}
/**
 * Run a single validation check
 */
declare function runValidationCheck(check: ValidationCheck, ctx: ValidationContext): ValidationCheckResult;
/**
 * Run all validation checks for a field
 */
declare function runValidation(config: ValidationConfig, ctx: ValidationContext & {
    authState?: {
        isSignedIn: boolean;
    };
}): ValidationResult;
/**
 * Helper to create validation checks
 */
declare const check: {
    required: (message?: string) => ValidationCheck;
    email: (message?: string) => ValidationCheck;
    minLength: (min: number, message?: string) => ValidationCheck;
    maxLength: (max: number, message?: string) => ValidationCheck;
    pattern: (pattern: string, message?: string) => ValidationCheck;
    min: (min: number, message?: string) => ValidationCheck;
    max: (max: number, message?: string) => ValidationCheck;
    url: (message?: string) => ValidationCheck;
    matches: (otherPath: string, message?: string) => ValidationCheck;
};

/**
 * Component definition with visibility and validation support
 */
interface ComponentDefinition<TProps extends ComponentSchema = ComponentSchema> {
    /** Zod schema for component props */
    props: TProps;
    /** Whether this component can have children */
    hasChildren?: boolean;
    /** Description for AI generation */
    description?: string;
}
/**
 * Catalog configuration
 */
interface CatalogConfig<TComponents extends Record<string, ComponentDefinition> = Record<string, ComponentDefinition>, TActions extends Record<string, ActionDefinition> = Record<string, ActionDefinition>, TFunctions extends Record<string, ValidationFunction> = Record<string, ValidationFunction>> {
    /** Catalog name */
    name?: string;
    /** Component definitions */
    components: TComponents;
    /** Action definitions with param schemas */
    actions?: TActions;
    /** Custom validation functions */
    functions?: TFunctions;
    /** Validation mode */
    validation?: ValidationMode;
}
/**
 * Catalog instance
 */
interface Catalog<TComponents extends Record<string, ComponentDefinition> = Record<string, ComponentDefinition>, TActions extends Record<string, ActionDefinition> = Record<string, ActionDefinition>, TFunctions extends Record<string, ValidationFunction> = Record<string, ValidationFunction>> {
    /** Catalog name */
    readonly name: string;
    /** Component names */
    readonly componentNames: (keyof TComponents)[];
    /** Action names */
    readonly actionNames: (keyof TActions)[];
    /** Function names */
    readonly functionNames: (keyof TFunctions)[];
    /** Validation mode */
    readonly validation: ValidationMode;
    /** Component definitions */
    readonly components: TComponents;
    /** Action definitions */
    readonly actions: TActions;
    /** Custom validation functions */
    readonly functions: TFunctions;
    /** Full element schema for AI generation */
    readonly elementSchema: z.ZodType<UIElement>;
    /** Full UI tree schema */
    readonly treeSchema: z.ZodType<UITree>;
    /** Check if component exists */
    hasComponent(type: string): boolean;
    /** Check if action exists */
    hasAction(name: string): boolean;
    /** Check if function exists */
    hasFunction(name: string): boolean;
    /** Validate an element */
    validateElement(element: unknown): {
        success: boolean;
        data?: UIElement;
        error?: z.ZodError;
    };
    /** Validate a UI tree */
    validateTree(tree: unknown): {
        success: boolean;
        data?: UITree;
        error?: z.ZodError;
    };
}
/**
 * Create a v2 catalog with visibility, actions, and validation support
 */
declare function createCatalog<TComponents extends Record<string, ComponentDefinition>, TActions extends Record<string, ActionDefinition> = Record<string, ActionDefinition>, TFunctions extends Record<string, ValidationFunction> = Record<string, ValidationFunction>>(config: CatalogConfig<TComponents, TActions, TFunctions>): Catalog<TComponents, TActions, TFunctions>;
/**
 * Generate a prompt for AI that describes the catalog
 */
declare function generateCatalogPrompt<TComponents extends Record<string, ComponentDefinition>, TActions extends Record<string, ActionDefinition>, TFunctions extends Record<string, ValidationFunction>>(catalog: Catalog<TComponents, TActions, TFunctions>): string;
/**
 * Type helper to infer component props from catalog
 */
type InferCatalogComponentProps<C extends Catalog<Record<string, ComponentDefinition>>> = {
    [K in keyof C["components"]]: z.infer<C["components"][K]["props"]>;
};

export { type Action, type ActionConfirm, ActionConfirmSchema, type ActionDefinition, type ActionExecutionContext, type ActionHandler, type ActionOnError, ActionOnErrorSchema, type ActionOnSuccess, ActionOnSuccessSchema, ActionSchema, type AuthState, type Catalog, type CatalogConfig, type ComponentDefinition, type ComponentSchema, type DataModel, type DynamicBoolean, DynamicBooleanSchema, type DynamicNumber, DynamicNumberSchema, type DynamicString, DynamicStringSchema, type DynamicValue, DynamicValueSchema, type InferCatalogComponentProps, type JsonPatch, type LogicExpression, LogicExpressionSchema, type PatchOp, type ResolvedAction, type UIElement, type UITree, type ValidationCheck, type ValidationCheckResult, ValidationCheckSchema, type ValidationConfig, ValidationConfigSchema, type ValidationContext, type ValidationFunction, type ValidationFunctionDefinition, type ValidationMode, type ValidationResult, type VisibilityCondition, VisibilityConditionSchema, type VisibilityContext, action, builtInValidationFunctions, check, createCatalog, evaluateLogicExpression, evaluateVisibility, executeAction, generateCatalogPrompt, getByPath, interpolateString, resolveAction, resolveDynamicValue, runValidation, runValidationCheck, setByPath, visibility };
