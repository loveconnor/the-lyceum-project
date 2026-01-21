// src/contexts/data.tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo
} from "react";
import {
  getByPath,
  setByPath
} from "@ai-json-renderer/core";
import { jsx } from "react/jsx-runtime";
var DataContext = createContext(null);
function DataProvider({
  initialData = {},
  authState,
  onDataChange,
  children
}) {
  const [data, setData] = useState(initialData);
  const get = useCallback((path) => getByPath(data, path), [data]);
  const set = useCallback(
    (path, value2) => {
      setData((prev) => {
        const next = { ...prev };
        setByPath(next, path, value2);
        return next;
      });
      onDataChange?.(path, value2);
    },
    [onDataChange]
  );
  const update = useCallback(
    (updates) => {
      setData((prev) => {
        const next = { ...prev };
        for (const [path, value2] of Object.entries(updates)) {
          setByPath(next, path, value2);
          onDataChange?.(path, value2);
        }
        return next;
      });
    },
    [onDataChange]
  );
  const value = useMemo(
    () => ({
      data,
      authState,
      get,
      set,
      update
    }),
    [data, authState, get, set, update]
  );
  return /* @__PURE__ */ jsx(DataContext.Provider, { value, children });
}
function useData() {
  const ctx = useContext(DataContext);
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
  const setValue = useCallback(
    (newValue) => set(path, newValue),
    [path, set]
  );
  return [value, setValue];
}

