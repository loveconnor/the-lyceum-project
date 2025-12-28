"use client";

import React, { useState, useCallback } from "react";
import { GripVertical, Plus, Trash2, ChevronDown } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SolutionStep {
  id: string;
  content: string;
  label?: string;
}

interface MultiStepWidgetProps {
  onAttempt: () => void;
  onShowWorkedExample?: () => void;
  hasWorkedExample?: boolean;
}

// Auto-format math expressions for rendering
const autoFormatMathExpression = (text: string): string => {
  if (!text) return text;
  
  // If already has LaTeX delimiters, return as-is
  if (/\$[^$]+\$/.test(text)) return text;
  
  // Patterns that indicate mathematical content
  const mathIndicators = [
    /[+\-*/^=<>≤≥≠±×÷]/, // operators
    /\d+\s*[a-zA-Z]/, // coefficient + variable (e.g., "2x")
    /[a-zA-Z]\s*\d/, // variable + number
    /\^\d+/, // exponents
    /sqrt|frac|sum|int|lim|sin|cos|tan|log|ln/, // math functions
    /\([^)]*[+\-*/^][^)]*\)/, // parentheses with operations
  ];
  
  const lines = text.split('\n');
  return lines.map(line => {
    if (/\$[^$]+\$/.test(line)) return line;
    
    const looksLikeMath = mathIndicators.some(p => p.test(line));
    if (looksLikeMath && !line.includes(' is ') && !line.includes(' the ')) {
      return `$${line}$`;
    }
    return line;
  }).join('\n');
};

const STEP_LABELS = [
  'Setup',
  'Simplify',
  'Factor',
  'Substitute',
  'Expand',
  'Rearrange',
  'Evaluate',
  'Solve',
  'Verify',
  'Final Answer',
];

// Sortable Step Component
const SortableStep = ({
  step,
  index,
  totalSteps,
  onUpdate,
  onRemove,
  onLabelChange,
  isPreviewMode,
}: {
  step: SolutionStep;
  index: number;
  totalSteps: number;
  onUpdate: (id: string, content: string) => void;
  onRemove: (id: string) => void;
  onLabelChange: (id: string, label: string) => void;
  isPreviewMode: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getPlaceholder = () => {
    return index === 0 ? "x^2 + 2x + 1" : "(x + 1)^2";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative",
        isDragging && "z-50"
      )}
    >
      {/* Step connector line */}
      {index > 0 && (
        <div className="absolute left-[19px] -top-3 h-3 w-px bg-border" />
      )}
      
      <div className={cn(
        "flex gap-3 transition-all",
        isDragging && "opacity-50"
      )}>
        {/* Step number and drag handle */}
        <div className="flex flex-col items-center pt-2.5">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
              {index + 1}
            </div>
            {/* Drag handle overlay */}
            <button
              className="absolute inset-0 rounded-full cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-muted hover:bg-accent"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Step content */}
        <Card className={cn(
          "flex-1 transition-all mb-3",
          isDragging && "shadow-lg ring-2 ring-primary/20"
        )}>
          <CardContent className="p-3">
            {/* Step label selector */}
            <div className="flex items-center justify-between mb-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <span>{step.label || `Step ${index + 1}`}</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-40">
                  {STEP_LABELS.map((label) => (
                    <DropdownMenuItem
                      key={label}
                      onClick={() => onLabelChange(step.id, label)}
                      className="text-xs"
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Remove button */}
              {totalSteps > 1 && (
                <button
                  onClick={() => onRemove(step.id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Content area */}
            {isPreviewMode ? (
              <div className="prose prose-sm prose-stone dark:prose-invert max-w-none [&>p]:m-0 [&_.katex]:text-base min-h-[24px]">
                <Markdown>{autoFormatMathExpression(step.content) || '*Empty*'}</Markdown>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={step.content}
                  onChange={(e) => onUpdate(step.id, e.target.value)}
                  placeholder={getPlaceholder()}
                  className="w-full min-h-[48px] resize-none border-0 bg-transparent p-0 text-sm focus:ring-0 focus:outline-none placeholder:text-muted-foreground/40 font-mono"
                  rows={1}
                />
                {/* Live inline preview */}
                {step.content.trim() && (
                  <div className="pt-2 border-t border-dashed border-border/50">
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground">→</span>
                      <div className="prose prose-sm prose-stone dark:prose-invert max-w-none [&>p]:m-0 [&_.katex]:text-base text-foreground">
                        <Markdown>{autoFormatMathExpression(step.content)}</Markdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const MultiStepWidget = ({
  onAttempt,
  onShowWorkedExample,
  hasWorkedExample = false,
}: MultiStepWidgetProps) => {
  const [steps, setSteps] = useState<SolutionStep[]>([
    { id: crypto.randomUUID(), content: '', label: '' }
  ]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const updateStep = useCallback((id: string, content: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, content } : s));
    if (content.trim().length > 0) {
      onAttempt();
    }
  }, [onAttempt]);

  const updateStepLabel = useCallback((id: string, label: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, label } : s));
  }, []);

  const addStep = useCallback(() => {
    setSteps(prev => [...prev, { id: crypto.randomUUID(), content: '', label: '' }]);
    onAttempt();
  }, [onAttempt]);

  const removeStep = useCallback((id: string) => {
    setSteps(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(s => s.id !== id);
    });
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const filledSteps = steps.filter(s => s.content.trim()).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-foreground">Your Work</label>
          {filledSteps > 0 && (
            <Badge variant="outline" className="text-xs">
              {filledSteps} step{filledSteps !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        
        {/* Preview toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="text-xs h-7"
          disabled={filledSteps === 0}
        >
          {isPreviewMode ? 'Edit' : 'Preview'}
        </Button>
      </div>
      
      {/* Step-based input area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={steps.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0">
            {steps.map((step, index) => (
              <SortableStep
                key={step.id}
                step={step}
                index={index}
                totalSteps={steps.length}
                onUpdate={updateStep}
                onRemove={removeStep}
                onLabelChange={updateStepLabel}
                isPreviewMode={isPreviewMode}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      
      {/* Add step button */}
      <div className="flex items-center gap-3 pl-[52px]">
        <Button
          variant="outline"
          size="sm"
          onClick={addStep}
          className="text-xs h-8"
        >
          <Plus className="w-3 h-3 mr-1" />
          Add Step
        </Button>
        
        <p className="text-xs text-muted-foreground">
          Show your reasoning — each step should be a clear transformation
        </p>
      </div>
      
      {/* Compare with solution when done */}
      {filledSteps > 0 && hasWorkedExample && onShowWorkedExample && (
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs"
          onClick={onShowWorkedExample}
        >
          Compare with worked example
        </Button>
      )}
    </div>
  );
};

export default MultiStepWidget;

