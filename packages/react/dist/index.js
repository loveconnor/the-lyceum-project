"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ActionProvider: () => ActionProvider,
  ConfirmDialog: () => ConfirmDialog,
  DataProvider: () => DataProvider,
  JSONUIProvider: () => JSONUIProvider,
  Renderer: () => Renderer,
  ValidationProvider: () => ValidationProvider,
  VisibilityProvider: () => VisibilityProvider,
  createRendererFromCatalog: () => createRendererFromCatalog,
  flatToTree: () => flatToTree,
  useAction: () => useAction,
  useActions: () => useActions,
  useData: () => useData,
  useDataBinding: () => useDataBinding,
  useDataValue: () => useDataValue,
  useFieldValidation: () => useFieldValidation,
  useIsVisible: () => useIsVisible,
  useUIStream: () => useUIStream,
  useValidation: () => useValidation,
  useVisibility: () => useVisibility
});
module.exports = __toCommonJS(index_exports);

// src/contexts/data.tsx
var import_react = require("react");
var import_core = require("@ai-json-renderer/core");
var import_jsx_runtime = require("react/jsx-runtime");
var DataContext = (0, import_react.createContext)(null);
function DataProvider({
  initialData = {},
  authState,
  onDataChange,
  children
}) {
  const [data, setData] = (0, import_react.useState)(initialData);
  const get = (0, import_react.useCallback)((path) => (0, import_core.getByPath)(data, path), [data]);
  const set = (0, import_react.useCallback)(
    (path, value2) => {
      setData((prev) => {
        const next = { ...prev };
        (0, import_core.setByPath)(next, path, value2);
        return next;
      });
      onDataChange?.(path, value2);
    },
    [onDataChange]
  );
  const update = (0, import_react.useCallback)(
    (updates) => {
      setData((prev) => {
        const next = { ...prev };
        for (const [path, value2] of Object.entries(updates)) {
          (0, import_core.setByPath)(next, path, value2);
          onDataChange?.(path, value2);
        }
        return next;
      });
    },
    [onDataChange]
  );
  const value = (0, import_react.useMemo)(
    () => ({
      data,
      authState,
      get,
      set,
      update
    }),
    [data, authState, get, set, update]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DataContext.Provider, { value, children });
}
function useData() {
  const ctx = (0, import_react.useContext)(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within a DataProvider");
  }
  return ctx;
}
function useDataValue(path) {
  const { get } = useData();
  return get(path);
}
function useDataBinding(path) {
  const { get, set } = useData();
  const value = get(path);
  const setValue = (0, import_react.useCallback)(
    (newValue) => set(path, newValue),
    [path, set]
  );
  return [value, setValue];
}

