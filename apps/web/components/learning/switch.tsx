"use client";

import { useState } from "react";
import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Switch({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const [checked, setChecked] = useState(!!props.checked);

  return (
    <label
      className={`flex items-center justify-between gap-2 text-xs cursor-pointer ${baseClass} ${customClass}`}
      onClick={() => setChecked((prev) => !prev)}
    >
      <span>{props.label as string}</span>
      <div
        className={`w-8 h-4 rounded-full relative transition-colors ${checked ? "bg-foreground" : "bg-border"}`}
      >
        <div
          className={`absolute w-3 h-3 rounded-full bg-background top-0.5 transition-all ${checked ? "right-0.5" : "left-0.5"}`}
        />
      </div>
    </label>
  );
}
