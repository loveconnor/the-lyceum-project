"use client";

import { useState } from "react";
import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Checkbox({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const [checked, setChecked] = useState(!!props.checked);

  return (
    <label
      className={`flex items-center gap-2 text-xs cursor-pointer ${baseClass} ${customClass}`}
      onClick={() => setChecked((prev) => !prev)}
    >
      <div
        className={`w-3.5 h-3.5 border border-border rounded-sm flex items-center justify-center transition-colors ${checked ? "bg-foreground" : "bg-background"}`}
      >
        {checked && (
          <svg
            className="w-2.5 h-2.5 text-background"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </div>
      {props.label as string}
    </label>
  );
}
