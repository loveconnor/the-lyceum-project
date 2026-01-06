"use client";

import React, { useState, useEffect } from "react";
import { ReviseLabData } from "@/types/lab-templates";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LabStepPanel } from "@/components/labs/lab-step-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, 
  FileEdit,
  Eye,
  Lightbulb,
  Target,
  Diff,
  Network,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Brain
} from "lucide-react";
import { cn, extractJSON } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { ReactFlowWidget } from "@/components/widgets/react-flow-widget";
import { EditorWidget, createEditorValue, extractPlainText } from "@/components/widgets";
import { MultipleChoiceWidget } from "@/components/widgets/multiple-choice-widget";
import { useLabAI } from "@/hooks/use-lab-ai";
import { toast } from "sonner";

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
  instruction?: string;
  keyQuestions?: string[];
  prompt?: string;
  widgets?: Array<{
    type: "text-input" | "multiple-choice";
    config: any;
  }>;
}

const DEFAULT_STEPS: Step[] = [
  { id: "purpose", title: "Define purpose & audience", status: "current", instruction: "Define your writing purpose and target audience" },
  { id: "draft", title: "Draft", status: "pending", instruction: "Write or revise your draft" },
  { id: "structure", title: "Revise structure", status: "pending", instruction: "Improve the overall structure and organization" },
  { id: "clarity", title: "Improve clarity/style", status: "pending", instruction: "Enhance clarity, style, and readability" },
  { id: "reflect", title: "Reflect", status: "pending", instruction: "Reflect on your revisions and improvements" },
];

interface ReviseTemplateProps {
  data: ReviseLabData;
  labId?: string;
  moduleContext?: {
    pathId: string;
    moduleId: string;
    onComplete?: () => void;
  };
}

