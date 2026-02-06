"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { useState, useEffect } from "react";
import {
  Check,
  X,
  AlertCircle,
  HelpCircle,
  RefreshCcw,
  ArrowRight,
} from "lucide-react";
import { Markdown } from "./markdown";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

const ConfidenceCheck = ({
  value,
  onChange,
  disabled,
}: {
  value: "low" | "medium" | "high" | null;
  onChange: (value: "low" | "medium" | "high") => void;
  disabled: boolean;
}) => {
  const levels: Array<{
    value: "low" | "medium" | "high";
    label: string;
    icon: typeof HelpCircle;
    color: string;
  }> = [
    {
      value: "low",
      label: "Guessing",
      icon: HelpCircle,
      color: "text-muted-foreground",
    },
    {
      value: "medium",
      label: "Pretty Sure",
      icon: AlertCircle,
      color: "text-amber-600 dark:text-amber-400",
    },
    { value: "high", label: "Certain", icon: Check, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Confidence Level
        </label>
        {!disabled && (
          <span className="text-[10px] text-muted-foreground">Required</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {levels.map((level) => {
          const Icon = level.icon;
          const isSelected = value === level.value;

          return (
            <button
              key={level.value}
              onClick={() => !disabled && onChange(level.value)}
              disabled={disabled}
              className={`group relative flex flex-col items-center justify-center p-3 rounded-md border transition-colors duration-200 ${
                isSelected
                  ? "border-foreground bg-muted/40"
                  : disabled
                    ? "border-border bg-muted/40 opacity-60"
                    : "border-border bg-background hover:bg-muted/30"
              }`}
            >
              <Icon
                className={`w-4 h-4 mb-1.5 transition-colors ${
                  isSelected ? "text-foreground" : level.color
                } ${disabled ? "opacity-50" : "opacity-80 group-hover:opacity-100"}`}
              />
              <span
                className={`text-[10px] font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
              >
                {level.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

type TrueFalseProps = {
  statement: string;
  correctAnswer: boolean;
  explanation?: string | null;
  requireConfidence?: boolean;
  showFeedback?: boolean;
  className?: string[];
};

export function TrueFalse({ element }: ComponentRenderProps) {
  const props = element.props as TrueFalseProps;
  const customClass = getCustomClass(props);
  const statement = props.statement ?? "";
  const correctAnswer = Boolean(props.correctAnswer);
  const explanation = props.explanation ?? null;
  const requireConfidence = Boolean(props.requireConfidence);
  const showFeedback = props.showFeedback ?? true;

  const [answer, setAnswer] = useState<boolean | null>(null);
  const [confidence, setConfidence] = useState<
    "low" | "medium" | "high" | null
  >(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Restore saved state on mount
  useEffect(() => {
    const savedState = typeof (window as any).__getWidgetState === "function" 
      ? (window as any).__getWidgetState() 
      : null;
    
    if (savedState) {
      if (typeof savedState.answer === 'boolean') setAnswer(savedState.answer);
      if (savedState.confidence) setConfidence(savedState.confidence);
      if (typeof savedState.isSubmitted === 'boolean') setIsSubmitted(savedState.isSubmitted);
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (answer !== null || confidence !== null || isSubmitted) {
      if (typeof (window as any).__saveWidgetState === "function") {
        (window as any).__saveWidgetState({
          answer,
          confidence,
          isSubmitted
        });
      }
    }
  }, [answer, confidence, isSubmitted]);

  const handleReset = () => {
    setAnswer(null);
    setConfidence(null);
    setIsSubmitted(false);
  };

  const handleSelection = (value: boolean) => {
    if (isSubmitted) return;
    setAnswer(value);
    if (!requireConfidence) {
      setIsSubmitted(true);
    }
  };

  const handleSubmit = () => {
    if (answer === null) return;
    if (requireConfidence && confidence === null) return;
    setIsSubmitted(true);
    
    // Mark step as complete if answer is correct
    if (answer === correctAnswer && typeof (window as any).__markStepComplete === "function") {
      (window as any).__markStepComplete();
    }
  };

  const getButtonStyle = (optionValue: boolean) => {
    const isSelected = answer === optionValue;
    const baseStyle =
      "relative flex items-center justify-center p-3 rounded-md border transition-colors duration-200 font-semibold text-xs w-full";

    if (!isSubmitted) {
      if (isSelected) {
        return `${baseStyle} ${
          optionValue === true
            ? "border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
            : "border-rose-600 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
        }`;
      }
      return `${baseStyle} border-border bg-background text-muted-foreground`;
    }

    if (isSelected) {
      const isCorrect = answer === correctAnswer;
      if (isCorrect) {
        return `${baseStyle} border-emerald-500 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-500`;
      }
      return `${baseStyle} border-rose-500 bg-rose-100 dark:bg-rose-900/40 text-rose-900 dark:text-rose-300 ring-1 ring-rose-500`;
    }

    return `${baseStyle} opacity-50 border-border bg-muted/30 text-muted-foreground cursor-not-allowed`;
  };

  const getButtonIcon = (optionValue: boolean) => {
    const isSelected = answer === optionValue;
    if (!isSubmitted) {
      if (!isSelected) return null;
      return optionValue === true ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4" />
      );
    }

    if (isSelected) {
      const isCorrect = answer === correctAnswer;
      return isCorrect ? (
        <Check className="w-4 h-4" />
      ) : (
        <X className="w-4 h-4" />
      );
    }

    return null;
  };

  const canSubmit =
    answer !== null && (!requireConfidence || confidence !== null);

  return (
    <div className={`${baseClass} ${customClass} w-full max-w-2xl mx-auto`}>
      <div className="text-sm font-semibold text-left mb-3">
        <Markdown>{statement}</Markdown>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleSelection(true)}
            disabled={isSubmitted}
            className={getButtonStyle(true)}
          >
            <div
              className={`absolute top-2 right-2 transition-opacity ${answer === true ? "opacity-100" : "opacity-0"}`}
            >
              {getButtonIcon(true)}
            </div>
            True
          </button>

          <button
            onClick={() => handleSelection(false)}
            disabled={isSubmitted}
            className={getButtonStyle(false)}
          >
            <div
              className={`absolute top-2 right-2 transition-opacity ${answer === false ? "opacity-100" : "opacity-0"}`}
            >
              {getButtonIcon(false)}
            </div>
            False
          </button>
        </div>

        {requireConfidence && answer !== null && (
          <ConfidenceCheck
            value={confidence}
            onChange={setConfidence}
            disabled={isSubmitted}
          />
        )}

        {showFeedback && isSubmitted && (
          <div
            className={`animate-in fade-in slide-in-from-top-2 duration-500 rounded-md p-3 mt-3 border ${
              answer === correctAnswer
                ? "bg-emerald-50/50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-800"
                : "bg-rose-50/50 dark:bg-rose-900/30 border-rose-100 dark:border-rose-800"
            }`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`p-1 rounded-full shrink-0 ${
                  answer === correctAnswer
                    ? "bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-300"
                    : "bg-rose-100 dark:bg-rose-800 text-rose-600 dark:text-rose-300"
                }`}
              >
                {answer === correctAnswer ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </div>
              <div>
                <div
                  className={`font-semibold text-xs ${
                    answer === correctAnswer
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {answer === correctAnswer ? "Correct!" : "Incorrect"}
                </div>
                {explanation ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    <Markdown>{explanation}</Markdown>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1">
                    The statement is {correctAnswer ? "True" : "False"}.
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={handleReset}
                className="h-7 px-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span className="inline-flex items-center gap-1">
                  <RefreshCcw className="w-3 h-3" /> Try Again
                </span>
              </button>
            </div>
          </div>
        )}

        {requireConfidence && !isSubmitted && (
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-7 px-3 rounded bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-1">
                Check Answer
                <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
