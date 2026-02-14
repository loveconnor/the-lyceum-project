"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { ExploreLabData } from "@/types/lab-templates";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Compass,
  Sparkles,
  Lightbulb,
  PlayCircle,
  RotateCcw,
  BookOpen,
  Zap,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { LabStepPanel } from "@/components/labs/lab-step-panel";
import { EditorWidget, createEditorValue, extractPlainText } from "@/components/widgets";
import { MultipleChoiceWidget } from "@/components/widgets/multiple-choice-widget";
import { CodeEditorWidget } from "@/components/widgets/code-editor-widget";
import { LabLearningWidget, isLearnByDoingWidgetType } from "@/components/labs/lab-learning-widget";

const SIMULATION_DURATION_SECONDS = 1.5;
const SIMULATION_DURATION_MS = SIMULATION_DURATION_SECONDS * 1000;
const START_X = 20;
const GROUND_Y = 180;
const MIN_X = 4;
const MAX_X = 380;
const MIN_TRAVEL_PX = 36;
const MAX_TRAVEL_PX = 320;
const MIN_APEX_OFFSET_PX = 24;
const MAX_APEX_OFFSET_PX = 120;
const PATH_SAMPLE_COUNT = 24;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const normalizeParamKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

interface Insight {
  id: string;
  text: string;
  timestamp: Date;
}

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
  instruction?: string;
  keyQuestions?: string[];
  prompt?: string;
  widgets: Array<{
    type: string;
    config: any;
  }>;
}

interface ExploreTemplateProps {
  data: ExploreLabData;
  labId?: string;
  moduleContext?: {
    pathId: string;
    moduleId: string;
    onComplete?: () => void;
  };
}

interface TrajectoryPoint {
  x: number;
  y: number;
}

interface SimulationTrajectory {
  maxHeight: number;
  range: number;
  timeOfFlight: number;
  points: TrajectoryPoint[];
}

const getDefaultExploreWidgets = (
  step: Pick<Step, "id" | "title" | "prompt" | "instruction">
): Step["widgets"] => [
  {
    type: "editor",
    config: {
      label: step.title,
      description: step.prompt || step.instruction,
      placeholder: "Capture your observations and reasoning...",
      minHeight: "180px",
    },
  },
];

const ensureExploreWidgets = (
  step: Pick<Step, "id" | "title" | "prompt" | "instruction">,
  widgets: Step["widgets"] | undefined
): Step["widgets"] => {
  if (widgets && widgets.length > 0) {
    return widgets;
  }
  return getDefaultExploreWidgets(step);
};

