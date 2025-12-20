"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

export interface DerivationStep {
  id: string;
  expression: string;
  rule: string;
  justification: string;
}

interface DerivationStepsWidgetProps {
  steps: DerivationStep[];
  availableRules: Array<{ id: string; name: string }>;
  onAddStep: () => void;
  onRemoveStep: (id: string) => void;
  onUpdateStep: (id: string, field: keyof DerivationStep, value: string) => void;
  showInstructions?: boolean;
}

export function DerivationStepsWidget({
  steps,
  availableRules,
  onAddStep,
  onRemoveStep,
  onUpdateStep,
  showInstructions = true
}: DerivationStepsWidgetProps) {
  return (
    <div className="space-y-6">
      {steps.map((step, index) => (
        <div key={step.id} className="group relative space-y-3 p-6 rounded-2xl border bg-muted/30 hover:bg-muted/50 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Step {index + 1}
            </span>
            {steps.length > 1 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                onClick={() => onRemoveStep(step.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-medium text-muted-foreground uppercase">Expression</label>
              {showInstructions && (
                <p className="text-[10px] text-muted-foreground italic mb-1">
                  Type naturally: x^2 sin(x), 2x cos(x) + x^2(-sin(x)), etc.
                </p>
              )}
              <Textarea 
                placeholder="e.g. 2x sin(x) + x^2 cos(x)"
                className="font-mono text-sm min-h-[80px] bg-background"
                value={step.expression}
                onChange={(e) => onUpdateStep(step.id, "expression", e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-muted-foreground uppercase">Rule Applied</label>
                <select
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background"
                  value={step.rule}
                  onChange={(e) => {
                    onUpdateStep(step.id, "rule", e.target.value);
                    if (e.target.value && !step.justification) {
                      onUpdateStep(step.id, "justification", `Apply ${e.target.value}`);
                    }
                  }}
                >
                  <option value="">Select rule...</option>
                  {availableRules.map(rule => (
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
                  onChange={(e) => onUpdateStep(step.id, "justification", e.target.value)}
                />
              </div>
            </div>
          </div>

          {step.expression && (
            <div className="mt-4 p-4 rounded-xl bg-background border border-primary/10 flex items-center justify-center min-h-[60px]">
              <Markdown>
                {step.expression.includes('\n') 
                  ? step.expression.split('\n').map(line => `$${line}$`).join('  \n')
                  : `$${step.expression}$`
                }
              </Markdown>
            </div>
          )}
        </div>
      ))}

      <Button 
        variant="outline" 
        className="w-full py-8 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
        onClick={onAddStep}
      >
        <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
        Add Derivation Step
      </Button>
    </div>
  );
}
