"use client";

import React, { useState } from "react";
import { ExplainLabData } from "@/types/lab-templates";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Editor from "@monaco-editor/react";
import { 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  MessageSquare, 
  History,
  HelpCircle,
  ChevronRight,
  Check,
  Eye,
  Brain,
  AlertTriangle,
  Loader2,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { useLabAI } from "@/hooks/use-lab-ai";
import { toast } from "sonner";

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
  instruction?: string;
  keyQuestions?: string[];
  prompt?: string;
}

interface ExplainTemplateProps {
  data: ExplainLabData;
  labId?: string;
}

export default function ExplainTemplate({ data, labId }: ExplainTemplateProps) {
  const { labTitle, description, artifact, steps: aiSteps } = data;
  const artifactCode = artifact?.code || "// No code provided";
  const language = artifact?.language || "javascript";
  
  // Initialize steps from AI-generated data or use defaults
  const initialSteps: Step[] = aiSteps && aiSteps.length > 0
    ? aiSteps.map((step: any, idx: number) => ({
        id: step.id || `step-${idx}`,
        title: step.title || `Step ${idx + 1}`,
        status: idx === 0 ? "current" as const : "pending" as const,
        instruction: step.instruction,
        keyQuestions: step.keyQuestions,
        prompt: step.prompt
      }))
    : [
        { id: "read", title: "Read / inspect", status: "current" },
        { id: "predict", title: "Predict behavior", status: "pending" },
        { id: "explain", title: "Explain reasoning", status: "pending" },
        { id: "edge-cases", title: "Address edge cases", status: "pending" },
      ];
  
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [feedback, setFeedback] = useState<{ text: string; approved: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { getAssistance, loading: aiLoading } = labId ? useLabAI(labId) : { getAssistance: null, loading: false };

  // Dynamic explanations object based on step IDs
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  
  const currentStepIndex = steps.findIndex(s => s.status === "current");
  const currentStep = steps[currentStepIndex];
  const currentExplanation = currentStep ? explanations[currentStep.id] || "" : "";

  // Auto-save explanations when they change (debounced)
  React.useEffect(() => {
    if (!labId || isLoading) return;
    
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep) return;

    const timer = setTimeout(() => {
      saveProgress(currentStep.id, false);
    }, 2000); // Auto-save after 2 seconds of no typing

    return () => clearTimeout(timer);
  }, [explanations, labId, isLoading]);

  // Load progress when component mounts
  React.useEffect(() => {
    if (!labId) {
      setIsLoading(false);
      return;
    }

    const loadProgress = async () => {
      try {
        const { fetchLabProgress } = await import("@/lib/api/labs");
        const progress = await fetchLabProgress(labId);
        
        if (progress && progress.length > 0) {
          // Restore explanations from saved progress
          const savedExplanations: any = {};
          progress.forEach((p: any) => {
            if (p.step_data) {
              Object.assign(savedExplanations, p.step_data);
            }
          });
          if (Object.keys(savedExplanations).length > 0) {
            setExplanations(prev => ({ ...prev, ...savedExplanations }));
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
    setFeedback(null);
  };

  const saveProgress = async (stepId: string, completed: boolean = false) => {
    if (!labId || !stepId) return;
    
    try {
      const { updateLabProgress } = await import("@/lib/api/labs");
      await updateLabProgress(labId, {
        step_id: stepId,
        step_data: explanations,
        completed
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const completeStep = async (id: string) => {
    // Save progress before completing
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
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep || !getAssistance) return;

    const userResponse = currentExplanation;
    const stepName = currentStep.title;

    if (!userResponse.trim()) {
      toast.error("Please provide an answer before submitting");
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const prompt = `You are a coding instructor reviewing a student's ${stepName.toLowerCase()} for this code:

\`\`\`${language}
${artifactCode}
\`\`\`

Step instruction: ${currentStep.instruction}

Student's response:
${userResponse}

Evaluate if their response demonstrates understanding. Respond ONLY in this JSON format:
{
  "approved": true/false,
  "feedback": "Brief constructive feedback (2-3 sentences)"
}

Approve if they show reasonable understanding. If not approved, explain what's missing.`;

      const response = await getAssistance(prompt, { step: currentStep.id, code: artifactCode });
      
      try {
        const parsed = JSON.parse(response);
        setFeedback({ text: parsed.feedback, approved: parsed.approved });
        
        if (parsed.approved) {
          setTimeout(async () => {
            await completeStep(currentStep.id);
            setFeedback(null);
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

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25} className="border-r bg-muted/5">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(step.id)}
                    disabled={step.status === "pending"}
                    className={cn(
                      "w-full text-left p-3 rounded-lg transition-all duration-200",
                      step.status === "current" 
                        ? "bg-primary/10 border border-primary/20 text-primary font-medium" 
                        : step.status === "completed"
                        ? "text-foreground hover:bg-muted/50 cursor-pointer"
                        : "text-muted-foreground/60 cursor-not-allowed"
                    )}
                  >
                    <p className="text-sm">{step.title}</p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Center Panel: Artifact (Read-only) */}
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-background rounded border text-xs font-medium">
                  <Eye className="w-3.5 h-3.5 text-blue-500" />
                  artifact.{language === 'java' ? 'java' : language === 'python' ? 'py' : language === 'typescript' ? 'ts' : 'js'}
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold py-0 h-5">
                  Read Only
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Report Issue
                </Button>
              </div>
            </div>
            <div className="flex-1 relative bg-[#1e1e1e]">
              <Editor
                height="100%"
                defaultLanguage={language}
                theme="vs-dark"
                value={artifactCode}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  readOnly: true,
                  automaticLayout: true,
                  padding: { top: 16, bottom: 16 },
                  domReadOnly: true,
                }}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Explanation Prompts */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-background">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Explanation Workspace
              </h3>
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="p-5 space-y-6">
                {currentStep && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      {currentStepIndex + 1}. {currentStep.title}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {currentStep.instruction || "Complete this step by analyzing the code."}
                    </p>
                    
                    {currentStep.keyQuestions && currentStep.keyQuestions.length > 0 && (
                      <Card className="border-none bg-primary/5 shadow-none">
                        <CardContent className="p-4 space-y-2">
                          <p className="text-xs font-medium">Key Questions:</p>
                          <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                            {currentStep.keyQuestions.map((q: string, i: number) => (
                              <li key={i}>{q}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}
                    
                    {currentStep.prompt && (
                      <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <Eye className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                          {currentStep.prompt}
                        </p>
                      </div>
                    )}
                    
                    <Textarea 
                      placeholder="Type your answer here..."
                      className="min-h-[120px] text-sm"
                      value={currentExplanation}
                      onChange={(e) => setExplanations({...explanations, [currentStep.id]: e.target.value})}
                    />
                  </div>
                )}



                {steps.every(s => s.status === "completed") && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-amber-500" />
                      <h4 className="text-sm font-semibold">Concept Check</h4>
                    </div>
                    
                    <Card className="border-none bg-primary/5 shadow-none">
                      <CardContent className="p-4 space-y-3">
                        <div className="space-y-2">
                          <p className="text-xs font-medium">What additional memory does this algorithm use, and why?</p>
                          <Textarea 
                            placeholder="Explain space complexity..."
                            className="min-h-[60px] text-xs"
                            value={explanations.spaceComplexity}
                            onChange={(e) => setExplanations({...explanations, spaceComplexity: e.target.value})}
                          />
                        </div>
                        
                        <Separator className="opacity-50" />
                        
                        <p className="text-xs font-medium">What is the time complexity of this implementation?</p>
                        <div className="grid grid-cols-1 gap-2">
                          {["O(n²)", "O(n log n)", "O(n)", "O(1)"].map((opt) => (
                            <Button key={opt} variant="outline" size="sm" className="justify-start text-xs h-8 bg-background">
                              {opt}
                            </Button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
            
            {feedback && (
              <div className={cn(
                "mx-4 mb-4 p-4 rounded-lg border-2",
                feedback.approved 
                  ? "bg-green-50 border-green-500 dark:bg-green-950" 
                  : "bg-amber-50 border-amber-500 dark:bg-amber-950"
              )}>
                <div className="flex items-start gap-3">
                  {feedback.approved ? (
                    <ThumbsUp className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                  ) : (
                    <ThumbsDown className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={cn(
                      "text-sm font-semibold mb-1",
                      feedback.approved ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"
                    )}>
                      {feedback.approved ? "Great work!" : "Needs improvement"}
                    </p>
                    <p className="text-sm text-foreground/80">{feedback.text}</p>
                    {feedback.approved && (
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
                    <Loader2 className="w-4 h-4 animate-spin" />
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
