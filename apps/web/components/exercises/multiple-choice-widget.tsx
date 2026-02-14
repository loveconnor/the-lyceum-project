"use client";

import React, { useState, useCallback } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ui/custom/prompt/markdown";
import { cn } from "@/lib/utils";

interface MultipleChoiceWidgetProps {
  options: string[];
  correctAnswer: string;
  correctFeedback?: string | null;
  incorrectFeedback?: string | null;
  feedback?:
    | {
        correct?: string | null;
        incorrect?: string | null;
        success?: string | null;
        error?: string | null;
      }
    | null;
  correct_feedback?: string | null;
  incorrect_feedback?: string | null;
  isCompleted: boolean;
  onComplete: () => void;
  onAttempt: () => void;
  selectedOption?: string | null;
  onOptionChange?: (option: string | null) => void;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Auto-format math expressions for rendering
const autoFormatMathExpression = (text: string): string => {
  if (!text) return text;
  
  // If already has LaTeX delimiters, return as-is
  if (/\$[^$]+\$/.test(text)) return text;
  
  // Simple math expression patterns
  const mathPatterns = [
    /^[\d\s+\-*/^().=<>≤≥≠±×÷√∑∏∫]+$/,
    /^[a-zA-Z]\s*[=<>]\s*[\d\s+\-*/^().]+$/,
    /\^[\d{}\w]+/,
    /[a-zA-Z]_[\d{}\w]+/,
    /\\frac|\\sqrt|\\sum|\\int/,
  ];
  
  const looksLikeMath = mathPatterns.some(p => p.test(text.trim()));
  
  if (looksLikeMath) {
    return `$${text}$`;
  }
  
  return text;
};

export const MultipleChoiceWidget = ({
  options,
  correctAnswer,
  correctFeedback,
  incorrectFeedback,
  feedback,
  correct_feedback,
  incorrect_feedback,
  isCompleted,
  onComplete,
  onAttempt,
  selectedOption: initialSelectedOption,
  onOptionChange,
}: MultipleChoiceWidgetProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(initialSelectedOption || null);
  const [hasChecked, setHasChecked] = useState(false);
  const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
  const isSelectionCorrect =
    !!selectedOption && selectedOption.trim().toLowerCase() === normalizedCorrectAnswer;
  const correctMessage =
    asText(correctFeedback) ??
    asText(correct_feedback) ??
    asText(feedback?.correct) ??
    asText(feedback?.success) ??
    "Correct! Nice work.";
  const incorrectMessage =
    asText(incorrectFeedback) ??
    asText(incorrect_feedback) ??
    asText(feedback?.incorrect) ??
    asText(feedback?.error) ??
    "Not quite. The correct answer is highlighted above.";
  
  const handleOptionChange = (option: string) => {
    setSelectedOption(option);
    setHasChecked(false);
    if (onOptionChange) {
      onOptionChange(option);
    }
  };

  const checkAnswer = useCallback(() => {
    if (!selectedOption) return;
    
    setHasChecked(true);
    onAttempt();
    
    const isCorrect = selectedOption.trim().toLowerCase() === normalizedCorrectAnswer;
    if (isCorrect) {
      onComplete();
    }
  }, [selectedOption, normalizedCorrectAnswer, onComplete, onAttempt]);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Select your answer</label>
      <div className="grid gap-2">
        {options.map((option, i) => {
          const isSelected = selectedOption === option;
          const isCorrectOption = option.trim().toLowerCase() === normalizedCorrectAnswer;
          const showAsCorrect = hasChecked && isCorrectOption;
          const showAsWrong = hasChecked && isSelected && !isCorrectOption;
          
          return (
            <button
              key={i}
              onClick={() => {
                if (!isCompleted) {
                  handleOptionChange(option);
                }
              }}
              disabled={isCompleted}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border text-left transition-all",
                isSelected && !hasChecked
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50 hover:bg-muted/50",
                showAsCorrect && "border-green-500 bg-green-500/10",
                showAsWrong && "border-red-500 bg-red-500/10",
                isCompleted && !isCorrectOption && "opacity-50"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                isSelected ? "border-primary" : "border-muted-foreground/30",
                showAsCorrect && "border-green-500",
                showAsWrong && "border-red-500"
              )}>
                {isSelected && (
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    showAsCorrect ? "bg-green-500" : showAsWrong ? "bg-red-500" : "bg-primary"
                  )} />
                )}
              </div>
              <span className="prose prose-sm prose-stone dark:prose-invert [&>p]:m-0 flex-1">
                <Markdown>{autoFormatMathExpression(option)}</Markdown>
              </span>
              {showAsCorrect && (
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
      
      {selectedOption && !isCompleted && (
        <Button onClick={checkAnswer} className="mt-2">
          Check Answer
        </Button>
      )}
      
      {/* Outcome feedback */}
      {hasChecked && !isCompleted && selectedOption && (
        <p
          className={cn(
            "text-sm",
            isSelectionCorrect
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {isSelectionCorrect ? correctMessage : incorrectMessage}
        </p>
      )}
    </div>
  );
};

export default MultipleChoiceWidget;
