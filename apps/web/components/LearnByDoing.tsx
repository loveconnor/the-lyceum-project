"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Renderer, useUIStream, JSONUIProvider } from "../../../packages/react";
import type { UITree, UIElement } from "../../../packages/core";
import { toast } from "sonner";
import { CodeBlock, CodeBlockCode } from "./ui/custom/prompt/code-block";
import { Toaster } from "./ui/sonner";
import {
  demoRegistry,
  fallbackComponent,
  useInteractiveState,
} from "./learning/index";
import { Markdown } from "./ui/custom/prompt/markdown";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { updatePathItem } from "@/lib/api/paths";

const SIMULATION_PROMPT = "Create a contact form with name, email, and message";

export type DemoProps = {
  api?: string;
  promptPrefix?: string;
  promptSuffix?: string;
  placeholder?: string;
  helperText?: string;
  simulationPrompt?: string;
  layout?: "split" | "full";
  showJsonToggle?: boolean;
  stepByStep?: boolean;
  initialPrompt?: string;
  initialTree?: UITree | null;
  autoStart?: boolean;
  hideInput?: boolean;
  onEndReached?: () => void;
  fallbackStepText?: string;
  moduleId?: string; // For saving progress
  pathId?: string; // For marking module as in-progress
};

interface SimulationStage {
  tree: UITree;
  stream: string;
}

const SIMULATION_STAGES: SimulationStage[] = [
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: [],
        },
      },
    },
    stream: '{"op":"set","path":"/root","value":"card"}',
  },
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: ["name"],
        },
        name: {
          key: "name",
          type: "Input",
          props: { label: "Name", name: "name" },
        },
      },
    },
    stream:
      '{"op":"add","path":"/elements/card","value":{"key":"card","type":"Card","props":{"title":"Contact Us","maxWidth":"md"},"children":["name"]}}',
  },
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: ["name", "email"],
        },
        name: {
          key: "name",
          type: "Input",
          props: { label: "Name", name: "name" },
        },
        email: {
          key: "email",
          type: "Input",
          props: { label: "Email", name: "email" },
        },
      },
    },
    stream:
      '{"op":"add","path":"/elements/email","value":{"key":"email","type":"Input","props":{"label":"Email","name":"email"}}}',
  },
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: ["name", "email", "message"],
        },
        name: {
          key: "name",
          type: "Input",
          props: { label: "Name", name: "name" },
        },
        email: {
          key: "email",
          type: "Input",
          props: { label: "Email", name: "email" },
        },
        message: {
          key: "message",
          type: "Textarea",
          props: { label: "Message", name: "message" },
        },
      },
    },
    stream:
      '{"op":"add","path":"/elements/message","value":{"key":"message","type":"Textarea","props":{"label":"Message","name":"message"}}}',
  },
  {
    tree: {
      root: "card",
      elements: {
        card: {
          key: "card",
          type: "Card",
          props: { title: "Contact Us", maxWidth: "md" },
          children: ["name", "email", "message", "submit"],
        },
        name: {
          key: "name",
          type: "Input",
          props: { label: "Name", name: "name" },
        },
        email: {
          key: "email",
          type: "Input",
          props: { label: "Email", name: "email" },
        },
        message: {
          key: "message",
          type: "Textarea",
          props: { label: "Message", name: "message" },
        },
        submit: {
          key: "submit",
          type: "Button",
          props: { label: "Send Message", variant: "primary" },
        },
      },
    },
    stream:
      '{"op":"add","path":"/elements/submit","value":{"key":"submit","type":"Button","props":{"label":"Send Message","variant":"primary"}}}',
  },
];

const CODE_EXAMPLE = `import { Renderer, useUIStream } from '@ai-json-renderer/react';
import { registry } from './registry';

function App() {
  const { tree, isStreaming, send } = useUIStream({
    api: '/api/generate',
  });

  return (
    <Renderer
      tree={tree}
      registry={registry}
      loading={isStreaming}
    />
  );
}`;

type Mode = "simulation" | "interactive";
type Phase = "typing" | "streaming" | "complete";
type Tab = "stream" | "json" | "code";