export default function ReviseTemplate({ data, labId, moduleContext }: ReviseTemplateProps) {
  const { labTitle, description, initialDraft, targetAudience, purpose: initialPurpose, rubricCriteria, improvementAreas, visuals } = data;
  
  // Initialize steps - use AI-generated steps if available, otherwise use defaults
  const aiSteps = (data as any).steps;
  const initialSteps: Step[] = aiSteps && aiSteps.length > 0
    ? aiSteps.map((step: any, idx: number) => ({
        id: step.id || `step-${idx}`,
        // Revise template steps often have "focus" instead of "title"
        title: step.title || step.focus || `Step ${idx + 1}`,
        status: idx === 0 ? "current" as const : "pending" as const,
        // If no explicit instruction, fall back to focus (e.g., "Revise thesis statement")
        instruction: step.instruction || step.focus || step.prompt,
        keyQuestions: step.keyQuestions,
        prompt: step.prompt,
        widgets: step.widgets
      }))
    : DEFAULT_STEPS;

  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [draft, setDraft] = useState(initialDraft || "");
  const [originalDraft] = useState(initialDraft || "");
  const [viewMode, setViewMode] = useState<"edit" | "diff" | "visuals">("edit");
  const [visualsViewed, setVisualsViewed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dynamic responses for each step's widgets
  const [widgetResponses, setWidgetResponses] = useState<Record<string, any>>({});
  
  // AI feedback state
  const [stepFeedback, setStepFeedback] = useState<Record<string, { text: string; approved: boolean; correctIds?: string[]; incorrectIds?: string[] }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getAssistance, loading: aiLoading } = labId ? useLabAI(labId) : { getAssistance: null, loading: false };
  
  const currentStep = steps.find(s => s.status === "current");
  const currentStepIndex = steps.findIndex(s => s.status === "current");

  // Load progress when component mounts
  useEffect(() => {
    if (!labId) {
      setIsLoading(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const { fetchLabProgress } = await import("@/lib/api/labs");
        const progress = await fetchLabProgress(labId);
        
        if (progress && progress.length > 0) {
          // Restore widget responses from saved progress
          const savedResponses: any = {};
          progress.forEach((p: any) => {
            if (p.step_data) {
              Object.assign(savedResponses, p.step_data);
            }
          });
          if (Object.keys(savedResponses).length > 0) {
            setWidgetResponses(prev => ({ ...prev, ...savedResponses }));
            if (savedResponses.draft) setDraft(savedResponses.draft);
          }

          // Restore step completion status
          const completedStepIds = progress.filter((p: any) => p.completed).map((p: any) => p.step_id);
          if (completedStepIds.length > 0) {
            setSteps(prev => {
              const newSteps = prev.map(step => {
                if (completedStepIds.includes(step.id)) {
                  return { ...step, status: "completed" as const };
                }
                return step;
              });
              
              // Set first non-completed step as current
              const firstIncomplete = newSteps.findIndex(s => s.status !== "completed");
              if (firstIncomplete !== -1) {
                newSteps[firstIncomplete] = { ...newSteps[firstIncomplete], status: "current" as const };
              }
              
              return newSteps;
            });
          }
        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [labId]);

  // Auto-save progress
  useEffect(() => {
    if (!labId || isLoading) return;
    
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep) return;

    const timer = setTimeout(() => {
      saveProgress(currentStep.id, false);
    }, 2000); // Auto-save after 2 seconds of no typing

    return () => clearTimeout(timer);
  }, [widgetResponses, draft, labId, isLoading]);

  const saveProgress = async (stepId: string, completed: boolean = false) => {
    if (!labId || !stepId) return;
    
    try {
      const { updateLabProgress } = await import("@/lib/api/labs");
      await updateLabProgress(labId, {
        step_id: stepId,
        step_data: { ...widgetResponses, draft },
        completed
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const goToStep = (id: string) => {
    setSteps(prev => {
      const newSteps = prev.map((step) => {
        if (step.id === id) {
          return { ...step, status: "current" as const };
        }
        // Keep completed steps as completed, non-completed as pending
        if (step.status === "completed") {
          return step;
        }
        return { ...step, status: "pending" as const };
      });
      return newSteps;
    });
    setStepFeedback({});
  };

  const completeStep = async (id: string) => {
    await saveProgress(id, true);
    
    setSteps(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;
      
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], status: "completed" };
      
      if (index + 1 < newSteps.length) {
        newSteps[index + 1] = { ...newSteps[index + 1], status: "current" };
      }
      
      return newSteps;
    });
  };

  const handleSubmit = async () => {
    if (!currentStep || !getAssistance) return;

    const stepKey = currentStep.id;
    const stepResponses = widgetResponses[stepKey] || {};
    
    // Check if there's something to submit
    const hasContent = draft.trim() || Object.keys(stepResponses).length > 0;
    if (!hasContent) {
      toast.error("Please provide content before submitting");
      return;
    }

    setIsSubmitting(true);
    setStepFeedback({});

    try {
      // Build prompt based on step widgets and responses
      let prompt = `You are a writing instructor evaluating a student's work for the "${currentStep.title}" step.

Initial Draft:
${originalDraft || "(No initial draft provided)"}

Current Draft:
${draft || "(No current draft provided)"}

Step Instruction: ${currentStep.instruction || currentStep.title}
`;

      // Include widget responses in the prompt
      if (currentStep.widgets && currentStep.widgets.length > 0) {
        prompt += "\n\nStudent's responses:\n";
        currentStep.widgets.forEach((widget: any, idx: number) => {
          const widgetKey = `${stepKey}_widget_${idx}`;
          const response = widgetResponses[widgetKey];
          
          if (widget.type === "text-input") {
            prompt += `\n${widget.config.label}: ${response || "(No response)"}\n`;
          } else if (widget.type === "multiple-choice") {
            const selectedChoices = response?.selectedIds || [];
            const choices = widget.config.choices || [];
            const selectedNames = selectedChoices.map((id: string) => 
              choices.find((c: any) => c.id === id)?.name || id
            );
            prompt += `\n${widget.config.label}: ${selectedNames.join(", ") || "(No selection)"}\n`;
            if (response?.explanation) {
              prompt += `Explanation: ${response.explanation}\n`;
            }
          }
        });
      }

      prompt += `\n\nEvaluate if their work demonstrates good revision practices and understanding. Respond ONLY in this JSON format:
{
  "approved": true/false,
  "feedback": "Brief constructive feedback (2-3 sentences)"
}

Approve if they show reasonable effort and understanding. If not approved, explain what needs improvement.`;

      const response = await getAssistance(prompt, { step: currentStep.id, draft, originalDraft });
      
      try {
        const parsed = extractJSON<{ approved: boolean; feedback: string }>(response);
        setStepFeedback({ [stepKey]: { text: parsed.feedback, approved: parsed.approved } });
        
        if (parsed.approved) {
          setTimeout(async () => {
            await completeStep(currentStep.id);
            setStepFeedback({});
          }, 2000);
        }
      } catch {
        toast.error("Failed to parse AI response");
      }
    } catch (error) {
      toast.error("Failed to get feedback: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDiff = () => {
    const originalLines = (originalDraft || "").split('\n');
    const currentLines = (draft || "").split('\n');
    
    return (
      <div className="grid grid-cols-2 gap-4 font-mono text-xs">
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2">Original</div>
          {originalLines.map((line, i) => (
            <div key={i} className={cn(
              "p-2 rounded",
              currentLines[i] !== line && "bg-red-500/10 text-red-700"
            )}>
              {line || <span className="text-muted-foreground/20">(empty line)</span>}
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-2">Current</div>
          {currentLines.map((line, i) => (
            <div key={i} className={cn(
              "p-2 rounded",
              originalLines[i] !== line && "bg-emerald-500/10 text-emerald-700"
            )}>
              {line || <span className="text-muted-foreground/20">(empty line)</span>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render widgets for current step
  const renderWidgets = () => {
    if (!currentStep || !currentStep.widgets || currentStep.widgets.length === 0) {
      return null;
    }

    const stepKey = currentStep.id;
    const feedback = stepFeedback[stepKey];

    return (
      <div className="space-y-6">
        {currentStep.widgets.map((widget: any, idx: number) => {
          const widgetKey = `${stepKey}_widget_${idx}`;
          
          if (widget.type === "editor") {
            return (
              <EditorWidget
                key={widgetKey}
                label={widget.config.label || "Response"}
                description={widget.config.description}
                placeholder={widget.config.placeholder || "Enter your response..."}
                initialValue={createEditorValue(widgetResponses[widgetKey] || "")}
                onChange={(value) => setWidgetResponses({...widgetResponses, [widgetKey]: extractPlainText(value)})}
                height={widget.config.height || widget.config.minHeight || "200px"}
                variant={widget.config.variant || "default"}
                readOnly={widget.config.readOnly === true}
              />
            );
          } else if (widget.type === "multiple-choice") {
            const response = widgetResponses[widgetKey] || { selectedIds: [], explanation: "" };
            return (
              <MultipleChoiceWidget
                key={widgetKey}
                label={widget.config.label || "Select an option"}
                description={widget.config.description}
                choices={widget.config.choices || []}
                selectedIds={response.selectedIds || []}
                onSelectionChange={(selectedIds) => 
                  setWidgetResponses({
                    ...widgetResponses, 
                    [widgetKey]: { ...response, selectedIds }
                  })
                }
                multiSelect={widget.config.multiSelect !== false}
                showExplanation={widget.config.showExplanation !== false}
                explanation={response.explanation || ""}
                onExplanationChange={(explanation) => 
                  setWidgetResponses({
                    ...widgetResponses, 
                    [widgetKey]: { ...response, explanation }
                  })
                }
                correctIds={feedback?.correctIds || []}
                incorrectIds={feedback?.incorrectIds || []}
                disabled={feedback?.approved || false}
              />
            );
          }
          
          return null;
        })}
      </div>
    );
  };

  const currentFeedback = currentStep ? stepFeedback[currentStep.id] : null;

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <LabStepPanel
          steps={steps}
          onStepClick={goToStep}
        />

        <ResizableHandle withHandle />

        {/* Center Panel: Writing Editor */}
        <ResizablePanel defaultSize={50} minSize={35}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-background rounded border text-xs font-medium">
                  <FileEdit className="w-3.5 h-3.5 text-blue-500" />
                  essay-draft.txt
                </div>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold py-0 h-5">
                  {(draft || "").split(/\s+/).filter(Boolean).length} words
                </Badge>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "edit" | "diff" | "visuals")} className="h-8">
                <TabsList className="h-8 p-1 bg-background border">
                  <TabsTrigger value="edit" className="text-xs h-6 gap-1.5">
                    <FileEdit className="w-3 h-3" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="diff" className="text-xs h-6 gap-1.5">
                    <Diff className="w-3 h-3" />
                    Compare
                  </TabsTrigger>
                  {visuals && visuals.length > 0 && (
                    <TabsTrigger value="visuals" className="text-xs h-6 gap-1.5">
                      <Network className="w-3 h-3" />
                      Visuals
                      {visualsViewed && (
                        <CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 ml-1" />
                      )}
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
            </div>
            
            <ScrollArea className="flex-1 h-0">
              <div className="p-8 max-w-4xl mx-auto">
                {viewMode === "edit" ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Draft</label>
                        <div className="text-[10px] text-muted-foreground">
                          {(draft || "").split('\n\n').filter(p => p.trim()).length} paragraphs
                        </div>
                      </div>
                      <Textarea 
                        placeholder={initialDraft || "Start writing your draft here..."}
                        className="min-h-[400px] text-base leading-relaxed font-serif resize-none border-none focus-visible:ring-0 px-0"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                    </div>
                  </div>
                ) : viewMode === "diff" ? (
                  <div className="py-4">
                    {renderDiff()}
                  </div>
                ) : (
                  <div className="py-4">
                    {visuals && visuals.length > 0 && (
                      <ReactFlowWidget 
                        visuals={visuals}
                        height="600px"
                        showNavigation={true}
                        showSidebar={false}
                        variant="full"
                        onViewComplete={() => setVisualsViewed(true)}
                      />
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Instructions & Widgets */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-background">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Revision Workspace
              </h3>
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="p-5 space-y-6">
                {currentStep && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {currentStepIndex + 1}. {currentStep.title}
                    </label>
                    {currentStep.instruction && (
                      <Markdown className="text-sm text-muted-foreground">
                        {currentStep.instruction}
                      </Markdown>
                    )}
                    
                    {currentStep.keyQuestions && currentStep.keyQuestions.length > 0 && (
                      <Card className="border-none bg-primary/5 shadow-none">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-xs font-medium">Key Questions:</p>
                          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                            {currentStep.keyQuestions.map((q: string, i: number) => (
                              <li key={i}><Markdown className="inline">{q}</Markdown></li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    
                    {currentStep.prompt && (
                      <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Eye className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <Markdown className="text-[10px] text-blue-700 leading-relaxed font-medium">
                          {currentStep.prompt}
                        </Markdown>
                      </div>
                    )}

                    <Separator className="opacity-50" />

                    {renderWidgets()}
                  </div>
                )}

                {/* Legacy support for old rubric-based data */}
                {rubricCriteria && rubricCriteria.length > 0 && !currentStep?.widgets && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                      </div>
                      <h3 className="text-sm font-semibold">Revision Criteria</h3>
                    </div>
                    
                    {/* Rubric criteria details */}
                    <div className="grid gap-2">
                      {rubricCriteria.map((criterion: any, i: number) => (
                        <Card key={criterion.id || i} className="border-none bg-background shadow-sm">
                          <CardContent className="p-3 space-y-1">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span>{criterion.name || "Criterion"}</span>
                              {criterion.weight && (
                                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                  {String(criterion.weight)}
                                </Badge>
                              )}
                            </div>
                            {criterion.description && (
                              <p className="text-xs text-muted-foreground">{criterion.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Improvement areas (area + suggestions) */}
                    {improvementAreas && improvementAreas.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Improvement Areas</h4>
                        {improvementAreas.map((area: any, i: number) => (
                          <Card key={area.area || i} className="border-none bg-background shadow-sm">
                            <CardContent className="p-3 space-y-1">
                              <div className="text-xs font-semibold">{area.area || "Focus Area"}</div>
                              {area.suggestions && Array.isArray(area.suggestions) ? (
                                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                                  {area.suggestions.map((s: string, idx: number) => (
                                    <li key={idx}><Markdown className="inline">{s}</Markdown></li>
                                  ))}
                                </ul>
                              ) : (
                                area && <Markdown className="text-xs text-muted-foreground">{String(area)}</Markdown>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {currentFeedback && (
              <div className={cn(
                "mx-4 mb-4 p-4 rounded-lg border-2",
                currentFeedback.approved 
                  ? "bg-green-50 border-green-500 dark:bg-green-950" 
                  : "bg-amber-50 border-amber-500 dark:bg-amber-950"
              )}>
                <div className="flex items-start gap-3">
                  {currentFeedback.approved ? (
                    <ThumbsUp className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  ) : (
                    <ThumbsDown className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-semibold mb-1",
                      currentFeedback.approved ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
                    )}>
                      {currentFeedback.approved ? "Great work!" : "Needs improvement"}
                    </p>
                    <p className="text-sm text-foreground/80">{currentFeedback.text}</p>
                    {currentFeedback.approved && (
                      <p className="text-xs text-muted-foreground mt-2 italic">Moving to next step...</p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-4 border-t bg-background">
              <Button 
                className="w-full shadow-sm" 
                variant="default"
                onClick={handleSubmit}
                disabled={steps.every(s => s.status === "completed") || isSubmitting || aiLoading}
              >
                {isSubmitting || aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Reviewing...
                  </>
                ) : steps.every(s => s.status === "completed") ? (
                  "Lab Complete"
                ) : (
                  "Submit for Feedback"
                )}
              </Button>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
