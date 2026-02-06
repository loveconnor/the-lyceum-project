"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */

import { useState, useEffect, type ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calculator,
  Info,
  RotateCcw,
} from "lucide-react";
import { Markdown } from "./markdown";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

type NumericInputProps = {
  label?: string | null;
  placeholder?: string | null;
  unit?: string | null;
  correctAnswer: number;
  allowScientific?: boolean;
  tolerance?: number;
  range?: [number, number] | null;
  showFeedback?: boolean;
  className?: string[];
};

type Feedback = {
  type: "success" | "warning" | "error" | "info";
  title: string;
  message: string;
  icon: ReactNode;
};

export function NumericInput({ element }: ComponentRenderProps) {
  const props = element.props as NumericInputProps;
  const customClass = getCustomClass(props);
  const label = props.label ?? "Enter your answer";
  const placeholder = props.placeholder ?? "0.00";
  const unit = props.unit ?? null;
  const correctAnswer = Number(props.correctAnswer);
  const allowScientific = Boolean(props.allowScientific);
  const tolerance =
    typeof props.tolerance === "number" ? props.tolerance : 0.01;
  const range = Array.isArray(props.range) ? props.range : null;
  const showFeedback = props.showFeedback ?? true;

  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "correct" | "error">("idle");
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  // Restore saved state on mount
  useEffect(() => {
    const savedState = typeof (window as any).__getWidgetState === "function" 
      ? (window as any).__getWidgetState() 
      : null;
    
    if (savedState) {
      if (typeof savedState.value === 'string') setValue(savedState.value);
      if (savedState.status) setStatus(savedState.status);
      if (savedState.feedback) setFeedback(savedState.feedback);
    }
  }, []);

  // Save state whenever it changes
  useEffect(() => {
    if (value || status !== 'idle' || feedback) {
      if (typeof (window as any).__saveWidgetState === "function") {
        (window as any).__saveWidgetState({
          value,
          status,
          feedback
        });
      }
    }
  }, [value, status, feedback]);

  const handleSubmit = () => {
    const raw = value.trim();
    const numericVal = Number(raw);

    if (!allowScientific && raw.toLowerCase().includes("e")) {
      setStatus("error");
      setFeedback({
        type: "info",
        title: "Format",
        message: "Scientific notation is not enabled for this input.",
        icon: <Info className="h-4 w-4" />,
      });
      return;
    }

    if (!raw || Number.isNaN(numericVal)) {
      setStatus("error");
      setFeedback({
        type: "error",
        title: "Invalid",
        message: "Please enter a valid number.",
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    if (range && (numericVal < range[0] || numericVal > range[1])) {
      setStatus("error");
      setFeedback({
        type: "warning",
        title: "Out of range",
        message: `Value must be between ${range[0]} and ${range[1]}.`,
        icon: <AlertCircle className="h-4 w-4" />,
      });
      return;
    }

    const error = Math.abs((numericVal - correctAnswer) / correctAnswer);
    const isCorrect = error <= tolerance;

    if (isCorrect) {
      setStatus("correct");
      setFeedback({
        type: "success",
        title: "Correct",
        message: "Correct! Good job.",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
      
      // Mark step as complete
      if (typeof (window as any).__markStepComplete === "function") {
        (window as any).__markStepComplete();
      }
    } else {
      setStatus("error");
      generateErrorFeedback(numericVal, correctAnswer);
    }
  };

  const generateErrorFeedback = (input: number, target: number) => {
    const absTarget = Math.abs(target);
    const absInput = Math.abs(input);

    if (
      absTarget > 0 &&
      Math.abs((absInput - absTarget) / absTarget) <= tolerance &&
      Math.sign(input) !== Math.sign(target)
    ) {
      setFeedback({
        type: "info",
        title: "Sign error",
        message: "Check your sign. You might have missed a negative.",
        icon: <Info className="h-4 w-4" />,
      });
      return;
    }

    if (target !== 0) {
      const ratio = Math.abs(input / target);
      const log10 = Math.log10(ratio);
      if (
        Math.abs(log10 - Math.round(log10)) < 0.1 &&
        Math.abs(Math.round(log10)) >= 1
      ) {
        const power = Math.round(log10);
        setFeedback({
          type: "warning",
          title: "Magnitude",
          message: `You are off by a factor of 10^${power}. Check your decimal place or prefixes.`,
          icon: <Calculator className="h-4 w-4" />,
        });
        return;
      }
    }

    setFeedback({
      type: "error",
      title: "Incorrect",
      message: "Incorrect value. Please try again.",
      icon: <XCircle className="h-4 w-4" />,
    });
  };

  const handleReset = () => {
    setValue("");
    setStatus("idle");
    setFeedback(null);
  };

  const inputClass =
    status === "error"
      ? "border-rose-300 dark:border-rose-700 focus:ring-rose-200 dark:focus:ring-rose-800"
      : status === "correct"
        ? "border-emerald-300 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-300"
        : "";

  return (
    <div className={`${baseClass} ${customClass} w-full max-w-md mx-auto`}>
      {label ? (
        <div className="text-xs font-semibold mb-1 text-left">
          <Markdown>{label}</Markdown>
        </div>
      ) : null}

      <div className="flex w-full items-end gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            disabled={status === "correct"}
            className={`h-7 w-full bg-background border border-border rounded px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/20 ${inputClass}`}
          />
          {unit && (
            <div className="absolute right-2 top-1.5 text-[10px] font-medium text-muted-foreground pointer-events-none">
              {unit}
            </div>
          )}
        </div>

        {status === "correct" ? (
          <button
            type="button"
            onClick={handleReset}
            className="h-7 px-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="inline-flex items-center gap-1">
              <RotateCcw className="h-3 w-3" />
              Reset
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            className="h-7 px-3 rounded bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Submit
          </button>
        )}
      </div>

      {showFeedback && status !== "idle" && feedback ? (
        <div className="mt-2 text-[10px] text-left">
          <div className="flex items-start gap-2">
            <span
              className={`mt-0.5 ${
                feedback.type === "success"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : feedback.type === "warning"
                    ? "text-amber-600 dark:text-amber-400"
                    : feedback.type === "info"
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {feedback.icon}
            </span>
            <div>
              <div className="font-semibold">{feedback.title}</div>
              <div className="text-muted-foreground">{feedback.message}</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
