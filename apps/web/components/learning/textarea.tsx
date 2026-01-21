"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Textarea({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const rows = (props.rows as number) || 3;

  return (
    <div className={`${baseClass} ${customClass}`}>
      {props.label ? (
        <label className="text-[10px] text-muted-foreground block mb-0.5 text-left">
          {props.label as string}
        </label>
      ) : null}
      <textarea
        placeholder={(props.placeholder as string) || ""}
        rows={rows}
        className="w-full bg-background border border-border rounded px-2 py-1 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
      />
    </div>
  );
}
