"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Link({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);

  return (
    <span
      className={`text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors underline-offset-2 hover:underline ${baseClass} ${customClass}`}
    >
      {props.label as string}
    </span>
  );
}