// src/contexts/visibility.tsx
var import_react2 = require("react");
var import_core2 = require("@ai-json-renderer/core");
var import_jsx_runtime2 = require("react/jsx-runtime");
var VisibilityContext = (0, import_react2.createContext)(null);
function VisibilityProvider({ children }) {
  const { data, authState } = useData();
  const ctx = (0, import_react2.useMemo)(
    () => ({
      dataModel: data,
      authState
    }),
    [data, authState]
  );
  const isVisible = (0, import_react2.useMemo)(
    () => (condition) => (0, import_core2.evaluateVisibility)(condition, ctx),
    [ctx]
  );
  const value = (0, import_react2.useMemo)(
    () => ({ isVisible, ctx }),
    [isVisible, ctx]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(VisibilityContext.Provider, { value, children });
}
function useVisibility() {
  const ctx = (0, import_react2.useContext)(VisibilityContext);
  if (!ctx) {
    throw new Error("useVisibility must be used within a VisibilityProvider");
  }
  return ctx;
}
function useIsVisible(condition) {
  const { isVisible } = useVisibility();
  return isVisible(condition);
}

// src/contexts/actions.tsx
var import_react3 = require("react");
var import_core3 = require("@ai-json-renderer/core");
var import_jsx_runtime3 = require("react/jsx-runtime");
var ActionContext = (0, import_react3.createContext)(null);
function ActionProvider({
  handlers: initialHandlers = {},
  navigate,
  children
}) {
  const { data, set } = useData();
  const [handlers, setHandlers] = (0, import_react3.useState)(initialHandlers);
  const [loadingActions, setLoadingActions] = (0, import_react3.useState)(/* @__PURE__ */ new Set());
  const [pendingConfirmation, setPendingConfirmation] = (0, import_react3.useState)(null);
  const registerHandler = (0, import_react3.useCallback)(
    (name, handler) => {
      setHandlers((prev) => ({ ...prev, [name]: handler }));
    },
    []
  );
  const execute = (0, import_react3.useCallback)(
    async (action) => {
      const resolved = (0, import_core3.resolveAction)(action, data);
      const handler = handlers[resolved.name];
      if (!handler) {
        console.warn(`No handler registered for action: ${resolved.name}`);
        return;
      }
      if (resolved.confirm) {
        return new Promise((resolve, reject) => {
          setPendingConfirmation({
            action: resolved,
            handler,
            resolve: () => {
              setPendingConfirmation(null);
              resolve();
            },
            reject: () => {
              setPendingConfirmation(null);
              reject(new Error("Action cancelled"));
            }
          });
        }).then(async () => {
          setLoadingActions((prev) => new Set(prev).add(resolved.name));
          try {
            await (0, import_core3.executeAction)({
              action: resolved,
              handler,
              setData: set,
              navigate,
              executeAction: async (name) => {
                const subAction = { name };
                await execute(subAction);
              }
            });
          } finally {
            setLoadingActions((prev) => {
              const next = new Set(prev);
              next.delete(resolved.name);
              return next;
            });
          }
        });
      }
      setLoadingActions((prev) => new Set(prev).add(resolved.name));
      try {
        await (0, import_core3.executeAction)({
          action: resolved,
          handler,
          setData: set,
          navigate,
          executeAction: async (name) => {
            const subAction = { name };
            await execute(subAction);
          }
        });
      } finally {
        setLoadingActions((prev) => {
          const next = new Set(prev);
          next.delete(resolved.name);
          return next;
        });
      }
    },
    [data, handlers, set, navigate]
  );
  const confirm = (0, import_react3.useCallback)(() => {
    pendingConfirmation?.resolve();
  }, [pendingConfirmation]);
  const cancel = (0, import_react3.useCallback)(() => {
    pendingConfirmation?.reject();
  }, [pendingConfirmation]);
  const value = (0, import_react3.useMemo)(
    () => ({
      handlers,
      loadingActions,
      pendingConfirmation,
      execute,
      confirm,
      cancel,
      registerHandler
    }),
    [
      handlers,
      loadingActions,
      pendingConfirmation,
      execute,
      confirm,
      cancel,
      registerHandler
    ]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ActionContext.Provider, { value, children });
}
function useActions() {
  const ctx = (0, import_react3.useContext)(ActionContext);
  if (!ctx) {
    throw new Error("useActions must be used within an ActionProvider");
  }
  return ctx;
}
function useAction(action) {
  const { execute, loadingActions } = useActions();
  const isLoading = loadingActions.has(action.name);
  const executeAction2 = (0, import_react3.useCallback)(() => execute(action), [execute, action]);
  return { execute: executeAction2, isLoading };
}
function ConfirmDialog({
  confirm,
  onConfirm,
  onCancel
}) {
  const isDanger = confirm.variant === "danger";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50
      },
      onClick: onCancel,
      children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
        "div",
        {
          style: {
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            maxWidth: "400px",
            width: "100%",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          },
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "h3",
              {
                style: {
                  margin: "0 0 8px 0",
                  fontSize: "18px",
                  fontWeight: 600
                },
                children: confirm.title
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              "p",
              {
                style: {
                  margin: "0 0 24px 0",
                  color: "#6b7280"
                },
                children: confirm.message
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
              "div",
              {
                style: {
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      onClick: onCancel,
                      style: {
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        backgroundColor: "white",
                        cursor: "pointer"
                      },
                      children: confirm.cancelLabel ?? "Cancel"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "button",
                    {
                      onClick: onConfirm,
                      style: {
                        padding: "8px 16px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: isDanger ? "#dc2626" : "#3b82f6",
                        color: "white",
                        cursor: "pointer"
                      },
                      children: confirm.confirmLabel ?? "Confirm"
                    }
                  )
                ]
              }
            )
          ]
        }
      )
    }
  );
}

