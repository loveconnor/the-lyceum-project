"use client";

import { useState, type ChangeEvent } from "react";
import { AlertCircle } from "lucide-react";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

type ShortAnswerProps = {
  label?: string | null;
  description?: string | null;
  question?: string | null;
  placeholder?: string | null;
  maxLength?: number | null;
  rows?: number | null;
  showCounter?: boolean;
  className?: string[];
};

export function ShortAnswer({ element }: ComponentRenderProps) {
  const props = element.props as ShortAnswerProps;
  const customClass = getCustomClass(props);
  const label = props.label ?? "Short Answer";
  const description = props.description ?? null;
  const question = props.question ?? null;
  const placeholder = props.placeholder ?? "Enter your answer...";
  const maxLength = typeof props.maxLength === "number" ? props.maxLength : 250;
  const rows = typeof props.rows === "number" ? props.rows : 5;
  const showCounter = props.showCounter ?? true;

  const [value, setValue] = useState("");

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value;
    if (next.length <= maxLength) {
      setValue(next);
    }
  };

  const currentLength = value.length;
  const isNearLimit = currentLength > maxLength * 0.9;
  const isAtLimit = currentLength >= maxLength;

  return (
    <div className={`${baseClass} ${customClass} w-full max-w-md mx-auto`}>
      <div className="flex items-center justify-between">
        {label ? (
          <div className="text-xs font-semibold text-left">{label}</div>
        ) : null}
        {isAtLimit ? (
          <span className="text-[10px] font-medium text-amber-600 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Limit reached
          </span>
        ) : null}
      </div>

      {description ? (
        <div className="text-[10px] text-muted-foreground mt-1 text-left">
          {description}
        </div>
      ) : null}

      {question ? (
        <div className="text-xs font-medium text-left mt-2">{question}</div>
      ) : null}

      <div className="relative mt-2">
        <textarea
          rows={rows}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          className={`w-full bg-background border border-border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-y ${
            isAtLimit ? "border-amber-400 focus:ring-amber-300" : ""
          }`}
        />

        {showCounter ? (
          <div className="absolute bottom-1.5 right-2 flex items-center gap-2 text-[10px] font-mono select-none pointer-events-none">
            <span
              className={
                isAtLimit
                  ? "text-amber-600 font-semibold"
                  : isNearLimit
                    ? "text-orange-500"
                    : "text-muted-foreground"
              }
            >
              {currentLength} / {maxLength}
            </span>

            <svg className="h-4 w-4 -rotate-90" viewBox="0 0 24 24">
              <circle
                className="text-muted-foreground/20"
                strokeWidth="3"
                stroke="currentColor"
                fill="transparent"
                r="10"
                cx="12"
                cy="12"
              />
              <circle
                className={isAtLimit ? "text-amber-500" : "text-foreground"}
                strokeWidth="3"
                strokeDasharray={2 * Math.PI * 10}
                strokeDashoffset={
                  2 * Math.PI * 10 * (1 - currentLength / maxLength)
                }
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="10"
                cx="12"
                cy="12"
              />
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  );
}
