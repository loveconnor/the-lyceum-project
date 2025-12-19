"use client";

import React, { useState } from "react";
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
import { 
  Calculator, 
  CheckCircle2, 
  Circle, 
  History,
  HelpCircle,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  Info,
  Lightbulb,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

interface Step {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
}

interface DerivationStep {
  id: string;
  expression: string;
  rule: string;
  justification: string;
}

const CALCULUS_RULES = [
  { id: "product", name: "Product Rule", formula: "(uv)' = u'v + uv'" },
  { id: "chain", name: "Chain Rule", formula: "(f(g(x)))' = f'(g(x)) · g'(x)" },
  { id: "power", name: "Power Rule", formula: "d/dx(x^n) = nx^(n-1)" },
  { id: "sum", name: "Sum Rule", formula: "(f + g)' = f' + g'" },
  { id: "constant", name: "Constant Multiple", formula: "(cf)' = cf'" },
  { id: "trig-sin", name: "Sin Derivative", formula: "d/dx(sin x) = cos x" },
  { id: "trig-cos", name: "Cos Derivative", formula: "d/dx(cos x) = -sin x" },
  { id: "quotient", name: "Quotient Rule", formula: "(u/v)' = (u'v - uv')/v²" },
];

const INITIAL_STEPS: Step[] = [
  { id: "restate", title: "Restate problem", status: "current" },
  { id: "method", title: "Choose method", status: "pending" },
  { id: "derive", title: "Derive solution", status: "pending" },
  { id: "verify", title: "Verify", status: "pending" },
  { id: "generalize", title: "Generalize", status: "pending" },
];

interface DeriveTemplateProps {
  labTitle?: string;
}

export default function DeriveTemplate({ labTitle = "Product Rule Derivative" }: DeriveTemplateProps) {
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [problemStatement] = useState("Find the derivative of $f(x) = x^2 \\sin(x)$ using the product rule.");
  const [derivationSteps, setDerivationSteps] = useState<DerivationStep[]>([
    { id: "1", expression: "f(x) = x^2 sin(x)", rule: "", justification: "Given function" }
  ]);

  const addStep = () => {
    const newId = (derivationSteps.length + 1).toString();
    setDerivationSteps([...derivationSteps, { id: newId, expression: "", rule: "", justification: "" }]);
  };
  
  const applyRule = (stepId: string, ruleId: string) => {
    const rule = CALCULUS_RULES.find(r => r.id === ruleId);
    if (rule) {
      updateStep(stepId, "rule", rule.name);
      if (!derivationSteps.find(s => s.id === stepId)?.justification) {
        updateStep(stepId, "justification", `Apply ${rule.name}`);
      }
    }
  };

  const removeStep = (id: string) => {
    if (derivationSteps.length > 1) {
      setDerivationSteps(derivationSteps.filter(s => s.id !== id));
    }
  };

  const updateStep = (id: string, field: keyof DerivationStep, value: string) => {
    setDerivationSteps(derivationSteps.map(s => s.id === id ? { ...s, [field]: value } : s));
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

  return (
    <div className="flex h-full w-full overflow-hidden bg-background text-foreground rounded-xl border shadow-sm">
      <ResizablePanelGroup direction="horizontal" className="w-full">
        
        {/* Left Panel: Step List */}
        <ResizablePanel defaultSize={20} minSize={15} maxSize={25} className="border-r bg-muted/5">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                {labTitle}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">Formal reasoning and mathematical derivation.</p>
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

        {/* Center Panel: LaTeX Scratchpad */}
        <ResizablePanel defaultSize={55} minSize={40}>
          <div className="flex flex-col h-full bg-background">
            <div className="p-8 max-w-3xl mx-auto w-full space-y-8">
              <div className="space-y-4">
                <Badge variant="outline" className="px-2 py-0.5 text-[10px] uppercase tracking-widest font-bold">
                  Problem Statement
                </Badge>
                <div className="text-xl font-serif leading-relaxed">
                  <Markdown>{problemStatement}</Markdown>
                </div>
              </div>

              <Separator className="opacity-50" />

              <div className="space-y-6">
                {derivationSteps.map((step, index) => (
                  <div key={step.id} className="group relative space-y-3 p-6 rounded-2xl border bg-muted/30 hover:bg-muted/50 transition-all duration-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Step {index + 1}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => removeStep(step.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-medium text-muted-foreground uppercase">Expression</label>
                        <p className="text-[10px] text-muted-foreground italic mb-1">Type naturally: x^2 sin(x), 2x cos(x) + x^2(-sin(x)), etc.</p>
                        <Textarea 
                          placeholder="e.g. 2x sin(x) + x^2 cos(x)"
                          className="font-mono text-sm min-h-[80px] bg-background"
                          value={step.expression}
                          onChange={(e) => updateStep(step.id, "expression", e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase">Rule Applied</label>
                          <select
                            className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                            value={step.rule}
                            onChange={(e) => {
                              updateStep(step.id, "rule", e.target.value);
                              if (e.target.value && !step.justification) {
                                updateStep(step.id, "justification", `Apply ${e.target.value}`);
                              }
                            }}
                          >
                            <option value="">Select rule...</option>
                            {CALCULUS_RULES.map(rule => (
                              <option key={rule.id} value={rule.name}>{rule.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-medium text-muted-foreground uppercase">Explanation (Why?)</label>
                          <Textarea 
                            placeholder="Explain your reasoning..."
                            className="text-sm min-h-[80px] bg-background"
                            value={step.justification}
                            onChange={(e) => updateStep(step.id, "justification", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {step.expression && (
                      <div className="mt-4 p-4 rounded-xl bg-background border border-primary/10 flex items-center justify-center min-h-[60px]">
                        <Markdown>{`$${step.expression}$`}</Markdown>
                      </div>
                    )}
                  </div>
                ))}

                <Button 
                  variant="outline" 
                  className="w-full py-8 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                  onClick={addStep}
                >
                  <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                  Add Derivation Step
                </Button>
              </div>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel: Rules + Feedback */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="border-l bg-muted/5">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 h-0">
              <div className="p-6 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                      <Info className="w-4 h-4 text-blue-500" />
                    </div>
                    <h3 className="text-sm font-semibold">Rule Reminders</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground italic">Click a rule to learn more</p>
                    {CALCULUS_RULES.slice(0, 5).map((rule) => (
                      <button
                        key={rule.id}
                        className="w-full text-left p-3 rounded-xl border bg-background hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group"
                        onClick={() => {
                          const lastStep = derivationSteps[derivationSteps.length - 1];
                          if (lastStep && !lastStep.rule) {
                            applyRule(lastStep.id, rule.id);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <p className="text-xs font-bold text-primary">{rule.name}</p>
                            <p className="text-[10px] text-muted-foreground font-mono">{rule.formula}</p>
                          </div>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                    </div>
                    <h3 className="text-sm font-semibold">Concept Check</h3>
                  </div>
                  <Card className="border-none bg-amber-500/5 shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Why is the product rule necessary here instead of just differentiating $x^2$ and $\sin(x)$ separately?
                      </p>
                      <Button variant="outline" size="sm" className="w-full text-xs justify-between bg-background">
                        View Explanation <ArrowRight className="w-3 h-3" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h3 className="text-sm font-semibold">Feedback</h3>
                  </div>
                  {derivationSteps.length > 1 ? (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                        <p className="text-xs text-emerald-700 font-medium">
                          ✓ Step {derivationSteps.length - 1}: Product Rule applied correctly
                        </p>
                      </div>
                      {derivationSteps[derivationSteps.length - 1].expression && !derivationSteps[derivationSteps.length - 1].rule && (
                        <div className="p-3 rounded-xl border bg-amber-500/5 border-amber-500/20">
                          <p className="text-xs text-amber-700 font-medium">
                            💡 Select which rule justifies this transformation
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border bg-muted/20">
                      <p className="text-xs text-muted-foreground">
                        Add derivation steps to receive feedback
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t bg-background">
              <Button className="w-full shadow-sm" variant="default">
                Verify Derivation
              </Button>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
