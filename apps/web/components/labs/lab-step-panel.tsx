"use client";

import React from "react";
import { ResizablePanel } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { Check } from "lucide-react";

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
        <div className="p-4 space-y-3">
            {steps.map((step, index) => {
              const isAccessible = accessedSteps 
                ? (step.status === "completed" || step.status === "current" || accessedSteps.has(step.id))
                : (step.status === "completed" || step.status === "current");
              
              const isCurrent = step.status === "current";
              const isCompleted = step.status === "completed";

              return (
                <button
                  key={step.id}
                  ref={isCurrent && currentStepRef ? currentStepRef : null}
                  onClick={() => onStepClick(step.id)}
                  disabled={!isAccessible}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-all duration-200 border group relative overflow-hidden",
                    isCurrent
                      ? "bg-background border-primary/50 shadow-sm ring-1 ring-primary/20"
                      : isCompleted
                      ? "bg-muted/30 border-transparent hover:bg-muted/50 text-muted-foreground"
                      : isAccessible
                      ? "bg-muted/30 border-transparent hover:bg-muted/50 text-foreground"
                      : "bg-transparent border-transparent text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium transition-colors",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground"
                        : isCompleted
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-muted-foreground/30 text-muted-foreground/50"
                    )}>
                      {isCompleted ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm font-medium leading-tight break-words",
                        isCurrent ? "text-foreground" : "text-inherit"
                      )}>
                        <Markdown components={{ p: ({children}) => <span className="block">{children}</span> }}>
                          {step.title}
                        </Markdown>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </ScrollArea>
    </ResizablePanel>
  );
}
