"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState } from "react";
import { DeriveLabData } from "@/types/lab-templates";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ChevronRight,
  Check,
  Info,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { EditorWidget, createEditorValue, extractPlainText } from "@/components/widgets";
import { MultipleChoiceWidget } from "@/components/widgets/multiple-choice-widget";
import { DerivationStepsWidget, DerivationStep } from "@/components/widgets/derivation-steps-widget";

// Helper function to convert literal \n to actual newlines
const convertNewlines = (text: string | undefined) => {
  if (!text) return "";
  return text.replace(/\\n/g, "\n");
};

// Helper to extract JSON from AI responses
function extractJSON<T>(text: string): T {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  return JSON.parse(cleaned) as T;
}

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
  widgets?: Array<{
    type: "editor" | "multiple-choice" | "derivation-steps";
    config: any;
  }>;
}

interface DeriveTemplateProps {
  data: DeriveLabData;
  labId?: string;
  moduleContext?: {
    pathId: string;
    moduleId: string;
    onComplete?: () => void;
  };
}

export default function DeriveTemplate({ data, labId, moduleContext }: DeriveTemplateProps) {
  const { labTitle, description, problemStatement, availableRules, initialStep, steps: dataSteps, conceptCheck } = data;
  
  // Initialize steps from AI-generated data or fallback to defaults
  const initialSteps: Step[] = dataSteps && dataSteps.length > 0 
    ? dataSteps.map((step, idx) => ({
        id: step.id,
        title: step.title,
        status: idx === 0 ? "current" as const : "pending" as const,
        widgets: step.widgets
      }))
    : [
        { id: "restate", title: "Restate problem", status: "current" as const },
        { id: "method", title: "Choose method", status: "pending" as const },
        { id: "derive", title: "Derive solution", status: "pending" as const },
        { id: "verify", title: "Verify", status: "pending" as const },
        { id: "generalize", title: "Generalize", status: "pending" as const },
      ];
  
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [selectedRule, setSelectedRule] = useState<typeof availableRules[0] | null>(null);
  const [stepResponses, setStepResponses] = useState<Record<string, any>>({});
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [stepFeedback, setStepFeedback] = useState<Record<string, { text: string; approved: boolean; correctIds?: string[]; incorrectIds?: string[] }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessedSteps, setAccessedSteps] = useState<Set<string>>(new Set([initialSteps[0]?.id]));
  const [showLabOverview, setShowLabOverview] = useState(false);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);
  
  const currentStepRef = React.useRef<HTMLButtonElement>(null);

  const currentStep = steps.find(s => s.status === "current");

  const derivationSteps = React.useMemo(() => {
    if (!currentStep) return [];
    return stepResponses[`${currentStep.id}-derivation`] || [
      { 
        id: "1", 
        expression: (currentStep.id === initialSteps[0].id ? initialStep?.expression : "") || "", 
        rule: "", 
        justification: (currentStep.id === initialSteps[0].id ? initialStep?.justification : "") || (currentStep.id === initialSteps[0].id ? "Given" : "") 
      }
    ];
  }, [currentStep, stepResponses, initialStep, initialSteps]);

  // Load saved progress on mount
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
          // Sort by timestamp ascending so later entries overwrite earlier ones when merged
          const sortedProgress = [...progress].sort((a, b) => {
            const timeA = new Date(a.updated_at || a.created_at).getTime();
            const timeB = new Date(b.updated_at || b.created_at).getTime();
            return timeA - timeB;
          });

          // Merge all step_data so each step retains its own answers
          const mergedResponses: Record<string, any> = {};
          const mergedFeedback: Record<string, any> = {};
          sortedProgress.forEach((entry: any) => {
            const data = entry.step_data || {};
            const responses = data.stepResponses || {};

            // Copy stepResponses
            Object.assign(mergedResponses, responses);

            // Copy feedback
            if (data.feedback) {
              mergedFeedback[entry.step_id] = data.feedback;
            }

            // Migrate old derivationSteps field (pre-per-step storage)
            if (data.derivationSteps) {
              mergedResponses[`${entry.step_id}-derivation`] = data.derivationSteps;
            }
          });

          setStepResponses(mergedResponses);
          setStepFeedback(mergedFeedback);

          // Restore step completion status
          const completedStepIds = progress.filter((p: any) => p.completed).map((p: any) => p.step_id);
          
          setSteps(prev => {
            const newSteps = prev.map(step => {
              if (completedStepIds.includes(step.id)) {
                return { ...step, status: "completed" as const };
              }
              return step;
            });
            
            // Always go to the first incomplete step (right after all completed ones)
            const firstIncomplete = newSteps.findIndex(s => s.status !== "completed");
            if (firstIncomplete !== -1) {
              newSteps[firstIncomplete] = { ...newSteps[firstIncomplete], status: "current" as const };
            }
            
            return newSteps;
          });        } else {
          // No progress - show lab overview on first visit
          setTimeout(() => setShowLabOverview(true), 300);        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsLoadingProgress(false);
      }
    };

    loadProgress();
  }, [labId]);

  // Auto-save data when it changes (debounced)
  React.useEffect(() => {
    if (!labId || isLoadingProgress) return;
    
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep) return;

    const timer = setTimeout(() => {
      saveProgress(currentStep.id, false);
    }, 2000); // Auto-save after 2 seconds of no typing

    return () => clearTimeout(timer);
  }, [stepResponses, labId, isLoadingProgress]);

  const saveProgress = async (stepId: string, completed: boolean = false) => {
    if (!labId || !stepId) return;
    
    try {
      const { updateLabProgress } = await import("@/lib/api/labs");
      await updateLabProgress(labId, {
        step_id: stepId,
        step_data: {
          stepResponses,
          feedback: stepFeedback[stepId]
        },
        completed
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
        completed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to mark lab as complete:", error);
    }
  };

  React.useEffect(() => {
    if (!labId || isLoadingProgress) return;
    const allCompleted = steps.length > 0 && steps.every((step) => step.status === "completed");
    if (allCompleted && !hasMarkedComplete) {
      setHasMarkedComplete(true);
      markLabComplete();
    }
  }, [steps, labId, isLoadingProgress, hasMarkedComplete]);

  // Helper function to auto-wrap math notation for preview
  const previewWithMath = (text: string): string => {
    // If already has $ signs, return as is
    if (text.includes('$')) return text;
    
    // If it contains LaTeX commands or complex operators and is relatively short,
    // treat the whole thing as a single mathematical expression.
    const words = text.trim().split(/\s+/);
    const hasComplexMath = /\\|[\^_{}]/.test(text);
    if (hasComplexMath && words.length <= 5) {
      return `$${text.trim()}$`;
    }
    
    // Split by periods and newlines to handle sentences separately
    const sentences = text.split(/([.!?\n]+)/);
    
    return sentences.map(sentence => {
      // Check if this sentence/fragment contains math patterns
      const hasMathOperators = /[\^*/+\-=\\__{}]|sin|cos|tan|log|ln|sqrt|exp|lim|int|sum|prod|alpha|beta|gamma|delta|theta|pi/i.test(sentence);
      
      if (hasMathOperators) {
        // Wrap entire mathematical expressions in inline math
        return sentence
          // Wrap expressions with operators or LaTeX commands
          .replace(/((?:[a-zA-Z0-9()\s\^*/+\-=\\__{}]+)?(?:sin|cos|tan|log|ln|sqrt|exp|int|sum|prod|lim|frac|partial|alpha|beta|gamma|delta|theta|pi)[a-zA-Z0-9()\s\^*/+\-=\\__{}]*)/gi, (match) => {
            // Don't wrap if it's just plain words without operators or backslashes
            if (/[\^*/+\-=\\__{}]/.test(match) || /sin|cos|tan|log|ln|sqrt|exp|int|sum|prod|lim|frac|partial|\\/.test(match)) {
              // If it's just a word like "integral" or "sum" without operators, don't wrap
              if (/^[a-zA-Z]+$/.test(match.trim()) && !/sin|cos|tan|log|ln|sqrt|exp/.test(match.trim())) {
                return match;
              }
              return `$${match.trim()}$`;
            }
            return match;
          })
          // Catch remaining patterns: standalone x^2, e^x, etc.
          .replace(/\b([a-zA-Z]+\^[a-zA-Z0-9]+)\b/g, '$$$1$$')
          .replace(/\b([a-zA-Z]+_[a-zA-Z0-9]+)\b/g, '$$$1$$') // subscripts
          // Clean up double wrapping
          .replace(/\$\$+/g, '$');
      }
      
      return sentence;
    }).join('');
  };

  const addStep = () => {
    if (!currentStep) return;
    const newId = (derivationSteps.length + 1).toString();
    const newSteps = [...derivationSteps, { id: newId, expression: "", rule: "", justification: "" }];
    setStepResponses({ ...stepResponses, [`${currentStep.id}-derivation`]: newSteps });
  };
  
  const applyRule = (stepId: string, ruleId: string) => {
    const rule = availableRules.find(r => r.id === ruleId);
    if (rule) {
      updateStep(stepId, "rule", rule.name);
      if (!derivationSteps.find(s => s.id === stepId)?.justification) {
        updateStep(stepId, "justification", `Apply ${rule.name}`);
      }
    }
  };

  const removeStep = (id: string) => {
    if (!currentStep) return;
    if (derivationSteps.length > 1) {
      const newSteps = derivationSteps.filter(s => s.id !== id);
      setStepResponses({ ...stepResponses, [`${currentStep.id}-derivation`]: newSteps });
    }
  };

  const updateStep = (id: string, field: keyof DerivationStep, value: string) => {
    if (!currentStep) return;
    const newSteps = derivationSteps.map(s => s.id === id ? { ...s, [field]: value } : s);
    setStepResponses({ ...stepResponses, [`${currentStep.id}-derivation`]: newSteps });
  };

  const goToStep = (id: string) => {
    const stepIndex = steps.findIndex(s => s.id === id);
    if (stepIndex === -1) return;
    
    const step = steps[stepIndex];
    const canNavigate = step.status === "completed" || step.status === "current" || accessedSteps.has(id);
    if (!canNavigate) return;
    
    setSteps(prev => prev.map((s, idx) => {
      if (idx === stepIndex) {
        return { ...s, status: "current" as const };
      }
      if (s.status === "current") {
        return { ...s, status: "pending" as const };
      }
      return s;
    }));
    
    // Clear feedback when navigating
    // setFeedback(null);
  };

  const completeStep = (id: string) => {
    // Save progress before completing
    saveProgress(id, true);
    
    setSteps(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (index === -1) return prev;
      
      const newSteps = [...prev];
      newSteps[index] = { ...newSteps[index], status: "completed" };
      
      if (index + 1 < newSteps.length) {
        newSteps[index + 1] = { ...newSteps[index + 1], status: "current" };
        setAccessedSteps(prev => new Set([...prev, newSteps[index + 1].id]));
      }
      
      return newSteps;
    });
    
    // Clear feedback when moving to next step
    // setFeedback(null); // No longer needed with per-step feedback
  };

  const handleSubmit = async () => {
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep || !labId) return;

    const userResponse = stepResponses[currentStep.id];
    const choiceResponse = stepResponses[`${currentStep.id}-choice`];
    const explainResponse = stepResponses[`${currentStep.id}-explain`];
    
    // Check if user has provided any response
    const hasResponse = userResponse?.trim() || choiceResponse || explainResponse?.trim() || derivationSteps.some(s => s.expression);
    
    if (!hasResponse) {
      const { toast } = await import("sonner");
      toast.error("Please provide an answer before submitting");
      return;
    }

    setIsSubmitting(true);
    setStepFeedback(prev => ({ ...prev, [currentStep.id]: { ...prev[currentStep.id], text: '', approved: false } }));

    try {
      const { getLabAIAssistance } = await import("@/lib/api/labs");
      
    // Build context about what the student did
    let studentWork = '';
    if (userResponse) studentWork += `Text response: ${userResponse}\n`;
    
    if (choiceResponse) {
      const selectedIds = choiceResponse.split(',').filter(Boolean);
      const selectedChoiceTexts = currentStep.widgets
        ?.filter(w => w.type === 'multiple-choice')
        .flatMap(w => w.config.choices || [])
        .filter(c => selectedIds.includes(c.id))
        .map(c => c.name) || [];
      
      if (selectedChoiceTexts.length > 0) {
        studentWork += `Selected options: ${selectedChoiceTexts.join(', ')}\n`;
      } else {
        studentWork += `Selected options: ${choiceResponse}\n`;
      }
    }
    
    if (explainResponse) studentWork += `Explanation: ${explainResponse}\n`;
    if (derivationSteps.length > 0 && derivationSteps.some(s => s.expression)) {
      studentWork += `Derivation steps:\n${derivationSteps.map(s => `- ${s.expression} (${s.rule || 'no rule'}: ${s.justification || 'no justification'})`).join('\n')}`;
    }

    const hasTextInput = currentStep.widgets?.some(w => w.type === 'editor' || (w.type === 'multiple-choice' && w.config.showExplanation));
    
    const prompt = `You are a mathematics instructor reviewing a student's work on: ${problemStatement}

Step: ${currentStep.title}

Student's work:
${studentWork}

Evaluate if their response demonstrates understanding and mathematical correctness.
IMPORTANT: If the student provided a multiple-choice answer, evaluate if it is correct. Do NOT ask for a written explanation if they have already answered the question correctly via multiple choice.
${!hasTextInput ? "IMPORTANT: There is NO text box for the student to provide a written explanation. Do NOT ask them to explain their answer or provide more details. Only evaluate the multiple-choice selection or derivation provided." : ""}

Respond ONLY in this JSON format:
{
  "approved": true/false,
  "feedback": "Brief constructive feedback (2-3 sentences). If they were wrong, explain why and what the correct answer is.",
  "correctIds": ["id1", "id2"], // If multiple choice, the IDs of the correct options
  "incorrectIds": ["id3"] // If multiple choice, the IDs of the incorrect options the student selected
}

Approve if they show reasonable understanding and correct approach. If not approved, explain what's missing or incorrect.`;

      const result = await getLabAIAssistance(labId, prompt, {});
      
      try {
        const parsed = extractJSON<{ approved: boolean; feedback: string; correctIds?: string[]; incorrectIds?: string[] }>(result.assistance);
        setStepFeedback(prev => ({
          ...prev,
          [currentStep.id]: {
            text: parsed.feedback,
            approved: parsed.approved,
            correctIds: parsed.correctIds,
            incorrectIds: parsed.incorrectIds
          }
        }));
        
        if (parsed.approved) {
          setTimeout(() => {
            completeStep(currentStep.id);
          }, 2000);
        }
      } catch {
        const { toast } = await import("sonner");
        toast.error("Failed to parse AI response");
      }
    } catch (error) {
      const { toast } = await import("sonner");
      toast.error("Failed to get feedback: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <LabStepPanel
          steps={steps}
          accessedSteps={accessedSteps}
          currentStepRef={currentStepRef}
          onStepClick={goToStep}
          labOverview={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLabOverview(true)}
              className="w-full justify-start gap-2 text-xs"
            >
              <Info className="h-3.5 w-3.5" />
              Lab Overview
            </Button>
          }
        />

        <ResizableHandle withHandle />

        {/* Center Panel: LaTeX Scratchpad */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <ScrollArea className="h-full w-full">
            <div className="p-8 max-w-3xl mx-auto w-full space-y-8">
                {/* Dynamic Widget Rendering */}
                {currentStep && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{steps.findIndex(s => s.id === currentStep.id) + 1}</span>
                      </div>
                      <h3 className="text-lg font-semibold">
                        <Markdown>{currentStep.title}</Markdown>
                      </h3>
                    </div>

                    {/* Step Instructions */}
                    {(currentStep as any).instruction && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{(currentStep as any).instruction}</Markdown>
                      </div>
                    )}

                    {/* Key Questions */}
                    {(currentStep as any).keyQuestions && (currentStep as any).keyQuestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Key Questions</h4>
                        <ul className="space-y-1.5 list-disc list-inside">
                          {(currentStep as any).keyQuestions.map((q: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Render widgets if they exist */}
                    {currentStep.widgets && currentStep.widgets.length > 0 ? (
                      <div className="space-y-6">
                        {currentStep.widgets.map((widget, idx) => {
                          if (widget.type === "editor") {
                            return (
                              <EditorWidget
                                key={idx}
                                label={widget.config.label || ""}
                                description={widget.config.description}
                                placeholder={widget.config.placeholder || ""}
                                initialValue={createEditorValue(stepResponses[currentStep.id] || '')}
                                onChange={(value) => setStepResponses({...stepResponses, [currentStep.id]: extractPlainText(value)})}
                                height={widget.config.height || widget.config.minHeight || "200px"}
                                variant={widget.config.variant || "default"}
                                readOnly={widget.config.readOnly === true}
                              />
                            );
                          }
                          
                          if (widget.type === "multiple-choice") {
                            const currentFeedback = stepFeedback[currentStep.id];
                            return (
                              <MultipleChoiceWidget
                                key={idx}
                                label={widget.config.label || ""}
                                description={widget.config.description}
                                choices={widget.config.choices || []}
                                selectedIds={(stepResponses[`${currentStep.id}-choice`] || '').split(',').filter(Boolean)}
                                onSelectionChange={(ids) => setStepResponses({...stepResponses, [`${currentStep.id}-choice`]: ids.join(',')})}
                                multiSelect={widget.config.multiSelect !== false}
                                showExplanation={widget.config.showExplanation === true}
                                explanation={stepResponses[`${currentStep.id}-explain`] || ''}
                                onExplanationChange={(value) => setStepResponses({...stepResponses, [`${currentStep.id}-explain`]: value})}
                                explanationLabel={widget.config.explanationLabel}
                                explanationPlaceholder={widget.config.explanationPlaceholder}
                                correctIds={currentFeedback?.correctIds}
                                incorrectIds={currentFeedback?.incorrectIds}
                                disabled={isSubmitting || currentFeedback?.approved}
                              />
                            );
                          }
                          
                          if (widget.type === "derivation-steps") {
                            return (
                              <DerivationStepsWidget
                                key={idx}
                                steps={derivationSteps}
                                availableRules={availableRules}
                                onAddStep={addStep}
                                onRemoveStep={removeStep}
                                onUpdateStep={updateStep}
                                showInstructions={widget.config.showInstructions !== false}
                              />
                            );
                          }
                          
                          return null;
                        })}

                        {/* Feedback Display */}
                        {stepFeedback[currentStep.id] && (
                          <Card className={cn(
                            "border-2",
                            stepFeedback[currentStep.id].approved ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"
                          )}>
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start gap-3">
                                {stepFeedback[currentStep.id].approved ? (
                                  <Check className="w-5 h-5 text-green-500 mt-0.5" />
                                ) : (
                                  <Info className="w-5 h-5 text-amber-500 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <p className="text-sm font-medium mb-1">
                                    {stepFeedback[currentStep.id].approved ? "Great work!" : "Keep going!"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{stepFeedback[currentStep.id].text}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Submit Button */}
                        {!stepFeedback[currentStep.id]?.approved && (
                          <Button 
                            className="w-full"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? "Getting Feedback..." : "Submit for Feedback"}
                          </Button>
                        )}
                      </div>
                    ) : (
                      /* Fallback: No widgets found in lab data */
                      <div className="space-y-4 p-6 bg-muted/30 rounded-lg border-2 border-dashed">
                        <p className="text-sm text-muted-foreground text-center">
                          This lab doesn&apos;t have widget configuration. Widgets make labs interactive!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Rule Reminders */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="border-l bg-muted/5">
          <ScrollArea className="h-full w-full">
            <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                      <Info className="w-4 h-4 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold">Rule Reminders</h3>
                  </div>
                  <p className="text-xs text-muted-foreground italic">Click a rule to learn more</p>
                  <div className="space-y-2">
                    {availableRules.map((rule) => (
                      <button
                        key={rule.id}
                        className="w-full text-left p-3 rounded-xl border bg-background hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group"
                        onClick={() => setSelectedRule(rule)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <p className="text-xs font-bold text-primary">{rule.name}</p>
                            <Markdown className="text-[10px] text-muted-foreground">{rule.formula}</Markdown>
                          </div>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {conceptCheck && (
                  <>
                    <Separator className="opacity-50" />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-semibold">Concept Check</h3>
                      </div>
                      <Card className="border-none bg-amber-500/5 shadow-none">
                        <CardContent className="p-4 space-y-3">
                          <Markdown className="text-xs leading-relaxed text-muted-foreground">
                            {conceptCheck.question}
                          </Markdown>
                          {conceptCheck.explanation && (
                            <Button variant="outline" size="sm" className="w-full text-xs justify-between bg-background">
                              View Explanation <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Rule Details Dialog */}
      <Dialog open={!!selectedRule} onOpenChange={(open) => !open && setSelectedRule(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedRule?.name}</DialogTitle>
            <DialogDescription>
              Learn how to apply this differentiation rule
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Formula</h4>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <Markdown className="text-center">{selectedRule?.formula || ""}</Markdown>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setSelectedRule(null)}
              >
                Close
              </Button>
              <Button 
                className="flex-1"
                onClick={() => {
                  const lastStep = derivationSteps[derivationSteps.length - 1];
                  if (lastStep && !lastStep.rule && selectedRule) {
                    applyRule(lastStep.id, selectedRule.id);
                  }
                  setSelectedRule(null);
                }}
              >
                Apply to Last Step
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lab Overview Dialog */}
      <Dialog open={showLabOverview} onOpenChange={setShowLabOverview}>
        <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-[90vw] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{labTitle}</DialogTitle>
            <DialogDescription className="sr-only">
              Overall lab instructions and overview
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Lab Description */}
            {description && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{convertNewlines(description)}</Markdown>
                </div>
              </div>
            )}

            {/* Problem Statement */}
            {data.problemStatement && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Problem Statement</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown>{convertNewlines(data.problemStatement)}</Markdown>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowLabOverview(false)} className="w-full sm:w-auto">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
