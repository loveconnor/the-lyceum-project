import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode, ComponentType } from 'react';
import { DataModel, AuthState, VisibilityCondition, VisibilityContext, ActionHandler, ResolvedAction, Action, ActionConfirm, ValidationFunction, ValidationResult, ValidationConfig, UITree, UIElement, Catalog, ComponentDefinition } from '@ai-json-renderer/core';

/**
 * Data context value
 */
interface DataContextValue {
    /** The current data model */
    data: DataModel;
    /** Auth state for visibility evaluation */
    authState?: AuthState;
    /** Get a value by path */
    get: (path: string) => unknown;
    /** Set a value by path */
    set: (path: string, value: unknown) => void;
    /** Update multiple values at once */
    update: (updates: Record<string, unknown>) => void;
}
/**
 * Props for DataProvider
 */
interface DataProviderProps {
    /** Initial data model */
    initialData?: DataModel;
    /** Auth state */
    authState?: AuthState;
    /** Callback when data changes */
    onDataChange?: (path: string, value: unknown) => void;
    children: ReactNode;
}
/**
 * Provider for data model context
 */
declare function DataProvider({ initialData, authState, onDataChange, children, }: DataProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access the data context
 */
declare function useData(): DataContextValue;
/**
 * Hook to get a value from the data model
 */
declare function useDataValue<T>(path: string): T | undefined;
/**
 * Hook to get and set a value from the data model (like useState)
 */
declare function useDataBinding<T>(path: string): [T | undefined, (value: T) => void];

/**
 * Visibility context value
 */
interface VisibilityContextValue {
    /** Evaluate a visibility condition */
    isVisible: (condition: VisibilityCondition | undefined) => boolean;
    /** The underlying visibility context */
    ctx: VisibilityContext;
}
/**
 * Props for VisibilityProvider
 */
interface VisibilityProviderProps {
    children: ReactNode;
}
/**
 * Provider for visibility evaluation
 */
declare function VisibilityProvider({ children }: VisibilityProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access visibility evaluation
 */
declare function useVisibility(): VisibilityContextValue;
/**
 * Hook to check if a condition is visible
 */
declare function useIsVisible(condition: VisibilityCondition | undefined): boolean;

/**
 * Pending confirmation state
 */
interface PendingConfirmation {
    /** The resolved action */
    action: ResolvedAction;
    /** The action handler */
    handler: ActionHandler;
    /** Resolve callback */
    resolve: () => void;
    /** Reject callback */
    reject: () => void;
}
/**
 * Action context value
 */
interface ActionContextValue {
    /** Registered action handlers */
    handlers: Record<string, ActionHandler>;
    /** Currently loading action names */
    loadingActions: Set<string>;
    /** Pending confirmation dialog */
    pendingConfirmation: PendingConfirmation | null;
    /** Execute an action */
    execute: (action: Action) => Promise<void>;
    /** Confirm the pending action */
    confirm: () => void;
    /** Cancel the pending action */
    cancel: () => void;
    /** Register an action handler */
    registerHandler: (name: string, handler: ActionHandler) => void;
}
/**
 * Props for ActionProvider
 */
interface ActionProviderProps {
    /** Initial action handlers */
    handlers?: Record<string, ActionHandler>;
    /** Navigation function */
    navigate?: (path: string) => void;
    children: ReactNode;
}
/**
 * Provider for action execution
 */
declare function ActionProvider({ handlers: initialHandlers, navigate, children, }: ActionProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access action context
 */
declare function useActions(): ActionContextValue;
/**
 * Hook to execute an action
 */
declare function useAction(action: Action): {
    execute: () => Promise<void>;
    isLoading: boolean;
};
/**
 * Props for ConfirmDialog component
 */
interface ConfirmDialogProps {
    /** The confirmation config */
    confirm: ActionConfirm;
    /** Called when confirmed */
    onConfirm: () => void;
    /** Called when cancelled */
    onCancel: () => void;
}
/**
 * Default confirmation dialog component
 */
declare function ConfirmDialog({ confirm, onConfirm, onCancel, }: ConfirmDialogProps): react_jsx_runtime.JSX.Element;

/**
 * Field validation state
 */
interface FieldValidationState {
    /** Whether the field has been touched */
    touched: boolean;
    /** Whether the field has been validated */
    validated: boolean;
    /** Validation result */
    result: ValidationResult | null;
}
/**
 * Validation context value
 */
interface ValidationContextValue {
    /** Custom validation functions from catalog */
    customFunctions: Record<string, ValidationFunction>;
    /** Validation state by field path */
    fieldStates: Record<string, FieldValidationState>;
    /** Validate a field */
    validate: (path: string, config: ValidationConfig) => ValidationResult;
    /** Mark field as touched */
    touch: (path: string) => void;
    /** Clear validation for a field */
    clear: (path: string) => void;
    /** Validate all fields */
    validateAll: () => boolean;
    /** Register field config */
    registerField: (path: string, config: ValidationConfig) => void;
}
/**
 * Props for ValidationProvider
 */
interface ValidationProviderProps {
    /** Custom validation functions from catalog */
    customFunctions?: Record<string, ValidationFunction>;
    children: ReactNode;
}
/**
 * Provider for validation
 */
declare function ValidationProvider({ customFunctions, children, }: ValidationProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Hook to access validation context
 */
declare function useValidation(): ValidationContextValue;
/**
 * Hook to get validation state for a field
 */
declare function useFieldValidation(path: string, config?: ValidationConfig): {
    state: FieldValidationState;
    validate: () => ValidationResult;
    touch: () => void;
    clear: () => void;
    errors: string[];
    isValid: boolean;
};

/**
 * Props passed to component renderers
 */
interface ComponentRenderProps<P = Record<string, unknown>> {
    /** The element being rendered */
    element: UIElement<string, P>;
    /** Rendered children */
    children?: ReactNode;
    /** Execute an action */
    onAction?: (action: Action) => void;
    /** Whether the parent is loading */
    loading?: boolean;
}
/**
 * Component renderer type
 */
type ComponentRenderer<P = Record<string, unknown>> = ComponentType<ComponentRenderProps<P>>;
/**
 * Registry of component renderers
 */
type ComponentRegistry = Record<string, ComponentRenderer<any>>;
/**
 * Props for the Renderer component
 */
interface RendererProps {
    /** The UI tree to render */
    tree: UITree | null;
    /** Component registry */
    registry: ComponentRegistry;
    /** Whether the tree is currently loading/streaming */
    loading?: boolean;
    /** Fallback component for unknown types */
    fallback?: ComponentRenderer;
}
/**
 * Main renderer component
 */
declare function Renderer({ tree, registry, loading, fallback }: RendererProps): react_jsx_runtime.JSX.Element | null;
/**
 * Props for JSONUIProvider
 */
interface JSONUIProviderProps {
    /** Component registry */
    registry: ComponentRegistry;
    /** Initial data model */
    initialData?: Record<string, unknown>;
    /** Auth state */
    authState?: {
        isSignedIn: boolean;
        user?: Record<string, unknown>;
    };
    /** Action handlers */
    actionHandlers?: Record<string, (params: Record<string, unknown>) => Promise<unknown> | unknown>;
    /** Navigation function */
    navigate?: (path: string) => void;
    /** Custom validation functions */
    validationFunctions?: Record<string, (value: unknown, args?: Record<string, unknown>) => boolean>;
    /** Callback when data changes */
    onDataChange?: (path: string, value: unknown) => void;
    children: ReactNode;
}
/**
 * Combined provider for all JSONUI contexts
 */
declare function JSONUIProvider({ registry, initialData, authState, actionHandlers, navigate, validationFunctions, onDataChange, children, }: JSONUIProviderProps): react_jsx_runtime.JSX.Element;
/**
 * Helper to create a renderer component from a catalog
 */
declare function createRendererFromCatalog<C extends Catalog<Record<string, ComponentDefinition>>>(_catalog: C, registry: ComponentRegistry): ComponentType<Omit<RendererProps, "registry">>;

/**
 * Options for useUIStream
 */
interface UseUIStreamOptions {
    /** API endpoint */
    api: string;
    /** Callback when complete */
    onComplete?: (tree: UITree) => void;
    /** Callback on error */
    onError?: (error: Error) => void;
}
/**
 * Return type for useUIStream
 */
interface UseUIStreamReturn {
    /** Current UI tree */
    tree: UITree | null;
    /** Whether currently streaming */
    isStreaming: boolean;
    /** Error if any */
    error: Error | null;
    /** Send a prompt to generate UI */
    send: (prompt: string, context?: Record<string, unknown>) => Promise<void>;
    /** Clear the current tree */
    clear: () => void;
}
/**
 * Hook for streaming UI generation
 */
declare function useUIStream({ api, onComplete, onError, }: UseUIStreamOptions): UseUIStreamReturn;
/**
 * Convert a flat element list to a UITree
 */
declare function flatToTree(elements: Array<UIElement & {
    parentKey?: string | null;
}>): UITree;

export { type ActionContextValue, ActionProvider, type ActionProviderProps, type ComponentRegistry, type ComponentRenderProps, type ComponentRenderer, ConfirmDialog, type ConfirmDialogProps, type DataContextValue, DataProvider, type DataProviderProps, type FieldValidationState, JSONUIProvider, type JSONUIProviderProps, type PendingConfirmation, Renderer, type RendererProps, type UseUIStreamOptions, type UseUIStreamReturn, type ValidationContextValue, ValidationProvider, type ValidationProviderProps, type VisibilityContextValue, VisibilityProvider, type VisibilityProviderProps, createRendererFromCatalog, flatToTree, useAction, useActions, useData, useDataBinding, useDataValue, useFieldValidation, useIsVisible, useUIStream, useValidation, useVisibility };
