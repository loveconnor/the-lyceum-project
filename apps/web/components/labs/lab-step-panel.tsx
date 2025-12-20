"use client";

import React from "react";
import { ResizablePanel } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/custom/prompt/markdown";

export interface LabStep {
  id: string;
  title: string;
  status: "pending" | "current" | "completed";
}

interface LabStepPanelProps {
  steps: LabStep[];
  accessedSteps?: Set<string>;
  currentStepRef?: React.RefObject<HTMLButtonElement | null>;
  onStepClick: (id: string) => void;
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
}

export function LabStepPanel({
  steps,
  accessedSteps,
  currentStepRef,
  onStepClick,
  defaultSize = 20,
  minSize = 15,
  maxSize = 25,
}: LabStepPanelProps) {
  return (
    <ResizablePanel 
      defaultSize={defaultSize} 
      minSize={minSize} 
      maxSize={maxSize} 
      className="border-r bg-muted/5"
    >
      <ScrollArea className="h-full w-full">
        <div className="p-4 space-y-2">
            {steps.map((step) => {
              const isAccessible = accessedSteps 
                ? (step.status === "completed" || step.status === "current" || accessedSteps.has(step.id))
                : (step.status === "completed" || step.status === "current");
              
              return (
                <button
                  key={step.id}
                  ref={step.status === "current" && currentStepRef ? currentStepRef : null}
                  onClick={() => onStepClick(step.id)}
                  disabled={!isAccessible}
                  className={cn(
                    "w-full text-left p-3 rounded-lg transition-all duration-200",
                    step.status === "current" 
                      ? "bg-primary/10 border border-primary/20 text-primary font-medium" 
                      : step.status === "completed"
                      ? "text-foreground hover:bg-muted/50 cursor-pointer"
                      : isAccessible
                      ? "text-foreground hover:bg-muted/50 cursor-pointer"
                      : "text-muted-foreground/60 cursor-not-allowed"
                  )}
                >
                  <div className="text-sm">
                    <Markdown>{step.title}</Markdown>
                  </div>
                </button>
              );
            })}
        </div>
      </ScrollArea>
    </ResizablePanel>
  );
}