export default function ExploreTemplate({ data, labId, moduleContext }: ExploreTemplateProps) {
  const {
    labTitle,
    description,
    parameters: paramConfig,
    guidingQuestions,
    steps: aiSteps,
  } = data;

  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  const initialParams = paramConfig.reduce((acc, param) => {
    acc[param.id] = [param.defaultValue];
    return acc;
  }, {} as Record<string, number[]>);

  const initialSteps: Step[] = aiSteps && aiSteps.length > 0
    ? aiSteps.map((step: any, idx: number) => ({
        id: step.id || `step-${idx}`,
        title: step.title || `Step ${idx + 1}`,
        status: idx === 0 ? "current" : "pending",
        instruction: step.instruction,
        keyQuestions: step.keyQuestions,
        prompt: step.prompt,
        widgets: ensureExploreWidgets(
          {
            id: step.id || `step-${idx}`,
            title: step.title || `Step ${idx + 1}`,
            instruction: step.instruction,
            prompt: step.prompt,
          },
          step.widgets as Step["widgets"] | undefined
        ),
      }))
    : [
        {
          id: "hypothesis",
          title: "Set a Hypothesis",
          status: "current",
          instruction: "Define what you expect to happen before you run simulations.",
          widgets: getDefaultExploreWidgets({ id: "hypothesis", title: "Set a Hypothesis" }),
        },
        {
          id: "experiment",
          title: "Run Experiments",
          status: "pending",
          instruction: "Adjust parameters, run the simulation, and compare outcomes.",
          widgets: getDefaultExploreWidgets({ id: "experiment", title: "Run Experiments" }),
        },
        {
          id: "reflect",
          title: "Reflect on Findings",
          status: "pending",
          instruction: "Capture the most important conclusions from your runs.",
          widgets: getDefaultExploreWidgets({ id: "reflect", title: "Reflect on Findings" }),
        },
      ];

  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [parameters, setParameters] = useState(initialParams);
  const [widgetResponses, setWidgetResponses] = useState<Record<string, any>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationRunId, setSimulationRunId] = useState(0);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [currentReflection, setCurrentReflection] = useState("");
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  const simulationTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentStep = steps.find((s) => s.status === "current");
  const currentStepIndex = steps.findIndex((s) => s.status === "current");

  React.useEffect(() => {
    if (!currentStep) return;
    const win = window as any;
    win.__markStepComplete = () => {
      void completeStep(currentStep.id);
    };

    return () => {
      if (win.__markStepComplete) {
        delete win.__markStepComplete;
      }
    };
  }, [currentStep?.id]);

  React.useEffect(() => {
    if (!labId) {
      setIsLoadingProgress(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const { fetchLabProgress } = await import("@/lib/api/labs");
        const progress = await fetchLabProgress(labId);

        if (progress && progress.length > 0) {
          const latest = progress[progress.length - 1] as any;

          if (latest?.step_data) {
            if (latest.step_data.parameters) {
              setParameters(latest.step_data.parameters);
            }
            if (latest.step_data.insights) {
              setInsights(latest.step_data.insights);
            }
            if (latest.step_data.currentReflection) {
              setCurrentReflection(latest.step_data.currentReflection);
            }
            if (latest.step_data.widgetResponses) {
              setWidgetResponses(latest.step_data.widgetResponses);
            }
          }

          const completedStepIds = progress
            .filter((p: any) => p.completed)
            .map((p: any) => p.step_id);

          setSteps((prev) => {
            const next: Step[] = prev.map((step): Step =>
              completedStepIds.includes(step.id)
                ? { ...step, status: "completed" }
                : { ...step, status: "pending" }
            );

            const firstIncomplete = next.findIndex((step) => step.status !== "completed");
            if (firstIncomplete !== -1) {
              next[firstIncomplete] = { ...next[firstIncomplete], status: "current" };
            }

            return next;
          });
        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [labId]);

  React.useEffect(() => {
    if (!labId || isLoadingProgress || !currentStep) return;

    const timer = setTimeout(() => {
      void saveProgress(currentStep.id, false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [parameters, insights, currentReflection, widgetResponses, steps, labId, isLoadingProgress, currentStep?.id]);

  React.useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearTimeout(simulationTimerRef.current);
      }
    };
  }, []);

  const saveProgress = async (stepId: string, completed = false) => {
    if (!labId || !stepId) return;

    try {
      const { updateLabProgress } = await import("@/lib/api/labs");
      await updateLabProgress(labId, {
        step_id: stepId,
        step_data: {
          parameters,
          insights,
          currentReflection,
          widgetResponses,
        },
        completed,
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const markLabComplete = async () => {
    if (!labId) return;
    try {
      const { updateLab } = await import("@/lib/api/labs");
      await updateLab(labId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to mark lab as complete:", error);
    }
  };

  const goToStep = (id: string) => {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id === id) return { ...step, status: "current" as const };
        if (step.status === "completed") return step;
        return { ...step, status: "pending" as const };
      })
    );
  };

  const completeStep = async (id: string) => {
    await saveProgress(id, true);

    setSteps((prev) => {
      const index = prev.findIndex((step) => step.id === id);
      if (index === -1) return prev;

      const next = [...prev];
      next[index] = { ...next[index], status: "completed" as const };
      if (index + 1 < next.length) {
        next[index + 1] = { ...next[index + 1], status: "current" as const };
      }
      return next;
    });
  };

  const handleComplete = async () => {
    if (hasMarkedComplete) return;
    setHasMarkedComplete(true);
    await markLabComplete();
    moduleContext?.onComplete?.();
  };

  const calculateTrajectory = (): SimulationTrajectory => {
    const readValue = (predicate: (key: string, param: ExploreLabData["parameters"][number]) => boolean, fallbackIndex: number, fallbackValue: number) => {
      const matched = paramConfig.find((param) => {
        const key = normalizeParamKey(`${param.id} ${param.label} ${param.unit || ""}`);
        return predicate(key, param);
      });

      const id = matched?.id ?? paramConfig[fallbackIndex]?.id;
      const value = id ? parameters[id]?.[0] : undefined;
      return Number.isFinite(value) ? value : fallbackValue;
    };

    const isAngleParam = (key: string, param: ExploreLabData["parameters"][number]) =>
      key.includes("theta") || key.includes("angle") || normalizeParamKey(param.unit || "") === "deg";
    const isTimeParam = (key: string) =>
      key.includes("observationtime") || key.includes("duration") || key.endsWith("time") || key === "t";
    const isPositionParam = (key: string) =>
      key.includes("initialposition") || key.includes("position") || key === "x0" || key === "x";
    const isVelocityParam = (key: string) =>
      key.includes("initialvelocity") || key.includes("velocity") || key.includes("speed") || key === "v0" || key === "v";
    const isAccelerationParam = (key: string) =>
      key.includes("acceleration") || key.includes("gravity") || key === "a" || key === "g";

    const hasAngleParam = paramConfig.some((param) =>
      isAngleParam(normalizeParamKey(`${param.id} ${param.label} ${param.unit || ""}`), param)
    );

    if (hasAngleParam) {
      const gravity = Math.abs(readValue(isAccelerationParam, 0, 9.8)) || 9.8;
      const launchSpeed = readValue(isVelocityParam, 1, 20);
      const theta = (readValue(isAngleParam, 2, 45) * Math.PI) / 180;
      const totalTime = Math.max(Math.abs((2 * launchSpeed * Math.sin(theta)) / gravity), 0.01);
      const range = (launchSpeed * launchSpeed * Math.sin(2 * theta)) / gravity;
      const maxHeight = (launchSpeed * launchSpeed * Math.sin(theta) * Math.sin(theta)) / (2 * gravity);

      const safeRange = Number.isFinite(range) ? range : 0;
      const safeHeight = Number.isFinite(maxHeight) ? maxHeight : 0;
      const direction = safeRange < 0 ? -1 : 1;
      const travel = clamp(Math.abs(safeRange) * 20, MIN_TRAVEL_PX, MAX_TRAVEL_PX);
      const spread = Math.max(safeHeight, 0);
      const amplitude = spread > Number.EPSILON ? clamp(spread * 10, MIN_APEX_OFFSET_PX, MAX_APEX_OFFSET_PX) : 0;

      const points: TrajectoryPoint[] = Array.from({ length: PATH_SAMPLE_COUNT + 1 }, (_, idx) => {
        const progress = idx / PATH_SAMPLE_COUNT;
        const t = progress * totalTime;
        const x = clamp(START_X + direction * travel * progress, MIN_X, MAX_X);
        const yPhysics = launchSpeed * Math.sin(theta) * t - 0.5 * gravity * t * t;
        const normalizedHeight = spread > Number.EPSILON ? clamp(yPhysics / spread, 0, 1) : 0;
        const y = clamp(GROUND_Y - normalizedHeight * amplitude, 20, GROUND_Y);
        return { x, y };
      });

      return {
        maxHeight: safeHeight,
        range: Math.abs(safeRange),
        timeOfFlight: totalTime,
        points,
      };
    }

    const x0 = readValue(isPositionParam, 0, 0);
    const v0 = readValue(isVelocityParam, 1, 0);
    const acceleration = readValue(isAccelerationParam, 2, -9.8);
    const observationTime = Math.max(readValue(isTimeParam, 3, 5), 0);
    const effectiveTime = Math.max(observationTime, 0.01);
    const positionAt = (time: number) => x0 + v0 * time + 0.5 * acceleration * time * time;
    const positionAtT = positionAt(observationTime);
    const displacement = positionAtT - x0;

    const sampledPositions = Array.from({ length: PATH_SAMPLE_COUNT + 1 }, (_, idx) =>
      positionAt((idx / PATH_SAMPLE_COUNT) * effectiveTime)
    );
    sampledPositions.push(x0, positionAtT);
    const minPosition = Math.min(...sampledPositions);
    const maxPosition = Math.max(...sampledPositions);
    const spread = maxPosition - minPosition;
    const amplitude = spread > Number.EPSILON ? clamp(spread * 8, MIN_APEX_OFFSET_PX, MAX_APEX_OFFSET_PX) : 0;
    const direction = displacement === 0 ? (v0 >= 0 ? 1 : -1) : Math.sign(displacement);
    const travel =
      observationTime > 0
        ? clamp(Math.abs(displacement) * 12 + observationTime * 10, MIN_TRAVEL_PX, MAX_TRAVEL_PX)
        : 0;

    const points: TrajectoryPoint[] = Array.from({ length: PATH_SAMPLE_COUNT + 1 }, (_, idx) => {
      const progress = idx / PATH_SAMPLE_COUNT;
      const time = progress * effectiveTime;
      const position = positionAt(time);
      const normalizedHeight =
        spread > Number.EPSILON ? clamp((position - minPosition) / spread, 0, 1) : 0;
      const x = clamp(START_X + direction * travel * progress, MIN_X, MAX_X);
      const y = clamp(GROUND_Y - normalizedHeight * amplitude, 20, GROUND_Y);
      return { x, y };
    });

    return {
      maxHeight: maxPosition,
      range: Math.abs(displacement),
      timeOfFlight: observationTime,
      points,
    };
  };

  const handleSimulate = () => {
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
    }
    setSimulationRunId((prev) => prev + 1);
    setIsSimulating(true);
    simulationTimerRef.current = setTimeout(() => {
      setIsSimulating(false);
      simulationTimerRef.current = null;
    }, SIMULATION_DURATION_MS + 100);
  };

  const handleReset = () => {
    if (simulationTimerRef.current) {
      clearTimeout(simulationTimerRef.current);
      simulationTimerRef.current = null;
    }
    setIsSimulating(false);
    const resetParams = paramConfig.reduce((acc, param) => {
      acc[param.id] = [param.defaultValue];
      return acc;
    }, {} as Record<string, number[]>);
    setParameters(resetParams);
  };

  const addInsight = () => {
    if (!currentReflection.trim()) return;

    const newInsight: Insight = {
      id: Date.now().toString(),
      text: currentReflection,
      timestamp: new Date(),
    };

    setInsights((prev) => [...prev, newInsight]);
    setCurrentReflection("");
  };

  const handleSubmitStep = async () => {
    if (!currentStep) return;

    const hasLearnByDoing = currentStep.widgets.some((widget) =>
      isLearnByDoingWidgetType(widget.type)
    );

    const hasWidgetResponse = currentStep.widgets.some((_, idx) => {
      const key = `${currentStep.id}_widget_${idx}`;
      const value = widgetResponses[key];
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value?.selectedIds)) return value.selectedIds.length > 0;
      if (value && typeof value === "object") return Object.keys(value).length > 0;
      return false;
    });

    const hasStepResponse =
      hasWidgetResponse ||
      hasLearnByDoing ||
      currentReflection.trim().length > 0 ||
      insights.length > 0;

    if (!hasStepResponse) {
      return;
    }

    await completeStep(currentStep.id);
  };

  const renderWidgets = () => {
    if (!currentStep || !currentStep.widgets || currentStep.widgets.length === 0) {
      return null;
    }

    return (
      <div className="space-y-4">
        {currentStep.widgets.map((widget, idx) => {
          const widgetKey = `${currentStep.id}_widget_${idx}`;

          if (widget.type === "editor" || widget.type === "text-input") {
            const showWidgetMetadata = widget.config.showMetadata === true;
            return (
              <EditorWidget
                key={widgetKey}
                label={showWidgetMetadata ? widget.config.label || "Response" : undefined}
                description={showWidgetMetadata ? widget.config.description : undefined}
                placeholder={widget.config.placeholder || "Enter your response..."}
                initialValue={createEditorValue(widgetResponses[widgetKey] || "")}
                onChange={(value) =>
                  setWidgetResponses((prev) => ({
                    ...prev,
                    [widgetKey]: extractPlainText(value),
                  }))
                }
                height={widget.config.height || widget.config.minHeight || "240px"}
                variant={widget.config.variant || "ai"}
                editorPreset={widget.config.editorPreset || "reflection"}
                readOnly={widget.config.readOnly === true}
              />
            );
          }

          if (widget.type === "multiple-choice") {
            const response = widgetResponses[widgetKey] || { selectedIds: [], explanation: "" };
            return (
              <MultipleChoiceWidget
                key={widgetKey}
                label={widget.config.label || "Select an option"}
                description={widget.config.description}
                choices={widget.config.choices || []}
                selectedIds={response.selectedIds || []}
                onSelectionChange={(selectedIds) =>
                  setWidgetResponses((prev) => ({
                    ...prev,
                    [widgetKey]: { ...response, selectedIds },
                  }))
                }
                multiSelect={widget.config.multiSelect !== false}
                showExplanation={widget.config.showExplanation === true}
                explanation={response.explanation || ""}
                onExplanationChange={(value) =>
                  setWidgetResponses((prev) => ({
                    ...prev,
                    [widgetKey]: { ...response, explanation: value },
                  }))
                }
                explanationLabel={widget.config.explanationLabel}
                explanationPlaceholder={widget.config.explanationPlaceholder}
              />
            );
          }

          if (widget.type === "code-editor") {
            return (
              <CodeEditorWidget
                key={widgetKey}
                label={widget.config.label || "Code Workspace"}
                description={widget.config.description}
                language={widget.config.language || "javascript"}
                value={widgetResponses[widgetKey] || ""}
                onChange={(value) =>
                  setWidgetResponses((prev) => ({
                    ...prev,
                    [widgetKey]: value,
                  }))
                }
                readOnly={widget.config.readOnly === true}
                variant="card"
              />
            );
          }

          if (isLearnByDoingWidgetType(widget.type)) {
            return (
              <LabLearningWidget
                key={widgetKey}
                widgetType={widget.type}
                config={widget.config}
                widgetKey={widgetKey}
              />
            );
          }

          return null;
        })}
      </div>
    );
  };

  const trajectory = calculateTrajectory();
  const pathPoints = trajectory.points.length > 0 ? trajectory.points : [{ x: START_X, y: GROUND_Y }];
  const startPoint = pathPoints[0];
  const pathD = pathPoints.reduce(
    (acc, point, idx) => `${acc}${idx === 0 ? "M" : " L"} ${point.x} ${point.y}`,
    ""
  );
  const cxValues = pathPoints.map((point) => point.x.toFixed(2)).join(";");
  const cyValues = pathPoints.map((point) => point.y.toFixed(2)).join(";");
  const simulationDuration = `${SIMULATION_DURATION_SECONDS}s`;
  const allStepsCompleted = steps.length > 0 && steps.every((step) => step.status === "completed");

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        <LabStepPanel steps={steps} onStepClick={goToStep} />

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={24} minSize={18} maxSize={30} className="border-r bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-5 border-b">
              <h2 className="text-base font-semibold tracking-tight flex items-center gap-2">
                <Compass className="w-4 h-4 text-primary" />
                {labTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>

            <ScrollArea className="flex-1 h-0 overflow-x-hidden">
              <div className="p-5 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold">Parameters</h3>
                  </div>

                  {paramConfig.map((param) => (
                    <div key={param.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">
                          {param.label} {param.unit && `(${param.unit})`}
                        </label>
                        <span className="text-sm font-mono font-bold text-primary">
                          {parameters[param.id]?.[0]?.toFixed(param.step >= 1 ? 0 : 1)}
                          {param.unit === "deg" ? "deg" : ""}
                        </span>
                      </div>
                      <Slider
                        value={parameters[param.id] || [param.defaultValue]}
                        onValueChange={(value) =>
                          setParameters((prev) => ({
                            ...prev,
                            [param.id]: value,
                          }))
                        }
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        className="py-4"
                      />
                      {param.hint ? (
                        <p className="text-[10px] text-muted-foreground italic">{param.hint}</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button className="flex-1 gap-2" onClick={handleSimulate} disabled={isSimulating}>
                    <PlayCircle className="w-4 h-4" />
                    {isSimulating ? "Simulating..." : "Simulate"}
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={44} minSize={30}>
          <div className="flex flex-col h-full bg-gradient-to-br from-background to-muted/10">
            <div className="p-6 border-b bg-background/50 backdrop-blur-sm">
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold">
                Projectile Motion Sandbox
              </Badge>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-8">
              <div className="relative w-full max-w-2xl aspect-[16/9] border-2 border-dashed border-muted-foreground/20 rounded-2xl bg-background/50 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className={cn("transition-all duration-700", isSimulating && "scale-110 opacity-50")}>
                    <svg viewBox="0 0 400 200" className="w-full h-auto">
                      <line x1="0" y1="180" x2="400" y2="180" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                      <path
                        d={pathD}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                        className="text-primary"
                      />
                      <circle cx={startPoint.x} cy={startPoint.y} r="6" fill="currentColor" className="text-primary" />
                      {isSimulating ? (
                        <circle key={simulationRunId} cx={startPoint.x} cy={startPoint.y} r="8" fill="currentColor" className="text-amber-500">
                          <animate attributeName="cx" values={cxValues} dur={simulationDuration} repeatCount="1" fill="freeze" />
                          <animate attributeName="cy" values={cyValues} dur={simulationDuration} repeatCount="1" fill="freeze" />
                          <animate attributeName="r" values="8;10;8" dur={simulationDuration} repeatCount="1" />
                        </circle>
                      ) : null}
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                <Card className="border-none bg-background/80 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Max Height</p>
                    <p className="text-2xl font-bold text-primary">{trajectory.maxHeight.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">meters</p>
                  </CardContent>
                </Card>
                <Card className="border-none bg-background/80 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Range</p>
                    <p className="text-2xl font-bold text-primary">{trajectory.range.toFixed(1)}</p>
                    <p className="text-[10px] text-muted-foreground">meters</p>
                  </CardContent>
                </Card>
                <Card className="border-none bg-background/80 backdrop-blur-sm shadow-sm">
                  <CardContent className="p-4 text-center space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Time</p>
                    <p className="text-2xl font-bold text-primary">{trajectory.timeOfFlight.toFixed(2)}</p>
                    <p className="text-[10px] text-muted-foreground">seconds</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={28} minSize={22} maxSize={40} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-background">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Exploration Workspace
              </h3>
            </div>

            <ScrollArea className="flex-1 h-0 overflow-x-hidden">
              <div className="min-w-0 p-5 space-y-6">
                {currentStep ? (
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {currentStepIndex + 1}. {currentStep.title}
                    </label>

                    {currentStep.instruction ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{currentStep.instruction}</Markdown>
                      </div>
                    ) : null}

                    {currentStep.prompt ? (
                      <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <Markdown className="text-[10px] text-blue-700 leading-relaxed font-medium">
                          {currentStep.prompt}
                        </Markdown>
                      </div>
                    ) : null}

                    {currentStep.keyQuestions && currentStep.keyQuestions.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Key Questions</h4>
                        <ul className="space-y-1.5 list-disc list-inside">
                          {currentStep.keyQuestions.map((q: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{q}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {renderWidgets()}
                  </div>
                ) : null}

                <Separator className="opacity-50" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-semibold">Guiding Questions</h4>
                  </div>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                    {guidingQuestions.map((question, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2.5 py-2"
                      >
                        <Markdown className="text-[11px] leading-4 text-muted-foreground [&_*]:m-0 [&_p]:m-0 [&_p]:leading-4 line-clamp-2">
                          {question}
                        </Markdown>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <h4 className="text-sm font-semibold">Record Insight</h4>
                  </div>
                  <Textarea
                    placeholder="What did you discover? What patterns emerged?"
                    className="min-h-[100px] text-sm"
                    value={currentReflection}
                    onChange={(e) => setCurrentReflection(e.target.value)}
                  />
                  <Button onClick={addInsight} className="w-full" variant="secondary" disabled={!currentReflection.trim()}>
                    Save Insight
                  </Button>
                </div>

                {insights.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Your Insights ({insights.length})
                    </h4>
                    <div className="space-y-3">
                      {insights.map((insight) => (
                        <Card key={insight.id} className="border-none bg-primary/5 shadow-none">
                          <CardContent className="p-3 space-y-2">
                            <Markdown className="text-xs leading-relaxed">{insight.text}</Markdown>
                            <p className="text-[9px] text-muted-foreground">
                              {new Date(insight.timestamp).toLocaleTimeString()}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </ScrollArea>

            <div className="p-4 border-t bg-background">
              {allStepsCompleted ? (
                <Button className="w-full shadow-sm" variant="default" onClick={handleComplete} disabled={hasMarkedComplete}>
                  Complete Exploration
                </Button>
              ) : (
                <Button className="w-full shadow-sm" variant="default" onClick={handleSubmitStep}>
                  Submit Step
                </Button>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
