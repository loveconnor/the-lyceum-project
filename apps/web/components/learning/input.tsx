"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Input({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);

  return (
    <div className={`${baseClass} ${customClass}`}>
      {props.label ? (
        <label className="text-[10px] text-muted-foreground block mb-0.5 text-left">
          {props.label as string}
        </label>
      ) : null}
      <input
        type={(props.type as string) || "text"}
        placeholder={(props.placeholder as string) || ""}
        className="h-7 w-full bg-background border border-border rounded px-2 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/20"
      />
    </div>
  );
}
