"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Fallback({ element }: ComponentRenderProps) {
  const customClass = getCustomClass(element.props);
  return (
    <div
      className={`text-[10px] text-muted-foreground ${baseClass} ${customClass}`}
    >
      [{element.type}]
    </div>
  );
}
