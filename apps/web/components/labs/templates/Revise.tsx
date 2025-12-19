"use client";

import React, { useState } from "react";
import { ReviseLabData } from "@/types/lab-templates";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  PenLine, 
  CheckCircle2, 
  Circle, 
  History,
  ChevronRight,
  Check,
  FileEdit,
  Eye,
  ClipboardList,
  Lightbulb,
  Users,
  Target,
  Diff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
}

const INITIAL_STEPS: Step[] = [
  { id: "purpose", title: "Define purpose & audience", status: "current" },
  { id: "draft", title: "Draft", status: "pending" },
  { id: "structure", title: "Revise structure", status: "pending" },
  { id: "clarity", title: "Improve clarity/style", status: "pending" },
  { id: "reflect", title: "Reflect", status: "pending" },
];

interface ReviseTemplateProps {
  labTitle?: string;
}

interface ReviseTemplateProps {
  data: ReviseLabData;
  labId?: string;
}

export default function ReviseTemplate({ data, labId }: ReviseTemplateProps) {
  const { labTitle, description, initialDraft, targetAudience, purpose: initialPurpose, rubricCriteria, improvementAreas } = data;
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [draft, setDraft] = useState(initialDraft);
  const [originalDraft] = useState(initialDraft);
  const [viewMode, setViewMode] = useState<"edit" | "diff">("edit");
  const [purpose, setPurpose] = useState("");
  const [audience, setAudience] = useState("");
  const [reflection, setReflection] = useState("");
  const [revisionComparison, setRevisionComparison] = useState("");
  const [selectedRubricItem, setSelectedRubricItem] = useState<string | null>(null);
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  
  const currentStep = steps.find(s => s.status === "current");
  const isStructureOrClarityStep = currentStep?.id === "structure" || currentStep?.id === "clarity";
  
  const getRubricGuidance = (criterionId: string) => {
    const criterion = rubricCriteria.find(c => c.id === criterionId);
    return {
      question: criterion?.guidanceQuestion || "How can you improve this?",
      hint: criterion?.hint || ""
    };
  };

  const completeStep = (id: string) => {
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

  const renderDiff = () => {
    const originalLines = originalDraft.split('\n');
    const currentLines = draft.split('\n');
    const maxLength = Math.max(originalLines.length, currentLines.length);
    
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

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25} className="border-r bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <PenLine className="w-5 h-5 text-primary" />
                {labTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <ScrollArea className="flex-1 h-0">
              <div className="p-4 space-y-2">
                {steps.map((step) => (
                  <div 
                    key={step.id}
                    className={cn(
                      "group flex items-start gap-3 p-3 rounded-xl transition-all duration-200",
                      step.status === "current" 
                        ? "bg-primary/10 border border-primary/20 shadow-sm" 
                        : "hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    <div className="mt-0.5">
                      {step.status === "completed" ? (
                        <div className="bg-primary rounded-full p-0.5">
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        </div>
                      ) : step.status === "current" ? (
                        <div className="w-4.5 h-4.5 rounded-full bg-primary" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-muted-foreground/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm font-medium leading-none",
                        step.status === "pending" && "text-muted-foreground/60",
                        step.status === "current" && "text-primary"
                      )}>
                        {step.title}
                      </p>
                      {step.status === "current" && (
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="h-auto p-0 text-xs mt-2 text-primary/80 hover:text-primary"
                          onClick={() => completeStep(step.id)}
                        >
                          Mark as complete <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

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
                  {draft.split(/\s+/).filter(Boolean).length} words
                </Badge>
              </div>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "edit" | "diff")} className="h-8">
                <TabsList className="h-8 p-1 bg-background border">
                  <TabsTrigger value="edit" className="text-xs h-6 gap-1.5">
                    <FileEdit className="w-3 h-3" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="diff" className="text-xs h-6 gap-1.5">
                    <Diff className="w-3 h-3" />
                    Compare
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <ScrollArea className="flex-1 h-0">
              <div className="p-8 max-w-4xl mx-auto">
                {viewMode === "edit" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Purpose</label>
                      <Textarea 
                        placeholder={initialPurpose}
                        className="text-sm min-h-[60px]"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Audience</label>
                      <Textarea 
                        placeholder={targetAudience}
                        className="text-sm min-h-[60px]"
                        value={audience}
                        onChange={(e) => setAudience(e.target.value)}
                      />
                    </div>
                    
                    {isStructureOrClarityStep && (
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                          <Diff className="w-3 h-3" />
                          What changed from your previous draft?
                        </label>
                        <Textarea 
                          placeholder="Describe the specific changes you made and why..."
                          className="text-sm min-h-[80px] bg-amber-500/5 border-amber-500/20"
                          value={revisionComparison}
                          onChange={(e) => setRevisionComparison(e.target.value)}
                        />
                        {!revisionComparison && (
                          <p className="text-[10px] text-amber-600 italic">Required: Revision is about intentional change</p>
                        )}
                      </div>
                    )}
                    
                    <Separator className="my-6" />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">Draft</label>
                        <div className="text-[10px] text-muted-foreground">
                          {draft.split('\n\n').filter(p => p.trim()).length} paragraphs
                        </div>
                      </div>
                      <Textarea 
                        placeholder="Start writing your draft here..."
                        className="min-h-[500px] text-base leading-relaxed font-serif resize-none border-none focus-visible:ring-0 px-0"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-4">
                    {renderDiff()}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Rubric + Prompts */}
        <ResizablePanel defaultSize={30} minSize={20} maxSize={40} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 h-0">
              <div className="p-5 space-y-6">
                {steps.find(s => s.id === "purpose" && s.status === "current") && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold">Define Purpose & Audience</h3>
                    </div>
                    <Card className="border-none bg-primary/5 shadow-none">
                      <CardContent className="p-4 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Before revising, be clear about who you're writing for and what you want them to do or believe.
                        </p>
                        <div className="text-xs space-y-1">
                          <p className="font-medium">Good audience description:</p>
                          <p className="text-muted-foreground italic">"College students with some programming experience but new to data structures"</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {(steps.find(s => s.id === "draft" && s.status === "current") || 
                  steps.find(s => s.id === "structure" && s.status === "current") || 
                  steps.find(s => s.id === "clarity" && s.status === "current")) && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <ClipboardList className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold">Rubric</h3>
                    </div>
                    <div className="space-y-3">
                    {rubricCriteria.map((criterion) => {
                      const score = rubricScores[criterion.id] || 0;
                      const isSelected = selectedRubricItem === criterion.id;
                      const guidance = getRubricGuidance(criterion.id);
                      
                      return (
                        <button
                          key={criterion.id}
                          className="w-full text-left group"
                          onClick={() => setSelectedRubricItem(isSelected ? null : criterion.id)}
                        >
                          <Card className={cn(
                            "border-none bg-background shadow-sm transition-all duration-200",
                            isSelected && "ring-2 ring-primary/20",
                            "group-hover:shadow-md"
                          )}>
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-xs font-bold flex items-center gap-2">
                                    {criterion.name}
                                    <ChevronRight className={cn(
                                      "w-3 h-3 transition-transform",
                                      isSelected && "rotate-90"
                                    )} />
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-1">{criterion.description}</p>
                                </div>
                                <Badge variant="outline" className="text-xs ml-2">
                                  {score}/3
                                </Badge>
                              </div>
                              
                              {isSelected && (
                                <div className="pt-3 mt-3 border-t space-y-2">
                                  <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg">
                                    <Target className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-medium text-amber-900">{guidance.question}</p>
                                      {guidance.hint && (
                                        <p className="text-[10px] text-amber-700 italic">{guidance.hint}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex gap-1">
                                {[1, 2, 3].map((s) => (
                                  <div
                                    key={s}
                                    className={cn(
                                      "h-1.5 flex-1 rounded-full transition-colors",
                                      s <= score ? "bg-primary" : "bg-muted"
                                    )}
                                  />
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </button>
                      );
                    })}
                  </div>

                    <Separator className="opacity-50" />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10">
                          <Lightbulb className="w-4 h-4 text-amber-500" />
                        </div>
                        <h3 className="text-sm font-semibold">Targeted Prompts</h3>
                      </div>
                      <div className="space-y-2">
                        {improvementAreas.map((prompt, i) => (
                          <button 
                            key={i} 
                            className="w-full text-left text-xs p-3 rounded-xl border bg-background hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 group"
                          >
                            <span className="flex items-start gap-2">
                              <CheckCircle2 className="w-3 h-3 mt-0.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                              {prompt}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {steps.find(s => s.id === "reflect" && s.status === "current") && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                      </div>
                      <h3 className="text-sm font-semibold">Reflect on Changes</h3>
                    </div>
                    <Card className="border-none bg-amber-500/5 shadow-none">
                      <CardContent className="p-4 space-y-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Revision is about intentional improvement. Explain what you changed and why the new version is better.
                        </p>
                        <div className="text-xs space-y-1">
                          <p className="font-medium">Consider:</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>What was weak in the original?</li>
                            <li>What specific changes did you make?</li>
                            <li>How do these changes improve the essay?</li>
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                <Separator className="opacity-50" />

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Lightbulb className="w-3 h-3" />
                    Revision Reflection
                  </label>
                  <p className="text-[10px] text-muted-foreground italic mb-2">
                    Required: What did you change, and why is this version better?
                  </p>
                  <Textarea 
                    placeholder="Explain the changes you made and why they improve the essay..."
                    className="min-h-[120px] text-sm"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                  />
                  {!reflection.trim() && (
                    <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <Target className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-amber-700">
                        Submit will be enabled when you complete your reflection
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-background">
              <Button 
                className="w-full shadow-sm" 
                variant="default"
                disabled={!reflection.trim()}
              >
                {!reflection.trim() ? "Complete reflection to submit" : "Submit Revision"}
              </Button>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
