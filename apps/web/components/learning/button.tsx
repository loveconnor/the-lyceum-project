"use client";

import type { ComponentRenderProps } from "./types";
import { baseClass, getCustomClass } from "./utils";

export function Button({ element }: ComponentRenderProps) {
  const { props } = element;
  const customClass = getCustomClass(props);
  const variant = props.variant as string;
  const label = props.label as string;
  const actionText = (props.actionText as string) || label;
  const btnClass =
    variant === "danger"
      ? "bg-red-500 text-white"
      : variant === "secondary"
        ? "bg-card border border-border text-foreground"
        : "bg-foreground text-background";

  return (
    <button
      type="button"
      onClick={() =>
        (
          window as unknown as { __demoAction?: (text: string) => void }
        ).__demoAction?.(actionText)
      }
      className={`self-start px-3 py-1.5 rounded text-xs font-medium hover:opacity-90 transition-opacity ${btnClass} ${baseClass} ${customClass}`}
    >
      {label}
    </button>
  );
}
