"use client";

import React, { useState } from "react";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LabStepPanel } from "@/components/labs/lab-step-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  BarChart3, 
  CheckCircle2, 
  Circle, 
  History,
  ChevronRight,
  Check,
  Table as TableIcon,
  LineChart,
  Search,
  Lightbulb,
  AlertCircle,
  FileText,
  Database,
  TrendingUp,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
}

const INITIAL_STEPS: Step[] = [
  { id: "question", title: "Define question", status: "current" },
  { id: "inspect", title: "Inspect data", status: "pending" },
  { id: "patterns", title: "Analyze patterns", status: "pending" },
  { id: "conclusions", title: "Draw conclusions", status: "pending" },
  { id: "limitations", title: "Consider limitations", status: "pending" },
];

import { AnalyzeLabData } from "@/types/lab-templates";

interface AnalyzeTemplateProps {
  data: AnalyzeLabData;
  labId?: string;
  moduleContext?: {
    pathId: string;
    moduleId: string;
    onComplete?: () => void;
  };
}

export default function AnalyzeTemplate({ data, labId, moduleContext }: AnalyzeTemplateProps) {
  const { labTitle, description, dataset, availableVariables, guidingQuestions } = data;
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [showLabOverview, setShowLabOverview] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [analysis, setAnalysis] = useState({
    question: "",
    patterns: "",
    conclusions: "",
    limitations: ""
  });
  const [primaryVariables, setPrimaryVariables] = useState<string[]>([]);
  const [comparisonVariable, setComparisonVariable] = useState("");
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const [claim, setClaim] = useState("");
  const [evidence, setEvidence] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);

  // Load progress when component mounts
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
          const mostRecent = progress[progress.length - 1];
          
          // Restore data from most recent progress entry
          if (mostRecent?.step_data) {
            if (mostRecent.step_data.analysis) {
              setAnalysis(mostRecent.step_data.analysis);
            }
            if (mostRecent.step_data.primaryVariables) {
              setPrimaryVariables(mostRecent.step_data.primaryVariables);
            }
            if (mostRecent.step_data.comparisonVariable) {
              setComparisonVariable(mostRecent.step_data.comparisonVariable);
            }
            if (mostRecent.step_data.annotations) {
              setAnnotations(mostRecent.step_data.annotations);
            }
            if (mostRecent.step_data.claim) {
              setClaim(mostRecent.step_data.claim);
            }
            if (mostRecent.step_data.evidence) {
              setEvidence(mostRecent.step_data.evidence);
            }
            if (mostRecent.step_data.reasoning) {
              setReasoning(mostRecent.step_data.reasoning);
            }
          }

          // Restore step completion status
          const completedStepIds = progress.filter((p: any) => p.completed).map((p: any) => p.step_id);
          
          setSteps(prev => {
            const newSteps = prev.map(step => {
              if (completedStepIds.includes(step.id)) {
                return { ...step, status: "completed" as const };
              }
              return step;
            });
            
            // Set first incomplete step as current
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

  // Auto-save progress when state changes (debounced)
  React.useEffect(() => {
    if (!labId || isLoadingProgress) return;
    
    const currentStep = steps.find(s => s.status === "current");
    if (!currentStep) return;

    const timer = setTimeout(() => {
      saveProgress(currentStep.id, false);
    }, 2000); // Auto-save after 2 seconds of no typing

    return () => clearTimeout(timer);
  }, [analysis, primaryVariables, comparisonVariable, annotations, claim, evidence, reasoning, labId, isLoadingProgress]);

  const saveProgress = async (stepId: string, completed: boolean = false) => {
    if (!labId || !stepId) return;
    
    try {
      const { updateLabProgress } = await import("@/lib/api/labs");
      await updateLabProgress(labId, {
        step_id: stepId,
        step_data: {
          analysis,
          primaryVariables,
          comparisonVariable,
          annotations,
          claim,
          evidence,
          reasoning
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

  const goToStep = (id: string) => {
    const stepIndex = steps.findIndex(s => s.id === id);
    if (stepIndex === -1) return;
    
    const step = steps[stepIndex];
    const canNavigate = step.status === "completed" || step.status === "current";
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
  
  const toggleAnnotation = (month: string) => {
    const key = month;
    if (annotations[key]) {
      const newAnnotations = { ...annotations };
      delete newAnnotations[key];
      setAnnotations(newAnnotations);
    } else {
      setAnnotations({ ...annotations, [key]: "" });
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <LabStepPanel
          steps={steps}
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

        {/* Center Panel: Data Visualization */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <div className="flex flex-col h-full bg-background">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-background rounded border text-xs font-medium">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  {dataset.name}
                </div>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-bold py-0 h-5">
                  Dataset
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Show Trends
                </Button>
              </div>
            </div>
            
            <ScrollArea className="flex-1 h-0">
              <div className="p-8 space-y-10 max-w-5xl mx-auto">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <LineChart className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Data Visualization</h3>
                  </div>
                  <Card className="border shadow-none bg-muted/5">
                    <CardContent className="p-6">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={dataset.rows}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                            />
                            <YAxis 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 12, fill: '#6b7280' }}
                            />
                            <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '12px' }} />
                            <Bar dataKey="temperature" name="Temp (°C)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="precipitation" name="Precip (mm)" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold">Raw Data Table</h3>
                  </div>
                  <div className="rounded-xl border bg-background overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          {dataset.columns.map((col) => (
                            <TableHead key={col.key} className={col.key === dataset.columns[0].key ? "w-[100px]" : ""}>
                              {col.label}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dataset.rows.map((row, idx) => {
                          const rowKey = String(row[dataset.columns[0].key] || idx);
                          return (
                            <React.Fragment key={rowKey}>
                              <TableRow 
                                className={cn(
                                  "cursor-pointer transition-colors",
                                  annotations[rowKey] !== undefined && "bg-blue-500/5"
                                )}
                                onClick={() => toggleAnnotation(rowKey)}
                              >
                                {dataset.columns.map((col) => (
                                  <TableCell key={col.key} className={col.key === dataset.columns[0].key ? "font-medium" : ""}>
                                    {row[col.key]}
                                  </TableCell>
                                ))}
                              </TableRow>
                              {annotations[rowKey] !== undefined && (
                                <TableRow>
                                  <TableCell colSpan={dataset.columns.length} className="p-3 bg-blue-500/5">
                                    <div className="space-y-1">
                                      <p className="text-[10px] text-muted-foreground uppercase font-medium">Annotation</p>
                                      <Textarea
                                        placeholder="Add a note about this data point..."
                                        className="text-xs min-h-[50px] bg-background"
                                        value={annotations[rowKey]}
                                        onChange={(e) => setAnnotations({ ...annotations, [rowKey]: e.target.value })}
                                        onClick={(e) => e.stopPropagation()}
                                      />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Analysis Prompts */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-background">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Analysis Workspace
              </h3>
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="p-5 space-y-6">
                {steps.find(s => s.id === "question" && s.status === "current") && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      1. Define Question
                    </label>
                    
                    {/* Step Instructions */}
                    {(steps.find(s => s.id === "question") as any)?.instruction && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{(steps.find(s => s.id === "question") as any).instruction}</Markdown>
                      </div>
                    )}

                    {/* Key Questions */}
                    {(steps.find(s => s.id === "question") as any)?.keyQuestions && (steps.find(s => s.id === "question") as any).keyQuestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Key Questions</h4>
                        <ul className="space-y-1.5 list-disc list-inside">
                          {(steps.find(s => s.id === "question") as any).keyQuestions.map((q: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase">
                          Primary Variable(s)
                        </label>
                        <div className="space-y-1.5">
                          {availableVariables.map(variable => (
                            <button
                              key={variable}
                              onClick={() => {
                                if (primaryVariables.includes(variable)) {
                                  setPrimaryVariables(primaryVariables.filter(v => v !== variable));
                                } else {
                                  setPrimaryVariables([...primaryVariables, variable]);
                                }
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-xs rounded-lg border transition-all",
                                primaryVariables.includes(variable)
                                  ? "bg-primary/10 border-primary/40 font-medium"
                                  : "bg-background hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-3 h-3 rounded border-2 flex items-center justify-center",
                                  primaryVariables.includes(variable) && "bg-primary border-primary"
                                )}>
                                  {primaryVariables.includes(variable) && (
                                    <Check className="w-2 h-2 text-primary-foreground" />
                                  )}
                                </div>
                                {variable.charAt(0).toUpperCase() + variable.slice(1)}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase">
                          Compare Against
                        </label>
                        <select
                          className="w-full px-3 py-2 text-xs rounded-lg border bg-background"
                          value={comparisonVariable}
                          onChange={(e) => setComparisonVariable(e.target.value)}
                        >
                          <option value="">Select variable...</option>
                          {availableVariables.filter(v => !primaryVariables.includes(v)).map(variable => (
                            <option key={variable} value={variable}>
                              {variable.charAt(0).toUpperCase() + variable.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <Markdown className="text-sm text-muted-foreground italic">
                      {guidingQuestions.question}
                    </Markdown>
                    <Textarea 
                      placeholder="e.g., Is there a correlation between temperature and precipitation?"
                      className="min-h-[80px] text-sm"
                      value={analysis.question}
                      onChange={(e) => setAnalysis({...analysis, question: e.target.value})}
                    />
                  </div>
                )}

                {steps.find(s => s.id === "inspect" && s.status === "current") && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      2. Inspect Data
                    </label>
                    
                    {/* Step Instructions */}
                    {(steps.find(s => s.id === "inspect") as any)?.instruction && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{(steps.find(s => s.id === "inspect") as any).instruction}</Markdown>
                      </div>
                    )}

                    {/* Key Questions */}
                    {(steps.find(s => s.id === "inspect") as any)?.keyQuestions && (steps.find(s => s.id === "inspect") as any).keyQuestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Key Questions</h4>
                        <ul className="space-y-1.5 list-disc list-inside">
                          {(steps.find(s => s.id === "inspect") as any).keyQuestions.map((q: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground italic">
                      Click on rows in the table to add annotations about notable data points.
                    </p>
                    <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 mb-2">
                      <AlertCircle className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-blue-700 font-medium">
                        Look for outliers, missing values, or unexpected patterns in the raw data.
                      </p>
                    </div>
                  </div>
                )}

                {steps.find(s => s.id === "patterns" && s.status === "current") && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      2. Analyze Patterns
                    </label>
                    
                    {/* Step Instructions */}
                    {(steps.find(s => s.id === "patterns") as any)?.instruction && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{(steps.find(s => s.id === "patterns") as any).instruction}</Markdown>
                      </div>
                    )}

                    {/* Key Questions */}
                    {(steps.find(s => s.id === "patterns") as any)?.keyQuestions && (steps.find(s => s.id === "patterns") as any).keyQuestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Key Questions</h4>
                        <ul className="space-y-1.5 list-disc list-inside">
                          {(steps.find(s => s.id === "patterns") as any).keyQuestions.map((q: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <Markdown className="text-sm text-muted-foreground italic">
                      {guidingQuestions.patterns}
                    </Markdown>
                    <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 mb-2">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-amber-700 font-medium">
                        Describe at least one pattern using approximate values (e.g., "Temperature peaks around 30°C in July")
                      </p>
                    </div>
                    <Textarea 
                      placeholder="Describe the patterns you see..."
                      className="min-h-[120px] text-sm"
                      value={analysis.patterns}
                      onChange={(e) => setAnalysis({...analysis, patterns: e.target.value})}
                    />
                  </div>
                )}

                {steps.find(s => s.id === "conclusions" && s.status === "current") && (
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      3. Draw Conclusions
                    </label>
                    
                    {/* Step Instructions */}
                    {(steps.find(s => s.id === "conclusions") as any)?.instruction && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Markdown>{(steps.find(s => s.id === "conclusions") as any).instruction}</Markdown>
                      </div>
                    )}

                    {/* Key Questions */}
                    {(steps.find(s => s.id === "conclusions") as any)?.keyQuestions && (steps.find(s => s.id === "conclusions") as any).keyQuestions.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-muted-foreground">Key Questions</h4>
                        <ul className="space-y-1.5 list-disc list-inside">
                          {(steps.find(s => s.id === "conclusions") as any).keyQuestions.map((q: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <Markdown className="text-sm text-muted-foreground italic">
                      {guidingQuestions.conclusions}
                    </Markdown>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase">Claim</label>
                        <Textarea 
                          placeholder="What is your main conclusion?"
                          className="min-h-[60px] text-sm bg-background"
                          value={claim}
                          onChange={(e) => setClaim(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase">Evidence (from chart/table)</label>
                        <Textarea 
                          placeholder="Which data points support this claim?"
                          className="min-h-[60px] text-sm bg-background"
                          value={evidence}
                          onChange={(e) => setEvidence(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase">Reasoning</label>
                        <Textarea 
                          placeholder="Why does this evidence support your claim?"
                          className="min-h-[60px] text-sm bg-background"
                          value={reasoning}
                          onChange={(e) => setReasoning(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {steps.find(s => s.id === "limitations" && s.status === "current") && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      4. Consider Limitations
                    </label>
                    <Markdown className="text-sm text-muted-foreground italic">
                      {guidingQuestions.limitations}
                    </Markdown>
                    <Textarea 
                      placeholder="Identify limitations of this analysis..."
                      className="min-h-[100px] text-sm"
                      value={analysis.limitations}
                      onChange={(e) => setAnalysis({...analysis, limitations: e.target.value})}
                    />
                  </div>
                )}

                {steps.every(s => s.status === "completed") && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-sm font-semibold">Analysis Complete!</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Review your work and submit your analysis when ready.
                    </p>
                  </div>
                )}

                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    <h4 className="text-sm font-semibold">Evidence Check</h4>
                  </div>
                  <div className="space-y-2">
                    {[
                      "Did you reference specific months?",
                      "Did you compare at least two variables?",
                      "Did you account for seasonal variations?"
                    ].map((check, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs p-3 rounded-xl border bg-background">
                        <div className="border-2 border-muted-foreground/20 w-4 h-4 rounded shrink-0" />
                        <Markdown className="text-muted-foreground inline">{check}</Markdown>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-background">
              <Button className="w-full shadow-sm" variant="default">
                Submit Analysis
              </Button>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

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
                  <Markdown>{description}</Markdown>
                </div>
              </div>
            )}

            {/* Dataset Info */}
            {dataset && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dataset Information</h3>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">Dataset: {dataset.name}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">Rows: {dataset.rows?.length || 0}</p>
                  {availableVariables && availableVariables.length > 0 && (
                    <p className="text-sm text-muted-foreground leading-relaxed">Variables: {availableVariables.join(', ')}</p>
                  )}
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