// src/contexts/validation.tsx
var import_react4 = __toESM(require("react"));
var import_core4 = require("@ai-json-renderer/core");
var import_jsx_runtime4 = require("react/jsx-runtime");
var ValidationContext = (0, import_react4.createContext)(null);
function ValidationProvider({
  customFunctions = {},
  children
}) {
  const { data, authState } = useData();
  const [fieldStates, setFieldStates] = (0, import_react4.useState)({});
  const [fieldConfigs, setFieldConfigs] = (0, import_react4.useState)({});
  const registerField = (0, import_react4.useCallback)(
    (path, config) => {
      setFieldConfigs((prev) => ({ ...prev, [path]: config }));
    },
    []
  );
  const validate = (0, import_react4.useCallback)(
    (path, config) => {
      const value2 = data[path.split("/").filter(Boolean).join(".")];
      const result = (0, import_core4.runValidation)(config, {
        value: value2,
        dataModel: data,
        customFunctions,
        authState
      });
      setFieldStates((prev) => ({
        ...prev,
        [path]: {
          touched: prev[path]?.touched ?? true,
          validated: true,
          result
        }
      }));
      return result;
    },
    [data, customFunctions, authState]
  );
  const touch = (0, import_react4.useCallback)((path) => {
    setFieldStates((prev) => ({
      ...prev,
      [path]: {
        ...prev[path],
        touched: true,
        validated: prev[path]?.validated ?? false,
        result: prev[path]?.result ?? null
      }
    }));
  }, []);
  const clear = (0, import_react4.useCallback)((path) => {
    setFieldStates((prev) => {
      const { [path]: _, ...rest } = prev;
      return rest;
    });
  }, []);
  const validateAll = (0, import_react4.useCallback)(() => {
    let allValid = true;
    for (const [path, config] of Object.entries(fieldConfigs)) {
      const result = validate(path, config);
      if (!result.valid) {
        allValid = false;
      }
    }
    return allValid;
  }, [fieldConfigs, validate]);
  const value = (0, import_react4.useMemo)(
    () => ({
      customFunctions,
      fieldStates,
      validate,
      touch,
      clear,
      validateAll,
      registerField
    }),
    [
      customFunctions,
      fieldStates,
      validate,
      touch,
      clear,
      validateAll,
      registerField
    ]
  );
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(ValidationContext.Provider, { value, children });
}
function useValidation() {
  const ctx = (0, import_react4.useContext)(ValidationContext);
  if (!ctx) {
    throw new Error("useValidation must be used within a ValidationProvider");
  }
  return ctx;
}
function useFieldValidation(path, config) {
  const {
    fieldStates,
    validate: validateField,
    touch: touchField,
    clear: clearField,
    registerField
  } = useValidation();
  import_react4.default.useEffect(() => {
    if (config) {
      registerField(path, config);
    }
  }, [path, config, registerField]);
  const state = fieldStates[path] ?? {
    touched: false,
    validated: false,
    result: null
  };
  const validate = (0, import_react4.useCallback)(
    () => validateField(path, config ?? { checks: [] }),
    [path, config, validateField]
  );
  const touch = (0, import_react4.useCallback)(() => touchField(path), [path, touchField]);
  const clear = (0, import_react4.useCallback)(() => clearField(path), [path, clearField]);
  return {
    state,
    validate,
    touch,
    clear,
    errors: state.result?.errors ?? [],
    isValid: state.result?.valid ?? true
  };
}

// src/renderer.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
function ElementRenderer({
  element,
  tree,
  registry,
  loading,
  fallback
}) {
  const isVisible = useIsVisible(element.visible);
  const { execute } = useActions();
  if (!isVisible) {
    return null;
  }
  const Component = registry[element.type] ?? fallback;
  if (!Component) {
    console.warn(`No renderer for component type: ${element.type}`);
    return null;
  }
  const children = element.children?.map((childKey) => {
    const childElement = tree.elements[childKey];
    if (!childElement) {
      return null;
    }
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
      ElementRenderer,
      {
        element: childElement,
        tree,
        registry,
        loading,
        fallback
      },
      childKey
    );
  });
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Component, { element, onAction: execute, loading, children });
}
function Renderer({ tree, registry, loading, fallback }) {
  if (!tree || !tree.root) {
    return null;
  }
  const rootElement = tree.elements[tree.root];
  if (!rootElement) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    ElementRenderer,
    {
      element: rootElement,
      tree,
      registry,
      loading,
      fallback
    }
  );
}
function JSONUIProvider({
  registry,
  initialData,
  authState,
  actionHandlers,
  navigate,
  validationFunctions,
  onDataChange,
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    DataProvider,
    {
      initialData,
      authState,
      onDataChange,
      children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(VisibilityProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ActionProvider, { handlers: actionHandlers, navigate, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(ValidationProvider, { customFunctions: validationFunctions, children: [
        children,
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ConfirmationDialogManager, {})
      ] }) }) })
    }
  );
}
function ConfirmationDialogManager() {
  const { pendingConfirmation, confirm, cancel } = useActions();
  if (!pendingConfirmation?.action.confirm) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    ConfirmDialog,
    {
      confirm: pendingConfirmation.action.confirm,
      onConfirm: confirm,
      onCancel: cancel
    }
  );
}
function createRendererFromCatalog(_catalog, registry) {
  return function CatalogRenderer(props) {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(Renderer, { ...props, registry });
  };
}