export function Demo({
  api = "/api/generate",
  promptPrefix = "",
  promptSuffix = "",
  placeholder = "Describe what you want to build...",
  helperText = 'Try: "Create a login form" or "Build a feedback form with rating"',
  simulationPrompt = SIMULATION_PROMPT,
  layout = "split",
  showJsonToggle = false,
  stepByStep = false,
  initialPrompt = "",
  initialTree = null,
  autoStart = false,
  hideInput = false,
  onEndReached,
  fallbackStepText,
  moduleId,
  pathId,
}: DemoProps = {}) {
  const [mode, setMode] = useState<Mode>("simulation");
  const [phase, setPhase] = useState<Phase>("typing");
  const [typedPrompt, setTypedPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [stageIndex, setStageIndex] = useState(-1);
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("json");
  const [simulationTree, setSimulationTree] = useState<UITree | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [widgetStates, setWidgetStates] = useState<Record<number, any>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const autoStartedRef = useRef(false);
  const endReachedRef = useRef(false);
  const hasMarkedInProgress = useRef(false);
  const router = useRouter();

  // Use the library's useUIStream hook for real API calls
  const {
    tree: apiTree,
    isStreaming,
    send,
    clear,
  } = useUIStream({
    api,
    onError: (err: Error) => console.error("Generation error:", err),
  } as Parameters<typeof useUIStream>[0]);

  // Initialize interactive state for Select components
  useInteractiveState();

  // Load progress from database on mount
  useEffect(() => {
    if (!moduleId || !stepByStep) return;

    const loadProgress = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('learn_by_doing_progress')
          .select('completed_steps, current_step, widget_states')
          .eq('user_id', user.id)
          .eq('module_id', moduleId)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading progress:', error);
          return;
        }

        if (data) {
          // Restore completed steps
          const completedArray = Array.isArray(data.completed_steps) ? data.completed_steps : [];
          setCompletedSteps(new Set(completedArray));
          
          // Restore current step
          if (typeof data.current_step === 'number') {
            setStepIndex(data.current_step);
          }

          // Restore widget states
          if (data.widget_states && typeof data.widget_states === 'object') {
            setWidgetStates(data.widget_states);
          }
        }
      } catch (err) {
        console.error('Failed to load progress:', err);
      }
    };

    loadProgress();
  }, [moduleId, stepByStep]);

  // Save progress to database whenever it changes
  useEffect(() => {
    if (!moduleId || !stepByStep) return;

    const saveProgress = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const completedArray = Array.from(completedSteps);

        await supabase
          .from('learn_by_doing_progress')
          .upsert({
            user_id: user.id,
            module_id: moduleId,
            completed_steps: completedArray,
            current_step: stepIndex,
            widget_states: widgetStates,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,module_id'
          });
      } catch (err) {
        console.error('Failed to save progress:', err);
      }
    };

    // Debounce saves to avoid too many database writes
    const timeoutId = setTimeout(saveProgress, 500);
    return () => clearTimeout(timeoutId);
  }, [moduleId, stepByStep, completedSteps, stepIndex, widgetStates]);

  // Mark module as in-progress when user completes the first step (step 0)
  useEffect(() => {
    if (!pathId || !moduleId || !stepByStep || hasMarkedInProgress.current) return;

    // Check if user has moved past the first step (completed step 0)
    const hasCompletedFirstStep = completedSteps.has(0) && stepIndex > 0;
    
    if (hasCompletedFirstStep) {
      const markModuleInProgress = async () => {
        try {
          await updatePathItem(pathId, moduleId, { status: 'in-progress' });
          hasMarkedInProgress.current = true;
          // Refresh the path page to show updated status
          router.refresh();
        } catch (err) {
          console.error('Failed to mark module as in-progress:', err);
        }
      };

      markModuleInProgress();
    }
  }, [pathId, moduleId, stepByStep, completedSteps, stepIndex, router]);

  const currentSimulationStage =
    stageIndex >= 0 ? SIMULATION_STAGES[stageIndex] : null;

  // Determine which tree to display - keep simulation tree until new API response
  const currentTree =
    mode === "simulation"
      ? currentSimulationStage?.tree || simulationTree
      : apiTree || simulationTree;

  const stopGeneration = useCallback(() => {
    if (mode === "simulation") {
      setMode("interactive");
      setPhase("complete");
      setTypedPrompt(simulationPrompt);
      setUserPrompt("");
    }
    clear();
  }, [mode, clear, simulationPrompt]);

  // Typing effect for simulation
  useEffect(() => {
    if (mode !== "simulation" || phase !== "typing") return;

    let i = 0;
    const interval = setInterval(() => {
      if (i < simulationPrompt.length) {
        setTypedPrompt(simulationPrompt.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => setPhase("streaming"), 500);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [mode, phase, simulationPrompt]);

  // Streaming effect for simulation
  useEffect(() => {
    if (mode !== "simulation" || phase !== "streaming") return;

    let i = 0;
    const interval = setInterval(() => {
      if (i < SIMULATION_STAGES.length) {
        const stage = SIMULATION_STAGES[i];
        if (stage) {
          setStageIndex(i);
          setStreamLines((prev) => [...prev, stage.stream]);
          setSimulationTree(stage.tree);
        }
        i++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setPhase("complete");
          setMode("interactive");
          setUserPrompt("");
        }, 500);
      }
    }, 600);

    return () => clearInterval(interval);
  }, [mode, phase]);

  // Track stream lines from real API
  useEffect(() => {
    if (mode === "interactive" && apiTree) {
      // Convert tree to stream line for display
      const streamLine = JSON.stringify({ tree: apiTree });
      if (
        !streamLines.includes(streamLine) &&
        Object.keys(apiTree.elements).length > 0
      ) {
        setStreamLines((prev) => {
          const lastLine = prev[prev.length - 1];
          if (lastLine !== streamLine) {
            return [...prev, streamLine];
          }
          return prev;
        });
      }
    }
  }, [mode, apiTree, streamLines]);

  const handleSubmit = useCallback(async () => {
    const finalPrompt = `${promptPrefix}${userPrompt}${promptSuffix}`;
    if (!finalPrompt.trim() || isStreaming) return;
    setStreamLines([]);
    await send(finalPrompt);
  }, [userPrompt, isStreaming, send, promptPrefix, promptSuffix]);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current || !initialPrompt.trim()) return;
    autoStartedRef.current = true;
    setMode("interactive");
    setPhase("complete");
    setUserPrompt(initialPrompt);
    setTypedPrompt(initialPrompt);
    setStreamLines([]);
    void send(`${promptPrefix}${initialPrompt}${promptSuffix}`);
  }, [autoStart, initialPrompt, promptPrefix, promptSuffix, send]);

  useEffect(() => {
    if (!initialTree || !initialTree.root) return;
    setMode("interactive");
    setPhase("complete");
    setSimulationTree(initialTree);
  }, [initialTree]);


  // Expose action handler for registry components - shows toast with text
  useEffect(() => {
    const win = window as unknown as {
      __demoAction?: (text: string) => void;
      __demoNextStep?: () => void;
    };

    win.__demoAction = (text: string) => {
      toast(text);
    };

    return () => {
      delete win.__demoAction;
      delete win.__demoNextStep;
    };
  }, []);

  const jsonCode = currentTree
    ? JSON.stringify(currentTree, null, 2)
    : "// waiting...";

  const isTypingSimulation = mode === "simulation" && phase === "typing";
  const isStreamingSimulation = mode === "simulation" && phase === "streaming";
  const showLoadingDots = isStreamingSimulation || isStreaming;

  const rootChildCount =
    currentTree?.elements?.[currentTree.root]?.children?.length;

  useEffect(() => {
    if (stepByStep) {
      setStepIndex(0);
    }
  }, [stepByStep, currentTree?.root, rootChildCount]);

  const stepTreeInfo = (() => {
    if (!stepByStep || !currentTree || !currentTree.root) {
      return {
        tree: currentTree,
        total: 1,
        active: 0,
        activeChildKey: undefined,
      };
    }

    const rootElement = currentTree.elements[currentTree.root] as
      | UIElement<string, Record<string, unknown>>
      | undefined;
    if (!rootElement) {
      return {
        tree: currentTree,
        total: 1,
        active: 0,
        activeChildKey: undefined,
      };
    }
    const children = rootElement?.children || [];

    const isTextOnlyElement = (key: string) => {
      const element = currentTree.elements[key];
      if (!element) return false;
      if (element.type === "Text" || element.type === "Heading") return true;
      if (element.type === "Stack") {
        const stackChildren = element.children || [];
        if (stackChildren.length === 0) return false;
        return stackChildren.every((childKey) => {
          const child = currentTree.elements[childKey];
          return child?.type === "Text" || child?.type === "Heading";
        });
      }
      return false;
    };

    const introChildren: string[] = [];
    for (const childKey of children) {
      if (isTextOnlyElement(childKey)) {
        introChildren.push(childKey);
      } else {
        break;
      }
    }

    const stepChildren = children
      .slice(introChildren.length)
      .filter((childKey) => Boolean(currentTree.elements[childKey]));
    const total = stepChildren.length || 1;
    const active = Math.min(Math.max(stepIndex, 0), total - 1);
    const activeChildKey = stepChildren[active];

    if (!activeChildKey) {
      return { tree: currentTree, total, active, activeChildKey: undefined };
    }

    const steppedChildren = [...introChildren, activeChildKey].filter(
      Boolean,
    ) as string[];

    const steppedRoot: UIElement<string, Record<string, unknown>> = {
      ...rootElement,
      children: steppedChildren as string[],
    };

    return {
      tree: {
        ...currentTree,
        elements: {
          ...currentTree.elements,
          [currentTree.root]: steppedRoot,
        },
      },
      total,
      active,
      activeChildKey,
    };
  })();

  const renderTree = stepTreeInfo.tree;

  useEffect(() => {
    if (!stepByStep) return;
    if (stepTreeInfo.active !== stepTreeInfo.total - 1) {
      endReachedRef.current = false;
    }
  }, [stepByStep, stepTreeInfo.active, stepTreeInfo.total]);

  useEffect(() => {
    const win = window as unknown as { __demoNextStep?: () => void };
    win.__demoNextStep = () => {
      if (!stepByStep || stepTreeInfo.total <= 1) return;
      setStepIndex((prev) => Math.min(prev + 1, stepTreeInfo.total - 1));
    };
    return () => {
      delete win.__demoNextStep;
    };
  }, [stepByStep, stepTreeInfo.total]);

  const isTextOnlyStep = (() => {
    if (!stepByStep || !currentTree || !stepTreeInfo.activeChildKey) {
      return false;
    }

    const element = currentTree.elements[stepTreeInfo.activeChildKey];
    if (!element) return false;

    const type = element.type;
    if (type === "Text" || type === "Markdown" || type === "Heading") {
      return true;
    }

    if (type === "Stack" || type === "Card") {
      const children = element.children || [];
      if (children.length === 0) return false;
      return children.every((childKey) => {
        const child = currentTree.elements[childKey];
        return child?.type === "Text" || child?.type === "Heading" || child?.type === "Markdown";
      });
    }

    return false;
  })();

  // Check if step has interactive widgets that require completion
  const stepHasInteractiveWidget = (() => {
    if (!stepByStep || !currentTree || !stepTreeInfo.activeChildKey) {
      return false;
    }

    const element = currentTree.elements[stepTreeInfo.activeChildKey];
    if (!element) return false;

    const interactiveTypes = [
      "MultipleChoice", "FillInTheBlank", "CodeFill", "TrueFalse",
      "Matching", "OrderSteps", "DragDrop", "NumericInput", "DiagramSelection"
    ];

    if (interactiveTypes.includes(element.type || "")) {
      return true;
    }

    if (element.type === "Stack" || element.type === "Card") {
      const children = element.children || [];
      return children.some((childKey) => {
        const child = currentTree.elements[childKey];
        return interactiveTypes.includes(child?.type || "");
      });
    }

    return false;
  })();

  // Auto-complete text-only steps
  React.useEffect(() => {
    if (isTextOnlyStep && !completedSteps.has(stepTreeInfo.active)) {
      setCompletedSteps(prev => new Set(prev).add(stepTreeInfo.active));
    }
  }, [isTextOnlyStep, stepTreeInfo.active, completedSteps]);

  // Expose global function for widgets to mark step complete
  React.useEffect(() => {
    const win = window as any;
    win.__markStepComplete = () => {
      setCompletedSteps(prev => new Set(prev).add(stepTreeInfo.active));
    };
    
    // Expose function for widgets to save their state
    win.__saveWidgetState = (state: any) => {
      setWidgetStates(prev => ({
        ...prev,
        [stepTreeInfo.active]: state
      }));
    };
    
    // Expose function for widgets to get their saved state
    win.__getWidgetState = () => {
      return widgetStates[stepTreeInfo.active];
    };
    
    return () => {
      delete win.__markStepComplete;
      delete win.__saveWidgetState;
      delete win.__getWidgetState;
    };
  }, [stepTreeInfo.active, widgetStates]);

  // Check if current step can advance
  const canAdvanceToNext =
    isTextOnlyStep || !stepHasInteractiveWidget || completedSteps.has(stepTreeInfo.active);

  const stepHasBodyText = (() => {
    if (!stepByStep || !currentTree || !stepTreeInfo.activeChildKey) {
      return false;
    }

    const element = currentTree.elements[stepTreeInfo.activeChildKey];
    if (!element) return false;

    const isBodyType = (type?: string) =>
      type === "Text" || type === "Markdown";

    if (isBodyType(element.type)) return true;

    if (element.type === "Stack") {
      const children = element.children || [];
      return children.some((childKey) => {
        const child = currentTree.elements[childKey];
        return isBodyType(child?.type);
      });
    }

    return false;
  })();

  return (
    <div className="w-full max-w-4xl mx-auto text-left">
      {/* Prompt input */}
      {!hideInput && (
        <div className="mb-6">
          <div
            className="border border-border rounded p-3 bg-background font-mono text-sm min-h-[44px] flex items-center justify-between cursor-text"
            onClick={() => {
              if (mode === "simulation") {
                setMode("interactive");
                setPhase("complete");
                setUserPrompt("");
                setTimeout(() => inputRef.current?.focus(), 0);
              } else {
                inputRef.current?.focus();
              }
            }}
          >
            {mode === "simulation" ? (
              <div className="flex items-center flex-1">
                <span className="inline-flex items-center h-5">
                  {typedPrompt}
                </span>
                {isTypingSimulation && (
                  <span className="inline-block w-2 h-4 bg-foreground ml-0.5 animate-pulse" />
                )}
              </div>
            ) : (
              <form
                className="flex items-center flex-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50 text-base"
                  disabled={isStreaming}
                  maxLength={140}
                />
              </form>
            )}
            {mode === "simulation" || isStreaming ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  stopGeneration();
                }}
                className="ml-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                aria-label="Stop"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  stroke="none"
                >
                  <rect x="6" y="6" width="12" height="12" />
                </svg>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSubmit();
                }}
                disabled={!userPrompt.trim()}
                className="ml-2 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-30"
                aria-label="Submit"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14" />
                  <path d="M19 12l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {helperText}
          </div>
        </div>
      )}

      {layout === "split" ? (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Tabbed code/stream/json panel */}
          <div>
            <div className="flex items-center gap-4 mb-2 h-6">
              {(["json", "stream", "code"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-xs font-mono transition-colors ${
                    activeTab === tab
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="border border-border rounded p-3 bg-background font-mono text-xs h-96 overflow-auto text-left">
              <div className={activeTab === "stream" ? "" : "hidden"}>
                {streamLines.length > 0 ? (
                  <>
                    <CodeBlock>
                      <CodeBlockCode
                        code={streamLines.join("\n")}
                        language="json"
                      />
                    </CodeBlock>
                    {showLoadingDots && (
                      <div className="flex gap-1 mt-2">
                        <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse" />
                        <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse [animation-delay:75ms]" />
                        <span className="w-1 h-1 bg-muted-foreground rounded-full animate-pulse [animation-delay:150ms]" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-muted-foreground/50">
                    {showLoadingDots ? "streaming..." : "waiting..."}
                  </div>
                )}
              </div>
              <div className={activeTab === "json" ? "" : "hidden"}>
                <CodeBlock>
                  <CodeBlockCode code={jsonCode} language="json" />
                </CodeBlock>
              </div>
              <div className={activeTab === "code" ? "" : "hidden"}>
                <CodeBlock>
                  <CodeBlockCode code={CODE_EXAMPLE} language="tsx" />
                </CodeBlock>
              </div>
            </div>
          </div>

          {/* Rendered output using json-render */}
          <div>
            <div className="flex items-center justify-between mb-2 h-6">
              <div className="text-xs text-muted-foreground font-mono">
                render
              </div>
              <button
                onClick={() => setIsFullscreen(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Maximize"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              </button>
            </div>
            <div className="border border-border rounded p-3 bg-background h-96 overflow-auto">
              {renderTree && renderTree.root ? (
                <div className="animate-in fade-in duration-200 w-full min-h-full flex items-center justify-center py-4">
                  <JSONUIProvider
                    registry={
                      demoRegistry as Parameters<
                        typeof JSONUIProvider
                      >[0]["registry"]
                    }
                  >
                    <Renderer
                      tree={renderTree}
                      registry={
                        demoRegistry as Parameters<
                          typeof Renderer
                        >[0]["registry"]
                      }
                      loading={isStreaming || isStreamingSimulation}
                      fallback={
                        fallbackComponent as Parameters<
                          typeof Renderer
                        >[0]["fallback"]
                      }
                    />
                  </JSONUIProvider>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
                  {isStreaming ? "generating..." : "waiting..."}
                </div>
              )}
            </div>
            <Toaster position="bottom-right" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {showJsonToggle && (
            <div className="flex items-center justify-end">
              <button
                onClick={() => setShowJson((prev) => !prev)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showJson ? "Hide JSON" : "Show JSON"}
              </button>
            </div>
          )}
          {showJson && (
            <div className="border border-border rounded p-3 bg-background font-mono text-xs overflow-auto text-left">
              <CodeBlock>
                <CodeBlockCode code={jsonCode} language="json" />
              </CodeBlock>
            </div>
          )}
          {renderTree && renderTree.root ? (
            <div className="animate-in fade-in duration-200 w-full">
              <JSONUIProvider
                registry={
                  demoRegistry as Parameters<
                    typeof JSONUIProvider
                  >[0]["registry"]
                }
              >
                <Renderer
                  tree={renderTree}
                  registry={
                    demoRegistry as Parameters<typeof Renderer>[0]["registry"]
                  }
                  loading={isStreaming || isStreamingSimulation}
                  fallback={
                    fallbackComponent as Parameters<
                      typeof Renderer
                    >[0]["fallback"]
                  }
                />
              </JSONUIProvider>
            </div>
          ) : (
            <div className="flex items-center justify-center text-muted-foreground/50 text-sm">
              {isStreaming ? "generating..." : "waiting..."}
            </div>
          )}
          {stepByStep && isTextOnlyStep && !stepHasBodyText && fallbackStepText && (
            <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/30 p-4">
              <Markdown>{fallbackStepText}</Markdown>
            </div>
          )}
          {stepByStep && stepTreeInfo.total >= 1 && (
            <div className="flex items-center justify-between pt-6 mt-4 border-t border-border/50 relative">
              <button
                onClick={() => setStepIndex((prev) => Math.max(prev - 1, 0))}
                disabled={stepTreeInfo.active === 0}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${stepTreeInfo.total === 1 ? "invisible" : ""}`}
              >
                Previous
              </button>

              <div className="text-xs text-muted-foreground font-medium absolute left-1/2 -translate-x-1/2">
                Step {stepTreeInfo.active + 1} of {stepTreeInfo.total}
              </div>

              <button
                onClick={() => {
                  if (stepTreeInfo.active >= stepTreeInfo.total - 1) {
                    onEndReached?.();
                  } else {
                    setStepIndex((prev) =>
                      Math.min(prev + 1, stepTreeInfo.total - 1),
                    );
                  }
                }}
                disabled={!canAdvanceToNext}
                className="px-3 py-1.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={!canAdvanceToNext ? "Complete the activity to continue" : ""}
              >
                {stepTreeInfo.active >= stepTreeInfo.total - 1 ? "Complete" : "Next"}
              </button>
            </div>
          )}
          <Toaster position="bottom-right" />
        </div>
      )}

      {/* Fullscreen modal */}
      {layout === "split" && isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-6 h-14 border-b border-border">
            <div className="text-sm font-mono">render</div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1"
              aria-label="Close"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-6">
            {currentTree && currentTree.root ? (
              <div className="w-full min-h-full flex items-center justify-center">
                <JSONUIProvider
                  registry={
                    demoRegistry as Parameters<
                      typeof JSONUIProvider
                    >[0]["registry"]
                  }
                >
                  <Renderer
                    tree={currentTree}
                    registry={
                      demoRegistry as Parameters<typeof Renderer>[0]["registry"]
                    }
                    loading={isStreaming || isStreamingSimulation}
                    fallback={
                      fallbackComponent as Parameters<
                        typeof Renderer
                      >[0]["fallback"]
                    }
                  />
                </JSONUIProvider>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm">
                {isStreaming ? "generating..." : "waiting..."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
