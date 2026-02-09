"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { Textarea } from "@/components/ui/textarea";
// Helper function to convert literal \n to actual newlines
const convertNewlines = (text: string | undefined) => {
  if (!text) return "";
  return text.replace(/\\n/g, "\n");
};
// Helper to wrap math notation in LaTeX delimiters - only for isolated math expressions
const wrapMath = (text: string): string => {
  if (!text) return text;
  
  // Don't process if already contains $ signs or if it's part of a sentence
  if (text.includes('$') || text.includes(' ')) return text;
  
  // Only wrap single mathematical terms
  if (text.match(/^\d*[a-zA-Z]\^?\d*$/) || text.match(/^[+\-]\d*[a-zA-Z]\^?\d*$/)) {
    return `$${text}$`;
  }
  
  return text;
};

interface Choice {
  id: string;
  name: string;
  description?: string;
  formula?: string;
}

interface MultipleChoiceWidgetProps {
  label: string;
  description?: string;
  choices: Choice[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  multiSelect?: boolean;
  showExplanation?: boolean;
  explanation?: string;
  onExplanationChange?: (value: string) => void;
  explanationLabel?: string;
  explanationPlaceholder?: string;
  correctIds?: string[];
  incorrectIds?: string[];
  disabled?: boolean;
}

export function MultipleChoiceWidget({
  label,
  description,
  choices,
  selectedIds,
  onSelectionChange,
  multiSelect = true,
  showExplanation = false,
  explanation = "",
  onExplanationChange,
  explanationLabel = "Explain your choice",
  explanationPlaceholder = "Explain why you made this selection...",
  correctIds = [],
  incorrectIds = [],
  disabled = false
}: MultipleChoiceWidgetProps) {
  const handleChoiceClick = (choiceId: string) => {
    if (disabled) return;
    
    if (multiSelect) {
      if (selectedIds.includes(choiceId)) {
        onSelectionChange(selectedIds.filter(id => id !== choiceId));
      } else {
        onSelectionChange([...selectedIds, choiceId]);
      }
    } else {
      onSelectionChange([choiceId]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      {description && (
        <div className="text-xs text-muted-foreground italic">
          <Markdown>{wrapMath(convertNewlines(description))}</Markdown>
        </div>
      )}
      
      <div className="space-y-2">
        {choices.map((choice) => {
          const isSelected = selectedIds.includes(choice.id);
          const isCorrect = correctIds.includes(choice.id);
          const isIncorrect = incorrectIds.includes(choice.id);
          
          return (
            <button
              key={choice.id}
              onClick={() => handleChoiceClick(choice.id)}
              disabled={disabled}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all duration-200",
                isSelected && !isCorrect && !isIncorrect && "bg-primary/10 border-primary/40 shadow-sm",
                isCorrect && "bg-green-500/10 border-green-500/50 shadow-sm",
                isIncorrect && "bg-red-500/10 border-red-500/50 shadow-sm",
                !isSelected && !isCorrect && !isIncorrect && "bg-background hover:bg-muted/50",
                disabled && "cursor-default"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="text-sm font-bold">
                    <Markdown className="inline-block">{wrapMath(choice.name)}</Markdown>
                  </div>
                  {choice.description && (
                    <p className="text-xs text-muted-foreground">{choice.description}</p>
                  )}
                  {choice.formula && (
                    <Markdown className="text-xs text-muted-foreground">{wrapMath(choice.formula)}</Markdown>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isCorrect && <Check className="w-5 h-5 text-green-500" />}
                  {isIncorrect && <X className="w-5 h-5 text-red-500" />}
                  {isSelected && !isCorrect && !isIncorrect && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {showExplanation && onExplanationChange && (
        <div className="space-y-3 pt-2">
          <div className="text-sm font-medium text-muted-foreground">
            <Markdown>{wrapMath(explanationLabel)}</Markdown>
          </div>
          <Textarea 
            placeholder={explanationPlaceholder}
            className="min-h-[120px] text-sm"
            value={explanation}
            onChange={(e) => onExplanationChange(e.target.value)}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