// src/hooks.ts
var import_react5 = require("react");
var import_core5 = require("@ai-json-renderer/core");
function parsePatchLine(line) {
  try {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//")) {
      return null;
    }
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}
function applyPatch(tree, patch) {
  const newTree = { ...tree, elements: { ...tree.elements } };
  switch (patch.op) {
    case "set":
    case "add":
    case "replace": {
      if (patch.path === "/root") {
        newTree.root = patch.value;
        return newTree;
      }
      if (patch.path.startsWith("/elements/")) {
        const pathParts = patch.path.slice("/elements/".length).split("/");
        const elementKey = pathParts[0];
        if (!elementKey) return newTree;
        if (pathParts.length === 1) {
          newTree.elements[elementKey] = patch.value;
        } else {
          const element = newTree.elements[elementKey];
          if (element) {
            const propPath = "/" + pathParts.slice(1).join("/");
            const newElement = { ...element };
            (0, import_core5.setByPath)(
              newElement,
              propPath,
              patch.value
            );
            newTree.elements[elementKey] = newElement;
          }
        }
      }
      break;
    }
    case "remove": {
      if (patch.path.startsWith("/elements/")) {
        const elementKey = patch.path.slice("/elements/".length).split("/")[0];
        if (elementKey) {
          const { [elementKey]: _, ...rest } = newTree.elements;
          newTree.elements = rest;
        }
      }
      break;
    }
  }
  return newTree;
}
function useUIStream({
  api,
  onComplete,
  onError
}) {
  const [tree, setTree] = (0, import_react5.useState)(null);
  const [isStreaming, setIsStreaming] = (0, import_react5.useState)(false);
  const [error, setError] = (0, import_react5.useState)(null);
  const abortControllerRef = (0, import_react5.useRef)(null);
  const clear = (0, import_react5.useCallback)(() => {
    setTree(null);
    setError(null);
  }, []);
  const send = (0, import_react5.useCallback)(
    async (prompt, context) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      setIsStreaming(true);
      setError(null);
      let currentTree = { root: "", elements: {} };
      setTree(currentTree);
      try {
        const response = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context,
            currentTree
          }),
          signal: abortControllerRef.current.signal
        });
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const patch = parsePatchLine(line);
            if (patch) {
              currentTree = applyPatch(currentTree, patch);
              setTree({ ...currentTree });
            }
          }
        }
        if (buffer.trim()) {
          const patch = parsePatchLine(buffer);
          if (patch) {
            currentTree = applyPatch(currentTree, patch);
            setTree({ ...currentTree });
          }
        }
        onComplete?.(currentTree);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }
        const error2 = err instanceof Error ? err : new Error(String(err));
        setError(error2);
        onError?.(error2);
      } finally {
        setIsStreaming(false);
      }
    },
    [api, onComplete, onError]
  );
  (0, import_react5.useEffect)(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);
  return {
    tree,
    isStreaming,
    error,
    send,
    clear
  };
}
function flatToTree(elements) {
  const elementMap = {};
  let root = "";
  for (const element of elements) {
    elementMap[element.key] = {
      key: element.key,
      type: element.type,
      props: element.props,
      children: [],
      visible: element.visible
    };
  }
  for (const element of elements) {
    if (element.parentKey) {
      const parent = elementMap[element.parentKey];
      if (parent) {
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(element.key);
      }
    } else {
      root = element.key;
    }
  }
  return { root, elements: elementMap };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ActionProvider,
  ConfirmDialog,
  DataProvider,
  JSONUIProvider,
  Renderer,
  ValidationProvider,
  VisibilityProvider,
  createRendererFromCatalog,
  flatToTree,
  useAction,
  useActions,
  useData,
  useDataBinding,
  useDataValue,
  useFieldValidation,
  useIsVisible,
  useUIStream,
  useValidation,
  useVisibility
});
//# sourceMappingURL=index.js.map