// src/contexts/visibility.tsx
import {
  createContext as createContext2,
  useContext as useContext2,
  useMemo as useMemo2
} from "react";
import {
  evaluateVisibility
} from "@ai-json-renderer/core";
import { jsx as jsx2 } from "react/jsx-runtime";
var VisibilityContext = createContext2(null);
function VisibilityProvider({ children }) {
  const { data, authState } = useData();
  const ctx = useMemo2(
    () => ({
      dataModel: data,
      authState
    }),
    [data, authState]
  );
  const isVisible = useMemo2(
    () => (condition) => evaluateVisibility(condition, ctx),
    [ctx]
  );
  const value = useMemo2(
    () => ({ isVisible, ctx }),
    [isVisible, ctx]
  );
  return /* @__PURE__ */ jsx2(VisibilityContext.Provider, { value, children });
}
function useVisibility() {
  const ctx = useContext2(VisibilityContext);
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
import {
  createContext as createContext3,
  useContext as useContext3,
  useState as useState2,
  useCallback as useCallback2,
  useMemo as useMemo3
} from "react";
import {
  resolveAction,
  executeAction
} from "@ai-json-renderer/core";
import { jsx as jsx3, jsxs } from "react/jsx-runtime";
var ActionContext = createContext3(null);
function ActionProvider({
  handlers: initialHandlers = {},
  navigate,
  children
}) {
  const { data, set } = useData();
  const [handlers, setHandlers] = useState2(initialHandlers);
  const [loadingActions, setLoadingActions] = useState2(/* @__PURE__ */ new Set());
  const [pendingConfirmation, setPendingConfirmation] = useState2(null);
  const registerHandler = useCallback2(
    (name, handler) => {
      setHandlers((prev) => ({ ...prev, [name]: handler }));
    },
    []
  );
  const execute = useCallback2(
    async (action) => {
      const resolved = resolveAction(action, data);
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
            await executeAction({
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
        await executeAction({
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
  const confirm = useCallback2(() => {
    pendingConfirmation?.resolve();
  }, [pendingConfirmation]);
  const cancel = useCallback2(() => {
    pendingConfirmation?.reject();
  }, [pendingConfirmation]);
  const value = useMemo3(
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
  return /* @__PURE__ */ jsx3(ActionContext.Provider, { value, children });
}
function useActions() {
  const ctx = useContext3(ActionContext);
  if (!ctx) {
    throw new Error("useActions must be used within an ActionProvider");
  }
  return ctx;
}
function useAction(action) {
  const { execute, loadingActions } = useActions();
  const isLoading = loadingActions.has(action.name);
  const executeAction2 = useCallback2(() => execute(action), [execute, action]);
  return { execute: executeAction2, isLoading };
}
function ConfirmDialog({
  confirm,
  onConfirm,
  onCancel
}) {
  const isDanger = confirm.variant === "danger";
  return /* @__PURE__ */ jsx3(
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
      children: /* @__PURE__ */ jsxs(
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
            /* @__PURE__ */ jsx3(
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
            /* @__PURE__ */ jsx3(
              "p",
              {
                style: {
                  margin: "0 0 24px 0",
                  color: "#6b7280"
                },
                children: confirm.message
              }
            ),
            /* @__PURE__ */ jsxs(
              "div",
              {
                style: {
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end"
                },
                children: [
                  /* @__PURE__ */ jsx3(
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
                  /* @__PURE__ */ jsx3(
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
import React4, {
  createContext as createContext4,
  useContext as useContext4,
  useState as useState3,
  useCallback as useCallback3,
  useMemo as useMemo4
} from "react";
import {
  runValidation
} from "@ai-json-renderer/core";
import { jsx as jsx4 } from "react/jsx-runtime";
var ValidationContext = createContext4(null);
function ValidationProvider({
  customFunctions = {},
  children
}) {
  const { data, authState } = useData();
  const [fieldStates, setFieldStates] = useState3({});
  const [fieldConfigs, setFieldConfigs] = useState3({});
  const registerField = useCallback3(
    (path, config) => {
      setFieldConfigs((prev) => ({ ...prev, [path]: config }));
    },
    []
  );
  const validate = useCallback3(
    (path, config) => {
      const value2 = data[path.split("/").filter(Boolean).join(".")];
      const result = runValidation(config, {
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
  const touch = useCallback3((path) => {
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
  const clear = useCallback3((path) => {
    setFieldStates((prev) => {
      const { [path]: _, ...rest } = prev;
      return rest;
    });
  }, []);
  const validateAll = useCallback3(() => {
    let allValid = true;
    for (const [path, config] of Object.entries(fieldConfigs)) {
      const result = validate(path, config);
      if (!result.valid) {
        allValid = false;
      }
    }
    return allValid;
  }, [fieldConfigs, validate]);
  const value = useMemo4(
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
  return /* @__PURE__ */ jsx4(ValidationContext.Provider, { value, children });
}
function useValidation() {
  const ctx = useContext4(ValidationContext);
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
  React4.useEffect(() => {
    if (config) {
      registerField(path, config);
    }
  }, [path, config, registerField]);
  const state = fieldStates[path] ?? {
    touched: false,
    validated: false,
    result: null
  };
  const validate = useCallback3(
    () => validateField(path, config ?? { checks: [] }),
    [path, config, validateField]
  );
  const touch = useCallback3(() => touchField(path), [path, touchField]);
  const clear = useCallback3(() => clearField(path), [path, clearField]);
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
import { jsx as jsx5, jsxs as jsxs2 } from "react/jsx-runtime";
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
    return /* @__PURE__ */ jsx5(
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
  return /* @__PURE__ */ jsx5(Component, { element, onAction: execute, loading, children });
}
function Renderer({ tree, registry, loading, fallback }) {
  if (!tree || !tree.root) {
    return null;
  }
  const rootElement = tree.elements[tree.root];
  if (!rootElement) {
    return null;
  }
  return /* @__PURE__ */ jsx5(
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
  return /* @__PURE__ */ jsx5(
    DataProvider,
    {
      initialData,
      authState,
      onDataChange,
      children: /* @__PURE__ */ jsx5(VisibilityProvider, { children: /* @__PURE__ */ jsx5(ActionProvider, { handlers: actionHandlers, navigate, children: /* @__PURE__ */ jsxs2(ValidationProvider, { customFunctions: validationFunctions, children: [
        children,
        /* @__PURE__ */ jsx5(ConfirmationDialogManager, {})
      ] }) }) })
    }
  );
}
function ConfirmationDialogManager() {
  const { pendingConfirmation, confirm, cancel } = useActions();
  if (!pendingConfirmation?.action.confirm) {
    return null;
  }
  return /* @__PURE__ */ jsx5(
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
    return /* @__PURE__ */ jsx5(Renderer, { ...props, registry });
  };
}

// src/hooks.ts
import { useState as useState4, useCallback as useCallback4, useRef, useEffect } from "react";
import { setByPath as setByPath2 } from "@ai-json-renderer/core";
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
            setByPath2(
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
  const [tree, setTree] = useState4(null);
  const [isStreaming, setIsStreaming] = useState4(false);
  const [error, setError] = useState4(null);
  const abortControllerRef = useRef(null);
  const clear = useCallback4(() => {
    setTree(null);
    setError(null);
  }, []);
  const send = useCallback4(
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
  useEffect(() => {
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
export {
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
};
//# sourceMappingURL=index.mjs.map